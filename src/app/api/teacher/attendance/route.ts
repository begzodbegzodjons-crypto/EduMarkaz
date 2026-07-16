import { NextRequest, NextResponse } from 'next/server'
import { requireActiveTeacher } from '@/lib/teacher-guards'

<<<<<<< HEAD
=======
/**
 * GET /api/teacher/attendance?group_id=xxx&date=YYYY-MM-DD
 * O'qituvchi o'z guruhining belgilangan sanadagi davomatini oladi
 */
>>>>>>> bad376165bf9a231143870406dff1be057c69c6c
export async function GET(req: NextRequest) {
  const guard = await requireActiveTeacher()
  if ('error' in guard) return guard.error
  const { teacher, sb, user_id } = guard

  const url = new URL(req.url)
  const groupId = url.searchParams.get('group_id')
  const date = url.searchParams.get('date')
<<<<<<< HEAD
  if (!groupId || !date) return NextResponse.json({ ok: false, error: 'group_id va date majburiy.' }, { status: 400 })

  const { data: group } = await sb.from('groups')
    .select('id, name').eq('id', groupId).eq('user_id', user_id).eq('teacher_id', teacher.id).maybeSingle()
  if (!group) return NextResponse.json({ ok: false, error: 'Ruxsat yo\'q.' }, { status: 403 })

  const { data, error } = await sb.from('attendance')
    .select('id, student_id, group_id, lesson_date, status, notes, created_at')
    .eq('group_id', groupId).eq('lesson_date', date).eq('user_id', user_id)
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, attendance: data || [] })
}

=======

  if (!groupId || !date) {
    return NextResponse.json({ ok: false, error: 'group_id va date majburiy.' }, { status: 400 })
  }

  // Guruh o'qituvchining ekanini tekshirish
  const { data: group } = await sb.from('groups')
    .select('id, name')
    .eq('id', groupId)
    .eq('user_id', user_id)
    .eq('teacher_id', teacher.id)
    .maybeSingle()

  if (!group) {
    return NextResponse.json({ ok: false, error: 'Guruh topilmadi yoki ruxsat yo\'q.' }, { status: 403 })
  }

  const { data, error } = await sb.from('attendance')
    .select('id, student_id, group_id, lesson_date, status, notes, created_at')
    .eq('group_id', groupId)
    .eq('lesson_date', date)
    .eq('user_id', user_id)

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true, attendance: data || [] })
}

/**
 * POST /api/teacher/attendance
 * Body: { group_id, lesson_date, records: [{student_id, status, notes?}] }
 * O'qituvchi davomatni saqlaydi (bulk)
 */
>>>>>>> bad376165bf9a231143870406dff1be057c69c6c
export async function POST(req: NextRequest) {
  const guard = await requireActiveTeacher()
  if ('error' in guard) return guard.error
  const { teacher, sb, user_id } = guard

  const body = await req.json()
  const { group_id, lesson_date, records } = body || {}
<<<<<<< HEAD
  if (!group_id || !lesson_date || !Array.isArray(records))
    return NextResponse.json({ ok: false, error: 'group_id, lesson_date va records majburiy.' }, { status: 400 })

  const { data: group } = await sb.from('groups')
    .select('id, name').eq('id', group_id).eq('user_id', user_id).eq('teacher_id', teacher.id).maybeSingle()
  if (!group) return NextResponse.json({ ok: false, error: 'Ruxsat yo\'q.' }, { status: 403 })

  // Avval shu sana uchun mavjud yozuvlarni o'chiramiz
  await sb.from('attendance').delete().eq('group_id', group_id).eq('lesson_date', lesson_date).eq('user_id', user_id)

  if (records.length === 0) return NextResponse.json({ ok: true, attendance: [] })

  const rows = records.map((r: any) => ({
    user_id, student_id: r.student_id, group_id, lesson_date,
    status: r.status || 'present', notes: r.notes || null,
    teacher_id: teacher.id,
  }))

  const { data, error } = await sb.from('attendance').insert(rows).select()
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, attendance: data, count: data.length })
=======

  if (!group_id || !lesson_date || !Array.isArray(records)) {
    return NextResponse.json({ ok: false, error: 'group_id, lesson_date va records majburiy.' }, { status: 400 })
  }

  // Guruh o'qituvchining ekanini tekshirish
  const { data: group } = await sb.from('groups')
    .select('id, name')
    .eq('id', group_id)
    .eq('user_id', user_id)
    .eq('teacher_id', teacher.id)
    .maybeSingle()

  if (!group) {
    return NextResponse.json({ ok: false, error: 'Guruh topilmadi yoki ruxsat yo\'q.' }, { status: 403 })
  }

  // Avval shu sana uchun mavjud yozuvlarni o'chiramiz
  await sb.from('attendance')
    .delete()
    .eq('group_id', group_id)
    .eq('lesson_date', lesson_date)
    .eq('user_id', user_id)

  // Yangi yozuvlarni qo'shamiz
  if (records.length === 0) {
    return NextResponse.json({ ok: true, attendance: [], message: 'Hech qanday yozuv saqlanmadi.' })
  }

  const rows = records.map((r: any) => ({
    user_id,
    student_id: r.student_id,
    group_id,
    lesson_date,
    status: r.status || 'present',
    notes: r.notes || null,
    teacher_id: teacher.id, // QAYSIsi o'qituvchi belgilaganini saqlaymiz
  }))

  const { data, error } = await sb.from('attendance').insert(rows).select()

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })

  return NextResponse.json({
    ok: true,
    attendance: data,
    count: data.length,
    teacher_id: teacher.id,
    teacher_name: teacher.full_name,
  })
>>>>>>> bad376165bf9a231143870406dff1be057c69c6c
}
