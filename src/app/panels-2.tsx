'use client'
import { useEffect, useState, useCallback, useMemo } from 'react'
import { motion } from 'framer-motion'
import { apiFetch, formatDate, formatMoney } from '@/lib/client'
import {
  Users, Wallet, BookOpen, UserCog, Plus, Trash2, Pencil, Search, Star,
} from '@/components/icons'
import {
  Card, CardHeader, EmptyState, Modal, PrimaryButton, GhostButton, IconButton,
  PanelLoader, Field, Avatar, Row,
} from './panels-common'

// ============================================================================
//  O'QITUVCHILAR PANEL — kartochka bosilganda to'liq ma'lumot
// ============================================================================
export function TeachersPanel() {
  const [items, setItems] = useState<any[]>([])
  const [groups, setGroups] = useState<any[]>([])
  const [students, setStudents] = useState<any[]>([])
  const [rooms, setRooms] = useState<any[]>([])
  const [schedule, setSchedule] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [openModal, setOpenModal] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [form, setForm] = useState<any>({ full_name: '', phone: '', login: '', subject: '', salary_amount: 0, hire_date: '', notes: '', password: '' })

  // Detallar uchun state
  const [selectedTeacher, setSelectedTeacher] = useState<any>(null)
  const [teacherAttendance, setTeacherAttendance] = useState<any[]>([])
  const [teacherPayouts, setTeacherPayouts] = useState<any[]>([])
  const [loadingDetail, setLoadingDetail] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const [tch, g, s, r, sch] = await Promise.all([
      apiFetch('/api/teachers'),
      apiFetch('/api/groups'),
      apiFetch('/api/students'),
      apiFetch('/api/rooms'),
      apiFetch('/api/schedule'),
    ])
    if (tch.ok) setItems(tch.data?.teachers || [])
    if (g.ok) setGroups(g.data?.groups || [])
    if (s.ok) setStudents(s.data?.students || [])
    if (r.ok) setRooms(r.data?.rooms || [])
    if (sch.ok) setSchedule(sch.data?.schedule || [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  // O'qituvchi detallarini yuklash
  async function openTeacherDetail(t: any) {
    setSelectedTeacher(t)
    setLoadingDetail(true)
    setTeacherAttendance([])
    setTeacherPayouts([])
    const [att, pay] = await Promise.all([
      apiFetch(`/api/teacher-attendance?teacher_id=${t.id}`),
      apiFetch(`/api/teacher-payouts?teacher_id=${t.id}`),
    ])
    if (att.ok) setTeacherAttendance(att.data?.attendance || [])
    if (pay.ok) setTeacherPayouts(pay.data?.payouts || [])
    setLoadingDetail(false)
  }

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

  const WEEKDAYS = ['Dushanba', 'Seshanba', 'Chorshanba', 'Payshanba', 'Juma', 'Shanba', 'Yakshanba']

  // Status badge (davomat)
  function attBadge(status: string) {
    if (status === 'present') return <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 text-[9px] font-bold">Keldi</span>
    if (status === 'absent') return <span className="px-1.5 py-0.5 rounded bg-red-100 text-red-700 text-[9px] font-bold">Kelmadi</span>
    if (status === 'late') return <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 text-[9px] font-bold">Kechikdi</span>
    if (status === 'sick') return <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 text-[9px] font-bold">Kasal</span>
    if (status === 'vacation') return <span className="px-1.5 py-0.5 rounded bg-violet-100 text-violet-700 text-[9px] font-bold">Ta'til</span>
    return <span className="text-[9px] text-muted-foreground">—</span>
  }

  // === DETAL KO'RINISHI ===
  if (selectedTeacher) {
    const t = selectedTeacher
    // O'qituvchining guruhlari
    const teacherGroups = groups.filter((g) => g.teacher_id === t.id)
    // O'qituvchining dars jadvali
    const teacherSchedule = schedule.filter((s) => s.teacher_id === t.id)
    // Har bir guruh uchun talabalar soni
    const groupsWithCounts = teacherGroups.map((g) => ({
      ...g,
      students_count: students.filter((s) => s.group_id === g.id && (s.status === 'active' || s.status === 'paused')).length,
    }))
    // Jami talabalar
    const totalStudents = groupsWithCounts.reduce((s, g) => s + g.students_count, 0)
    // Davomat statistikasi (oxirgi 30 kun)
    const recentAttendance = teacherAttendance.slice(0, 30)
    const presentCount = recentAttendance.filter((a) => a.status === 'present').length
    const absentCount = recentAttendance.filter((a) => a.status === 'absent').length
    const lateCount = recentAttendance.filter((a) => a.status === 'late').length
    // Maosh statistikasi
    const totalPaid = teacherPayouts.filter((p) => p.status === 'paid').reduce((s, p) => s + Number(p.amount || 0) + Number(p.bonus || 0) - Number(p.deduction || 0), 0)
    const totalPending = teacherPayouts.filter((p) => p.status === 'pending').reduce((s, p) => s + Number(p.amount || 0) + Number(p.bonus || 0) - Number(p.deduction || 0), 0)

    return (
      <div className="space-y-5">
        {/* Orqaga qaytish */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => { setSelectedTeacher(null); setTeacherAttendance([]); setTeacherPayouts([]) }}
            className="p-2 rounded-lg hover:bg-muted text-muted-foreground"
            title="O'qituvchilarga qaytish"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg>
          </button>
          <div className="flex items-center gap-3">
            <Avatar name={t.full_name} color="cyan" />
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold">{t.full_name}</h1>
              <p className="text-muted-foreground text-sm mt-0.5">{t.subject || 'Fan ko\'rsatilmagan'} · {teacherGroups.length} guruh · {totalStudents} talaba</p>
            </div>
          </div>
        </div>

        {loadingDetail ? <PanelLoader /> : (
          <>
            {/* === 1. Asosiy ma'lumotlar === */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="bg-card rounded-2xl border border-border/50 p-3">
                <div className="text-[10px] text-muted-foreground">Telefon</div>
                <div className="text-sm font-semibold mt-0.5">{t.phone || '—'}</div>
              </div>
              <div className="bg-card rounded-2xl border border-border/50 p-3">
                <div className="text-[10px] text-muted-foreground">Ish boshlagan</div>
                <div className="text-sm font-semibold mt-0.5">{formatDate(t.hire_date) || '—'}</div>
              </div>
              <div className="bg-card rounded-2xl border border-border/50 p-3">
                <div className="text-[10px] text-muted-foreground">Oylik maosh</div>
                <div className="text-sm font-semibold mt-0.5 text-blue-600">{formatMoney(t.salary_amount)}</div>
              </div>
              <div className="bg-card rounded-2xl border border-border/50 p-3">
                <div className="text-[10px] text-muted-foreground">O'qituvchi paneli</div>
                <div className="text-sm font-semibold mt-0.5">
                  {t.has_password ? (
                    <span className="text-blue-600">✓ Parol bor</span>
                  ) : (
                    <span className="text-amber-600">⚠ Parol yo'q</span>
                  )}
                </div>
              </div>
            </div>

            {/* === 2. Statistik kartochkalar === */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="bg-blue-50 rounded-2xl border border-blue-200 p-3">
                <div className="text-[10px] text-blue-700">Guruhlar</div>
                <div className="text-2xl font-bold mt-0.5 text-blue-900">{teacherGroups.length}</div>
              </div>
              <div className="bg-blue-50 rounded-2xl border border-blue-200 p-3">
                <div className="text-[10px] text-blue-700">Jami talabalar</div>
                <div className="text-2xl font-bold mt-0.5 text-blue-900">{totalStudents}</div>
              </div>
              <div className="bg-violet-50 rounded-2xl border border-violet-200 p-3">
                <div className="text-[10px] text-violet-700">Darslar (jadvalda)</div>
                <div className="text-2xl font-bold mt-0.5 text-violet-900">{teacherSchedule.length}</div>
              </div>
              <div className="bg-amber-50 rounded-2xl border border-amber-200 p-3">
                <div className="text-[10px] text-amber-700">Ishga kelgan (30 kun)</div>
                <div className="text-2xl font-bold mt-0.5 text-amber-900">{presentCount}</div>
              </div>
            </div>

            {/* === 3. Guruhlar va talabalar === */}
            <Card>
              <CardHeader title="Guruhlar va talabalar" subtitle={`${teacherGroups.length} guruh · ${totalStudents} talaba`} />
              {teacherGroups.length === 0 ? (
                <EmptyState title="Guruhlar yo'q" description="Bu o'qituvchiga guruh biriktirilmagan." />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border/40 text-xs text-muted-foreground">
                        <th className="text-left px-4 py-3 font-medium">#</th>
                        <th className="text-left px-4 py-3 font-medium">Guruh</th>
                        <th className="text-left px-4 py-3 font-medium">Kurs</th>
                        <th className="text-center px-4 py-3 font-medium">Talabalar</th>
                        <th className="text-left px-4 py-3 font-medium">Jadval</th>
                        <th className="text-left px-4 py-3 font-medium">Boshlanish</th>
                        <th className="text-left px-4 py-3 font-medium">Tugash</th>
                      </tr>
                    </thead>
                    <tbody>
                      {groupsWithCounts.map((g, idx) => (
                        <tr key={g.id} className="border-b border-border/20 hover:bg-muted/40">
                          <td className="px-4 py-3 text-muted-foreground text-xs">{idx + 1}</td>
                          <td className="px-4 py-3 font-medium">{g.name}</td>
                          <td className="px-4 py-3 text-muted-foreground">{g.course?.name || '—'}</td>
                          <td className="px-4 py-3 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${g.students_count >= g.max_students ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                              {g.students_count}/{g.max_students}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground text-xs">{g.schedule || '—'}</td>
                          <td className="px-4 py-3 text-muted-foreground text-xs">{formatDate(g.start_date) || '—'}</td>
                          <td className="px-4 py-3 text-muted-foreground text-xs">{formatDate(g.end_date) || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>

            {/* === 4. Dars jadvali === */}
            <Card>
              <CardHeader title="Dars jadvali" subtitle={`${teacherSchedule.length} ta dars · haftalik`} />
              {teacherSchedule.length === 0 ? (
                <EmptyState title="Dars jadvali yo'q" description="Dars jadvali bo'limidan dars qo'shing." />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border/40 text-xs text-muted-foreground">
                        <th className="text-left px-4 py-3 font-medium">Kun</th>
                        <th className="text-left px-4 py-3 font-medium">Guruh</th>
                        <th className="text-left px-4 py-3 font-medium">Xona</th>
                        <th className="text-left px-4 py-3 font-medium">Vaqt</th>
                      </tr>
                    </thead>
                    <tbody>
                      {teacherSchedule.sort((a, b) => a.weekday - b.weekday || a.start_time.localeCompare(b.start_time)).map((s) => {
                        const room = rooms.find((r) => r.id === s.room_id)
                        const grp = groups.find((g) => g.id === s.group_id)
                        return (
                          <tr key={s.id} className="border-b border-border/20 hover:bg-muted/40">
                            <td className="px-4 py-3 font-medium">{WEEKDAYS[s.weekday] || '—'}</td>
                            <td className="px-4 py-3 text-muted-foreground">{grp?.name || '—'}</td>
                            <td className="px-4 py-3 text-muted-foreground">
                              {room ? (
                                <span className="flex items-center gap-1">
                                  📍 {room.name}
                                  {room.capacity && <span className="text-[10px] text-muted-foreground">({room.capacity} o'rin)</span>}
                                </span>
                              ) : '—'}
                            </td>
                            <td className="px-4 py-3">
                              <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 text-xs font-semibold">
                                {s.start_time?.slice(0, 5)} - {s.end_time?.slice(0, 5)}
                              </span>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>

            {/* === 5. Davomat (ishga kelgan/kelmagan) === */}
            <Card>
              <CardHeader
                title="Ish davomati"
                subtitle={`Oxirgi 30 yozuv · Keldi: ${presentCount} · Kelmadi: ${absentCount} · Kechikdi: ${lateCount}`}
              />
              {teacherAttendance.length === 0 ? (
                <EmptyState title="Davomat yo'q" description="Hozircha ish davomati yozuvi yo'q." />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border/40 text-xs text-muted-foreground">
                        <th className="text-left px-4 py-3 font-medium">#</th>
                        <th className="text-left px-4 py-3 font-medium">Sana</th>
                        <th className="text-left px-4 py-3 font-medium">Guruh</th>
                        <th className="text-center px-4 py-3 font-medium">Holat</th>
                        <th className="text-left px-4 py-3 font-medium">Izoh</th>
                      </tr>
                    </thead>
                    <tbody>
                      {teacherAttendance.slice(0, 30).map((a, idx) => {
                        const grp = groups.find((g) => g.id === a.group_id)
                        return (
                          <tr key={a.id} className="border-b border-border/20 hover:bg-muted/40">
                            <td className="px-4 py-3 text-muted-foreground text-xs">{idx + 1}</td>
                            <td className="px-4 py-3 font-medium">{formatDate(a.lesson_date)}</td>
                            <td className="px-4 py-3 text-muted-foreground">{grp?.name || '—'}</td>
                            <td className="px-4 py-3 text-center">{attBadge(a.status)}</td>
                            <td className="px-4 py-3 text-muted-foreground text-xs">{a.notes || '—'}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>

            {/* === 6. Maoshlar === */}
            <Card>
              <CardHeader
                title="Maoshlar tarixi"
                subtitle={`To'langan: ${formatMoney(totalPaid)} · Kutilmoqda: ${formatMoney(totalPending)}`}
              />
              {teacherPayouts.length === 0 ? (
                <EmptyState title="Maosh yozuvlari yo'q" description="O'qituvchi maoshlari bo'limidan maosh qo'shing." />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border/40 text-xs text-muted-foreground">
                        <th className="text-left px-4 py-3 font-medium">#</th>
                        <th className="text-left px-4 py-3 font-medium">Oy</th>
                        <th className="text-right px-4 py-3 font-medium">Summa</th>
                        <th className="text-right px-4 py-3 font-medium">Bonus</th>
                        <th className="text-right px-4 py-3 font-medium">Ayirma</th>
                        <th className="text-right px-4 py-3 font-medium">Jami</th>
                        <th className="text-center px-4 py-3 font-medium">Holat</th>
                        <th className="text-left px-4 py-3 font-medium">Izoh</th>
                      </tr>
                    </thead>
                    <tbody>
                      {teacherPayouts.map((p, idx) => {
                        const total = Number(p.amount || 0) + Number(p.bonus || 0) - Number(p.deduction || 0)
                        return (
                          <tr key={p.id} className="border-b border-border/20 hover:bg-muted/40">
                            <td className="px-4 py-3 text-muted-foreground text-xs">{idx + 1}</td>
                            <td className="px-4 py-3 font-medium">{p.period_month}</td>
                            <td className="px-4 py-3 text-right">{formatMoney(p.amount)}</td>
                            <td className="px-4 py-3 text-right text-blue-600">{p.bonus > 0 ? `+${formatMoney(p.bonus)}` : '—'}</td>
                            <td className="px-4 py-3 text-right text-rose-600">{p.deduction > 0 ? `-${formatMoney(p.deduction)}` : '—'}</td>
                            <td className="px-4 py-3 text-right font-bold text-blue-600">{formatMoney(total)}</td>
                            <td className="px-4 py-3 text-center">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${p.status === 'paid' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>
                                {p.status === 'paid' ? '✓ To\'langan' : '⏳ Kutilmoqda'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-muted-foreground text-xs">{p.notes || '—'}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-border/60 bg-muted/30 font-bold">
                        <td colSpan={5} className="px-4 py-3 text-right">JAMI:</td>
                        <td className="px-4 py-3 text-right text-blue-600">{formatMoney(totalPaid + totalPending)}</td>
                        <td colSpan={2}></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </Card>

            {/* === Ma'lumot === */}
            <div className="rounded-xl bg-blue-50 border border-blue-200 p-3 text-xs text-blue-800">
              <strong>ℹ️ O'qituvchi haqida:</strong> Bu yerda o'qituvchining barcha ma'lumotlari — guruhlari, talabalari, dars jadvali, ish davomati va maoshlari bitta sahifada ko'rinadi.
              O'qituvchi paneli (<code className="px-1 bg-blue-100 rounded">/teacher</code>) orqali u o'z guruhlarining davomatini belgilaydi.
            </div>
          </>
        )}
      </div>
    )
  }

  // === ASOSIY RO'YXAT ===
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold">O'qituvchilar</h1>
          <p className="text-muted-foreground text-sm mt-1">{items.length} murabbiy · batafsil uchun o'qituvchini bosing</p>
        </div>
        <div className="flex gap-2">
          <a
            href="/teacher"
            target="_blank"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-sm font-semibold border border-blue-200"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg>
            O'qituvchi paneli
          </a>
          <PrimaryButton onClick={() => { setEditing(null); setForm({ full_name: '', phone: '', login: '', subject: '', salary_amount: 0, hire_date: '', notes: '', password: '' }); setOpenModal(true) }}><Plus className="w-4 h-4" /> Yangi o'qituvchi</PrimaryButton>
        </div>
      </div>

      {/* O'qituvchi paneli haqida ma'lumot */}
      <div className="rounded-xl bg-blue-50 border border-blue-200 p-3 text-xs text-blue-800">
        <strong>ℹ️ O'qituvchi paneli:</strong> O'qituvchilar <code className="px-1 py-0.5 bg-blue-100 rounded">/teacher</code> manzilidan kirib, o'z guruhlaridagi o'quvchilarning davomatini belgilashlari mumkin.
        Har bir o'qituvchi uchun <strong>login (telefon)</strong> va <strong>parol</strong> kiriting. Batafsil ma'lumot uchun o'qituvchi kartochkasini bosing.
      </div>

      {loading ? <PanelLoader /> : items.length === 0 ? <Card><EmptyState title="O'qituvchilar yo'q" description="Birinchi murabbiyingizni qo'shing." /></Card> : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((t) => {
            // O'qituvchining guruhlari soni
            const teacherGroupsCount = groups.filter((g) => g.teacher_id === t.id).length
            const teacherStudentsCount = students.filter((s) =>
              s.status === 'active' && groups.some((g) => g.id === s.group_id && g.teacher_id === t.id)
            ).length
            return (
              <Card key={t.id}>
                <div
                  className="p-4 cursor-pointer hover:bg-muted/30 transition-colors"
                  onClick={() => openTeacherDetail(t)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3"><Avatar name={t.full_name} color="cyan" /><div><div className="font-semibold">{t.full_name}</div><div className="text-xs text-muted-foreground">{t.subject || 'Fan ko\'rsatilmagan'}</div></div></div>
                    <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                      <IconButton title="Tahrirlash" onClick={() => { setEditing(t); setForm({ full_name: t.full_name, phone: t.phone || '', login: t.login || '', subject: t.subject || '', salary_amount: t.salary_amount || 0, hire_date: t.hire_date || '', notes: t.notes || '', password: '' }); setOpenModal(true) }}><Pencil className="w-3.5 h-3.5" /></IconButton>
                      <IconButton title="O'chirish" danger onClick={() => handleDelete(t.id)}><Trash2 className="w-3.5 h-3.5" /></IconButton>
                    </div>
                  </div>
                  <div className="mt-3 space-y-1.5 text-xs">
                    {t.phone && <Row label="Telefon" value={t.phone} />}
                    <Row label="Guruhlar" value={`${teacherGroupsCount} ta · ${teacherStudentsCount} talaba`} />
                    <Row label="Maosh" value={formatMoney(t.salary_amount)} />
                    <Row label="Ish boshlagan" value={formatDate(t.hire_date)} />
                    <div className="flex items-center gap-1.5">
                      <span className="text-muted-foreground">Panel:</span>
                      {t.has_password ? (
                        <span className="px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-semibold">✓ Parol bor</span>
                      ) : (
                        <span className="px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-semibold">⚠ Parol yo'q</span>
                      )}
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-border/40 flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded-full bg-cyan-100 text-cyan-700 text-[10px] font-semibold">
                      {teacherGroupsCount} guruh · {teacherStudentsCount} talaba
                    </span>
                    <span className="text-[10px] text-blue-600 font-medium flex items-center gap-1">
                      Batafsil
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6" /></svg>
                    </span>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}
      <Modal open={openModal} onClose={() => setOpenModal(false)} title={editing ? 'O\'qituvchini tahrirlash' : 'Yangi o\'qituvchi'} size="lg">
        <div className="space-y-3">
          <Field label="F.I.O *"><input className="erp-input" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></Field>
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Telefon (login sifatida ishlatiladi)"><input className="erp-input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value, login: form.login || e.target.value })} placeholder="+998901234567" /></Field>
            <Field label="Fan / Mutaxassislik"><input className="erp-input" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} /></Field>
          </div>

          {/* O'qituvchi paneli uchun parol */}
          <div className="rounded-xl bg-blue-50 border border-blue-200 p-3 space-y-2">
            <div className="text-xs font-semibold text-blue-800">🔐 O'qituvchi paneli uchun kirish</div>
            <div className="grid sm:grid-cols-2 gap-3">
              <Field label="Login (ixtiyoriy)"><input className="erp-input" value={form.login} onChange={(e) => setForm({ ...form, login: e.target.value })} placeholder="Telefon avtomatik ishlatiladi" /></Field>
              <Field label={editing ? 'Yangi parol (o\'zgartirish uchun)' : 'Parol *'}>
                <input type="text" className="erp-input" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Masalan: 1234" />
              </Field>
            </div>
            <p className="text-[11px] text-blue-700">
              O'qituvchi <code className="px-1 bg-blue-100 rounded">/teacher</code> manzilidan login (yoki telefon) va parol bilan kirib, o'z guruhlaridagi o'quvchilarning davomatini belgilay oladi.
            </p>
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
//  GURUHLAR PANEL — kursga bog'langan + guruh detallari (o'quvchilar + davomat)
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

  // Guruh detallari uchun state
  const [selectedGroup, setSelectedGroup] = useState<any>(null)
  const [groupStudents, setGroupStudents] = useState<any[]>([])
  const [groupAttendance, setGroupAttendance] = useState<any[]>([])
  const [loadingDetail, setLoadingDetail] = useState(false)
  // Tanlangan sana (davomatni ko'rish uchun)
  const [detailDate, setDetailDate] = useState(new Date().toISOString().slice(0, 10))

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

  // === Guruh detallarini yuklash (o'quvchilar + davomat) ===
  async function openGroupDetail(g: any) {
    setSelectedGroup(g)
    setLoadingDetail(true)
    // Guruh o'quvchilari (students dan filter)
    const groupStuds = students.filter((s) => s.group_id === g.id && (s.status === 'active' || s.status === 'paused'))
    setGroupStudents(groupStuds)
    // Davomatni yuklash (oxirgi 30 kun)
    const { ok, data } = await apiFetch(`/api/attendance?group_id=${g.id}&limit=500`)
    if (ok) setGroupAttendance(data?.attendance || [])
    else setGroupAttendance([])
    setLoadingDetail(false)
  }

  // Davomatni sana bo'yicha qayta yuklash
  async function reloadAttendance(groupId: string, date?: string) {
    const dateQuery = date ? `&date=${date}` : ''
    const { ok, data } = await apiFetch(`/api/attendance?group_id=${groupId}${dateQuery}&limit=500`)
    if (ok) setGroupAttendance(data?.attendance || [])
  }

  // Tanlangan sanadagi davomat (student_id -> status)
  const todayAttendance = useMemo(() => {
    const m: Record<string, any> = {}
    groupAttendance.forEach((a) => {
      if (a.lesson_date === detailDate) {
        m[a.student_id] = a
      }
    })
    return m
  }, [groupAttendance, detailDate])

  // Barcha noyob sanalar (oxirgi 30 kun)
  const attendanceDates = useMemo(() => {
    const dates = [...new Set(groupAttendance.map((a) => a.lesson_date))]
    return dates.sort((a, b) => b.localeCompare(a)).slice(0, 30)
  }, [groupAttendance])

  // Sanalar bo'yicha davomat (har bir o'quvchi uchun)
  const attendanceMatrix = useMemo(() => {
    const matrix: Record<string, Record<string, string>> = {}
    groupStudents.forEach((s) => {
      matrix[s.id] = {}
      attendanceDates.forEach((d) => {
        const rec = groupAttendance.find((a) => a.student_id === s.id && a.lesson_date === d)
        matrix[s.id][d] = rec?.status || '-'
      })
    })
    return matrix
  }, [groupStudents, groupAttendance, attendanceDates])

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

  // Status badge
  function statusBadge(status: string) {
    if (status === 'present') return <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 text-[9px] font-bold">K</span>
    if (status === 'absent') return <span className="px-1.5 py-0.5 rounded bg-red-100 text-red-700 text-[9px] font-bold">·</span>
    if (status === 'late') return <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 text-[9px] font-bold">Kech</span>
    return <span className="text-[9px] text-muted-foreground">—</span>
  }

  // === Guruh detallari ko'rinishi ===
  if (selectedGroup) {
    return (
      <div className="space-y-5">
        {/* Boshqaga qaytish */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => { setSelectedGroup(null); setGroupStudents([]); setGroupAttendance([]) }}
            className="p-2 rounded-lg hover:bg-muted text-muted-foreground"
            title="Guruhlarga qaytish"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg>
          </button>
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold">{selectedGroup.name}</h1>
            <p className="text-muted-foreground text-sm mt-1">
              {selectedGroup.course?.name || 'Kurs yo\'q'} · {groupStudents.length} o'quvchi
              {selectedGroup.teacher && ` · ${selectedGroup.teacher.full_name}`}
            </p>
          </div>
        </div>

        {/* Guruh ma'lumotlari */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-card rounded-2xl border border-border/50 p-3">
            <div className="text-[10px] text-muted-foreground">O'qituvchi</div>
            <div className="text-sm font-semibold mt-0.5">{selectedGroup.teacher?.full_name || '—'}</div>
          </div>
          <div className="bg-card rounded-2xl border border-border/50 p-3">
            <div className="text-[10px] text-muted-foreground">Jadval</div>
            <div className="text-sm font-semibold mt-0.5">{selectedGroup.schedule || '—'}</div>
          </div>
          <div className="bg-card rounded-2xl border border-border/50 p-3">
            <div className="text-[10px] text-muted-foreground">Boshlanish</div>
            <div className="text-sm font-semibold mt-0.5">{formatDate(selectedGroup.start_date) || '—'}</div>
          </div>
          <div className="bg-card rounded-2xl border border-border/50 p-3">
            <div className="text-[10px] text-muted-foreground">Talabalar</div>
            <div className="text-sm font-semibold mt-0.5">{groupStudents.length}/{selectedGroup.max_students}</div>
          </div>
        </div>

        {loadingDetail ? <PanelLoader /> : (
          <div className="grid lg:grid-cols-2 gap-4">
            {/* === CHAP TOMON: O'quvchilar ro'yxati === */}
            <Card>
              <CardHeader title="O'quvchilar ro'yxati" subtitle={`${groupStudents.length} ta o'quvchi`} />
              {groupStudents.length === 0 ? (
                <EmptyState title="O'quvchilar yo'q" description="Bu guruhga talaba qo'shing." />
              ) : (
                <div className="divide-y divide-border/20">
                  {groupStudents.map((s, idx) => {
                    const todayStatus = todayAttendance[s.id]?.status
                    return (
                      <div key={s.id} className="px-4 py-3 flex items-center justify-between hover:bg-muted/40">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600 shrink-0">
                            {idx + 1}
                          </div>
                          <div className="min-w-0">
                            <div className="font-medium text-sm truncate">{s.full_name}</div>
                            {s.phone && <div className="text-[10px] text-muted-foreground">{s.phone}</div>}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {/* Bugungi davomat holati */}
                          {todayStatus ? (
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                              todayStatus === 'present' ? 'bg-blue-100 text-blue-700' :
                              todayStatus === 'absent' ? 'bg-red-100 text-red-700' :
                              'bg-amber-100 text-amber-700'
                            }`}>
                              {todayStatus === 'present' ? '✓ Keldi' : todayStatus === 'absent' ? '✗ Kelmadi' : '⏰ Kechikdi'}
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-500">
                              Belgilanmagan
                            </span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </Card>

            {/* === O'NG TOMON: Davomat jadvali === */}
            <Card>
              <CardHeader
                title="Davomat jadvali"
                subtitle={`${attendanceDates.length} ta dars kuni · O'qituvchi paneli bilan sinxron`}
              />
              <div className="p-4 pt-0">
                {/* Sana tanlash */}
                <div className="flex items-center gap-2 mb-3">
                  <label className="text-xs text-muted-foreground">Sana:</label>
                  <input
                    type="date"
                    value={detailDate}
                    onChange={(e) => { setDetailDate(e.target.value); reloadAttendance(selectedGroup.id, e.target.value) }}
                    className="px-3 py-1.5 rounded-lg border border-border/50 text-sm bg-card"
                  />
                  <button
                    onClick={() => reloadAttendance(selectedGroup.id)}
                    className="ml-auto px-2 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs"
                    title="Davomatni qayta yuklash"
                  >
                    🔄 Yangilash
                  </button>
                </div>

                {/* Davomat jadvali */}
                {attendanceDates.length === 0 ? (
                  <div className="py-8 text-center text-sm text-muted-foreground">
                    <svg className="w-10 h-10 mx-auto mb-2 text-muted-foreground/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
                    Hozircha davomat yo'q
                    <div className="text-[10px] mt-1">O'qituvchi panelidan davomat belgilang</div>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-border/40 text-[10px] text-muted-foreground">
                          <th className="text-left px-2 py-2 font-medium sticky left-0 bg-card">O'quvchi</th>
                          {attendanceDates.map((d) => (
                            <th key={d} className="text-center px-1 py-2 font-medium whitespace-nowrap" title={d}>
                              {new Date(d).toLocaleDateString('uz-UZ', { day: '2-digit', month: '2-digit' })}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {groupStudents.map((s) => (
                          <tr key={s.id} className="border-b border-border/20 hover:bg-muted/40">
                            <td className="px-2 py-2 font-medium sticky left-0 bg-card truncate max-w-[120px]">{s.full_name}</td>
                            {attendanceDates.map((d) => {
                              const status = attendanceMatrix[s.id]?.[d] || '-'
                              return (
                                <td key={d} className="text-center px-1 py-2">
                                  {status !== '-' ? statusBadge(status) : <span className="text-[9px] text-muted-foreground">—</span>}
                                </td>
                              )
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Legenda */}
                <div className="mt-3 pt-3 border-t border-border/40 flex items-center gap-3 text-[10px] text-muted-foreground flex-wrap">
                  <span className="flex items-center gap-1">
                    <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 text-[9px] font-bold">K</span> Keldi
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="px-1.5 py-0.5 rounded bg-red-100 text-red-700 text-[9px] font-bold">·</span> Kelmadi
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 text-[9px] font-bold">Kech</span> Kechikdi
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="text-[9px]">—</span> Belgilanmagan
                  </span>
                </div>
              </div>
            </Card>

            {/* Ma'lumot */}
            <div className="lg:col-span-2 rounded-xl bg-blue-50 border border-blue-200 p-3 text-xs text-blue-800">
              <strong>ℹ️ Davomat haqida:</strong> Bu yerda ko'rsatilgan davomat <strong>o'qituvchi paneli</strong> (/teacher) orqali belgilangan.
              O'qituvchi o'z paroli bilan kirib, dars vaqtida davomat belgilaydi — bu ma'lumotlar shu yerda ham avtomatik ko'rinadi.
              Hammasi bitta baza (attendance jadvali) dan olinadi.
            </div>
          </div>
        )}
      </div>
    )
  }

  // === Asosiy guruhlar ro'yxati ===
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="text-2xl lg:text-3xl font-bold">Guruhlar</h1><p className="text-muted-foreground text-sm mt-1">{filtered.length} guruh · batafsil uchun guruhni bosing</p></div>
        <PrimaryButton onClick={() => { setEditing(null); setForm({ name: '', course_id: '', teacher_id: '', start_date: '', end_date: '', schedule: '', max_students: 12 }); setOpenModal(true) }}><Plus className="w-4 h-4" /> Yangi guruh</PrimaryButton>
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
              <Card key={g.id}>
                <div
                  className="p-4 cursor-pointer hover:bg-muted/30 transition-colors"
                  onClick={() => openGroupDetail(g)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3"><Avatar name={g.name} color="amber" /><div><div className="font-semibold">{g.name}</div><div className="text-xs text-muted-foreground">{g.course?.name || 'Kurs yo\'q'}</div></div></div>
                    <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
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
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${isFull ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>{count}/{g.max_students} talaba</span>
                    <span className="text-[10px] text-blue-600 font-medium flex items-center gap-1">
                      Batafsil
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6" /></svg>
                    </span>
                  </div>
                </div>
              </Card>
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
          <Field label="Jadval">
            <div className="space-y-2">
              {/* 3 ta variant tugmasi */}
              <div className="flex gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => setForm({ ...form, schedule: form.schedule && form.schedule.startsWith('Du-Chor-Juma') ? form.schedule : 'Du-Chor-Juma ' })}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                    form.schedule?.startsWith('Du-Chor-Juma')
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-card text-muted-foreground border-border/50 hover:bg-muted'
                  }`}
                >
                  Du-Chor-Juma
                  <div className="text-[9px] opacity-80">(toq kunlar)</div>
                </button>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, schedule: form.schedule && form.schedule.startsWith('Se-Pay-Shan') ? form.schedule : 'Se-Pay-Shan ' })}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                    form.schedule?.startsWith('Se-Pay-Shan')
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-card text-muted-foreground border-border/50 hover:bg-muted'
                  }`}
                >
                  Se-Pay-Shan
                  <div className="text-[9px] opacity-80">(juft kunlar)</div>
                </button>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, schedule: form.schedule && !form.schedule.startsWith('Du-Chor-Juma') && !form.schedule.startsWith('Se-Pay-Shan') && form.schedule !== '' ? form.schedule : 'Boshqa: ' })}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                    form.schedule && !form.schedule.startsWith('Du-Chor-Juma') && !form.schedule.startsWith('Se-Pay-Shan') && form.schedule !== ''
                      ? 'bg-amber-600 text-white border-amber-600'
                      : 'bg-card text-muted-foreground border-border/50 hover:bg-muted'
                  }`}
                >
                  Boshqa
                  <div className="text-[9px] opacity-80">(qo'lda yozish)</div>
                </button>
              </div>
              {/* Vaqt maydoni va jadval matni */}
              <input
                className="erp-input"
                value={form.schedule}
                onChange={(e) => setForm({ ...form, schedule: e.target.value })}
                placeholder="Masalan: Du-Chor-Juma 14:00-16:00"
              />
              <p className="text-xs text-muted-foreground">
                Variant tugmasini bosing, so'ng vaqtni qo'shib yozing (masalan: 14:00-16:00)
              </p>
            </div>
          </Field>
          <Field label="Maks talabalar soni"><input type="number" className="erp-input" value={form.max_students} onChange={(e) => setForm({ ...form, max_students: Number(e.target.value) })} /></Field>
          <div className="flex gap-2 pt-2"><PrimaryButton onClick={handleSave} className="flex-1">Saqlash</PrimaryButton><GhostButton onClick={() => setOpenModal(false)}>Bekor</GhostButton></div>
        </div>
      </Modal>
    </div>
  )
}

// ============================================================================
//  KURSLAR PANEL — kartochka bosilganda to'liq ma'lumot
// ============================================================================
export function CoursesPanel() {
  const [items, setItems] = useState<any[]>([])
  const [groups, setGroups] = useState<any[]>([])
  const [students, setStudents] = useState<any[]>([])
  const [teachers, setTeachers] = useState<any[]>([])
  const [schedule, setSchedule] = useState<any[]>([])
  const [payments, setPayments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [openModal, setOpenModal] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [form, setForm] = useState<any>({ name: '', description: '', duration_months: 3, price: 0 })

  // Detal uchun state
  const [selectedCourse, setSelectedCourse] = useState<any>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const [c, g, s, t, sch, p] = await Promise.all([
      apiFetch('/api/courses'),
      apiFetch('/api/groups'),
      apiFetch('/api/students'),
      apiFetch('/api/teachers'),
      apiFetch('/api/schedule'),
      apiFetch('/api/payments?limit=1000'),
    ])
    if (c.ok) setItems(c.data?.courses || [])
    if (g.ok) setGroups(g.data?.groups || [])
    if (s.ok) setStudents(s.data?.students || [])
    if (t.ok) setTeachers(t.data?.teachers || [])
    if (sch.ok) setSchedule(sch.data?.schedule || [])
    if (p.ok) setPayments(p.data?.payments || [])
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

  const WEEKDAYS = ['Dushanba', 'Seshanba', 'Chorshanba', 'Payshanba', 'Juma', 'Shanba', 'Yakshanba']

  // === DETAL KO'RINISHI ===
  if (selectedCourse) {
    const c = selectedCourse
    // Kursdagi guruhlar (o'qituvchi bilan)
    const courseGroups = groups.filter((g) => g.course_id === c.id).map((g) => ({
      ...g,
      teacher: teachers.find((t) => t.id === g.teacher_id),
      students_count: students.filter((s) => s.group_id === g.id && (s.status === 'active' || s.status === 'paused')).length,
    }))
    // Kursdagi barcha talabalar
    const courseStudents = students.filter((s) => s.course_id === c.id)
    const activeStudents = courseStudents.filter((s) => s.status === 'active')
    // Kursdagi darslar (jadvaldan)
    const courseSchedule = schedule.filter((s) => {
      const grp = groups.find((g) => g.id === s.group_id)
      return grp?.course_id === c.id
    })
    // Kurs bo'yicha to'lovlar
    const coursePayments = payments.filter((p) => {
      const stud = students.find((s) => s.id === p.student_id)
      return stud?.course_id === c.id
    })
    const totalPaid = coursePayments.reduce((s, p) => s + Number(p.amount || 0), 0)
    // Jami talabalar
    const totalStudents = courseStudents.length
    const totalActive = activeStudents.length

    return (
      <div className="space-y-5">
        {/* Orqaga qaytish */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSelectedCourse(null)}
            className="p-2 rounded-lg hover:bg-muted text-muted-foreground"
            title="Kurslarga qaytish"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg>
          </button>
          <div className="flex items-center gap-3">
            <Avatar name={c.name} color="violet" />
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold">{c.name}</h1>
              <p className="text-muted-foreground text-sm mt-0.5">
                {c.duration_months} oylik kurs · {courseGroups.length} guruh · {totalActive} faol talaba
              </p>
            </div>
          </div>
        </div>

        {/* === 1. Asosiy ma'lumotlar === */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-card rounded-2xl border border-border/50 p-3">
            <div className="text-[10px] text-muted-foreground">Yaratilgan sana</div>
            <div className="text-sm font-semibold mt-0.5">{formatDate(c.created_at) || '—'}</div>
          </div>
          <div className="bg-card rounded-2xl border border-border/50 p-3">
            <div className="text-[10px] text-muted-foreground">Davomiyligi</div>
            <div className="text-sm font-semibold mt-0.5">{c.duration_months} oy</div>
          </div>
          <div className="bg-card rounded-2xl border border-border/50 p-3">
            <div className="text-[10px] text-muted-foreground">Oylik to'lov</div>
            <div className="text-sm font-semibold mt-0.5 text-amber-600">{formatMoney(c.price)}</div>
          </div>
          <div className="bg-card rounded-2xl border border-border/50 p-3">
            <div className="text-[10px] text-muted-foreground">Jami to'lovlar</div>
            <div className="text-sm font-semibold mt-0.5 text-blue-600">{formatMoney(totalPaid)}</div>
          </div>
        </div>

        {/* === 2. Statistik kartochkalar === */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-violet-50 rounded-2xl border border-violet-200 p-3">
            <div className="text-[10px] text-violet-700">Guruhlar</div>
            <div className="text-2xl font-bold mt-0.5 text-violet-900">{courseGroups.length}</div>
          </div>
          <div className="bg-blue-50 rounded-2xl border border-blue-200 p-3">
            <div className="text-[10px] text-blue-700">Jami talabalar</div>
            <div className="text-2xl font-bold mt-0.5 text-blue-900">{totalStudents}</div>
          </div>
          <div className="bg-blue-50 rounded-2xl border border-blue-200 p-3">
            <div className="text-[10px] text-blue-700">Faol talabalar</div>
            <div className="text-2xl font-bold mt-0.5 text-blue-900">{totalActive}</div>
          </div>
          <div className="bg-amber-50 rounded-2xl border border-amber-200 p-3">
            <div className="text-[10px] text-amber-700">Darslar (jadvalda)</div>
            <div className="text-2xl font-bold mt-0.5 text-amber-900">{courseSchedule.length}</div>
          </div>
        </div>

        {/* === Tavsif === */}
        {c.description && (
          <Card>
            <CardHeader title="Kurs tavsifi" />
            <div className="p-4 pt-0 text-sm text-muted-foreground">{c.description}</div>
          </Card>
        )}

        {/* === 3. Guruhlar jadvali === */}
        <Card>
          <CardHeader title="Guruhlar" subtitle={`${courseGroups.length} guruh · o'qituvchi va talabalar bilan`} />
          {courseGroups.length === 0 ? (
            <EmptyState title="Guruhlar yo'q" description="Bu kursga guruh qo'shing." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/40 text-xs text-muted-foreground">
                    <th className="text-left px-4 py-3 font-medium">#</th>
                    <th className="text-left px-4 py-3 font-medium">Guruh</th>
                    <th className="text-left px-4 py-3 font-medium">O'qituvchi</th>
                    <th className="text-center px-4 py-3 font-medium">Talabalar</th>
                    <th className="text-left px-4 py-3 font-medium">Jadval</th>
                    <th className="text-left px-4 py-3 font-medium">Ochilgan sana</th>
                    <th className="text-left px-4 py-3 font-medium">Tugash sana</th>
                  </tr>
                </thead>
                <tbody>
                  {courseGroups.map((g, idx) => (
                    <tr key={g.id} className="border-b border-border/20 hover:bg-muted/40">
                      <td className="px-4 py-3 text-muted-foreground text-xs">{idx + 1}</td>
                      <td className="px-4 py-3 font-medium">{g.name}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {g.teacher ? (
                          <span className="flex items-center gap-1">
                            👤 {g.teacher.full_name}
                            {g.teacher.subject && <span className="text-[10px] text-muted-foreground">({g.teacher.subject})</span>}
                          </span>
                        ) : <span className="text-amber-600 text-xs">Biriktirilmagan</span>}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${g.students_count >= g.max_students ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                          {g.students_count}/{g.max_students}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">{g.schedule || '—'}</td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">{formatDate(g.start_date) || '—'}</td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">{formatDate(g.end_date) || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* === 4. Talabalar ro'yxati === */}
        <Card>
          <CardHeader title="Talabalar ro'yxati" subtitle={`${totalStudents} jami · ${totalActive} faol`} />
          {courseStudents.length === 0 ? (
            <EmptyState title="Talabalar yo'q" description="Bu kursga talaba qo'shing." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/40 text-xs text-muted-foreground">
                    <th className="text-left px-4 py-3 font-medium">#</th>
                    <th className="text-left px-4 py-3 font-medium">Talaba</th>
                    <th className="text-left px-4 py-3 font-medium">Guruh</th>
                    <th className="text-left px-4 py-3 font-medium">Telefon</th>
                    <th className="text-left px-4 py-3 font-medium">Qabul sana</th>
                    <th className="text-center px-4 py-3 font-medium">Holat</th>
                  </tr>
                </thead>
                <tbody>
                  {courseStudents.slice(0, 100).map((s, idx) => {
                    const grp = groups.find((g) => g.id === s.group_id)
                    return (
                      <tr key={s.id} className="border-b border-border/20 hover:bg-muted/40">
                        <td className="px-4 py-3 text-muted-foreground text-xs">{idx + 1}</td>
                        <td className="px-4 py-3 font-medium">{s.full_name}</td>
                        <td className="px-4 py-3 text-muted-foreground">{grp?.name || '—'}</td>
                        <td className="px-4 py-3 text-muted-foreground text-xs">{s.phone || '—'}</td>
                        <td className="px-4 py-3 text-muted-foreground text-xs">{formatDate(s.enrollment_date) || '—'}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            s.status === 'active' ? 'bg-blue-100 text-blue-700' :
                            s.status === 'paused' ? 'bg-amber-100 text-amber-700' :
                            s.status === 'graduated' ? 'bg-blue-100 text-blue-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {s.status === 'active' ? 'Faol' : s.status === 'paused' ? 'To\'xtatilgan' : s.status === 'graduated' ? 'Bitirgan' : 'Ketgan'}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* === 5. Dars jadvali === */}
        <Card>
          <CardHeader title="Dars jadvali" subtitle={`${courseSchedule.length} ta dars · haftalik`} />
          {courseSchedule.length === 0 ? (
            <EmptyState title="Dars jadvali yo'q" description="Dars jadvali bo'limidan dars qo'shing." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/40 text-xs text-muted-foreground">
                    <th className="text-left px-4 py-3 font-medium">#</th>
                    <th className="text-left px-4 py-3 font-medium">Kun</th>
                    <th className="text-left px-4 py-3 font-medium">Guruh</th>
                    <th className="text-left px-4 py-3 font-medium">O'qituvchi</th>
                    <th className="text-left px-4 py-3 font-medium">Vaqt</th>
                  </tr>
                </thead>
                <tbody>
                  {courseSchedule.sort((a, b) => a.weekday - b.weekday || a.start_time.localeCompare(b.start_time)).map((s, idx) => {
                    const grp = groups.find((g) => g.id === s.group_id)
                    const tch = teachers.find((t) => t.id === s.teacher_id)
                    return (
                      <tr key={s.id} className="border-b border-border/20 hover:bg-muted/40">
                        <td className="px-4 py-3 text-muted-foreground text-xs">{idx + 1}</td>
                        <td className="px-4 py-3 font-medium">{WEEKDAYS[s.weekday] || '—'}</td>
                        <td className="px-4 py-3 text-muted-foreground">{grp?.name || '—'}</td>
                        <td className="px-4 py-3 text-muted-foreground">{tch?.full_name || '—'}</td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 text-xs font-semibold">
                            {s.start_time?.slice(0, 5)} - {s.end_time?.slice(0, 5)}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* === 6. Moliyaviy ma'lumot === */}
        <Card>
          <CardHeader
            title="Moliyaviy ma'lumot"
            subtitle={`Jami to'lovlar: ${formatMoney(totalPaid)} · ${coursePayments.length} ta to'lov yozuvi`}
          />
          <div className="p-4 pt-0 grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-blue-50 rounded-xl border border-blue-200 p-3 text-center">
              <div className="text-[10px] text-blue-700">Jami to'langan</div>
              <div className="text-lg font-bold mt-1 text-blue-900">{formatMoney(totalPaid)}</div>
            </div>
            <div className="bg-amber-50 rounded-xl border border-amber-200 p-3 text-center">
              <div className="text-[10px] text-amber-700">Oylik to'lov (har talaba)</div>
              <div className="text-lg font-bold mt-1 text-amber-900">{formatMoney(c.price)}</div>
            </div>
            <div className="bg-blue-50 rounded-xl border border-blue-200 p-3 text-center">
              <div className="text-[10px] text-blue-700">Faol talabalar</div>
              <div className="text-lg font-bold mt-1 text-blue-900">{totalActive}</div>
            </div>
            <div className="bg-violet-50 rounded-xl border border-violet-200 p-3 text-center">
              <div className="text-[10px] text-violet-700">Kutilayotgan oylik tushum</div>
              <div className="text-lg font-bold mt-1 text-violet-900">{formatMoney(totalActive * Number(c.price || 0))}</div>
            </div>
          </div>
        </Card>

        {/* === Ma'lumot === */}
        <div className="rounded-xl bg-blue-50 border border-blue-200 p-3 text-xs text-blue-800">
          <strong>ℹ️ Kurs haqida:</strong> Bu yerda kursning barcha ma'lumotlari — guruhlari, talabalari, dars jadvali va moliyaviy ko'rsatkichlari bitta sahifada ko'rinadi.
          Barcha ma'lumotlar markaziy bazadan olinadi — yangi talaba qo'shilsa, to'lov qilinsa yoki davomat belgilansa, bu yerda avtomatik yangilanadi.
        </div>
      </div>
    )
  }

  // === ASOSIY RO'YXAT ===
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="text-2xl lg:text-3xl font-bold">Kurslar</h1><p className="text-muted-foreground text-sm mt-1">{items.length} kurs · batafsil uchun kursni bosing</p></div>
        <PrimaryButton onClick={() => { setEditing(null); setForm({ name: '', description: '', duration_months: 3, price: 0 }); setOpenModal(true) }}><Plus className="w-4 h-4" /> Yangi kurs</PrimaryButton>
      </div>
      {loading ? <PanelLoader /> : items.length === 0 ? <Card><EmptyState title="Kurslar yo'q" description="Birinchi kursingizni yarating." /></Card> : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((c) => {
            const groupCount = groups.filter((g) => g.course_id === c.id).length
            const studentCount = students.filter((s) => s.course_id === c.id && s.status === 'active').length
            return (
              <Card key={c.id}>
                <div
                  className="p-4 cursor-pointer hover:bg-muted/30 transition-colors"
                  onClick={() => setSelectedCourse(c)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3"><Avatar name={c.name} color="violet" /><div><div className="font-semibold">{c.name}</div><div className="text-xs text-muted-foreground">{c.duration_months} oy</div></div></div>
                    <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                      <IconButton title="Tahrirlash" onClick={() => { setEditing(c); setForm({ name: c.name, description: c.description || '', duration_months: c.duration_months, price: c.price }); setOpenModal(true) }}><Pencil className="w-3.5 h-3.5" /></IconButton>
                      <IconButton title="O'chirish" danger onClick={() => handleDelete(c.id)}><Trash2 className="w-3.5 h-3.5" /></IconButton>
                    </div>
                  </div>
                  {c.description && <p className="mt-3 text-xs text-muted-foreground line-clamp-2">{c.description}</p>}
                  <div className="mt-3 pt-3 border-t border-border/40 grid grid-cols-3 gap-2 text-center">
                    <div><div className="text-base font-bold text-violet-600">{groupCount}</div><div className="text-[10px] text-muted-foreground">guruh</div></div>
                    <div><div className="text-base font-bold text-blue-600">{studentCount}</div><div className="text-[10px] text-muted-foreground">talaba</div></div>
                    <div><div className="text-base font-bold text-amber-600">{formatMoney(c.price).replace(' so\'m', '')}</div><div className="text-[10px] text-muted-foreground">so'm</div></div>
                  </div>
                  <div className="mt-2 flex items-center justify-end">
                    <span className="text-[10px] text-blue-600 font-medium flex items-center gap-1">
                      Batafsil
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6" /></svg>
                    </span>
                  </div>
                </div>
              </Card>
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
            <Field label="Oylik to'lov summasi (so'm)"><input type="number" className="erp-input" value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} placeholder="Masalan: 300000" /></Field>
          </div>
          <p className="text-xs text-muted-foreground">Bu summa To'lovlar bo'limida avtomatik hisob-kitob uchun ishlatiladi. Talaba qabul qilingan kundan boshlab har oy shu summa hisoblanadi.</p>
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
