import { NextResponse } from 'next/server'
import { requireActiveUser } from '@/lib/guards'

/**
 * GET /api/payments/balances
 *
 * Avtomatik to'lov kalkulyatori:
 *  - Talaba qachon ro'yxatga olingan (enrollment_date)
 *  - Qaysi kursda o'qiydi (course.price = oylik to'lov)
 *  - Birinchi oy uchun PROPORTSIONAL hisob
 *  - Keyingi oylar to'liq hisoblanadi (100%)
 *  - CHEGIRMA: aktiv chegirmalar total_due dan ayriladi
 *    - 'fixed' type: to'g'ridan-to'g'ri summa ayriladi
 *    - 'percent' type: total_due * value/100 ayriladi
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

  // 2) Barcha to'lovlar
  const { data: payments, error: pErr } = await sb
    .from('payments')
    .select('id, student_id, amount, payment_date, for_month, payment_type, description, created_at')
    .eq('user_id', user.id)

  if (pErr) return NextResponse.json({ ok: false, error: pErr.message }, { status: 500 })

  // 3) Barcha faol chegirmalar
  const { data: discounts, error: dErr } = await sb
    .from('discounts')
    .select('id, name, discount_type, value, applies_to, course_id, student_id, is_active, valid_from, valid_until')
    .eq('user_id', user.id)
    .eq('is_active', true)

  if (dErr) return NextResponse.json({ ok: false, error: dErr.message }, { status: 500 })

  const now = new Date()
  const currentMonthStr = now.toISOString().slice(0, 7)

  const balances = (students || []).map((s: any) => {
    const monthlyFee = Number(s.course?.price || 0)
    const enrollDate = s.enrollment_date ? new Date(s.enrollment_date) : new Date()

    // Oylik breakdown — proportional hisob
    const monthlyBreakdown: any[] = calculateMonthlyBreakdown(enrollDate, now, monthlyFee)

    // Umumiy to'lash kerak (chegirmasiz)
    const totalDueRaw = monthlyBreakdown.reduce((sum, m) => sum + m.due, 0)

    // === CHEGIRMA HISOBLASH ===
    let discountAmount = 0
    const applicableDiscounts: any[] = []

    if (discounts && discounts.length > 0) {
      discounts.forEach((d: any) => {
        // Muddat tekshiruvi
        if (d.valid_from && new Date(d.valid_from) > now) return
        if (d.valid_until && new Date(d.valid_until) < now) return

        let applies = false

        // 'all' - barcha talabalar
        if (d.applies_to === 'all') {
          applies = true
        }
        // 'student' - aniq talaba
        else if (d.applies_to === 'student' && d.student_id === s.id) {
          applies = true
        }
        // 'course' - aniq kurs
        else if (d.applies_to === 'course' && d.course_id === s.course_id) {
          applies = true
        }

        if (applies) {
          let amount = 0
          if (d.discount_type === 'fixed') {
            amount = Number(d.value || 0)
          } else if (d.discount_type === 'percent') {
            amount = Math.round(totalDueRaw * Number(d.value || 0) / 100)
          }

          if (amount > 0) {
            discountAmount += amount
            applicableDiscounts.push({
              id: d.id,
              name: d.name,
              type: d.discount_type,
              value: Number(d.value || 0),
              amount,
            })
          }
        }
      })
    }

    // To'lash kerak (chegirma bilan)
    const totalDue = Math.max(0, totalDueRaw - discountAmount)

    // Talabaning barcha to'lovlari
    const studentPayments = (payments || []).filter((p: any) => p.student_id === s.id)
    const totalPaid = studentPayments.reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0)

    // Qoldiq (chegirma bilan hisoblangan)
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
      total_due_raw: totalDueRaw,
      discount_amount: discountAmount,
      discount_details: applicableDiscounts,
      total_due: totalDue,
      total_paid: totalPaid,
      remaining,
      monthly_breakdown: monthlyBreakdown,
    }
  })

  const totals = {
    students_count: balances.length,
    active_students: balances.filter((b: any) => b.status === 'active').length,
    total_due_raw: balances.reduce((sum: number, b: any) => sum + b.total_due_raw, 0),
    total_discount: balances.reduce((sum: number, b: any) => sum + b.discount_amount, 0),
    total_due: balances.reduce((sum: number, b: any) => sum + b.total_due, 0),
    total_paid: balances.reduce((sum: number, b: any) => sum + b.total_paid, 0),
    total_remaining: balances.reduce((sum: number, b: any) => sum + Math.max(0, b.remaining), 0),
    students_with_debt: balances.filter((b: any) => b.remaining > 0).length,
  }

  return NextResponse.json({ ok: true, balances, totals })
}

/**
 * Oylik breakdown hisoblaydi — proportional birinchi oy uchun
 */
function calculateMonthlyBreakdown(start: Date, end: Date, monthlyFee: number): any[] {
  const result: any[] = []
  const startDate = new Date(start.getFullYear(), start.getMonth(), 1)
  const endDate = new Date(end.getFullYear(), end.getMonth(), 1)

  let current = new Date(startDate)
  let index = 0

  while (current <= endDate) {
    const year = current.getFullYear()
    const month = current.getMonth()
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
    }

    result.push({
      month: monthStr,
      month_label: `${month + 1}-oy ${year}`,
      due: Math.round(due),
      proportion,
      is_partial: isPartial,
      description,
    })

    current = new Date(year, month + 1, 1)
    index++
  }

  return result
}
