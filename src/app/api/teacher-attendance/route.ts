import { NextRequest, NextResponse } from 'next/server'
import { requireActiveUser } from '@/lib/guards'
import { audit } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const guard = await requireActiveUser()
  if ('error' in guard) return guard.error
  const { user, sb } = guard
  const url = new URL(req.url)
  const teacherId = url.searchParams.get('teacher_id')
  const date = url.searchParams.get('date')
  let q = sb.from('teacher_attendance').select('*, teacher:teachers(id,full_name,subject), group:groups(id,name,course:courses(id,name))').eq('user_id', user.id).order('lesson_date', { ascending: false }).limit(1000)
  if (teacherId) q = q.eq('teacher_id', teacherId)
  if (date) q = q.eq('lesson_date', date)
  const { data, error } = await q
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, attendance: data || [] })
}

export async function POST(req: NextRequest) {
  const guard = await requireActiveUser()
  if ('error' in guard) return guard.error
  const { user, sb } = guard
  const body = await req.json()
  // Bulk: [{teacher_id, group_id, lesson_date, status, notes}]
  if (Array.isArray(body?.records)) {
    const rows = body.records.map((r: any) => ({
      user_id: user.id, teacher_id: r.teacher_id, group_id: r.group_id || null,
      lesson_date: r.lesson_date, status: r.status || 'present', notes: r.notes || null,
    }))
    if (rows.length === 0) return NextResponse.json({ ok: false, error: 'Bo\'sh yozuvlar.' }, { status: 400 })
    const { data, error } = await sb.from('teacher_attendance').insert(rows).select()
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
    await audit(user.id, 'create_teacher_attendance_bulk', 'teacher_attendance', null, { count: rows.length })
    return NextResponse.json({ ok: true, attendance: data })
  }
  const { teacher_id, group_id, lesson_date, status, notes } = body || {}
  if (!teacher_id || !lesson_date) return NextResponse.json({ ok: false, error: 'teacher_id va lesson_date majburiy.' }, { status: 400 })
  const { data, error } = await sb.from('teacher_attendance').insert({
    user_id: user.id, teacher_id, group_id: group_id || null, lesson_date,
    status: status || 'present', notes: notes || null,
  }).select().single()
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, attendance: data })
}

export async function PUT(req: NextRequest) {
  const guard = await requireActiveUser()
  if ('error' in guard) return guard.error
  const { user, sb } = guard
  const body = await req.json()
  const { id, ...patch } = body || {}
  if (!id) return NextResponse.json({ ok: false, error: 'id majburiy.' }, { status: 400 })
  const { data, error } = await sb.from('teacher_attendance').update(patch).eq('id', id).eq('user_id', user.id).select().single()
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, attendance: data })
}

export async function DELETE(req: NextRequest) {
  const guard = await requireActiveUser()
  if ('error' in guard) return guard.error
  const { user, sb } = guard
  const url = new URL(req.url)
  const id = url.searchParams.get('id')
  if (!id) return NextResponse.json({ ok: false, error: 'id majburiy.' }, { status: 400 })
  const { error } = await sb.from('teacher_attendance').delete().eq('id', id).eq('user_id', user.id)
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
