import { NextRequest, NextResponse } from 'next/server'
import { requireActiveUser } from '@/lib/guards'
import { audit } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const guard = await requireActiveUser()
  if ('error' in guard) return guard.error
  const { user, sb } = guard
  const url = new URL(req.url)
  const studentId = url.searchParams.get('student_id')

  let q = sb.from('payments').select('*, student:students(id,full_name), group:groups(id,name)').eq('user_id', user.id).order('payment_date', { ascending: false }).limit(500)
  if (studentId) q = q.eq('student_id', studentId)
  const { data, error } = await q
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, payments: data || [] })
}

export async function POST(req: NextRequest) {
  const guard = await requireActiveUser()
  if ('error' in guard) return guard.error
  const { user, sb } = guard
  const body = await req.json()
  const { student_id, group_id, amount, payment_date, payment_type, for_month, description } = body || {}
  if (!student_id || !amount) return NextResponse.json({ ok: false, error: 'student_id va amount majburiy.' }, { status: 400 })

  const { data, error } = await sb.from('payments').insert({
    user_id: user.id,
    student_id,
    group_id: group_id || null,
    amount,
    payment_date: payment_date || new Date().toISOString().slice(0, 10),
    payment_type: payment_type || 'cash',
    for_month: for_month || null,
    description: description || null,
  }).select().single()
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  await audit(user.id, 'create_payment', 'payments', data.id, { amount, student_id })
  return NextResponse.json({ ok: true, payment: data })
}

export async function DELETE(req: NextRequest) {
  const guard = await requireActiveUser()
  if ('error' in guard) return guard.error
  const { user, sb } = guard
  const url = new URL(req.url)
  const id = url.searchParams.get('id')
  if (!id) return NextResponse.json({ ok: false, error: 'id majburiy.' }, { status: 400 })
  const { error } = await sb.from('payments').delete().eq('id', id).eq('user_id', user.id)
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
