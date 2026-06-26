import { NextRequest, NextResponse } from 'next/server'
import { CURRICULUM_DATA } from '@/lib/curriculum-data'
import { safeParseJSON } from '@/lib/ai-question-quality'

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY
const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1'

// Build a flat list of all subtopic names for matching
const ALL_SUBTOPICS: { name: string; topicName: string; level: string }[] = []
for (const [level, topics] of Object.entries(CURRICULUM_DATA)) {
  for (const topic of topics) {
    for (const sub of topic.subTopics) {
      ALL_SUBTOPICS.push({ name: sub.name, topicName: topic.name, level })
    }
  }
}

const SUBTOPIC_LIST = [...new Set(ALL_SUBTOPICS.map(s => s.name))].sort()

interface ExtractTopicsRequest {
  /** Plain text input (typed or pasted topic list) */
  text?: string
  /** Base64-encoded image of a revision list document */
  image_base64?: string
  image_mime?: string
}

interface MatchedTopic {
  subtopic: string
  topicName: string
  level: string
  confidence: 'high' | 'medium'
}

interface ExtractTopicsResponse {
  success: boolean
  data?: {
    raw_topics: string[]
    matched: MatchedTopic[]
  }
  error?: string
}

export async function POST(req: NextRequest): Promise<NextResponse<ExtractTopicsResponse>> {
  if (!OPENROUTER_API_KEY) {
    return NextResponse.json({ success: false, error: 'API key not configured' }, { status: 500 })
  }

  const body: ExtractTopicsRequest = await req.json()

  if (!body.text && !body.image_base64) {
    return NextResponse.json({ success: false, error: 'Provide text or image_base64' }, { status: 400 })
  }

  const subtopicListForPrompt = SUBTOPIC_LIST.slice(0, 300).join(', ')

  const systemPrompt = `You are a UK maths curriculum topic extractor. Given a revision list (typed or from an image), extract the mathematical topic names and match them to the closest entries from this known subtopic list:

${subtopicListForPrompt}

Rules:
- Return ONLY raw JSON, no markdown
- Match loosely: "quadratics" → "Solving Quadratics", "trig" → "Trigonometric Equations"
- If a topic clearly matches a known subtopic, include it in matched[]
- Include the topicName (parent topic) and level for each match
- raw_topics: the original topic strings you extracted from the input
- matched: array of { subtopic, topicName, level, confidence } where confidence is "high" (clear match) or "medium" (approximate)

Schema:
{ "raw_topics": ["string"], "matched": [{ "subtopic": "string", "topicName": "string", "level": "string", "confidence": "high" | "medium" }] }`

  const userContent = body.image_base64
    ? [
        {
          type: 'image_url',
          image_url: {
            url: `data:${body.image_mime ?? 'image/jpeg'};base64,${body.image_base64}`,
          },
        },
        {
          type: 'text',
          text: 'Extract the maths topics from this revision list image and match them. Return only JSON.',
        },
      ]
    : `Here is a revision list. Extract the topics and match them:\n\n${body.text}\n\nReturn only JSON.`

  try {
    const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
        'X-Title': 'Nicolaou Maths - Topic Extractor',
      },
      body: JSON.stringify({
        model: 'anthropic/claude-sonnet-4-6',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userContent },
        ],
        temperature: 0.1,
        max_tokens: 2000,
      }),
    })

    if (!response.ok) {
      const err = await response.json().catch(() => ({}))
      return NextResponse.json(
        { success: false, error: `AI error: ${JSON.stringify(err)}` },
        { status: 502 }
      )
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content ?? ''

    const parsed = safeParseJSON<{ raw_topics?: unknown[]; matched?: unknown[] }>(content)
    if (!parsed) {
      return NextResponse.json(
        { success: false, error: 'Invalid response format from AI' },
        { status: 500 }
      )
    }

    const rawTopics = Array.isArray(parsed.raw_topics)
      ? parsed.raw_topics.filter((topic): topic is string => typeof topic === 'string')
      : []
    const matched = Array.isArray(parsed.matched)
      ? parsed.matched.filter((item): item is MatchedTopic => {
          if (!item || typeof item !== 'object') return false
          const row = item as Partial<MatchedTopic>
          return (
            typeof row.subtopic === 'string' &&
            typeof row.topicName === 'string' &&
            typeof row.level === 'string' &&
            (row.confidence === 'high' || row.confidence === 'medium')
          )
        })
      : []

    return NextResponse.json({
      success: true,
      data: {
        raw_topics: rawTopics,
        matched,
      },
    })
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
