-- =====================================================
-- Allow SVG uploads in question-images bucket
-- =====================================================
-- Required for AI-generated SVG diagrams stored alongside questions.
-- The diagram generation pipeline creates SVG markup server-side and
-- uploads it directly — no Python/external execution needed.
-- =====================================================

UPDATE storage.buckets
SET allowed_mime_types = array_append(
  COALESCE(allowed_mime_types, ARRAY[]::text[]),
  'image/svg+xml'
)
WHERE id = 'question-images'
  AND NOT ('image/svg+xml' = ANY(COALESCE(allowed_mime_types, ARRAY[]::text[])));
