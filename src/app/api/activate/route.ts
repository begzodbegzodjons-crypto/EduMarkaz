import { NextRequest, NextResponse } from 'next/server'
import { getSession, audit } from '@/lib/auth'
import { isSupabaseConfigured } from '@/lib/supabase'
import { getSupabase } from '@/lib/supabase'
import { getDemoSupabase } from '@/lib/demo-db'

function getDB() {
  return isSupabaseConfigured() ? getSupabase() : (getDemoSupabase() as any)
}

export async function POST(req: NextRequest) {
  try {
    const sess = await getSession()
    if (!sess) return NextResponse.json({ ok: false, error: 'Avval tizimga kiring.' }, { status: 401 })

    const { code } = await req.json()
    if (!code || typeof code !== 'string' || code.trim().length < 8) {
      return NextResponse.json({ ok: false, error: 'Aktivatsiya kod noto\'g\'ri formatda.' }, { status: 400 })
    }

    const sb = getDB()

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

    // Foydalanuvchini aktiv qilish
    const now = new Date()
    const { data: userRow, error: userErr } = await sb.from('users').select('*').eq('id', sess.id).single()
    if (userErr || !userRow) {
      return NextResponse.json({ ok: false, error: 'Foydalanuvchi topilmadi.' }, { status: 404 })
    }

    const baseDate = userRow.active_until && new Date(userRow.active_until) > now
      ? new Date(userRow.active_until)
      : now
    const newActiveUntil = new Date(baseDate.getTime() + codeRow.duration_days * 24 * 60 * 60 * 1000)

    // Update payload — last_activation_at ni xavfsiz qo'shamiz
    const updatePayload: any = {
      status: 'active',
      active_until: newActiveUntil.toISOString(),
      updated_at: now.toISOString(),
    }

    // Avval last_activation_at bilan urinib ko'ramiz
    let updErr: any = null
    const upd1 = await sb
      .from('users')
      .update({
        ...updatePayload,
        last_activation_at: now.toISOString(),
      })
      .eq('id', sess.id)
    updErr = upd1.error

    // Agar last_activation_at ustuni yo'q bo'lsa, uning siz urinamiz
    if (updErr && updErr.message && updErr.message.includes('last_activation_at')) {
      const upd2 = await sb
        .from('users')
        .update(updatePayload)
        .eq('id', sess.id)
      updErr = upd2.error
    }

    if (updErr) {
      console.error('user update error:', updErr)
      return NextResponse.json({
        ok: false,
        error: 'Foydalanuvchi yangilanmadi: ' + updErr.message
      }, { status: 500 })
    }

    // Kodni "used" ga o'tkazish
    await sb.from('activation_codes').update({
      status: 'used',
      used_by: sess.id,
      used_at: now.toISOString(),
    }).eq('id', codeRow.id)

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
