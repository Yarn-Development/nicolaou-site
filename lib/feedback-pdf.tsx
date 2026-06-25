import React from "react"
import {
  Document,
  Page,
  View,
  Text,
  StyleSheet,
  renderToBuffer,
} from "@react-pdf/renderer"
import type { StudentFeedbackData, SubTopicBreakdown } from "@/app/actions/feedback"

export async function generateFeedbackBuffer(feedback: StudentFeedbackData): Promise<Buffer> {
  // @react-pdf/renderer needs the element cast to its DocumentProps shape
  const element = React.createElement(FeedbackPDF, { feedback }) as Parameters<typeof renderToBuffer>[0]
  const ab = await renderToBuffer(element)
  return Buffer.from(ab)
}

// =====================================================
// Styles
// =====================================================

const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 10,
    color: "#111827",
    backgroundColor: "#ffffff",
    padding: 0,
  },
  header: {
    backgroundColor: "#111827",
    padding: "20 28",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  headerLeft: {},
  headerBrand: {
    color: "#9ca3af",
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  headerTitle: {
    color: "#ffffff",
    fontSize: 20,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
    letterSpacing: -0.5,
  },
  headerDate: {
    color: "#9ca3af",
    fontSize: 8,
    textAlign: "right",
  },
  studentBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    padding: "16 28",
    borderBottom: "1 solid #e5e7eb",
    backgroundColor: "#f9fafb",
  },
  metaBlock: {
    flex: 1,
    marginRight: 12,
  },
  metaLabel: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    color: "#6b7280",
    marginBottom: 3,
  },
  metaValue: {
    fontSize: 13,
    fontFamily: "Helvetica-Bold",
    color: "#111827",
  },
  metaSubValue: {
    fontSize: 9,
    color: "#6b7280",
    marginTop: 2,
  },
  scoreBlock: {
    alignItems: "flex-end",
    minWidth: 80,
  },
  scorePct: {
    fontSize: 28,
    fontFamily: "Helvetica-Bold",
  },
  scoreDetail: {
    fontSize: 8,
    color: "#6b7280",
    textAlign: "right",
    marginTop: 2,
  },
  body: {
    padding: "16 28",
  },
  sectionLabel: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    color: "#6b7280",
    marginBottom: 8,
    marginTop: 16,
  },
  narrativeBox: {
    backgroundColor: "#f9fafb",
    borderLeft: "4 solid #111827",
    padding: "10 14",
    marginBottom: 16,
  },
  narrativeText: {
    fontSize: 9,
    lineHeight: 1.6,
    color: "#374151",
  },
  // Table
  table: {
    width: "100%",
    border: "1 solid #e5e7eb",
    marginTop: 4,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f9fafb",
    borderBottom: "2 solid #e5e7eb",
    padding: "6 10",
  },
  tableHeaderCell: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    color: "#6b7280",
  },
  tableRow: {
    flexDirection: "row",
    borderBottom: "1 solid #e5e7eb",
    padding: "7 10",
    alignItems: "center",
  },
  tableRowAlt: {
    backgroundColor: "#fafafa",
  },
  colTopic: { flex: 3 },
  colMarks: { flex: 1, textAlign: "center" },
  colStatus: { flex: 1.2, textAlign: "right" },
  cellTopic: {
    fontSize: 9,
    color: "#111827",
  },
  cellSubtopic: {
    fontSize: 8,
    color: "#6b7280",
    marginTop: 1,
  },
  cellMarks: {
    fontSize: 9,
    textAlign: "center",
  },
  // RAG badges
  badge: {
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 3,
    alignSelf: "flex-end",
  },
  badgeText: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  // Overall status bar
  statusBar: {
    flexDirection: "row",
    alignItems: "center",
    padding: "12 28",
    borderBottom: "1 solid #e5e7eb",
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  footer: {
    position: "absolute",
    bottom: 20,
    left: 28,
    right: 28,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTop: "1 solid #e5e7eb",
    paddingTop: 8,
  },
  footerText: {
    fontSize: 7,
    color: "#9ca3af",
  },
  progressBarBg: {
    width: "100%",
    height: 4,
    backgroundColor: "#e5e7eb",
    borderRadius: 2,
    marginTop: 4,
  },
  progressBarFill: {
    height: 4,
    borderRadius: 2,
  },
})

// =====================================================
// Helpers
// =====================================================

function ragColor(status: "green" | "amber" | "red"): string {
  if (status === "green") return "#16a34a"
  if (status === "amber") return "#d97706"
  return "#dc2626"
}

function ragBgColor(status: "green" | "amber" | "red"): string {
  if (status === "green") return "#dcfce7"
  if (status === "amber") return "#fef3c7"
  return "#fee2e2"
}

function ragLabel(status: "green" | "amber" | "red"): string {
  if (status === "green") return "Strong"
  if (status === "amber") return "Developing"
  return "Needs Work"
}

function overallRAGStatus(pct: number): "green" | "amber" | "red" {
  if (pct >= 80) return "green"
  if (pct >= 50) return "amber"
  return "red"
}

// =====================================================
// Topic Row Component
// =====================================================

function TopicRow({ breakdown, isAlt }: { breakdown: SubTopicBreakdown; isAlt: boolean }) {
  const status = breakdown.status
  const color = ragColor(status)
  const bgColor = ragBgColor(status)
  const label = ragLabel(status)
  const pct = Math.round(breakdown.percentage)

  return (
    <View style={[styles.tableRow, isAlt ? styles.tableRowAlt : {}]}>
      <View style={styles.colTopic}>
        <Text style={styles.cellTopic}>
          {breakdown.subTopic !== breakdown.topic ? breakdown.subTopic : breakdown.topic}
        </Text>
        {breakdown.subTopic !== breakdown.topic && (
          <Text style={styles.cellSubtopic}>{breakdown.topic}</Text>
        )}
        {breakdown.learningObjective && (
          <Text style={[styles.cellSubtopic, { fontStyle: "italic", marginTop: 1 }]}>
            {breakdown.learningObjective}
          </Text>
        )}
      </View>
      <View style={styles.colMarks}>
        <Text style={styles.cellMarks}>
          {breakdown.score}/{breakdown.total}
        </Text>
        <Text style={[styles.cellMarks, { color: color, fontSize: 8, fontFamily: "Helvetica-Bold" }]}>
          {pct}%
        </Text>
      </View>
      <View style={[styles.colStatus, { alignItems: "flex-end" }]}>
        <View style={[styles.badge, { backgroundColor: bgColor }]}>
          <Text style={[styles.badgeText, { color: color }]}>{label}</Text>
        </View>
      </View>
    </View>
  )
}

// =====================================================
// Main PDF Document
// =====================================================

export function FeedbackPDF({ feedback }: { feedback: StudentFeedbackData }) {
  const overallStatus = overallRAGStatus(feedback.percentage)
  const overallColor = ragColor(overallStatus)
  const dateStr = new Date(feedback.generatedAt).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })

  return (
    <Document
      title={`Feedback — ${feedback.studentName} — ${feedback.assignmentTitle}`}
      author="Nicolaou's Maths"
    >
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.headerBrand}>Nicolaou&apos;s Maths</Text>
            <Text style={styles.headerTitle}>Feedback Report</Text>
          </View>
          <Text style={styles.headerDate}>{dateStr}</Text>
        </View>

        {/* Student Info Bar */}
        <View style={styles.studentBar}>
          <View style={styles.metaBlock}>
            <Text style={styles.metaLabel}>Student</Text>
            <Text style={styles.metaValue}>{feedback.studentName}</Text>
          </View>
          <View style={styles.metaBlock}>
            <Text style={styles.metaLabel}>Assessment</Text>
            <Text style={[styles.metaValue, { fontSize: 11 }]}>{feedback.assignmentTitle}</Text>
            <Text style={styles.metaSubValue}>{feedback.className}</Text>
          </View>
          <View style={styles.scoreBlock}>
            <Text style={styles.metaLabel}>Overall Score</Text>
            <Text style={[styles.scorePct, { color: overallColor }]}>
              {Math.round(feedback.percentage)}%
            </Text>
            <Text style={styles.scoreDetail}>
              {feedback.totalScore} / {feedback.maxMarks} marks
            </Text>
            <View style={[styles.badge, { backgroundColor: ragBgColor(overallStatus), marginTop: 4 }]}>
              <Text style={[styles.badgeText, { color: overallColor }]}>
                {ragLabel(overallStatus)}
              </Text>
            </View>
          </View>
        </View>

        {/* Body */}
        <View style={styles.body}>
          {/* AI Narrative */}
          {feedback.aiNarrative && (
            <>
              <Text style={styles.sectionLabel}>Teacher&apos;s Summary</Text>
              <View style={styles.narrativeBox}>
                <Text style={styles.narrativeText}>{feedback.aiNarrative}</Text>
              </View>
            </>
          )}

          {/* Topic Breakdown */}
          <Text style={[styles.sectionLabel, { marginTop: feedback.aiNarrative ? 4 : 16 }]}>
            Topic Breakdown
          </Text>

          <View style={styles.table}>
            {/* Table Header */}
            <View style={styles.tableHeader}>
              <View style={styles.colTopic}>
                <Text style={styles.tableHeaderCell}>Topic / Learning Objective</Text>
              </View>
              <View style={styles.colMarks}>
                <Text style={[styles.tableHeaderCell, { textAlign: "center" }]}>Marks</Text>
              </View>
              <View style={[styles.colStatus, { alignItems: "flex-end" }]}>
                <Text style={styles.tableHeaderCell}>Status</Text>
              </View>
            </View>

            {/* Rows */}
            {feedback.topicBreakdown.map((breakdown, i) => (
              <TopicRow key={`${breakdown.topic}-${breakdown.subTopic}`} breakdown={breakdown} isAlt={i % 2 === 1} />
            ))}
          </View>

          {/* Revision Pack indicator */}
          {feedback.revisionPack && feedback.revisionPack.length > 0 && (
            <View style={{ marginTop: 16, padding: "8 12", backgroundColor: "#eff6ff", borderLeft: "3 solid #3b82f6" }}>
              <Text style={{ fontSize: 8, fontFamily: "Helvetica-Bold", color: "#1d4ed8", textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 3 }}>
                Revision Pack Available
              </Text>
              <Text style={{ fontSize: 9, color: "#1e40af", lineHeight: 1.5 }}>
                {feedback.revisionPack.length} targeted practice question{feedback.revisionPack.length > 1 ? "s" : ""} have been selected for{" "}
                {[...new Set(feedback.revisionPack.map(q => q.targetedSubTopic))].slice(0, 3).join(", ")}.
                Log in to view and attempt them online.
              </Text>
            </View>
          )}
        </View>

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>
            {feedback.studentName} · {feedback.assignmentTitle}
          </Text>
          <Text style={styles.footerText}>Nicolaou&apos;s Maths · {dateStr}</Text>
        </View>
      </Page>
    </Document>
  )
}
