import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { isSupabaseConfigured } from '@/lib/supabase'
import { getSupabase } from '@/lib/supabase'
import { getDemoSupabase } from '@/lib/demo-db'

function getDB() {
  return isSupabaseConfigured() ? getSupabase() : (getDemoSupabase() as any)
}

// Markazning to'liq ma'lumotlari
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const adminCheck = await requireAdmin(req)
    if (!adminCheck.ok) return NextResponse.json({ ok: false, error: adminCheck.error }, { status: 403 })

    const { id } = await params
    const sb = getDB()

    const { data: user } = await sb.from('users').select('*').eq('id', id).maybeSingle()
    if (!user) return NextResponse.json({ ok: false, error: 'Markaz topilmadi' }, { status: 404 })

    const { data: teachers } = await sb.from('teachers').select('id, full_name, phone, subject, salary_amount').eq('user_id', id).order('full_name')
    const { data: students } = await sb.from('students').select('id, full_name, phone, parent_phone, status, course:courses(name)').eq('user_id', id).order('full_name')
    const { data: courses } = await sb.from('courses').select('id, name, duration_months, price').eq('user_id', id).order('name')
    const { data: groups } = await sb.from('groups').select('id, name, course:courses(name), teacher:teachers(full_name)').eq('user_id', id).order('name')
    const { data: payments } = await sb.from('payments').select('amount, payment_date, for_month').eq('user_id', id).order('payment_date', { ascending: false }).limit(20)
    const { data: ratings } = await sb.from('ratings').select('score, comment, student:students(full_name), rating_date').eq('user_id', id).order('rating_date', { ascending: false }).limit(20)
    const { data: attendance } = await sb.from('attendance').select('status').eq('user_id', id)
    const { data: usedCodes } = await sb.from('activation_codes').select('code, duration_days, used_at').eq('used_by', id).order('used_at', { ascending: false })

    const totalRevenue = (payments || []).reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0)
    const attRecords = attendance || []
    const attPresent = attRecords.filter((a: any) => a.status === 'present').length
    const attRate = attRecords.length > 0 ? Math.round((attPresent / attRecords.length) * 100) : 0
    const avgRating = (ratings || []).length > 0
      ? ((ratings || []).reduce((sum: number, r: any) => sum + Number(r.score || 0), 0) / (ratings || []).length).toFixed(1)
      : '0.0'

    return NextResponse.json({
      ok: true,
      center: user,
      details: {
        teachers: teachers || [],
        students: students || [],
        courses: courses || [],
        groups: groups || [],
        payments: payments || [],
        ratings: ratings || [],
        usedCodes: usedCodes || [],
        summary: {
          teachers_count: (teachers || []).length,
          students_count: (students || []).length,
          students_active: (students || []).filter((s: any) => s.status === 'active').length,
          courses_count: (courses || []).length,
          groups_count: (groups || []).length,
          total_revenue: totalRevenue,
          attendance_rate: attRate,
          avg_rating: avgRating,
          used_codes: (usedCodes || []).length,
        },
      },
    })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'Server xatosi' }, { status: 500 })
  }
}
