import { NextRequest, NextResponse } from 'next/server'
import { requireActiveUser } from '@/lib/guards'

export async function GET(req: NextRequest) {
  const guard = await requireActiveUser()
  if ('error' in guard) return guard.error
  const { user, sb } = guard
  const url = new URL(req.url)
  const examId = url.searchParams.get('exam_id')
  const studentId = url.searchParams.get('student_id')
  let q = sb.from('grades').select('*, exam:exams(id,title,max_score,exam_date), student:students(id,full_name)').eq('user_id', user.id).order('created_at', { ascending: false })
  if (examId) q = q.eq('exam_id', examId)
  if (studentId) q = q.eq('student_id', studentId)
  const { data, error } = await q
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, grades: data || [] })
}

export async function POST(req: NextRequest) {
  const guard = await requireActiveUser()
  if ('error' in guard) return guard.error
  const { user, sb } = guard
  const body = await req.json()
  // Bulk: [{exam_id, student_id, score, comment}]
  if (Array.isArray(body?.records)) {
    const rows = body.records.map((r: any) => ({
      user_id: user.id, exam_id: r.exam_id, student_id: r.student_id,
      score: r.score || 0, comment: r.comment || null,
    }))
    if (rows.length === 0) return NextResponse.json({ ok: false, error: 'Bo\'sh yozuvlar.' }, { status: 400 })
    // Upsert (unique exam_id+student_id)
    const { data, error } = await sb.from('grades').upsert(rows, { onConflict: 'exam_id,student_id' }).select()
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true, grades: data })
  }
  const { exam_id, student_id, score, comment } = body || {}
  if (!exam_id || !student_id) return NextResponse.json({ ok: false, error: 'exam_id va student_id majburiy.' }, { status: 400 })
  const { data, error } = await sb.from('grades').upsert({
    user_id: user.id, exam_id, student_id, score: score || 0, comment: comment || null,
  }, { onConflict: 'exam_id,student_id' }).select().single()
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, grade: data })
}

export async function DELETE(req: NextRequest) {
  const guard = await requireActiveUser()
  if ('error' in guard) return guard.error
  const { user, sb } = guard
  const url = new URL(req.url)
  const id = url.searchParams.get('id')
  if (!id) return NextResponse.json({ ok: false, error: 'id majburiy.' }, { status: 400 })
  const { error } = await sb.from('grades').delete().eq('id', id).eq('user_id', user.id)
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
