import { NextRequest, NextResponse } from 'next/server'
import { requireActiveUser } from '@/lib/guards'

// ============================================================================
//  TALABA QARZLARI — DARS SONI BO'YCHA AVTOMATIK HISOB
// ============================================================================
//  Hisoblash mantig'i:
//  - Kurs narxi (course.price) = o'sha kurs uchun 1 oylik to'lov
//  - Guruh jadvali (groups.schedule) asosida oyiga nechta dars bo'lishi aniqlanadi
//  - Har bir dars narxi = kurs_narxi / oyiga_darslar_soni
//  - O'tilgan darslar soni = attendance jadvalida shu guruh uchun yozilgan
//    noyob lesson_date lar soni (shu oyda, talabaning enrollment_date dan keyin)
//  - Kutilgan to'lov = har_bir_dars_narxi × o'tilgan_darslar_soni
//  - Chegirma (discounts) shu summadan ayiriladi
//  - Qarz = max(0, kutilgan - to'langan)
//
//  Agar jadval bo'sh bo'lsa yoki parchalanmagan bo'lsa, eskicha (to'liq narx) ishlatiladi.
//  Agar jadval bor lekin o'tilgan darslar 0 bo'lsa, qarz = 0 (dars o'tilmagan = to'lov yo'q).
// ============================================================================

// ---------- Yordamchi: schedule matnidan oyiga darslar sonini topish ----------
// schedule namunalari: "Toq kun 14:00", "Juft kun 10:00-12:00", "Du-Chor-Juma 14:00",
//                      "Dushanba, Chorshanba, Juma", "Har kun 09:00", "Se,Pa 18:00"
function countScheduledLessonsInMonth(schedule: string | null, year: number, month: number): number {
  if (!schedule) return 0
  const s = schedule.toLowerCase().trim()
  if (!s) return 0

  const daysInMonth = new Date(year, month + 1, 0).getDate()

  // 1) Toq kun (oyning toq kunlari: 1, 3, 5, ...)
  if (s.includes('toq')) {
    let count = 0
    for (let d = 1; d <= daysInMonth; d += 2) count++
    return count
  }
  // 2) Juft kun (oyning juft kunlari: 2, 4, 6, ...)
  if (s.includes('juft')) {
    let count = 0
    for (let d = 2; d <= daysInMonth; d += 2) count++
    return count
  }
  // 3) Har kun (har kuni)
  if (s.includes('har kun') || s.includes('har-kun') || s.includes('har kuni')) {
    return daysInMonth
  }

  // 4) Hafta kunlari bo'yicha (o'zbekcha nomlar va qisqartmalar)
  //    0=Yakshanba, 1=Dushanba, 2=Seshanba, 3=Chorshanba, 4=Payshanba, 5=Juma, 6=Shanba
  //    Eslatma: \bju\b "juft" ga mos kelmaydi (chunki "juft"da "ju"dan keyin "ft" bor)
  const dayPatterns: Array<{ dow: number; patterns: RegExp[] }> = [
    { dow: 0, patterns: [/yakshanba/i, /\byak\b/i, /\bya\b/i] },          // Yakshanba
    { dow: 1, patterns: [/dushanba/i, /dush/i, /\bdu\b/i] },              // Dushanba
    { dow: 2, patterns: [/seshanba/i, /sesh/i, /\bse\b/i] },              // Seshanba
    { dow: 3, patterns: [/chorshanba/i, /chor/i, /\bch\b/i] },            // Chorshanba
    { dow: 4, patterns: [/payshanba/i, /paysh/i, /\bpa\b/i] },            // Payshanba
    { dow: 5, patterns: [/juma/i, /\bju\b/i] },                            // Juma
    { dow: 6, patterns: [/\bshanba\b/i, /\bsha\b/i, /\bsh\b/i] },        // Shanba (faqat alohida so'z sifatida)
  ]

  // Ehtiyot chorasi: "shanba" Yakshanba bilan ham mos keladi.
  // Agar matnda "yak" topilsa, Yakshanba ham qo'shiladi.
  const matchedDays = new Set<number>()
  for (const { dow, patterns } of dayPatterns) {
    for (const re of patterns) {
      if (re.test(s)) {
        matchedDays.add(dow)
        break
      }
    }
  }

  // "Shanba" Yakshanba bilan ham mos keladi — lekin Yakshanba alohida ko'rsatilmasa,
  // u faqat "shanba" sifatida qabul qilinadi (Shanba kuni).
  // Agar foydalanuvchi "Yakshanba" yoki "yak" yozsa, u alohida qo'shiladi.

  if (matchedDays.size === 0) return 0

  let count = 0
  for (let d = 1; d <= daysInMonth; d++) {
    const dow = new Date(year, month, d).getDay()
    if (matchedDays.has(dow)) count++
  }
  return count
}

export async function GET(req: NextRequest) {
  const guard = await requireActiveUser()
  if ('error' in guard) return guard.error
  const { user, sb } = guard
  const url = new URL(req.url)
  const monthStr = url.searchParams.get('month') || new Date().toISOString().slice(0, 7)
  const groupId = url.searchParams.get('group_id')
  const courseId = url.searchParams.get('course_id')

  // Oy boshlanishi va tugashi sanalari
  const [yearStr, monthNumStr] = monthStr.split('-')
  const year = Number(yearStr)
  const month = Number(monthNumStr) - 1 // JS oylari 0-indeksli
  const fromDate = `${monthStr}-01`
  const lastDay = new Date(year, month + 1, 0).getDate()
  const toDate = `${monthStr}-${String(lastDay).padStart(2, '0')}`

  // 1) Barcha faol talabalar (guruh va kurs ma'lumotlari bilan)
  let studQ = sb
    .from('students')
    .select('id, full_name, phone, parent_phone, group_id, course_id, enrollment_date, group:groups(id,name,course_id,schedule), course:courses(id,name,price)')
    .eq('user_id', user.id)
    .eq('status', 'active')
  if (groupId) studQ = studQ.eq('group_id', groupId)
  if (courseId) studQ = studQ.eq('course_id', courseId)
  const { data: students, error: studErr } = await studQ
  if (studErr) return NextResponse.json({ ok: false, error: studErr.message }, { status: 500 })

  // 2) Shu oy uchun barcha to'lovlar
  const { data: payments, error: payErr } = await sb
    .from('payments')
    .select('student_id, amount, for_month')
    .eq('user_id', user.id)
    .eq('for_month', monthStr)
  if (payErr) return NextResponse.json({ ok: false, error: payErr.message }, { status: 500 })

  const paidByStudent: Record<string, number> = {}
  payments?.forEach((p: any) => {
    paidByStudent[p.student_id] = (paidByStudent[p.student_id] || 0) + Number(p.amount || 0)
  })

  // 3) Shu oy uchun barcha davomat yozuvlari — guruh bo'yicha o'tilgan dars sanalarini topish
  const { data: attendance, error: attErr } = await sb
    .from('attendance')
    .select('student_id, group_id, lesson_date, status')
    .eq('user_id', user.id)
    .gte('lesson_date', fromDate)
    .lte('lesson_date', toDate)
  if (attErr) return NextResponse.json({ ok: false, error: attErr.message }, { status: 500 })

  // Guruh bo'yicha o'tilgan dars sanalari (noyob lesson_date lar)
  const taughtDatesByGroup: Record<string, Set<string>> = {}
  attendance?.forEach((a: any) => {
    const gid = a.group_id
    if (!gid) return
    if (!taughtDatesByGroup[gid]) taughtDatesByGroup[gid] = new Set()
    taughtDatesByGroup[gid].add(String(a.lesson_date).slice(0, 10))
  })

  // 4) Aktiv chegirmalar
  const { data: discounts } = await sb
    .from('discounts')
    .select('id, name, discount_type, value, applies_to, course_id, student_id, is_active, valid_from, valid_until')
    .eq('user_id', user.id)
    .eq('is_active', true)
  const allDiscounts = discounts || []

  // Talaba uchun mos chegirmani topish (student > course > all)
  function findDiscount(studentId: string, courseId: string | null, monthStr: string): any | null {
    const inRange = (d: any) => {
      const from = d.valid_from ? String(d.valid_from).slice(0, 10) : null
      const until = d.valid_until ? String(d.valid_until).slice(0, 10) : null
      if (from && monthStr < from.slice(0, 7)) return false
      if (until && monthStr > until.slice(0, 7)) return false
      return true
    }
    // 1. Talabaga bog'langan
    let d = allDiscounts.find((x: any) => x.applies_to === 'student' && x.student_id === studentId && inRange(x))
    if (d) return d
    // 2. Kursga bog'langan
    if (courseId) {
      d = allDiscounts.find((x: any) => x.applies_to === 'course' && x.course_id === courseId && inRange(x))
      if (d) return d
    }
    // 3. Hamma uchun
    d = allDiscounts.find((x: any) => x.applies_to === 'all' && inRange(x))
    return d || null
  }

  // Chegirma summasini hisoblash
  function calcDiscountAmount(amount: number, d: any | null): number {
    if (!d) return 0
    if (d.discount_type === 'percent') {
      const pct = Math.max(0, Math.min(100, Number(d.value) || 0))
      return Math.round((amount * pct) / 100)
    }
    // fixed
    return Math.min(Number(d.value) || 0, amount)
  }

  // 5) Har bir talaba uchun qarz hisoblash
  const debts = (students || [])
    .map((s: any) => {
      const coursePrice = Number(s.course?.price || 0)
      const schedule: string | null = s.group?.schedule || null
      const gid: string | null = s.group?.id || s.group_id || null

      // Oyiga rejalashtirilgan darslar soni (jadval asosida)
      const scheduledLessons = countScheduledLessonsInMonth(schedule, year, month)

      // O'tilgan darslar soni (davomat yozuvlaridan)
      const taughtSet = gid && taughtDatesByGroup[gid] ? taughtDatesByGroup[gid] : new Set<string>()
      let taughtLessons = taughtSet.size

      // Talabaning ro'yxatga olingan sanasidan keyingi darslarni hisobla
      const enrollmentDate = s.enrollment_date ? String(s.enrollment_date).slice(0, 10) : null
      if (enrollmentDate) {
        let count = 0
        taughtSet.forEach((d: string) => {
          if (d >= enrollmentDate) count++
        })
        taughtLessons = count
      }

      // Hisoblash
      let perLessonPrice = 0
      let expectedRaw = 0
      let calcMode = 'full' // 'full' | 'per_lesson' | 'no_schedule'

      if (scheduledLessons > 0) {
        // Jadval mavjud — har bir dars bo'yicha hisob
        perLessonPrice = coursePrice / scheduledLessons
        expectedRaw = Math.round(perLessonPrice * taughtLessons)
        calcMode = taughtLessons > 0 ? 'per_lesson' : 'no_lessons_yet'
      } else {
        // Jadval yo'q yoki parse qilib bo'lmadi — to'liq narx (eski usul)
        expectedRaw = coursePrice
        calcMode = 'no_schedule'
      }

      // Chegirma
      const discount = findDiscount(s.id, s.course_id || null, monthStr)
      const discountAmount = calcDiscountAmount(expectedRaw, discount)
      const expectedAfterDiscount = Math.max(0, expectedRaw - discountAmount)

      const paid = paidByStudent[s.id] || 0
      const debt = Math.max(0, expectedAfterDiscount - paid)

      return {
        student_id: s.id,
        full_name: s.full_name,
        phone: s.phone,
        parent_phone: s.parent_phone,
        group_name: s.group?.name || null,
        course_name: s.course?.name || null,
        course_price: coursePrice,
        schedule: schedule || null,
        scheduled_lessons: scheduledLessons,
        taught_lessons: taughtLessons,
        per_lesson_price: Math.round(perLessonPrice),
        expected_raw: expectedRaw,
        discount_amount: discountAmount,
        discount_name: discount?.name || null,
        discount_type: discount?.discount_type || null,
        discount_value: discount ? Number(discount.value) : null,
        expected_amount: expectedAfterDiscount,
        paid_amount: paid,
        debt_amount: debt,
        is_paid: debt === 0,
        month: monthStr,
        enrollment_date: enrollmentDate,
        calc_mode: calcMode,
      }
    })
    .filter((d: any) => d.course_price > 0) // faqat narxi bor kursdagi talabalar

  const totalDebt = debts.reduce((sum: number, d: any) => sum + d.debt_amount, 0)
  const totalExpected = debts.reduce((sum: number, d: any) => sum + d.expected_amount, 0)
  const totalPaid = debts.reduce((sum: number, d: any) => sum + d.paid_amount, 0)
  const totalDiscount = debts.reduce((sum: number, d: any) => sum + d.discount_amount, 0)
  const totalRawExpected = debts.reduce((sum: number, d: any) => sum + d.expected_raw, 0)
  const paidCount = debts.filter((d: any) => d.is_paid).length
  const debtCount = debts.length - paidCount
  const noLessonsCount = debts.filter((d: any) => d.calc_mode === 'no_lessons_yet').length

  return NextResponse.json({
    ok: true,
    month: monthStr,
    debts,
    summary: {
      total_students: debts.length,
      paid_count: paidCount,
      debt_count: debtCount,
      total_expected: totalExpected,
      total_expected_raw: totalRawExpected,
      total_paid: totalPaid,
      total_debt: totalDebt,
      total_discount: totalDiscount,
      no_lessons_count: noLessonsCount,
    },
  })
}
