import { NextRequest, NextResponse } from 'next/server'
import { requireActiveUser } from '@/lib/guards'
import { randomBytes } from 'crypto'

function generateCertNumber(): string {
  // Format: EM-YYYY-XXXXXX
  const year = new Date().getFullYear()
  const rand = randomBytes(3).toString('hex').toUpperCase()
  return `EM-${year}-${rand}`
}

export async function GET(req: NextRequest) {
  const guard = await requireActiveUser()
  if ('error' in guard) return guard.error
  const { user, sb } = guard
  const url = new URL(req.url)
  const studentId = url.searchParams.get('student_id')
  let q = sb.from('certificates').select('*, student:students(id,full_name), course:courses(id,name)').eq('user_id', user.id).order('issue_date', { ascending: false })
  if (studentId) q = q.eq('student_id', studentId)
  const { data, error } = await q
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, certificates: data || [] })
}

export async function POST(req: NextRequest) {
  const guard = await requireActiveUser()
  if ('error' in guard) return guard.error
  const { user, sb } = guard
  const { student_id, course_id, issue_date, notes } = await req.json()
  if (!student_id) return NextResponse.json({ ok: false, error: 'student_id majburiy.' }, { status: 400 })

  // Unique certificate number
  let certNumber = generateCertNumber()
  let tries = 0
  while (tries < 5) {
    const { data: existing } = await sb.from('certificates').select('id').eq('certificate_number', certNumber).maybeSingle()
    if (!existing) break
    certNumber = generateCertNumber()
    tries++
  }

  const { data, error } = await sb.from('certificates').insert({
    user_id: user.id, student_id, course_id: course_id || null,
    certificate_number: certNumber, issue_date: issue_date || new Date().toISOString().slice(0, 10),
    notes: notes || null,
  }).select().single()
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, certificate: data })
}

export async function DELETE(req: NextRequest) {
  const guard = await requireActiveUser()
  if ('error' in guard) return guard.error
  const { user, sb } = guard
  const url = new URL(req.url)
  const id = url.searchParams.get('id')
  if (!id) return NextResponse.json({ ok: false, error: 'id majburiy.' }, { status: 400 })
  const { error } = await sb.from('certificates').delete().eq('id', id).eq('user_id', user.id)
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
