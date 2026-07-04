import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { isSupabaseConfigured } from '@/lib/supabase'
import { getSupabase } from '@/lib/supabase'
import { getDemoSupabase } from '@/lib/demo-db'

function getDB() {
  return isSupabaseConfigured() ? getSupabase() : (getDemoSupabase() as any)
}

/**
 * Barcha o'quv markazlar ro'yxati — statistika bilan.
 * Har bir markaz uchun: talabalar, o'qituvchilar, kurslar, guruhlar, reyting,
 * to'lovlar, davomat foizi, aktiv/sinov/blok status.
 */
export async function GET(req: NextRequest) {
  try {
    const adminCheck = await requireAdmin(req)
    if (!adminCheck.ok) return NextResponse.json({ ok: false, error: adminCheck.error }, { status: 403 })

    const sb = getDB()

    // Barcha ma'lumotlar (admin user'lari hisobga olinmaydi)
    const { data: users } = await sb.from('users').select('*').neq('role', 'admin').order('created_at', { ascending: false })
    const allUsers = users || []

    if (allUsers.length === 0) return NextResponse.json({ ok: true, centers: [] })

    // Boshqa jadvallardan ma'lumotlar
    const userIds = allUsers.map((u: any) => u.id)
    const { data: teachers } = await sb.from('teachers').select('user_id').in('user_id', userIds)
    const { data: students } = await sb.from('students').select('user_id, status').in('user_id', userIds)
    const { data: courses } = await sb.from('courses').select('user_id').in('user_id', userIds)
    const { data: groups } = await sb.from('groups').select('user_id').in('user_id', userIds)
    const { data: payments } = await sb.from('payments').select('user_id, amount').in('user_id', userIds)
    const { data: attendance } = await sb.from('attendance').select('user_id, status').in('user_id', userIds)
    const { data: ratings } = await sb.from('ratings').select('user_id, score').in('user_id', userIds)
    const { data: activationCodes } = await sb.from('activation_codes').select('used_by, status').eq('status', 'used')

    // Har bir markaz uchun statistika hisoblash
    const centers = allUsers.map((u: any) => {
      const tCount = (teachers || []).filter((t: any) => t.user_id === u.id).length
      const sAll = (students || []).filter((s: any) => s.user_id === u.id)
      const sActive = sAll.filter((s: any) => s.status === 'active').length
      const cCount = (courses || []).filter((c: any) => c.user_id === u.id).length
      const gCount = (groups || []).filter((g: any) => g.user_id === u.id).length

      const userPayments = (payments || []).filter((p: any) => p.user_id === u.id)
      const totalRevenue = userPayments.reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0)

      const userAtt = (attendance || []).filter((a: any) => a.user_id === u.id)
      const attPresent = userAtt.filter((a: any) => a.status === 'present').length
      const attRate = userAtt.length > 0 ? Math.round((attPresent / userAtt.length) * 100) : 0

      const userRatings = (ratings || []).filter((r: any) => r.user_id === u.id)
      const avgRating = userRatings.length > 0
        ? (userRatings.reduce((sum: number, r: any) => sum + Number(r.score || 0), 0) / userRatings.length).toFixed(1)
        : '0.0'

      const usedCodes = (activationCodes || []).filter((c: any) => c.used_by === u.id).length

      // Days left
      const now = new Date()
      let daysLeft = 0
      if (u.status === 'active' && u.active_until) {
        daysLeft = Math.max(0, Math.ceil((new Date(u.active_until).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
      } else if (u.status === 'trial' && u.trial_ends_at) {
        daysLeft = Math.max(0, Math.ceil((new Date(u.trial_ends_at).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
      }

      return {
        id: u.id,
        full_name: u.full_name,
        center_name: u.center_name,
        email: u.email,
        phone: u.phone,
        address: u.address,
        status: u.status,
        role: u.role,
        trial_ends_at: u.trial_ends_at,
        active_until: u.active_until,
        last_activation_at: u.last_activation_at,
        last_login_at: u.last_login_at,
        created_at: u.created_at,
        days_left: daysLeft,
        stats: {
          teachers_count: tCount,
          students_total: sAll.length,
          students_active: sActive,
          courses_count: cCount,
          groups_count: gCount,
          total_revenue: totalRevenue,
          attendance_rate: attRate,
          avg_rating: avgRating,
          used_codes: usedCodes,
        },
      }
    })

    return NextResponse.json({ ok: true, centers })
  } catch (e: any) {
    console.error('centers list crash:', e)
    return NextResponse.json({ ok: false, error: e?.message || 'Server xatosi' }, { status: 500 })
  }
}
