'use client'
import { useEffect, useState, useCallback, useMemo } from 'react'
import { motion } from 'framer-motion'
import { apiFetch, formatDate, formatMoney } from '@/lib/client'
import {
  Plus, Trash2, Pencil, Search, Calendar, BookOpen, Star, Award, Percent,
  Wallet, TrendingUp, Bell, KeyRound, AlertTriangle, CheckCircle, FileText, Download,
} from '@/components/icons'
import {
  Card, CardHeader, EmptyState, Modal, PrimaryButton, GhostButton, IconButton,
  PanelLoader, Field, Avatar, Row, StatCard,
} from './panels-common'

const WEEKDAYS = [
  { value: 0, label: 'Dushanba', short: 'Du' },
  { value: 1, label: 'Seshanba', short: 'Se' },
  { value: 2, label: 'Chorshanba', short: 'Ch' },
  { value: 3, label: 'Payshanba', short: 'Pa' },
  { value: 4, label: 'Juma', short: 'Ju' },
  { value: 5, label: 'Shanba', short: 'Sh' },
  { value: 6, label: 'Yakshanba', short: 'Ya' },
]

// ============================================================================
//  DARS JADVALI (Schedule) — haftalik + xona bandligi + bir nechta kun
// ============================================================================
export function SchedulePanel() {
  const [items, setItems] = useState<any[]>([])
  const [groups, setGroups] = useState<any[]>([])
  const [teachers, setTeachers] = useState<any[]>([])
  const [rooms, setRooms] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [openModal, setOpenModal] = useState(false)
  const [openRoomsModal, setOpenRoomsModal] = useState(false)
  // Yangi format: slots array (har bir kun uchun alohida vaqt)
  const [form, setForm] = useState<any>({ group_id: '', room_id: '', teacher_id: '', slots: [{ weekday: 0, start_time: '14:00', end_time: '16:00' }] })
  const [roomForm, setRoomForm] = useState<any>({ name: '', capacity: 20, notes: '' })
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const [s, g, t, r] = await Promise.all([apiFetch('/api/schedule'), apiFetch('/api/groups'), apiFetch('/api/teachers'), apiFetch('/api/rooms')])
    if (s.ok) setItems(s.data?.schedule || [])
    if (g.ok) setGroups(g.data?.groups || [])
    if (t.ok) setTeachers(t.data?.teachers || [])
    if (r.ok) setRooms(r.data?.rooms || [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  // === Slot boshqaruvi funksiyalari ===
  function addSlot() {
    setForm({ ...form, slots: [...form.slots, { weekday: 0, start_time: '14:00', end_time: '16:00' }] })
  }
  function removeSlot(idx: number) {
    if (form.slots.length === 1) return alert('Kamida bitta kun bo\'lishi kerak.')
    setForm({ ...form, slots: form.slots.filter((_: any, i: number) => i !== idx) })
  }
  function updateSlot(idx: number, field: string, value: any) {
    const newSlots = [...form.slots]
    newSlots[idx] = { ...newSlots[idx], [field]: value }
    setForm({ ...form, slots: newSlots })
  }
  // Bir xil kun takrorlanmasligi uchun tekshiruv
  function isWeekdayTaken(weekday: number, currentIdx: number): boolean {
    return form.slots.some((s: any, i: number) => i !== currentIdx && s.weekday === weekday)
  }

  async function handleSave() {
    if (!form.group_id) return alert('Guruhni tanlang.')
    if (form.slots.length === 0) return alert('Kamida bitta kun qo\'shing.')

    // Takrorlanadigan kunlar borligini tekshirish
    const weekdays = form.slots.map((s: any) => s.weekday)
    const duplicates = weekdays.filter((w: number, i: number) => weekdays.indexOf(w) !== i)
    if (duplicates.length > 0) {
      const names = duplicates.map((w: number) => WEEKDAYS.find((d) => d.value === w)?.label).join(', ')
      return alert(`Takrorlanadigan kunlar bor: ${names}. Har bir kun faqat bir marta tanlanishi kerak.`)
    }

    setSaving(true)
    const { ok, error } = await apiFetch('/api/schedule', {
      method: 'POST',
      body: JSON.stringify({
        group_id: form.group_id,
        room_id: form.room_id || null,
        teacher_id: form.teacher_id || null,
        slots: form.slots,
      }),
    })
    setSaving(false)
    if (!ok) return alert(error)

    alert(`${form.slots.length} ta dars muvaffaqiyatli qo'shildi!`)
    setOpenModal(false)
    setForm({ group_id: '', room_id: '', teacher_id: '', slots: [{ weekday: 0, start_time: '14:00', end_time: '16:00' }] })
    load()
  }
  async function handleDelete(id: string) { if (!confirm('O\'chirmoqchimisiz?')) return; const { ok, error } = await apiFetch(`/api/schedule?id=${id}`, { method: 'DELETE' }); if (!ok) return alert(error); load() }

  async function handleSaveRoom() {
    const { ok, error } = await apiFetch('/api/rooms', { method: 'POST', body: JSON.stringify(roomForm) })
    if (!ok) return alert(error)
    setOpenRoomsModal(false)
    setRoomForm({ name: '', capacity: 20, notes: '' })
    load()
  }
  async function handleDeleteRoom(id: string) { if (!confirm('Xonani o\'chirmoqchimisiz?')) return; const { ok, error } = await apiFetch(`/api/rooms?id=${id}`, { method: 'DELETE' }); if (!ok) return alert(error); load() }

  // Haftalik jadval — kunlar bo'yicha guruhlash
  const byDay = useMemo(() => {
    const m: Record<number, any[]> = {}
    WEEKDAYS.forEach((d) => (m[d.value] = []))
    items.forEach((s) => { if (m[s.weekday]) m[s.weekday].push(s) })
    Object.values(m).forEach((arr) => arr.sort((a, b) => a.start_time.localeCompare(b.start_time)))
    return m
  }, [items])

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="text-2xl lg:text-3xl font-bold">Dars jadvali</h1><p className="text-muted-foreground text-sm mt-1">{items.length} dars • {rooms.length} xona</p></div>
        <div className="flex gap-2">
          <GhostButton onClick={() => setOpenRoomsModal(true)}><Plus className="w-4 h-4" /> Xona</GhostButton>
          <PrimaryButton onClick={() => { setForm({ group_id: '', room_id: '', teacher_id: '', slots: [{ weekday: 0, start_time: '14:00', end_time: '16:00' }] }); setOpenModal(true) }}><Plus className="w-4 h-4" /> Yangi dars</PrimaryButton>
        </div>
      </div>

      {/* Xonalar ro'yxati */}
      {rooms.length > 0 && (
        <Card>
          <CardHeader title="Xonalar" subtitle={`${rooms.length} ta`} />
          <div className="p-4 pt-0 flex flex-wrap gap-2">
            {rooms.map((r) => (
              <div key={r.id} className="px-3 py-2 rounded-lg bg-muted/40 flex items-center gap-2">
                <span className="text-sm font-medium">{r.name}</span>
                <span className="text-[10px] text-muted-foreground">({r.capacity} o'rin)</span>
                <IconButton danger onClick={() => handleDeleteRoom(r.id)}><Trash2 className="w-3 h-3" /></IconButton>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Haftalik jadval */}
      {loading ? <PanelLoader /> : items.length === 0 && rooms.length === 0 ? <Card><EmptyState title="Jadval bo'sh" description="Avval xona yarating, so'ng dars qo'shing." /></Card> : (
        <div className="grid lg:grid-cols-7 gap-3">
          {WEEKDAYS.map((day) => (
            <Card key={day.value}>
              <CardHeader title={day.short} subtitle={`${byDay[day.value].length} dars`} />
              <div className="p-3 pt-2 space-y-2 min-h-[100px]">
                {byDay[day.value].length === 0 ? (
                  <div className="text-[10px] text-muted-foreground text-center py-3">Bo'sh</div>
                ) : byDay[day.value].map((s) => (
                  <motion.div key={s.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-2 rounded-lg bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-100">
                    <div className="text-[11px] font-bold text-emerald-700">{s.start_time?.slice(0, 5)} - {s.end_time?.slice(0, 5)}</div>
                    <div className="text-xs font-semibold mt-0.5 truncate">{s.group?.name || '—'}</div>
                    <div className="text-[10px] text-muted-foreground truncate">{s.teacher?.full_name || '—'}</div>
                    {s.room?.name && <div className="text-[10px] text-violet-600 truncate">📍 {s.room.name}</div>}
                    <div className="flex justify-end mt-1"><IconButton danger onClick={() => handleDelete(s.id)}><Trash2 className="w-3 h-3" /></IconButton></div>
                  </motion.div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* === Yangi modal: bir nechta kun tanlash bilan === */}
      <Modal open={openModal} onClose={() => { if (!saving) setOpenModal(false) }} title="Yangi dars qo'shish" size="lg">
        <div className="space-y-4">
          {/* Guruh, o'qituvchi, xona */}
          <Field label="Guruh *">
            <select className="erp-input" value={form.group_id} onChange={(e) => setForm({ ...form, group_id: e.target.value })}>
              <option value="">— Tanlang —</option>
              {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </Field>
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="O'qituvchi">
              <select className="erp-input" value={form.teacher_id} onChange={(e) => setForm({ ...form, teacher_id: e.target.value })}>
                <option value="">— Tanlang —</option>
                {teachers.map((t) => <option key={t.id} value={t.id}>{t.full_name}</option>)}
              </select>
            </Field>
            <Field label="Xona">
              <select className="erp-input" value={form.room_id} onChange={(e) => setForm({ ...form, room_id: e.target.value })}>
                <option value="">— Tanlang —</option>
                {rooms.map((r) => <option key={r.id} value={r.id}>{r.name} ({r.capacity} o'rin)</option>)}
              </select>
            </Field>
          </div>

          {/* Dars kunlari va vaqtlari — bir nechta qo'shish mumkin */}
          <div className="rounded-xl border border-border/50 p-3 bg-muted/20">
            <div className="flex items-center justify-between mb-2">
              <div>
                <div className="text-sm font-semibold">Dars kunlari va vaqtlari *</div>
                <div className="text-[11px] text-muted-foreground">Bir nechta kun qo'shing — har biri uchun alohida vaqt</div>
              </div>
              <button
                type="button"
                onClick={addSlot}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold border border-emerald-200"
              >
                <Plus className="w-3.5 h-3.5" /> Kun qo'shish
              </button>
            </div>

            <div className="space-y-2">
              {form.slots.map((slot: any, idx: number) => {
                const isTaken = isWeekdayTaken(slot.weekday, idx)
                return (
                  <div key={idx} className="flex gap-2 items-end flex-wrap bg-card p-2 rounded-lg border border-border/40">
                    <div className="flex-1 min-w-[140px]">
                      <label className="text-[10px] text-muted-foreground block mb-1">Hafta kuni</label>
                      <select
                        className={`erp-input text-sm ${isTaken ? 'border-red-400 bg-red-50' : ''}`}
                        value={slot.weekday}
                        onChange={(e) => updateSlot(idx, 'weekday', Number(e.target.value))}
                      >
                        {WEEKDAYS.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
                      </select>
                      {isTaken && <div className="text-[10px] text-red-600 mt-0.5">Bu kun allaqachon tanlangan!</div>}
                    </div>
                    <div className="min-w-[100px]">
                      <label className="text-[10px] text-muted-foreground block mb-1">Boshlanish</label>
                      <input type="time" className="erp-input text-sm" value={slot.start_time} onChange={(e) => updateSlot(idx, 'start_time', e.target.value)} />
                    </div>
                    <div className="min-w-[100px]">
                      <label className="text-[10px] text-muted-foreground block mb-1">Tugash</label>
                      <input type="time" className="erp-input text-sm" value={slot.end_time} onChange={(e) => updateSlot(idx, 'end_time', e.target.value)} />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeSlot(idx)}
                      title="Bu kuni o'chirish"
                      className="p-2 rounded-lg bg-red-50 hover:bg-red-100 text-red-600"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )
              })}
            </div>

            {/* Tezkor tugmalar — tipik hafta sxemalari */}
            <div className="mt-3 pt-3 border-t border-border/40">
              <div className="text-[11px] text-muted-foreground mb-2">Tezkor sxemalar:</div>
              <div className="flex gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => setForm({ ...form, slots: [
                    { weekday: 0, start_time: '14:00', end_time: '16:00' },
                    { weekday: 2, start_time: '14:00', end_time: '16:00' },
                    { weekday: 4, start_time: '14:00', end_time: '16:00' },
                  ] })}
                  className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-[11px] font-semibold border border-blue-200"
                >
                  Du-Chor-Juma (toq)
                </button>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, slots: [
                    { weekday: 1, start_time: '14:00', end_time: '16:00' },
                    { weekday: 3, start_time: '14:00', end_time: '16:00' },
                    { weekday: 5, start_time: '14:00', end_time: '16:00' },
                  ] })}
                  className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[11px] font-semibold border border-emerald-200"
                >
                  Se-Pay-Shan (juft)
                </button>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, slots: [
                    { weekday: 0, start_time: '09:00', end_time: '11:00' },
                    { weekday: 1, start_time: '09:00', end_time: '11:00' },
                    { weekday: 2, start_time: '09:00', end_time: '11:00' },
                    { weekday: 3, start_time: '09:00', end_time: '11:00' },
                    { weekday: 4, start_time: '09:00', end_time: '11:00' },
                  ] })}
                  className="px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 text-[11px] font-semibold border border-amber-200"
                >
                  Har kuni (5 kun)
                </button>
              </div>
            </div>
          </div>

          <p className="text-xs text-muted-foreground">⚠ Xona yoki o'qituvchi band bo'lsa, tizim avtomatik ogohlantiradi.</p>
          <div className="flex gap-2 pt-2">
            <PrimaryButton onClick={handleSave} className="flex-1" disabled={saving}>
              {saving ? (
                <span className="flex items-center gap-2 justify-center">
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>
                  Saqlanmoqda...
                </span>
              ) : `Saqlash (${form.slots.length} ta dars)`}
            </PrimaryButton>
            <GhostButton onClick={() => setOpenModal(false)} disabled={saving}>Bekor</GhostButton>
          </div>
        </div>
      </Modal>

      <Modal open={openRoomsModal} onClose={() => setOpenRoomsModal(false)} title="Yangi xona">
        <div className="space-y-3">
          <Field label="Xona nomi *"><input className="erp-input" value={roomForm.name} onChange={(e) => setRoomForm({ ...roomForm, name: e.target.value })} placeholder="1-xona, A-zal..." /></Field>
          <Field label="Sig'im (o'rin)"><input type="number" className="erp-input" value={roomForm.capacity} onChange={(e) => setRoomForm({ ...roomForm, capacity: Number(e.target.value) })} /></Field>
          <Field label="Izoh"><input className="erp-input" value={roomForm.notes} onChange={(e) => setRoomForm({ ...roomForm, notes: e.target.value })} /></Field>
          <div className="flex gap-2 pt-2"><PrimaryButton onClick={handleSaveRoom} className="flex-1">Saqlash</PrimaryButton><GhostButton onClick={() => setOpenRoomsModal(false)}>Bekor</GhostButton></div>
        </div>
      </Modal>
    </div>
  )
}

// ============================================================================
//  IMTIHONLAR (Exams)
// ============================================================================
export function ExamsPanel() {
  const [items, setItems] = useState<any[]>([])
  const [groups, setGroups] = useState<any[]>([])
  const [courses, setCourses] = useState<any[]>([])
  const [students, setStudents] = useState<any[]>([])
  const [grades, setGrades] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [openModal, setOpenModal] = useState(false)
  const [openGrades, setOpenGrades] = useState<any>(null)
  const [form, setForm] = useState<any>({ title: '', description: '', exam_date: new Date().toISOString().slice(0, 10), max_score: 100, group_id: '', course_id: '' })
  const [gradeValues, setGradeValues] = useState<Record<string, any>>({})

  const load = useCallback(async () => {
    setLoading(true)
    const [e, g, c, s, gr] = await Promise.all([apiFetch('/api/exams'), apiFetch('/api/groups'), apiFetch('/api/courses'), apiFetch('/api/students'), apiFetch('/api/grades')])
    if (e.ok) setItems(e.data?.exams || [])
    if (g.ok) setGroups(g.data?.groups || [])
    if (c.ok) setCourses(c.data?.courses || [])
    if (s.ok) setStudents(s.data?.students || [])
    if (gr.ok) setGrades(gr.data?.grades || [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function handleSave() {
    const { ok, error } = await apiFetch('/api/exams', { method: 'POST', body: JSON.stringify(form) })
    if (!ok) return alert(error)
    setOpenModal(false)
    setForm({ title: '', description: '', exam_date: new Date().toISOString().slice(0, 10), max_score: 100, group_id: '', course_id: '' })
    load()
  }
  async function handleDelete(id: string) { if (!confirm('Imtihon va uning baholari o\'chiriladi. Davom etasizmi?')) return; const { ok, error } = await apiFetch(`/api/exams?id=${id}`, { method: 'DELETE' }); if (!ok) return alert(error); load() }

  function openGradeModal(exam: any) {
    setOpenGrades(exam)
    // Guruh talabalari
    const sts = exam.group_id ? students.filter((s) => s.group_id === exam.group_id) : students
    const init: Record<string, any> = {}
    sts.forEach((s) => {
      const existing = grades.find((g) => g.exam_id === exam.id && g.student_id === s.id)
      init[s.id] = { score: existing?.score || 0, comment: existing?.comment || '' }
    })
    setGradeValues(init)
  }

  async function saveGrades() {
    const records = Object.entries(gradeValues).map(([sid, v]: any) => ({
      exam_id: openGrades.id, student_id: sid, score: Number(v.score) || 0, comment: v.comment || null,
    }))
    if (records.length === 0) return alert('Talabalar yo\'q')
    const { ok, error } = await apiFetch('/api/grades', { method: 'POST', body: JSON.stringify({ records }) })
    if (!ok) return alert(error)
    alert('Baholar saqlandi!')
    setOpenGrades(null)
    load()
  }

  const groupStudents = useMemo(() => {
    if (!openGrades) return []
    return openGrades.group_id ? students.filter((s) => s.group_id === openGrades.group_id) : students
  }, [openGrades, students])

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="text-2xl lg:text-3xl font-bold">Imtihonlar</h1><p className="text-muted-foreground text-sm mt-1">{items.length} imtihon</p></div>
        <PrimaryButton onClick={() => setOpenModal(true)}><Plus className="w-4 h-4" /> Yangi imtihon</PrimaryButton>
      </div>

      {loading ? <PanelLoader /> : items.length === 0 ? <Card><EmptyState title="Imtihonlar yo'q" description="Birinchi imtihonni yarating." /></Card> : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((e) => {
            const examGrades = grades.filter((g) => g.exam_id === e.id)
            const avg = examGrades.length > 0 ? examGrades.reduce((s, g) => s + Number(g.score), 0) / examGrades.length / Number(e.max_score) * 100 : 0
            return (
              <Card key={e.id}>
                <div className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3"><Avatar name={e.title} color="violet" /><div><div className="font-semibold">{e.title}</div><div className="text-xs text-muted-foreground">{formatDate(e.exam_date)} • Max: {e.max_score}</div></div></div>
                    <div className="flex gap-1">
                      <IconButton title="Baholar" onClick={() => openGradeModal(e)}><Pencil className="w-3.5 h-3.5" /></IconButton>
                      <IconButton title="O'chirish" danger onClick={() => handleDelete(e.id)}><Trash2 className="w-3.5 h-3.5" /></IconButton>
                    </div>
                  </div>
                  <div className="mt-3 space-y-1.5 text-xs">
                    {e.group && <Row label="Guruh" value={e.group.name} />}
                    {e.course && <Row label="Kurs" value={e.course.name} />}
                    <Row label="Baholangan" value={`${examGrades.length} talaba`} />
                  </div>
                  {examGrades.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-border/40">
                      <div className="text-xs text-muted-foreground mb-1">O'rtacha natija</div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden"><div className="h-full bg-gradient-to-r from-emerald-500 to-teal-500" style={{ width: `${avg}%` }} /></div>
                      <div className="text-right text-xs font-bold mt-1 text-emerald-600">{avg.toFixed(1)}%</div>
                    </div>
                  )}
                </div>
              </Card>
            )
          })}
        </div>
      )}

      <Modal open={openModal} onClose={() => setOpenModal(false)} title="Yangi imtihon">
        <div className="space-y-3">
          <Field label="Imtihon nomi *"><input className="erp-input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="1-chorak imtihoni" /></Field>
          <Field label="Tavsif"><textarea className="erp-input" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Sana *"><input type="date" className="erp-input" value={form.exam_date} onChange={(e) => setForm({ ...form, exam_date: e.target.value })} /></Field>
            <Field label="Max ball"><input type="number" className="erp-input" value={form.max_score} onChange={(e) => setForm({ ...form, max_score: Number(e.target.value) })} /></Field>
          </div>
          <Field label="Guruh"><select className="erp-input" value={form.group_id} onChange={(e) => setForm({ ...form, group_id: e.target.value })}><option value="">— Tanlang —</option>{groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}</select></Field>
          <Field label="Kurs"><select className="erp-input" value={form.course_id} onChange={(e) => setForm({ ...form, course_id: e.target.value })}><option value="">— Tanlang —</option>{courses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>
          <div className="flex gap-2 pt-2"><PrimaryButton onClick={handleSave} className="flex-1">Saqlash</PrimaryButton><GhostButton onClick={() => setOpenModal(false)}>Bekor</GhostButton></div>
        </div>
      </Modal>

      <Modal open={!!openGrades} onClose={() => setOpenGrades(null)} title={`Baholar: ${openGrades?.title || ''}`} size="lg">
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {groupStudents.length === 0 ? <div className="text-sm text-muted-foreground text-center py-4">Bu guruhda talabalar yo'q</div> : groupStudents.map((s) => (
            <div key={s.id} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-muted/40">
              <Avatar name={s.full_name} />
              <div className="flex-1 min-w-0"><div className="text-sm font-medium truncate">{s.full_name}</div></div>
              <input type="number" min={0} max={openGrades?.max_score || 100} className="w-20 px-2 py-1 rounded-lg border border-border text-sm text-center" value={gradeValues[s.id]?.score || 0} onChange={(e) => setGradeValues({ ...gradeValues, [s.id]: { ...gradeValues[s.id], score: e.target.value } })} placeholder="Ball" />
              <span className="text-xs text-muted-foreground">/ {openGrades?.max_score}</span>
            </div>
          ))}
        </div>
        <div className="flex gap-2 pt-4"><PrimaryButton onClick={saveGrades} className="flex-1">Baholarni saqlash</PrimaryButton><GhostButton onClick={() => setOpenGrades(null)}>Yopish</GhostButton></div>
      </Modal>
    </div>
  )
}

// ============================================================================
//  SERTIFIKATLAR (Certificates)
// ============================================================================
export function CertificatesPanel() {
  const [items, setItems] = useState<any[]>([])
  const [students, setStudents] = useState<any[]>([])
  const [courses, setCourses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [openModal, setOpenModal] = useState(false)
  const [form, setForm] = useState<any>({ student_id: '', course_id: '', issue_date: new Date().toISOString().slice(0, 10), notes: '' })
  const [copied, setCopied] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const [c, s, cs] = await Promise.all([apiFetch('/api/certificates'), apiFetch('/api/students'), apiFetch('/api/courses')])
    if (c.ok) setItems(c.data?.certificates || [])
    if (s.ok) setStudents(s.data?.students || [])
    if (cs.ok) setCourses(cs.data?.courses || [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function handleSave() {
    if (!form.student_id) return alert('Talaba tanlang')
    const { ok, error } = await apiFetch('/api/certificates', { method: 'POST', body: JSON.stringify(form) })
    if (!ok) return alert(error)
    setOpenModal(false)
    setForm({ student_id: '', course_id: '', issue_date: new Date().toISOString().slice(0, 10), notes: '' })
    load()
  }
  async function handleDelete(id: string) { if (!confirm('O\'chirmoqchimisiz?')) return; const { ok, error } = await apiFetch(`/api/certificates?id=${id}`, { method: 'DELETE' }); if (!ok) return alert(error); load() }

  function copyNum(num: string) { navigator.clipboard.writeText(num); setCopied(num); setTimeout(() => setCopied(null), 1500) }
  function printCert(c: any) {
    const w = window.open('', '_blank', 'width=800,height=600')
    if (!w) return alert('Popup bloklangan')
    w.document.write(`
      <html><head><title>Sertifikat ${c.certificate_number}</title>
      <style>
        body { font-family: Georgia, serif; margin: 0; padding: 40px; background: #f5f5f5; }
        .cert { background: white; padding: 60px; border: 8px double #10b981; max-width: 700px; margin: 0 auto; text-align: center; }
        h1 { color: #047857; font-size: 36px; margin: 0 0 8px; letter-spacing: 4px; }
        .sub { color: #6b7280; font-size: 14px; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 40px; }
        .name { font-size: 32px; margin: 30px 0; color: #1f2937; }
        .text { font-size: 16px; color: #4b5563; line-height: 1.6; margin: 20px 0; }
        .num { font-family: monospace; font-size: 14px; color: #6b7280; margin-top: 30px; }
        .date { font-size: 14px; color: #6b7280; margin-top: 20px; }
        .seal { font-size: 60px; margin: 20px 0; }
      </style></head>
      <body><div class="cert">
        <div class="seal">🏆</div>
        <h1>SERTIFIKAT</h1>
        <div class="sub">O'quv Markazi</div>
        <div class="text">Bu sertifikat bilan tasdiqlanadiki,</div>
        <div class="name">${c.student?.full_name || ''}</div>
        <div class="text">${c.course?.name ? `"${c.course.name}" kursini" muvaffaqiyatli tamomladi` : 'kursini muvaffaqiyatli tamomladi'}</div>
        <div class="num">Sertifikat №: ${c.certificate_number}</div>
        <div class="date">Berilgan sana: ${formatDate(c.issue_date)}</div>
      </div>
      <script>window.print()</script>
      </body></html>
    `)
    w.document.close()
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="text-2xl lg:text-3xl font-bold">Sertifikatlar</h1><p className="text-muted-foreground text-sm mt-1">{items.length} sertifikat</p></div>
        <PrimaryButton onClick={() => setOpenModal(true)}><Plus className="w-4 h-4" /> Yangi sertifikat</PrimaryButton>
      </div>

      {loading ? <PanelLoader /> : items.length === 0 ? <Card><EmptyState title="Sertifikatlar yo'q" description="Bitiruvchilarga sertifikat bering." /></Card> : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((c) => (
            <Card key={c.id}>
              <div className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-600 flex items-center justify-center text-white"><Award className="w-6 h-6" /></div><div><div className="font-semibold truncate">{c.student?.full_name || '—'}</div><div className="text-xs text-muted-foreground truncate">{c.course?.name || '—'}</div></div></div>
                  <div className="flex gap-1">
                    <IconButton title="Chop etish" onClick={() => printCert(c)}><FileText className="w-3.5 h-3.5" /></IconButton>
                    <IconButton title="O'chirish" danger onClick={() => handleDelete(c.id)}><Trash2 className="w-3.5 h-3.5" /></IconButton>
                  </div>
                </div>
                <div className="mt-3 p-2 rounded-lg bg-amber-50 border border-amber-100">
                  <div className="text-[10px] text-amber-700 font-medium">SERTIFIKAT RAQAMI</div>
                  <div className="font-mono text-xs font-bold tracking-wider text-amber-900">{c.certificate_number}</div>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground">{formatDate(c.issue_date)}</span>
                  <button onClick={() => copyNum(c.certificate_number)} className="text-[10px] text-emerald-600 hover:underline flex items-center gap-1">{copied === c.certificate_number ? <><CheckCircle className="w-3 h-3" /> Nusxalandi</> : <><FileText className="w-3 h-3" /> Nusxa</>}</button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={openModal} onClose={() => setOpenModal(false)} title="Yangi sertifikat">
        <div className="space-y-3">
          <Field label="Talaba *"><select className="erp-input" value={form.student_id} onChange={(e) => setForm({ ...form, student_id: e.target.value })}><option value="">— Tanlang —</option>{students.map((s) => <option key={s.id} value={s.id}>{s.full_name}</option>)}</select></Field>
          <Field label="Kurs"><select className="erp-input" value={form.course_id} onChange={(e) => setForm({ ...form, course_id: e.target.value })}><option value="">— Tanlang —</option>{courses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>
          <Field label="Berilish sanasi"><input type="date" className="erp-input" value={form.issue_date} onChange={(e) => setForm({ ...form, issue_date: e.target.value })} /></Field>
          <Field label="Izoh"><input className="erp-input" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field>
          <p className="text-xs text-muted-foreground">Sertifikat raqami avtomatik generatsiya qilinadi.</p>
          <div className="flex gap-2 pt-2"><PrimaryButton onClick={handleSave} className="flex-1">Saqlash</PrimaryButton><GhostButton onClick={() => setOpenModal(false)}>Bekor</GhostButton></div>
        </div>
      </Modal>
    </div>
  )
}

// ============================================================================
//  CHEGIRMALAR (Discounts)
// ============================================================================
export function DiscountsPanel() {
  const [items, setItems] = useState<any[]>([])
  const [courses, setCourses] = useState<any[]>([])
  const [students, setStudents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [openModal, setOpenModal] = useState(false)
  const [form, setForm] = useState<any>({ name: '', discount_type: 'percent', value: 10, valid_from: '', valid_until: '', applies_to: 'all', course_id: '', student_id: '', is_active: true })

  const load = useCallback(async () => {
    setLoading(true)
    const [d, c, s] = await Promise.all([apiFetch('/api/discounts'), apiFetch('/api/courses'), apiFetch('/api/students')])
    if (d.ok) setItems(d.data?.discounts || [])
    if (c.ok) setCourses(c.data?.courses || [])
    if (s.ok) setStudents(s.data?.students || [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function handleSave() {
    const { ok, error } = await apiFetch('/api/discounts', { method: 'POST', body: JSON.stringify(form) })
    if (!ok) return alert(error)
    setOpenModal(false)
    setForm({ name: '', discount_type: 'percent', value: 10, valid_from: '', valid_until: '', applies_to: 'all', course_id: '', student_id: '', is_active: true })
    load()
  }
  async function toggleActive(d: any) { const { ok, error } = await apiFetch('/api/discounts', { method: 'PUT', body: JSON.stringify({ id: d.id, is_active: !d.is_active }) }); if (!ok) return alert(error); load() }
  async function handleDelete(id: string) { if (!confirm('O\'chirmoqchimisiz?')) return; const { ok, error } = await apiFetch(`/api/discounts?id=${id}`, { method: 'DELETE' }); if (!ok) return alert(error); load() }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="text-2xl lg:text-3xl font-bold">Chegirmalar</h1><p className="text-muted-foreground text-sm mt-1">{items.length} chegirma • {items.filter((d) => d.is_active).length} aktiv</p></div>
        <PrimaryButton onClick={() => setOpenModal(true)}><Plus className="w-4 h-4" /> Yangi chegirma</PrimaryButton>
      </div>

      {loading ? <PanelLoader /> : items.length === 0 ? <Card><EmptyState title="Chegirmalar yo'q" description="Aksiyalar va chegirmalar yarating." /></Card> : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((d) => (
            <Card key={d.id}>
              <div className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center text-white"><Percent className="w-5 h-5" /></div><div><div className="font-semibold">{d.name}</div><div className="text-xs text-muted-foreground">{d.discount_type === 'percent' ? `${d.value}%` : formatMoney(d.value)}</div></div></div>
                  <div className="flex gap-1">
                    <IconButton title={d.is_active ? 'O\'chirish' : 'Yoqish'} onClick={() => toggleActive(d)}><CheckCircle className={`w-3.5 h-3.5 ${d.is_active ? 'text-emerald-500' : 'text-muted-foreground'}`} /></IconButton>
                    <IconButton title="O'chirish" danger onClick={() => handleDelete(d.id)}><Trash2 className="w-3.5 h-3.5" /></IconButton>
                  </div>
                </div>
                <div className="mt-3 space-y-1.5 text-xs">
                  <Row label="Qo'llanish" value={d.applies_to === 'all' ? 'Hammaga' : d.applies_to === 'course' ? `Kurs: ${d.course?.name || '—'}` : `Talaba: ${d.student?.full_name || '—'}`} />
                  {d.valid_until && <Row label="Muddat" value={formatDate(d.valid_until)} />}
                </div>
                <div className="mt-3 pt-3 border-t border-border/40">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${d.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'}`}>{d.is_active ? 'Aktiv' : 'Nofaol'}</span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={openModal} onClose={() => setOpenModal(false)} title="Yangi chegirma">
        <div className="space-y-3">
          <Field label="Nomi *"><input className="erp-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Yozgi aksiya, Oilaviy chegirma..." /></Field>
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Turi"><select className="erp-input" value={form.discount_type} onChange={(e) => setForm({ ...form, discount_type: e.target.value })}><option value="percent">Foiz (%)</option><option value="fixed">Summa (so'm)</option></select></Field>
            <Field label="Qiymat"><input type="number" className="erp-input" value={form.value} onChange={(e) => setForm({ ...form, value: Number(e.target.value) })} /></Field>
          </div>
          <Field label="Qo'llanish doirasi"><select className="erp-input" value={form.applies_to} onChange={(e) => setForm({ ...form, applies_to: e.target.value, course_id: '', student_id: '' })}><option value="all">Hammaga</option><option value="course">Aniq kursga</option><option value="student">Aniq talabaga</option></select></Field>
          {form.applies_to === 'course' && <Field label="Kurs"><select className="erp-input" value={form.course_id} onChange={(e) => setForm({ ...form, course_id: e.target.value })}><option value="">— Tanlang —</option>{courses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>}
          {form.applies_to === 'student' && <Field label="Talaba"><select className="erp-input" value={form.student_id} onChange={(e) => setForm({ ...form, student_id: e.target.value })}><option value="">— Tanlang —</option>{students.map((s) => <option key={s.id} value={s.id}>{s.full_name}</option>)}</select></Field>}
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Boshlanish"><input type="date" className="erp-input" value={form.valid_from} onChange={(e) => setForm({ ...form, valid_from: e.target.value })} /></Field>
            <Field label="Tugash"><input type="date" className="erp-input" value={form.valid_until} onChange={(e) => setForm({ ...form, valid_until: e.target.value })} /></Field>
          </div>
          <div className="flex gap-2 pt-2"><PrimaryButton onClick={handleSave} className="flex-1">Saqlash</PrimaryButton><GhostButton onClick={() => setOpenModal(false)}>Bekor</GhostButton></div>
        </div>
      </Modal>
    </div>
  )
}

// ============================================================================
//  TALABA QARZLARI (Debts) — avtomatik hisob (To'lovlar bilan bir xil)
// ============================================================================
export function DebtsPanel() {
  const [balances, setBalances] = useState<any[]>([])
  const [totals, setTotals] = useState<any>(null)
  const [courses, setCourses] = useState<any[]>([])
  const [groups, setGroups] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Filtrlar
  const [courseFilter, setCourseFilter] = useState('all')
  const [groupFilter, setGroupFilter] = useState('all')
  const [search, setSearch] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const [b, c, g] = await Promise.all([
      apiFetch('/api/payments/balances'),
      apiFetch('/api/courses'),
      apiFetch('/api/groups'),
    ])
    if (b.ok && b.data) {
      setBalances(b.data.balances || [])
      setTotals(b.data.totals || null)
    }
    if (c.ok) setCourses(c.data?.courses || [])
    if (g.ok) setGroups(g.data?.groups || [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  // Filtrlangan guruhlar (kurs bo'yicha)
  const filteredGroups = useMemo(
    () => courseFilter === 'all' ? groups : groups.filter((g) => g.course_id === courseFilter),
    [groups, courseFilter]
  )

  // FAQAT QARZDOR talabalar ko'rinadi (remaining > 0)
  const filtered = useMemo(() => {
    return balances.filter((b) => {
      if (b.remaining <= 0) return false // faqat qarzdorlar
      if (search) {
        const name = (b.full_name || '').toLowerCase()
        const phone = (b.phone || '').toLowerCase()
        if (!name.includes(search.toLowerCase()) && !phone.includes(search.toLowerCase())) return false
      }
      if (courseFilter !== 'all' && b.course_id !== courseFilter) return false
      if (groupFilter !== 'all' && b.group_id !== groupFilter) return false
      return true
    })
  }, [balances, search, courseFilter, groupFilter])

  // Filtrlangan qarzdorlar umumiy summasi
  const filteredTotalDebt = filtered.reduce((s, b) => s + Math.max(0, b.remaining), 0)

  function exportCSV() {
    if (filtered.length === 0) return alert('Eksport qilish uchun ma\'lumot yo\'q')
    const headers = ['#', 'Talaba', 'Telefon', 'Kurs', 'Guruh', 'Qabul sanasi', 'Oylik to\'lov', 'O\'tgan oylar', 'To\'lash kerak', 'To\'langan', 'Qarz']
    const rows = filtered.map((b, idx) => [
      idx + 1,
      b.full_name,
      b.phone || '',
      b.course_name || '',
      b.group_name || '',
      b.enrollment_date || '',
      b.monthly_fee,
      b.months_enrolled,
      b.total_due,
      b.total_paid,
      Math.max(0, b.remaining),
    ])
    const csv = [headers, ...rows].map((r) => r.map((c: any) => `"${c}"`).join(',')).join('\n')
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `qarzlar-${new Date().toISOString().slice(0, 10)}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) return <PanelLoader />

  const debtorsCount = balances.filter((b) => b.remaining > 0).length

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold">Talaba qarzlari</h1>
          <p className="text-muted-foreground text-sm mt-1">Avtomatik hisob-kitob — {debtorsCount} qarzdor talaba</p>
        </div>
        <GhostButton onClick={exportCSV}><Download className="w-4 h-4" /> CSV eksport</GhostButton>
      </div>

      {/* === Statistika kartochkalari === */}
      {totals && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Jami talabalar" value={totals.students_count || 0} sub={`${totals.active_students || 0} faol`} icon={Calendar} color="blue" />
          <StatCard label="To'laganlar" value={(totals.students_count || 0) - debtorsCount} sub="to'liq to'lagan" icon={CheckCircle} color="emerald" />
          <StatCard label="Qarzdorlar" value={debtorsCount} sub="qarz bor" icon={AlertTriangle} color="rose" />
          <StatCard label="Umumiy qarz" value={formatMoney(totals.total_remaining || 0)} sub={`To'lash kerak: ${formatMoney(totals.total_due || 0)}`} icon={Wallet} color="amber" />
        </div>
      )}

      {/* === Qizil ogohlantirish (qarzdorlar bor bo'lsa) === */}
      {debtorsCount > 0 && (
        <div className="rounded-xl bg-rose-50 border border-rose-200 p-4 flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <div className="font-semibold text-rose-900">{debtorsCount} ta talaba to'lov qilmagan</div>
            <div className="text-xs text-rose-700 mt-0.5">
              Jami qarz: <strong>{formatMoney(totals?.total_remaining || 0)}</strong> · Avtomatik hisob-kitob: talabaning qabul sanasidan boshlab har oy uchun oylik to'lov (kurs narxi) hisoblanadi.
              To'lov qabul qilish uchun <strong>To'lovlar</strong> bo'limiga o'ting.
            </div>
          </div>
        </div>
      )}

      {/* === Filtrlar === */}
      <div className="flex gap-2 flex-wrap">
        <div className="flex items-center gap-2 px-3 py-2 bg-card rounded-xl border border-border/50 flex-1 min-w-[200px]">
          <svg className="w-4 h-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Ism yoki telefon bo'yicha qidirish..." className="flex-1 bg-transparent outline-none text-sm" />
        </div>
        <select value={courseFilter} onChange={(e) => { setCourseFilter(e.target.value); setGroupFilter('all') }} className="px-3 py-2 rounded-xl border border-border/50 text-sm bg-card">
          <option value="all">Barcha kurslar</option>
          {courses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select value={groupFilter} onChange={(e) => setGroupFilter(e.target.value)} className="px-3 py-2 rounded-xl border border-border/50 text-sm bg-card">
          <option value="all">Barcha guruhlar</option>
          {filteredGroups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
        </select>
      </div>

      {/* === Qarzdor talabalar jadvali === */}
      <Card>
        <CardHeader
          title="Qarzdor talabalar ro'yxati"
          subtitle={`${filtered.length} ta qarzdor · Jami qarz: ${formatMoney(filteredTotalDebt)}`}
        />
        {filtered.length === 0 ? (
          <EmptyState
            title="Qarzdor talabalar yo'q"
            description="Barcha talabalar to'lovlarini to'liq qilgan! 🎉"
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/40 text-xs text-muted-foreground">
                  <th className="text-left px-4 py-3 font-medium">#</th>
                  <th className="text-left px-4 py-3 font-medium">Talaba</th>
                  <th className="text-left px-4 py-3 font-medium">Kurs / Guruh</th>
                  <th className="text-left px-4 py-3 font-medium">Qabul sana</th>
                  <th className="text-right px-4 py-3 font-medium">Oylik</th>
                  <th className="text-center px-4 py-3 font-medium">Oylar</th>
                  <th className="text-right px-4 py-3 font-medium">To'lash kerak</th>
                  <th className="text-right px-4 py-3 font-medium">To'langan</th>
                  <th className="text-right px-4 py-3 font-medium">Qarz</th>
                  <th className="text-center px-4 py-3 font-medium">Holat</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((b, idx) => {
                  // Qarz oylar sonini hisoblaymiz
                  const debtMonths = b.monthly_fee > 0 ? Math.floor(b.remaining / b.monthly_fee) : 0
                  return (
                    <tr key={b.student_id} className="border-b border-border/20 hover:bg-muted/40 bg-rose-50/30">
                      <td className="px-4 py-3 text-muted-foreground text-xs">{idx + 1}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium">{b.full_name}</div>
                        {b.phone && <div className="text-[10px] text-muted-foreground">📞 {b.phone}</div>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-muted-foreground">{b.course_name || '—'}</div>
                        <div className="text-[10px] text-muted-foreground">{b.group_name || '—'}</div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">{formatDate(b.enrollment_date)}</td>
                      <td className="px-4 py-3 text-right font-medium">{formatMoney(b.monthly_fee)}</td>
                      <td className="px-4 py-3 text-center text-muted-foreground">{b.months_enrolled}</td>
                      <td className="px-4 py-3 text-right font-semibold text-amber-600">{formatMoney(b.total_due)}</td>
                      <td className="px-4 py-3 text-right font-semibold text-emerald-600">{formatMoney(b.total_paid)}</td>
                      <td className="px-4 py-3 text-right font-bold text-rose-600">{formatMoney(Math.max(0, b.remaining))}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${debtMonths >= 2 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                          {debtMonths >= 2 ? `${debtMonths} oy qarz` : 'Qarz'}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-border/60 bg-muted/30 font-semibold">
                  <td colSpan={8} className="px-4 py-3 text-right">Jami ({filtered.length} ta qarzdor):</td>
                  <td className="px-4 py-3 text-right text-rose-600">{formatMoney(filteredTotalDebt)}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </Card>

      {/* === Ma'lumot kartochkasi === */}
      <div className="rounded-xl bg-blue-50 border border-blue-200 p-4 text-sm text-blue-800">
        <div className="font-semibold mb-1">ℹ️ Qarz qanday hisoblanadi?</div>
        <ul className="text-xs space-y-1 text-blue-700">
          <li>• Talabaning <strong>qabul sanasidan</strong> boshlab har oy uchun <strong>oylik to'lov</strong> (kurs narxi) avtomatik hisoblanadi</li>
          <li>• Birinchi oy uchun <strong>proportional hisob</strong> (qabul qilingan kunga qarab)</li>
          <li>• <strong>To'lash kerak</strong> = o'tgan oylar soni × oylik to'lov summasi</li>
          <li>• <strong>Qarz</strong> = to'lash kerak − to'langan summa</li>
          <li>• To'lov qabul qilish uchun <strong>To'lovlar</strong> bo'limiga o'ting</li>
          <li>• Bu ro'yxat To'lovlar bo'limidagi avtomatik hisob-kitobga to'liq mos keladi</li>
        </ul>
      </div>
    </div>
  )
}

// ============================================================================
//  O'QITUVCHI MAOSHLARI (Teacher Payouts)
// ============================================================================
export function TeacherPayoutsPanel() {
  const [items, setItems] = useState<any[]>([])
  const [teachers, setTeachers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [openModal, setOpenModal] = useState(false)
  const [statusFilter, setStatusFilter] = useState('all')
  const [form, setForm] = useState<any>({ teacher_id: '', amount: 0, period_month: new Date().toISOString().slice(0, 7), lesson_count: 0, bonus: 0, deduction: 0, status: 'pending', notes: '' })

  const load = useCallback(async () => {
    setLoading(true)
    const [p, t] = await Promise.all([apiFetch(`/api/teacher-payouts?status=${statusFilter}`), apiFetch('/api/teachers')])
    if (p.ok) setItems(p.data?.payouts || [])
    if (t.ok) setTeachers(t.data?.teachers || [])
    setLoading(false)
  }, [statusFilter])

  useEffect(() => { load() }, [load])

  const total = items.reduce((s, p) => s + Number(p.amount || 0) + Number(p.bonus || 0) - Number(p.deduction || 0), 0)
  const paidTotal = items.filter((p) => p.status === 'paid').reduce((s, p) => s + Number(p.amount || 0) + Number(p.bonus || 0) - Number(p.deduction || 0), 0)
  const pendingTotal = total - paidTotal

  async function handleSave() {
    const { ok, error } = await apiFetch('/api/teacher-payouts', { method: 'POST', body: JSON.stringify(form) })
    if (!ok) return alert(error)
    setOpenModal(false)
    setForm({ teacher_id: '', amount: 0, period_month: new Date().toISOString().slice(0, 7), lesson_count: 0, bonus: 0, deduction: 0, status: 'pending', notes: '' })
    load()
  }
  async function markPaid(p: any) { const { ok, error } = await apiFetch('/api/teacher-payouts', { method: 'PUT', body: JSON.stringify({ id: p.id, status: 'paid' }) }); if (!ok) return alert(error); load() }
  async function handleDelete(id: string) { if (!confirm('O\'chirmoqchimisiz?')) return; const { ok, error } = await apiFetch(`/api/teacher-payouts?id=${id}`, { method: 'DELETE' }); if (!ok) return alert(error); load() }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="text-2xl lg:text-3xl font-bold">O'qituvchi maoshlari</h1><p className="text-muted-foreground text-sm mt-1">{items.length} to'lov yozuvi</p></div>
        <PrimaryButton onClick={() => setOpenModal(true)}><Plus className="w-4 h-4" /> Yangi maosh</PrimaryButton>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Jami maosh" value={formatMoney(total)} sub="barchasi" icon={Wallet} color="emerald" />
        <StatCard label="To'langan" value={formatMoney(paidTotal)} sub="tayyor" icon={CheckCircle} color="teal" />
        <StatCard label="Kutilmoqda" value={formatMoney(pendingTotal)} sub="to'lanmagan" icon={AlertTriangle} color="amber" />
      </div>

      <div className="flex gap-2 flex-wrap">
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-2 rounded-xl border border-border/50 text-sm bg-card">
          <option value="all">Barchasi</option><option value="pending">Kutilmoqda</option><option value="paid">To'langan</option>
        </select>
      </div>

      <Card>
        <CardHeader title="Maoshlar tarixi" subtitle={`${items.length} yozuv`} />
        {loading ? <PanelLoader /> : items.length === 0 ? <EmptyState title="Maoshlar yo'q" description="O'qituvchilarga maosh qo'shing." /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-border/40 text-xs text-muted-foreground">
                <th className="text-left px-4 py-3 font-medium">O'qituvchi</th>
                <th className="text-right px-4 py-3 font-medium">Maosh</th>
                <th className="text-right px-4 py-3 font-medium">Bonus</th>
                <th className="text-right px-4 py-3 font-medium">Chegarish</th>
                <th className="text-right px-4 py-3 font-medium">Jami</th>
                <th className="text-left px-4 py-3 font-medium">Oy</th>
                <th className="text-left px-4 py-3 font-medium">Darslar</th>
                <th className="text-center px-4 py-3 font-medium">Holat</th>
                <th className="px-4 py-3"></th>
              </tr></thead>
              <tbody>
                {items.map((p) => {
                  const net = Number(p.amount) + Number(p.bonus) - Number(p.deduction)
                  return (
                    <tr key={p.id} className="border-b border-border/20 hover:bg-muted/40">
                      <td className="px-4 py-3 font-medium">{p.teacher?.full_name || '—'}</td>
                      <td className="px-4 py-3 text-right">{formatMoney(p.amount)}</td>
                      <td className="px-4 py-3 text-right text-emerald-600">+{formatMoney(p.bonus)}</td>
                      <td className="px-4 py-3 text-right text-red-600">-{formatMoney(p.deduction)}</td>
                      <td className="px-4 py-3 text-right font-bold">{formatMoney(net)}</td>
                      <td className="px-4 py-3 text-muted-foreground">{p.period_month}</td>
                      <td className="px-4 py-3 text-center">{p.lesson_count}</td>
                      <td className="px-4 py-3 text-center">{p.status === 'paid' ? <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-700">To'langan</span> : <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-700">Kutilmoqda</span>}</td>
                      <td className="px-4 py-3 text-right"><div className="flex gap-1">{p.status === 'pending' && <IconButton title="To'langan deb belgilash" onClick={() => markPaid(p)}><CheckCircle className="w-3.5 h-3.5 text-emerald-600" /></IconButton>}<IconButton danger onClick={() => handleDelete(p.id)}><Trash2 className="w-3.5 h-3.5" /></IconButton></div></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal open={openModal} onClose={() => setOpenModal(false)} title="Yangi maosh">
        <div className="space-y-3">
          <Field label="O'qituvchi *"><select className="erp-input" value={form.teacher_id} onChange={(e) => setForm({ ...form, teacher_id: e.target.value })}><option value="">— Tanlang —</option>{teachers.map((t) => <option key={t.id} value={t.id}>{t.full_name}</option>)}</select></Field>
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Maosh (so'm) *"><input type="number" className="erp-input" value={form.amount} onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })} /></Field>
            <Field label="Oy (YYYY-MM)"><input type="month" className="erp-input" value={form.period_month} onChange={(e) => setForm({ ...form, period_month: e.target.value })} /></Field>
          </div>
          <div className="grid sm:grid-cols-3 gap-3">
            <Field label="Darslar soni"><input type="number" className="erp-input" value={form.lesson_count} onChange={(e) => setForm({ ...form, lesson_count: Number(e.target.value) })} /></Field>
            <Field label="Bonus"><input type="number" className="erp-input" value={form.bonus} onChange={(e) => setForm({ ...form, bonus: Number(e.target.value) })} /></Field>
            <Field label="Chegarish"><input type="number" className="erp-input" value={form.deduction} onChange={(e) => setForm({ ...form, deduction: Number(e.target.value) })} /></Field>
          </div>
          <Field label="Holat"><select className="erp-input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}><option value="pending">Kutilmoqda</option><option value="paid">To'langan</option></select></Field>
          <Field label="Izoh"><input className="erp-input" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field>
          <div className="flex gap-2 pt-2"><PrimaryButton onClick={handleSave} className="flex-1">Saqlash</PrimaryButton><GhostButton onClick={() => setOpenModal(false)}>Bekor</GhostButton></div>
        </div>
      </Modal>
    </div>
  )
}

// ============================================================================
//  OTA-ONA BILDIRISHNOMALARI (Notifications)
// ============================================================================
export function NotificationsPanel() {
  const [items, setItems] = useState<any[]>([])
  const [students, setStudents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [openModal, setOpenModal] = useState(false)
  const [form, setForm] = useState<any>({ student_id: '', type: 'custom', channel: 'telegram', recipient: '', message: '' })
  const [statusFilter, setStatusFilter] = useState('all')

  const load = useCallback(async () => {
    setLoading(true)
    const [n, s] = await Promise.all([apiFetch(`/api/notifications?status=${statusFilter}`), apiFetch('/api/students')])
    if (n.ok) setItems(n.data?.notifications || [])
    if (s.ok) setStudents(s.data?.students || [])
    setLoading(false)
  }, [statusFilter])

  useEffect(() => { load() }, [load])

  async function handleSave() {
    if (!form.message) return alert('Xabar majburiy')
    const { ok, error } = await apiFetch('/api/notifications', { method: 'POST', body: JSON.stringify(form) })
    if (!ok) return alert(error)
    setOpenModal(false)
    setForm({ student_id: '', type: 'custom', channel: 'telegram', recipient: '', message: '' })
    load()
  }
  async function handleDelete(id: string) { if (!confirm('O\'chirmoqchimisiz?')) return; const { ok, error } = await apiFetch(`/api/notifications?id=${id}`, { method: 'DELETE' }); if (!ok) return alert(error); load() }

  function fillStudent(s: any) {
    setForm({ ...form, student_id: s.id, recipient: s.parent_phone || s.phone || '' })
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="text-2xl lg:text-3xl font-bold">Ota-onaga xabarlar</h1><p className="text-muted-foreground text-sm mt-1">{items.length} xabar</p></div>
        <PrimaryButton onClick={() => setOpenModal(true)}><Plus className="w-4 h-4" /> Yangi xabar</PrimaryButton>
      </div>

      <Card>
        <CardHeader title="Bildirishnomalar tarixi" subtitle="Telegram / SMS orqali yuborilgan" action={<select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-1.5 rounded-lg border border-border/50 text-xs bg-card"><option value="all">Barchasi</option><option value="pending">Kutilmoqda</option><option value="sent">Yuborilgan</option><option value="failed">Xato</option></select>} />
        {loading ? <PanelLoader /> : items.length === 0 ? <EmptyState title="Xabarlar yo'q" description="Ota-onalarga xabar yuboring." /> : (
          <div className="p-4 pt-0 space-y-2 max-h-[500px] overflow-y-auto">
            {items.map((n) => (
              <div key={n.id} className="flex items-start gap-3 px-3 py-2 rounded-lg bg-muted/40">
                <div className={`w-2 h-2 mt-2 rounded-full shrink-0 ${n.status === 'sent' ? 'bg-emerald-500' : n.status === 'failed' ? 'bg-red-500' : 'bg-amber-500'}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium">{n.student?.full_name || '—'}</span>
                    <NotifTypeChip type={n.type} />
                    <span className="text-[10px] text-muted-foreground">{n.channel}</span>
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">{n.message}</div>
                  <div className="text-[10px] text-muted-foreground mt-1">{formatDate(n.created_at)} • {n.recipient || '—'}</div>
                </div>
                <IconButton danger onClick={() => handleDelete(n.id)}><Trash2 className="w-3.5 h-3.5" /></IconButton>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <CardHeader title="Tezkor shablonlar" subtitle="Bir tugma bilan yuborish" />
        <div className="p-4 pt-0 grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {[
            { type: 'absent', label: 'Kelmadi xabari', msg: 'Assalomu alaykum! Farzandingiz bugungi darsga kelmadi. Iltimos, sababini bilib oling.' },
            { type: 'payment_reminder', label: 'To\'lov eslatmasi', msg: 'Assalomu alaykum! Oylik to\'lov muddati yaqinlashmoqda. Iltimos, vaqtida to\'lovni amalga oshiring.' },
            { type: 'payment_received', label: 'To\'lov qabul qilindi', msg: 'Tabriklaymiz! To\'lovingiz qabul qilindi. Rahmat!' },
            { type: 'exam', label: 'Imtihon haqida', msg: 'Diqqat! Ertaga imtihon bo\'lib o\'tadi. Iltimos, farzandingizni tayyorlang.' },
            { type: 'event', label: 'Tadbir haqida', msg: 'Assalomu alaykum! O\'quv markazimizda tadbir bo\'lib o\'tadi. Taklif qilamiz.' },
          ].map((t) => (
            <button key={t.type} onClick={() => { setForm({ ...form, type: t.type, message: t.msg }); setOpenModal(true) }} className="px-3 py-2 rounded-lg bg-muted/40 hover:bg-muted text-left transition">
              <div className="text-sm font-semibold">{t.label}</div>
              <div className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">{t.msg}</div>
            </button>
          ))}
        </div>
      </Card>

      <Modal open={openModal} onClose={() => setOpenModal(false)} title="Yangi xabar">
        <div className="space-y-3">
          <Field label="Talaba"><select className="erp-input" value={form.student_id} onChange={(e) => { const s = students.find((x) => x.id === e.target.value); if (s) fillStudent(s); else setForm({ ...form, student_id: '' }) }}><option value="">— Tanlang —</option>{students.map((s) => <option key={s.id} value={s.id}>{s.full_name}</option>)}</select></Field>
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Turi"><select className="erp-input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}><option value="custom">Boshqa</option><option value="absent">Kelmadi</option><option value="payment_reminder">To'lov eslatma</option><option value="payment_received">To'lov qabul</option><option value="exam">Imtihon</option><option value="event">Tadbir</option></select></Field>
            <Field label="Kanal"><select className="erp-input" value={form.channel} onChange={(e) => setForm({ ...form, channel: e.target.value })}><option value="telegram">Telegram</option><option value="sms">SMS</option><option value="in_app">Tizim ichida</option></select></Field>
          </div>
          <Field label="Qabul qiluvchi (telefon/username)"><input className="erp-input" value={form.recipient} onChange={(e) => setForm({ ...form, recipient: e.target.value })} /></Field>
          <Field label="Xabar matni *"><textarea className="erp-input" rows={4} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} /></Field>
          <p className="text-xs text-muted-foreground">ℹ Xabar yuborish uchun Sozlamalardan Telegram bot tokenini kiriting.</p>
          <div className="flex gap-2 pt-2"><PrimaryButton onClick={handleSave} className="flex-1">Saqlash</PrimaryButton><GhostButton onClick={() => setOpenModal(false)}>Bekor</GhostButton></div>
        </div>
      </Modal>
    </div>
  )
}
function NotifTypeChip({ type }: { type: string }) {
  const map: any = { absent: { label: 'Kelmadi', cls: 'bg-red-100 text-red-700' }, payment_reminder: { label: 'To\'lov eslatma', cls: 'bg-amber-100 text-amber-700' }, payment_received: { label: 'To\'lov qabul', cls: 'bg-emerald-100 text-emerald-700' }, exam: { label: 'Imtihon', cls: 'bg-violet-100 text-violet-700' }, event: { label: 'Tadbir', cls: 'bg-blue-100 text-blue-700' }, custom: { label: 'Boshqa', cls: 'bg-slate-100 text-slate-700' } }
  const s = map[type] || map.custom
  return <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${s.cls}`}>{s.label}</span>
}

// ============================================================================
//  HISOBLAR EKSPORT (Reports Export)
// ============================================================================
export function ReportsExportPanel() {
  const [stats, setStats] = useState<any>(null)
  const [payments, setPayments] = useState<any[]>([])
  const [expenses, setExpenses] = useState<any[]>([])
  const [students, setStudents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState<'month' | 'quarter' | 'year'>('month')

  useEffect(() => {
    Promise.all([apiFetch('/api/dashboard'), apiFetch('/api/payments?limit=1000'), apiFetch('/api/expenses'), apiFetch('/api/students')]).then(([d, p, e, s]) => {
      if (d.ok) setStats(d.data?.stats)
      if (p.ok) setPayments(p.data?.payments || [])
      if (e.ok) setExpenses(e.data?.expenses || [])
      if (s.ok) setStudents(s.data?.students || [])
      setLoading(false)
    })
  }, [])

  function downloadCSV(filename: string, headers: string[], rows: any[][]) {
    const csv = [headers, ...rows].map((r) => r.map((c: any) => `"${String(c || '').replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = filename; a.click()
    URL.revokeObjectURL(url)
  }

  function exportPayments() {
    downloadCSV(`tolovlar-${new Date().toISOString().slice(0, 10)}.csv`,
      ['Talaba', 'Guruh', 'Summa', 'Sana', 'Turi', 'Oy', 'Izoh'],
      payments.map((p) => [p.student?.full_name, p.group?.name, p.amount, p.payment_date, p.payment_type, p.for_month, p.description])
    )
  }
  function exportExpenses() {
    downloadCSV(`xarajatlar-${new Date().toISOString().slice(0, 10)}.csv`,
      ['Kategoriya', 'Summa', 'Sana', 'Izoh', 'O\'qituvchi'],
      expenses.map((e) => [e.category, e.amount, e.expense_date, e.description, e.teacher?.full_name])
    )
  }
  function exportStudents() {
    downloadCSV(`talabalar-${new Date().toISOString().slice(0, 10)}.csv`,
      ['F.I.O', 'Telefon', 'Ota-ona telefoni', 'Guruh', 'Kurs', 'Holat', 'Ro\'yxatga olingan'],
      students.map((s) => [s.full_name, s.phone, s.parent_phone, s.group?.name, s.course?.name, s.status, s.enrollment_date])
    )
  }
  function exportFinance() {
    const monthRevenue = stats?.monthRevenue || 0
    const monthExpense = stats?.monthExpenseTotal || 0
    downloadCSV(`moliya-${new Date().toISOString().slice(0, 10)}.csv`,
      ['Ko\'rsatkich', 'Bu oy', 'Jami'],
      [['Tushum', monthRevenue, stats?.totalRevenue || 0], ['Xarajat', monthExpense, stats?.totalExpense || 0], ['Sof foyda', monthRevenue - monthExpense, (stats?.totalNetProfit || 0)]]
    )
  }

  if (loading) return <PanelLoader />

  return (
    <div className="space-y-5">
      <div><h1 className="text-2xl lg:text-3xl font-bold">Hisobotlar eksport</h1><p className="text-muted-foreground text-sm mt-1">Excel/CSV formatida yuklab olish</p></div>

      <div className="grid sm:grid-cols-2 gap-4">
        <ExportCard icon={Wallet} title="To'lovlar" desc={`${payments.length} yozuv`} onExport={exportPayments} color="emerald" />
        <ExportCard icon={TrendingUp} title="Xarajatlar" desc={`${expenses.length} yozuv`} onExport={exportExpenses} color="rose" />
        <ExportCard icon={Calendar} title="Talabalar" desc={`${students.length} talaba`} onExport={exportStudents} color="blue" />
        <ExportCard icon={FileText} title="Moliyaviy hisobot" desc="Tushum, xarajat, foyda" onExport={exportFinance} color="violet" />
      </div>

      <Card>
        <CardHeader title="Tezkor statistika" subtitle="Hozirgi oy" />
        <div className="p-4 pt-0 grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="rounded-xl bg-emerald-50 p-3"><div className="text-xs text-emerald-700">Bu oy tushum</div><div className="text-lg font-bold text-emerald-900 mt-1">{formatMoney(stats?.monthRevenue || 0)}</div></div>
          <div className="rounded-xl bg-red-50 p-3"><div className="text-xs text-red-700">Bu oy xarajat</div><div className="text-lg font-bold text-red-900 mt-1">{formatMoney(stats?.monthExpenseTotal || 0)}</div></div>
          <div className="rounded-xl bg-blue-50 p-3"><div className="text-xs text-blue-700">Sof foyda</div><div className="text-lg font-bold text-blue-900 mt-1">{formatMoney(stats?.monthNetProfit || 0)}</div></div>
          <div className="rounded-xl bg-violet-50 p-3"><div className="text-xs text-violet-700">Talabalar</div><div className="text-lg font-bold text-violet-900 mt-1">{stats?.totalStudents || 0}</div></div>
        </div>
      </Card>

      <Card>
        <CardHeader title="Oylik daromad dinamikasi" subtitle="6 oy" />
        <div className="p-4 pt-0">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border/40 text-xs text-muted-foreground"><th className="text-left py-2 font-medium">Oy</th><th className="text-right py-2 font-medium">Tushum</th><th className="text-right py-2 font-medium">Xarajat</th><th className="text-right py-2 font-medium">Sof foyda</th></tr></thead>
            <tbody>
              {(stats?.monthlyRevenue || []).map((m: any) => {
                const net = m.total - m.expense
                return <tr key={m.month} className="border-b border-border/20"><td className="py-2 font-medium">{m.month}</td><td className="text-right py-2 text-emerald-600">{formatMoney(m.total)}</td><td className="text-right py-2 text-red-600">{formatMoney(m.expense)}</td><td className={`text-right py-2 font-bold ${net >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{formatMoney(net)}</td></tr>
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
function ExportCard({ icon: Icon, title, desc, onExport, color }: { icon: any; title: string; desc: string; onExport: () => void; color: string }) {
  const colorMap: any = { emerald: 'from-emerald-500 to-teal-600', rose: 'from-rose-500 to-pink-600', blue: 'from-blue-500 to-indigo-600', violet: 'from-violet-500 to-purple-600' }
  return (
    <Card><div className="p-5">
      <div className="flex items-start justify-between mb-3">
        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${colorMap[color]} flex items-center justify-center text-white shadow-lg`}><Icon className="w-6 h-6" /></div>
      </div>
      <div className="font-semibold text-base">{title}</div>
      <div className="text-xs text-muted-foreground mt-0.5">{desc}</div>
      <button onClick={onExport} className="mt-3 w-full py-2 rounded-xl bg-muted hover:bg-muted/70 text-sm font-semibold flex items-center justify-center gap-2 transition"><Download className="w-4 h-4" /> CSV yuklab olish</button>
    </div></Card>
  )
}
