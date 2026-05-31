import { NextResponse } from 'next/server'

const EXTERNAL_URL = process.env.IMAGE_VALIDATION_URL || 'http://3.82.240.253:8000/predict'

export async function POST(req: Request) {
  try {
    // Parse the incoming form data
    const formData = await req.formData()
    const imageFile = formData.get('image') as File | null
    const imageUrl = formData.get('image_url') as string | null

    if (!imageFile && !imageUrl) {
      return NextResponse.json(
        { error: 'No image or image_url provided' },
        { status: 400 }
      )
    }

    // Create new FormData for the external API
    const externalFormData = new FormData()
    
    if (imageFile) {
      // Convert File to Blob for Node.js fetch compatibility
      const arrayBuffer = await imageFile.arrayBuffer()
      const blob = new Blob([arrayBuffer], { type: imageFile.type })
      externalFormData.append('image', blob, imageFile.name)
    } else if (imageUrl) {
      externalFormData.append('image_url', imageUrl)
    }

    const proxied = await fetch(EXTERNAL_URL, {
      method: 'POST',
      body: externalFormData,
    })

    const text = await proxied.text()

    // Try to parse JSON, otherwise return text
    try {
      const json = JSON.parse(text)
      return NextResponse.json(json, { status: proxied.status })
    } catch {
      return new NextResponse(text, { status: proxied.status })
    }
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err)
    console.error('[api/image/validate] proxy error:', errorMessage)
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
