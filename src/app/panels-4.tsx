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
//  TO'RLOVLAR PANEL — tayyor ro'yxat, avtomatik hisob-kitob
//  - Barcha talabalar avtomatik ro'yxatda ko'rinadi
//  - Kurs/guruh bo'yicha filter
//  - Qarzdorlar alohida ogohlantirish bilan
//  - Tezkor to'lov tugmasi (modal yo'q, inline)
//  - Foydalanuvchi hech narsani qo'lda kiritmaydi
// ============================================================================
export function PaymentsPanel() {
  const [balances, setBalances] = useState<any[]>([])
  const [totals, setTotals] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [courses, setCourses] = useState<any[]>([])
  const [groups, setGroups] = useState<any[]>([])
  const [payments, setPayments] = useState<any[]>([])

  // Filtrlar
  const [courseFilter, setCourseFilter] = useState('all')
  const [groupFilter, setGroupFilter] = useState('all')
  const [viewMode, setViewMode] = useState<'debtors' | 'all' | 'paid'>('debtors')
  const [search, setSearch] = useState('')

  // To'lov tarixi modali
  const [showHistory, setShowHistory] = useState(false)
  const [historyStudent, setHistoryStudent] = useState<any>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const [b, c, g, p] = await Promise.all([
      apiFetch('/api/payments/balances'),
      apiFetch('/api/courses'),
      apiFetch('/api/groups'),
      apiFetch('/api/payments?limit=1000'),
    ])
    if (b.ok && b.data) {
      setBalances(b.data.balances || [])
      setTotals(b.data.totals || null)
    }
    if (c.ok) setCourses(c.data?.courses || [])
    if (g.ok) setGroups(g.data?.groups || [])
    if (p.ok) setPayments(p.data?.payments || [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const monthStr = new Date().toISOString().slice(0, 7)

  // Filter groups by course
  const filteredGroups = useMemo(
    () => courseFilter === 'all' ? groups : groups.filter((g) => g.course_id === courseFilter),
    [groups, courseFilter]
  )

  // Filter students
  const filtered = useMemo(() => {
    return balances.filter((b) => {
      if (search && !b.full_name?.toLowerCase().includes(search.toLowerCase()) && !b.phone?.includes(search)) return false
      if (courseFilter !== 'all' && b.course_id !== courseFilter) return false
      if (groupFilter !== 'all' && b.group_id !== groupFilter) return false
      if (viewMode === 'debtors' && b.remaining <= 0) return false
      if (viewMode === 'paid' && b.remaining > 0) return false
      return true
    })
  }, [balances, search, courseFilter, groupFilter, viewMode])

  // Qarzdorlar soni
  const debtorsCount = balances.filter((b) => b.remaining > 0).length

  // Tezkor to'lov — bitta tugma bilan, modal yo'q
  // To'lov modali — qo'lda summa kiritiladi, tasdiqlash kerak
  const [payModal, setPayModal] = useState(false)
  const [payingStudent, setPayingStudent] = useState<any>(null)
  const [payForm, setPayForm] = useState<any>({
    amount: 0,
    payment_date: new Date().toISOString().slice(0, 10),
    payment_type: 'cash',
    for_month: new Date().toISOString().slice(0, 7),
    description: '',
  })
  const [saving, setSaving] = useState(false)

  // Tugma bosilganda modal ochiladi — summa BO'SH, foydalanuvchi qo'lda yozadi
  function openPayModal(student: any, _defaultAmount?: number) {
    setPayingStudent(student)
    setPayForm({
      amount: 0, // BO'SH — foydalanuvchi qo'lda yozadi
      payment_date: new Date().toISOString().slice(0, 10),
      payment_type: 'cash',
      for_month: monthStr,
      description: '',
    })
    setPayModal(true)
  }

  // Faqat "Tasdiqlash" tugmasi bosilganda to'lov saqlanadi
  async function handleConfirmPay() {
    if (!payingStudent) return
    if (!payForm.amount || payForm.amount <= 0) {
      alert('Iltimos, to\'lov summasini kiriting.')
      return
    }

    setSaving(true)
    const { ok, error } = await apiFetch('/api/payments', {
      method: 'POST',
      body: JSON.stringify({
        student_id: payingStudent.student_id,
        group_id: payingStudent.group_id || null,
        amount: payForm.amount,
        payment_date: payForm.payment_date,
        payment_type: payForm.payment_type,
        for_month: payForm.for_month || null,
        description: payForm.description || null,
      }),
    })
    setSaving(false)

    if (!ok) {
      alert(error || 'To\'lov saqlashda xatolik.')
      return
    }

    alert(`${payingStudent.full_name} uchun ${formatMoney(payForm.amount)} to\'lov saqlandi!`)
    setPayModal(false)
    setPayingStudent(null)
    load()
  }

  function closePayModal() {
    if (saving) return
    setPayModal(false)
    setPayingStudent(null)
  }

  // To'lov tarixini ochish
  function openHistory(student: any) {
    setHistoryStudent(student)
    setShowHistory(true)
  }

  // Eski quickPaying state — endi kerak emas
  // (asosiy state yuqorida e'lon qilingan)

  const studentHistory = useMemo(() => {
    if (!historyStudent) return []
    return payments
      .filter((p) => p.student_id === historyStudent.student_id)
      .sort((a, b) => String(b.payment_date).localeCompare(String(a.payment_date)))
  }, [payments, historyStudent])

  async function handleDeletePayment(id: string) {
    if (!confirm('To\'lovni o\'chirmoqchimisiz?')) return
    const { ok, error } = await apiFetch(`/api/payments?id=${id}`, { method: 'DELETE' })
    if (!ok) return alert(error)
    load()
  }

  return (
    <div className="space-y-5">
      {/* === Sarlavha === */}
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold">To'lovlar</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Avtomatik hisob-kitob — {balances.length} talaba · {debtorsCount} qarzdor
        </p>
      </div>

      {/* === Umumiy statistika === */}
      {totals && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-card rounded-2xl border border-border/50 p-4">
            <div className="text-xs text-muted-foreground">Jami talabalar</div>
            <div className="text-xl lg:text-2xl font-bold mt-1">{totals.students_count}</div>
            <div className="text-[10px] text-muted-foreground mt-0.5">{totals.active_students} faol</div>
          </div>
          <div className="bg-card rounded-2xl border border-border/50 p-4">
            <div className="text-xs text-muted-foreground">Asl summa (chegirmasiz)</div>
            <div className="text-xl lg:text-2xl font-bold mt-1 text-muted-foreground">{formatMoney(totals.total_due_raw)}</div>
            <div className="text-[10px] text-muted-foreground mt-0.5">to'liq narx</div>
          </div>
          <div className="bg-indigo-50 rounded-2xl border border-indigo-200 p-4">
            <div className="text-xs text-indigo-700">Chegirma</div>
            <div className="text-xl lg:text-2xl font-bold mt-1 text-indigo-700">−{formatMoney(totals.total_discount)}</div>
            <div className="text-[10px] text-indigo-700/70 mt-0.5">avtomatik ayrildi</div>
          </div>
          <div className="bg-card rounded-2xl border border-border/50 p-4">
            <div className="text-xs text-muted-foreground">To'lash kerak (chegirma bilan)</div>
            <div className="text-xl lg:text-2xl font-bold mt-1 text-indigo-700">{formatMoney(totals.total_due)}</div>
            <div className="text-[10px] text-muted-foreground mt-0.5">umumiy majburiyat</div>
          </div>
          <div className="bg-card rounded-2xl border border-border/50 p-4">
            <div className="text-xs text-muted-foreground">Qoldiq (qarz)</div>
            <div className={`text-xl lg:text-2xl font-bold mt-1 ${totals.total_remaining > 0 ? 'text-indigo-700' : 'text-indigo-700'}`}>{formatMoney(totals.total_remaining)}</div>
            <div className="text-[10px] text-muted-foreground mt-0.5">{totals.students_with_debt} ta qarzdor · {formatMoney(totals.total_paid)} to'langan</div>
          </div>
        </div>
      )}

      {/* === Qarzdorlar ogohlantirish === */}
      {debtorsCount > 0 && (
        <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          </div>
          <div className="flex-1">
            <div className="font-semibold text-indigo-700">{debtorsCount} ta talaba to'lov qilmagan</div>
            <div className="text-xs text-indigo-700 mt-0.5">
              Jami qarz: <strong>{formatMoney(totals?.total_remaining || 0)}</strong> · "Qarzdorlar" rejimida ko'rib chiqing va tezkor to'lov tugmasi bilan bir bosishda to'lovni qabul qiling.
            </div>
          </div>
          {viewMode !== 'debtors' && (
            <button
              onClick={() => setViewMode('debtors')}
              className="px-3 py-1.5 rounded-lg bg-slate-600 hover:bg-slate-600 text-white text-xs font-semibold"
            >
              Qarzdorlarni ko'rish
            </button>
          )}
        </div>
      )}

      {/* === Filtrlar va rejimlar === */}
      <div className="flex flex-wrap gap-2">
        {/* Rejim tanlash */}
        <div className="flex gap-1 p-1 bg-card rounded-xl border border-border/50">
          <button
            onClick={() => setViewMode('debtors')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${viewMode === 'debtors' ? 'bg-slate-600 text-white' : 'text-muted-foreground hover:bg-muted'}`}
          >
            Qarzdorlar ({balances.filter(b => b.remaining > 0).length})
          </button>
          <button
            onClick={() => setViewMode('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${viewMode === 'all' ? 'bg-slate-700 text-white' : 'text-muted-foreground hover:bg-muted'}`}
          >
            Barchasi ({balances.length})
          </button>
          <button
            onClick={() => setViewMode('paid')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${viewMode === 'paid' ? 'bg-slate-700 text-white' : 'text-muted-foreground hover:bg-muted'}`}
          >
            To'laganlar ({balances.filter(b => b.remaining <= 0).length})
          </button>
        </div>

        {/* Qidiruv */}
        <div className="flex items-center gap-2 px-3 py-2 bg-card rounded-xl border border-border/50 flex-1 min-w-[200px]">
          <svg className="w-4 h-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Ism yoki telefon bo'yicha..." className="flex-1 bg-transparent outline-none text-sm" />
        </div>

        {/* Kurs bo'yicha */}
        <select
          value={courseFilter}
          onChange={(e) => { setCourseFilter(e.target.value); setGroupFilter('all') }}
          className="px-3 py-2 rounded-xl border border-border/50 text-sm bg-card"
        >
          <option value="all">Barcha kurslar</option>
          {courses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>

        {/* Guruh bo'yicha */}
        <select
          value={groupFilter}
          onChange={(e) => setGroupFilter(e.target.value)}
          className="px-3 py-2 rounded-xl border border-border/50 text-sm bg-card"
        >
          <option value="all">Barcha guruhlar</option>
          {filteredGroups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
        </select>
      </div>

      {/* === Tayyor ro'yxat === */}
      <Card color="blue">
        <CardHeader
          title={
            viewMode === 'debtors' ? 'Qarzdor talabalar ro\'yxati'
            : viewMode === 'paid' ? 'To\'lagan talabalar ro\'yxati'
            : 'Barcha talabalar ro\'yxati'
          }
          subtitle={`${filtered.length} ta talaba · avtomatik hisob-kitob`}
        />
        {loading ? <PanelLoader /> : filtered.length === 0 ? (
          <EmptyState
            title={viewMode === 'debtors' ? 'Qarzdorlar yo\'q' : 'Talabalar topilmadi'}
            description={viewMode === 'debtors' ? 'Barcha talabalar to\'lovlarini qilgan! 🎉' : 'Filtrlarni o\'zgartiring.'}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/40 text-xs text-muted-foreground">
                  <th className="text-left px-4 py-3 font-medium">Talaba</th>
                  <th className="text-left px-4 py-3 font-medium">Kurs / Guruh</th>
                  <th className="text-left px-4 py-3 font-medium">Qabul</th>
                  <th className="text-right px-4 py-3 font-medium">Oylik</th>
                  <th className="text-center px-4 py-3 font-medium">Oy</th>
                  <th className="text-right px-4 py-3 font-medium">Asl summa</th>
                  <th className="text-right px-4 py-3 font-medium">Chegirma</th>
                  <th className="text-right px-4 py-3 font-medium">To'lash kerak</th>
                  <th className="text-right px-4 py-3 font-medium">To'langan</th>
                  <th className="text-right px-4 py-3 font-medium">Qoldiq</th>
                  <th className="text-center px-4 py-3 font-medium">Holat</th>
                  <th className="px-4 py-3 font-medium text-center">Amallar</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((b) => {
                  // Qarz oylar sonini hisoblaymiz
                  const debtMonths = b.monthly_fee > 0 ? Math.floor(b.remaining / b.monthly_fee) : 0
                  const hasDiscount = (b.discount_amount || 0) > 0
                  return (
                    <tr key={b.student_id} className={`border-b border-border/20 hover:bg-muted/40 ${b.remaining > 0 ? 'bg-slate-50/30' : ''} ${hasDiscount ? 'bg-indigo-50/20' : ''}`}>
                      <td className="px-4 py-3">
                        <div className="font-medium">{b.full_name}</div>
                        <div className="text-[10px] text-muted-foreground">{b.phone || '—'}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-muted-foreground">{b.course_name}</div>
                        <div className="text-[10px] text-muted-foreground">{b.group_name}</div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">{formatDate(b.enrollment_date)}</td>
                      <td className="px-4 py-3 text-right font-medium">{formatMoney(b.monthly_fee)}</td>
                      <td className="px-4 py-3 text-center text-muted-foreground">{b.months_enrolled}</td>
                      <td className="px-4 py-3 text-right text-muted-foreground">{formatMoney(b.total_due_raw || 0)}</td>
                      <td className="px-4 py-3 text-right">
                        {hasDiscount ? (
                          <div>
                            <div className="font-semibold text-indigo-700">−{formatMoney(b.discount_amount)}</div>
                            {b.discount_details && b.discount_details.length > 0 && (
                              <div className="text-[10px] text-indigo-700/80">{b.discount_details[0].name}</div>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-indigo-700">{formatMoney(b.total_due)}</td>
                      <td className="px-4 py-3 text-right font-semibold text-indigo-700">{formatMoney(b.total_paid)}</td>
                      <td className={`px-4 py-3 text-right font-bold ${b.remaining > 0 ? 'text-indigo-700' : 'text-indigo-700'}`}>
                        {formatMoney(Math.max(0, b.remaining))}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {b.remaining > 0 ? (
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${debtMonths >= 2 ? 'bg-red-100 text-red-700' : 'bg-indigo-100 text-indigo-700'}`}>
                            {debtMonths >= 2 ? `${debtMonths} oy qarz` : 'Qarz'}
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-100 text-indigo-700">To'langan</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5 justify-center flex-wrap">
                          {/* Tarix tugmasi */}
                          <button
                            onClick={() => openHistory(b)}
                            title="To'lov tarixi"
                            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                          </button>

                          {/* To'lov tugmasi — modal ochadi, tasdiqlash kerak */}
                          {b.remaining > 0 && (
                            <button
                              onClick={() => openPayModal(b, b.remaining)}
                              title="To'lov qilish — modal ochiladi"
                              className="px-2.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold flex items-center gap-1"
                            >
                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>
                              To'lov
                            </button>
                          )}

                          {/* Bitta oylik to'lov tugmasi */}
                          {b.remaining > b.monthly_fee && b.monthly_fee > 0 && (
                            <button
                              onClick={() => openPayModal(b, b.monthly_fee)}
                              title="Bitta oylik to'lash — modal ochiladi"
                              className="px-2 py-1 rounded-lg bg-indigo-100 hover:bg-slate-600 text-indigo-700 text-[10px] font-semibold"
                            >
                              +1 oy
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-border/60 bg-muted/30 font-semibold">
                  <td colSpan={5} className="px-4 py-3 text-right">Jami:</td>
                  <td className="px-4 py-3 text-right text-muted-foreground">{formatMoney(filtered.reduce((s, b) => s + (b.total_due_raw || 0), 0))}</td>
                  <td className="px-4 py-3 text-right text-indigo-700">−{formatMoney(filtered.reduce((s, b) => s + (b.discount_amount || 0), 0))}</td>
                  <td className="px-4 py-3 text-right text-indigo-700">{formatMoney(filtered.reduce((s, b) => s + b.total_due, 0))}</td>
                  <td className="px-4 py-3 text-right text-indigo-700">{formatMoney(filtered.reduce((s, b) => s + b.total_paid, 0))}</td>
                  <td className="px-4 py-3 text-right text-indigo-700">{formatMoney(filtered.reduce((s, b) => s + Math.max(0, b.remaining), 0))}</td>
                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </Card>

      {/* === Oson tushuntirish === */}
      <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 text-sm text-indigo-700">
        <div className="font-semibold mb-1">ℹ️ Qanday ishlaydi?</div>
        <ul className="text-xs space-y-1 text-indigo-700">
          <li>• Talabaning <strong>qabul sanasidan</strong> boshlab har oy uchun <strong>oylik to'lov</strong> (kurs narxi) avtomatik hisoblanadi</li>
          <li>• <strong>To'lash kerak</strong> = o'tgan oylar soni × oylik to'lov summasi</li>
          <li>• <strong>Qoldiq</strong> = to'lash kerak − to'langan summa (qarzdorlik)</li>
          <li>• Talaba ro'yxatdan o'tganda hech narsa kiritish shart emas — barchasi avtomatik</li>
          <li>• Yashil tugma — <strong>bitta bosish bilan</strong> to'liq qoldiq to'lanadi (naqd)</li>
          <li>• "+1 oy" tugmasi — faqat bitta oylik to'lov qilish uchun</li>
          <li>• Oylik to'lov summasini o'zgartirish uchun — <strong>Kurslar</strong> bo'limiga kiring</li>
        </ul>
      </div>

      {/* === To'lov kalkulyatori modali (avtomatik + qo'lda + tasdiqlash) === */}
      <Modal
        open={payModal}
        onClose={closePayModal}
        title={payingStudent ? `To'lov kalkulyatori: ${payingStudent.full_name}` : 'To\'lov kalkulyatori'}
        size="lg"
      >
        {payingStudent && (
          <div className="space-y-4">
            {/* === 1. Talaba holati === */}
            <div className="rounded-xl bg-muted/40 border border-border/50 p-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><div className="text-xs text-muted-foreground">Kurs</div><div className="font-medium">{payingStudent.course_name}</div></div>
                <div><div className="text-xs text-muted-foreground">Guruh</div><div className="font-medium">{payingStudent.group_name}</div></div>
                <div><div className="text-xs text-muted-foreground">Qabul sanasi</div><div className="font-medium">{formatDate(payingStudent.enrollment_date)}</div></div>
                <div><div className="text-xs text-muted-foreground">O'tgan oylar</div><div className="font-medium">{payingStudent.months_enrolled} oy</div></div>
                <div><div className="text-xs text-muted-foreground">Oylik to'lov</div><div className="font-medium">{formatMoney(payingStudent.monthly_fee)}</div></div>
                <div><div className="text-xs text-muted-foreground">Asl summa</div><div className="font-medium text-muted-foreground">{formatMoney(payingStudent.total_due_raw || 0)}</div></div>
                <div><div className="text-xs text-muted-foreground">Chegirma</div><div className="font-semibold text-indigo-700">{(payingStudent.discount_amount || 0) > 0 ? `−${formatMoney(payingStudent.discount_amount)}` : '—'}</div></div>
                <div><div className="text-xs text-muted-foreground">To'lash kerak</div><div className="font-semibold text-indigo-700">{formatMoney(payingStudent.total_due)}</div></div>
                <div><div className="text-xs text-muted-foreground">To'langan</div><div className="font-semibold text-indigo-700">{formatMoney(payingStudent.total_paid)}</div></div>
                <div><div className="text-xs text-muted-foreground">Qoldiq (qarz)</div><div className={`font-bold ${payingStudent.remaining > 0 ? 'text-indigo-700' : 'text-indigo-700'}`}>{formatMoney(Math.max(0, payingStudent.remaining))}</div></div>
              </div>
            </div>

            {/* === 1.5. Chegirma tafsilotlari (agar chegirma bo'lsa) === */}
            {payingStudent.discount_amount > 0 && payingStudent.discount_details && payingStudent.discount_details.length > 0 && (
              <div className="rounded-xl bg-indigo-50 border border-indigo-200 p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-semibold text-indigo-700 text-sm flex items-center gap-1.5">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>
                    Faol chegirmalar ({payingStudent.discount_details.length} ta)
                  </div>
                  <div className="text-xs text-indigo-700">Jami: <strong>−{formatMoney(payingStudent.discount_amount)}</strong></div>
                </div>
                <div className="space-y-1.5">
                  {payingStudent.discount_details.map((d: any, i: number) => (
                    <div key={i} className="flex items-center justify-between text-xs bg-white/60 rounded-lg px-2.5 py-1.5 border border-indigo-100">
                      <div>
                        <span className="font-semibold text-indigo-900">{d.name}</span>
                        <span className="text-indigo-700/70 ml-2">
                          {d.type === 'percent' ? `${d.value}%` : formatMoney(d.value)}
                        </span>
                      </div>
                      <div className="font-semibold text-indigo-700">−{formatMoney(d.amount)}</div>
                    </div>
                  ))}
                </div>
                <div className="border-t border-indigo-200 mt-2 pt-2 flex justify-between text-xs font-semibold">
                  <span className="text-indigo-900">Asl summa: {formatMoney(payingStudent.total_due_raw || 0)}</span>
                  <span className="text-indigo-700">−{formatMoney(payingStudent.discount_amount)}</span>
                  <span className="text-slate-900">= {formatMoney(payingStudent.total_due)}</span>
                </div>
              </div>
            )}

            {/* === 2. Avtomatik kalkulyator (proportional hisob) === */}
            {payingStudent.first_month_proportion < 1 && (
              <div className="rounded-xl bg-slate-50 border border-slate-200 p-4">
                <div className="flex items-start gap-2 mb-3">
                  <div className="w-6 h-6 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0 text-xs font-bold">🧮</div>
                  <div>
                    <div className="font-semibold text-slate-900 text-sm">Avtomatik kalkulyator</div>
                    <div className="text-xs text-indigo-700">Talaba {payingStudent.enroll_day}-{payingStudent.enroll_month}-kunida qabul qilingan</div>
                  </div>
                </div>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-indigo-700">Birinchi oy ({payingStudent.first_month_days}/{payingStudent.first_month_full_days} kun):</span>
                    <span className="font-semibold text-slate-900">
                      {Math.round(payingStudent.first_month_proportion * 100)}% = {formatMoney(payingStudent.first_month_due)}
                    </span>
                  </div>
                  {payingStudent.months_enrolled > 1 && (
                    <div className="flex justify-between">
                      <span className="text-indigo-700">Keyingi {payingStudent.months_enrolled - 1} oy (to'liq):</span>
                      <span className="font-semibold text-slate-900">
                        {formatMoney((payingStudent.months_enrolled - 1) * payingStudent.monthly_fee)}
                      </span>
                    </div>
                  )}
                  <div className="border-t border-slate-200 pt-2 flex justify-between">
                    <span className="font-semibold text-slate-900">Asl jami (chegirmasiz):</span>
                    <span className="font-bold text-slate-900">{formatMoney(payingStudent.total_due_raw || 0)}</span>
                  </div>
                  {payingStudent.discount_amount > 0 && (
                    <div className="flex justify-between text-indigo-700">
                      <span>Chegirma:</span>
                      <span className="font-bold">−{formatMoney(payingStudent.discount_amount)}</span>
                    </div>
                  )}
                  <div className="border-t border-slate-200 pt-2 flex justify-between">
                    <span className="font-semibold text-slate-900">Jami to'lash kerak (chegirma bilan):</span>
                    <span className="font-bold text-slate-900">{formatMoney(payingStudent.total_due)}</span>
                  </div>
                </div>
              </div>
            )}

            {/* === 3. Oylik breakdown (agar 1 dan ko'p oy bo'lsa) === */}
            {payingStudent.months_enrolled > 1 && payingStudent.monthly_breakdown && (
              <div className="rounded-xl border border-border/50 overflow-hidden">
                <div className="bg-muted/40 px-3 py-2 text-xs font-semibold text-muted-foreground">
                  Oylik hisob-kitob ({payingStudent.months_enrolled} oy)
                </div>
                <div className="max-h-32 overflow-y-auto">
                  {payingStudent.monthly_breakdown.map((m: any, i: number) => (
                    <div key={i} className="flex justify-between items-center px-3 py-1.5 text-xs border-b border-border/20 last:border-b-0">
                      <span className="text-muted-foreground">{m.month_label}</span>
                      <div className="flex items-center gap-2">
                        {m.is_partial && (
                          <span className="px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700 text-[9px] font-semibold">
                            {Math.round(m.proportion * 100)}%
                          </span>
                        )}
                        <span className="font-medium">{formatMoney(m.due)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* === 4. To'lov formasi (qo'lda summa kiritiladi) === */}
            <div className="space-y-3">
              <div className="grid sm:grid-cols-2 gap-3">
                <Field label="To'lov summasi (so'm) *">
                  <input
                    type="number"
                    className="erp-input"
                    value={payForm.amount === 0 ? '' : payForm.amount}
                    onChange={(e) => setPayForm({ ...payForm, amount: Number(e.target.value) })}
                    placeholder="Summani qo'lda kiriting..."
                    autoFocus
                  />
                </Field>
                <Field label="To'lov sanasi *">
                  <input
                    type="date"
                    className="erp-input"
                    value={payForm.payment_date}
                    onChange={(e) => setPayForm({ ...payForm, payment_date: e.target.value })}
                  />
                </Field>
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                <Field label="To'lov turi">
                  <select
                    className="erp-input"
                    value={payForm.payment_type}
                    onChange={(e) => setPayForm({ ...payForm, payment_type: e.target.value })}
                  >
                    <option value="cash">Naqd</option>
                    <option value="card">Karta</option>
                    <option value="transfer">O'tkazma</option>
                    <option value="other">Boshqa</option>
                  </select>
                </Field>
                <Field label="Qaysi oy uchun (YYYY-MM)">
                  <input
                    className="erp-input"
                    value={payForm.for_month}
                    onChange={(e) => setPayForm({ ...payForm, for_month: e.target.value })}
                    placeholder={monthStr}
                  />
                </Field>
              </div>

              <Field label="Izoh (ixtiyoriy)">
                <input
                  className="erp-input"
                  value={payForm.description}
                  onChange={(e) => setPayForm({ ...payForm, description: e.target.value })}
                  placeholder="Masalan: Naqd, oylik to'lov"
                />
              </Field>

              {/* === Tezkor tugmalar — summani avtomatik to'ldirish === */}
              <div className="flex gap-2 flex-wrap">
                {payingStudent.remaining > 0 && (
                  <button
                    type="button"
                    onClick={() => setPayForm({ ...payForm, amount: payingStudent.remaining })}
                    className="px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold border border-slate-200"
                  >
                    To'liq qoldiq: {formatMoney(payingStudent.remaining)}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setPayForm({ ...payForm, amount: payingStudent.monthly_fee })}
                  className="px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold border border-slate-200"
                >
                  Bitta oy: {formatMoney(payingStudent.monthly_fee)}
                </button>
                <button
                  type="button"
                  onClick={() => setPayForm({ ...payForm, amount: payingStudent.first_month_due })}
                  className="px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold border border-slate-200"
                >
                  Birinchi oy: {formatMoney(payingStudent.first_month_due)}
                </button>
                <button
                  type="button"
                  onClick={() => setPayForm({ ...payForm, amount: Math.round(payingStudent.monthly_fee / 2) })}
                  className="px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold border border-slate-200"
                >
                  Yarim oy: {formatMoney(Math.round(payingStudent.monthly_fee / 2))}
                </button>
              </div>
            </div>

            {/* === 5. Hisob-kitob ko'rinishi (real-time) === */}
            {payForm.amount > 0 && (
              <div className="rounded-xl bg-slate-50 border border-slate-200 p-3">
                <div className="grid grid-cols-3 gap-3 text-sm text-center">
                  <div>
                    <div className="text-[10px] text-indigo-700">To'layapti</div>
                    <div className="font-bold text-indigo-700">{formatMoney(payForm.amount)}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-indigo-700">Yangi qoldiq</div>
                    <div className={`font-bold ${Math.max(0, payingStudent.remaining - payForm.amount) > 0 ? 'text-indigo-700' : 'text-indigo-700'}`}>
                      {formatMoney(Math.max(0, payingStudent.remaining - payForm.amount))}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-indigo-700">Holat</div>
                    <div className="font-bold text-indigo-700">
                      {payForm.amount >= payingStudent.remaining ? '✓ To\'liq' : 'Qisman'}
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 text-xs text-indigo-700">
              ⚠️ <strong>Eslatma:</strong> «Tasdiqlash» tugmasini bosgandan keyingina to'lov saqlanadi.
              To'lov summasini qo'lda o'zgartirishingiz mumkin.
            </div>

            <div className="flex gap-2 pt-2">
              <PrimaryButton onClick={handleConfirmPay} className="flex-1" disabled={saving || !payForm.amount}>
                {saving ? (
                  <span className="flex items-center gap-2 justify-center">
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>
                    Saqlanmoqda...
                  </span>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12" /></svg>
                    Tasdiqlash
                  </>
                )}
              </PrimaryButton>
              <GhostButton onClick={closePayModal} disabled={saving}>
                Bekor
              </GhostButton>
            </div>
          </div>
        )}
      </Modal>

      {/* === To'lov tarixi modali === */}
      <Modal
        open={showHistory}
        onClose={() => { setShowHistory(false); setHistoryStudent(null) }}
        title={historyStudent ? `To'lov tarixi: ${historyStudent.full_name}` : 'To\'lov tarixi'}
        size="lg"
      >
        <div className="space-y-3">
          {historyStudent && (
            <div className="rounded-xl bg-muted/40 p-3 text-sm">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <div className="text-xs text-muted-foreground">To'lash kerak</div>
                  <div className="font-semibold text-indigo-700">{formatMoney(historyStudent.total_due)}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">To'langan</div>
                  <div className="font-semibold text-indigo-700">{formatMoney(historyStudent.total_paid)}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Qoldiq</div>
                  <div className={`font-bold ${historyStudent.remaining > 0 ? 'text-indigo-700' : 'text-indigo-700'}`}>
                    {formatMoney(Math.max(0, historyStudent.remaining))}
                  </div>
                </div>
              </div>
            </div>
          )}
          {studentHistory.length === 0 ? (
            <EmptyState title="To'lovlar yo'q" description="Bu talaba uchun hali to'lov kiritilmagan." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/40 text-xs text-muted-foreground">
                    <th className="text-left px-3 py-2 font-medium">Sana</th>
                    <th className="text-right px-3 py-2 font-medium">Summa</th>
                    <th className="text-left px-3 py-2 font-medium">Turi</th>
                    <th className="text-left px-3 py-2 font-medium">Oy</th>
                    <th className="text-left px-3 py-2 font-medium">Izoh</th>
                    <th className="px-3 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {studentHistory.map((p) => {
                    // Sana + soat (created_at dan)
                    const dt = p.created_at ? new Date(p.created_at) : new Date(p.payment_date)
                    const dateStr = dt.toLocaleDateString('uz-UZ')
                    const timeStr = dt.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })
                    return (
                    <tr key={p.id} className="border-b border-border/20 hover:bg-muted/40">
                      <td className="px-3 py-2">
                        <div className="font-medium">{formatDate(p.payment_date)}</div>
                        <div className="text-[10px] text-muted-foreground">{dateStr} · {timeStr}</div>
                      </td>
                      <td className="px-3 py-2 text-right font-semibold text-indigo-700">{formatMoney(p.amount)}</td>
                      <td className="px-3 py-2"><PaymentTypeChip type={p.payment_type} /></td>
                      <td className="px-3 py-2 text-muted-foreground">{p.for_month || '—'}</td>
                      <td className="px-3 py-2 text-muted-foreground">{p.description || '—'}</td>
                      <td className="px-3 py-2 text-right">
                        <IconButton title="O'chirish" danger onClick={() => handleDeletePayment(p.id)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </IconButton>
                      </td>
                    </tr>
                    )
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-border/60 bg-muted/30 font-semibold">
                    <td className="px-3 py-2 text-right">Jami:</td>
                    <td className="px-3 py-2 text-right text-indigo-700">
                      {formatMoney(studentHistory.reduce((s, p) => s + Number(p.amount || 0), 0))}
                    </td>
                    <td colSpan={4}></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      </Modal>
    </div>
  )
}
function PaymentTypeChip({ type }: { type: string }) {
  const map: any = { cash: { label: 'Naqd', cls: 'bg-indigo-100 text-indigo-700' }, card: { label: 'Karta', cls: 'bg-indigo-100 text-indigo-700' }, transfer: { label: 'O\'tkazma', cls: 'bg-indigo-100 text-indigo-700' }, other: { label: 'Boshqa', cls: 'bg-indigo-100 text-indigo-700' } }
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
        <div className="bg-gradient-to-br from-slate-600 to-indigo-700 rounded-2xl p-6 text-white shadow-lg ">
          <div className="text-sm opacity-90">Bu oygi sof foyda</div>
          <div className="text-3xl lg:text-4xl font-bold mt-2">{formatMoney(stats.monthNetProfit)}</div>
          <div className="text-xs opacity-75 mt-2">Tushum: {formatMoney(stats.monthRevenue)} • Xarajat: {formatMoney(stats.monthExpenseTotal)}</div>
        </div>
        <div className="bg-gradient-to-br from-indigo-600 to-indigo-700 rounded-2xl p-6 text-white shadow-lg ">
          <div className="text-sm opacity-90">Jami sof foyda</div>
          <div className="text-3xl lg:text-4xl font-bold mt-2">{formatMoney(stats.totalNetProfit)}</div>
          <div className="text-xs opacity-75 mt-2">Tushum: {formatMoney(stats.totalRevenue)} • Xarajat: {formatMoney(stats.totalExpense)}</div>
        </div>
      </div>

      {/* Hisob-kitob */}
      <Card color="rose">
        <CardHeader title="Avtomatik hisob-kitob" subtitle="Tushum - Xarajat = Sof foyda" />
        <div className="p-4 pt-0 space-y-3">
          <FinanceRow label="Bu oygi tushum" value={stats.monthRevenue} color="text-indigo-700" sign="+" />
          <FinanceRow label="Bu oygi xarajat" value={stats.monthExpenseTotal} color="text-red-600" sign="-" />
          <div className="border-t border-border/40 pt-3"><FinanceRow label="Bu oygi sof foyda" value={stats.monthNetProfit} color={stats.monthNetProfit >= 0 ? 'text-indigo-700' : 'text-red-600'} bold /></div>
          <div className="border-t border-border/40 pt-3 mt-3">
            <div className="text-xs text-muted-foreground mb-2">Umumiy hisob-kitob</div>
            <FinanceRow label="Jami tushum" value={stats.totalRevenue} color="text-indigo-700" sign="+" />
            <FinanceRow label="Jami xarajat" value={stats.totalExpense} color="text-red-600" sign="-" />
            <div className="border-t border-border/40 pt-3 mt-3"><FinanceRow label="Jami sof foyda" value={stats.totalNetProfit} color={stats.totalNetProfit >= 0 ? 'text-indigo-700' : 'text-red-600'} bold /></div>
          </div>
        </div>
      </Card>

      {/* Oylik dinamika */}
      <Card color="amber">
        <CardHeader title="Oylik dinamika" subtitle="Daromad vs Xarajat (6 oy)" />
        <div className="p-4 pt-0">
          <div className="space-y-2">
            {stats.monthlyRevenue.map((m: any) => {
              const net = m.total - m.expense
              return (
                <div key={m.month} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-muted/30">
                  <div className="text-xs font-semibold w-12">{m.month.slice(5)}</div>
                  <div className="flex-1 grid grid-cols-3 gap-2 text-xs">
                    <div><span className="text-muted-foreground">Tushum:</span> <span className="font-semibold text-indigo-700">{formatMoney(m.total)}</span></div>
                    <div><span className="text-muted-foreground">Xarajat:</span> <span className="font-semibold text-red-600">{formatMoney(m.expense)}</span></div>
                    <div><span className="text-muted-foreground">Sof:</span> <span className={`font-semibold ${net >= 0 ? 'text-indigo-700' : 'text-red-600'}`}>{formatMoney(net)}</span></div>
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
      <Card color="indigo">
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

      <Card color="violet">
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
  return <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-100 text-indigo-700">{c?.label || cat}</span>
}

// ============================================================================
//  HISOBOTLAR PANEL — batafsil hisobot
// ============================================================================
export function ReportsPanel() {
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  // To'lovlar ro'yxati hisobot uchun
  const [payments, setPayments] = useState<any[]>([])
  const [courses, setCourses] = useState<any[]>([])
  const [groups, setGroups] = useState<any[]>([])
  const [pCourseFilter, setPCourseFilter] = useState('all')
  const [pGroupFilter, setPGroupFilter] = useState('all')
  const [pSearch, setPSearch] = useState('')

  useEffect(() => {
    Promise.all([
      apiFetch('/api/dashboard'),
      apiFetch('/api/payments?limit=1000'),
      apiFetch('/api/courses'),
      apiFetch('/api/groups'),
    ]).then(([d, p, c, g]) => {
      if (d.ok && d.data) setStats(d.data.stats)
      if (p.ok) setPayments(p.data?.payments || [])
      if (c.ok) setCourses(c.data?.courses || [])
      if (g.ok) setGroups(g.data?.groups || [])
      setLoading(false)
    })
  }, [])

  if (loading) return <PanelLoader />
  if (!stats) return <div className="text-center text-muted-foreground py-12">Ma'lumot yuklanmadi.</div>

  // Filtrlangan guruhlar (kurs bo'yicha)
  const reportFilteredGroups = pCourseFilter === 'all' ? groups : groups.filter((g) => g.course_id === pCourseFilter)

  // Filtrlangan to'lovlar
  const filteredPayments = payments.filter((p) => {
    if (pSearch) {
      const name = p.student?.full_name || ''
      if (!name.toLowerCase().includes(pSearch.toLowerCase())) return false
    }
    if (pCourseFilter !== 'all') {
      const courseId = p.student?.course_id || p.group?.course_id
      if (courseId !== pCourseFilter) return false
    }
    if (pGroupFilter !== 'all' && p.group_id !== pGroupFilter) return false
    return true
  })

  const paymentsTotal = filteredPayments.reduce((s, p) => s + Number(p.amount || 0), 0)

  return (
    <div className="space-y-5">
      <div><h1 className="text-2xl lg:text-3xl font-bold">Hisobotlar</h1><p className="text-muted-foreground text-sm mt-1">Batafsil moliyaviy va o'quv hisobotlari</p></div>

      {/* Moliyaviy hisobot */}
      <Card color="sky">
        <CardHeader title="Moliyaviy hisobot" subtitle="Tushum, xarajat, sof foyda" />
        <div className="p-4 pt-0">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border/40 text-xs text-muted-foreground">
              <th className="text-left py-2 font-medium">Ko'rsatkich</th>
              <th className="text-right py-2 font-medium">Bu oy</th>
              <th className="text-right py-2 font-medium">Jami</th>
            </tr></thead>
            <tbody>
              <tr className="border-b border-border/20"><td className="py-2.5">Tushum (to'lovlar)</td><td className="text-right py-2.5 font-bold text-indigo-700">{formatMoney(stats.monthRevenue)}</td><td className="text-right py-2.5 font-bold text-indigo-700">{formatMoney(stats.totalRevenue)}</td></tr>
              <tr className="border-b border-border/20"><td className="py-2.5">Xarajatlar</td><td className="text-right py-2.5 font-bold text-red-600">{formatMoney(stats.monthExpenseTotal)}</td><td className="text-right py-2.5 font-bold text-red-600">{formatMoney(stats.totalExpense)}</td></tr>
              <tr className="bg-muted/30"><td className="py-2.5 font-bold">Sof foyda</td><td className="text-right py-2.5 font-bold text-base text-indigo-700">{formatMoney(stats.monthNetProfit)}</td><td className="text-right py-2.5 font-bold text-base text-indigo-700">{formatMoney(stats.totalNetProfit)}</td></tr>
            </tbody>
          </table>
        </div>
      </Card>

      {/* Xarajatlar tahlili */}
      <Card color="blue">
        <CardHeader title="Xarajatlar tahlili" subtitle="Kategoriya bo'yicha" />
        <div className="p-4 pt-0 space-y-2">
          {Object.entries(stats.expenseByCategory).length === 0 ? <div className="text-sm text-muted-foreground text-center py-4">Xarajatlar yo'q</div> : Object.entries(stats.expenseByCategory).map(([cat, amount]: any) => {
            const pct = stats.totalExpense > 0 ? Math.round((amount / stats.totalExpense) * 100) : 0
            return (
              <div key={cat}>
                <div className="flex justify-between text-xs mb-1"><span className="font-medium">{cat}</span><span className="font-bold text-red-600">{formatMoney(amount)} ({pct}%)</span></div>
                <div className="h-2 rounded-full bg-muted overflow-hidden"><div className="h-full bg-gradient-to-r from-slate-600 to-red-500" style={{ width: `${pct}%` }} /></div>
              </div>
            )
          })}
        </div>
      </Card>

      {/* O'quv hisoboti */}
      <div className="grid lg:grid-cols-2 gap-4">
        <Card color="rose">
          <CardHeader title="O'quv hisoboti" />
          <div className="p-4 pt-0 space-y-2">
            <ReportRow label="Jami talabalar" value={stats.totalStudents} />
            <ReportRow label="Faol talabalar" value={stats.activeStudents} />
            <ReportRow label="Guruhlar" value={stats.totalGroups} />
            <ReportRow label="Kurslar" value={stats.totalCourses} />
            <ReportRow label="O'qituvchilar" value={stats.totalTeachers} />
          </div>
        </Card>
        <Card color="amber">
          <CardHeader title="Davomat hisoboti" />
          <div className="p-4 pt-0 space-y-2">
            <ReportRow label="Jami darslar" value={stats.attendance.total} />
            <ReportRow label="Keldi" value={stats.attendance.present} color="text-indigo-700" />
            <ReportRow label="Kelmadi" value={stats.attendance.absent} color="text-red-600" />
            <ReportRow label="Kechikdi" value={stats.attendance.late} color="text-indigo-700" />
            <ReportRow label="Kelish darajasi" value={`${stats.attendance.rate}%`} color="text-indigo-700" />
          </div>
        </Card>
      </div>

      {/* Lidlar hisoboti */}
      <Card color="indigo">
        <CardHeader title="Sotuv hisoboti (Lidlar)" subtitle="Konversiya bo'yicha" />
        <div className="p-4 pt-0 space-y-2">
          <ReportRow label="Jami lidlar" value={stats.leads.total} />
          <ReportRow label="Yangi" value={stats.leads.new} color="text-indigo-700" />
          <ReportRow label="Bog'lanilgan" value={stats.leads.contacted} color="text-indigo-700" />
          <ReportRow label="Ro'yxatga olingan" value={stats.leads.enrolled} color="text-indigo-700" />
          <div className="border-t border-border/40 pt-2 mt-2">
            <ReportRow label="Konversiya darajasi" value={`${stats.leads.total > 0 ? Math.round((stats.leads.enrolled / stats.leads.total) * 100) : 0}%`} color="text-indigo-700" bold />
          </div>
        </div>
      </Card>

      {/* === YANGI: To'lovlar jadvali hisoboti === */}
      <Card color="violet">
        <CardHeader title="To'lovlar jadvali" subtitle={`${filteredPayments.length} ta to'lov · Jami: ${formatMoney(paymentsTotal)}`} />
        {/* Filtrlar */}
        <div className="p-4 pt-0 flex gap-2 flex-wrap mb-3">
          <div className="flex items-center gap-2 px-3 py-2 bg-card rounded-xl border border-border/50 flex-1 min-w-[200px]">
            <svg className="w-4 h-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
            <input value={pSearch} onChange={(e) => setPSearch(e.target.value)} placeholder="Talaba ismi bo'yicha qidirish..." className="flex-1 bg-transparent outline-none text-sm" />
          </div>
          <select value={pCourseFilter} onChange={(e) => { setPCourseFilter(e.target.value); setPGroupFilter('all') }} className="px-3 py-2 rounded-xl border border-border/50 text-sm bg-card">
            <option value="all">Barcha kurslar</option>
            {courses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select value={pGroupFilter} onChange={(e) => setPGroupFilter(e.target.value)} className="px-3 py-2 rounded-xl border border-border/50 text-sm bg-card">
            <option value="all">Barcha guruhlar</option>
            {reportFilteredGroups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
        </div>

        {/* Jadval */}
        {filteredPayments.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            <svg className="w-10 h-10 mx-auto mb-2 text-muted-foreground/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
            Hozircha to'lovlar yo'q
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/40 text-xs text-muted-foreground">
                  <th className="text-left px-4 py-3 font-medium">#</th>
                  <th className="text-left px-4 py-3 font-medium">Sana / Vaqt</th>
                  <th className="text-left px-4 py-3 font-medium">Talaba</th>
                  <th className="text-left px-4 py-3 font-medium">Kurs</th>
                  <th className="text-left px-4 py-3 font-medium">Guruh</th>
                  <th className="text-right px-4 py-3 font-medium">Summa</th>
                  <th className="text-center px-4 py-3 font-medium">Turi</th>
                  <th className="text-left px-4 py-3 font-medium">Oy</th>
                  <th className="text-left px-4 py-3 font-medium">Izoh</th>
                </tr>
              </thead>
              <tbody>
                {filteredPayments.slice(0, 200).map((p, idx) => {
                  // Sana + soat
                  const dt = p.created_at ? new Date(p.created_at) : new Date(p.payment_date)
                  const dateStr = dt.toLocaleDateString('uz-UZ')
                  const timeStr = dt.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })
                  // Oy va kun alohida
                  const monthNames = ['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun', 'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr']
                  const monthLabel = dt.getMonth() >= 0 ? `${monthNames[dt.getMonth()]} ${dt.getDate()}` : '—'
                  return (
                    <tr key={p.id} className="border-b border-border/20 hover:bg-muted/40">
                      <td className="px-4 py-3 text-muted-foreground text-xs">{idx + 1}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-xs">{dateStr}</div>
                        <div className="text-[10px] text-muted-foreground">{timeStr}</div>
                      </td>
                      <td className="px-4 py-3 font-medium">{p.student?.full_name || '—'}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {p.student?.course?.name || '—'}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{p.group?.name || '—'}</td>
                      <td className="px-4 py-3 text-right font-bold text-indigo-700">{formatMoney(p.amount)}</td>
                      <td className="px-4 py-3 text-center"><PaymentTypeChip type={p.payment_type} /></td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">{p.for_month || monthLabel}</td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">{p.description || '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-border/60 bg-muted/30 font-semibold">
                  <td colSpan={5} className="px-4 py-3 text-right">Jami ({filteredPayments.length} ta to'lov):</td>
                  <td className="px-4 py-3 text-right text-indigo-700">{formatMoney(paymentsTotal)}</td>
                  <td colSpan={3}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
function ReportRow({ label, value, color, bold }: { label: string; value: any; color?: string; bold?: boolean }) {
  return <div className="flex justify-between items-center"><span className={`text-sm ${bold ? 'font-bold' : ''}`}>{label}</span><span className={`font-bold ${color || ''} ${bold ? 'text-lg' : ''}`}>{value}</span></div>
}
