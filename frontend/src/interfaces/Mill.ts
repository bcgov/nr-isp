/** GET /api/mills, and the body of POST /api/mills (which needs only the editable fields). */
export type MillModel = {
  millId?: number
  millNumber: number
  millName: string
  ispSellPriceZoneCode?: string | null
  clientNumber?: string
  clientLocnCode?: string
  /** YYYY-MM-DD */
  effectiveDate?: string
  /** YYYY-MM-DD */
  expiryDate?: string
  comments?: string | null
  revisionCount?: number
  updateUserid?: string
  /** ISO date-time from the API; the page keeps only the date. */
  updateTimestamp?: string
}

/** A mill as a ReusableDataTable row. */
export type MillRow = MillModel & { id: string }

/** GET /api/isp-sell-price-zone-codes */
export type IspSellPriceZoneCode = {
  ispSellPriceZoneCode: string
  description: string
  effectiveDate: string
  expiryDate: string
  updateTimestamp: string
}
