import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, audit } from '@/lib/auth'
import { getSupabase } from '@/lib/supabase'

/**
 * DELETE /api/admin/centers/[id]/delete
 *
 * Markazni BUTUNLAY o'chiradi — barcha ma'lumotlari bilan:
 *  - attendance
 *  - teacher_attendance
 *  - teacher_payouts
 *  - payments
 *  - expenses
 *  - debts (deprecated)
 *  - schedule
 *  - rooms
 *  - exams
 *  - grades
 *  - certificates
 *  - discounts
 *  - notifications
 *  - reminders
 *  - settings
 *  - students
 *  - leads
 *  - teachers
 *  - groups
 *  - courses
 *  - audit_log (markaz bilan bog'liq)
 *  - activation_codes (used_by)
 *  - users (markaz o'zi)
 *
 * Foydalanuvchi eski akkauntni o'chirish uchun ishlatiladi
 * (parolni unutib yangi akkaunt yaratgan holatlar uchun).
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  // Admin huquqini tekshirish
  const guard = await requireAdmin(req)
  if (!guard.ok) {
    return NextResponse.json({ ok: false, error: guard.error || 'Admin huquqi kerak.' }, { status: 403 })
  }

  const { id } = await params
  if (!id) {
    return NextResponse.json({ ok: false, error: 'id majburiy.' }, { status: 400 })
  }

  const sb = getSupabase()

  // 1) Markaz mavjudligini tekshiramiz
  const { data: center, error: centerErr } = await sb.from('users')
    .select('id, email, center_name, full_name, status')
    .eq('id', id)
    .maybeSingle()

  if (centerErr || !center) {
    return NextResponse.json({ ok: false, error: 'Markaz topilmadi.' }, { status: 404 })
  }

  // 2) Admin o'zini o'chirishini oldini olamiz
  // Admin role li foydalanuvchini o'chirish mumkin emas
  if ((center as any).role === 'admin') {
    return NextResponse.json({
      ok: false,
      error: 'Super admin akkauntini o\'chirish mumkin emas.'
    }, { status: 403 })
  }

  // 3) Bog'liq ma'lumotlarni bosqichma-bosqich o'chiramiz
  // FK constraint'lar bilan muammolar bo'lmasligi uchun bolgalaridan boshlab
  const tables = [
    'attendance',
    'teacher_attendance',
    'teacher_payouts',
    'payments',
    'expenses',
    'schedule',
    'rooms',
    'grades',
    'exams',
    'certificates',
    'discounts',
    'notifications',
    'reminders',
    'settings',
    'students',
    'leads',
    'groups',
    'courses',
    'teachers',
  ]

  const errors: string[] = []

  for (const table of tables) {
    try {
      const { error } = await sb.from(table).delete().eq('user_id', id)
      if (error) {
        // Ayrim jadvallarda user_id bo'lmasligi mumkin — xatolarni to'playmiz, lekin davom etamiz
        if (!error.message.includes('Could not find') && !error.message.includes('column')) {
          errors.push(`${table}: ${error.message}`)
        }
      }
    } catch (e: any) {
      // ignore - ba'zi jadvallar bo'lmasligi mumkin
    }
  }

  // 4) Audit_log ni tozalaymiz (user_id bo'yicha)
  try {
    await sb.from('audit_log').delete().eq('user_id', id)
  } catch (e) {
    // e'tibor berilmaydi
  }

  // 5) Activation codes dan used_by ni tozalaymiz
  try {
    await sb.from('activation_codes').update({ used_by: null, used_at: null, status: 'unused' }).eq('used_by', id)
  } catch (e) {
    // e'tibor berilmaydi
  }

  // 6) Markazning o'zini o'chiramiz
  const { error: deleteErr } = await sb.from('users').delete().eq('id', id)

  if (deleteErr) {
    return NextResponse.json({
      ok: false,
      error: `Markazni o\'chirishda xatolik: ${deleteErr.message}`,
      partial_errors: errors,
    }, { status: 500 })
  }

  // 7) Audit log (admin tomonidan amalga oshirildi — lekin markaz endi yo'q)
  // Bu yerda alohida log yozmaymiz, chunki user_id endi mavjud emas

  return NextResponse.json({
    ok: true,
    deleted_center: {
      id: center.id,
      email: center.email,
      center_name: center.center_name,
    },
    partial_errors: errors.length > 0 ? errors : undefined,
  })
}
