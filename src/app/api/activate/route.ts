import { NextRequest, NextResponse } from 'next/server'
import { getSession, audit, } from '@/lib/auth'
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  try {
    const sess = await getSession()
    if (!sess) return NextResponse.json({ ok: false, error: 'Avval tizimga kiring.' }, { status: 401 })
    if (!isSupabaseConfigured()) return NextResponse.json({ ok: false, error: 'Supabase sozlanmagan.' }, { status: 500 })

    const { code } = await req.json()
    if (!code || typeof code !== 'string' || code.trim().length < 8) {
      return NextResponse.json({ ok: false, error: 'Aktivatsiya kod noto\'g\'ri formatda.' }, { status: 400 })
    }

    const sb = getSupabase()

    // Kodni qidirish
    const { data: codeRow, error: codeErr } = await sb
      .from('activation_codes')
      .select('*')
      .eq('code', code.trim().toUpperCase())
      .maybeSingle()

    if (codeErr) {
      console.error('activation code fetch error:', codeErr)
      return NextResponse.json({ ok: false, error: 'Bazaga ulanishda xatolik.' }, { status: 500 })
    }
    if (!codeRow) {
      return NextResponse.json({ ok: false, error: 'Aktivatsiya kod topilmadi.' }, { status: 404 })
    }
    if (codeRow.status === 'used') {
      return NextResponse.json({ ok: false, error: 'Bu aktivatsiya kod allaqachon ishlatilgan.' }, { status: 409 })
    }
    if (codeRow.expires_at && new Date(codeRow.expires_at) < new Date()) {
      await sb.from('activation_codes').update({ status: 'expired' }).eq('id', codeRow.id)
      return NextResponse.json({ ok: false, error: 'Aktivatsiya kod muddati tugagan.' }, { status: 410 })
    }

    // Foydalanuvchini aktiv qilish: active_until = max(now, current_active_until) + duration_days
    const now = new Date()
    const { data: userRow, error: userErr } = await sb.from('users').select('*').eq('id', sess.id).single()
    if (userErr || !userRow) {
      return NextResponse.json({ ok: false, error: 'Foydalanuvchi topilmadi.' }, { status: 404 })
    }

    const baseDate = userRow.active_until && new Date(userRow.active_until) > now
      ? new Date(userRow.active_until)
      : now
    const newActiveUntil = new Date(baseDate.getTime() + codeRow.duration_days * 24 * 60 * 60 * 1000)

    const { error: updErr } = await sb
      .from('users')
      .update({
        status: 'active',
        active_until: newActiveUntil.toISOString(),
        updated_at: now.toISOString(),
      })
      .eq('id', sess.id)

    if (updErr) {
      console.error('user update error:', updErr)
      return NextResponse.json({ ok: false, error: 'Foydalanuvchi yangilanmadi.' }, { status: 500 })
    }

    // Kodni "used" ga o'tkazish
    const { error: codeUpdErr } = await sb
      .from('activation_codes')
      .update({
        status: 'used',
        used_by: sess.id,
        used_at: now.toISOString(),
      })
      .eq('id', codeRow.id)
    if (codeUpdErr) console.error('code update error:', codeUpdErr)

    await audit(sess.id, 'activate', 'activation_codes', codeRow.id, { code: codeRow.code, days: codeRow.duration_days, active_until: newActiveUntil }, req.headers.get('x-forwarded-for') || '', req.headers.get('user-agent') || '')

    return NextResponse.json({
      ok: true,
      active_until: newActiveUntil.toISOString(),
      days_added: codeRow.duration_days,
    })
  } catch (e: any) {
    console.error('activate crash:', e)
    return NextResponse.json({ ok: false, error: e?.message || 'Server xatosi' }, { status: 500 })
  }
}
