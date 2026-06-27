import { NextRequest, NextResponse } from 'next/server'
import { requireActiveUser } from '@/lib/auth'
import { getSession } from '@/lib/auth'
import { isSupabaseConfigured } from '@/lib/supabase'
import { getSupabase } from '@/lib/supabase'

export async function GET() {
  const sess = await getSession()
  if (!sess) return NextResponse.json({ ok: false, error: 'Avval tizimga kiring.' }, { status: 401 })
  if (!isSupabaseConfigured()) return NextResponse.json({ ok: false, error: 'Supabase sozlanmagan.' }, { status: 500 })
  const sb = getSupabase()
  const { data, error } = await sb.from('settings').select('*').eq('user_id', sess.id).maybeSingle()
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, settings: data || null })
}

export async function PUT(req: NextRequest) {
  const sess = await getSession()
  if (!sess) return NextResponse.json({ ok: false, error: 'Avval tizimga kiring.' }, { status: 401 })
  if (!isSupabaseConfigured()) return NextResponse.json({ ok: false, error: 'Supabase sozlanmagan.' }, { status: 500 })
  const sb = getSupabase()
  const body = await req.json()
  const { center_name, center_phone, center_address, currency, telegram_bot_token, sms_api_key, monthly_payment_amount } = body || {}

  // Upsert
  const { data: existing } = await sb.from('settings').select('id').eq('user_id', sess.id).maybeSingle()
  let data: any = null, error: any = null
  if (existing?.id) {
    ({ data, error } = await sb.from('settings').update({
      center_name, center_phone, center_address, currency, telegram_bot_token, sms_api_key,
      monthly_payment_amount, updated_at: new Date().toISOString(),
    }).eq('id', existing.id).select().single())
  } else {
    ({ data, error } = await sb.from('settings').insert({
      user_id: sess.id, center_name, center_phone, center_address, currency, telegram_bot_token, sms_api_key,
      monthly_payment_amount,
    }).select().single())
  }
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, settings: data })
}
