'use client'
import { useEffect, useState, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { apiFetch, formatDate, formatDateTime } from '@/lib/client'
import {
  GraduationCap, Plus, KeyRound, Crown, Copy, CheckCircle, Sparkles,
  Users, Search, Spinner, Download, X, TelegramIcon, Lock,
} from '@/components/icons'

const TELEGRAM_HANDLE = process.env.NEXT_PUBLIC_TELEGRAM_HANDLE || 'norinkomp'
const TELEGRAM_URL = process.env.NEXT_PUBLIC_TELEGRAM_URL || `https://t.me/${TELEGRAM_HANDLE}`

/**
 * Admin Portal — faqat sayt egasi uchun.
 * URL: /?adminkod bilan kiriladi.
 * Parol so'raladi (env'dagi ADMIN_PASSWORD).
 * Faqat aktivatsiya kodi generatsiyasi va mijozlar ro'yxati.
 */
export function AdminPortal({ onExit }: { onExit: () => void }) {
  const [authed, setAuthed] = useState(false)
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  // sessionStorage'dan parolni tekshiramiz
  useEffect(() => {
    const stored = sessionStorage.getItem('admin_password')
    if (stored) {
      setAuthed(true)
    }
  }, [])

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setErr(null)

    // Admin parolini tekshirish uchun API'ga so'rov
    const { ok, error } = await apiFetch('/api/admin/verify', {
      method: 'POST',
      body: JSON.stringify({ password }),
      headers: { 'x-admin-password': password },
    })

    if (!ok) {
      setErr(error || 'Parol noto\'g\'ri')
      setLoading(false)
      return
    }

    // Parolni sessionStorage'da saqlaymiz (browser yopilguncha)
    sessionStorage.setItem('admin_password', password)
    setAuthed(true)
    setLoading(false)
  }

  function handleLogout() {
    sessionStorage.removeItem('admin_password')
    setAuthed(false)
    setPassword('')
    onExit()
  }

  // Parol kirish ekrani
  if (!authed) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="aurora-blob absolute -top-40 -left-40 w-[40rem] h-[40rem] rounded-full bg-amber-500/20 blur-3xl" />
          <div className="aurora-blob absolute top-1/2 -right-40 w-[35rem] h-[35rem] rounded-full bg-orange-500/15 blur-3xl" style={{ animationDelay: '4s' }} />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative z-10 w-full max-w-md"
        >
          <div className="glass rounded-3xl shadow-2xl border border-white/10 p-8 backdrop-blur-xl">
            <div className="flex justify-center mb-6">
              <motion.div
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-2xl shadow-amber-500/30"
              >
                <Lock className="w-10 h-10 text-white" />
              </motion.div>
            </div>

            <h2 className="text-center text-2xl font-bold text-white mb-2">Admin Panel</h2>
            <p className="text-center text-slate-300 text-sm mb-6">
              Davom etish uchun parolni kiriting
            </p>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2">PAROL</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border-2 border-white/10 text-white text-center focus:bg-white/10 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/30 outline-none transition"
                  required
                  autoFocus
                />
              </div>
              {err && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="px-4 py-2.5 rounded-xl bg-red-500/20 border border-red-500/30 text-sm text-red-200 text-center">
                  {err}
                </motion.div>
              )}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-white font-semibold shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? <Spinner className="w-4 h-4" /> : <KeyRound className="w-4 h-4" />}
                {loading ? 'Tekshirilmoqda...' : 'Kirish'}
              </button>
            </form>

            <button
              onClick={onExit}
              className="mt-6 w-full text-center text-xs text-slate-500 hover:text-slate-300 transition"
            >
              ← Bosh sahifaga qaytish
            </button>
          </div>
        </motion.div>
      </div>
    )
  }

  // Admin panel (parol tasdiqlanganidan keyin)
  return <AdminDashboard onExit={handleLogout} />
}

// ============================================================================
//  ADMIN DASHBOARD (parol tasdiqlanganidan keyin)
// ============================================================================
function AdminDashboard({ onExit }: { onExit: () => void }) {
  const [tab, setTab] = useState<'codes' | 'centers' | 'users'>('centers')
  const password = sessionStorage.getItem('admin_password') || ''

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="aurora-blob absolute -top-40 -left-40 w-[40rem] h-[40rem] rounded-full bg-emerald-500/20 blur-3xl" />
        <div className="aurora-blob absolute top-1/2 -right-40 w-[35rem] h-[35rem] rounded-full bg-teal-500/15 blur-3xl" style={{ animationDelay: '4s' }} />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto p-4 lg:p-8">
        {/* Header */}
        <header className="flex items-center justify-between mb-8 pb-6 border-b border-white/10">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-xl shadow-amber-500/30">
              <Crown className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Admin Panel</h1>
              <p className="text-sm text-slate-400">NorinKomp ERP — Sayt egasi kabineti</p>
            </div>
          </div>
          <button onClick={onExit} className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-sm font-semibold transition flex items-center gap-2">
            <X className="w-4 h-4" /> Chiqish
          </button>
        </header>

        {/* Tabs */}
        <div className="flex p-1 bg-white/5 rounded-xl mb-6 border border-white/10">
          <button onClick={() => setTab('centers')} className={`flex-1 py-3 text-sm font-semibold rounded-lg transition ${tab === 'centers' ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}>
            <GraduationCap className="w-4 h-4 inline mr-2" /> O'quv markazlar
          </button>
          <button onClick={() => setTab('codes')} className={`flex-1 py-3 text-sm font-semibold rounded-lg transition ${tab === 'codes' ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}>
            <KeyRound className="w-4 h-4 inline mr-2" /> Aktivatsiya kodlari
          </button>
          <button onClick={() => setTab('users')} className={`flex-1 py-3 text-sm font-semibold rounded-lg transition ${tab === 'users' ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}>
            <Users className="w-4 h-4 inline mr-2" /> Mijozlar
          </button>
        </div>

        {tab === 'centers' && <CentersTab password={password} />}
        {tab === 'codes' && <CodesTab password={password} />}
        {tab === 'users' && <UsersTab password={password} />}
      </div>
    </div>
  )
}

// ============================================================================
//  MARKAZLAR TAB — barcha o'quv markazlar boshqaruvi
// ============================================================================
function CentersTab({ password }: { password: string }) {
  const [centers, setCenters] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sortBy, setSortBy] = useState<'created' | 'revenue' | 'students' | 'rating' | 'attendance'>('created')
  const [selectedCenter, setSelectedCenter] = useState<any>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const { ok, data } = await apiFetch('/api/admin/centers', {
      headers: { 'x-admin-password': password },
    })
    if (ok) setCenters(data?.centers || [])
    setLoading(false)
  }, [password])

  useEffect(() => { load() }, [load])

  async function handleBlock(center: any) {
    const reason = prompt(`Sababni kiriting (ixtiyoriy):\n${center.center_name} bloklanadi`)
    if (reason === null) return
    const { ok, error } = await apiFetch(`/api/admin/centers/${center.id}/block`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
      headers: { 'x-admin-password': password },
    })
    if (!ok) return alert(error)
    alert(`${center.center_name} bloklandi`)
    load()
  }

  async function handleActivate(center: any) {
    const daysStr = prompt(`Necha kunga aktivlashtirilsin?\n${center.center_name}`, '30')
    if (!daysStr) return
    const days = Number(daysStr)
    if (!days || days < 1) return alert('Noto\'g\'ri kun')
    const { ok, error } = await apiFetch(`/api/admin/centers/${center.id}/activate`, {
      method: 'POST',
      body: JSON.stringify({ days }),
      headers: { 'x-admin-password': password },
    })
    if (!ok) return alert(error)
    alert(`${center.center_name} ${days} kunga aktivlashtirildi`)
    load()
  }

  async function handleUnblock(center: any) {
    const daysStr = prompt(`Blokdan olib, necha kun aktiv qilamiz?\n${center.center_name}`, '30')
    if (!daysStr) return
    const days = Number(daysStr)
    if (!days || days < 1) return alert('Noto\'g\'ri kun')
    const { ok, error } = await apiFetch(`/api/admin/centers/${center.id}/activate`, {
      method: 'POST',
      body: JSON.stringify({ days }),
      headers: { 'x-admin-password': password },
    })
    if (!ok) return alert(error)
    alert(`${center.center_name} blokdan chiqarildi (${days} kun)`)
    load()
  }

  // === YANGI: Markazni butunlay o'chirish ===
  async function handleDelete(center: any) {
    const confirmText = `⚠️ DIQQAT!\n\n${center.center_name} (${center.email}) butunlay o'chiriladi.\n\nBarcha ma'lumotlar yo'qoladi:\n• Talabalar (${center.stats?.students_active || 0})\n• O'qituvchilar (${center.stats?.teachers_count || 0})\n• Guruhlar (${center.stats?.groups_count || 0})\n• Kurslar (${center.stats?.courses_count || 0})\n• To'lovlar va davomatlar\n\nBu amalni qaytarib bo'lmaydi!\n\nDavom etish uchun "O'CHIRISH" so'zini kiriting:`
    const confirmInput = prompt(confirmText)
    if (confirmInput !== "O'CHIRISH") {
      if (confirmInput !== null) alert('Bekor qilindi. Tasdiq so\'zi noto\'g\'ri.')
      return
    }

    const { ok, error, data } = await apiFetch(`/api/admin/centers/${center.id}/delete`, {
      method: 'POST',
      headers: { 'x-admin-password': password },
    })

    if (!ok) {
      alert(error || 'O\'chirishda xatolik yuz berdi.')
      return
    }

    let msg = `${center.center_name} muvaffaqiyatli o'chirildi!`
    if (data?.partial_errors && data.partial_errors.length > 0) {
      msg += `\n\nBa'zi ogohlantirishlar:\n${data.partial_errors.slice(0, 3).join('\n')}`
    }
    alert(msg)
    load()
  }

  // Filtr va sort
  const filtered = useMemoSort(centers, search, statusFilter, sortBy)

  // Umumiy statistika
  const stats = useMemo(() => {
    const active = centers.filter((c) => c.status === 'active').length
    const trial = centers.filter((c) => c.status === 'trial').length
    const blocked = centers.filter((c) => c.status === 'blocked').length
    const totalRevenue = centers.reduce((sum, c) => sum + (c.stats?.total_revenue || 0), 0)
    const totalStudents = centers.reduce((sum, c) => sum + (c.stats?.students_active || 0), 0)
    const totalTeachers = centers.reduce((sum, c) => sum + (c.stats?.teachers_count || 0), 0)
    return { active, trial, blocked, totalRevenue, totalStudents, totalTeachers, total: centers.length }
  }, [centers])

  if (selectedCenter) {
    return <CenterDetails center={selectedCenter} password={password} onBack={() => { setSelectedCenter(null); load() }} />
  }

  return (
    <div className="space-y-5">
      {/* Umumiy statistika */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-xl bg-white/5 border border-white/10 p-4">
          <div className="text-xs text-slate-400">Jami markazlar</div>
          <div className="text-2xl font-bold text-white mt-1">{stats.total}</div>
        </div>
        <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-4">
          <div className="text-xs text-emerald-300">Aktiv</div>
          <div className="text-2xl font-bold text-emerald-400 mt-1">{stats.active}</div>
        </div>
        <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 p-4">
          <div className="text-xs text-amber-300">Sinovda</div>
          <div className="text-2xl font-bold text-amber-400 mt-1">{stats.trial}</div>
        </div>
        <div className="rounded-xl bg-red-500/10 border border-red-500/30 p-4">
          <div className="text-xs text-red-300">Bloklangan</div>
          <div className="text-2xl font-bold text-red-400 mt-1">{stats.blocked}</div>
        </div>
      </div>

      {/* Boshqa statistika */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl bg-white/5 border border-white/10 p-4 text-center">
          <div className="text-xs text-slate-400">Jami talabalar (aktiv)</div>
          <div className="text-xl font-bold text-emerald-400 mt-1">{stats.totalStudents}</div>
        </div>
        <div className="rounded-xl bg-white/5 border border-white/10 p-4 text-center">
          <div className="text-xs text-slate-400">Jami o'qituvchilar</div>
          <div className="text-xl font-bold text-blue-400 mt-1">{stats.totalTeachers}</div>
        </div>
        <div className="rounded-xl bg-white/5 border border-white/10 p-4 text-center">
          <div className="text-xs text-slate-400">Jami daromad</div>
          <div className="text-xl font-bold text-amber-400 mt-1">{stats.totalRevenue.toLocaleString('ru-RU')} so'm</div>
        </div>
      </div>

      {/* Filtrlash */}
      <div className="flex gap-2 flex-wrap">
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10 flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-slate-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Markaz nomi, ism yoki email..." className="flex-1 bg-transparent outline-none text-sm text-white placeholder:text-slate-500" />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white">
          <option value="all" className="bg-slate-800">Barchasi</option>
          <option value="active" className="bg-slate-800">Aktiv</option>
          <option value="trial" className="bg-slate-800">Sinovda</option>
          <option value="blocked" className="bg-slate-800">Bloklangan</option>
        </select>
        <select value={sortBy} onChange={(e) => setSortBy(e.target.value as any)} className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white">
          <option value="created" className="bg-slate-800">Ro'yxatga olingan</option>
          <option value="revenue" className="bg-slate-800">Daromad bo'yicha</option>
          <option value="students" className="bg-slate-800">Talabalar bo'yicha</option>
          <option value="rating" className="bg-slate-800">Reyting bo'yicha</option>
          <option value="attendance" className="bg-slate-800">Davomat bo'yicha</option>
        </select>
      </div>

      {/* Markazlar ro'yxati */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Spinner className="w-8 h-8 text-amber-500" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-12 text-center text-slate-400">
          <GraduationCap className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Markazlar topilmadi</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((c) => (
            <div key={c.id} className="rounded-2xl bg-white/5 border border-white/10 p-4 hover:bg-white/[0.07] transition">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                {/* Markaz ma'lumotlari */}
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-bold shrink-0">
                    {c.center_name?.[0]?.toUpperCase() || 'M'}
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-white truncate">{c.center_name}</div>
                    <div className="text-xs text-slate-400 truncate">
                      {c.full_name} • <span className="text-amber-300/80">✉ {c.email}</span>
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      {c.phone || '—'} • {c.address || 'Manzil ko\'rsatilmagan'}
                    </div>
                    {/* Login ma'lumotlari */}
                    <div className="text-[10px] text-slate-500 mt-1 flex items-center gap-2 flex-wrap">
                      <span className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10">
                        🔑 Login: <span className="text-slate-300 font-mono">{c.email}</span>
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10">
                        🔒 Parol: <span className="text-slate-400">********</span> (hash saqlangan)
                      </span>
                    </div>
                  </div>
                </div>

                {/* Status va kunlar */}
                <div className="flex items-center gap-2 shrink-0">
                  <CenterStatusChip status={c.status} />
                  {c.status !== 'blocked' && (
                    <div className="text-xs text-slate-400">
                      {c.days_left} kun
                    </div>
                  )}
                </div>
              </div>

              {/* Statistika kartochkalari */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 mt-3">
                <StatCell label="Talabalar" value={c.stats?.students_active || 0} color="text-emerald-400" />
                <StatCell label="O'qituvchilar" value={c.stats?.teachers_count || 0} color="text-blue-400" />
                <StatCell label="Kurslar" value={c.stats?.courses_count || 0} color="text-violet-400" />
                <StatCell label="Guruhlar" value={c.stats?.groups_count || 0} color="text-cyan-400" />
                <StatCell label="Reyting" value={`${c.stats?.avg_rating || '0.0'}★`} color="text-amber-400" />
                <StatCell label="Davomat" value={`${c.stats?.attendance_rate || 0}%`} color="text-teal-400" />
              </div>

              {/* Daromad */}
              <div className="mt-2 flex items-center justify-between px-3 py-2 rounded-lg bg-amber-500/5 border border-amber-500/20">
                <span className="text-xs text-amber-300">Jami daromad</span>
                <span className="font-bold text-amber-400">{(c.stats?.total_revenue || 0).toLocaleString('ru-RU')} so'm</span>
              </div>

              {/* Amallar */}
              <div className="flex gap-2 mt-3 flex-wrap">
                <button
                  onClick={() => setSelectedCenter(c)}
                  className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition flex items-center gap-1"
                >
                  <Search className="w-3 h-3" /> Batafsil
                </button>
                {c.status === 'active' && (
                  <button
                    onClick={() => handleBlock(c)}
                    className="px-3 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-300 text-xs font-semibold transition"
                  >
                    Bloklash
                  </button>
                )}
                {c.status === 'trial' && (
                  <button
                    onClick={() => handleBlock(c)}
                    className="px-3 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-300 text-xs font-semibold transition"
                  >
                    Bloklash
                  </button>
                )}
                {c.status === 'blocked' && (
                  <button
                    onClick={() => handleUnblock(c)}
                    className="px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-xs font-semibold transition"
                  >
                    Aktivlashtirish
                  </button>
                )}
                {c.status !== 'blocked' && (
                  <button
                    onClick={() => handleActivate(c)}
                    className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-semibold transition"
                  >
                    + Kun uzaytirish
                  </button>
                )}
                {/* O'chirish tugmasi (faqat blocked va trial uchun) */}
                {(c.status === 'blocked' || c.status === 'trial') && (
                  <button
                    onClick={() => handleDelete(c)}
                    className="px-3 py-1.5 rounded-lg bg-red-600/30 hover:bg-red-600/50 text-red-200 text-xs font-semibold transition border border-red-500/40 flex items-center gap-1"
                    title="Butunlay o'chirish (barcha ma'lumotlar bilan)"
                  >
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
                    O'chirish
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function useMemoSort(centers: any[], search: string, statusFilter: string, sortBy: string) {
  return useMemo(() => {
    let arr = [...centers]
    if (statusFilter !== 'all') arr = arr.filter((c) => c.status === statusFilter)
    if (search) {
      const s = search.toLowerCase()
      arr = arr.filter((c) =>
        c.center_name?.toLowerCase().includes(s) ||
        c.full_name?.toLowerCase().includes(s) ||
        c.email?.toLowerCase().includes(s)
      )
    }
    if (sortBy === 'revenue') arr.sort((a, b) => (b.stats?.total_revenue || 0) - (a.stats?.total_revenue || 0))
    else if (sortBy === 'students') arr.sort((a, b) => (b.stats?.students_active || 0) - (a.stats?.students_active || 0))
    else if (sortBy === 'rating') arr.sort((a, b) => Number(b.stats?.avg_rating || 0) - Number(a.stats?.avg_rating || 0))
    else if (sortBy === 'attendance') arr.sort((a, b) => (b.stats?.attendance_rate || 0) - (a.stats?.attendance_rate || 0))
    else arr.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    return arr
  }, [centers, search, statusFilter, sortBy])
}

function StatCell({ label, value, color }: { label: string; value: any; color: string }) {
  return (
    <div className="rounded-lg bg-white/5 px-2 py-1.5 text-center">
      <div className={`text-sm font-bold ${color}`}>{value}</div>
      <div className="text-[10px] text-slate-400">{label}</div>
    </div>
  )
}

function CenterStatusChip({ status }: { status: string }) {
  const map: any = {
    trial: { label: 'Sinovda', cls: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
    active: { label: 'Aktiv', cls: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
    blocked: { label: 'Bloklangan', cls: 'bg-red-500/20 text-red-300 border-red-500/30' },
  }
  const s = map[status] || map.trial
  return <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${s.cls}`}>{s.label}</span>
}

// ============================================================================
//  MARKAZ BATAFSIL KO'RISH
// ============================================================================
function CenterDetails({ center, password, onBack }: { center: any; password: string; onBack: () => void }) {
  const [details, setDetails] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [subTab, setSubTab] = useState<'summary' | 'students' | 'teachers' | 'courses' | 'payments' | 'ratings' | 'codes'>('summary')

  useEffect(() => {
    apiFetch(`/api/admin/centers/${center.id}/details`, {
      headers: { 'x-admin-password': password },
    }).then(({ ok, data }) => {
      if (ok && data) setDetails(data)
      setLoading(false)
    })
  }, [center.id, password])

  if (loading) return (
    <div className="flex items-center justify-center py-12">
      <Spinner className="w-8 h-8 text-amber-500" />
    </div>
  )
  if (!details) return <div className="text-slate-400 text-center py-12">Ma'lumot topilmadi</div>

  const s = details.details
  const c = details.center

  return (
    <div className="space-y-5">
      {/* Back button */}
      <button onClick={onBack} className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition">
        ← Markazlar ro'yxatiga qaytish
      </button>

      {/* Markaz sarlavhasi */}
      <div className="rounded-2xl bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-500/30 p-5">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white text-2xl font-bold shrink-0">
            {c.center_name?.[0]?.toUpperCase() || 'M'}
          </div>
          <div className="min-w-0">
            <h2 className="text-xl font-bold text-white truncate">{c.center_name}</h2>
            <div className="text-sm text-slate-400">{c.full_name}</div>
            <div className="text-xs text-slate-500 mt-1">{c.email} • {c.phone || '—'}</div>
          </div>
          <div className="ml-auto shrink-0">
            <CenterStatusChip status={c.status} />
          </div>
        </div>
      </div>

      {/* Sub-tabs */}
      <div className="flex p-1 bg-white/5 rounded-xl border border-white/10 overflow-x-auto">
        {[
          { id: 'summary', label: 'Umumiy' },
          { id: 'students', label: `Talabalar (${s.summary.students_count})` },
          { id: 'teachers', label: `O'qituvchilar (${s.summary.teachers_count})` },
          { id: 'courses', label: `Kurslar (${s.summary.courses_count})` },
          { id: 'payments', label: `To'lovlar (${s.payments.length})` },
          { id: 'ratings', label: `Reytinglar (${s.ratings.length})` },
          { id: 'codes', label: `Kodlar (${s.summary.used_codes})` },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setSubTab(t.id as any)}
            className={`px-4 py-2 text-xs font-semibold rounded-lg whitespace-nowrap transition ${subTab === t.id ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white' : 'text-slate-400 hover:text-white'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Sub-tab content */}
      {subTab === 'summary' && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCell label="Talabalar (aktiv)" value={s.summary.students_active} color="text-emerald-400" />
          <StatCell label="Talabalar (jami)" value={s.summary.students_count} color="text-slate-300" />
          <StatCell label="O'qituvchilar" value={s.summary.teachers_count} color="text-blue-400" />
          <StatCell label="Kurslar" value={s.summary.courses_count} color="text-violet-400" />
          <StatCell label="Guruhlar" value={s.summary.groups_count} color="text-cyan-400" />
          <StatCell label="Reyting" value={`${s.summary.avg_rating}★`} color="text-amber-400" />
          <StatCell label="Davomat" value={`${s.summary.attendance_rate}%`} color="text-teal-400" />
          <StatCell label="Daromad" value={`${s.summary.total_revenue.toLocaleString('ru-RU')}`} color="text-emerald-400" />
        </div>
      )}

      {subTab === 'students' && (
        <div className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden">
          {s.students.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-sm">Talabalar yo'q</div>
          ) : (
            <table className="w-full text-sm">
              <thead><tr className="border-b border-white/10 text-xs text-slate-400">
                <th className="text-left px-4 py-3 font-medium">Ism</th>
                <th className="text-left px-4 py-3 font-medium">Telefon</th>
                <th className="text-left px-4 py-3 font-medium">Ota-ona</th>
                <th className="text-left px-4 py-3 font-medium">Kurs</th>
                <th className="text-center px-4 py-3 font-medium">Holat</th>
              </tr></thead>
              <tbody>
                {s.students.map((st: any) => (
                  <tr key={st.id} className="border-b border-white/5 hover:bg-white/5">
                    <td className="px-4 py-3 text-white">{st.full_name}</td>
                    <td className="px-4 py-3 text-slate-400">{st.phone || '—'}</td>
                    <td className="px-4 py-3 text-slate-400">{st.parent_phone || '—'}</td>
                    <td className="px-4 py-3 text-slate-400">{st.course?.name || '—'}</td>
                    <td className="px-4 py-3 text-center"><CenterStatusChip status={st.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {subTab === 'teachers' && (
        <div className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden">
          {s.teachers.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-sm">O'qituvchilar yo'q</div>
          ) : (
            <table className="w-full text-sm">
              <thead><tr className="border-b border-white/10 text-xs text-slate-400">
                <th className="text-left px-4 py-3 font-medium">Ism</th>
                <th className="text-left px-4 py-3 font-medium">Telefon</th>
                <th className="text-left px-4 py-3 font-medium">Fan</th>
                <th className="text-right px-4 py-3 font-medium">Maosh</th>
              </tr></thead>
              <tbody>
                {s.teachers.map((t: any) => (
                  <tr key={t.id} className="border-b border-white/5 hover:bg-white/5">
                    <td className="px-4 py-3 text-white">{t.full_name}</td>
                    <td className="px-4 py-3 text-slate-400">{t.phone || '—'}</td>
                    <td className="px-4 py-3 text-slate-400">{t.subject || '—'}</td>
                    <td className="px-4 py-3 text-right text-amber-400">{Number(t.salary_amount || 0).toLocaleString('ru-RU')} so'm</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {subTab === 'courses' && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {s.courses.length === 0 ? (
            <div className="col-span-full py-8 text-center text-slate-400 text-sm">Kurslar yo'q</div>
          ) : s.courses.map((c: any) => (
            <div key={c.id} className="rounded-xl bg-white/5 border border-white/10 p-4">
              <div className="font-semibold text-white">{c.name}</div>
              <div className="text-xs text-slate-400 mt-1">{c.duration_months} oy</div>
              <div className="text-amber-400 font-bold mt-2">{Number(c.price || 0).toLocaleString('ru-RU')} so'm</div>
            </div>
          ))}
        </div>
      )}

      {subTab === 'payments' && (
        <div className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden">
          {s.payments.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-sm">To'lovlar yo'q</div>
          ) : (
            <table className="w-full text-sm">
              <thead><tr className="border-b border-white/10 text-xs text-slate-400">
                <th className="text-left px-4 py-3 font-medium">Sana</th>
                <th className="text-left px-4 py-3 font-medium">Oy</th>
                <th className="text-right px-4 py-3 font-medium">Summa</th>
              </tr></thead>
              <tbody>
                {s.payments.map((p: any, i: number) => (
                  <tr key={i} className="border-b border-white/5 hover:bg-white/5">
                    <td className="px-4 py-3 text-slate-300">{formatDate(p.payment_date)}</td>
                    <td className="px-4 py-3 text-slate-400">{p.for_month || '—'}</td>
                    <td className="px-4 py-3 text-right text-emerald-400 font-bold">{Number(p.amount || 0).toLocaleString('ru-RU')} so'm</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {subTab === 'ratings' && (
        <div className="space-y-2">
          {s.ratings.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-sm">Reytinglar yo'q</div>
          ) : s.ratings.map((r: any, i: number) => (
            <div key={i} className="rounded-xl bg-white/5 border border-white/10 p-3 flex items-center gap-3">
              <div className="text-2xl font-bold text-amber-400">{r.score}★</div>
              <div className="flex-1 min-w-0">
                <div className="text-sm text-white">{r.student?.full_name || '—'}</div>
                <div className="text-xs text-slate-400">{r.comment || 'Izoh yo\'q'}</div>
              </div>
              <div className="text-xs text-slate-500">{formatDate(r.rating_date)}</div>
            </div>
          ))}
        </div>
      )}

      {subTab === 'codes' && (
        <div className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden">
          {s.usedCodes.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-sm">Ishlatilgan kodlar yo'q</div>
          ) : (
            <table className="w-full text-sm">
              <thead><tr className="border-b border-white/10 text-xs text-slate-400">
                <th className="text-left px-4 py-3 font-medium">Kod</th>
                <th className="text-right px-4 py-3 font-medium">Kunlar</th>
                <th className="text-left px-4 py-3 font-medium">Ishlatilgan sana</th>
              </tr></thead>
              <tbody>
                {s.usedCodes.map((c: any, i: number) => (
                  <tr key={i} className="border-b border-white/5 hover:bg-white/5">
                    <td className="px-4 py-3 font-mono text-xs text-white">{c.code}</td>
                    <td className="px-4 py-3 text-right text-slate-300">{c.duration_days} kun</td>
                    <td className="px-4 py-3 text-slate-400">{formatDate(c.used_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  )
}

// ============================================================================
//  KODLAR TAB
// ============================================================================
function CodesTab({ password }: { password: string }) {
  const [codes, setCodes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [genCount, setGenCount] = useState(1)
  const [genDays, setGenDays] = useState(30)
  const [generating, setGenerating] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)
  const [filterStatus, setFilterStatus] = useState<'all' | 'unused' | 'used' | 'expired'>('all')

  const load = useCallback(async () => {
    setLoading(true)
    const { ok, data } = await apiFetch(`/api/admin/generate-code?status=${filterStatus}`, {
      headers: { 'x-admin-password': password },
    })
    if (ok) setCodes(data?.codes || [])
    setLoading(false)
  }, [filterStatus, password])

  useEffect(() => { load() }, [load])

  async function handleGenerate() {
    setGenerating(true)
    const { ok, error } = await apiFetch('/api/admin/generate-code', {
      method: 'POST',
      body: JSON.stringify({ count: genCount, duration_days: genDays }),
      headers: { 'x-admin-password': password },
    })
    setGenerating(false)
    if (!ok) return alert(error)
    load()
  }

  function copyCode(code: string) {
    navigator.clipboard.writeText(code)
    setCopied(code)
    setTimeout(() => setCopied(null), 1500)
  }

  function copyAll() {
    const unused = codes.filter((c) => c.status === 'unused')
    if (unused.length === 0) return alert('Bo\'sh kodlar yo\'q')
    const text = unused.map((c) => c.code).join('\n')
    navigator.clipboard.writeText(text)
    alert(`${unused.length} ta kod nusxalandi!`)
  }

  function shareToTelegram(code: string) {
    const text = `🎓 EduMarkaz ERP - Aktivatsiya kodi

Sizning aktivatsiya kodingiz:
${code}

Kiritish uchun: Litsenziya bo'limiga kiring va kodni kiriting.
Muddati: 30 kun

@${TELEGRAM_HANDLE}`
    window.open(`https://t.me/share/url?url=${encodeURIComponent('https://t.me/' + TELEGRAM_HANDLE)}&text=${encodeURIComponent(text)}`, '_blank')
  }

  const unused = codes.filter((c) => c.status === 'unused').length
  const used = codes.filter((c) => c.status === 'used').length
  const expired = codes.filter((c) => c.status === 'expired').length

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-xl bg-white/5 border border-white/10 p-4">
          <div className="text-xs text-slate-400">Jami kodlar</div>
          <div className="text-2xl font-bold text-white mt-1">{codes.length}</div>
        </div>
        <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-4">
          <div className="text-xs text-emerald-300">Bo'sh (ishlatilmagan)</div>
          <div className="text-2xl font-bold text-emerald-400 mt-1">{unused}</div>
        </div>
        <div className="rounded-xl bg-blue-500/10 border border-blue-500/30 p-4">
          <div className="text-xs text-blue-300">Ishlatilgan</div>
          <div className="text-2xl font-bold text-blue-400 mt-1">{used}</div>
        </div>
        <div className="rounded-xl bg-red-500/10 border border-red-500/30 p-4">
          <div className="text-xs text-red-300">Muddati o'tgan</div>
          <div className="text-2xl font-bold text-red-400 mt-1">{expired}</div>
        </div>
      </div>

      {/* Generatsiya */}
      <div className="rounded-2xl bg-white/5 border border-white/10 p-5">
        <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-amber-400" /> Yangi aktivatsiya kodlari generatsiyasi
        </h3>
        <div className="grid sm:grid-cols-3 gap-3 items-end">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">Miqdori</label>
            <input type="number" min={1} max={50} className="erp-input" value={genCount} onChange={(e) => setGenCount(Number(e.target.value))} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">Muddati (kun)</label>
            <input type="number" min={1} max={365} className="erp-input" value={genDays} onChange={(e) => setGenDays(Number(e.target.value))} />
          </div>
          <button onClick={handleGenerate} disabled={generating} className="py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-white font-semibold shadow-lg hover:shadow-amber-500/40 transition-all hover:scale-[1.01] disabled:opacity-50 flex items-center justify-center gap-2">
            {generating ? <Spinner className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {generating ? 'Yaratilmoqda...' : 'Generatsiya qilish'}
          </button>
        </div>
        <p className="text-xs text-slate-400 mt-3">Har bir kod {genDays} kunlik aktivlik beradi. Mijoz telegramdan yozganda, kodni generatsiya qilib yuboring.</p>
      </div>

      {/* Kodlar ro'yxati */}
      <div className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden">
        <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between flex-wrap gap-3">
          <h3 className="font-semibold text-white">Aktivatsiya kodlari ro'yxati</h3>
          <div className="flex gap-2">
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as any)} className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-white">
              <option value="all" className="bg-slate-800">Barchasi ({codes.length})</option>
              <option value="unused" className="bg-slate-800">Bo'sh ({unused})</option>
              <option value="used" className="bg-slate-800">Ishlatilgan ({used})</option>
              <option value="expired" className="bg-slate-800">Muddati o'tgan ({expired})</option>
            </select>
            {unused > 0 && (
              <button onClick={copyAll} className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition flex items-center gap-1">
                <Copy className="w-3 h-3" /> Hammasini nusxalash
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Spinner className="w-8 h-8 text-amber-500" />
          </div>
        ) : codes.length === 0 ? (
          <div className="py-12 text-center text-slate-400">
            <KeyRound className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Kodlar yo'q. Yuqoridan generatsiya qiling.</p>
          </div>
        ) : (
          <div className="max-h-[500px] overflow-y-auto">
            {codes.map((c) => (
              <div key={c.id} className="px-5 py-3 border-b border-white/5 hover:bg-white/5 transition flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="font-mono text-sm font-bold text-white tracking-wider">{c.code}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    {c.duration_days} kun • Yaratildi: {formatDateTime(c.created_at)}
                    {c.used_at && ` • Ishlatildi: ${formatDate(c.used_at)}`}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <CodeStatusChip status={c.status} />
                  {c.status === 'unused' && (
                    <div className="flex gap-1">
                      <button onClick={() => copyCode(c.code)} title="Nusxa olish" className="p-1.5 rounded-lg hover:bg-white/10 transition">
                        {copied === c.code ? <CheckCircle className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-slate-300" />}
                      </button>
                      <button onClick={() => shareToTelegram(c.code)} title="Telegramga yuborish" className="p-1.5 rounded-lg hover:bg-white/10 transition">
                        <TelegramIcon className="w-4 h-4 text-[#229ED9]" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function CodeStatusChip({ status }: { status: string }) {
  const map: any = {
    unused: { label: 'Bo\'sh', cls: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
    used: { label: 'Ishlatilgan', cls: 'bg-slate-500/20 text-slate-300 border-slate-500/30' },
    expired: { label: 'Muddati o\'tgan', cls: 'bg-red-500/20 text-red-300 border-red-500/30' },
  }
  const s = map[status] || map.unused
  return <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${s.cls}`}>{s.label}</span>
}

// ============================================================================
//  MIJOZLAR TAB
// ============================================================================
function UsersTab({ password }: { password: string }) {
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  useEffect(() => {
    apiFetch('/api/admin/users', {
      headers: { 'x-admin-password': password },
    }).then(({ ok, data }) => {
      if (ok) setUsers(data?.users || [])
      setLoading(false)
    })
  }, [password])

  const filtered = users.filter((u) => {
    if (statusFilter !== 'all' && u.status !== statusFilter) return false
    if (u.role === 'admin') return false // admin'larni ko'rsatmaymiz
    if (search && !u.full_name?.toLowerCase().includes(search.toLowerCase()) && !u.email?.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const active = users.filter((u) => u.status === 'active' && u.role !== 'admin').length
  const trial = users.filter((u) => u.status === 'trial' && u.role !== 'admin').length
  const blocked = users.filter((u) => u.status === 'blocked' && u.role !== 'admin').length

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-xl bg-white/5 border border-white/10 p-4">
          <div className="text-xs text-slate-400">Jami mijozlar</div>
          <div className="text-2xl font-bold text-white mt-1">{users.filter((u) => u.role !== 'admin').length}</div>
        </div>
        <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-4">
          <div className="text-xs text-emerald-300">Aktiv</div>
          <div className="text-2xl font-bold text-emerald-400 mt-1">{active}</div>
        </div>
        <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 p-4">
          <div className="text-xs text-amber-300">Sinovda</div>
          <div className="text-2xl font-bold text-amber-400 mt-1">{trial}</div>
        </div>
        <div className="rounded-xl bg-red-500/10 border border-red-500/30 p-4">
          <div className="text-xs text-red-300">Bloklangan</div>
          <div className="text-2xl font-bold text-red-400 mt-1">{blocked}</div>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10 flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-slate-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Ism yoki email bo'yicha..." className="flex-1 bg-transparent outline-none text-sm text-white placeholder:text-slate-500" />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white">
          <option value="all" className="bg-slate-800">Barchasi</option>
          <option value="active" className="bg-slate-800">Aktiv</option>
          <option value="trial" className="bg-slate-800">Sinovda</option>
          <option value="blocked" className="bg-slate-800">Bloklangan</option>
        </select>
      </div>

      <div className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Spinner className="w-8 h-8 text-amber-500" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center text-slate-400">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Mijozlar topilmadi</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-xs text-slate-400">
                  <th className="text-left px-4 py-3 font-medium">Ism</th>
                  <th className="text-left px-4 py-3 font-medium">Markaz</th>
                  <th className="text-left px-4 py-3 font-medium">Email</th>
                  <th className="text-left px-4 py-3 font-medium">Telefon</th>
                  <th className="text-center px-4 py-3 font-medium">Holat</th>
                  <th className="text-left px-4 py-3 font-medium">Sinov tugaydi</th>
                  <th className="text-left px-4 py-3 font-medium">Aktiv tugaydi</th>
                  <th className="text-left px-4 py-3 font-medium">Oxirgi kirish</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((u) => (
                  <tr key={u.id} className="border-b border-white/5 hover:bg-white/5 transition">
                    <td className="px-4 py-3 font-medium text-white">{u.full_name}</td>
                    <td className="px-4 py-3 text-slate-300">{u.center_name}</td>
                    <td className="px-4 py-3 text-slate-400">{u.email}</td>
                    <td className="px-4 py-3 text-slate-400">{u.phone || '—'}</td>
                    <td className="px-4 py-3 text-center"><UserStatusChip status={u.status} /></td>
                    <td className="px-4 py-3 text-slate-400">{formatDate(u.trial_ends_at)}</td>
                    <td className="px-4 py-3 text-slate-400">{formatDate(u.active_until)}</td>
                    <td className="px-4 py-3 text-slate-400">{formatDateTime(u.last_login_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

function UserStatusChip({ status }: { status: string }) {
  const map: any = {
    trial: { label: 'Sinovda', cls: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
    active: { label: 'Aktiv', cls: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
    blocked: { label: 'Bloklangan', cls: 'bg-red-500/20 text-red-300 border-red-500/30' },
  }
  const s = map[status] || map.trial
  return <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${s.cls}`}>{s.label}</span>
}
