import { getAuthUser } from "@/lib/auth"
import { redirect } from "next/navigation"
import { BookletGeneratorClient } from "./booklet-generator-client"
import { getTeacherClassesForBooklet } from "@/app/actions/booklet"

export default async function BookletGeneratorPage() {
  const authUser = await getAuthUser()
  if (!authUser) redirect("/sign-in")

  const { classes } = await getTeacherClassesForBooklet()

  return <BookletGeneratorClient classes={classes} />
}
