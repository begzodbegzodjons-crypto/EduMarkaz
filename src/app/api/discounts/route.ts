import { NextRequest, NextResponse } from 'next/server'
import { requireActiveUser } from '@/lib/guards'

export async function GET(req: NextRequest) {
  const guard = await requireActiveUser()
  if ('error' in guard) return guard.error
  const { user, sb } = guard
  const url = new URL(req.url)
  const activeOnly = url.searchParams.get('active') === 'true'
  let q = sb.from('discounts').select('*, course:courses(id,name), student:students(id,full_name)').eq('user_id', user.id).order('created_at', { ascending: false })
  if (activeOnly) q = q.eq('is_active', true)
  const { data, error } = await q
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, discounts: data || [] })
}

export async function POST(req: NextRequest) {
  const guard = await requireActiveUser()
  if ('error' in guard) return guard.error
  const { user, sb } = guard
  const { name, discount_type, value, valid_from, valid_until, applies_to, course_id, student_id, is_active } = await req.json()
  if (!name || !discount_type || value === undefined) return NextResponse.json({ ok: false, error: 'name, discount_type, value majburiy.' }, { status: 400 })
  const { data, error } = await sb.from('discounts').insert({
    user_id: user.id, name, discount_type, value: Number(value),
    valid_from: valid_from || null, valid_until: valid_until || null,
    applies_to: applies_to || 'all', course_id: course_id || null, student_id: student_id || null,
    is_active: is_active !== false,
  }).select().single()
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, discount: data })
}

export async function PUT(req: NextRequest) {
  const guard = await requireActiveUser()
  if ('error' in guard) return guard.error
  const { user, sb } = guard
  const body = await req.json()
  const { id, ...patch } = body
  if (!id) return NextResponse.json({ ok: false, error: 'id majburiy.' }, { status: 400 })
  const { data, error } = await sb.from('discounts').update(patch).eq('id', id).eq('user_id', user.id).select().single()
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, discount: data })
}

export async function DELETE(req: NextRequest) {
  const guard = await requireActiveUser()
  if ('error' in guard) return guard.error
  const { user, sb } = guard
  const url = new URL(req.url)
  const id = url.searchParams.get('id')
  if (!id) return NextResponse.json({ ok: false, error: 'id majburiy.' }, { status: 400 })
  const { error } = await sb.from('discounts').delete().eq('id', id).eq('user_id', user.id)
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
