import { NextRequest, NextResponse } from 'next/server'
import { getSession, audit } from '@/lib/auth'
import { isSupabaseConfigured } from '@/lib/supabase'
import { getSupabase } from '@/lib/supabase'
import { getDemoSupabase } from '@/lib/demo-db'
import { randomBytes } from 'crypto'

function getDB() {
  return isSupabaseConfigured() ? getSupabase() : (getDemoSupabase() as any)
}

function generateCode(): string {
  const raw = randomBytes(12).toString('hex').toUpperCase()
  return raw.match(/.{1,4}/g)!.join('-')
}

export async function POST(req: NextRequest) {
  try {
    const sess = await getSession()
    if (!sess) return NextResponse.json({ ok: false, error: 'Avval tizimga kiring.' }, { status: 401 })
    if (sess.role !== 'admin') return NextResponse.json({ ok: false, error: 'Faqat admin.' }, { status: 403 })

    const body = await req.json().catch(() => ({}))
    const count = Math.min(50, Math.max(1, Number(body.count) || 1))
    const durationDays = Number(body.duration_days) || Number(process.env.ACTIVATION_DAYS) || 30
    const expiresAt = body.expires_at
      ? new Date(body.expires_at).toISOString()
      : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()

    const sb = getDB()
    const rows: any[] = []
    for (let i = 0; i < count; i++) {
      const code = generateCode()
      rows.push({
        code,
        duration_days: durationDays,
        status: 'unused',
        generated_by: sess.id,
        expires_at: expiresAt,
      })
    }

    const { data, error } = await sb.from('activation_codes').insert(rows).select()
    if (error) {
      console.error('generate codes error:', error)
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
    }

    await audit(sess.id, 'generate_codes', 'activation_codes', null, { count, duration_days: durationDays }, req.headers.get('x-forwarded-for') || '', req.headers.get('user-agent') || '')

    return NextResponse.json({ ok: true, codes: data })
  } catch (e: any) {
    console.error('generate-code crash:', e)
    return NextResponse.json({ ok: false, error: e?.message || 'Server xatosi' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
    const sess = await getSession()
    if (!sess) return NextResponse.json({ ok: false, error: 'Avval tizimga kiring.' }, { status: 401 })
    if (sess.role !== 'admin') return NextResponse.json({ ok: false, error: 'Faqat admin.' }, { status: 403 })

    const url = new URL(req.url)
    const status = url.searchParams.get('status') || 'all'

    const sb = getDB()
    let q = sb.from('activation_codes').select('*').order('created_at', { ascending: false }).limit(500)
    if (status !== 'all') q = q.eq('status', status)
    const { data, error } = await q
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true, codes: data || [] })
  } catch (e: any) {
    console.error('list codes crash:', e)
    return NextResponse.json({ ok: false, error: e?.message || 'Server xatosi' }, { status: 500 })
  }
}
