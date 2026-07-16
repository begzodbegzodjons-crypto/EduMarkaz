import { NextRequest, NextResponse } from 'next/server'
import { requireActiveTeacher } from '@/lib/teacher-guards'

<<<<<<< HEAD
=======
/**
 * GET /api/teacher/students?group_id=xxx
 * O'qituvchining belgilangan guruhidagi talabalar
 */
>>>>>>> bad376165bf9a231143870406dff1be057c69c6c
export async function GET(req: NextRequest) {
  const guard = await requireActiveTeacher()
  if ('error' in guard) return guard.error
  const { teacher, sb, user_id } = guard

  const url = new URL(req.url)
  const groupId = url.searchParams.get('group_id')
<<<<<<< HEAD
  if (!groupId) return NextResponse.json({ ok: false, error: 'group_id majburiy.' }, { status: 400 })

=======

  if (!groupId) {
    return NextResponse.json({ ok: false, error: 'group_id majburiy.' }, { status: 400 })
  }

  // Guruh haqiqatan o'qituvchining ekanligini tekshiramiz
>>>>>>> bad376165bf9a231143870406dff1be057c69c6c
  const { data: group } = await sb.from('groups')
    .select('id, name, teacher_id, user_id')
    .eq('id', groupId)
    .eq('user_id', user_id)
    .eq('teacher_id', teacher.id)
    .maybeSingle()

<<<<<<< HEAD
  if (!group) return NextResponse.json({ ok: false, error: 'Guruh topilmadi yoki ruxsat yo\'q.' }, { status: 403 })

=======
  if (!group) {
    return NextResponse.json({ ok: false, error: 'Guruh topilmadi yoki ruxsat yo\'q.' }, { status: 403 })
  }

  // Guruhdagi faol talabalar
>>>>>>> bad376165bf9a231143870406dff1be057c69c6c
  const { data, error } = await sb.from('students')
    .select('id, full_name, phone, status, enrollment_date')
    .eq('group_id', groupId)
    .eq('user_id', user_id)
    .in('status', ['active', 'paused'])
    .order('full_name', { ascending: true })

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
<<<<<<< HEAD
=======

>>>>>>> bad376165bf9a231143870406dff1be057c69c6c
  return NextResponse.json({ ok: true, students: data || [] })
}
