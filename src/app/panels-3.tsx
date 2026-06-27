'use client'
import { useEffect, useState, useCallback, useMemo } from 'react'
import { motion } from 'framer-motion'
import { apiFetch, formatDate } from '@/lib/client'
import {
  Plus, Trash2, Pencil, Search, ClipboardCheck, BarChart3, UserCog,
} from '@/components/icons'
import {
  Card, CardHeader, EmptyState, Modal, PrimaryButton, GhostButton, IconButton,
  PanelLoader, Field, Avatar,
} from './panels-common'

// Status options
const ATT_STATUS = [
  { v: 'present', label: 'Keldi', cls: 'bg-emerald-500 text-white' },
  { v: 'absent', label: 'Kelmadi', cls: 'bg-red-500 text-white' },
  { v: 'late', label: 'Kechikdi', cls: 'bg-amber-500 text-white' },
  { v: 'excused', label: 'Sababli', cls: 'bg-blue-500 text-white' },
]

// ============================================================================
//  DAVOMAT PANEL — kurs → guruh → talabalar avtomatik
// ============================================================================
export function AttendancePanel() {
  const [items, setItems] = useState<any[]>([])
  const [students, setStudents] = useState<any[]>([])
  const [groups, setGroups] = useState<any[]>([])
  const [courses, setCourses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [courseId, setCourseId] = useState('')
  const [groupId, setGroupId] = useState('')
  const [lessonDate, setLessonDate] = useState(new Date().toISOString().slice(0, 10))
  const [records, setRecords] = useState<any[]>([])
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const [a, s, g, c] = await Promise.all([apiFetch('/api/attendance'), apiFetch('/api/students'), apiFetch('/api/groups'), apiFetch('/api/courses')])
    if (a.ok) setItems(a.data?.attendance || [])
    if (s.ok) setStudents(s.data?.students || [])
    if (g.ok) setGroups(g.data?.groups || [])
    if (c.ok) setCourses(c.data?.courses || [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const filteredGroups = useMemo(() => courseId ? groups.filter((g) => g.course_id === courseId) : groups, [groups, courseId])

  const groupStudents = useMemo(() => {
    if (!groupId) return []
    return students.filter((s) => s.group_id === groupId && s.status === 'active')
  }, [students, groupId])

  // Guruh tanlanganda barcha talaba uchun "present" qilamiz
  useEffect(() => {
    if (groupId && groupStudents.length > 0) {
      // Avval shu guruhning shu kungi mavjud yozuvlarini tekshiramiz
      const existing = items.filter((a) => a.group_id === groupId && a.lesson_date === lessonDate)
      const newRecs = groupStudents.map((s) => {
        const ex = existing.find((e) => e.student_id === s.id)
        return {
          id: ex?.id || null,
          student_id: s.id,
          student_name: s.full_name,
          status: ex?.status || 'present',
        }
      })
      setRecords(newRecs)
    } else {
      setRecords([])
    }
  }, [groupId, groupStudents, lessonDate, items])

  function updateRecord(i: number, status: string) {
    setRecords((prev) => {
      const r = [...prev]
      r[i] = { ...r[i], status }
      return r
    })
  }

  async function handleSave() {
    if (records.length === 0) return alert('Talabalar yo\'q')
    setSaving(true)
    // Bulk yangi yozuvlar
    const newRecs = records.filter((r) => !r.id).map((r) => ({
      student_id: r.student_id, group_id: groupId, lesson_date: lessonDate, status: r.status,
    }))
    // Yangilash
    const updates = records.filter((r) => r.id)
    let ok = true, errMsg = ''
    if (newRecs.length > 0) {
      const res = await apiFetch('/api/attendance', { method: 'POST', body: JSON.stringify({ records: newRecs }) })
      if (!res.ok) { ok = false; errMsg = res.error || '' }
    }
    for (const u of updates) {
      const res = await apiFetch('/api/attendance', { method: 'PUT', body: JSON.stringify({ id: u.id, status: u.status }) })
      if (!res.ok) { ok = false; errMsg = res.error || '' }
    }
    setSaving(false)
    if (!ok) return alert(errMsg || 'Xatolik')
    alert('Davomat saqlandi!')
    load()
  }

  async function handleDelete(id: string) { if (!confirm('O\'chirmoqchimisiz?')) return; const { ok, error } = await apiFetch(`/api/attendance?id=${id}`, { method: 'DELETE' }); if (!ok) return alert(error); load() }

  // So'nggi davomatlar ro'yxati
  const recentByDate = useMemo(() => {
    const m: Record<string, any[]> = {}
    items.forEach((a) => {
      const key = a.lesson_date
      if (!m[key]) m[key] = []
      m[key].push(a)
    })
    return Object.entries(m).sort(([a], [b]) => b.localeCompare(a)).slice(0, 5)
  }, [items])

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="text-2xl lg:text-3xl font-bold">Davomat</h1><p className="text-muted-foreground text-sm mt-1">Kurs → Guruh → Talabalar avtomatik</p></div>
      </div>

      {/* Tanlovlar */}
      <Card>
        <div className="p-4 grid sm:grid-cols-3 gap-3">
          <Field label="Kurs *"><select className="erp-input" value={courseId} onChange={(e) => { setCourseId(e.target.value); setGroupId('') }}><option value="">— Tanlang —</option>{courses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>
          <Field label="Guruh *"><select className="erp-input" value={groupId} onChange={(e) => setGroupId(e.target.value)} disabled={!courseId}><option value="">— Tanlang —</option>{filteredGroups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}</select></Field>
          <Field label="Dars sanasi *"><input type="date" className="erp-input" value={lessonDate} onChange={(e) => setLessonDate(e.target.value)} /></Field>
        </div>
      </Card>

      {/* Talabalar ro'yxati kartochka ko'rinishida */}
      {groupId && (
        <Card>
          <CardHeader title="Guruh talabalari" subtitle={`${groupStudents.length} faol talaba • ${formatDate(lessonDate)}`} action={<PrimaryButton onClick={handleSave} disabled={saving || records.length === 0}>{saving ? 'Saqlanmoqda...' : 'Saqlash'}</PrimaryButton>} />
          {groupStudents.length === 0 ? <EmptyState title="Talabalar yo'q" description="Bu guruhga faol talaba biriktirilmagan." /> : (
            <div className="p-4 pt-3 grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {records.map((r, i) => (
                <motion.div key={r.student_id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }} className="p-3 rounded-xl bg-muted/30 border border-border/40">
                  <div className="flex items-center gap-2 mb-2">
                    <Avatar name={r.student_name} />
                    <div className="text-sm font-semibold truncate flex-1">{r.student_name}</div>
                  </div>
                  <div className="grid grid-cols-2 gap-1">
                    {ATT_STATUS.map((opt) => (
                      <button key={opt.v} type="button" onClick={() => updateRecord(i, opt.v)} className={`px-2 py-1.5 rounded-lg text-[10px] font-semibold transition ${r.status === opt.v ? opt.cls : 'bg-white text-muted-foreground border border-border/50 hover:bg-muted'}`}>{opt.label}</button>
                    ))}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* So'nggi davomatlar */}
      <Card>
        <CardHeader title="So'nggi davomatlar" subtitle="Oxirgi 5 kun" />
        {loading ? <PanelLoader /> : recentByDate.length === 0 ? <EmptyState title="Hozircha davomat yo'q" /> : (
          <div className="p-4 pt-0 space-y-3">
            {recentByDate.map(([date, recs]) => (
              <div key={date}>
                <div className="text-xs font-semibold text-muted-foreground mb-2">{formatDate(date)}</div>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {recs.map((a) => (
                    <div key={a.id} className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-muted/40">
                      <div className="text-sm font-medium truncate">{a.student?.full_name}</div>
                      <div className="flex items-center gap-1"><AttStatusChip status={a.status} /><IconButton danger onClick={() => handleDelete(a.id)} title="O'chirish"><Trash2 className="w-3 h-3" /></IconButton></div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}

function AttStatusChip({ status }: { status: string }) {
  const s = ATT_STATUS.find((x) => x.v === status) || ATT_STATUS[0]
  return <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${s.cls}`}>{s.label}</span>
}

// ============================================================================
//  DAVOMATLAR HISOBOTI
// ============================================================================
export function AttendanceReportPanel() {
  const [items, setItems] = useState<any[]>([])
  const [groups, setGroups] = useState<any[]>([])
  const [courses, setCourses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [courseId, setCourseId] = useState('all')
  const [groupId, setGroupId] = useState('all')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (courseId !== 'all') params.set('course_id', courseId)
    if (groupId !== 'all') params.set('group_id', groupId)
    if (from) params.set('from', from)
    if (to) params.set('to', to)
    const [a, g, c] = await Promise.all([
      apiFetch(`/api/attendance?${params.toString()}`),
      apiFetch('/api/groups'),
      apiFetch('/api/courses'),
    ])
    if (a.ok) setItems(a.data?.attendance || [])
    if (g.ok) setGroups(g.data?.groups || [])
    if (c.ok) setCourses(c.data?.courses || [])
    setLoading(false)
  }, [courseId, groupId, from, to])

  useEffect(() => { load() }, [load])

  const filteredGroups = courseId !== 'all' ? groups.filter((g) => g.course_id === courseId) : groups

  // Hisobot: talaba → statistika
  const report = useMemo(() => {
    const m: Record<string, { name: string; groupName: string; present: number; absent: number; late: number; excused: number; total: number }> = {}
    items.forEach((a) => {
      const id = a.student_id
      if (!m[id]) m[id] = { name: a.student?.full_name || '—', groupName: a.group?.name || '—', present: 0, absent: 0, late: 0, excused: 0, total: 0 }
      m[id][a.status as 'present' | 'absent' | 'late' | 'excused']++
      m[id].total++
    })
    return Object.values(m).sort((a, b) => b.total - a.total)
  }, [items])

  const totals = useMemo(() => {
    return report.reduce((acc, r) => {
      acc.present += r.present; acc.absent += r.absent; acc.late += r.late; acc.excused += r.excused; acc.total += r.total
      return acc
    }, { present: 0, absent: 0, late: 0, excused: 0, total: 0 })
  }, [report])

  return (
    <div className="space-y-5">
      <div><h1 className="text-2xl lg:text-3xl font-bold">Davomatlar hisoboti</h1><p className="text-muted-foreground text-sm mt-1">Talabalar bo'yicha umumiy statistika</p></div>

      <Card>
        <div className="p-4 grid sm:grid-cols-4 gap-3">
          <Field label="Kurs"><select className="erp-input" value={courseId} onChange={(e) => { setCourseId(e.target.value); setGroupId('all') }}><option value="all">Barcha kurslar</option>{courses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>
          <Field label="Guruh"><select className="erp-input" value={groupId} onChange={(e) => setGroupId(e.target.value)}><option value="all">Barcha guruhlar</option>{filteredGroups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}</select></Field>
          <Field label="Dan"><input type="date" className="erp-input" value={from} onChange={(e) => setFrom(e.target.value)} /></Field>
          <Field label="Gacha"><input type="date" className="erp-input" value={to} onChange={(e) => setTo(e.target.value)} /></Field>
        </div>
      </Card>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <SummaryBox label="Jami darslar" value={totals.total} color="bg-blue-50 text-blue-700" />
        <SummaryBox label="Keldi" value={totals.present} color="bg-emerald-50 text-emerald-700" />
        <SummaryBox label="Kelmadi" value={totals.absent} color="bg-red-50 text-red-700" />
        <SummaryBox label="Kechikdi" value={totals.late} color="bg-amber-50 text-amber-700" />
        <SummaryBox label="Sababli" value={totals.excused} color="bg-violet-50 text-violet-700" />
      </div>

      <Card>
        <CardHeader title="Talabalar bo'yicha hisobot" subtitle={`${report.length} talaba`} />
        {loading ? <PanelLoader /> : report.length === 0 ? <EmptyState title="Ma'lumot yo'q" description="Filtrlarni o'zgartiring." /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-border/40 text-xs text-muted-foreground">
                <th className="text-left px-4 py-3 font-medium">Talaba</th>
                <th className="text-left px-4 py-3 font-medium">Guruh</th>
                <th className="text-center px-4 py-3 font-medium">Jami</th>
                <th className="text-center px-4 py-3 font-medium">Keldi</th>
                <th className="text-center px-4 py-3 font-medium">Kelmadi</th>
                <th className="text-center px-4 py-3 font-medium">Kechikdi</th>
                <th className="text-center px-4 py-3 font-medium">Sababli</th>
                <th className="text-center px-4 py-3 font-medium">Kelish %</th>
              </tr></thead>
              <tbody>
                {report.map((r, i) => {
                  const rate = r.total > 0 ? Math.round(((r.present + r.late) / r.total) * 100) : 0
                  return (
                    <tr key={i} className="border-b border-border/20 hover:bg-muted/40">
                      <td className="px-4 py-3 font-medium">{r.name}</td>
                      <td className="px-4 py-3 text-muted-foreground">{r.groupName}</td>
                      <td className="px-4 py-3 text-center font-bold">{r.total}</td>
                      <td className="px-4 py-3 text-center text-emerald-600">{r.present}</td>
                      <td className="px-4 py-3 text-center text-red-600">{r.absent}</td>
                      <td className="px-4 py-3 text-center text-amber-600">{r.late}</td>
                      <td className="px-4 py-3 text-center text-blue-600">{r.excused}</td>
                      <td className="px-4 py-3 text-center"><span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${rate >= 80 ? 'bg-emerald-100 text-emerald-700' : rate >= 60 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>{rate}%</span></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
function SummaryBox({ label, value, color }: { label: string; value: number; color: string }) {
  return <div className={`rounded-xl p-3 border ${color}`}><div className="text-2xl font-bold">{value}</div><div className="text-xs font-medium">{label}</div></div>
}

// ============================================================================
//  USTOZLAR DAVOMATI
// ============================================================================
export function TeacherAttendancePanel() {
  const [items, setItems] = useState<any[]>([])
  const [teachers, setTeachers] = useState<any[]>([])
  const [groups, setGroups] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [teacherId, setTeacherId] = useState('')
  const [groupId, setGroupId] = useState('')
  const [lessonDate, setLessonDate] = useState(new Date().toISOString().slice(0, 10))
  const [status, setStatus] = useState('present')
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const [a, t, g] = await Promise.all([apiFetch('/api/teacher-attendance'), apiFetch('/api/teachers'), apiFetch('/api/groups')])
    if (a.ok) setItems(a.data?.attendance || [])
    if (t.ok) setTeachers(t.data?.teachers || [])
    if (g.ok) setGroups(g.data?.groups || [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function handleAdd() {
    if (!teacherId) return alert('O\'qituvchi tanlang')
    setSaving(true)
    const { ok, error } = await apiFetch('/api/teacher-attendance', { method: 'POST', body: JSON.stringify({ teacher_id: teacherId, group_id: groupId || null, lesson_date: lessonDate, status }) })
    setSaving(false)
    if (!ok) return alert(error)
    load()
  }
  async function handleDelete(id: string) { if (!confirm('O\'chirmoqchimisiz?')) return; const { ok, error } = await apiFetch(`/api/teacher-attendance?id=${id}`, { method: 'DELETE' }); if (!ok) return alert(error); load() }

  const recentByDate = useMemo(() => {
    const m: Record<string, any[]> = {}
    items.forEach((a) => {
      const key = a.lesson_date
      if (!m[key]) m[key] = []
      m[key].push(a)
    })
    return Object.entries(m).sort(([a], [b]) => b.localeCompare(a))
  }, [items])

  return (
    <div className="space-y-5">
      <div><h1 className="text-2xl lg:text-3xl font-bold">Ustozlar davomati</h1><p className="text-muted-foreground text-sm mt-1">O'qituvchilar darsga kelishi</p></div>

      <Card>
        <CardHeader title="Yangi yozuv qo'shish" />
        <div className="p-4 grid sm:grid-cols-5 gap-3 items-end">
          <Field label="O'qituvchi *"><select className="erp-input" value={teacherId} onChange={(e) => setTeacherId(e.target.value)}><option value="">— Tanlang —</option>{teachers.map((t) => <option key={t.id} value={t.id}>{t.full_name}</option>)}</select></Field>
          <Field label="Guruh"><select className="erp-input" value={groupId} onChange={(e) => setGroupId(e.target.value)}><option value="">— Tanlang —</option>{groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}</select></Field>
          <Field label="Sana"><input type="date" className="erp-input" value={lessonDate} onChange={(e) => setLessonDate(e.target.value)} /></Field>
          <Field label="Holat"><select className="erp-input" value={status} onChange={(e) => setStatus(e.target.value)}><option value="present">Keldi</option><option value="absent">Kelmadi</option><option value="late">Kechikdi</option><option value="excused">Sababli</option></select></Field>
          <PrimaryButton onClick={handleAdd} disabled={saving}>{saving ? '...' : 'Qo\'shish'}</PrimaryButton>
        </div>
      </Card>

      <Card>
        <CardHeader title="Davomat tarixi" subtitle={`${items.length} yozuv`} />
        {loading ? <PanelLoader /> : recentByDate.length === 0 ? <EmptyState title="Hozircha davomat yo'q" /> : (
          <div className="p-4 pt-0 space-y-4">
            {recentByDate.map(([date, recs]) => (
              <div key={date}>
                <div className="text-xs font-semibold text-muted-foreground mb-2">{formatDate(date)}</div>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {recs.map((a) => (
                    <div key={a.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-muted/40">
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">{a.teacher?.full_name || '—'}</div>
                        <div className="text-[10px] text-muted-foreground">{a.group?.name || '—'}</div>
                      </div>
                      <div className="flex items-center gap-1"><AttStatusChip status={a.status} /><IconButton danger onClick={() => handleDelete(a.id)}><Trash2 className="w-3 h-3" /></IconButton></div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
