import { NextRequest, NextResponse } from 'next/server'
import { requireActiveUser } from '@/lib/guards'
import { audit } from '@/lib/auth'

/**
 * POST /api/leads/accept
 * Body: { lead_id, course_id, group_id }
 *
 * Vazifasi:
 *  1. Lid ma'lumotlarini o'qish (full_name, phone, ...)
 *  2. Yangi talaba yozuvi yaratish (students jadvaliga)
 *  3. Lidni leads jadvalidan o'chirish
 *  4. Audit log yozish
 */
export async function POST(req: NextRequest) {
  const guard = await requireActiveUser()
  if ('error' in guard) return guard.error
  const { user, sb } = guard

  const body = await req.json()
  const { lead_id, course_id, group_id } = body || {}

  if (!lead_id) return NextResponse.json({ ok: false, error: 'lead_id majburiy.' }, { status: 400 })
  if (!course_id) return NextResponse.json({ ok: false, error: 'Kurs tanlash majburiy.' }, { status: 400 })
  if (!group_id) return NextResponse.json({ ok: false, error: 'Guruh tanlash majburiy.' }, { status: 400 })

  // 1) Lidni o'qib olamiz (faqat o'z markaziningi)
  const { data: lead, error: leadErr } = await sb
    .from('leads')
    .select('*')
    .eq('id', lead_id)
    .eq('user_id', user.id)
    .single()

  if (leadErr || !lead) {
    return NextResponse.json({ ok: false, error: 'Lid topilmadi.' }, { status: 404 })
  }

  // 2) Talaba yozuvini yaratamiz
  const { data: student, error: studentErr } = await sb
    .from('students')
    .insert({
      user_id: user.id,
      full_name: lead.full_name,
      phone: lead.phone || null,
      parent_phone: null,
      birth_date: null,
      address: null,
      group_id,
      course_id,
      status: 'active',
      notes: lead.notes || null,
    })
    .select()
    .single()

  if (studentErr || !student) {
    return NextResponse.json(
      { ok: false, error: studentErr?.message || 'Talaba yaratishda xatolik.' },
      { status: 500 },
    )
  }

  // 3) Lidni o'chiramiz
  const { error: deleteErr } = await sb
    .from('leads')
    .delete()
    .eq('id', lead_id)
    .eq('user_id', user.id)

  if (deleteErr) {
    // Talaba yaratildi, lekin lid o'chirilmadi — muammo emas, lekin ogohlantiramiz
    await audit(user.id, 'accept_lead_partial', 'leads', lead_id, {
      student_id: student.id,
      warning: 'Student created but lead not deleted',
    })
    return NextResponse.json({
      ok: true,
      student,
      warning: 'Talaba yaratildi, lekin lidni o\'chirishda xatolik.',
    })
  }

  // 4) Audit
  await audit(user.id, 'accept_lead', 'leads', lead_id, {
    student_id: student.id,
    full_name: lead.full_name,
    course_id,
    group_id,
  })

  return NextResponse.json({ ok: true, student })
}
