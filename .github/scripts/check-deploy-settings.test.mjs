import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'

const script = fileURLToPath(new URL('./check-deploy-settings.sh', import.meta.url))
const workflow = readFileSync(
  fileURLToPath(new URL('../workflows/reusable-deploy.yml', import.meta.url)),
  'utf8',
)

// Read by the deploy, but the same in every environment, so a shared value is harmless.
const SHARED_ALLOWED = new Set(['OC_SERVER', 'ISP_OIDC_IDIR_HINT'])

const valid = {
  dev: {
    OC_NAMESPACE: 'abc123-dev',
    ISP_OIDC_ISSUER_URI: 'https://dev.loginproxy.gov.bc.ca/auth/realms/standard',
  },
  test: {
    OC_NAMESPACE: 'abc123-test',
    ISP_OIDC_ISSUER_URI: 'https://test.loginproxy.gov.bc.ca/auth/realms/standard',
  },
  prod: {
    OC_NAMESPACE: 'abc123-prod',
    ISP_OIDC_ISSUER_URI: 'https://loginproxy.gov.bc.ca/auth/realms/standard',
  },
}

const settingsFor = (environment) => ({
  OC_TOKEN: 'token-value',
  OC_SERVER: 'https://api.example.test:6443',
  DATABASE_HOST: 'db.example.test',
  DATABASE_SERVICE_NAME: 'isp-service',
  DATABASE_USER: 'isp_user',
  DATABASE_PASSWORD: 'database-password-value',
  KEYSTORE_SECRET: 'keystore-value',
  ISP_OIDC_CLIENT_ID: 'isp-client',
  ...valid[environment],
})

function run(args, settings = {}) {
  // Start from a clean slate so the runner's own environment cannot leak in.
  const env = { PATH: process.env.PATH, ...settings }
  const result = spawnSync('bash', [script, ...args], { env, encoding: 'utf8' })
  return { ...result, output: result.stdout + result.stderr }
}

const environmentOnly = () => run(['list']).stdout.trim().split('\n')

const stepEnvNames = (stepName) => {
  const start = workflow.indexOf(`- name: ${stepName}`)
  assert.notEqual(start, -1, `step "${stepName}" not found`)
  const block = workflow.slice(start, workflow.indexOf('run:', start))
  return [...block.matchAll(/^\s+([A-Z][A-Z0-9_]*):/gm)].map((match) => match[1])
}

test('every setting the deploy reads is either guarded or harmless when shared', () => {
  const read = new Set(
    [...workflow.matchAll(/\b(?:secrets|vars)\.([A-Za-z0-9_]+)/g)].map((match) =>
      match[1].toUpperCase(),
    ),
  )
  const guarded = new Set(environmentOnly())
  const unguarded = [...read].filter((name) => !guarded.has(name) && !SHARED_ALLOWED.has(name))
  assert.deepEqual(unguarded, [], 'add new deployment settings to ENVIRONMENT_ONLY')
})

test('the settings job passes every guarded name to the shared check', () => {
  const passed = new Set(stepEnvNames('Reject deployment settings outside GitHub Environments'))
  assert.deepEqual(
    environmentOnly().filter((name) => !passed.has(name)),
    [],
  )
})

test('the backend job passes every required setting to the environment check', () => {
  const passed = stepEnvNames('Validate environment settings')
  for (const name of Object.keys(settingsFor('dev'))) {
    assert.ok(passed.includes(name), `${name} is not passed to Validate environment settings`)
  }
})

test('shared check passes when nothing is set outside environments', () => {
  const result = run(['shared'])
  assert.equal(result.status, 0, result.output)
})

test('shared check names repository-level settings without printing their values', () => {
  const result = run(['shared'], {
    DATABASE_PASSWORD: 'database-password-value',
    ISP_OIDC_ISSUER_URI: 'https://test.loginproxy.gov.bc.ca/auth/realms/standard',
  })
  assert.equal(result.status, 1)
  assert.match(result.output, /DATABASE_PASSWORD ISP_OIDC_ISSUER_URI must not be set/)
  assert.doesNotMatch(result.output, /database-password-value|test\.loginproxy/)
})

test('shared check ignores whitespace-only values', () => {
  const result = run(['shared'], { OC_NAMESPACE: '  \n' })
  assert.equal(result.status, 0, result.output)
})

for (const environment of ['dev', 'test', 'prod']) {
  test(`environment check accepts complete ${environment} settings`, () => {
    const result = run(['environment', environment], settingsFor(environment))
    assert.equal(result.status, 0, result.output)
  })
}

test('environment check lists every missing setting', () => {
  const settings = settingsFor('prod')
  delete settings.DATABASE_HOST
  settings.ISP_OIDC_CLIENT_ID = ' '
  const result = run(['environment', 'prod'], settings)
  assert.equal(result.status, 1)
  assert.match(result.output, /DATABASE_HOST ISP_OIDC_CLIENT_ID must be set in the prod GitHub Environment/)
})

test('environment check rejects another environment namespace', () => {
  const result = run(['environment', 'prod'], { ...settingsFor('prod'), OC_NAMESPACE: 'abc123-test' })
  assert.equal(result.status, 1)
  assert.match(result.output, /ending in -prod/)
})

for (const [environment, wrongRealm] of [
  ['prod', valid.test.ISP_OIDC_ISSUER_URI],
  ['prod', valid.dev.ISP_OIDC_ISSUER_URI],
  ['test', valid.prod.ISP_OIDC_ISSUER_URI],
  ['dev', valid.test.ISP_OIDC_ISSUER_URI],
]) {
  test(`environment check rejects ${new URL(wrongRealm).host} in ${environment}`, () => {
    const result = run(['environment', environment], {
      ...settingsFor(environment),
      ISP_OIDC_ISSUER_URI: wrongRealm,
    })
    assert.equal(result.status, 1)
    assert.match(result.output, new RegExp(`must be the ${environment} BC Gov SSO realm`))
  })
}

test('environment check rejects unknown environments', () => {
  const result = run(['environment', 'staging'], settingsFor('dev'))
  assert.equal(result.status, 1)
  assert.match(result.output, /dev, test or prod/)
})

test('environment check never prints secret values', () => {
  const settings = { ...settingsFor('prod'), OC_NAMESPACE: 'abc123-dev' }
  const result = run(['environment', 'prod'], settings)
  assert.equal(result.status, 1)
  assert.doesNotMatch(result.output, /database-password-value|token-value|keystore-value/)
})
