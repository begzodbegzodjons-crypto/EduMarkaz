'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'

interface Teacher {
  id: string
  user_id: string
  full_name: string
  phone: string
  login: string
  subject: string
  center_name?: string
}

interface Group {
  id: string
  name: string
  course_id: string
  course: { id: string; name: string }
  schedule: string
  max_students: number
  students_count: number
  start_date: string
  end_date: string
}

interface Student {
  id: string
  full_name: string
  phone: string
  status: string
  enrollment_date: string
}

const WEEKDAYS = ['Yakshanba', 'Dushanba', 'Seshanba', 'Chorshanba', 'Payshanba', 'Juma', 'Shanba']

export default function TeacherPanelPage() {
  const router = useRouter()
  const [teacher, setTeacher] = useState<Teacher | null>(null)
  const [checkingAuth, setCheckingAuth] = useState(true)

  const [loginInput, setLoginInput] = useState('')
  const [passwordInput, setPasswordInput] = useState('')
  const [loginError, setLoginError] = useState('')
  const [loggingIn, setLoggingIn] = useState(false)

  const [groups, setGroups] = useState<Group[]>([])
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null)
  const [students, setStudents] = useState<Student[]>([])
  const [attendance, setAttendance] = useState<Record<string, string>>({})
  const [lessonDate, setLessonDate] = useState(new Date().toISOString().slice(0, 10))
  const [loadingData, setLoadingData] = useState(false)
  const [saving, setSaving] = useState(false)
  const [savedMessage, setSavedMessage] = useState('')

  useEffect(() => {
    apiFetch('/api/teacher-auth/me').then(({ ok, data }) => {
      if (ok && data?.teacher) setTeacher(data.teacher)
      setCheckingAuth(false)
    })
  }, [])

  async function handleLogin() {
    if (!loginInput || !passwordInput) {
      setLoginError('Login va parolni kiriting.')
      return
    }
    setLoggingIn(true)
    setLoginError('')
    const { ok, error, data } = await apiFetch('/api/teacher-auth/login', {
      method: 'POST',
      body: JSON.stringify({ login: loginInput, password: passwordInput }),
    })
    setLoggingIn(false)
    if (!ok) { setLoginError(error || 'Kirishda xatolik.'); return }
    if (data?.teacher) setTeacher({ ...data.teacher, center_name: data.center?.center_name || '' })
  }

  async function handleLogout() {
    await apiFetch('/api/teacher-auth/logout', { method: 'POST' })
    setTeacher(null); setGroups([]); setSelectedGroup(null); setStudents([]); setAttendance({})
  }

  const loadGroups = useCallback(async () => {
    if (!teacher) return
    setLoadingData(true)
    const { ok, data } = await apiFetch('/api/teacher/groups')
    if (ok && data?.groups) setGroups(data.groups)
    setLoadingData(false)
  }, [teacher])

  useEffect(() => { if (teacher) loadGroups() }, [teacher, loadGroups])

  useEffect(() => {
    if (!selectedGroup) { setStudents([]); setAttendance({}); return }
    apiFetch(`/api/teacher/students?group_id=${selectedGroup}`).then(({ ok, data }) => {
      if (ok && data?.students) {
        setStudents(data.students)
        const initial: Record<string, string> = {}
        data.students.forEach((s: Student) => { initial[s.id] = 'present' })
        setAttendance(initial)
      } else { setStudents([]); setAttendance({}) }
    })
  }, [selectedGroup])

  useEffect(() => {
    if (!selectedGroup || !lessonDate) return
    apiFetch(`/api/teacher/attendance?group_id=${selectedGroup}&date=${lessonDate}`).then(({ ok, data }) => {
      if (ok && data?.attendance && data.attendance.length > 0) {
        const existing: Record<string, string> = {}
        data.attendance.forEach((a: any) => { existing[a.student_id] = a.status })
        setAttendance((prev) => ({ ...prev, ...existing }))
      }
    })
  }, [selectedGroup, lessonDate])

  function setStatus(studentId: string, status: string) { setAttendance((prev) => ({ ...prev, [studentId]: status })) }
  function setAll(status: string) { const n: Record<string, string> = {}; students.forEach((s) => { n[s.id] = status }); setAttendance(n) }

  async function handleSave() {
    if (!selectedGroup || !lessonDate || students.length === 0) return
    setSaving(true); setSavedMessage('')
    const records = students.map((s) => ({ student_id: s.id, status: attendance[s.id] || 'present' }))
    const { ok, error } = await apiFetch('/api/teacher/attendance', {
      method: 'POST', body: JSON.stringify({ group_id: selectedGroup, lesson_date: lessonDate, records }),
    })
    setSaving(false)
    if (!ok) { alert(error || 'Saqlashda xatolik.'); return }
    setSavedMessage(`✓ ${records.length} ta talabaning davomati saqlandi!`)
    setTimeout(() => setSavedMessage(''), 3000)
  }

  async function apiFetch(url: string, options?: any) {
    try {
      const res = await fetch(url, { ...options, headers: { 'Content-Type': 'application/json', ...(options?.headers || {}) } })
      const data = await res.json()
      return { ok: res.ok && data?.ok !== false, data, error: data?.error }
    } catch (e: any) { return { ok: false, error: e?.message || 'Network xatosi' } }
  }

  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <div className="text-slate-600 text-sm">Yuklanmoqda...</div>
        </div>
      </div>
    )
  }

  if (!teacher) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-3xl shadow-xl p-8 w-full max-w-md">
          <div className="text-center mb-6">
            <div className="w-16 h-16 rounded-2xl bg-indigo-600 flex items-center justify-center mx-auto mb-3">
              <svg className="w-9 h-9 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M22 10v6M2 10l10-5 10 5-10 5z" /><path d="M6 12v5c3 3 9 3 12 0v-5" /></svg>
            </div>
            <h1 className="text-2xl font-bold text-slate-800">O'qituvchi paneli</h1>
            <p className="text-sm text-slate-500 mt-1">Davomat belgilash uchun tizimga kiring</p>
          </div>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">Login / Telefon</label>
              <input type="text" value={loginInput} onChange={(e) => setLoginInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleLogin()} placeholder="Login yoki telefon raqami" className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none text-sm" autoFocus />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">Parol</label>
              <input type="password" value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleLogin()} placeholder="Parol" className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none text-sm" />
            </div>
            {loginError && <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">{loginError}</div>}
            <button onClick={handleLogin} disabled={loggingIn} className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold text-sm transition-colors">
              {loggingIn ? 'Kirilmoqda...' : 'Kirish'}
            </button>
          </div>
          <div className="mt-6 pt-4 border-t border-slate-100 text-center">
            <button onClick={() => router.push('/')} className="text-xs text-slate-500 hover:text-slate-700">← Bosh sahifaga qaytish</button>
          </div>
        </motion.div>
      </div>
    )
  }

  const selectedGroupObj = groups.find((g) => g.id === selectedGroup)

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M22 10v6M2 10l10-5 10 5-10 5z" /><path d="M6 12v5c3 3 9 3 12 0v-5" /></svg>
            </div>
            <div>
              <div className="font-bold text-slate-800">O'qituvchi paneli</div>
              <div className="text-xs text-slate-500">{teacher.center_name ? `🏫 ${teacher.center_name} · ` : ''}{teacher.full_name} · {teacher.subject || 'Fan ko\'rsatilmagan'}</div>
            </div>
          </div>
          <button onClick={handleLogout} className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold">Chiqish</button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-5">
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-2xl border border-slate-200 p-4"><div className="text-xs text-slate-500">Mening guruhlarim</div><div className="text-2xl font-bold text-slate-800 mt-1">{groups.length}</div></div>
          <div className="bg-white rounded-2xl border border-slate-200 p-4"><div className="text-xs text-slate-500">Jami o'quvchilar</div><div className="text-2xl font-bold text-indigo-600 mt-1">{groups.reduce((s, g) => s + g.students_count, 0)}</div></div>
          <div className="bg-white rounded-2xl border border-slate-200 p-4"><div className="text-xs text-slate-500">Bugungi sana</div><div className="text-lg font-bold text-slate-800 mt-1">{new Date().toLocaleDateString('uz-UZ', { day: 'numeric', month: 'long' })}<div className="text-[10px] text-slate-400">{WEEKDAYS[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1]}</div></div></div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <div className="text-sm font-semibold text-slate-700 mb-3">Guruhni tanlang</div>
          {loadingData ? <div className="text-center py-4 text-sm text-slate-500">Yuklanmoqda...</div> : groups.length === 0 ? (
            <div className="text-center py-8 text-slate-500"><div className="text-sm">Sizga biriktirilgan guruhlar yo'q</div><div className="text-xs text-slate-400 mt-1">Admin bilan bog'laning</div></div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {groups.map((g) => (
                <button key={g.id} onClick={() => setSelectedGroup(g.id)} className={`p-3 rounded-xl border-2 text-left transition-all ${selectedGroup === g.id ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 hover:border-slate-300 bg-white'}`}>
                  <div className="font-semibold text-sm text-slate-800">{g.name}</div>
                  <div className="text-xs text-slate-500 mt-0.5">{g.course?.name || '—'}</div>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="px-2 py-0.5 rounded-full bg-slate-100 text-[10px] font-semibold text-slate-600">{g.students_count} o'quvchi</span>
                    {g.schedule && <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-[10px] font-semibold text-indigo-700 truncate max-w-[120px]">{g.schedule}</span>}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {selectedGroup && selectedGroupObj && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between flex-wrap gap-3">
              <div><div className="font-bold text-slate-800">{selectedGroupObj.name}</div><div className="text-xs text-slate-500">{selectedGroupObj.course?.name} · {students.length} o'quvchi</div></div>
              <div className="flex items-center gap-2"><label className="text-xs text-slate-600">Dars sanasi:</label><input type="date" value={lessonDate} onChange={(e) => setLessonDate(e.target.value)} className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm" /></div>
            </div>
            {students.length === 0 ? <div className="p-8 text-center text-slate-500 text-sm">Bu guruhda faol o'quvchilar yo'q</div> : (
              <>
                <div className="px-4 py-2 bg-slate-50 border-b border-slate-100 flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-slate-600 mr-2">Hammasini:</span>
                  <button onClick={() => setAll('present')} className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold">✓ Keldi</button>
                  <button onClick={() => setAll('absent')} className="px-2.5 py-1 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 text-xs font-semibold">✗ Kelmadi</button>
                  <button onClick={() => setAll('late')} className="px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 text-xs font-semibold">⏰ Kechikdi</button>
                </div>
                <div className="divide-y divide-slate-100">
                  {students.map((s, idx) => {
                    const status = attendance[s.id] || 'present'
                    return (
                      <div key={s.id} className="px-4 py-3 flex items-center justify-between gap-3 hover:bg-slate-50">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600 shrink-0">{idx + 1}</div>
                          <div className="min-w-0"><div className="font-medium text-sm text-slate-800 truncate">{s.full_name}</div></div>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <button onClick={() => setStatus(s.id, 'present')} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${status === 'present' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-emerald-50'}`}>Keldi</button>
                          <button onClick={() => setStatus(s.id, 'absent')} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${status === 'absent' ? 'bg-red-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-red-50'}`}>Kelmadi</button>
                          <button onClick={() => setStatus(s.id, 'late')} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${status === 'late' ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-amber-50'}`}>Kech</button>
                        </div>
                      </div>
                    )
                  })}
                </div>
                <div className="px-4 py-3 border-t border-slate-200 bg-slate-50 flex items-center gap-3">
                  <button onClick={handleSave} disabled={saving} className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold text-sm flex items-center gap-2">
                    {saving ? <><svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>Saqlanmoqda...</> : <><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12" /></svg>Davomatni saqlash</>}
                  </button>
                  {savedMessage && <div className="text-sm font-semibold text-emerald-600">{savedMessage}</div>}
                </div>
              </>
            )}
          </motion.div>
        )}
      </main>
    </div>
  )
}
