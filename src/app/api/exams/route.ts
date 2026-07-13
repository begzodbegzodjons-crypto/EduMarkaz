import { NextRequest, NextResponse } from 'next/server'
import { requireActiveUser } from '@/lib/guards'

export async function GET(req: NextRequest) {
  const guard = await requireActiveUser()
  if ('error' in guard) return guard.error
  const { user, sb } = guard
  const url = new URL(req.url)
  const groupId = url.searchParams.get('group_id')
  const courseId = url.searchParams.get('course_id')
  let q = sb.from('exams').select('*, group:groups(id,name), course:courses(id,name)').eq('user_id', user.id).order('exam_date', { ascending: false })
  if (groupId) q = q.eq('group_id', groupId)
  if (courseId) q = q.eq('course_id', courseId)
  const { data, error } = await q
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, exams: data || [] })
}

export async function POST(req: NextRequest) {
  const guard = await requireActiveUser()
  if ('error' in guard) return guard.error
  const { user, sb } = guard
  const { title, description, exam_date, max_score, group_id, course_id } = await req.json()
  if (!title || !exam_date) return NextResponse.json({ ok: false, error: 'title va exam_date majburiy.' }, { status: 400 })
  const { data, error } = await sb.from('exams').insert({
    user_id: user.id, title, description: description || null, exam_date,
    max_score: max_score || 100, group_id: group_id || null, course_id: course_id || null,
  }).select().single()
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, exam: data })
}

export async function DELETE(req: NextRequest) {
  const guard = await requireActiveUser()
  if ('error' in guard) return guard.error
  const { user, sb } = guard
  const url = new URL(req.url)
  const id = url.searchParams.get('id')
  if (!id) return NextResponse.json({ ok: false, error: 'id majburiy.' }, { status: 400 })
  const { error } = await sb.from('exams').delete().eq('id', id).eq('user_id', user.id)
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
