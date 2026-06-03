export interface ImageValidationResult {
  sector: string | null
  category: string | null
  is_valid: boolean
  source: string | null
  confidence_vlm: number | null
  confidence_vit: number | null
  service_unavailable?: boolean
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

  try {
    const res = await fetch(url, { method: 'POST', body: form })

    let data: any = null
    try {
      data = await res.json()
    } catch {
      /* ignore */
    }

    if (!res.ok) {
      const serviceUnavailable = res.status >= 500 || res.status === 503 || res.status === 504 || data?.service_unavailable
      throw new Error(serviceUnavailable ? 'validation-service-unavailable' : (data?.error || `status-${res.status}`))
    }

    return {
      sector: data?.sector ?? null,
      category: data?.category ?? null,
      is_valid: Boolean(data?.is_valid),
      source: data?.source ?? null,
      confidence_vlm: data?.confidence_vlm == null ? null : Number(data.confidence_vlm),
      confidence_vit: data?.confidence_vit == null ? null : Number(data.confidence_vit),
      service_unavailable: Boolean(data?.service_unavailable),
    }
  } catch (err) {
    console.error('Image validation failed:', err)
    const isServiceUnavailable = err instanceof Error && err.message === 'validation-service-unavailable'
    return {
      sector: null,
      category: null,
      is_valid: false,
      source: null,
      confidence_vlm: null,
      confidence_vit: null,
      service_unavailable: isServiceUnavailable,
    }
  }
}

export default { validateImage }
