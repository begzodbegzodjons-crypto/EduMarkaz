'use client'
import { useEffect, useState, useCallback, useMemo } from 'react'
import { motion } from 'framer-motion'
import { useUser, apiFetch, formatDate, formatDateTime, formatMoney } from '@/lib/client'
import {
  Users, Wallet, Calendar, BarChart3, BookOpen, UserCog, LayoutDashboard,
  Plus, Trash2, Pencil, Search, Sparkles, CheckCircle, Star, TrendingUp,
  TrendingDown, FileText, Bell, KeyRound, ClipboardCheck, TelegramIcon,
  Crown, Phone, Settings as SettingsIcon, CreditCard,
} from '@/components/icons'
import {
  Card, CardHeader, EmptyState, Modal, PrimaryButton, GhostButton, IconButton,
  PanelLoader, Field, Avatar, Row, StatCard,
} from './panels-common'

const TELEGRAM_HANDLE = process.env.NEXT_PUBLIC_TELEGRAM_HANDLE || 'norinkomp'
const TELEGRAM_URL = process.env.NEXT_PUBLIC_TELEGRAM_URL || `https://t.me/${TELEGRAM_HANDLE}`

// ============================================================================
//  DASHBOARD PANEL
// ============================================================================
export function DashboardPanel({ user, setActiveTab }: { user: any; setActiveTab?: (t: string) => void }) {
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiFetch('/api/dashboard').then(({ ok, data }) => {
      if (ok && data) setStats(data.stats)
      setLoading(false)
    })
  }, [])

  if (loading) return <PanelLoader />
  if (!stats) return <div className="text-center text-muted-foreground py-12">Statistikani yuklab bo'lmadi.</div>

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold">Boshqaruv paneli</h1>
        <p className="text-muted-foreground text-sm mt-1">{user.center_name} — umumiy ko'rinish</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Jami talabalar" value={stats.totalStudents} sub={`${stats.activeStudents} faol`} icon={Users} color="emerald" />
        <StatCard label="Lidlar" value={stats.leads.total} sub={`${stats.leads.new} yangi`} icon={Sparkles} color="amber" />
        <StatCard label="Guruhlar" value={stats.totalGroups} sub={`${stats.totalCourses} kurs`} icon={BookOpen} color="teal" />
        <StatCard label="O'qituvchilar" value={stats.totalTeachers} sub="murabbiylar" icon={UserCog} color="cyan" />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Oylik tushum" value={formatMoney(stats.monthRevenue)} sub={`Jami: ${formatMoney(stats.totalRevenue)}`} icon={Wallet} color="emerald" trend="up" />
        <StatCard label="Oylik xarajat" value={formatMoney(stats.monthExpenseTotal)} sub={`Jami: ${formatMoney(stats.totalExpense)}`} icon={TrendingDown} color="rose" trend="down" />
        <StatCard label="Sof foyda (oy)" value={formatMoney(stats.monthNetProfit)} sub={`Jami: ${formatMoney(stats.totalNetProfit)}`} icon={TrendingUp} color={stats.monthNetProfit >= 0 ? 'emerald' : 'rose'} trend={stats.monthNetProfit >= 0 ? 'up' : 'down'} />
        <StatCard label="Davomat darajasi" value={`${stats.attendance.rate}%`} sub={`${stats.attendance.present}/${stats.attendance.total} dars`} icon={ClipboardCheck} color="violet" />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader title="Daromad vs Xarajat" subtitle="So'nggi 6 oy" />
          <div className="p-4 pt-0">
            <DualBarChart data={stats.monthlyRevenue.map((m: any) => ({ label: m.month.slice(5), income: m.total, expense: m.expense }))} />
          </div>
        </Card>
        <Card>
          <CardHeader title="Davomat statistikasi" subtitle={`${stats.attendance.rate}% kelish`} />
          <div className="p-4 pt-0">
            <div className="grid grid-cols-3 gap-3">
              <AttStat label="Keldi" value={stats.attendance.present} color="emerald" />
              <AttStat label="Kelmadi" value={stats.attendance.absent} color="rose" />
              <AttStat label="Kechikdi" value={stats.attendance.late} color="amber" />
            </div>
            <div className="mt-4">
              <div className="text-xs text-muted-foreground mb-1.5">Umumiy kelish foizi</div>
              <div className="h-3 rounded-full bg-muted overflow-hidden">
                <motion.div initial={{ width: 0 }} animate={{ width: `${stats.attendance.rate}%` }} transition={{ duration: 1, ease: 'easeOut' }} className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full" />
              </div>
              <div className="text-right text-xs text-muted-foreground mt-1">{stats.attendance.rate}%</div>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader title="Xarajatlar tarkibi" subtitle="Kategoriya bo'yicha" />
          <div className="p-4 pt-0 space-y-2">
            {Object.entries(stats.expenseByCategory).length === 0 ? (
              <div className="text-sm text-muted-foreground text-center py-6">Xarajatlar yo'q</div>
            ) : (
              Object.entries(stats.expenseByCategory).map(([cat, amount]: any) => (
                <div key={cat} className="flex justify-between items-center px-3 py-2 rounded-lg bg-muted/40">
                  <span className="text-sm font-medium">{cat}</span>
                  <span className="text-sm font-bold text-rose-600">{formatMoney(amount)}</span>
                </div>
              ))
            )}
          </div>
        </Card>
        <Card>
          <CardHeader title="Lidlar funnel" subtitle="Konversiya" />
          <div className="p-4 pt-0 space-y-2">
            <FunnelRow label="Yangi lidlar" value={stats.leads.new} total={stats.leads.total} color="bg-amber-500" />
            <FunnelRow label="Bog'lanilgan" value={stats.leads.contacted} total={stats.leads.total} color="bg-blue-500" />
            <FunnelRow label="Ro'yxatga olingan" value={stats.leads.enrolled} total={stats.leads.total} color="bg-emerald-500" />
          </div>
        </Card>
      </div>

      {user.status === 'trial' && (
        <Card>
          <div className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center"><Sparkles className="w-5 h-5" /></div>
              <div>
                <div className="font-semibold">Bepul sinov muddati — {user.days_left} kun qoldi</div>
                <div className="text-sm text-muted-foreground">Davom etish uchun Litsenziya bo'limidan aktivatsiya kodi oling: @{TELEGRAM_HANDLE}</div>
              </div>
            </div>
            <button onClick={() => setActiveTab?.('license')} className="shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold transition"><KeyRound className="w-4 h-4" /> Litsenziya</button>
          </div>
        </Card>
      )}
    </div>
  )
}

function AttStat({ label, value, color }: { label: string; value: number; color: string }) {
  const map: any = { emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200', rose: 'bg-red-50 text-red-700 border-red-200', amber: 'bg-amber-50 text-amber-700 border-amber-200' }
  return <div className={`rounded-xl border p-3 text-center ${map[color]}`}><div className="text-2xl font-bold">{value}</div><div className="text-xs font-medium">{label}</div></div>
}
function FunnelRow({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0
  return (
    <div>
      <div className="flex justify-between text-xs mb-1"><span>{label}</span><span className="font-semibold">{value} ({pct}%)</span></div>
      <div className="h-2 rounded-full bg-muted overflow-hidden"><div className={`h-full ${color} rounded-full`} style={{ width: `${pct}%` }} /></div>
    </div>
  )
}
function DualBarChart({ data }: { data: { label: string; income: number; expense: number }[] }) {
  const max = Math.max(...data.flatMap((d) => [d.income, d.expense]), 1)
  return (
    <div className="flex items-end gap-2 h-40">
      {data.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
          <div className="text-[10px] text-muted-foreground font-medium">{d.income > 0 ? Math.round(d.income / 1000) + 'k' : ''}</div>
          <div className="w-full flex items-end gap-0.5" style={{ height: '100%' }}>
            <div className="flex-1 bg-muted rounded-t-lg overflow-hidden flex items-end"><motion.div initial={{ height: 0 }} animate={{ height: `${(d.income / max) * 100}%` }} transition={{ duration: 0.6, delay: i * 0.05 }} className="w-full bg-gradient-to-t from-emerald-500 to-teal-400 rounded-t-lg" /></div>
            <div className="flex-1 bg-muted rounded-t-lg overflow-hidden flex items-end"><motion.div initial={{ height: 0 }} animate={{ height: `${(d.expense / max) * 100}%` }} transition={{ duration: 0.6, delay: i * 0.05 + 0.1 }} className="w-full bg-gradient-to-t from-rose-500 to-pink-400 rounded-t-lg" /></div>
          </div>
          <div className="text-[10px] text-muted-foreground">{d.label}</div>
        </div>
      ))}
    </div>
  )
}

// ============================================================================
//  LIDLAR PANEL
// ============================================================================
export function LeadsPanel() {
  const [items, setItems] = useState<any[]>([])
  const [courses, setCourses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [openModal, setOpenModal] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [form, setForm] = useState<any>({ full_name: '', phone: '', source: '', interested_course_id: '', status: 'new', notes: '' })

  const load = useCallback(async () => {
    setLoading(true)
    const [l, c] = await Promise.all([apiFetch(`/api/leads?status=${statusFilter}`), apiFetch('/api/courses')])
    if (l.ok) setItems(l.data?.leads || [])
    if (c.ok) setCourses(c.data?.courses || [])
    setLoading(false)
  }, [statusFilter])

  useEffect(() => { load() }, [load])

  const filtered = items.filter((s) => !search || s.full_name?.toLowerCase().includes(search.toLowerCase()) || s.phone?.includes(search))

  async function handleSave() {
    if (editing) {
      const { ok, error } = await apiFetch('/api/leads', { method: 'PUT', body: JSON.stringify({ id: editing.id, ...form }) })
      if (!ok) return alert(error)
    } else {
      const { ok, error } = await apiFetch('/api/leads', { method: 'POST', body: JSON.stringify(form) })
      if (!ok) return alert(error)
    }
    setOpenModal(false); setEditing(null); load()
  }
  async function handleDelete(id: string) { if (!confirm('O\'chirmoqchimisiz?')) return; const { ok, error } = await apiFetch(`/api/leads?id=${id}`, { method: 'DELETE' }); if (!ok) return alert(error); load() }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="text-2xl lg:text-3xl font-bold">Lidlar</h1><p className="text-muted-foreground text-sm mt-1">{items.length} potensial talaba</p></div>
        <PrimaryButton onClick={() => { setEditing(null); setForm({ full_name: '', phone: '', source: '', interested_course_id: '', status: 'new', notes: '' }); setOpenModal(true) }}><Plus className="w-4 h-4" /> Yangi lid</PrimaryButton>
      </div>
      <div className="flex gap-2 flex-wrap">
        <div className="flex items-center gap-2 px-3 py-2 bg-card rounded-xl border border-border/50 flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-muted-foreground" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Ism yoki telefon bo'yicha..." className="flex-1 bg-transparent outline-none text-sm" />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-2 rounded-xl border border-border/50 text-sm bg-card">
          <option value="all">Barchasi</option><option value="new">Yangi</option><option value="contacted">Bog'lanilgan</option><option value="visited">Tashrif</option><option value="enrolled">Ro'yxatga olingan</option><option value="rejected">Rad etilgan</option>
        </select>
      </div>
      {loading ? <PanelLoader /> : filtered.length === 0 ? <Card><EmptyState title="Lidlar yo'q" description="Birinchi potensial talabangizni qo'shing." /></Card> : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((s) => (
            <motion.div key={s.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <Card><div className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3 min-w-0"><Avatar name={s.full_name} color="amber" /><div className="min-w-0"><div className="font-semibold truncate">{s.full_name}</div><div className="text-xs text-muted-foreground truncate">{s.phone || '—'}</div></div></div>
                  <div className="flex gap-1">
                    <IconButton title="Tahrirlash" onClick={() => { setEditing(s); setForm({ full_name: s.full_name, phone: s.phone || '', source: s.source || '', interested_course_id: s.interested_course_id || '', status: s.status, notes: s.notes || '' }); setOpenModal(true) }}><Pencil className="w-3.5 h-3.5" /></IconButton>
                    <IconButton title="O'chirish" danger onClick={() => handleDelete(s.id)}><Trash2 className="w-3.5 h-3.5" /></IconButton>
                  </div>
                </div>
                <div className="mt-3 space-y-1.5 text-xs">
                  {s.source && <Row label="Manba" value={s.source} />}
                  {s.course && <Row label="Qiziqqan kurs" value={s.course.name} />}
                </div>
                <div className="mt-3 pt-3 border-t border-border/40"><LeadStatusChip status={s.status} /></div>
              </div></Card>
            </motion.div>
          ))}
        </div>
      )}
      <Modal open={openModal} onClose={() => setOpenModal(false)} title={editing ? 'Lidni tahrirlash' : 'Yangi lid'}>
        <div className="space-y-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="F.I.O *"><input className="erp-input" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></Field>
            <Field label="Telefon"><input className="erp-input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Manba"><input className="erp-input" value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} placeholder="Reklama, tanish, ijtimoiy tarmoq" /></Field>
            <Field label="Holat"><select className="erp-input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}><option value="new">Yangi</option><option value="contacted">Bog'lanilgan</option><option value="visited">Tashrif buyurgan</option><option value="enrolled">Ro'yxatga olingan</option><option value="rejected">Rad etilgan</option></select></Field>
          </div>
          <Field label="Qiziqqan kurs"><select className="erp-input" value={form.interested_course_id} onChange={(e) => setForm({ ...form, interested_course_id: e.target.value })}><option value="">— Tanlang —</option>{courses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>
          <Field label="Izoh"><textarea className="erp-input" rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field>
          <div className="flex gap-2 pt-2"><PrimaryButton onClick={handleSave} className="flex-1">Saqlash</PrimaryButton><GhostButton onClick={() => setOpenModal(false)}>Bekor</GhostButton></div>
        </div>
      </Modal>
    </div>
  )
}
function LeadStatusChip({ status }: { status: string }) {
  const map: any = { new: { label: 'Yangi', cls: 'bg-amber-100 text-amber-700' }, contacted: { label: 'Bog\'lanilgan', cls: 'bg-blue-100 text-blue-700' }, visited: { label: 'Tashrif', cls: 'bg-violet-100 text-violet-700' }, enrolled: { label: 'Ro\'yxatga olingan', cls: 'bg-emerald-100 text-emerald-700' }, rejected: { label: 'Rad etilgan', cls: 'bg-red-100 text-red-700' } }
  const s = map[status] || map.new
  return <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${s.cls}`}>{s.label}</span>
}

// ============================================================================
//  TALABALAR PANEL
// ============================================================================
export function StudentsPanel() {
  const [items, setItems] = useState<any[]>([])
  const [groups, setGroups] = useState<any[]>([])
  const [courses, setCourses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [courseFilter, setCourseFilter] = useState('all')
  const [groupFilter, setGroupFilter] = useState('all')
  const [openModal, setOpenModal] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [form, setForm] = useState<any>({ full_name: '', phone: '', parent_phone: '', birth_date: '', address: '', group_id: '', course_id: '', status: 'active', notes: '' })

  const load = useCallback(async () => {
    setLoading(true)
    const [s, g, c] = await Promise.all([apiFetch('/api/students'), apiFetch('/api/groups'), apiFetch('/api/courses')])
    if (s.ok) setItems(s.data?.students || [])
    if (g.ok) setGroups(g.data?.groups || [])
    if (c.ok) setCourses(c.data?.courses || [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const filteredGroups = useMemo(() => courseFilter === 'all' ? groups : groups.filter((g) => g.course_id === courseFilter), [groups, courseFilter])
  const filtered = useMemo(() => items.filter((s) => {
    if (courseFilter !== 'all' && s.course_id !== courseFilter) return false
    if (groupFilter !== 'all' && s.group_id !== groupFilter) return false
    if (search && !s.full_name?.toLowerCase().includes(search.toLowerCase()) && !s.phone?.includes(search)) return false
    return true
  }), [items, courseFilter, groupFilter, search])

  async function handleSave() {
    if (editing) {
      const { ok, error } = await apiFetch('/api/students', { method: 'PUT', body: JSON.stringify({ id: editing.id, ...form }) })
      if (!ok) return alert(error)
    } else {
      const { ok, error } = await apiFetch('/api/students', { method: 'POST', body: JSON.stringify(form) })
      if (!ok) return alert(error)
    }
    setOpenModal(false); setEditing(null); load()
  }
  async function handleDelete(id: string) { if (!confirm('O\'chirmoqchimisiz?')) return; const { ok, error } = await apiFetch(`/api/students?id=${id}`, { method: 'DELETE' }); if (!ok) return alert(error); load() }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="text-2xl lg:text-3xl font-bold">Talabalar</h1><p className="text-muted-foreground text-sm mt-1">{filtered.length} talaba</p></div>
        <PrimaryButton onClick={() => { setEditing(null); setForm({ full_name: '', phone: '', parent_phone: '', birth_date: '', address: '', group_id: '', course_id: '', status: 'active', notes: '' }); setOpenModal(true) }}><Plus className="w-4 h-4" /> Yangi talaba</PrimaryButton>
      </div>
      <div className="flex gap-2 flex-wrap">
        <div className="flex items-center gap-2 px-3 py-2 bg-card rounded-xl border border-border/50 flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-muted-foreground" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Ism yoki telefon bo'yicha..." className="flex-1 bg-transparent outline-none text-sm" />
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
      {loading ? <PanelLoader /> : filtered.length === 0 ? <Card><EmptyState title="Talabalar topilmadi" description="Filtrlarni o'zgartiring yoki yangi talaba qo'shing." /></Card> : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((s) => (
            <motion.div key={s.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <Card><div className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3 min-w-0"><Avatar name={s.full_name} /><div className="min-w-0"><div className="font-semibold truncate">{s.full_name}</div><div className="text-xs text-muted-foreground truncate">{s.phone || '—'}</div></div></div>
                  <div className="flex gap-1">
                    <IconButton title="Tahrirlash" onClick={() => { setEditing(s); setForm({ full_name: s.full_name, phone: s.phone || '', parent_phone: s.parent_phone || '', birth_date: s.birth_date || '', address: s.address || '', group_id: s.group_id || '', course_id: s.course_id || '', status: s.status, notes: s.notes || '' }); setOpenModal(true) }}><Pencil className="w-3.5 h-3.5" /></IconButton>
                    <IconButton title="O'chirish" danger onClick={() => handleDelete(s.id)}><Trash2 className="w-3.5 h-3.5" /></IconButton>
                  </div>
                </div>
                <div className="mt-3 space-y-1.5 text-xs">
                  {s.group && <Row label="Guruh" value={s.group.name} />}
                  {s.course && <Row label="Kurs" value={s.course.name} />}
                  {s.parent_phone && <Row label="Ota-ona" value={s.parent_phone} />}
                </div>
                <div className="mt-3 pt-3 border-t border-border/40 flex items-center justify-between"><StatusChip status={s.status} /><span className="text-[10px] text-muted-foreground">{formatDate(s.enrollment_date)}</span></div>
              </div></Card>
            </motion.div>
          ))}
        </div>
      )}
      <Modal open={openModal} onClose={() => setOpenModal(false)} title={editing ? 'Talabani tahrirlash' : 'Yangi talaba'} size="lg">
        <div className="space-y-3">
          <Field label="F.I.O *"><input className="erp-input" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></Field>
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Telefon"><input className="erp-input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
            <Field label="Ota-ona telefoni"><input className="erp-input" value={form.parent_phone} onChange={(e) => setForm({ ...form, parent_phone: e.target.value })} /></Field>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Kurs"><select className="erp-input" value={form.course_id} onChange={(e) => setForm({ ...form, course_id: e.target.value, group_id: '' })}><option value="">— Tanlang —</option>{courses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>
            <Field label="Guruh"><select className="erp-input" value={form.group_id} onChange={(e) => setForm({ ...form, group_id: e.target.value })}><option value="">— Tanlang —</option>{groups.filter((g) => !form.course_id || g.course_id === form.course_id).map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}</select></Field>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Tug'ilgan sana"><input type="date" className="erp-input" value={form.birth_date} onChange={(e) => setForm({ ...form, birth_date: e.target.value })} /></Field>
            <Field label="Holat"><select className="erp-input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}><option value="active">Faol</option><option value="paused">To'xtatilgan</option><option value="graduated">Bitirgan</option><option value="left">Ketgan</option></select></Field>
          </div>
          <Field label="Manzil"><input className="erp-input" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></Field>
          <Field label="Izoh"><textarea className="erp-input" rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field>
          <div className="flex gap-2 pt-2"><PrimaryButton onClick={handleSave} className="flex-1">Saqlash</PrimaryButton><GhostButton onClick={() => setOpenModal(false)}>Bekor</GhostButton></div>
        </div>
      </Modal>
    </div>
  )
}
function StatusChip({ status }: { status: string }) {
  const map: any = { active: { label: 'Faol', cls: 'bg-emerald-100 text-emerald-700' }, paused: { label: 'To\'xtatilgan', cls: 'bg-amber-100 text-amber-700' }, graduated: { label: 'Bitirgan', cls: 'bg-blue-100 text-blue-700' }, left: { label: 'Ketgan', cls: 'bg-red-100 text-red-700' } }
  const s = map[status] || map.active
  return <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${s.cls}`}>{s.label}</span>
}
