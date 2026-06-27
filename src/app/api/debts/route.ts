import { NextRequest, NextResponse } from 'next/server'
import { requireActiveUser } from '@/lib/guards'

// Talaba qarzlari — kim to'lamagan, qancha
// Hisob: ro'yxatga olingan oylar - to'langan oylar
export async function GET(req: NextRequest) {
  const guard = await requireActiveUser()
  if ('error' in guard) return guard.error
  const { user, sb } = guard
  const url = new URL(req.url)
  const monthStr = url.searchParams.get('month') || new Date().toISOString().slice(0, 7)
  const groupId = url.searchParams.get('group_id')
  const courseId = url.searchParams.get('course_id')

  // Barcha faol talabalar
  let studQ = sb.from('students').select('id, full_name, phone, parent_phone, group_id, course_id, enrollment_date, group:groups(id,name,course_id), course:courses(id,name,price)').eq('user_id', user.id).eq('status', 'active')
  if (groupId) studQ = studQ.eq('group_id', groupId)
  if (courseId) studQ = studQ.eq('course_id', courseId)
  const { data: students, error: studErr } = await studQ
  if (studErr) return NextResponse.json({ ok: false, error: studErr.message }, { status: 500 })

  // Shu oy uchun barcha to'lovlar
  const { data: payments, error: payErr } = await sb.from('payments').select('student_id, amount, for_month').eq('user_id', user.id).eq('for_month', monthStr)
  if (payErr) return NextResponse.json({ ok: false, error: payErr.message }, { status: 500 })

  // Talaba bo'yicha to'lov summasi
  const paidByStudent: Record<string, number> = {}
  payments?.forEach((p: any) => {
    paidByStudent[p.student_id] = (paidByStudent[p.student_id] || 0) + Number(p.amount || 0)
  })

  // Qarzdorlar ro'yxati
  const debts = (students || []).map((s: any) => {
    const expected = Number(s.course?.price || 0)
    const paid = paidByStudent[s.id] || 0
    const debt = Math.max(0, expected - paid)
    return {
      student_id: s.id,
      full_name: s.full_name,
      phone: s.phone,
      parent_phone: s.parent_phone,
      group_name: s.group?.name || null,
      course_name: s.course?.name || null,
      expected_amount: expected,
      paid_amount: paid,
      debt_amount: debt,
      is_paid: debt === 0,
      month: monthStr,
    }
  }).filter((d: any) => d.expected_amount > 0) // faqat narxi bor kursdagi talabalar

  const totalDebt = debts.reduce((sum: number, d: any) => sum + d.debt_amount, 0)
  const totalExpected = debts.reduce((sum: number, d: any) => sum + d.expected_amount, 0)
  const totalPaid = debts.reduce((sum: number, d: any) => sum + d.paid_amount, 0)
  const paidCount = debts.filter((d: any) => d.is_paid).length
  const debtCount = debts.length - paidCount

  return NextResponse.json({
    ok: true,
    month: monthStr,
    debts,
    summary: {
      total_students: debts.length,
      paid_count: paidCount,
      debt_count: debtCount,
      total_expected: totalExpected,
      total_paid: totalPaid,
      total_debt: totalDebt,
    },
  })
}
