import { NextRequest, NextResponse } from 'next/server'
import { requireActiveUser } from '@/lib/guards'
import { audit } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const guard = await requireActiveUser()
  if ('error' in guard) return guard.error
  const { user, sb } = guard
  const url = new URL(req.url)
  const category = url.searchParams.get('category')
  const from = url.searchParams.get('from')
  const to = url.searchParams.get('to')
  let q = sb.from('expenses').select('*, teacher:teachers(id,full_name)').eq('user_id', user.id).order('expense_date', { ascending: false }).limit(500)
  if (category && category !== 'all') q = q.eq('category', category)
  if (from) q = q.gte('expense_date', from)
  if (to) q = q.lte('expense_date', to)
  const { data, error } = await q
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, expenses: data || [] })
}

export async function POST(req: NextRequest) {
  const guard = await requireActiveUser()
  if ('error' in guard) return guard.error
  const { user, sb } = guard
  const body = await req.json()
  const { category, amount, expense_date, description, teacher_id } = body || {}
  if (!category || !amount) return NextResponse.json({ ok: false, error: 'Kategoriya va summa majburiy.' }, { status: 400 })
  const { data, error } = await sb.from('expenses').insert({
    user_id: user.id, category, amount, expense_date: expense_date || new Date().toISOString().slice(0, 10),
    description: description || null, teacher_id: teacher_id || null,
  }).select().single()
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  await audit(user.id, 'create_expense', 'expenses', data.id, { amount, category })
  return NextResponse.json({ ok: true, expense: data })
}

export async function DELETE(req: NextRequest) {
  const guard = await requireActiveUser()
  if ('error' in guard) return guard.error
  const { user, sb } = guard
  const url = new URL(req.url)
  const id = url.searchParams.get('id')
  if (!id) return NextResponse.json({ ok: false, error: 'id majburiy.' }, { status: 400 })
  const { error } = await sb.from('expenses').delete().eq('id', id).eq('user_id', user.id)
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
