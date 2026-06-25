import { getTeacherLibrary } from "@/app/actions/library"
import { getClassList } from "@/app/actions/classes"
import { getTeacherResources } from "@/app/actions/resources"
import { LibraryClient } from "./library-client"

export default async function LibraryPage() {
  const [libraryResult, classesResult, resourcesResult] = await Promise.all([
    getTeacherLibrary(),
    getClassList(),
    getTeacherResources(),
  ])

  const items = libraryResult.success ? libraryResult.data || [] : []
  const classes = classesResult.success ? classesResult.data || [] : []
  const resources = resourcesResult.success ? resourcesResult.data || [] : []

  return <LibraryClient items={items} classes={classes} resources={resources} />
}
