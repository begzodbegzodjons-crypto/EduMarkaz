import { NextResponse } from 'next/server'
import { requireActiveUser } from '@/lib/guards'

/**
 * GET /api/payments/balances
 *
 * Avtomatik to'lov kalkulyatori:
 *  - Talaba qachon ro'yxatga olingan (enrollment_date)
 *  - Qaysi kursda o'qiydi (course.price = oylik to'lov)
 *  - Birinchi oy uchun PROPORTSIONAL hisob:
 *      proportion = (oydagi kunlar - kelgan kun + 1) / oydagi kunlar
 *      masalan, 15-iyunda kelgan, 30 kunlik oy:
 *      proportion = (30 - 15 + 1) / 30 = 16/30 = 53.3%
 *  - Keyingi oyllar to'liq hisoblanadi (100%)
 *  - Hozirgi oy (agar to'liq o'tmagan bo'lsa) - proportional
 *  - To'lagan summa va qoldiq avtomatik hisoblanadi
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

  // 2) Barcha to'lovlar (created_at ham olib, soat bilan saqlash uchun)
  const { data: payments, error: pErr } = await sb
    .from('payments')
    .select('id, student_id, amount, payment_date, for_month, payment_type, description, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (pErr) return NextResponse.json({ ok: false, error: pErr.message }, { status: 500 })

  const now = new Date()
  const currentMonthStr = now.toISOString().slice(0, 7)

  const balances = (students || []).map((s: any) => {
    const monthlyFee = Number(s.course?.price || 0)
    const enrollDate = s.enrollment_date ? new Date(s.enrollment_date) : new Date()

    // Oylik breakdown — har bir oy uchun proportional hisob
    const monthlyBreakdown: any[] = calculateMonthlyBreakdown(enrollDate, now, monthlyFee)

    // Umumiy to'lash kerak
    const totalDue = monthlyBreakdown.reduce((sum, m) => sum + m.due, 0)

    // Talabaning barcha to'lovlari
    const studentPayments = (payments || []).filter((p: any) => p.student_id === s.id)
    const totalPaid = studentPayments.reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0)

    // Qoldiq
    const remaining = Math.max(0, totalDue - totalPaid)

    // Birinchi oy uchun proportional foiz
    const firstMonth = monthlyBreakdown[0]
    const firstMonthProportion = firstMonth ? firstMonth.proportion : 1

    // Qabul qilingan oy va kun
    const enrollDay = enrollDate.getDate()
    const enrollMonth = enrollDate.getMonth() + 1
    const daysInEnrollMonth = new Date(enrollDate.getFullYear(), enrollDate.getMonth() + 1, 0).getDate()
    const firstMonthDays = daysInEnrollMonth - enrollDay + 1

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
      months_enrolled: monthlyBreakdown.length,
      // Avtomatik kalkulyator ma'lumotlari
      first_month_proportion: firstMonthProportion,
      first_month_days: firstMonthDays,
      first_month_full_days: daysInEnrollMonth,
      enroll_day: enrollDay,
      enroll_month: enrollMonth,
      first_month_due: firstMonth ? firstMonth.due : monthlyFee,
      total_due: totalDue,
      total_paid: totalPaid,
      remaining,
      monthly_breakdown: monthlyBreakdown,
    }
  })

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
 * Oylik breakdown hisoblaydi — proportional birinchi oy uchun
 * Birinchi oy: qolgan kunlar / oydagi kunlar × oylik to'lov
 * Keyingi oylar: to'liq oylik to'lov
 * Hozirgi oy (agar to'liq bo'lmasa): proportional
 */
function calculateMonthlyBreakdown(start: Date, end: Date, monthlyFee: number): any[] {
  const result: any[] = []
  const startDate = new Date(start.getFullYear(), start.getMonth(), 1)
  const endDate = new Date(end.getFullYear(), end.getMonth(), 1)

  // Oylarni sanab chiqamiz
  let current = new Date(startDate)
  let index = 0

  while (current <= endDate) {
    const year = current.getFullYear()
    const month = current.getMonth() // 0-11
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const monthStr = `${year}-${String(month + 1).padStart(2, '0')}`

    let due = monthlyFee
    let proportion = 1
    let isPartial = false
    let description = "To'liq oy"

    if (index === 0) {
      // Birinchi oy — proportional
      const enrollDay = start.getDate()
      const remainingDays = daysInMonth - enrollDay + 1
      proportion = remainingDays / daysInMonth
      due = Math.round(monthlyFee * proportion)
      isPartial = proportion < 1
      description = `Qabul: ${enrollDay}-${month + 1}-kun, ${remainingDays}/${daysInMonth} kun`
    } else if (current.getTime() === endDate.getTime()) {
      // Hozirgi oy — agar to'liq o'tmagan bo'lsa, proportional
      const today = end.getDate()
      const elapsedDays = today
      // Hozirgi oy uchun - to'liq hisoblaymiz (oldindan to'lov mantiqi)
      // Yoki proportional qilsak ham bo'ladi - lekin odatda to'liq hisoblanadi
      proportion = 1
      due = monthlyFee
      description = "To'liq oy (joriy)"
    }

    result.push({
      month: monthStr,
      month_label: `${month + 1}-oy ${year}`,
      due: Math.round(due),
      proportion,
      is_partial: isPartial,
      description,
    })

    // Keyingi oyga o'tish
    current = new Date(year, month + 1, 1)
    index++
  }

  return result
}
