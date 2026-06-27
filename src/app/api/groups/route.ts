import { NextRequest, NextResponse } from 'next/server'
import { requireActiveUser } from '@/lib/guards'
import { audit } from '@/lib/auth'

export async function GET() {
  const guard = await requireActiveUser()
  if ('error' in guard) return guard.error
  const { user, sb } = guard
  const { data, error } = await sb
    .from('groups')
    .select('*, course:courses(id,name), teacher:teachers(id,full_name)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, groups: data || [] })
}

export async function POST(req: NextRequest) {
  const guard = await requireActiveUser()
  if ('error' in guard) return guard.error
  const { user, sb } = guard
  const body = await req.json()
  const { name, course_id, teacher_id, start_date, end_date, schedule, max_students } = body || {}
  if (!name) return NextResponse.json({ ok: false, error: 'Guruh nomi majburiy.' }, { status: 400 })

  const { data, error } = await sb.from('groups').insert({
    user_id: user.id,
    name,
    course_id: course_id || null,
    teacher_id: teacher_id || null,
    start_date: start_date || null,
    end_date: end_date || null,
    schedule: schedule || null,
    max_students: max_students ?? 12,
  }).select().single()
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  await audit(user.id, 'create_group', 'groups', data.id, { name })
  return NextResponse.json({ ok: true, group: data })
}

export async function PUT(req: NextRequest) {
  const guard = await requireActiveUser()
  if ('error' in guard) return guard.error
  const { user, sb } = guard
  const body = await req.json()
  const { id, ...patch } = body || {}
  if (!id) return NextResponse.json({ ok: false, error: 'id majburiy.' }, { status: 400 })
  const { data, error } = await sb.from('groups').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', id).eq('user_id', user.id).select().single()
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, group: data })
}

export async function DELETE(req: NextRequest) {
  const guard = await requireActiveUser()
  if ('error' in guard) return guard.error
  const { user, sb } = guard
  const url = new URL(req.url)
  const id = url.searchParams.get('id')
  if (!id) return NextResponse.json({ ok: false, error: 'id majburiy.' }, { status: 400 })
  const { error } = await sb.from('groups').delete().eq('id', id).eq('user_id', user.id)
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
