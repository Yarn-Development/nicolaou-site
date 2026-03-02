import { getTeacherLibrary } from "@/app/actions/library"
import { LibraryClient } from "./library-client"

export default async function LibraryPage() {
  const result = await getTeacherLibrary()

  const items = result.success ? result.data || [] : []

  return <LibraryClient items={items} />
}
