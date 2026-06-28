'use client'
import { useEffect, useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { apiFetch, formatDate, formatDateTime } from '@/lib/client'
import {
  GraduationCap, Plus, KeyRound, Crown, Copy, CheckCircle, Sparkles,
  Users, Search, Spinner, Download, X, TelegramIcon,
} from '@/components/icons'

const ADMIN_SECRET = process.env.NEXT_PUBLIC_ADMIN_SECRET || 'norinkomp2024admin'
const TELEGRAM_HANDLE = process.env.NEXT_PUBLIC_TELEGRAM_HANDLE || 'norinkomp'
const TELEGRAM_URL = process.env.NEXT_PUBLIC_TELEGRAM_URL || `https://t.me/${TELEGRAM_HANDLE}`

/**
 * Admin Portal — faqat sayt egasi uchun.
 * URL: /?admin=norinkomp2024admin bilan kiriladi.
 * Faqat aktivatsiya kodi generatsiyasi va mijozlar ro'yxati.
 */
export function AdminPortal({ onExit }: { onExit: () => void }) {
  const [tab, setTab] = useState<'codes' | 'users'>('codes')

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
        <div className="flex p-1 bg-white/5 rounded-xl max-w-md mb-6 border border-white/10">
          <button onClick={() => setTab('codes')} className={`flex-1 py-3 text-sm font-semibold rounded-lg transition ${tab === 'codes' ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}>
            <KeyRound className="w-4 h-4 inline mr-2" /> Aktivatsiya kodlari
          </button>
          <button onClick={() => setTab('users')} className={`flex-1 py-3 text-sm font-semibold rounded-lg transition ${tab === 'users' ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}>
            <Users className="w-4 h-4 inline mr-2" /> Mijozlar
          </button>
        </div>

        {tab === 'codes' ? <CodesTab /> : <UsersTab />}
      </div>
    </div>
  )
}

// ============================================================================
//  KODLAR TAB
// ============================================================================
function CodesTab() {
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
      headers: { 'x-admin-secret': ADMIN_SECRET },
    })
    if (ok) setCodes(data?.codes || [])
    setLoading(false)
  }, [filterStatus])

  useEffect(() => { load() }, [load])

  async function handleGenerate() {
    setGenerating(true)
    const { ok, error } = await apiFetch('/api/admin/generate-code', {
      method: 'POST',
      body: JSON.stringify({ count: genCount, duration_days: genDays }),
      headers: { 'x-admin-secret': ADMIN_SECRET },
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
function UsersTab() {
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  useEffect(() => {
    apiFetch('/api/admin/users', {
      headers: { 'x-admin-secret': ADMIN_SECRET },
    }).then(({ ok, data }) => {
      if (ok) setUsers(data?.users || [])
      setLoading(false)
    })
  }, [])

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
