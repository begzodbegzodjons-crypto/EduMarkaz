'use client'
import { useEffect, useState, useCallback, useMemo } from 'react'
import { motion } from 'framer-motion'
import { useUser, apiFetch, formatDate, formatDateTime, formatMoney } from '@/lib/client'
import { exportToExcel } from '@/lib/excel-export'
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
        <StatCard label="Jami talabalar" value={stats.totalStudents} sub={`${stats.activeStudents} faol`} icon={Users} color="indigo" onClick={() => setActiveTab?.('students')} />
        <StatCard label="Lidlar" value={stats.leads.total} sub={`${stats.leads.new} yangi`} icon={Sparkles} color="amber" onClick={() => setActiveTab?.('leads')} />
        <StatCard label="Guruhlar" value={stats.totalGroups} sub={`${stats.totalCourses} kurs`} icon={BookOpen} color="sky" onClick={() => setActiveTab?.('groups')} />
        <StatCard label="O'qituvchilar" value={stats.totalTeachers} sub="murabbiylar" icon={UserCog} color="cyan" onClick={() => setActiveTab?.('teachers')} />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Oylik tushum" value={formatMoney(stats.monthRevenue)} sub={`Jami: ${formatMoney(stats.totalRevenue)}`} icon={Wallet} color="blue" trend="up" onClick={() => setActiveTab?.('payments')} />
        <StatCard label="Oylik xarajat" value={formatMoney(stats.monthExpenseTotal)} sub={`Jami: ${formatMoney(stats.totalExpense)}`} icon={TrendingDown} color="rose" trend="down" onClick={() => setActiveTab?.('expenses')} />
        <StatCard label="Sof foyda (oy)" value={formatMoney(stats.monthNetProfit)} sub={`Jami: ${formatMoney(stats.totalNetProfit)}`} icon={TrendingUp} color={stats.monthNetProfit >= 0 ? 'sky' : 'rose'} trend={stats.monthNetProfit >= 0 ? 'up' : 'down'} onClick={() => setActiveTab?.('finance')} />
        <StatCard label="Davomat darajasi" value={`${stats.attendance.rate}%`} sub={`${stats.attendance.present}/${stats.attendance.total} dars`} icon={ClipboardCheck} color="violet" onClick={() => setActiveTab?.('attendance')} />
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
                <motion.div initial={{ width: 0 }} animate={{ width: `${stats.attendance.rate}%` }} transition={{ duration: 1, ease: 'easeOut' }} className="h-full bg-gradient-to-r from-slate-600 to-slate-600 rounded-full" />
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
                  <span className="text-sm font-bold text-indigo-700">{formatMoney(amount)}</span>
                </div>
              ))
            )}
          </div>
        </Card>
        <Card>
          <CardHeader title="Lidlar funnel" subtitle="Konversiya" />
          <div className="p-4 pt-0 space-y-2">
            <FunnelRow label="Yangi lidlar" value={stats.leads.new} total={stats.leads.total} color="bg-slate-600" />
            <FunnelRow label="Bog'lanilgan" value={stats.leads.contacted} total={stats.leads.total} color="bg-slate-700" />
            <FunnelRow label="Ro'yxatga olingan" value={stats.leads.enrolled} total={stats.leads.total} color="bg-slate-600" />
          </div>
        </Card>
      </div>

      {user.status === 'trial' && (
        <Card>
          <div className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center"><Sparkles className="w-5 h-5" /></div>
              <div>
                <div className="font-semibold">Bepul sinov muddati — {user.days_left} kun qoldi</div>
                <div className="text-sm text-muted-foreground">Davom etish uchun Litsenziya bo'limidan aktivatsiya kodi oling: @{TELEGRAM_HANDLE}</div>
              </div>
            </div>
            <button onClick={() => setActiveTab?.('license')} className="shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-600 hover:bg-slate-700 text-white text-sm font-semibold transition"><KeyRound className="w-4 h-4" /> Litsenziya</button>
          </div>
        </Card>
      )}
    </div>
  )
}

function AttStat({ label, value, color }: { label: string; value: number; color: string }) {
  const map: any = { emerald: 'bg-slate-50 text-indigo-700 border-slate-200', rose: 'bg-slate-50 text-red-700 border-slate-200', amber: 'bg-slate-50 text-indigo-700 border-slate-200' }
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
  if (!data || data.length === 0) {
    return (
      <div className="h-40 flex items-center justify-center text-sm text-muted-foreground">
        Hozircha ma'lumot yo'q
      </div>
    )
  }

  const max = Math.max(...data.flatMap((d) => [d.income, d.expense]), 1)
  const hasData = data.some((d) => d.income > 0 || d.expense > 0)

  if (!hasData) {
    return (
      <div className="h-40 flex flex-col items-center justify-center text-center">
        <div className="text-sm text-muted-foreground">Hozircha daromad va xarajatlar ma'lumotlari yo'q</div>
        <div className="text-xs text-muted-foreground/70 mt-1">To'lovlar va xarajatlar qo'shilganda diagramma ko'rinadi</div>
      </div>
    )
  }

  // SVG line chart sozlamalari
  const W = 460, H = 170, PAD_L = 35, PAD_R = 15, PAD_T = 15, PAD_B = 30
  const chartW = W - PAD_L - PAD_R
  const chartH = H - PAD_T - PAD_B
  const stepX = data.length > 1 ? chartW / (data.length - 1) : 0

  // Nuqtalar
  const incomePts = data.map((d, i) => ({
    x: PAD_L + i * stepX,
    y: PAD_T + chartH - (d.income / max) * chartH,
    val: d.income
  }))
  const expensePts = data.map((d, i) => ({
    x: PAD_L + i * stepX,
    y: PAD_T + chartH - (d.expense / max) * chartH,
    val: d.expense
  }))

  // Smooth curve path
  function smoothPath(pts: { x: number; y: number }[]) {
    if (pts.length < 2) return pts.length === 1 ? `M ${pts[0].x},${pts[0].y}` : ''
    let p = `M ${pts[0].x},${pts[0].y}`
    for (let i = 1; i < pts.length; i++) {
      const cx1 = pts[i - 1].x + stepX * 0.4
      const cy1 = pts[i - 1].y
      const cx2 = pts[i].x - stepX * 0.4
      const cy2 = pts[i].y
      p += ` C ${cx1},${cy1} ${cx2},${cy2} ${pts[i].x},${pts[i].y}`
    }
    return p
  }

  const incomeLine = smoothPath(incomePts)
  const expenseLine = smoothPath(expensePts)
  const incomeArea = incomeLine + ` L ${incomePts[incomePts.length - 1].x},${PAD_T + chartH} L ${incomePts[0].x},${PAD_T + chartH} Z`
  const expenseArea = expenseLine + ` L ${expensePts[expensePts.length - 1].x},${PAD_T + chartH} L ${expensePts[0].x},${PAD_T + chartH} Z`

  return (
    <div className="w-full">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: '220px' }}>
        <defs>
          <linearGradient id="incGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#4f46e5" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#4f46e5" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="expGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#94a3b8" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#94a3b8" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Grid */}
        {[0, 0.25, 0.5, 0.75, 1].map((p, i) => (
          <line key={i} x1={PAD_L} y1={PAD_T + p * chartH} x2={W - PAD_R} y2={PAD_T + p * chartH}
            stroke="currentColor" strokeWidth="0.5" opacity="0.08" />
        ))}

        {/* Y o'qi belgilari */}
        <text x="2" y={PAD_T + 4} fontSize="9" fill="currentColor" opacity="0.5">{Math.round(max / 1000)}k</text>
        <text x="2" y={PAD_T + chartH * 0.5 + 4} fontSize="9" fill="currentColor" opacity="0.5">{Math.round(max / 2000)}k</text>
        <text x="8" y={PAD_T + chartH + 4} fontSize="9" fill="currentColor" opacity="0.5">0</text>

        {/* Xarajat area + line */}
        <path d={expenseArea} fill="url(#expGrad)" />
        <path d={expenseLine} fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

        {/* Daromad area + line */}
        <path d={incomeArea} fill="url(#incGrad)" />
        <path d={incomeLine} fill="none" stroke="#4f46e5" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

        {/* Daromad nuqtalar */}
        {incomePts.map((p, i) => p.val > 0 && (
          <g key={`inc-${i}`}>
            <circle cx={p.x} cy={p.y} r="3.5" fill="#fff" stroke="#4f46e5" strokeWidth="2" />
            <text x={p.x} y={p.y - 8} fontSize="8" fill="#4f46e5" textAnchor="middle" fontWeight="bold">{Math.round(p.val / 1000)}k</text>
          </g>
        ))}

        {/* Xarajat nuqtalar */}
        {expensePts.map((p, i) => p.val > 0 && (
          <g key={`exp-${i}`}>
            <circle cx={p.x} cy={p.y} r="3" fill="#fff" stroke="#94a3b8" strokeWidth="1.5" />
          </g>
        ))}

        {/* X o'qi belgilari */}
        {data.map((d, i) => (
          <text key={i} x={PAD_L + i * stepX} y={H - 5} fontSize="9" fill="currentColor" opacity="0.6" textAnchor="middle">{d.label}</text>
        ))}
      </svg>

      {/* Legenda */}
      <div className="flex items-center gap-4 justify-center mt-2 text-xs">
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-0.5 rounded bg-indigo-600" />
          <span className="text-muted-foreground">Daromad</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-0.5 rounded bg-slate-400" />
          <span className="text-muted-foreground">Xarajat</span>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
//  LIDLAR PANEL
// ============================================================================
export function LeadsPanel() {
  const [items, setItems] = useState<any[]>([])
  const [courses, setCourses] = useState<any[]>([])
  const [allGroups, setAllGroups] = useState<any[]>([]) // barcha guruhlar (kurs bo'yicha filtrlash uchun)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [openModal, setOpenModal] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [form, setForm] = useState<any>({ full_name: '', phone: '', source: '', interested_course_id: '', status: 'new', notes: '' })

  // Qabul qilish modali uchun state
  const [acceptModal, setAcceptModal] = useState(false)
  const [acceptingLead, setAcceptingLead] = useState<any>(null)
  const [acceptForm, setAcceptForm] = useState<{ course_id: string; group_id: string }>({ course_id: '', group_id: '' })
  const [accepting, setAccepting] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const [l, c, g] = await Promise.all([
      apiFetch(`/api/leads?status=${statusFilter}`),
      apiFetch('/api/courses'),
      apiFetch('/api/groups'),
    ])
    if (l.ok) setItems(l.data?.leads || [])
    if (c.ok) setCourses(c.data?.courses || [])
    if (g.ok) setAllGroups(g.data?.groups || [])
    setLoading(false)
  }, [statusFilter])

  useEffect(() => { load() }, [load])

  const filtered = items.filter((s) => !search || s.full_name?.toLowerCase().includes(search.toLowerCase()) || s.phone?.includes(search))

  // Qabul qilish modali uchun: tanlangan kursga mos guruhlar
  const acceptGroups = useMemo(() => {
    if (!acceptForm.course_id) return []
    return allGroups.filter((g) => g.course_id === acceptForm.course_id)
  }, [acceptForm.course_id, allGroups])

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

  // === YANGI: Lidni talabaga aylantirish (Qabul qilish) ===
  function openAcceptModal(lead: any) {
    setAcceptingLead(lead)
    // Agar lidning qiziqqan kursi bo'lsa, avtomatik tanlab qo'yamiz
    setAcceptForm({
      course_id: lead.interested_course_id || '',
      group_id: '',
    })
    setAcceptModal(true)
  }

  async function handleAccept() {
    if (!acceptingLead) return
    if (!acceptForm.course_id) return alert('Iltimos, kursni tanlang.')
    if (!acceptForm.group_id) return alert('Iltimos, guruhni tanlang.')

    setAccepting(true)
    const { ok, error, data } = await apiFetch('/api/leads/accept', {
      method: 'POST',
      body: JSON.stringify({
        lead_id: acceptingLead.id,
        course_id: acceptForm.course_id,
        group_id: acceptForm.group_id,
      }),
    })
    setAccepting(false)

    if (!ok) {
      alert(error || 'Qabul qilishda xatolik yuz berdi.')
      return
    }

    alert(`${acceptingLead.full_name} muvaffaqiyatli talabalar ro'yxatiga qo'shildi!`)
    setAcceptModal(false)
    setAcceptingLead(null)
    setAcceptForm({ course_id: '', group_id: '' })
    load()
  }

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
                <div className="mt-3 pt-3 border-t border-border/40 flex items-center justify-between gap-2">
                  <LeadStatusChip status={s.status} />
                  <button
                    onClick={() => openAcceptModal(s)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors shadow-sm"
                    title="Lidni talabalar ro'yxatiga qo'shish"
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    Qabul qilish
                  </button>
                </div>
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

      {/* === YANGI: Qabul qilish modali === */}
      <Modal
        open={acceptModal}
        onClose={() => { if (!accepting) { setAcceptModal(false); setAcceptingLead(null) } }}
        title={acceptingLead ? `Qabul qilish: ${acceptingLead.full_name}` : 'Qabul qilish'}
      >
        <div className="space-y-4">
          {acceptingLead && (
            <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-sm">
              <div className="font-semibold text-amber-900">{acceptingLead.full_name}</div>
              {acceptingLead.phone && <div className="text-amber-700 text-xs mt-0.5">Telefon: {acceptingLead.phone}</div>}
              {acceptingLead.course && <div className="text-amber-700 text-xs">Qiziqqan kurs: {acceptingLead.course.name}</div>}
            </div>
          )}

          <div className="space-y-3">
            <Field label="Kursni tanlang *">
              <select
                className="erp-input"
                value={acceptForm.course_id}
                onChange={(e) => setAcceptForm({ course_id: e.target.value, group_id: '' })}
                disabled={accepting}
              >
                <option value="">— Tanlang —</option>
                {courses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>

            <Field label="Guruhni tanlang *">
              <select
                className="erp-input"
                value={acceptForm.group_id}
                onChange={(e) => setAcceptForm({ ...acceptForm, group_id: e.target.value })}
                disabled={accepting || !acceptForm.course_id}
              >
                <option value="">— Tanlang —</option>
                {acceptGroups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                {acceptForm.course_id && acceptGroups.length === 0 && (
                  <option value="" disabled>Bu kurs uchun guruhlar yo'q</option>
                )}
              </select>
              {acceptForm.course_id && acceptGroups.length === 0 && (
                <p className="text-xs text-red-600 mt-1">
                  Bu kurs uchun guruhlar mavjud emas. Avval &quot;Guruhlar&quot; bo'limida yangi guruh qo'shing.
                </p>
              )}
            </Field>
          </div>

          <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 text-xs text-blue-800">
            <strong>Eslatma:</strong> Qabul qilingan lid &quot;Talabalar&quot; ro'yxatiga o&apos;tadi va &quot;Lidlar&quot; ro&apos;yxatidan o&apos;chiriladi.
          </div>

          <div className="flex gap-2 pt-2">
            <PrimaryButton onClick={handleAccept} className="flex-1" disabled={accepting || !acceptForm.course_id || !acceptForm.group_id}>
              {accepting ? 'Qabul qilinmoqda...' : 'Qabul qilish'}
            </PrimaryButton>
            <GhostButton onClick={() => { if (!accepting) { setAcceptModal(false); setAcceptingLead(null) } }}>
              Bekor
            </GhostButton>
          </div>
        </div>
      </Modal>
      {/* === END: Qabul qilish modali === */}
    </div>
  )
}
function LeadStatusChip({ status }: { status: string }) {
  const map: any = { new: { label: 'Yangi', cls: 'bg-indigo-100 text-indigo-700' }, contacted: { label: 'Bog\'lanilgan', cls: 'bg-indigo-100 text-indigo-700' }, visited: { label: 'Tashrif', cls: 'bg-indigo-100 text-indigo-700' }, enrolled: { label: 'Ro\'yxatga olingan', cls: 'bg-indigo-100 text-indigo-700' }, rejected: { label: 'Rad etilgan', cls: 'bg-red-100 text-red-700' } }
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
  const [payments, setPayments] = useState<any[]>([])
  const [attendance, setAttendance] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [courseFilter, setCourseFilter] = useState('all')
  const [groupFilter, setGroupFilter] = useState('all')
  const [openModal, setOpenModal] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [form, setForm] = useState<any>({ full_name: '', phone: '', parent_phone: '', birth_date: '', address: '', group_id: '', course_id: '', status: 'active', notes: '' })

  // Detal ko'rinishi uchun
  const [selectedStudent, setSelectedStudent] = useState<any>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const [s, g, c, p, a] = await Promise.all([
      apiFetch('/api/students'),
      apiFetch('/api/groups'),
      apiFetch('/api/courses'),
      apiFetch('/api/payments?limit=1000'),
      apiFetch('/api/attendance'),
    ])
    if (s.ok) setItems(s.data?.students || [])
    if (g.ok) setGroups(g.data?.groups || [])
    if (c.ok) setCourses(c.data?.courses || [])
    if (p.ok) setPayments(p.data?.payments || [])
    if (a.ok) setAttendance(a.data?.attendance || [])
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

  // === Talaba detali uchun hisob-kitob ===
  const studentDetail = useMemo(() => {
    if (!selectedStudent) return null
    const s = selectedStudent
    const course = courses.find((c) => c.id === s.course_id)
    const group = groups.find((g) => g.id === s.group_id)
    const monthlyFee = Number(course?.price || 0)
    const enrollDate = s.enrollment_date ? new Date(s.enrollment_date) : new Date()
    const now = new Date()
    const monthsEnrolled = Math.max(1, (now.getFullYear() - enrollDate.getFullYear()) * 12 + (now.getMonth() - enrollDate.getMonth()) + 1)
    const totalDue = monthlyFee * monthsEnrolled

    const studentPayments = payments.filter((p) => p.student_id === s.id)
    const totalPaid = studentPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0)
    const remaining = Math.max(0, totalDue - totalPaid)

    const studentAttendance = attendance.filter((a) => a.student_id === s.id)
    const present = studentAttendance.filter((a) => a.status === 'present').length
    const absent = studentAttendance.filter((a) => a.status === 'absent').length
    const late = studentAttendance.filter((a) => a.status === 'late').length
    const attRate = studentAttendance.length > 0 ? Math.round((present / studentAttendance.length) * 100) : 0

    return { course, group, monthlyFee, monthsEnrolled, totalDue, totalPaid, remaining, studentPayments, studentAttendance, present, absent, late, attRate }
  }, [selectedStudent, courses, groups, payments, attendance])

  const WEEKDAYS = ['Yakshanba', 'Dushanba', 'Seshanba', 'Chorshanba', 'Payshanba', 'Juma', 'Shanba']

  // === DETAL KO'RINISHI ===
  if (selectedStudent && studentDetail) {
    const s = selectedStudent
    const d = studentDetail
    return (
      <div className="space-y-5">
        {/* Orqaga qaytish */}
        <div className="flex items-center gap-3">
          <button onClick={() => setSelectedStudent(null)} className="p-2 rounded-lg hover:bg-muted text-muted-foreground" title="Talabalarga qaytish">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg>
          </button>
          <div className="flex items-center gap-3">
            <Avatar name={s.full_name} />
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold">{s.full_name}</h1>
              <p className="text-muted-foreground text-sm mt-0.5">{d.course?.name || '—'} · {d.group?.name || '—'}</p>
            </div>
          </div>
        </div>

        {/* 1. Asosiy ma'lumotlar */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-card rounded-2xl border border-border p-3"><div className="text-[10px] text-muted-foreground">Telefon</div><div className="text-sm font-semibold mt-0.5">{s.phone || '—'}</div></div>
          <div className="bg-card rounded-2xl border border-border p-3"><div className="text-[10px] text-muted-foreground">Ota-ona telefoni</div><div className="text-sm font-semibold mt-0.5">{s.parent_phone || '—'}</div></div>
          <div className="bg-card rounded-2xl border border-border p-3"><div className="text-[10px] text-muted-foreground">Qabul sanasi</div><div className="text-sm font-semibold mt-0.5">{formatDate(s.enrollment_date)}</div></div>
          <div className="bg-card rounded-2xl border border-border p-3"><div className="text-[10px] text-muted-foreground">Tug'ilgan sana</div><div className="text-sm font-semibold mt-0.5">{formatDate(s.birth_date)}</div></div>
        </div>

        {/* 2. Statistika */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-indigo-50 rounded-2xl border border-indigo-200 p-3"><div className="text-[10px] text-indigo-700">O'tgan oylar</div><div className="text-2xl font-bold mt-0.5 text-indigo-900">{d.monthsEnrolled}</div></div>
          <div className="bg-amber-50 rounded-2xl border border-amber-200 p-3"><div className="text-[10px] text-amber-700">Oylik to'lov</div><div className="text-lg font-bold mt-0.5 text-amber-900">{formatMoney(d.monthlyFee)}</div></div>
          <div className="bg-rose-50 rounded-2xl border border-rose-200 p-3"><div className="text-[10px] text-rose-700">Qoldiq (qarz)</div><div className="text-lg font-bold mt-0.5 text-rose-900">{formatMoney(d.remaining)}</div></div>
          <div className="bg-emerald-50 rounded-2xl border border-emerald-200 p-3"><div className="text-[10px] text-emerald-700">Davomat darajasi</div><div className="text-2xl font-bold mt-0.5 text-emerald-900">{d.attRate}%</div></div>
        </div>

        {/* 3. Moliyaviy ma'lumot */}
        <Card>
          <CardHeader title="Moliyaviy ma'lumot" subtitle={`To'lash kerak: ${formatMoney(d.totalDue)} · To'langan: ${formatMoney(d.totalPaid)}`} />
          <div className="p-4 pt-0 grid grid-cols-3 gap-3">
            <div className="bg-amber-50 rounded-xl border border-amber-200 p-3 text-center">
              <div className="text-[10px] text-amber-700">To'lash kerak</div>
              <div className="text-lg font-bold mt-1 text-amber-900">{formatMoney(d.totalDue)}</div>
            </div>
            <div className="bg-emerald-50 rounded-xl border border-emerald-200 p-3 text-center">
              <div className="text-[10px] text-emerald-700">To'langan</div>
              <div className="text-lg font-bold mt-1 text-emerald-900">{formatMoney(d.totalPaid)}</div>
            </div>
            <div className="bg-rose-50 rounded-xl border border-rose-200 p-3 text-center">
              <div className="text-[10px] text-rose-700">Qoldiq</div>
              <div className="text-lg font-bold mt-1 text-rose-900">{formatMoney(d.remaining)}</div>
            </div>
          </div>
        </Card>

        {/* 4. To'lovlar tarixi */}
        <Card>
          <CardHeader title="To'lovlar tarixi" subtitle={`${d.studentPayments.length} ta to'lov`} />
          {d.studentPayments.length === 0 ? (
            <EmptyState title="To'lovlar yo'q" description="Bu talaba uchun hali to'lov kiritilmagan." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-xs text-muted-foreground">
                    <th className="text-left px-4 py-2 font-medium">#</th>
                    <th className="text-left px-4 py-2 font-medium">Sana</th>
                    <th className="text-right px-4 py-2 font-medium">Summa</th>
                    <th className="text-left px-4 py-2 font-medium">Turi</th>
                    <th className="text-left px-4 py-2 font-medium">Oy</th>
                    <th className="text-left px-4 py-2 font-medium">Izoh</th>
                  </tr>
                </thead>
                <tbody>
                  {d.studentPayments.map((p, idx) => {
                    const dt = p.created_at ? new Date(p.created_at) : new Date(p.payment_date)
                    return (
                      <tr key={p.id} className="border-b border-border/20 hover:bg-muted/40">
                        <td className="px-4 py-2 text-muted-foreground text-xs">{idx + 1}</td>
                        <td className="px-4 py-2">
                          <div className="font-medium text-xs">{formatDate(p.payment_date)}</div>
                          <div className="text-[10px] text-muted-foreground">{dt.toLocaleDateString('uz-UZ')} · {dt.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })}</div>
                        </td>
                        <td className="px-4 py-2 text-right font-bold text-emerald-600">{formatMoney(p.amount)}</td>
                        <td className="px-4 py-2 text-xs">{p.payment_type === 'cash' ? 'Naqd' : p.payment_type === 'card' ? 'Karta' : p.payment_type === 'transfer' ? 'O\'tkazma' : p.payment_type}</td>
                        <td className="px-4 py-2 text-muted-foreground text-xs">{p.for_month || '—'}</td>
                        <td className="px-4 py-2 text-muted-foreground text-xs">{p.description || '—'}</td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-border bg-muted/30 font-bold">
                    <td colSpan={2} className="px-4 py-2 text-right">Jami:</td>
                    <td className="px-4 py-2 text-right text-emerald-600">{formatMoney(d.totalPaid)}</td>
                    <td colSpan={3}></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </Card>

        {/* 5. Davomat */}
        <Card>
          <CardHeader title="Davomat" subtitle={`${d.studentAttendance.length} ta dars · Keldi: ${d.present} · Kelmadi: ${d.absent} · Kechikdi: ${d.late}`} />
          {d.studentAttendance.length === 0 ? (
            <EmptyState title="Davomat yo'q" description="Bu talaba uchun hali davomat belgilanmagan." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-xs text-muted-foreground">
                    <th className="text-left px-4 py-2 font-medium">#</th>
                    <th className="text-left px-4 py-2 font-medium">Sana</th>
                    <th className="text-center px-4 py-2 font-medium">Holat</th>
                  </tr>
                </thead>
                <tbody>
                  {d.studentAttendance.slice(0, 30).map((a, idx) => (
                    <tr key={a.id} className="border-b border-border/20 hover:bg-muted/40">
                      <td className="px-4 py-2 text-muted-foreground text-xs">{idx + 1}</td>
                      <td className="px-4 py-2 font-medium text-xs">{formatDate(a.lesson_date)}</td>
                      <td className="px-4 py-2 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${a.status === 'present' ? 'bg-emerald-100 text-emerald-700' : a.status === 'absent' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                          {a.status === 'present' ? 'Keldi' : a.status === 'absent' ? 'Kelmadi' : 'Kechikdi'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* 6. Qo'shimcha ma'lumotlar */}
        <Card>
          <CardHeader title="Qo'shimcha ma'lumotlar" />
          <div className="p-4 pt-0 space-y-2">
            {s.address && <Row label="Manzil" value={s.address} />}
            <Row label="Holat" value={s.status === 'active' ? 'Faol' : s.status === 'paused' ? 'To\'xtatilgan' : s.status === 'graduated' ? 'Bitirgan' : 'Ketgan'} />
            <Row label="Izoh" value={s.notes || '—'} />
          </div>
        </Card>

        {/* Tahrirlash tugmasi */}
        <div className="flex gap-2">
          <PrimaryButton onClick={() => { setEditing(s); setForm({ full_name: s.full_name, phone: s.phone || '', parent_phone: s.parent_phone || '', birth_date: s.birth_date || '', address: s.address || '', group_id: s.group_id || '', course_id: s.course_id || '', status: s.status, notes: s.notes || '' }); setOpenModal(true) }}>
            <Pencil className="w-4 h-4" /> Tahrirlash
          </PrimaryButton>
        </div>

        {/* Tahrirlash modali */}
        <Modal open={openModal} onClose={() => setOpenModal(false)} title="Talabani tahrirlash" size="lg">
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

  // === ASOSIY RO'YXAT ===
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
<<<<<<< HEAD
        <div><h1 className="text-2xl lg:text-3xl font-bold">Talabalar</h1><p className="text-muted-foreground text-sm mt-1">{filtered.length} talaba</p></div>
        <div className="flex gap-2">
          <GhostButton onClick={() => exportToExcel({
            filename: 'talabalar',
            title: 'Talabalar ro\'yxati',
            headerColor: '#4F46E5',
            columns: [
              { header: '#', key: 'num', width: 40 },
              { header: 'F.I.O', key: 'full_name', width: 200 },
              { header: 'Telefon', key: 'phone', width: 120 },
              { header: 'Ota-ona telefoni', key: 'parent_phone', width: 120 },
              { header: 'Kurs', key: 'course_name', width: 150 },
              { header: 'Guruh', key: 'group_name', width: 150 },
              { header: 'Qabul sanasi', key: 'enrollment_date', width: 100 },
              { header: 'Tug\'ilgan sana', key: 'birth_date', width: 100 },
              { header: 'Manzil', key: 'address', width: 200 },
              { header: 'Holat', key: 'status_label', width: 100 },
              { header: 'Izoh', key: 'notes', width: 200 },
            ],
            data: filtered.map((s, i) => ({
              num: i + 1,
              full_name: s.full_name,
              phone: s.phone || '',
              parent_phone: s.parent_phone || '',
              course_name: s.course?.name || '—',
              group_name: s.group?.name || '—',
              enrollment_date: formatDate(s.enrollment_date),
              birth_date: formatDate(s.birth_date),
              address: s.address || '',
              status_label: s.status === 'active' ? 'Faol' : s.status === 'paused' ? 'To\'xtatilgan' : s.status === 'graduated' ? 'Bitirgan' : 'Ketgan',
              notes: s.notes || '',
            })),
          })}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
            Excel
          </GhostButton>
          <PrimaryButton onClick={() => { setEditing(null); setForm({ full_name: '', phone: '', parent_phone: '', birth_date: '', address: '', group_id: '', course_id: '', status: 'active', notes: '' }); setOpenModal(true) }}><Plus className="w-4 h-4" /> Yangi talaba</PrimaryButton>
        </div>
=======
        <div><h1 className="text-2xl lg:text-3xl font-bold">Talabalar</h1><p className="text-muted-foreground text-sm mt-1">{filtered.length} talaba · batafsil uchun talabani bosing</p></div>
        <PrimaryButton onClick={() => { setEditing(null); setForm({ full_name: '', phone: '', parent_phone: '', birth_date: '', address: '', group_id: '', course_id: '', status: 'active', notes: '' }); setOpenModal(true) }}><Plus className="w-4 h-4" /> Yangi talaba</PrimaryButton>
>>>>>>> 830a08eb24d86d9da8e3041616ea01bc3eca811d
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
              <Card>
                <div className="p-4 cursor-pointer hover:bg-muted/30 transition-colors" onClick={() => setSelectedStudent(s)}>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3 min-w-0"><Avatar name={s.full_name} /><div className="min-w-0"><div className="font-semibold truncate">{s.full_name}</div><div className="text-xs text-muted-foreground truncate">{s.phone || '—'}</div></div></div>
                    <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                      <IconButton title="Tahrirlash" onClick={() => { setEditing(s); setForm({ full_name: s.full_name, phone: s.phone || '', parent_phone: s.parent_phone || '', birth_date: s.birth_date || '', address: s.address || '', group_id: s.group_id || '', course_id: s.course_id || '', status: s.status, notes: s.notes || '' }); setOpenModal(true) }}><Pencil className="w-3.5 h-3.5" /></IconButton>
                      <IconButton title="O'chirish" danger onClick={() => handleDelete(s.id)}><Trash2 className="w-3.5 h-3.5" /></IconButton>
                    </div>
                  </div>
                  <div className="mt-3 space-y-1.5 text-xs">
                    {s.group && <Row label="Guruh" value={s.group.name} />}
                    {s.course && <Row label="Kurs" value={s.course.name} />}
                    {s.parent_phone && <Row label="Ota-ona" value={s.parent_phone} />}
                  </div>
                  <div className="mt-3 pt-3 border-t border-border/40 flex items-center justify-between">
                    <StatusChip status={s.status} />
                    <span className="text-[10px] text-indigo-600 font-medium flex items-center gap-1">
                      Batafsil
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6" /></svg>
                    </span>
                  </div>
                </div>
              </Card>
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
  const map: any = { active: { label: 'Faol', cls: 'bg-indigo-100 text-indigo-700' }, paused: { label: 'To\'xtatilgan', cls: 'bg-indigo-100 text-indigo-700' }, graduated: { label: 'Bitirgan', cls: 'bg-indigo-100 text-indigo-700' }, left: { label: 'Ketgan', cls: 'bg-red-100 text-red-700' } }
  const s = map[status] || map.active
  return <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${s.cls}`}>{s.label}</span>
}
