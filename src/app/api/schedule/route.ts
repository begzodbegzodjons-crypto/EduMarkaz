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

  // Ikki xil format qo'llab-quvvatlanadi:
  // 1) Eski (bitta kun): { group_id, room_id, teacher_id, weekday, start_time, end_time }
  // 2) Yangi (bir nechta kun, har biri alohida vaqt):
  //    { group_id, room_id, teacher_id, slots: [{ weekday, start_time, end_time }, ...] }

  const { group_id, room_id, teacher_id, weekday, start_time, end_time, slots } = body || {}

  // Slots'larni yig'amiz
  let slotList: { weekday: number; start_time: string; end_time: string }[] = []
  if (Array.isArray(slots) && slots.length > 0) {
    slotList = slots
  } else if (weekday !== undefined && start_time && end_time) {
    slotList = [{ weekday: Number(weekday), start_time, end_time }]
  }

  if (!group_id || slotList.length === 0) {
    return NextResponse.json({ ok: false, error: 'group_id va kamida bitta kun+vaqt majburiy.' }, { status: 400 })
  }

  // Har bir slot uchun to'qnashuvni tekshirish
  for (const slot of slotList) {
    if (room_id) {
      const { data: conflicts } = await sb.from('schedule')
        .select('id, group:groups(name)')
        .eq('user_id', user.id).eq('room_id', room_id).eq('weekday', Number(slot.weekday))
        .or(`and(start_time.lt.${slot.end_time},end_time.gt.${slot.start_time})`)
      if (conflicts && conflicts.length > 0) {
        return NextResponse.json({
          ok: false,
          error: `Xona band! ${conflicts[0].group?.name} guruhi bilan to'qnashuv (kun: ${['Du','Se','Ch','Pa','Ju','Sh','Ya'][Number(slot.weekday)]}).`
        }, { status: 409 })
      }
    }
    if (teacher_id) {
      const { data: tConflicts } = await sb.from('schedule')
        .select('id, group:groups(name)')
        .eq('user_id', user.id).eq('teacher_id', teacher_id).eq('weekday', Number(slot.weekday))
        .or(`and(start_time.lt.${slot.end_time},end_time.gt.${slot.start_time})`)
      if (tConflicts && tConflicts.length > 0) {
        return NextResponse.json({
          ok: false,
          error: `O'qituvchi band! ${tConflicts[0].group?.name} guruhi bilan to'qnashuv (kun: ${['Du','Se','Ch','Pa','Ju','Sh','Ya'][Number(slot.weekday)]}).`
        }, { status: 409 })
      }
    }
  }

  // Barcha slot'larni batch insert qilamiz
  const rows = slotList.map((slot) => ({
    user_id: user.id,
    group_id,
    room_id: room_id || null,
    teacher_id: teacher_id || null,
    weekday: Number(slot.weekday),
    start_time: slot.start_time,
    end_time: slot.end_time,
  }))

  const { data, error } = await sb.from('schedule').insert(rows).select()

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })

  await audit(user.id, 'create_schedule', 'schedule', data[0]?.id, { group_id, count: data.length })

  return NextResponse.json({
    ok: true,
    schedule: data.length === 1 ? data[0] : data,
    created_count: data.length,
  })
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
