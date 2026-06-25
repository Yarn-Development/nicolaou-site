/**
 * SVG upload to Convex file storage — the helper for AI-generated diagram SVGs.
 * `uploadSvgToStorage` helper. Used by the AI generation routes that produce
 * synthetic diagrams (generate-similar, shadow-paper).
 *
 * Flow (per convex/files.ts):
 *   1. api.files.generateUploadUrl({}) -> { uploadUrl }
 *   2. POST the SVG bytes to uploadUrl -> { storageId }
 *   3. api.files.getUrl({ storageId }) -> served URL
 *
 * Returns the served URL, or null if anything fails (callers treat null as
 * "no diagram" and fall back to text-only).
 */

import { fetchMutation, fetchQuery, api } from '@/lib/convex/server'
import type { Id } from '@/convex/_generated/dataModel'

export async function uploadSvgToConvex(svgContent: string): Promise<string | null> {
  try {
    const { uploadUrl } = await fetchMutation(api.files.generateUploadUrl, {})

    const res = await fetch(uploadUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'image/svg+xml' },
      body: svgContent,
    })
    if (!res.ok) {
      console.error('[convex-svg-upload] Upload failed with status', res.status)
      return null
    }

    const { storageId } = (await res.json()) as { storageId: Id<'_storage'> }
    const url = await fetchQuery(api.files.getUrl, { storageId })
    return url ?? null
  } catch (err) {
    console.error('[convex-svg-upload] Upload exception:', err)
    return null
  }
}
