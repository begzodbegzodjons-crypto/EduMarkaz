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
  { v: 'present', label: 'Keldi', cls: 'bg-slate-700 text-white' },
  { v: 'absent', label: 'Kelmadi', cls: 'bg-slate-500 text-white' },
  { v: 'late', label: 'Kechikdi', cls: 'bg-slate-600 text-white' },
  { v: 'excused', label: 'Sababli', cls: 'bg-slate-700 text-white' },
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

  // So'nggi davomatlar ro'yxati - o'qituvchi ma'lumotlari bilan
  const recentByDate = useMemo(() => {
    const m: Record<string, any[]> = {}
    items.forEach((a) => {
      const key = a.lesson_date
      if (!m[key]) m[key] = []
      m[key].push(a)
    })
    return Object.entries(m).sort(([a], [b]) => b.localeCompare(a)).slice(0, 5)
  }, [items])

  // === YANGI: O'qituvchilar tomonidan qilingan davomat sessiyalari ===
  // Har bir sessiya = bitta o'qituvchi + bitta guruh + bitta sana
  const teacherSessions = useMemo(() => {
    const m: Record<string, any> = {}
    items.forEach((a) => {
      const teacherId = a.teacher_id || 'admin'
      const key = `${teacherId}_${a.group_id}_${a.lesson_date}`
      if (!m[key]) {
        m[key] = {
          teacher_id: teacherId,
          teacher_name: a.teacher?.full_name || (teacherId === 'admin' ? 'Admin tomonidan' : '—'),
          teacher_subject: a.teacher?.subject || '',
          group_id: a.group_id,
          group_name: a.group?.name || '—',
          course_name: a.group?.course?.name || '—',
          lesson_date: a.lesson_date,
          created_at: a.created_at,
          present: 0,
          absent: 0,
          late: 0,
          excused: 0,
          total: 0,
        }
      }
      const status = a.status as 'present' | 'absent' | 'late' | 'excused'
      if (m[key][status] !== undefined) m[key][status]++
      m[key].total++
      if (a.created_at && (!m[key].created_at || a.created_at < m[key].created_at)) {
        m[key].created_at = a.created_at
      }
    })
    return Object.values(m).sort((a: any, b: any) => {
      if (a.lesson_date !== b.lesson_date) return b.lesson_date.localeCompare(a.lesson_date)
      return (b.created_at || '').localeCompare(a.created_at || '')
    })
  }, [items])

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="text-2xl lg:text-3xl font-bold">Davomat</h1><p className="text-muted-foreground text-sm mt-1">Kurs → Guruh → Talabalar avtomatik</p></div>
      </div>

      {/* Tanlovlar */}
      <Card color="violet">
        <div className="p-4 grid sm:grid-cols-3 gap-3">
          <Field label="Kurs *"><select className="erp-input" value={courseId} onChange={(e) => { setCourseId(e.target.value); setGroupId('') }}><option value="">— Tanlang —</option>{courses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>
          <Field label="Guruh *"><select className="erp-input" value={groupId} onChange={(e) => setGroupId(e.target.value)} disabled={!courseId}><option value="">— Tanlang —</option>{filteredGroups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}</select></Field>
          <Field label="Dars sanasi *"><input type="date" className="erp-input" value={lessonDate} onChange={(e) => setLessonDate(e.target.value)} /></Field>
        </div>
      </Card>

      {/* Talabalar ro'yxati kartochka ko'rinishida */}
      {groupId && (
        <Card color="blue">
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

      {/* === YANGI: O'qituvchilar tomonidan qilingan davomat sessiyalari === */}
      <Card color="sky">
        <CardHeader
          title="O'qituvchilar tomonidan qilingan davomatlar"
          subtitle={`${teacherSessions.length} ta sessiya · kim, qachon, qaysi guruhda davomat qilgan`}
        />
        {loading ? <PanelLoader /> : teacherSessions.length === 0 ? (
          <EmptyState title="Hozircha davomat yo'q" description="O'qituvchilar o'z panelidan davomat belgilashlari kerak." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/40 text-xs text-muted-foreground">
                  <th className="text-left px-4 py-3 font-medium">#</th>
                  <th className="text-left px-4 py-3 font-medium">O'qituvchi</th>
                  <th className="text-left px-4 py-3 font-medium">Kurs</th>
                  <th className="text-left px-4 py-3 font-medium">Guruh</th>
                  <th className="text-left px-4 py-3 font-medium">Dars sanasi</th>
                  <th className="text-left px-4 py-3 font-medium">Belgilangan vaqt</th>
                  <th className="text-center px-4 py-3 font-medium">Keldi</th>
                  <th className="text-center px-4 py-3 font-medium">Kelmadi</th>
                  <th className="text-center px-4 py-3 font-medium">Kechikdi</th>
                  <th className="text-center px-4 py-3 font-medium">Jami</th>
                </tr>
              </thead>
              <tbody>
                {teacherSessions.slice(0, 50).map((s: any, idx: number) => {
                  const dt = s.created_at ? new Date(s.created_at) : null
                  const dateStr = s.lesson_date || '—'
                  const timeStr = dt ? dt.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' }) : '—'
                  const fullDateStr = dt ? dt.toLocaleDateString('uz-UZ') : '—'
                  return (
                    <tr key={idx} className="border-b border-border/20 hover:bg-muted/40">
                      <td className="px-4 py-3 text-muted-foreground text-xs">{idx + 1}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium flex items-center gap-1">
                          👤 {s.teacher_name}
                        </div>
                        {s.teacher_subject && (
                          <div className="text-[10px] text-muted-foreground">{s.teacher_subject}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">{s.course_name}</td>
                      <td className="px-4 py-3 font-medium text-xs">{s.group_name}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-xs">{dateStr}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-xs text-muted-foreground">
                          <div className="font-medium">{fullDateStr}</div>
                          <div className="text-[10px]">🕐 {timeStr}</div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center text-slate-700 font-medium">{s.present}</td>
                      <td className="px-4 py-3 text-center text-red-600 font-medium">{s.absent}</td>
                      <td className="px-4 py-3 text-center text-slate-700 font-medium">{s.late}</td>
                      <td className="px-4 py-3 text-center font-bold">{s.total}</td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-border/60 bg-muted/30 font-bold">
                  <td colSpan={6} className="px-4 py-3 text-right">Jami:</td>
                  <td className="px-4 py-3 text-center text-slate-700">{teacherSessions.reduce((s: number, x: any) => s + x.present, 0)}</td>
                  <td className="px-4 py-3 text-center text-red-600">{teacherSessions.reduce((s: number, x: any) => s + x.absent, 0)}</td>
                  <td className="px-4 py-3 text-center text-slate-700">{teacherSessions.reduce((s: number, x: any) => s + x.late, 0)}</td>
                  <td className="px-4 py-3 text-center">{teacherSessions.reduce((s: number, x: any) => s + x.total, 0)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </Card>

      {/* So'nggi davomatlar */}
      <Card color="amber">
        <CardHeader title="So'nggi davomatlar" subtitle="Oxirgi 5 kun" />
        {loading ? <PanelLoader /> : recentByDate.length === 0 ? <EmptyState title="Hozircha davomat yo'q" /> : (
          <div className="p-4 pt-0 space-y-3">
            {recentByDate.map(([date, recs]) => (
              <div key={date}>
                <div className="text-xs font-semibold text-muted-foreground mb-2">{formatDate(date)}</div>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {recs.map((a) => (
                    <div key={a.id} className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-muted/40">
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium truncate">{a.student?.full_name}</div>
                        <div className="text-[10px] text-muted-foreground truncate">
                          {a.group?.name || '—'}
                          {a.teacher?.full_name && ` · 👤 ${a.teacher.full_name}`}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0"><AttStatusChip status={a.status} /><IconButton danger onClick={() => handleDelete(a.id)} title="O'chirish"><Trash2 className="w-3 h-3" /></IconButton></div>
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

  // Davomat sessiyalari uchun (kim, qachon, qaysi guruhda davomat qildi)
  const [sessions, setSessions] = useState<any[]>([])

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

  // === YANGI: Davomat sessiyalari ===
  // Har bir sessiya = bitta o'qituvchi, bitta guruh, bitta sanada davomat belgilashi
  const sessionList = useMemo(() => {
    const m: Record<string, any> = {}
    items.forEach((a) => {
      // Sessiya kaliti: teacher_id + group_id + lesson_date
      const teacherId = a.teacher_id || 'unknown'
      const key = `${teacherId}_${a.group_id}_${a.lesson_date}`
      if (!m[key]) {
        m[key] = {
          teacher_id: teacherId,
          teacher_name: a.teacher?.full_name || (teacherId === 'unknown' ? 'Admin tomonidan' : '—'),
          teacher_subject: a.teacher?.subject || '',
          group_id: a.group_id,
          group_name: a.group?.name || '—',
          course_name: a.group?.course?.name || '—',
          lesson_date: a.lesson_date,
          created_at: a.created_at,
          present: 0,
          absent: 0,
          late: 0,
          excused: 0,
          total: 0,
        }
      }
      m[key][a.status as 'present' | 'absent' | 'late' | 'excused'] = (m[key][a.status as 'present' | 'absent' | 'late' | 'excused'] || 0) + 1
      m[key].total++
      // Eng birinchi created_at ni saqlaymiz (eng erta vaqt)
      if (a.created_at && (!m[key].created_at || a.created_at < m[key].created_at)) {
        m[key].created_at = a.created_at
      }
    })
    return Object.values(m).sort((a: any, b: any) => {
      // Sanaga ko'ra (eng yangi yuqorida)
      if (a.lesson_date !== b.lesson_date) return b.lesson_date.localeCompare(a.lesson_date)
      return (b.created_at || '').localeCompare(a.created_at || '')
    })
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

      <Card color="rose">
        <div className="p-4 grid sm:grid-cols-4 gap-3">
          <Field label="Kurs"><select className="erp-input" value={courseId} onChange={(e) => { setCourseId(e.target.value); setGroupId('all') }}><option value="all">Barcha kurslar</option>{courses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>
          <Field label="Guruh"><select className="erp-input" value={groupId} onChange={(e) => setGroupId(e.target.value)}><option value="all">Barcha guruhlar</option>{filteredGroups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}</select></Field>
          <Field label="Dan"><input type="date" className="erp-input" value={from} onChange={(e) => setFrom(e.target.value)} /></Field>
          <Field label="Gacha"><input type="date" className="erp-input" value={to} onChange={(e) => setTo(e.target.value)} /></Field>
        </div>
      </Card>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <SummaryBox label="Jami darslar" value={totals.total} color="bg-slate-50 text-slate-700" />
        <SummaryBox label="Keldi" value={totals.present} color="bg-slate-50 text-slate-700" />
        <SummaryBox label="Kelmadi" value={totals.absent} color="bg-slate-50 text-red-700" />
        <SummaryBox label="Kechikdi" value={totals.late} color="bg-slate-50 text-slate-700" />
        <SummaryBox label="Sababli" value={totals.excused} color="bg-slate-50 text-slate-700" />
      </div>

      <Card color="violet">
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
                      <td className="px-4 py-3 text-center text-slate-700">{r.present}</td>
                      <td className="px-4 py-3 text-center text-red-600">{r.absent}</td>
                      <td className="px-4 py-3 text-center text-slate-700">{r.late}</td>
                      <td className="px-4 py-3 text-center text-slate-700">{r.excused}</td>
                      <td className="px-4 py-3 text-center"><span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${rate >= 80 ? 'bg-slate-100 text-slate-700' : rate >= 60 ? 'bg-slate-100 text-slate-700' : 'bg-red-100 text-red-700'}`}>{rate}%</span></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* === YANGI: Davomat sessiyalari jadvali === */}
      <Card color="blue">
        <CardHeader
          title="Davomat sessiyalari (o'qituvchilar tomonidan)"
          subtitle={`${sessionList.length} ta sessiya · kim, qachon, qaysi guruhda davomat qildi`}
        />
        {sessionList.length === 0 ? (
          <EmptyState title="Sessiyalar yo'q" description="Hozircha davomat belgilanmagan." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/40 text-xs text-muted-foreground">
                  <th className="text-left px-4 py-3 font-medium">#</th>
                  <th className="text-left px-4 py-3 font-medium">O'qituvchi</th>
                  <th className="text-left px-4 py-3 font-medium">Kurs</th>
                  <th className="text-left px-4 py-3 font-medium">Guruh</th>
                  <th className="text-left px-4 py-3 font-medium">Dars sanasi</th>
                  <th className="text-left px-4 py-3 font-medium">Belgilangan vaqt</th>
                  <th className="text-center px-4 py-3 font-medium">Keldi</th>
                  <th className="text-center px-4 py-3 font-medium">Kelmadi</th>
                  <th className="text-center px-4 py-3 font-medium">Kechikdi</th>
                  <th className="text-center px-4 py-3 font-medium">Jami</th>
                </tr>
              </thead>
              <tbody>
                {sessionList.slice(0, 100).map((s: any, idx: number) => {
                  // Sana va vaqt alohida
                  const dt = s.created_at ? new Date(s.created_at) : null
                  const dateStr = s.lesson_date || '—'
                  const timeStr = dt ? dt.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' }) : '—'
                  const fullDateStr = dt ? dt.toLocaleDateString('uz-UZ') : '—'
                  return (
                    <tr key={idx} className="border-b border-border/20 hover:bg-muted/40">
                      <td className="px-4 py-3 text-muted-foreground text-xs">{idx + 1}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium flex items-center gap-1">
                          👤 {s.teacher_name}
                        </div>
                        {s.teacher_subject && (
                          <div className="text-[10px] text-muted-foreground">{s.teacher_subject}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">{s.course_name}</td>
                      <td className="px-4 py-3 font-medium text-xs">{s.group_name}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-xs">{dateStr}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-xs text-muted-foreground">
                          <div className="font-medium">{fullDateStr}</div>
                          <div className="text-[10px]">🕐 {timeStr}</div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center text-slate-700 font-medium">{s.present}</td>
                      <td className="px-4 py-3 text-center text-red-600 font-medium">{s.absent}</td>
                      <td className="px-4 py-3 text-center text-slate-700 font-medium">{s.late}</td>
                      <td className="px-4 py-3 text-center font-bold">{s.total}</td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-border/60 bg-muted/30 font-bold">
                  <td colSpan={6} className="px-4 py-3 text-right">Jami:</td>
                  <td className="px-4 py-3 text-center text-slate-700">{sessionList.reduce((s: number, x: any) => s + x.present, 0)}</td>
                  <td className="px-4 py-3 text-center text-red-600">{sessionList.reduce((s: number, x: any) => s + x.absent, 0)}</td>
                  <td className="px-4 py-3 text-center text-slate-700">{sessionList.reduce((s: number, x: any) => s + x.late, 0)}</td>
                  <td className="px-4 py-3 text-center">{sessionList.reduce((s: number, x: any) => s + x.total, 0)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </Card>

      {/* Ma'lumot */}
      <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 text-xs text-slate-700">
        <strong>ℹ️ Davomat sessiyalari haqida:</strong> Bu jadval har bir davomat belgilash sessiyasini ko'rsatadi —
        qaysi <strong>o'qituvchi</strong>, qaysi <strong>sana</strong> va <strong>vaqtda</strong>, qaysi <strong>guruhda</strong> davomat belgilagan.
        Ma'lumotlar o'qituvchi panelidan (<code className="px-1 bg-slate-100 rounded">/teacher</code>) avtomatik keladi va bitta baza (attendance jadvali) dan olinadi.
      </div>
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
  const [courses, setCourses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [groupId, setGroupId] = useState('')
  const [lessonDate, setLessonDate] = useState(new Date().toISOString().slice(0, 10))
  const [records, setRecords] = useState<any[]>([])
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const [a, t, g, c] = await Promise.all([apiFetch('/api/teacher-attendance'), apiFetch('/api/teachers'), apiFetch('/api/groups'), apiFetch('/api/courses')])
    if (a.ok) setItems(a.data?.attendance || [])
    if (t.ok) setTeachers(t.data?.teachers || [])
    if (g.ok) setGroups(g.data?.groups || [])
    if (c.ok) setCourses(c.data?.courses || [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  // O'qituvchi → biriktirilgan guruhlar → kurs nomi
  const teachersWithCourse = useMemo(() => {
    return teachers.map((t) => {
      const teacherGroups = groups.filter((g) => g.teacher_id === t.id)
      const courseNames = Array.from(new Set(teacherGroups.map((g) => g.course?.name).filter(Boolean)))
      return {
        ...t,
        course_names: courseNames,
        group_count: teacherGroups.length,
      }
    })
  }, [teachers, groups])

  // Sana tanlanganda — barcha o'qituvchilar uchun yozuv yaratamiz
  useEffect(() => {
    if (teachersWithCourse.length > 0) {
      const existing = items.filter((a) => a.lesson_date === lessonDate)
      const newRecs = teachersWithCourse.map((t) => {
        const ex = existing.find((e) => e.teacher_id === t.id && (!groupId || e.group_id === groupId))
        return {
          id: ex?.id || null,
          teacher_id: t.id,
          teacher_name: t.full_name,
          teacher_subject: t.subject,
          course_names: t.course_names,
          status: ex?.status || 'present',
        }
      })
      // Guruh filter bo'lsa, shu guruhga biriktirilgan o'qituvchilarni ko'rsatamiz
      const filtered = groupId ? newRecs.filter((r) => {
        const t = teachers.find((x) => x.id === r.teacher_id)
        return groups.some((g) => g.id === groupId && g.teacher_id === t?.id)
      }) : newRecs
      setRecords(filtered)
    } else {
      setRecords([])
    }
  }, [teachersWithCourse, lessonDate, items, groupId, groups, teachers])

  function updateRecord(i: number, status: string) {
    setRecords((prev) => {
      const r = [...prev]
      r[i] = { ...r[i], status }
      return r
    })
  }

  async function handleSave() {
    if (records.length === 0) return alert('O\'qituvchilar yo\'q')
    setSaving(true)
    // Yangi yozuvlar
    const newRecs = records.filter((r) => !r.id).map((r) => ({
      teacher_id: r.teacher_id, group_id: groupId || null, lesson_date: lessonDate, status: r.status,
    }))
    // Yangilash
    const updates = records.filter((r) => r.id)
    let ok = true, errMsg = ''
    if (newRecs.length > 0) {
      const res = await apiFetch('/api/teacher-attendance', { method: 'POST', body: JSON.stringify({ records: newRecs }) })
      if (!res.ok) { ok = false; errMsg = res.error || '' }
    }
    for (const u of updates) {
      const res = await apiFetch('/api/teacher-attendance', { method: 'PUT', body: JSON.stringify({ id: u.id, status: u.status }) })
      if (!res.ok) { ok = false; errMsg = res.error || '' }
    }
    setSaving(false)
    if (!ok) return alert(errMsg || 'Xatolik')
    alert('Ustozlar davomati saqlandi!')
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
    return Object.entries(m).sort(([a], [b]) => b.localeCompare(a)).slice(0, 5)
  }, [items])

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="text-2xl lg:text-3xl font-bold">Ustozlar davomati</h1><p className="text-muted-foreground text-sm mt-1">O'qituvchilar darsga kelishi — kartochka ko'rinishida</p></div>
      </div>

      {/* Tanlovlar */}
      <Card color="sky">
        <div className="p-4 grid sm:grid-cols-2 gap-3">
          <Field label="Guruh (ixtiyoriy — bo'sh = barchasi)"><select className="erp-input" value={groupId} onChange={(e) => setGroupId(e.target.value)}><option value="">Barcha guruhlar</option>{groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}</select></Field>
          <Field label="Dars sanasi *"><input type="date" className="erp-input" value={lessonDate} onChange={(e) => setLessonDate(e.target.value)} /></Field>
        </div>
      </Card>

      {/* O'qituvchilar ro'yxati kartochka ko'rinishida */}
      <Card color="amber">
        <CardHeader title="O'qituvchilar" subtitle={`${records.length} murabbiy • ${formatDate(lessonDate)}`} action={<PrimaryButton onClick={handleSave} disabled={saving || records.length === 0}>{saving ? 'Saqlanmoqda...' : 'Saqlash'}</PrimaryButton>} />
        {loading ? <PanelLoader /> : records.length === 0 ? <EmptyState title="O'qituvchilar yo'q" description="Avval O'qituvchilar bo'limidan murabbiy qo'shing." /> : (
          <div className="p-4 pt-3 grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {records.map((r, i) => (
              <motion.div key={r.teacher_id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }} className="p-3 rounded-xl bg-muted/30 border border-border/40">
                <div className="flex items-center gap-2 mb-2">
                  <Avatar name={r.teacher_name} color="cyan" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold truncate">{r.teacher_name}</div>
                    {r.teacher_subject && <div className="text-[10px] text-muted-foreground truncate">📚 {r.teacher_subject}</div>}
                    {r.course_names?.length > 0 && <div className="text-[10px] text-slate-700 truncate">🎯 {r.course_names.join(', ')}</div>}
                  </div>
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

      {/* So'nggi davomatlar */}
      <Card color="rose">
        <CardHeader title="So'nggi davomatlar" subtitle="Oxirgi 5 kun" />
        {recentByDate.length === 0 ? <EmptyState title="Hozircha davomat yo'q" /> : (
          <div className="p-4 pt-0 space-y-3">
            {recentByDate.map(([date, recs]) => (
              <div key={date}>
                <div className="text-xs font-semibold text-muted-foreground mb-2">{formatDate(date)}</div>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {recs.map((a) => (
                    <div key={a.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-muted/40">
                      <div className="min-w-0 flex items-center gap-2">
                        <Avatar name={a.teacher?.full_name || '?'} color="cyan" />
                        <div className="min-w-0">
                          <div className="text-sm font-medium truncate">{a.teacher?.full_name || '—'}</div>
                          <div className="text-[10px] text-muted-foreground truncate">{a.teacher?.subject || '—'}</div>
                          {a.group?.name && <div className="text-[10px] text-slate-700 truncate">{a.group.name}</div>}
                        </div>
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
