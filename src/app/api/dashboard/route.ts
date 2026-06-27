import { NextResponse } from 'next/server'
import { requireActiveUser } from '@/lib/guards'

export async function GET() {
  const guard = await requireActiveUser()
  if ('error' in guard) return guard.error
  const { user, sb } = guard

  const [students, teachers, groups, courses, payments, expenses, attendance, leads] = await Promise.all([
    sb.from('students').select('id,status,course_id,group_id', { count: 'exact', head: false }).eq('user_id', user.id),
    sb.from('teachers').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
    sb.from('groups').select('id,course_id', { count: 'exact', head: false }).eq('user_id', user.id),
    sb.from('courses').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
    sb.from('payments').select('amount,payment_date,for_month,student_id').eq('user_id', user.id),
    sb.from('expenses').select('amount,expense_date,category').eq('user_id', user.id),
    sb.from('attendance').select('id,status,lesson_date').eq('user_id', user.id),
    sb.from('leads').select('id,status').eq('user_id', user.id),
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

  const monthExpenses = (expenses.data || []).filter((e: any) => String(e.expense_date).startsWith(monthStr))
  const monthExpenseTotal = monthExpenses.reduce((sum: number, e: any) => sum + Number(e.amount || 0), 0)
  const totalExpense = (expenses.data || []).reduce((sum: number, e: any) => sum + Number(e.amount || 0), 0)
  const monthNetProfit = monthRevenue - monthExpenseTotal
  const totalNetProfit = totalRevenue - totalExpense

  // Kategoriya bo'yicha xarajatlar
  const expenseByCategory: Record<string, number> = {}
  ;(expenses.data || []).forEach((e: any) => {
    expenseByCategory[e.category] = (expenseByCategory[e.category] || 0) + Number(e.amount || 0)
  })

  const attRecords = attendance.data || []
  const presentCount = attRecords.filter((a: any) => a.status === 'present').length
  const absentCount = attRecords.filter((a: any) => a.status === 'absent').length
  const lateCount = attRecords.filter((a: any) => a.status === 'late').length
  const attRate = attRecords.length > 0 ? Math.round((presentCount / attRecords.length) * 100) : 0

  // Oylik daromad (6 oy)
  const monthlyRevenue: { month: string; total: number; expense: number }[] = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const m = d.toISOString().slice(0, 7)
    const rev = (payments.data || []).filter((p: any) => String(p.payment_date).startsWith(m)).reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0)
    const exp = (expenses.data || []).filter((e: any) => String(e.expense_date).startsWith(m)).reduce((sum: number, e: any) => sum + Number(e.amount || 0), 0)
    monthlyRevenue.push({ month: m, total: rev, expense: exp })
  }

  // Lidlar statistikasi
  const newLeads = leads.data?.filter((l: any) => l.status === 'new').length || 0
  const contactedLeads = leads.data?.filter((l: any) => l.status === 'contacted').length || 0
  const enrolledLeads = leads.data?.filter((l: any) => l.status === 'enrolled').length || 0

  // Kurs bo'yicha talabalar
  const studentsByCourse: Record<string, number> = {}
  ;(students.data || []).forEach((s: any) => {
    if (s.course_id) studentsByCourse[s.course_id] = (studentsByCourse[s.course_id] || 0) + 1
  })

  return NextResponse.json({
    ok: true,
    stats: {
      totalStudents, activeStudents, totalTeachers, totalGroups, totalCourses,
      monthRevenue, totalRevenue, monthExpenseTotal, totalExpense,
      monthNetProfit, totalNetProfit, expenseByCategory,
      attendance: { present: presentCount, absent: absentCount, late: lateCount, total: attRecords.length, rate: attRate },
      monthlyRevenue,
      leads: { total: leads.data?.length || 0, new: newLeads, contacted: contactedLeads, enrolled: enrolledLeads },
      studentsByCourse,
    },
  })
}
