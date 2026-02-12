import { redirect } from "next/navigation"

/**
 * Legacy redirect: This page has been replaced by the Smart Digitizer workflow
 * at /dashboard/ingest?mode=digitize
 */
export default async function ExternalPaperPage() {
  redirect("/dashboard/ingest?mode=digitize")
}
