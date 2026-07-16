import { NextRequest, NextResponse } from 'next/server'
import { requireActiveUser } from '@/lib/guards'
import { audit, hashPassword } from '@/lib/auth'

export async function GET() {
  const guard = await requireActiveUser()
  if ('error' in guard) return guard.error
  const { user, sb } = guard
  // password_hash ni qaytarmaymiz - xavfsizlik
  const { data, error } = await sb.from('teachers').select('id, user_id, full_name, phone, login, subject, salary_amount, hire_date, notes, password_hash, created_at, updated_at').eq('user_id', user.id).order('created_at', { ascending: false })
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  // has_password maydonini qo'shamiz (parol o'rnatilgan yoki yo'qligini bildiradi)
  const teachers = (data || []).map((t: any) => ({
    ...t,
    has_password: !!t.password_hash,
    password_hash: undefined, // parolni qaytarmaymiz
  }))
  return NextResponse.json({ ok: true, teachers })
}

export async function POST(req: NextRequest) {
  const guard = await requireActiveUser()
  if ('error' in guard) return guard.error
  const { user, sb } = guard
  const body = await req.json()
  const { full_name, phone, subject, salary_amount, hire_date, notes, password, login } = body || {}
  if (!full_name) return NextResponse.json({ ok: false, error: 'O\'qituvchi ismi majburiy.' }, { status: 400 })

  // Parolni hash qilamiz (agar kiritilgan bo'lsa)
  let password_hash: string | null = null
  if (password && password.trim().length > 0) {
    if (password.length < 4) {
      return NextResponse.json({ ok: false, error: 'Parol kamida 4 ta belgidan iborat bo\'lishi kerak.' }, { status: 400 })
    }
    password_hash = await hashPassword(password)
  }

  // Login: agar kiritilmagan bo'lsa, telefondan foydalanamiz
  const teacherLogin = login || phone || null

  const { data, error } = await sb.from('teachers').insert({
    user_id: user.id,
    full_name,
    phone: phone || null,
    login: teacherLogin,
    subject: subject || null,
    salary_amount: salary_amount || 0,
    hire_date: hire_date || null,
    notes: notes || null,
    password_hash,
  }).select().single()
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  await audit(user.id, 'create_teacher', 'teachers', data.id, { name: full_name, has_password: !!password_hash })
  // password_hash ni qaytarmaymiz
  const { password_hash: _ph, ...safe } = data
  return NextResponse.json({ ok: true, teacher: safe })
}

export async function PUT(req: NextRequest) {
  const guard = await requireActiveUser()
  if ('error' in guard) return guard.error
  const { user, sb } = guard
  const body = await req.json()
  const { id, password, ...patch } = body || {}
  if (!id) return NextResponse.json({ ok: false, error: 'id majburiy.' }, { status: 400 })

  // Parolni alohida boshqaramiz
  if (password !== undefined && password !== null && String(password).length > 0) {
    if (String(password).length < 4) {
      return NextResponse.json({ ok: false, error: 'Parol kamida 4 ta belgidan iborat bo\'lishi kerak.' }, { status: 400 })
    }
    patch.password_hash = await hashPassword(String(password))
  }

  // login avtomatik to'ldirish (agar bo'sh bo'lsa)
  if (!patch.login && patch.phone) {
    patch.login = patch.phone
  }

  const { data, error } = await sb.from('teachers').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', id).eq('user_id', user.id).select().single()
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  await audit(user.id, 'update_teacher', 'teachers', id, { ...patch, has_password: !!patch.password_hash })
  const { password_hash: _ph, ...safe } = data
  return NextResponse.json({ ok: true, teacher: safe })
}

export async function DELETE(req: NextRequest) {
  const guard = await requireActiveUser()
  if ('error' in guard) return guard.error
  const { user, sb } = guard
  const url = new URL(req.url)
  const id = url.searchParams.get('id')
  if (!id) return NextResponse.json({ ok: false, error: 'id majburiy.' }, { status: 400 })
  const { error } = await sb.from('teachers').delete().eq('id', id).eq('user_id', user.id)
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  await audit(user.id, 'delete_teacher', 'teachers', id)
  return NextResponse.json({ ok: true })
}
