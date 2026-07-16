import { NextRequest, NextResponse } from 'next/server'
import { requireActiveTeacher } from '@/lib/teacher-guards'

export async function GET(req: NextRequest) {
  const guard = await requireActiveTeacher()
  if ('error' in guard) return guard.error
  const { teacher, sb, user_id } = guard

  const url = new URL(req.url)
  const groupId = url.searchParams.get('group_id')
  if (!groupId) return NextResponse.json({ ok: false, error: 'group_id majburiy.' }, { status: 400 })

  const { data: group } = await sb.from('groups')
    .select('id, name, teacher_id, user_id')
    .eq('id', groupId)
    .eq('user_id', user_id)
    .eq('teacher_id', teacher.id)
    .maybeSingle()

  if (!group) return NextResponse.json({ ok: false, error: 'Guruh topilmadi yoki ruxsat yo\'q.' }, { status: 403 })

  const { data, error } = await sb.from('students')
    .select('id, full_name, phone, status, enrollment_date')
    .eq('group_id', groupId)
    .eq('user_id', user_id)
    .in('status', ['active', 'paused'])
    .order('full_name', { ascending: true })

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, students: data || [] })
}
