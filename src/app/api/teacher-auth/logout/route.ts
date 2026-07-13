import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

const TEACHER_COOKIE = 'erp_teacher_session'

export async function POST() {
  const store = await cookies()
  store.delete(TEACHER_COOKIE)
  return NextResponse.json({ ok: true })
}
