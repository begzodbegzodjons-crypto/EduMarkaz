'use client'
import { useEffect, useState, useCallback, useMemo } from 'react'
import { motion } from 'framer-motion'
import { apiFetch, formatDate, formatMoney } from '@/lib/client'
import { exportToExcel } from '@/lib/excel-export'
import {
  Users, Wallet, BookOpen, UserCog, Plus, Trash2, Pencil, Search, Star,
} from '@/components/icons'
import {
  Card, CardHeader, EmptyState, Modal, PrimaryButton, GhostButton, IconButton,
  PanelLoader, Field, Avatar, Row,
} from './panels-common'

// ============================================================================
//  O'QITUVCHILAR PANEL
// ============================================================================
export function TeachersPanel() {
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [openModal, setOpenModal] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [form, setForm] = useState<any>({ full_name: '', phone: '', subject: '', salary_amount: 0, hire_date: '', notes: '' })

  const load = useCallback(async () => {
    setLoading(true)
    const { ok, data } = await apiFetch('/api/teachers')
    if (ok) setItems(data?.teachers || [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function handleSave() {
    if (editing) {
      const { ok, error } = await apiFetch('/api/teachers', { method: 'PUT', body: JSON.stringify({ id: editing.id, ...form }) })
      if (!ok) return alert(error)
    } else {
      const { ok, error } = await apiFetch('/api/teachers', { method: 'POST', body: JSON.stringify(form) })
      if (!ok) return alert(error)
    }
    setOpenModal(false); setEditing(null); load()
  }
  async function handleDelete(id: string) { if (!confirm('O\'chirmoqchimisiz?')) return; const { ok, error } = await apiFetch(`/api/teachers?id=${id}`, { method: 'DELETE' }); if (!ok) return alert(error); load() }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="text-2xl lg:text-3xl font-bold">O'qituvchilar</h1><p className="text-muted-foreground text-sm mt-1">{items.length} murabbiy</p></div>
        <div className="flex gap-2">
          <GhostButton onClick={() => exportToExcel({
            filename: 'oqituvchilar',
            title: 'O\'qituvchilar ro\'yxati',
            headerColor: '#0891B2',
            columns: [
              { header: '#', key: 'num', width: 40 },
              { header: 'F.I.O', key: 'full_name', width: 200 },
              { header: 'Telefon', key: 'phone', width: 120 },
              { header: 'Fan', key: 'subject', width: 150 },
              { header: 'Maosh', key: 'salary', width: 120 },
              { header: 'Ish boshlagan', key: 'hire_date', width: 100 },
              { header: 'Login', key: 'login', width: 120 },
              { header: 'Parol holati', key: 'has_pass', width: 100 },
              { header: 'Izoh', key: 'notes', width: 200 },
            ],
            data: items.map((t, i) => ({
              num: i + 1,
              full_name: t.full_name,
              phone: t.phone || '',
              subject: t.subject || '',
              salary: formatMoney(t.salary_amount),
              hire_date: formatDate(t.hire_date),
              login: t.login || t.phone || '',
              has_pass: t.has_password ? 'Parol bor' : 'Parol yo\'q',
              notes: t.notes || '',
            })),
          })}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
            Excel
          </GhostButton>
          <PrimaryButton onClick={() => { setEditing(null); setForm({ full_name: '', phone: '', subject: '', salary_amount: 0, hire_date: '', notes: '' }); setOpenModal(true) }}><Plus className="w-4 h-4" /> Yangi o'qituvchi</PrimaryButton>
        </div>
      </div>
      {loading ? <PanelLoader /> : items.length === 0 ? <Card><EmptyState title="O'qituvchilar yo'q" description="Birinchi murabbiyingizni qo'shing." /></Card> : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((t) => (
            <Card key={t.id}><div className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3"><Avatar name={t.full_name} color="cyan" /><div><div className="font-semibold">{t.full_name}</div><div className="text-xs text-muted-foreground">{t.subject || 'Fan ko\'rsatilmagan'}</div></div></div>
                <div className="flex gap-1">
                  <IconButton title="Tahrirlash" onClick={() => { setEditing(t); setForm({ full_name: t.full_name, phone: t.phone || '', subject: t.subject || '', salary_amount: t.salary_amount || 0, hire_date: t.hire_date || '', notes: t.notes || '' }); setOpenModal(true) }}><Pencil className="w-3.5 h-3.5" /></IconButton>
                  <IconButton title="O'chirish" danger onClick={() => handleDelete(t.id)}><Trash2 className="w-3.5 h-3.5" /></IconButton>
                </div>
              </div>
              <div className="mt-3 space-y-1.5 text-xs">
                {t.phone && <Row label="Telefon" value={t.phone} />}
                <Row label="Maosh" value={formatMoney(t.salary_amount)} />
                <Row label="Ish boshlagan" value={formatDate(t.hire_date)} />
              </div>
            </div></Card>
          ))}
        </div>
      )}
      <Modal open={openModal} onClose={() => setOpenModal(false)} title={editing ? 'O\'qituvchini tahrirlash' : 'Yangi o\'qituvchi'}>
        <div className="space-y-3">
          <Field label="F.I.O *"><input className="erp-input" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></Field>
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Telefon"><input className="erp-input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
            <Field label="Fan / Mutaxassislik"><input className="erp-input" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} /></Field>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Maosh (so'm)"><input type="number" className="erp-input" value={form.salary_amount} onChange={(e) => setForm({ ...form, salary_amount: Number(e.target.value) })} /></Field>
            <Field label="Ish boshlagan sana"><input type="date" className="erp-input" value={form.hire_date} onChange={(e) => setForm({ ...form, hire_date: e.target.value })} /></Field>
          </div>
          <Field label="Izoh"><textarea className="erp-input" rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field>
          <div className="flex gap-2 pt-2"><PrimaryButton onClick={handleSave} className="flex-1">Saqlash</PrimaryButton><GhostButton onClick={() => setOpenModal(false)}>Bekor</GhostButton></div>
        </div>
      </Modal>
    </div>
  )
}

// ============================================================================
//  GURUHLAR PANEL — kursga bog'langan
// ============================================================================
export function GroupsPanel() {
  const [items, setItems] = useState<any[]>([])
  const [courses, setCourses] = useState<any[]>([])
  const [teachers, setTeachers] = useState<any[]>([])
  const [students, setStudents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [courseFilter, setCourseFilter] = useState('all')
  const [openModal, setOpenModal] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [form, setForm] = useState<any>({ name: '', course_id: '', teacher_id: '', start_date: '', end_date: '', schedule: '', max_students: 12 })

  const load = useCallback(async () => {
    setLoading(true)
    const [g, c, t, s] = await Promise.all([apiFetch('/api/groups'), apiFetch('/api/courses'), apiFetch('/api/teachers'), apiFetch('/api/students')])
    if (g.ok) setItems(g.data?.groups || [])
    if (c.ok) setCourses(c.data?.courses || [])
    if (t.ok) setTeachers(t.data?.teachers || [])
    if (s.ok) setStudents(s.data?.students || [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = courseFilter === 'all' ? items : items.filter((g) => g.course_id === courseFilter)

  async function handleSave() {
    if (editing) {
      const { ok, error } = await apiFetch('/api/groups', { method: 'PUT', body: JSON.stringify({ id: editing.id, ...form }) })
      if (!ok) return alert(error)
    } else {
      const { ok, error } = await apiFetch('/api/groups', { method: 'POST', body: JSON.stringify(form) })
      if (!ok) return alert(error)
    }
    setOpenModal(false); setEditing(null); load()
  }
  async function handleDelete(id: string) { if (!confirm('O\'chirmoqchimisiz?')) return; const { ok, error } = await apiFetch(`/api/groups?id=${id}`, { method: 'DELETE' }); if (!ok) return alert(error); load() }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="text-2xl lg:text-3xl font-bold">Guruhlar</h1><p className="text-muted-foreground text-sm mt-1">{filtered.length} guruh</p></div>
        <div className="flex gap-2">
          <GhostButton onClick={() => exportToExcel({
            filename: 'guruhlar',
            title: 'Guruhlar ro\'yxati',
            headerColor: '#0EA5E9',
            columns: [
              { header: '#', key: 'num', width: 40 },
              { header: 'Guruh nomi', key: 'name', width: 200 },
              { header: 'Kurs', key: 'course_name', width: 150 },
              { header: 'O\'qituvchi', key: 'teacher_name', width: 200 },
              { header: 'Jadval', key: 'schedule', width: 150 },
              { header: 'Talabalar soni', key: 'student_count', width: 100 },
              { header: 'Maks talabalar', key: 'max_students', width: 100 },
              { header: 'Boshlanish', key: 'start_date', width: 100 },
              { header: 'Tugash', key: 'end_date', width: 100 },
            ],
            data: filtered.map((g, i) => {
              const count = students.filter((s) => s.group_id === g.id).length
              return {
                num: i + 1,
                name: g.name,
                course_name: g.course?.name || '—',
                teacher_name: g.teacher?.full_name || '—',
                schedule: g.schedule || '—',
                student_count: count,
                max_students: g.max_students,
                start_date: formatDate(g.start_date),
                end_date: formatDate(g.end_date),
              }
            }),
          })}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
            Excel
          </GhostButton>
          <PrimaryButton onClick={() => { setEditing(null); setForm({ name: '', course_id: '', teacher_id: '', start_date: '', end_date: '', schedule: '', max_students: 12 }); setOpenModal(true) }}><Plus className="w-4 h-4" /> Yangi guruh</PrimaryButton>
        </div>
      </div>
      <div className="flex gap-2 flex-wrap">
        <select value={courseFilter} onChange={(e) => setCourseFilter(e.target.value)} className="px-3 py-2 rounded-xl border border-border/50 text-sm bg-card">
          <option value="all">Barcha kurslar</option>
          {courses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>
      {loading ? <PanelLoader /> : filtered.length === 0 ? <Card><EmptyState title="Guruhlar yo'q" description="Birinchi guruhingizni yarating." /></Card> : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((g) => {
            const count = students.filter((s) => s.group_id === g.id).length
            const isFull = count >= g.max_students
            return (
              <Card key={g.id}><div className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3"><Avatar name={g.name} color="amber" /><div><div className="font-semibold">{g.name}</div><div className="text-xs text-muted-foreground">{g.course?.name || 'Kurs yo\'q'}</div></div></div>
                  <div className="flex gap-1">
                    <IconButton title="Tahrirlash" onClick={() => { setEditing(g); setForm({ name: g.name, course_id: g.course_id || '', teacher_id: g.teacher_id || '', start_date: g.start_date || '', end_date: g.end_date || '', schedule: g.schedule || '', max_students: g.max_students || 12 }); setOpenModal(true) }}><Pencil className="w-3.5 h-3.5" /></IconButton>
                    <IconButton title="O'chirish" danger onClick={() => handleDelete(g.id)}><Trash2 className="w-3.5 h-3.5" /></IconButton>
                  </div>
                </div>
                <div className="mt-3 space-y-1.5 text-xs">
                  {g.teacher && <Row label="O'qituvchi" value={g.teacher.full_name} />}
                  <Row label="Jadval" value={g.schedule || '—'} />
                  <Row label="Boshlanish" value={formatDate(g.start_date)} />
                  <Row label="Tugash" value={formatDate(g.end_date)} />
                </div>
                <div className="mt-3 pt-3 border-t border-border/40 flex items-center justify-between">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${isFull ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>{count}/{g.max_students} talaba</span>
                  {isFull && <span className="text-[10px] text-red-600 font-medium">To'lgan</span>}
                </div>
              </div></Card>
            )
          })}
        </div>
      )}
      <Modal open={openModal} onClose={() => setOpenModal(false)} title={editing ? 'Guruhni tahrirlash' : 'Yangi guruh'}>
        <div className="space-y-3">
          <Field label="Guruh nomi *"><input className="erp-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Kurs"><select className="erp-input" value={form.course_id} onChange={(e) => setForm({ ...form, course_id: e.target.value })}><option value="">— Tanlang —</option>{courses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>
            <Field label="O'qituvchi"><select className="erp-input" value={form.teacher_id} onChange={(e) => setForm({ ...form, teacher_id: e.target.value })}><option value="">— Tanlang —</option>{teachers.map((t) => <option key={t.id} value={t.id}>{t.full_name}</option>)}</select></Field>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Boshlanish sana"><input type="date" className="erp-input" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} /></Field>
            <Field label="Tugash sana"><input type="date" className="erp-input" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} /></Field>
          </div>
          <Field label="Jadval (matn)"><input className="erp-input" value={form.schedule} onChange={(e) => setForm({ ...form, schedule: e.target.value })} placeholder="Du-Chor-Juma 14:00-16:00" /></Field>
          <Field label="Maks talabalar soni"><input type="number" className="erp-input" value={form.max_students} onChange={(e) => setForm({ ...form, max_students: Number(e.target.value) })} /></Field>
          <div className="flex gap-2 pt-2"><PrimaryButton onClick={handleSave} className="flex-1">Saqlash</PrimaryButton><GhostButton onClick={() => setOpenModal(false)}>Bekor</GhostButton></div>
        </div>
      </Modal>
    </div>
  )
}

// ============================================================================
//  KURSLAR PANEL
// ============================================================================
export function CoursesPanel() {
  const [items, setItems] = useState<any[]>([])
  const [groups, setGroups] = useState<any[]>([])
  const [students, setStudents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [openModal, setOpenModal] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [form, setForm] = useState<any>({ name: '', description: '', duration_months: 3, price: 0 })

  const load = useCallback(async () => {
    setLoading(true)
    const [c, g, s] = await Promise.all([apiFetch('/api/courses'), apiFetch('/api/groups'), apiFetch('/api/students')])
    if (c.ok) setItems(c.data?.courses || [])
    if (g.ok) setGroups(g.data?.groups || [])
    if (s.ok) setStudents(s.data?.students || [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function handleSave() {
    if (editing) {
      const { ok, error } = await apiFetch('/api/courses', { method: 'PUT', body: JSON.stringify({ id: editing.id, ...form }) })
      if (!ok) return alert(error)
    } else {
      const { ok, error } = await apiFetch('/api/courses', { method: 'POST', body: JSON.stringify(form) })
      if (!ok) return alert(error)
    }
    setOpenModal(false); setEditing(null); load()
  }
  async function handleDelete(id: string) { if (!confirm('O\'chirmoqchimisiz?')) return; const { ok, error } = await apiFetch(`/api/courses?id=${id}`, { method: 'DELETE' }); if (!ok) return alert(error); load() }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="text-2xl lg:text-3xl font-bold">Kurslar</h1><p className="text-muted-foreground text-sm mt-1">{items.length} kurs</p></div>
        <div className="flex gap-2">
          <GhostButton onClick={() => exportToExcel({
            filename: 'kurslar',
            title: 'Kurslar ro\'yxati',
            headerColor: '#8B5CF6',
            columns: [
              { header: '#', key: 'num', width: 40 },
              { header: 'Kurs nomi', key: 'name', width: 200 },
              { header: 'Tavsif', key: 'description', width: 300 },
              { header: 'Davomiyligi (oy)', key: 'duration', width: 100 },
              { header: 'Oylik to\'lov', key: 'price', width: 120 },
              { header: 'Guruhlar soni', key: 'group_count', width: 100 },
              { header: 'Talabalar soni', key: 'student_count', width: 100 },
            ],
            data: items.map((c, i) => {
              const groupCount = groups.filter((g) => g.course_id === c.id).length
              const studentCount = students.filter((s) => s.course_id === c.id && s.status === 'active').length
              return {
                num: i + 1,
                name: c.name,
                description: c.description || '',
                duration: c.duration_months,
                price: formatMoney(c.price),
                group_count: groupCount,
                student_count: studentCount,
              }
            }),
          })}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
            Excel
          </GhostButton>
          <PrimaryButton onClick={() => { setEditing(null); setForm({ name: '', description: '', duration_months: 3, price: 0 }); setOpenModal(true) }}><Plus className="w-4 h-4" /> Yangi kurs</PrimaryButton>
        </div>
      </div>
      {loading ? <PanelLoader /> : items.length === 0 ? <Card><EmptyState title="Kurslar yo'q" description="Birinchi kursingizni yarating." /></Card> : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((c) => {
            const groupCount = groups.filter((g) => g.course_id === c.id).length
            const studentCount = students.filter((s) => s.course_id === c.id).length
            return (
              <Card key={c.id}><div className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3"><Avatar name={c.name} color="violet" /><div><div className="font-semibold">{c.name}</div><div className="text-xs text-muted-foreground">{c.duration_months} oy</div></div></div>
                  <div className="flex gap-1">
                    <IconButton title="Tahrirlash" onClick={() => { setEditing(c); setForm({ name: c.name, description: c.description || '', duration_months: c.duration_months, price: c.price }); setOpenModal(true) }}><Pencil className="w-3.5 h-3.5" /></IconButton>
                    <IconButton title="O'chirish" danger onClick={() => handleDelete(c.id)}><Trash2 className="w-3.5 h-3.5" /></IconButton>
                  </div>
                </div>
                {c.description && <p className="mt-3 text-xs text-muted-foreground line-clamp-2">{c.description}</p>}
                <div className="mt-3 pt-3 border-t border-border/40 grid grid-cols-3 gap-2 text-center">
                  <div><div className="text-base font-bold text-violet-600">{groupCount}</div><div className="text-[10px] text-muted-foreground">guruh</div></div>
                  <div><div className="text-base font-bold text-emerald-600">{studentCount}</div><div className="text-[10px] text-muted-foreground">talaba</div></div>
                  <div><div className="text-base font-bold text-amber-600">{formatMoney(c.price).replace(' so\'m', '')}</div><div className="text-[10px] text-muted-foreground">so'm</div></div>
                </div>
              </div></Card>
            )
          })}
        </div>
      )}
      <Modal open={openModal} onClose={() => setOpenModal(false)} title={editing ? 'Kursni tahrirlash' : 'Yangi kurs'}>
        <div className="space-y-3">
          <Field label="Kurs nomi *"><input className="erp-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="Tavsif"><textarea className="erp-input" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Davomiyligi (oy)"><input type="number" className="erp-input" value={form.duration_months} onChange={(e) => setForm({ ...form, duration_months: Number(e.target.value) })} /></Field>
            <Field label="Narxi (so'm)"><input type="number" className="erp-input" value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} /></Field>
          </div>
          <div className="flex gap-2 pt-2"><PrimaryButton onClick={handleSave} className="flex-1">Saqlash</PrimaryButton><GhostButton onClick={() => setOpenModal(false)}>Bekor</GhostButton></div>
        </div>
      </Modal>
    </div>
  )
}

// ============================================================================
//  REYTING PANEL — talabalar uchun 1-5 ball
// ============================================================================
export function RatingsPanel() {
  const [items, setItems] = useState<any[]>([])
  const [students, setStudents] = useState<any[]>([])
  const [groups, setGroups] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [openModal, setOpenModal] = useState(false)
  const [form, setForm] = useState<any>({ student_id: '', group_id: '', rating_date: new Date().toISOString().slice(0, 10), score: 5, comment: '' })

  const load = useCallback(async () => {
    setLoading(true)
    const [r, s, g] = await Promise.all([apiFetch('/api/ratings'), apiFetch('/api/students'), apiFetch('/api/groups')])
    if (r.ok) setItems(r.data?.ratings || [])
    if (s.ok) setStudents(s.data?.students || [])
    if (g.ok) setGroups(g.data?.groups || [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  // Talaba bo'yicha o'rtacha reyting
  const avgByStudent = useMemo(() => {
    const map: Record<string, { name: string; avg: number; count: number }> = {}
    items.forEach((r) => {
      const id = r.student_id
      if (!map[id]) map[id] = { name: r.student?.full_name || '—', avg: 0, count: 0 }
      map[id].avg += r.score
      map[id].count++
    })
    return Object.entries(map).map(([id, v]) => ({ id, ...v, avg: v.count > 0 ? v.avg / v.count : 0 })).sort((a, b) => b.avg - a.avg)
  }, [items])

  async function handleSave() {
    if (!form.student_id) return alert('Talaba tanlang')
    const { ok, error } = await apiFetch('/api/ratings', { method: 'POST', body: JSON.stringify(form) })
    if (!ok) return alert(error)
    setOpenModal(false)
    setForm({ student_id: '', group_id: '', rating_date: new Date().toISOString().slice(0, 10), score: 5, comment: '' })
    load()
  }
  async function handleDelete(id: string) { if (!confirm('O\'chirmoqchimisiz?')) return; const { ok, error } = await apiFetch(`/api/ratings?id=${id}`, { method: 'DELETE' }); if (!ok) return alert(error); load() }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="text-2xl lg:text-3xl font-bold">Reyting</h1><p className="text-muted-foreground text-sm mt-1">{items.length} baho, {avgByStudent.length} talaba</p></div>
        <PrimaryButton onClick={() => setOpenModal(true)}><Plus className="w-4 h-4" /> Yangi baho</PrimaryButton>
      </div>
      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader title="Reyting jadvali" subtitle="Talabalar bo'yicha o'rtacha ball" />
          {avgByStudent.length === 0 ? <EmptyState title="Reyting yo'q" description="Talabalarga baho qo'ying." /> : (
            <div className="p-4 pt-0 space-y-2 max-h-96 overflow-y-auto">
              {avgByStudent.map((s, i) => (
                <div key={s.id} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted/40">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${i === 0 ? 'bg-amber-100 text-amber-700' : i === 1 ? 'bg-slate-100 text-slate-700' : i === 2 ? 'bg-orange-100 text-orange-700' : 'bg-muted text-muted-foreground'}`}>{i + 1}</div>
                  <div className="flex-1 min-w-0"><div className="text-sm font-medium truncate">{s.name}</div><div className="text-[10px] text-muted-foreground">{s.count} ta baho</div></div>
                  <div className="flex items-center gap-1"><Star className="w-4 h-4 text-amber-500 fill-amber-500" /><span className="font-bold text-sm">{s.avg.toFixed(1)}</span></div>
                </div>
              ))}
            </div>
          )}
        </Card>
        <Card>
          <CardHeader title="So'nggi baholar" subtitle="Eng so'nggi yozuvlar" />
          {items.length === 0 ? <EmptyState title="Baho yo'q" /> : (
            <div className="p-4 pt-0 space-y-2 max-h-96 overflow-y-auto">
              {items.slice(0, 30).map((r) => (
                <div key={r.id} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted/40">
                  <Avatar name={r.student?.full_name || '?'} color="amber" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{r.student?.full_name || '—'}</div>
                    <div className="text-[10px] text-muted-foreground">{formatDate(r.rating_date)}{r.group?.name ? ' • ' + r.group.name : ''}</div>
                    {r.comment && <div className="text-xs text-muted-foreground truncate">{r.comment}</div>}
                  </div>
                  <div className="flex items-center gap-1"><Star className="w-4 h-4 text-amber-500 fill-amber-500" /><span className="font-bold text-sm">{r.score}</span></div>
                  <IconButton title="O'chirish" danger onClick={() => handleDelete(r.id)}><Trash2 className="w-3.5 h-3.5" /></IconButton>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
      <Modal open={openModal} onClose={() => setOpenModal(false)} title="Yangi baho qo'shish">
        <div className="space-y-3">
          <Field label="Talaba *"><select className="erp-input" value={form.student_id} onChange={(e) => setForm({ ...form, student_id: e.target.value })}><option value="">— Tanlang —</option>{students.map((s) => <option key={s.id} value={s.id}>{s.full_name}</option>)}</select></Field>
          <Field label="Guruh"><select className="erp-input" value={form.group_id} onChange={(e) => setForm({ ...form, group_id: e.target.value })}><option value="">— Tanlang —</option>{groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}</select></Field>
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Sana"><input type="date" className="erp-input" value={form.rating_date} onChange={(e) => setForm({ ...form, rating_date: e.target.value })} /></Field>
            <Field label="Baho (1-5)"><input type="number" min={1} max={5} className="erp-input" value={form.score} onChange={(e) => setForm({ ...form, score: Number(e.target.value) })} /></Field>
          </div>
          <div className="flex gap-1 justify-center">{[1, 2, 3, 4, 5].map((n) => (
            <button key={n} type="button" onClick={() => setForm({ ...form, score: n })}><Star className={`w-8 h-8 ${n <= form.score ? 'text-amber-500 fill-amber-500' : 'text-muted-foreground'}`} /></button>
          ))}</div>
          <Field label="Izoh"><textarea className="erp-input" rows={2} value={form.comment} onChange={(e) => setForm({ ...form, comment: e.target.value })} /></Field>
          <div className="flex gap-2 pt-2"><PrimaryButton onClick={handleSave} className="flex-1">Saqlash</PrimaryButton><GhostButton onClick={() => setOpenModal(false)}>Bekor</GhostButton></div>
        </div>
      </Modal>
    </div>
  )
}
