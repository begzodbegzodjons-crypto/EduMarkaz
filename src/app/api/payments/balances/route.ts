import { NextResponse } from 'next/server'
import { requireActiveUser } from '@/lib/guards'

/**
 * GET /api/payments/balances
 *
 * Barcha faol talabalar uchun avtomatik hisob-kitob:
 *  - Talaba qachon ro'yxatga olingan (enrollment_date)
 *  - Qaysi kursda o'qiydi (course.price = oylik to'lov)
 *  - Hozirgi sanagacha necha oy o'tgan
 *  - Umumiy to'lash kerak: months × course.price
 *  - Umumiy to'lagan: sum(payments.amount)
 *  - Qoldiq (qarz): total_due - total_paid
 *  - Oylik breakdown: har bir oy uchun status (paid/partial/unpaid)
 */
export async function GET() {
  const guard = await requireActiveUser()
  if ('error' in guard) return guard.error
  const { user, sb } = guard

  // 1) Faol talabalar (kursi bilan)
  const { data: students, error: sErr } = await sb
    .from('students')
    .select('id, full_name, phone, status, enrollment_date, course_id, group_id, course:courses(id, name, price), group:groups(id, name)')
    .eq('user_id', user.id)
    .order('enrollment_date', { ascending: true })

  if (sErr) return NextResponse.json({ ok: false, error: sErr.message }, { status: 500 })

  // 2) Barcha to'lovlar
  const { data: payments, error: pErr } = await sb
    .from('payments')
    .select('id, student_id, amount, payment_date, for_month, payment_type, description')
    .eq('user_id', user.id)

  if (pErr) return NextResponse.json({ ok: false, error: pErr.message }, { status: 500 })

  // 3) Hisob-kitob
  const now = new Date()
  const currentMonthStr = now.toISOString().slice(0, 7) // YYYY-MM

  const balances = (students || []).map((s: any) => {
    const monthlyFee = Number(s.course?.price || 0)
    const enrollDate = s.enrollment_date ? new Date(s.enrollment_date) : new Date()

    // O'tgan oylar sonini hisoblash (enrollment_date → hozirgi sana)
    const monthsEnrolled = monthsBetween(enrollDate, now)

    // Umumiy to'lash kerak
    const totalDue = monthsEnrolled * monthlyFee

    // Talabaning barcha to'lovlari
    const studentPayments = (payments || []).filter((p: any) => p.student_id === s.id)
    const totalPaid = studentPayments.reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0)

    // Qoldiq
    const remaining = totalDue - totalPaid

    // Oylik breakdown
    const monthlyBreakdown: any[] = []
    for (let i = 0; i < monthsEnrolled; i++) {
      const d = new Date(enrollDate.getFullYear(), enrollDate.getMonth() + i, 1)
      const monthStr = d.toISOString().slice(0, 7)
      const monthPaid = studentPayments
        .filter((p: any) => p.for_month === monthStr || (!p.for_month && String(p.payment_date).slice(0, 7) === monthStr))
        .reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0)
      const monthDue = monthlyFee
      const status = monthPaid >= monthDue ? 'paid' : monthPaid > 0 ? 'partial' : 'unpaid'
      monthlyBreakdown.push({
        month: monthStr,
        due: monthDue,
        paid: monthPaid,
        remaining: Math.max(0, monthDue - monthPaid),
        status,
      })
    }

    return {
      student_id: s.id,
      full_name: s.full_name,
      phone: s.phone,
      status: s.status,
      course_id: s.course_id,
      course_name: s.course?.name || '—',
      group_id: s.group_id,
      group_name: s.group?.name || '—',
      enrollment_date: s.enrollment_date,
      monthly_fee: monthlyFee,
      months_enrolled: monthsEnrolled,
      total_due: totalDue,
      total_paid: totalPaid,
      remaining,
      monthly_breakdown: monthlyBreakdown,
      is_current_month_paid: monthlyBreakdown.some(
        (m) => m.month === currentMonthStr && m.status === 'paid',
      ),
    }
  })

  // Umumiy statistika
  const totals = {
    students_count: balances.length,
    active_students: balances.filter((b: any) => b.status === 'active').length,
    total_due: balances.reduce((sum: number, b: any) => sum + b.total_due, 0),
    total_paid: balances.reduce((sum: number, b: any) => sum + b.total_paid, 0),
    total_remaining: balances.reduce((sum: number, b: any) => sum + Math.max(0, b.remaining), 0),
    students_with_debt: balances.filter((b: any) => b.remaining > 0).length,
  }

  return NextResponse.json({ ok: true, balances, totals })
}

/**
 * Ikkita sana orasidagi to'liq oylar sonini hisoblaydi.
 * Agar enrollment 15-yanvar bo'lsa va now 10-mart bo'lsa → 2 oy (yanvar, fevral)
 * Agar enrollment 15-yanvar bo'lsa va now 20-mart bo'lsa → 3 oy (yanvar, fevral, mart)
 */
function monthsBetween(start: Date, end: Date): number {
  let months = (end.getFullYear() - start.getFullYear()) * 12
  months += end.getMonth() - start.getMonth()
  // Agar start sanasi oyning oxiridan bo'lsa va end sanasi oyning boshidan bo'lsa,
  // to'liq oynamaslik mumkin - lekin biz shunchaki oylar farqini olamiz
  // (foydalanuvchi to'liq oylik to'lashi kerak)
  if (end.getDate() >= start.getDate()) {
    months += 1
  }
  return Math.max(1, months) // kamida 1 oy
}
