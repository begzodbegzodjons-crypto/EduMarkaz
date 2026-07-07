import { NextResponse } from 'next/server'
import { getSession, getUserById, syncUserStatus, toPublicUser } from '@/lib/auth'

export async function GET() {
  const sess = await getSession()
  if (!sess) return NextResponse.json({ ok: false, user: null })

  // Bazadan eng so'nggi holatni olamiz (status sinxronizatsiyasi uchun)
  const dbUser = await getUserById(sess.id)
  if (!dbUser) return NextResponse.json({ ok: false, user: null })

  const synced = await syncUserStatus(dbUser)
  return NextResponse.json({ ok: true, user: toPublicUser(synced) })
}
