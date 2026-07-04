import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { isSupabaseConfigured } from '@/lib/supabase'
import { getSupabase } from '@/lib/supabase'
import { getDemoSupabase } from '@/lib/demo-db'

function getDB() {
  return isSupabaseConfigured() ? getSupabase() : (getDemoSupabase() as any)
}

// Markazni aktivlashtirish — kun berish
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const adminCheck = await requireAdmin(req)
    if (!adminCheck.ok) {
      return NextResponse.json({
        ok: false,
        error: adminCheck.error || 'Admin huquqi kerak',
        debug: 'requireAdmin failed - parol yoki session noto\'g\'ri'
      }, { status: 403 })
    }

    const { id } = await params
    if (!id) {
      return NextResponse.json({ ok: false, error: 'Markaz ID topilmadi' }, { status: 400 })
    }

    const body = await req.json().catch(() => ({}))
    const days = Number(body?.days) || 30

    if (!days || days < 1) {
      return NextResponse.json({ ok: false, error: 'Noto\'g\'ri kun soni' }, { status: 400 })
    }

    const sb = getDB()

    // Mavjud active_until ni olish
    const { data: existing, error: fetchErr } = await sb.from('users')
      .select('active_until, status, center_name, full_name')
      .eq('id', id)
      .maybeSingle()

    if (fetchErr) {
      return NextResponse.json({
        ok: false,
        error: 'Markaz ma\'lumotlarini olishda xatolik: ' + fetchErr.message
      }, { status: 500 })
    }

    if (!existing) {
      return NextResponse.json({ ok: false, error: 'Markaz topilmadi' }, { status: 404 })
    }

    const now = new Date()
    const baseDate = existing.active_until && new Date(existing.active_until) > now
      ? new Date(existing.active_until)
      : now
    const newActiveUntil = new Date(baseDate.getTime() + days * 24 * 60 * 60 * 1000)

    const { data, error } = await sb.from('users')
      .update({
        status: 'active',
        active_until: newActiveUntil.toISOString(),
        last_activation_at: now.toISOString(),
        updated_at: now.toISOString(),
      })
      .eq('id', id)
      .select('id, full_name, center_name, status, active_until')
      .single()

    if (error) {
      return NextResponse.json({
        ok: false,
        error: 'Ma\'lumotlar bazasida yangilash xatosi: ' + error.message
      }, { status: 500 })
    }

    return NextResponse.json({
      ok: true,
      user: data,
      message: `${data.full_name} aktivlashtirildi (+${days} kun)`,
      days_added: days,
      new_active_until: newActiveUntil.toISOString(),
    })
  } catch (e: any) {
    console.error('Activate crash:', e)
    return NextResponse.json({
      ok: false,
      error: 'Server xatosi: ' + (e?.message || 'Noma\'lum')
    }, { status: 500 })
  }
}
