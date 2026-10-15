import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'

const script = fileURLToPath(new URL('./verify-route.sh', import.meta.url))
const host = 'nr-isp-2.apps.gold.devops.gov.bc.ca'
const service = 'nr-isp-frontend-52'
const fields = (ingress = `${host}\tTrue\t`) => `${host}\tService\t${service}\n${ingress}`

function execute(t, responses, { namespace = 'review-dev', route = service, expectedHost = host, expectedService = service, env = {} } = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'isp-route-test-'))
  t.after(() => rmSync(dir, { recursive: true, force: true }))
  writeFileSync(join(dir, 'oc'), `#!${process.execPath}
import { appendFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs'
const file = process.env.MOCK_OC_CALLS
const index = existsSync(file) ? Number(readFileSync(file, 'utf8')) : 0
writeFileSync(file, String(index + 1))
appendFileSync(process.env.MOCK_OC_ARGS, JSON.stringify(process.argv.slice(2)) + '\\n')
const response = JSON.parse(process.env.MOCK_OC_RESPONSES)[index]
if (response === undefined) process.exit(9)
process.stdout.write(response)
process.exit(Number(process.env.MOCK_OC_STATUS || 0))
`, { mode: 0o755 })
  const calls = join(dir, 'calls')
  const argsFile = join(dir, 'args')
  const result = spawnSync('bash', [script, namespace, route, expectedHost, expectedService, '3', '0'], {
    env: {
      ...process.env,
      PATH: `${dir}:${process.env.PATH}`,
      MOCK_OC_CALLS: calls,
      MOCK_OC_ARGS: argsFile,
      MOCK_OC_RESPONSES: JSON.stringify(responses),
      ...env,
    },
    encoding: 'utf8',
  })
  return {
    ...result,
    calls: Number(readFileSync(calls, 'utf8')),
    args: readFileSync(argsFile, 'utf8').trim().split('\n').map(line => JSON.parse(line)),
  }
}

test('checks the named Route in its namespace using only projected routing fields', t => {
  const result = execute(t, [fields()])
  assert.equal(result.status, 0, result.stderr)
  assert.equal(result.calls, 1)
  assert.deepEqual(result.args[0].slice(0, 6), ['get', 'route', service, '--namespace', 'review-dev', '--request-timeout=5s'])
  assert.equal(result.args[0][6], '-o')
  assert.match(result.args[0][7], /^jsonpath=/)
  assert.match(result.args[0][7], /\.spec\.to\.name/)
  assert.match(result.args[0][7], /\.status\.ingress/)
  assert.doesNotMatch(result.args[0][7], /tls|certificate|key|\.spec\}/i)
})

test('checks the PROD vanity Route against its public host and PROD Service', t => {
  const result = execute(t, ['isp.nrs.gov.bc.ca\tService\tnr-isp-frontend-prod\nisp.nrs.gov.bc.ca\tTrue\t'], {
    namespace: 'review-prod',
    route: 'nr-isp-frontend-prod-vanity',
    expectedHost: 'isp.nrs.gov.bc.ca',
    expectedService: 'nr-isp-frontend-prod',
  })
  assert.equal(result.status, 0, result.stderr)
  assert.deepEqual(result.args[0].slice(0, 5), ['get', 'route', 'nr-isp-frontend-prod-vanity', '--namespace', 'review-prod'])
})

test('waits for the expected host instead of accepting stale or unrelated router status', t => {
  const result = execute(t, [
    fields('old.example.test\tTrue\t'),
    fields(`${host}\tFalse\tPending`),
    fields(`unrelated.example.test\tTrue\t\n${host}\tTrue\t`),
  ])
  assert.equal(result.status, 0, result.stderr)
  assert.equal(result.calls, 3)
})

test('rejects a colliding preview Route rather than passing smoke against its older owner', t => {
  const result = execute(t, Array(3).fill(fields(`${host}\tFalse\tHostAlreadyClaimed`)))
  assert.equal(result.status, 1)
  assert.equal(result.calls, 3)
  assert.match(result.stdout, /HostAlreadyClaimed/)
  assert.match(result.stdout, /another Route claiming this hostname/)
})

test('times out when the router has not reported admission', t => {
  const result = execute(t, Array(3).fill(fields('')))
  assert.equal(result.status, 1)
  assert.equal(result.calls, 3)
})

test('rejects an unexpected hostname, Service or target kind without polling', t => {
  for (const response of [
    fields().replace(host, 'wrong.example.test'),
    fields().replace(service, 'nr-isp-frontend-2'),
    fields().replace('\tService\t', '\tOther\t'),
  ]) {
    const result = execute(t, [response])
    assert.equal(result.status, 1)
    assert.equal(result.calls, 1)
    assert.match(result.stdout, /does not target/)
  }
})

test('does not continue with an unreadable Route or lost OpenShift session', t => {
  const result = execute(t, [''], { env: { MOCK_OC_STATUS: '1' } })
  assert.equal(result.status, 1)
  assert.equal(result.calls, 1)
})
