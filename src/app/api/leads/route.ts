import { NextRequest, NextResponse } from 'next/server'
import { requireActiveUser } from '@/lib/guards'
import { audit } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const guard = await requireActiveUser()
  if ('error' in guard) return guard.error
  const { user, sb } = guard
  const url = new URL(req.url)
  const status = url.searchParams.get('status')
  let q = sb.from('leads').select('*, course:courses(id,name)').eq('user_id', user.id).order('created_at', { ascending: false })
  if (status && status !== 'all') q = q.eq('status', status)
  const { data, error } = await q
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, leads: data || [] })
}

export async function POST(req: NextRequest) {
  const guard = await requireActiveUser()
  if ('error' in guard) return guard.error
  const { user, sb } = guard
  const body = await req.json()
  const { full_name, phone, source, interested_course_id, status, notes } = body || {}
  if (!full_name) return NextResponse.json({ ok: false, error: 'Ism majburiy.' }, { status: 400 })
  const { data, error } = await sb.from('leads').insert({
    user_id: user.id, full_name, phone: phone || null, source: source || null,
    interested_course_id: interested_course_id || null, status: status || 'new', notes: notes || null,
  }).select().single()
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  await audit(user.id, 'create_lead', 'leads', data.id, { name: full_name })
  return NextResponse.json({ ok: true, lead: data })
}

export async function PUT(req: NextRequest) {
  const guard = await requireActiveUser()
  if ('error' in guard) return guard.error
  const { user, sb } = guard
  const body = await req.json()
  const { id, ...patch } = body || {}
  if (!id) return NextResponse.json({ ok: false, error: 'id majburiy.' }, { status: 400 })
  const { data, error } = await sb.from('leads').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', id).eq('user_id', user.id).select().single()
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, lead: data })
}

export async function DELETE(req: NextRequest) {
  const guard = await requireActiveUser()
  if ('error' in guard) return guard.error
  const { user, sb } = guard
  const url = new URL(req.url)
  const id = url.searchParams.get('id')
  if (!id) return NextResponse.json({ ok: false, error: 'id majburiy.' }, { status: 400 })
  const { error } = await sb.from('leads').delete().eq('id', id).eq('user_id', user.id)
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
