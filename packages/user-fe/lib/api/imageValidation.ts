export interface ImageValidationResult {
  sector: string | null
  category: string | null
  is_valid: boolean
  source: string | null
  confidence_vlm: number | null
  confidence_vit: number | null
}

/**
 * Validate an image by POSTing multipart/form-data to the validation endpoint.
 * @param file File blob to send
 * @param endpoint Optional override for the endpoint (defaults to provided host)
 */
export async function validateImage(file: File, endpoint?: string): Promise<ImageValidationResult> {
  // Route through local API so client code doesn't talk to external host directly
  const url = endpoint || '/api/image/validate'

  const form = new FormData()
  form.append('image', file)

  const res = await fetch(url, { method: 'POST', body: form })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Image validation server error ${res.status}: ${text}`)
  }

  const data = await res.json()

  // Normalize returned fields to expected types
  return {
    sector: data.sector ?? null,
    category: data.category ?? null,
    is_valid: Boolean(data.is_valid),
    source: data.source ?? null,
    confidence_vlm: data.confidence_vlm == null ? null : Number(data.confidence_vlm),
    confidence_vit: data.confidence_vit == null ? null : Number(data.confidence_vit),
  }
}

export default { validateImage }
