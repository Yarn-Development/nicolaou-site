/**
 * Topic Extraction Utility
 * 
 * Extracts and groups topics from assignment questions for revision checklists.
 */

// =====================================================
// Types
// =====================================================

export interface TopicSummary {
  topic: string
  subTopic: string
  totalMarks: number
}

export interface QuestionForTopicExtraction {
  topic: string
  sub_topic?: string | null
  sub_topic_name?: string | null
  topic_name?: string | null
  marks: number
}

// =====================================================
// Main Function
// =====================================================

/**
 * Extracts topics from an array of questions and groups by sub_topic.
 * Counts total marks available for each sub-topic (to show weighting).
 * 
 * @param questions - Array of selected questions
 * @returns Array of { topic, subTopic, totalMarks } sorted by marks (descending)
 */
export function extractTopicsFromAssignment(
  questions: QuestionForTopicExtraction[]
): TopicSummary[] {
  // Map to track sub-topic -> { topic, totalMarks }
  const subTopicMap = new Map<string, { topic: string; totalMarks: number }>()

  for (const question of questions) {
    // Get the topic name (prefer topic_name, fall back to topic)
    const topic = question.topic_name || question.topic || "General"
    
    // Get the sub-topic (prefer sub_topic_name, fall back to sub_topic)
    const subTopic = question.sub_topic_name || question.sub_topic || topic
    
    // Create a unique key for this sub-topic
    const key = `${topic}::${subTopic}`
    
    const existing = subTopicMap.get(key)
    if (existing) {
      // Add to existing marks
      subTopicMap.set(key, {
        topic: existing.topic,
        totalMarks: existing.totalMarks + (question.marks || 0),
      })
    } else {
      // Create new entry
      subTopicMap.set(key, {
        topic,
        totalMarks: question.marks || 0,
      })
    }
  }

  // Convert map to array
  const result: TopicSummary[] = []
  for (const [key, value] of subTopicMap.entries()) {
    const [topic, subTopic] = key.split("::")
    result.push({
      topic,
      subTopic,
      totalMarks: value.totalMarks,
    })
  }

  // Sort by topic first, then by marks descending within each topic
  result.sort((a, b) => {
    // First sort by topic name
    const topicCompare = a.topic.localeCompare(b.topic)
    if (topicCompare !== 0) return topicCompare
    
    // Then by marks (descending)
    return b.totalMarks - a.totalMarks
  })

  return result
}

/**
 * Groups topic summaries by their parent topic.
 * Useful for displaying in a hierarchical format.
 * 
 * @param summaries - Array of TopicSummary
 * @returns Map of topic -> TopicSummary[]
 */
export function groupByTopic(
  summaries: TopicSummary[]
): Map<string, TopicSummary[]> {
  const grouped = new Map<string, TopicSummary[]>()
  
  for (const summary of summaries) {
    const existing = grouped.get(summary.topic)
    if (existing) {
      existing.push(summary)
    } else {
      grouped.set(summary.topic, [summary])
    }
  }
  
  return grouped
}

/**
 * Calculates the total marks for all topics.
 * 
 * @param summaries - Array of TopicSummary
 * @returns Total marks across all topics
 */
export function calculateTotalMarks(summaries: TopicSummary[]): number {
  return summaries.reduce((sum, s) => sum + s.totalMarks, 0)
}
