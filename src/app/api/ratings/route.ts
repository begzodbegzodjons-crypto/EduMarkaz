import { NextRequest, NextResponse } from 'next/server'
import { requireActiveUser } from '@/lib/guards'

export async function GET(req: NextRequest) {
  const guard = await requireActiveUser()
  if ('error' in guard) return guard.error
  const { user, sb } = guard
  const url = new URL(req.url)
  const studentId = url.searchParams.get('student_id')
  let q = sb.from('ratings').select('*, student:students(id,full_name), group:groups(id,name)').eq('user_id', user.id).order('rating_date', { ascending: false }).limit(500)
  if (studentId) q = q.eq('student_id', studentId)
  const { data, error } = await q
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, ratings: data || [] })
}

export async function POST(req: NextRequest) {
  const guard = await requireActiveUser()
  if ('error' in guard) return guard.error
  const { user, sb } = guard
  const body = await req.json()
  const { student_id, group_id, rating_date, score, comment } = body || {}
  if (!student_id || !score) return NextResponse.json({ ok: false, error: 'student_id va score majburiy.' }, { status: 400 })
  if (score < 1 || score > 5) return NextResponse.json({ ok: false, error: 'Score 1-5 oralig\'ida bo\'lishi kerak.' }, { status: 400 })
  const { data, error } = await sb.from('ratings').insert({
    user_id: user.id, student_id, group_id: group_id || null,
    rating_date: rating_date || new Date().toISOString().slice(0, 10),
    score, comment: comment || null,
  }).select().single()
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, rating: data })
}

export async function DELETE(req: NextRequest) {
  const guard = await requireActiveUser()
  if ('error' in guard) return guard.error
  const { user, sb } = guard
  const url = new URL(req.url)
  const id = url.searchParams.get('id')
  if (!id) return NextResponse.json({ ok: false, error: 'id majburiy.' }, { status: 400 })
  const { error } = await sb.from('ratings').delete().eq('id', id).eq('user_id', user.id)
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
