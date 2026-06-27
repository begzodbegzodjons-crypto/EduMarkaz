'use client'
import { useEffect, useState, useCallback, useMemo } from 'react'
import { motion } from 'framer-motion'
import { apiFetch, formatDate, formatMoney } from '@/lib/client'
import {
  Plus, Trash2, Pencil, Wallet, TrendingUp, TrendingDown, FileText, BarChart3,
} from '@/components/icons'
import {
  Card, CardHeader, EmptyState, Modal, PrimaryButton, GhostButton, IconButton,
  PanelLoader, Field, Avatar, Row,
} from './panels-common'

// ============================================================================
//  TO'RLOVLAR PANEL — kurs → guruh → talabalar
// ============================================================================
export function PaymentsPanel() {
  const [items, setItems] = useState<any[]>([])
  const [students, setStudents] = useState<any[]>([])
  const [groups, setGroups] = useState<any[]>([])
  const [courses, setCourses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [courseFilter, setCourseFilter] = useState('all')
  const [groupFilter, setGroupFilter] = useState('all')
  const [openModal, setOpenModal] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [form, setForm] = useState<any>({ student_id: '', group_id: '', amount: 0, payment_date: new Date().toISOString().slice(0, 10), payment_type: 'cash', for_month: '', description: '' })

  const load = useCallback(async () => {
    setLoading(true)
    const [p, s, g, c] = await Promise.all([apiFetch('/api/payments'), apiFetch('/api/students'), apiFetch('/api/groups'), apiFetch('/api/courses')])
    if (p.ok) setItems(p.data?.payments || [])
    if (s.ok) setStudents(s.data?.students || [])
    if (g.ok) setGroups(g.data?.groups || [])
    if (c.ok) setCourses(c.data?.courses || [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const filteredGroups = useMemo(() => courseFilter !== 'all' ? groups.filter((g) => g.course_id === courseFilter) : groups, [groups, courseFilter])
  const filtered = useMemo(() => items.filter((p) => {
    if (courseFilter !== 'all' && p.group?.course_id !== courseFilter) return false
    if (groupFilter !== 'all' && p.group_id !== groupFilter) return false
    return true
  }), [items, courseFilter, groupFilter])

  const total = filtered.reduce((sum, p) => sum + Number(p.amount || 0), 0)
  const monthStr = new Date().toISOString().slice(0, 7)
  const monthTotal = filtered.filter((p) => String(p.payment_date).startsWith(monthStr)).reduce((sum, p) => sum + Number(p.amount || 0), 0)

  // To'lamagan talabalar (shu guruhda, shu oyda to'lovi yo'q)
  const unpaidStudents = useMemo(() => {
    if (courseFilter === 'all' && groupFilter === 'all') return []
    return students.filter((s) => {
      if (s.status !== 'active') return false
      if (courseFilter !== 'all' && s.course_id !== courseFilter) return false
      if (groupFilter !== 'all' && s.group_id !== groupFilter) return false
      // Bu oy to'lov qilganmi?
      const paid = items.find((p) => p.student_id === s.id && p.for_month === monthStr)
      return !paid
    })
  }, [students, items, courseFilter, groupFilter, monthStr])

  async function handleSave() {
    if (editing) {
      const { ok, error } = await apiFetch('/api/payments', { method: 'PUT', body: JSON.stringify({ id: editing.id, ...form }) })
      if (!ok) return alert(error)
    } else {
      const { ok, error } = await apiFetch('/api/payments', { method: 'POST', body: JSON.stringify(form) })
      if (!ok) return alert(error)
    }
    setOpenModal(false); setEditing(null); load()
  }
  async function handleDelete(id: string) { if (!confirm('O\'chirmoqchimisiz?')) return; const { ok, error } = await apiFetch(`/api/payments?id=${id}`, { method: 'DELETE' }); if (!ok) return alert(error); load() }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="text-2xl lg:text-3xl font-bold">To'lovlar</h1><p className="text-muted-foreground text-sm mt-1">{filtered.length} yozuv</p></div>
        <PrimaryButton onClick={() => { setEditing(null); setForm({ student_id: '', group_id: '', amount: 0, payment_date: new Date().toISOString().slice(0, 10), payment_type: 'cash', for_month: '', description: '' }); setOpenModal(true) }}><Plus className="w-4 h-4" /> Yangi to'lov</PrimaryButton>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-card rounded-2xl border border-border/50 p-4"><div className="text-xs text-muted-foreground">Jami to'lovlar</div><div className="text-xl lg:text-2xl font-bold mt-1 text-emerald-600">{formatMoney(total)}</div><div className="text-[10px] text-muted-foreground mt-0.5">{filtered.length} ta yozuv</div></div>
        <div className="bg-card rounded-2xl border border-border/50 p-4"><div className="text-xs text-muted-foreground">Shu oygi</div><div className="text-xl lg:text-2xl font-bold mt-1 text-emerald-600">{formatMoney(monthTotal)}</div><div className="text-[10px] text-muted-foreground mt-0.5">{new Date().toLocaleDateString('uz-UZ', { month: 'long' })}</div></div>
      </div>

      <div className="flex gap-2 flex-wrap">
        <select value={courseFilter} onChange={(e) => { setCourseFilter(e.target.value); setGroupFilter('all') }} className="px-3 py-2 rounded-xl border border-border/50 text-sm bg-card">
          <option value="all">Barcha kurslar</option>{courses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select value={groupFilter} onChange={(e) => setGroupFilter(e.target.value)} className="px-3 py-2 rounded-xl border border-border/50 text-sm bg-card">
          <option value="all">Barcha guruhlar</option>{filteredGroups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
        </select>
      </div>

      {/* To'lamagan talabalar */}
      {unpaidStudents.length > 0 && (
        <Card>
          <CardHeader title="To'lamagan talabalar" subtitle={`${unpaidStudents.length} ta — ${monthStr} oyi uchun`} />
          <div className="p-4 pt-0 grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {unpaidStudents.map((s) => (
              <div key={s.id} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-red-50 border border-red-100">
                <Avatar name={s.full_name} color="rose" />
                <div className="flex-1 min-w-0"><div className="text-sm font-medium truncate">{s.full_name}</div><div className="text-[10px] text-red-600">{s.group?.name || s.course?.name || '—'}</div></div>
                <IconButton title="To'lov qo'shish" onClick={() => { setEditing(null); setForm({ student_id: s.id, group_id: s.group_id || '', amount: 0, payment_date: new Date().toISOString().slice(0, 10), payment_type: 'cash', for_month: monthStr, description: '' }); setOpenModal(true) }}><Plus className="w-4 h-4 text-emerald-600" /></IconButton>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* To'lovlar tarixi */}
      <Card>
        <CardHeader title="To'lovlar tarixi" subtitle={`${filtered.length} yozuv`} />
        {loading ? <PanelLoader /> : filtered.length === 0 ? <EmptyState title="To'lovlar yo'q" /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-border/40 text-xs text-muted-foreground">
                <th className="text-left px-4 py-3 font-medium">Talaba</th><th className="text-left px-4 py-3 font-medium">Guruh</th>
                <th className="text-right px-4 py-3 font-medium">Summa</th><th className="text-left px-4 py-3 font-medium">Sana</th>
                <th className="text-left px-4 py-3 font-medium">Turi</th><th className="text-left px-4 py-3 font-medium">Oy</th><th className="px-4 py-3"></th>
              </tr></thead>
              <tbody>
                {filtered.slice(0, 100).map((p) => (
                  <tr key={p.id} className="border-b border-border/20 hover:bg-muted/40">
                    <td className="px-4 py-3 font-medium">{p.student?.full_name || '—'}</td>
                    <td className="px-4 py-3 text-muted-foreground">{p.group?.name || '—'}</td>
                    <td className="px-4 py-3 text-right font-bold text-emerald-600">{formatMoney(p.amount)}</td>
                    <td className="px-4 py-3">{formatDate(p.payment_date)}</td>
                    <td className="px-4 py-3"><PaymentTypeChip type={p.payment_type} /></td>
                    <td className="px-4 py-3 text-muted-foreground">{p.for_month || '—'}</td>
                    <td className="px-4 py-3 text-right"><div className="flex gap-1"><IconButton title="Tahrirlash" onClick={() => { setEditing(p); setForm({ student_id: p.student_id, group_id: p.group_id || '', amount: p.amount, payment_date: p.payment_date, payment_type: p.payment_type, for_month: p.for_month || '', description: p.description || '' }); setOpenModal(true) }}><Pencil className="w-3.5 h-3.5" /></IconButton><IconButton title="O'chirish" danger onClick={() => handleDelete(p.id)}><Trash2 className="w-3.5 h-3.5" /></IconButton></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal open={openModal} onClose={() => setOpenModal(false)} title={editing ? 'To\'lovni tahrirlash' : 'Yangi to\'lov'}>
        <div className="space-y-3">
          <Field label="Talaba *"><select className="erp-input" value={form.student_id} onChange={(e) => { const s = students.find((x) => x.id === e.target.value); setForm({ ...form, student_id: e.target.value, group_id: s?.group_id || '' }) }}><option value="">— Tanlang —</option>{students.map((s) => <option key={s.id} value={s.id}>{s.full_name} — {s.group?.name || 'Guruh yo\'q'}</option>)}</select></Field>
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Summa (so'm) *"><input type="number" className="erp-input" value={form.amount} onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })} /></Field>
            <Field label="To'lov sanasi"><input type="date" className="erp-input" value={form.payment_date} onChange={(e) => setForm({ ...form, payment_date: e.target.value })} /></Field>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="To'lov turi"><select className="erp-input" value={form.payment_type} onChange={(e) => setForm({ ...form, payment_type: e.target.value })}><option value="cash">Naqd</option><option value="card">Karta</option><option value="transfer">O'tkazma</option><option value="other">Boshqa</option></select></Field>
            <Field label="Oy (YYYY-MM)"><input className="erp-input" value={form.for_month} onChange={(e) => setForm({ ...form, for_month: e.target.value })} placeholder={monthStr} /></Field>
          </div>
          <Field label="Izoh"><input className="erp-input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
          <div className="flex gap-2 pt-2"><PrimaryButton onClick={handleSave} className="flex-1">Saqlash</PrimaryButton><GhostButton onClick={() => setOpenModal(false)}>Bekor</GhostButton></div>
        </div>
      </Modal>
    </div>
  )
}
function PaymentTypeChip({ type }: { type: string }) {
  const map: any = { cash: { label: 'Naqd', cls: 'bg-emerald-100 text-emerald-700' }, card: { label: 'Karta', cls: 'bg-blue-100 text-blue-700' }, transfer: { label: 'O\'tkazma', cls: 'bg-violet-100 text-violet-700' }, other: { label: 'Boshqa', cls: 'bg-slate-100 text-slate-700' } }
  const s = map[type] || map.other
  return <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${s.cls}`}>{s.label}</span>
}

// ============================================================================
//  MOLIYA PANEL — sof foyda avtomatik
// ============================================================================
export function FinancePanel() {
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiFetch('/api/dashboard').then(({ ok, data }) => {
      if (ok && data) setStats(data.stats)
      setLoading(false)
    })
  }, [])

  if (loading) return <PanelLoader />
  if (!stats) return <div className="text-center text-muted-foreground py-12">Ma'lumot yuklanmadi.</div>

  return (
    <div className="space-y-5">
      <div><h1 className="text-2xl lg:text-3xl font-bold">Moliya</h1><p className="text-muted-foreground text-sm mt-1">Tushum, xarajat va sof foyda avtomatik hisob</p></div>

      {/* Asosiy ko'rsatkichlar */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-6 text-white shadow-lg shadow-emerald-500/25">
          <div className="text-sm opacity-90">Bu oygi sof foyda</div>
          <div className="text-3xl lg:text-4xl font-bold mt-2">{formatMoney(stats.monthNetProfit)}</div>
          <div className="text-xs opacity-75 mt-2">Tushum: {formatMoney(stats.monthRevenue)} • Xarajat: {formatMoney(stats.monthExpenseTotal)}</div>
        </div>
        <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl p-6 text-white shadow-lg shadow-blue-500/25">
          <div className="text-sm opacity-90">Jami sof foyda</div>
          <div className="text-3xl lg:text-4xl font-bold mt-2">{formatMoney(stats.totalNetProfit)}</div>
          <div className="text-xs opacity-75 mt-2">Tushum: {formatMoney(stats.totalRevenue)} • Xarajat: {formatMoney(stats.totalExpense)}</div>
        </div>
      </div>

      {/* Hisob-kitob */}
      <Card>
        <CardHeader title="Avtomatik hisob-kitob" subtitle="Tushum - Xarajat = Sof foyda" />
        <div className="p-4 pt-0 space-y-3">
          <FinanceRow label="Bu oygi tushum" value={stats.monthRevenue} color="text-emerald-600" sign="+" />
          <FinanceRow label="Bu oygi xarajat" value={stats.monthExpenseTotal} color="text-red-600" sign="-" />
          <div className="border-t border-border/40 pt-3"><FinanceRow label="Bu oygi sof foyda" value={stats.monthNetProfit} color={stats.monthNetProfit >= 0 ? 'text-emerald-600' : 'text-red-600'} bold /></div>
          <div className="border-t border-border/40 pt-3 mt-3">
            <div className="text-xs text-muted-foreground mb-2">Umumiy hisob-kitob</div>
            <FinanceRow label="Jami tushum" value={stats.totalRevenue} color="text-emerald-600" sign="+" />
            <FinanceRow label="Jami xarajat" value={stats.totalExpense} color="text-red-600" sign="-" />
            <div className="border-t border-border/40 pt-3 mt-3"><FinanceRow label="Jami sof foyda" value={stats.totalNetProfit} color={stats.totalNetProfit >= 0 ? 'text-emerald-600' : 'text-red-600'} bold /></div>
          </div>
        </div>
      </Card>

      {/* Oylik dinamika */}
      <Card>
        <CardHeader title="Oylik dinamika" subtitle="Daromad vs Xarajat (6 oy)" />
        <div className="p-4 pt-0">
          <div className="space-y-2">
            {stats.monthlyRevenue.map((m: any) => {
              const net = m.total - m.expense
              return (
                <div key={m.month} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-muted/30">
                  <div className="text-xs font-semibold w-12">{m.month.slice(5)}</div>
                  <div className="flex-1 grid grid-cols-3 gap-2 text-xs">
                    <div><span className="text-muted-foreground">Tushum:</span> <span className="font-semibold text-emerald-600">{formatMoney(m.total)}</span></div>
                    <div><span className="text-muted-foreground">Xarajat:</span> <span className="font-semibold text-red-600">{formatMoney(m.expense)}</span></div>
                    <div><span className="text-muted-foreground">Sof:</span> <span className={`font-semibold ${net >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{formatMoney(net)}</span></div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </Card>
    </div>
  )
}
function FinanceRow({ label, value, color, sign, bold }: { label: string; value: number; color: string; sign?: string; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className={`text-sm ${bold ? 'font-bold' : ''}`}>{label}</span>
      <span className={`font-bold ${color} ${bold ? 'text-lg' : ''}`}>{sign}{formatMoney(value)}</span>
    </div>
  )
}

// ============================================================================
//  XARAJATLAR PANEL
// ============================================================================
const EXPENSE_CATEGORIES = [
  { value: 'ijara', label: 'Ijara' },
  { value: 'kommunal', label: 'Kommunal' },
  { value: 'maosh', label: 'Maosh' },
  { value: 'reklama', label: 'Reklama' },
  { value: 'material', label: 'Material' },
  { value: 'transport', label: 'Transport' },
  { value: 'other', label: 'Boshqa' },
]

export function ExpensesPanel() {
  const [items, setItems] = useState<any[]>([])
  const [teachers, setTeachers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [catFilter, setCatFilter] = useState('all')
  const [openModal, setOpenModal] = useState(false)
  const [form, setForm] = useState<any>({ category: 'ijara', amount: 0, expense_date: new Date().toISOString().slice(0, 10), description: '', teacher_id: '' })

  const load = useCallback(async () => {
    setLoading(true)
    const [e, t] = await Promise.all([apiFetch(`/api/expenses?category=${catFilter}`), apiFetch('/api/teachers')])
    if (e.ok) setItems(e.data?.expenses || [])
    if (t.ok) setTeachers(t.data?.teachers || [])
    setLoading(false)
  }, [catFilter])

  useEffect(() => { load() }, [load])

  const total = items.reduce((sum, e) => sum + Number(e.amount || 0), 0)
  const monthStr = new Date().toISOString().slice(0, 7)
  const monthTotal = items.filter((e) => String(e.expense_date).startsWith(monthStr)).reduce((sum, e) => sum + Number(e.amount || 0), 0)

  async function handleSave() {
    const { ok, error } = await apiFetch('/api/expenses', { method: 'POST', body: JSON.stringify(form) })
    if (!ok) return alert(error)
    setOpenModal(false)
    setForm({ category: 'ijara', amount: 0, expense_date: new Date().toISOString().slice(0, 10), description: '', teacher_id: '' })
    load()
  }
  async function handleDelete(id: string) { if (!confirm('O\'chirmoqchimisiz?')) return; const { ok, error } = await apiFetch(`/api/expenses?id=${id}`, { method: 'DELETE' }); if (!ok) return alert(error); load() }

  // Kategoriya bo'yicha summa
  const byCategory = useMemo(() => {
    const m: Record<string, number> = {}
    items.forEach((e) => { m[e.category] = (m[e.category] || 0) + Number(e.amount || 0) })
    return Object.entries(m).sort(([, a], [, b]) => b - a)
  }, [items])

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="text-2xl lg:text-3xl font-bold">Xarajatlar</h1><p className="text-muted-foreground text-sm mt-1">{items.length} yozuv</p></div>
        <PrimaryButton onClick={() => setOpenModal(true)}><Plus className="w-4 h-4" /> Yangi xarajat</PrimaryButton>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-card rounded-2xl border border-border/50 p-4"><div className="text-xs text-muted-foreground">Jami xarajatlar</div><div className="text-xl lg:text-2xl font-bold mt-1 text-red-600">{formatMoney(total)}</div><div className="text-[10px] text-muted-foreground mt-0.5">{items.length} ta yozuv</div></div>
        <div className="bg-card rounded-2xl border border-border/50 p-4"><div className="text-xs text-muted-foreground">Shu oygi</div><div className="text-xl lg:text-2xl font-bold mt-1 text-red-600">{formatMoney(monthTotal)}</div><div className="text-[10px] text-muted-foreground mt-0.5">{new Date().toLocaleDateString('uz-UZ', { month: 'long' })}</div></div>
      </div>

      {/* Kategoriya bo'yicha */}
      <Card>
        <CardHeader title="Kategoriya bo'yicha" />
        <div className="p-4 pt-0 grid grid-cols-2 lg:grid-cols-4 gap-2">
          {byCategory.length === 0 ? <div className="col-span-full text-sm text-muted-foreground text-center py-4">Xarajatlar yo'q</div> : byCategory.map(([cat, amount]) => (
            <div key={cat} className="px-3 py-2 rounded-lg bg-muted/40">
              <div className="text-xs text-muted-foreground">{cat}</div>
              <div className="text-base font-bold text-red-600">{formatMoney(amount as number)}</div>
            </div>
          ))}
        </div>
      </Card>

      <div className="flex gap-2 flex-wrap">
        <select value={catFilter} onChange={(e) => setCatFilter(e.target.value)} className="px-3 py-2 rounded-xl border border-border/50 text-sm bg-card">
          <option value="all">Barcha kategoriyalar</option>
          {EXPENSE_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
      </div>

      <Card>
        <CardHeader title="Xarajatlar tarixi" subtitle={`${items.length} yozuv`} />
        {loading ? <PanelLoader /> : items.length === 0 ? <EmptyState title="Xarajatlar yo'q" description="Birinchi xarajatingizni qo'shing." /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-border/40 text-xs text-muted-foreground">
                <th className="text-left px-4 py-3 font-medium">Kategoriya</th><th className="text-left px-4 py-3 font-medium">Izoh</th>
                <th className="text-right px-4 py-3 font-medium">Summa</th><th className="text-left px-4 py-3 font-medium">Sana</th>
                <th className="text-left px-4 py-3 font-medium">O'qituvchi</th><th className="px-4 py-3"></th>
              </tr></thead>
              <tbody>
                {items.map((e) => (
                  <tr key={e.id} className="border-b border-border/20 hover:bg-muted/40">
                    <td className="px-4 py-3"><CategoryChip cat={e.category} /></td>
                    <td className="px-4 py-3 text-muted-foreground truncate max-w-xs">{e.description || '—'}</td>
                    <td className="px-4 py-3 text-right font-bold text-red-600">{formatMoney(e.amount)}</td>
                    <td className="px-4 py-3">{formatDate(e.expense_date)}</td>
                    <td className="px-4 py-3 text-muted-foreground">{e.teacher?.full_name || '—'}</td>
                    <td className="px-4 py-3 text-right"><IconButton danger onClick={() => handleDelete(e.id)} title="O'chirish"><Trash2 className="w-3.5 h-3.5" /></IconButton></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal open={openModal} onClose={() => setOpenModal(false)} title="Yangi xarajat">
        <div className="space-y-3">
          <Field label="Kategoriya *"><select className="erp-input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>{EXPENSE_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}</select></Field>
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Summa (so'm) *"><input type="number" className="erp-input" value={form.amount} onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })} /></Field>
            <Field label="Sana"><input type="date" className="erp-input" value={form.expense_date} onChange={(e) => setForm({ ...form, expense_date: e.target.value })} /></Field>
          </div>
          {form.category === 'maosh' && (
            <Field label="O'qituvchi"><select className="erp-input" value={form.teacher_id} onChange={(e) => setForm({ ...form, teacher_id: e.target.value })}><option value="">— Tanlang —</option>{teachers.map((t) => <option key={t.id} value={t.id}>{t.full_name}</option>)}</select></Field>
          )}
          <Field label="Izoh"><input className="erp-input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
          <div className="flex gap-2 pt-2"><PrimaryButton onClick={handleSave} className="flex-1">Saqlash</PrimaryButton><GhostButton onClick={() => setOpenModal(false)}>Bekor</GhostButton></div>
        </div>
      </Modal>
    </div>
  )
}
function CategoryChip({ cat }: { cat: string }) {
  const c = EXPENSE_CATEGORIES.find((x) => x.value === cat)
  return <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-violet-100 text-violet-700">{c?.label || cat}</span>
}

// ============================================================================
//  HISOBOTLAR PANEL — batafsil hisobot
// ============================================================================
export function ReportsPanel() {
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiFetch('/api/dashboard').then(({ ok, data }) => {
      if (ok && data) setStats(data.stats)
      setLoading(false)
    })
  }, [])

  if (loading) return <PanelLoader />
  if (!stats) return <div className="text-center text-muted-foreground py-12">Ma'lumot yuklanmadi.</div>

  return (
    <div className="space-y-5">
      <div><h1 className="text-2xl lg:text-3xl font-bold">Hisobotlar</h1><p className="text-muted-foreground text-sm mt-1">Batafsil moliyaviy va o'quv hisobotlari</p></div>

      {/* Moliyaviy hisobot */}
      <Card>
        <CardHeader title="Moliyaviy hisobot" subtitle="Tushum, xarajat, sof foyda" />
        <div className="p-4 pt-0">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border/40 text-xs text-muted-foreground">
              <th className="text-left py-2 font-medium">Ko'rsatkich</th>
              <th className="text-right py-2 font-medium">Bu oy</th>
              <th className="text-right py-2 font-medium">Jami</th>
            </tr></thead>
            <tbody>
              <tr className="border-b border-border/20"><td className="py-2.5">Tushum (to'lovlar)</td><td className="text-right py-2.5 font-bold text-emerald-600">{formatMoney(stats.monthRevenue)}</td><td className="text-right py-2.5 font-bold text-emerald-600">{formatMoney(stats.totalRevenue)}</td></tr>
              <tr className="border-b border-border/20"><td className="py-2.5">Xarajatlar</td><td className="text-right py-2.5 font-bold text-red-600">{formatMoney(stats.monthExpenseTotal)}</td><td className="text-right py-2.5 font-bold text-red-600">{formatMoney(stats.totalExpense)}</td></tr>
              <tr className="bg-muted/30"><td className="py-2.5 font-bold">Sof foyda</td><td className="text-right py-2.5 font-bold text-base text-emerald-600">{formatMoney(stats.monthNetProfit)}</td><td className="text-right py-2.5 font-bold text-base text-emerald-600">{formatMoney(stats.totalNetProfit)}</td></tr>
            </tbody>
          </table>
        </div>
      </Card>

      {/* Xarajatlar tahlili */}
      <Card>
        <CardHeader title="Xarajatlar tahlili" subtitle="Kategoriya bo'yicha" />
        <div className="p-4 pt-0 space-y-2">
          {Object.entries(stats.expenseByCategory).length === 0 ? <div className="text-sm text-muted-foreground text-center py-4">Xarajatlar yo'q</div> : Object.entries(stats.expenseByCategory).map(([cat, amount]: any) => {
            const pct = stats.totalExpense > 0 ? Math.round((amount / stats.totalExpense) * 100) : 0
            return (
              <div key={cat}>
                <div className="flex justify-between text-xs mb-1"><span className="font-medium">{cat}</span><span className="font-bold text-red-600">{formatMoney(amount)} ({pct}%)</span></div>
                <div className="h-2 rounded-full bg-muted overflow-hidden"><div className="h-full bg-gradient-to-r from-rose-500 to-red-500" style={{ width: `${pct}%` }} /></div>
              </div>
            )
          })}
        </div>
      </Card>

      {/* O'quv hisoboti */}
      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader title="O'quv hisoboti" />
          <div className="p-4 pt-0 space-y-2">
            <ReportRow label="Jami talabalar" value={stats.totalStudents} />
            <ReportRow label="Faol talabalar" value={stats.activeStudents} />
            <ReportRow label="Guruhlar" value={stats.totalGroups} />
            <ReportRow label="Kurslar" value={stats.totalCourses} />
            <ReportRow label="O'qituvchilar" value={stats.totalTeachers} />
          </div>
        </Card>
        <Card>
          <CardHeader title="Davomat hisoboti" />
          <div className="p-4 pt-0 space-y-2">
            <ReportRow label="Jami darslar" value={stats.attendance.total} />
            <ReportRow label="Keldi" value={stats.attendance.present} color="text-emerald-600" />
            <ReportRow label="Kelmadi" value={stats.attendance.absent} color="text-red-600" />
            <ReportRow label="Kechikdi" value={stats.attendance.late} color="text-amber-600" />
            <ReportRow label="Kelish darajasi" value={`${stats.attendance.rate}%`} color="text-blue-600" />
          </div>
        </Card>
      </div>

      {/* Lidlar hisoboti */}
      <Card>
        <CardHeader title="Sotuv hisoboti (Lidlar)" subtitle="Konversiya bo'yicha" />
        <div className="p-4 pt-0 space-y-2">
          <ReportRow label="Jami lidlar" value={stats.leads.total} />
          <ReportRow label="Yangi" value={stats.leads.new} color="text-amber-600" />
          <ReportRow label="Bog'lanilgan" value={stats.leads.contacted} color="text-blue-600" />
          <ReportRow label="Ro'yxatga olingan" value={stats.leads.enrolled} color="text-emerald-600" />
          <div className="border-t border-border/40 pt-2 mt-2">
            <ReportRow label="Konversiya darajasi" value={`${stats.leads.total > 0 ? Math.round((stats.leads.enrolled / stats.leads.total) * 100) : 0}%`} color="text-violet-600" bold />
          </div>
        </div>
      </Card>
    </div>
  )
}
function ReportRow({ label, value, color, bold }: { label: string; value: any; color?: string; bold?: boolean }) {
  return <div className="flex justify-between items-center"><span className={`text-sm ${bold ? 'font-bold' : ''}`}>{label}</span><span className={`font-bold ${color || ''} ${bold ? 'text-lg' : ''}`}>{value}</span></div>
}
