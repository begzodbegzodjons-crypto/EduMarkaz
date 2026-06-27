import { NextRequest, NextResponse } from 'next/server'
import { requireActiveUser } from '@/lib/guards'
import { audit } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const guard = await requireActiveUser()
  if ('error' in guard) return guard.error
  const { user, sb } = guard
  const url = new URL(req.url)
  const groupId = url.searchParams.get('group_id')
  const weekday = url.searchParams.get('weekday')
  let q = sb.from('schedule').select('*, group:groups(id,name), room:rooms(id,name), teacher:teachers(id,full_name)').eq('user_id', user.id).order('weekday', { ascending: true }).order('start_time', { ascending: true })
  if (groupId) q = q.eq('group_id', groupId)
  if (weekday) q = q.eq('weekday', Number(weekday))
  const { data, error } = await q
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, schedule: data || [] })
}

export async function POST(req: NextRequest) {
  const guard = await requireActiveUser()
  if ('error' in guard) return guard.error
  const { user, sb } = guard
  const body = await req.json()
  const { group_id, room_id, teacher_id, weekday, start_time, end_time } = body || {}
  if (!group_id || weekday === undefined || !start_time || !end_time) return NextResponse.json({ ok: false, error: 'group_id, weekday, start_time, end_time majburiy.' }, { status: 400 })

  // To'qnashuvni tekshirish: shu xona, shu kun, vaqt oralig'i kesishadi
  if (room_id) {
    const { data: conflicts } = await sb.from('schedule')
      .select('id, group:groups(name)')
      .eq('user_id', user.id).eq('room_id', room_id).eq('weekday', Number(weekday))
      .or(`and(start_time.lt.${end_time},end_time.gt.${start_time})`)
    if (conflicts && conflicts.length > 0) {
      return NextResponse.json({ ok: false, error: `Xona band! ${conflicts[0].group?.name} guruhi bilan to'qnashuv.` }, { status: 409 })
    }
  }
  // O'qituvchi to'qnashuvi
  if (teacher_id) {
    const { data: tConflicts } = await sb.from('schedule')
      .select('id, group:groups(name)')
      .eq('user_id', user.id).eq('teacher_id', teacher_id).eq('weekday', Number(weekday))
      .or(`and(start_time.lt.${end_time},end_time.gt.${start_time})`)
    if (tConflicts && tConflicts.length > 0) {
      return NextResponse.json({ ok: false, error: `O'qituvchi band! ${tConflicts[0].group?.name} guruhi bilan to'qnashuv.` }, { status: 409 })
    }
  }

  const { data, error } = await sb.from('schedule').insert({
    user_id: user.id, group_id, room_id: room_id || null, teacher_id: teacher_id || null,
    weekday: Number(weekday), start_time, end_time,
  }).select().single()
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  await audit(user.id, 'create_schedule', 'schedule', data.id, { group_id, weekday })
  return NextResponse.json({ ok: true, schedule: data })
}

export async function DELETE(req: NextRequest) {
  const guard = await requireActiveUser()
  if ('error' in guard) return guard.error
  const { user, sb } = guard
  const url = new URL(req.url)
  const id = url.searchParams.get('id')
  if (!id) return NextResponse.json({ ok: false, error: 'id majburiy.' }, { status: 400 })
  const { error } = await sb.from('schedule').delete().eq('id', id).eq('user_id', user.id)
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
