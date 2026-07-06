import { NextRequest, NextResponse } from 'next/server'
import { requireActiveUser } from '@/lib/guards'
import { audit } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const guard = await requireActiveUser()
  if ('error' in guard) return guard.error
  const { user, sb } = guard
  const url = new URL(req.url)
  const teacherId = url.searchParams.get('teacher_id')
  const status = url.searchParams.get('status')
  let q = sb.from('teacher_payouts').select('*, teacher:teachers(id,full_name,subject)').eq('user_id', user.id).order('period_month', { ascending: false })
  if (teacherId) q = q.eq('teacher_id', teacherId)
  if (status && status !== 'all') q = q.eq('status', status)
  const { data, error } = await q
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, payouts: data || [] })
}

export async function POST(req: NextRequest) {
  const guard = await requireActiveUser()
  if ('error' in guard) return guard.error
  const { user, sb } = guard
  const { teacher_id, amount, period_month, lesson_count, bonus, deduction, status, notes } = await req.json()
  if (!teacher_id || !amount || !period_month) return NextResponse.json({ ok: false, error: 'teacher_id, amount, period_month majburiy.' }, { status: 400 })
  const isPaid = status === 'paid'
  const { data, error } = await sb.from('teacher_payouts').insert({
    user_id: user.id, teacher_id, amount: Number(amount), period_month,
    lesson_count: lesson_count || 0, bonus: bonus || 0, deduction: deduction || 0,
    status: status || 'pending', paid_at: isPaid ? new Date().toISOString() : null,
    notes: notes || null,
  }).select().single()
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  await audit(user.id, 'create_payout', 'teacher_payouts', data.id, { teacher_id, amount, period_month })
  return NextResponse.json({ ok: true, payout: data })
}

export async function PUT(req: NextRequest) {
  const guard = await requireActiveUser()
  if ('error' in guard) return guard.error
  const { user, sb } = guard
  const body = await req.json()
  const { id, ...patch } = body
  if (!id) return NextResponse.json({ ok: false, error: 'id majburiy.' }, { status: 400 })
  if (patch.status === 'paid' && !patch.paid_at) patch.paid_at = new Date().toISOString()
  const { data, error } = await sb.from('teacher_payouts').update(patch).eq('id', id).eq('user_id', user.id).select().single()
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, payout: data })
}

export async function DELETE(req: NextRequest) {
  const guard = await requireActiveUser()
  if ('error' in guard) return guard.error
  const { user, sb } = guard
  const url = new URL(req.url)
  const id = url.searchParams.get('id')
  if (!id) return NextResponse.json({ ok: false, error: 'id majburiy.' }, { status: 400 })
  const { error } = await sb.from('teacher_payouts').delete().eq('id', id).eq('user_id', user.id)
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
