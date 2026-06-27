import { NextRequest, NextResponse } from 'next/server'
import { requireActiveUser } from '@/lib/guards'
import { audit } from '@/lib/auth'

export async function GET() {
  const guard = await requireActiveUser()
  if ('error' in guard) return guard.error
  const { user, sb } = guard
  const { data, error } = await sb.from('students').select('*, group:groups(id,name), course:courses(id,name)').eq('user_id', user.id).order('created_at', { ascending: false })
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, students: data || [] })
}

export async function POST(req: NextRequest) {
  const guard = await requireActiveUser()
  if ('error' in guard) return guard.error
  const { user, sb } = guard
  const body = await req.json()
  const { full_name, phone, parent_phone, birth_date, address, group_id, course_id, status, notes } = body || {}
  if (!full_name) return NextResponse.json({ ok: false, error: 'Talaba ismi majburiy.' }, { status: 400 })

  const { data, error } = await sb
    .from('students')
    .insert({
      user_id: user.id,
      full_name,
      phone: phone || null,
      parent_phone: parent_phone || null,
      birth_date: birth_date || null,
      address: address || null,
      group_id: group_id || null,
      course_id: course_id || null,
      status: status || 'active',
      notes: notes || null,
    })
    .select()
    .single()
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  await audit(user.id, 'create_student', 'students', data.id, { name: full_name })
  return NextResponse.json({ ok: true, student: data })
}

export async function PUT(req: NextRequest) {
  const guard = await requireActiveUser()
  if ('error' in guard) return guard.error
  const { user, sb } = guard
  const body = await req.json()
  const { id, ...patch } = body || {}
  if (!id) return NextResponse.json({ ok: false, error: 'id majburiy.' }, { status: 400 })

  const { data, error } = await sb.from('students').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', id).eq('user_id', user.id).select().single()
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  await audit(user.id, 'update_student', 'students', id, patch)
  return NextResponse.json({ ok: true, student: data })
}

export async function DELETE(req: NextRequest) {
  const guard = await requireActiveUser()
  if ('error' in guard) return guard.error
  const { user, sb } = guard
  const url = new URL(req.url)
  const id = url.searchParams.get('id')
  if (!id) return NextResponse.json({ ok: false, error: 'id majburiy.' }, { status: 400 })

  const { error } = await sb.from('students').delete().eq('id', id).eq('user_id', user.id)
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  await audit(user.id, 'delete_student', 'students', id)
  return NextResponse.json({ ok: true })
}
