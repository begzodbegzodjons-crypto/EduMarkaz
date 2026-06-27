import { NextRequest, NextResponse } from 'next/server'
import { requireActiveUser } from '@/lib/guards'

// Ota-onaga yuboriladigan bildirishnomalar (avto yoki qo'lda)
export async function GET(req: NextRequest) {
  const guard = await requireActiveUser()
  if ('error' in guard) return guard.error
  const { user, sb } = guard
  const url = new URL(req.url)
  const status = url.searchParams.get('status')
  let q = sb.from('notifications').select('*, student:students(id,full_name,parent_phone)').eq('user_id', user.id).order('created_at', { ascending: false }).limit(200)
  if (status && status !== 'all') q = q.eq('status', status)
  const { data, error } = await q
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, notifications: data || [] })
}

export async function POST(req: NextRequest) {
  const guard = await requireActiveUser()
  if ('error' in guard) return guard.error
  const { user, sb } = guard
  const body = await req.json()
  // Bulk: [{student_id, type, channel, recipient, message}]
  if (Array.isArray(body?.records)) {
    const rows = body.records.map((r: any) => ({
      user_id: user.id, student_id: r.student_id || null,
      type: r.type || 'custom', channel: r.channel || 'telegram',
      recipient: r.recipient || null, message: r.message, status: 'pending',
    }))
    if (rows.length === 0) return NextResponse.json({ ok: false, error: 'Bo\'sh yozuvlar.' }, { status: 400 })
    const { data, error } = await sb.from('notifications').insert(rows).select()
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true, notifications: data })
  }
  const { student_id, type, channel, recipient, message } = body || {}
  if (!message) return NextResponse.json({ ok: false, error: 'message majburiy.' }, { status: 400 })
  const { data, error } = await sb.from('notifications').insert({
    user_id: user.id, student_id: student_id || null,
    type: type || 'custom', channel: channel || 'telegram',
    recipient: recipient || null, message, status: 'pending',
  }).select().single()
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, notification: data })
}

export async function DELETE(req: NextRequest) {
  const guard = await requireActiveUser()
  if ('error' in guard) return guard.error
  const { user, sb } = guard
  const url = new URL(req.url)
  const id = url.searchParams.get('id')
  if (!id) return NextResponse.json({ ok: false, error: 'id majburiy.' }, { status: 400 })
  const { error } = await sb.from('notifications').delete().eq('id', id).eq('user_id', user.id)
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
