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
                <motion.div initial={{ width: 0 }} animate={{ width: `${stats.attendance.rate}%` }} transition={{ duration: 1, ease: 'easeOut' }} className="h-full bg-gradient-to-r from-slate-600 to-teal-500 rounded-full" />
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
  // SVG line chart with smooth curves + gradient fill
  const w = 480, h = 160, pad = 40, chartH = h - 50
  const max = Math.max(...data.flatMap((d) => [d.income, d.expense]), 1)
  const stepX = data.length > 1 ? (w - pad - 20) / (data.length - 1) : 0

  const incomePoints = data.map((d, i) => ({ x: pad + i * stepX, y: chartH - (d.income / max) * (chartH - 20) + 10, val: d.income }))
  const expensePoints = data.map((d, i) => ({ x: pad + i * stepX, y: chartH - (d.expense / max) * (chartH - 20) + 10, val: d.expense }))

  // Smooth curve path generator
  function smoothPath(pts: { x: number; y: number }[]) {
    if (pts.length < 2) return ''
    let d = `M ${pts[0].x},${pts[0].y}`
    for (let i = 1; i < pts.length; i++) {
      const cp1x = pts[i - 1].x + stepX / 2
      const cp1y = pts[i - 1].y
      const cp2x = pts[i].x - stepX / 2
      const cp2y = pts[i].y
      d += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${pts[i].x},${pts[i].y}`
    }
    return d
  }

  const incomePath = smoothPath(incomePoints)
  const expensePath = smoothPath(expensePoints)
  const incomeArea = incomePath + ` L ${incomePoints[incomePoints.length - 1]?.x || pad},${chartH + 10} L ${incomePoints[0]?.x || pad},${chartH + 10} Z`
  const expenseArea = expensePath + ` L ${expensePoints[expensePoints.length - 1]?.x || pad},${chartH + 10} L ${expensePoints[0]?.x || pad},${chartH + 10} Z`

  return (
<<<<<<< HEAD
    <div className="flex items-end gap-2 h-40">
      {data.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
          <div className="text-[10px] text-muted-foreground font-medium">{d.income > 0 ? Math.round(d.income / 1000) + 'k' : ''}</div>
          <div className="w-full flex items-end gap-0.5" style={{ height: '100%' }}>
            <div className="flex-1 bg-muted rounded-t-lg overflow-hidden flex items-end"><motion.div initial={{ height: 0 }} animate={{ height: `${(d.income / max) * 100}%` }} transition={{ duration: 0.6, delay: i * 0.05 }} className="w-full bg-gradient-to-t from-slate-600 to-teal-400 rounded-t-lg" /></div>
            <div className="flex-1 bg-muted rounded-t-lg overflow-hidden flex items-end"><motion.div initial={{ height: 0 }} animate={{ height: `${(d.expense / max) * 100}%` }} transition={{ duration: 0.6, delay: i * 0.05 + 0.1 }} className="w-full bg-gradient-to-t from-slate-600 to-pink-400 rounded-t-lg" /></div>
          </div>
          <div className="text-[10px] text-muted-foreground">{d.label}</div>
=======
    <div className="w-full">
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ maxHeight: '220px' }}>
        <defs>
          <linearGradient id="incomeAreaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="expenseAreaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#f43f5e" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="incomeLineGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#60a5fa" />
          </linearGradient>
          <linearGradient id="expenseLineGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#f43f5e" />
            <stop offset="100%" stopColor="#fb7185" />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((p, i) => (
          <line key={i} x1={pad} y1={10 + p * (chartH - 10)} x2={w - 20} y2={10 + p * (chartH - 10)} stroke="currentColor" strokeWidth="0.5" opacity="0.08" />
        ))}

        {/* Y-axis labels */}
        <text x="2" y="14" fontSize="9" fill="currentColor" opacity="0.5">{Math.round(max / 1000)}k</text>
        <text x="2" y={chartH / 2 + 5} fontSize="9" fill="currentColor" opacity="0.5">{Math.round(max / 2000)}k</text>
        <text x="8" y={chartH + 4} fontSize="9" fill="currentColor" opacity="0.5">0</text>

        {/* Expense area fill */}
        <path d={expenseArea} fill="url(#expenseAreaGrad)" />
        {/* Income area fill */}
        <path d={incomeArea} fill="url(#incomeAreaGrad)" />

        {/* Expense line */}
        <path d={expensePath} fill="none" stroke="url(#expenseLineGrad)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

        {/* Income line */}
        <path d={incomePath} fill="none" stroke="url(#incomeLineGrad)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

        {/* Data points — Income */}
        {incomePoints.map((p, i) => (
          <g key={`inc-${i}`}>
            <circle cx={p.x} cy={p.y} r="4" fill="#fff" stroke="#3b82f6" strokeWidth="2" />
            {p.val > 0 && <text x={p.x} y={p.y - 8} fontSize="8" fill="#3b82f6" textAnchor="middle" fontWeight="bold">{Math.round(p.val / 1000)}k</text>}
          </g>
        ))}

        {/* Data points — Expense */}
        {expensePoints.map((p, i) => (
          <g key={`exp-${i}`}>
            <circle cx={p.x} cy={p.y} r="4" fill="#fff" stroke="#f43f5e" strokeWidth="2" />
            {p.val > 0 && <text x={p.x} y={p.y + 14} fontSize="8" fill="#f43f5e" textAnchor="middle" fontWeight="bold">{Math.round(p.val / 1000)}k</text>}
          </g>
        ))}

        {/* X-axis labels */}
        {data.map((d, i) => (
          <text key={i} x={pad + i * stepX} y={h - 4} fontSize="9" fill="currentColor" opacity="0.6" textAnchor="middle">{d.label}</text>
        ))}
      </svg>

      {/* Legend */}
      <div className="flex items-center gap-4 justify-center mt-2 text-xs">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-0.5 rounded-full bg-gradient-to-r from-blue-500 to-blue-400" />
          <span className="text-muted-foreground">Daromad</span>
>>>>>>> 60c09f695ed8547d48c6b25600dcf641241250cd
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-0.5 rounded-full bg-gradient-to-r from-rose-500 to-pink-400" />
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
