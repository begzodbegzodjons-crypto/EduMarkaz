import { NextRequest, NextResponse } from 'next/server'
import { requireActiveUser } from '@/lib/guards'

export async function GET(req: NextRequest) {
  const guard = await requireActiveUser()
  if ('error' in guard) return guard.error
  const { user, sb } = guard
  const url = new URL(req.url)
  const upcoming = url.searchParams.get('upcoming')
  let q = sb.from('reminders').select('*').eq('user_id', user.id).order('reminder_date', { ascending: true })
  if (upcoming === 'true') {
    const today = new Date().toISOString().slice(0, 10)
    q = q.gte('reminder_date', today)
  }
  const { data, error } = await q
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, reminders: data || [] })
}

export async function POST(req: NextRequest) {
  const guard = await requireActiveUser()
  if ('error' in guard) return guard.error
  const { user, sb } = guard
  const body = await req.json()
  const { title, description, reminder_date } = body || {}
  if (!title || !reminder_date) return NextResponse.json({ ok: false, error: 'Sarlavha va sana majburiy.' }, { status: 400 })
  const { data, error } = await sb.from('reminders').insert({
    user_id: user.id, title, description: description || null, reminder_date,
  }).select().single()
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, reminder: data })
}

export async function PUT(req: NextRequest) {
  const guard = await requireActiveUser()
  if ('error' in guard) return guard.error
  const { user, sb } = guard
  const body = await req.json()
  const { id, ...patch } = body || {}
  if (!id) return NextResponse.json({ ok: false, error: 'id majburiy.' }, { status: 400 })
  const { data, error } = await sb.from('reminders').update(patch).eq('id', id).eq('user_id', user.id).select().single()
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, reminder: data })
}

export async function DELETE(req: NextRequest) {
  const guard = await requireActiveUser()
  if ('error' in guard) return guard.error
  const { user, sb } = guard
  const url = new URL(req.url)
  const id = url.searchParams.get('id')
  if (!id) return NextResponse.json({ ok: false, error: 'id majburiy.' }, { status: 400 })
  const { error } = await sb.from('reminders').delete().eq('id', id).eq('user_id', user.id)
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
