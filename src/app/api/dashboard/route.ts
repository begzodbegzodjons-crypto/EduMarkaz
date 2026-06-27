import { NextResponse } from 'next/server'
import { requireActiveUser } from '@/lib/guards'

export async function GET() {
  const guard = await requireActiveUser()
  if ('error' in guard) return guard.error
  const { user, sb } = guard

  const [students, teachers, groups, courses, payments, attendance] = await Promise.all([
    sb.from('students').select('id,status', { count: 'exact', head: false }).eq('user_id', user.id),
    sb.from('teachers').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
    sb.from('groups').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
    sb.from('courses').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
    sb.from('payments').select('amount,payment_date').eq('user_id', user.id),
    sb.from('attendance').select('id,status,lesson_date').eq('user_id', user.id),
  ])

  const totalStudents = students.data?.length || 0
  const activeStudents = students.data?.filter((s: any) => s.status === 'active').length || 0
  const totalTeachers = teachers.count || 0
  const totalGroups = groups.count || 0
  const totalCourses = courses.count || 0

  const now = new Date()
  const monthStr = now.toISOString().slice(0, 7)
  const monthPayments = (payments.data || []).filter((p: any) => String(p.payment_date).startsWith(monthStr))
  const monthRevenue = monthPayments.reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0)
  const totalRevenue = (payments.data || []).reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0)

  const attRecords = attendance.data || []
  const presentCount = attRecords.filter((a: any) => a.status === 'present').length
  const absentCount = attRecords.filter((a: any) => a.status === 'absent').length
  const lateCount = attRecords.filter((a: any) => a.status === 'late').length

  // So'nggi 6 oy bo'yicha to'lovlar
  const monthlyRevenue: { month: string; total: number }[] = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const m = d.toISOString().slice(0, 7)
    const total = (payments.data || [])
      .filter((p: any) => String(p.payment_date).startsWith(m))
      .reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0)
    monthlyRevenue.push({ month: m, total })
  }

  return NextResponse.json({
    ok: true,
    stats: {
      totalStudents,
      activeStudents,
      totalTeachers,
      totalGroups,
      totalCourses,
      monthRevenue,
      totalRevenue,
      attendance: { present: presentCount, absent: absentCount, late: lateCount, total: attRecords.length },
      monthlyRevenue,
    },
  })
}
