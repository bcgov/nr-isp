import type { IspSellPriceZoneCode, MillModel } from '@/interfaces/Mill'
import {
  ApiError,
  apiDownload,
  apiFetch,
  apiGetJson,
  readErrorMessage,
} from '@/service/api-service'

export const getMills = (): Promise<MillModel[]> => apiGetJson<MillModel[]>('/mills')

export const getIspSellPriceZoneCodes = (): Promise<IspSellPriceZoneCode[]> =>
  apiGetJson<IspSellPriceZoneCode[]>('/isp-sell-price-zone-codes')

/** Creates the mill, or updates the one with the same mill number. */
export const saveMill = async (payload: Partial<MillModel>): Promise<MillModel> => {
  const response = await apiFetch('/mills', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!response.ok) {
    throw new ApiError(response.status, await readErrorMessage(response, 'Failed to save mill.'))
  }
  return (await response.json()) as MillModel
}

export const deleteMill = async (millId: number): Promise<void> => {
  const response = await apiFetch(`/mills/${millId}`, { method: 'DELETE' })
  if (!response.ok) {
    throw new ApiError(response.status, await readErrorMessage(response, 'Failed to delete mill.'))
  }
}

export const exportMills = (format: 'csv' | 'pdf'): Promise<void> =>
  apiDownload(`/mills/export/${format}`, `mills.${format}`)
