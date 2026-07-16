import { NextResponse } from 'next/server'
import { requireActiveTeacher } from '@/lib/teacher-guards'

<<<<<<< HEAD
=======
/**
 * GET /api/teacher/groups
 * O'qituvchining o'z guruhlari va ularning kurslari
 */
>>>>>>> bad376165bf9a231143870406dff1be057c69c6c
export async function GET() {
  const guard = await requireActiveTeacher()
  if ('error' in guard) return guard.error
  const { teacher, sb, user_id } = guard

<<<<<<< HEAD
=======
  // O'qituvchiga tegishli guruhlar (markaz egasi user_id orqali)
>>>>>>> bad376165bf9a231143870406dff1be057c69c6c
  const { data, error } = await sb.from('groups')
    .select('id, name, course_id, course:courses(id, name), schedule, max_students, start_date, end_date')
    .eq('user_id', user_id)
    .eq('teacher_id', teacher.id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })

<<<<<<< HEAD
=======
  // Har bir guruh uchun talabalar sonini hisoblaymiz
>>>>>>> bad376165bf9a231143870406dff1be057c69c6c
  const groupsWithCounts = await Promise.all((data || []).map(async (g: any) => {
    const { count } = await sb.from('students')
      .select('id', { count: 'exact', head: true })
      .eq('group_id', g.id)
      .eq('status', 'active')
    return { ...g, students_count: count || 0 }
  }))

  return NextResponse.json({ ok: true, groups: groupsWithCounts })
}
