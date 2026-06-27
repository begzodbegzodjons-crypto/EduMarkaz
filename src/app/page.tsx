'use client'
import { useEffect, useState, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useUser, apiFetch, formatDate, formatDateTime, formatMoney, type PublicUser } from '@/lib/client'
import {
  GraduationCap, Users, Wallet, Calendar, BarChart3, BookOpen, UserCog,
  LayoutDashboard, ClipboardCheck, Settings, LogOut, Plus, Trash2, Pencil,
  Search, Lock, CheckCircle, AlertTriangle, Copy, KeyRound, Sparkles,
  Phone, MapPin, Spinner, Menu, X, TelegramIcon, ChevronRight, Download, Crown,
} from '@/components/icons'

const TELEGRAM_HANDLE = process.env.NEXT_PUBLIC_TELEGRAM_HANDLE || 'norinkomp'
const TELEGRAM_URL = process.env.NEXT_PUBLIC_TELEGRAM_URL || `https://t.me/${TELEGRAM_HANDLE}`

// ============================================================================
//  ASOSIY SAHIFA — yakka faylli ERP tizimi
// ============================================================================
export default function Home() {
  const { user, loading, refresh } = useUser()
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login')

  if (loading) return <FullScreenLoader />

  if (!user) {
    return <AuthScreen mode={authMode} onModeChange={setAuthMode} onSuccess={() => refresh()} />
  }

  // Bloklangan foydalanuvchi — faqat aktivatsiya kodi kiritish + telegram
  if (user.status === 'blocked' && user.role !== 'admin') {
    return (
      <BlockedScreen
        user={user}
        onActivated={() => refresh()}
        onLogout={async () => { await apiFetch('/api/auth/logout', { method: 'POST' }); refresh() }}
      />
    )
  }

  return (
    <AppShell
      user={user}
      onRefresh={refresh}
      onLogout={async () => { await apiFetch('/api/auth/logout', { method: 'POST' }); refresh() }}
    />
  )
}

// Re-export ikonkalar — boshqa komponentlar uchun
export {
  GraduationCap, Users, Wallet, Calendar, BarChart3, BookOpen, UserCog,
  LayoutDashboard, ClipboardCheck, Settings, LogOut, Plus, Trash2, Pencil,
  Search, Lock, CheckCircle, AlertTriangle, Copy, KeyRound, Sparkles,
  Phone, MapPin, Spinner, Menu, X, TelegramIcon, ChevronRight, Download, Crown,
}

// ============================================================================
//  LOADER
// ============================================================================
function FullScreenLoader() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-teal-50">
      <AuroraBackground />
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative z-10 flex flex-col items-center gap-4"
      >
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-xl shadow-emerald-500/30">
          <Spinner className="w-8 h-8 text-white" />
        </div>
        <div className="text-emerald-700 font-medium">Yuklanmoqda...</div>
      </motion.div>
    </div>
  )
}

// ============================================================================
//  AURORA FON
// ============================================================================
export function AuroraBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div className="aurora-blob absolute -top-40 -left-40 w-[40rem] h-[40rem] rounded-full bg-emerald-300/30 blur-3xl" />
      <div className="aurora-blob absolute top-1/2 -right-40 w-[35rem] h-[35rem] rounded-full bg-teal-300/25 blur-3xl" style={{ animationDelay: '4s' }} />
      <div className="aurora-blob absolute -bottom-40 left-1/3 w-[30rem] h-[30rem] rounded-full bg-cyan-200/20 blur-3xl" style={{ animationDelay: '8s' }} />
    </div>
  )
}

// ============================================================================
//  AUTH SCREEN (login / register)
// ============================================================================
function AuthScreen({ mode, onModeChange, onSuccess }: { mode: 'login' | 'register'; onModeChange: (m: 'login' | 'register') => void; onSuccess: () => void }) {
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const [loginForm, setLoginForm] = useState({ email: '', password: '' })
  const [regForm, setRegForm] = useState({ full_name: '', phone: '', email: '', center_name: '', address: '', password: '' })

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setErr(null)
    const { ok, error } = await apiFetch('/api/auth/login', { method: 'POST', body: JSON.stringify(loginForm) })
    setLoading(false)
    if (!ok) return setErr(error || 'Xatolik')
    onSuccess()
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setErr(null)
    const { ok, error } = await apiFetch('/api/auth/register', { method: 'POST', body: JSON.stringify(regForm) })
    setLoading(false)
    if (!ok) return setErr(error || 'Xatolik')
    onSuccess()
  }

  return (
    <div className="min-h-screen flex items-stretch bg-gradient-to-br from-emerald-50 via-white to-teal-50 relative overflow-hidden">
      <AuroraBackground />
      <div className="relative z-10 w-full grid lg:grid-cols-2 items-stretch">
        {/* LEFT — Brand */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          className="hidden lg:flex flex-col gap-8 p-12 xl:p-20 justify-center"
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-xl shadow-emerald-500/30">
              <GraduationCap className="w-7 h-7 text-white" />
            </div>
            <div>
              <div className="text-2xl font-bold tracking-tight">EduMarkaz</div>
              <div className="text-xs text-emerald-600 font-medium">ERP Boshqaruv Tizimi</div>
            </div>
          </div>
          <h1 className="text-4xl xl:text-5xl font-bold leading-tight tracking-tight">
            O'quv markazingizni <span className="shimmer-text">bir tizimda</span> boshqaring
          </h1>
          <p className="text-muted-foreground text-lg leading-relaxed">
            Talabalar, guruhlar, o'qituvchilar, to'lovlar, davomat va statistika — barchasi bir joyda.
            Zamonaviy dizayn, tezkor ishlash va ishonchli ma'lumotlar bazasi.
          </p>
          <div className="grid grid-cols-2 gap-4 mt-2">
            <FeaturePill icon="users" label="Talabalar boshqaruvi" />
            <FeaturePill icon="payments" label="To'lov kuzatuvi" />
            <FeaturePill icon="calendar" label="Dars jadvali" />
            <FeaturePill icon="chart" label="Statistika & Hisobot" />
          </div>
          <div className="mt-4 p-4 rounded-xl bg-emerald-50/80 border border-emerald-200">
            <div className="text-xs text-emerald-700 font-medium mb-1">BEPUL SINOV</div>
            <div className="text-sm text-emerald-900">14 kun davomida barcha funksiyalar bilan bepul foydalaning. Karta talab qilinmaydi.</div>
          </div>
        </motion.div>

        {/* RIGHT — Form card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="w-full flex items-center justify-center p-6 sm:p-10 lg:p-12 xl:p-20"
        >
          <div className="glass rounded-3xl shadow-2xl shadow-emerald-900/10 border border-emerald-100/50 p-6 sm:p-8 w-full max-w-lg">
            <div className="lg:hidden flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                <GraduationCap className="w-6 h-6 text-white" />
              </div>
              <div className="text-xl font-bold">EduMarkaz</div>
            </div>

            <div className="flex p-1 bg-muted rounded-xl mb-6">
              <button
                type="button"
                onClick={() => onModeChange('login')}
                className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all ${mode === 'login' ? 'bg-white text-emerald-700 shadow' : 'text-muted-foreground'}`}
              >
                Tizimga kirish
              </button>
              <button
                type="button"
                onClick={() => onModeChange('register')}
                className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all ${mode === 'register' ? 'bg-white text-emerald-700 shadow' : 'text-muted-foreground'}`}
              >
                Ro'yxatdan o'tish
              </button>
            </div>

            <AnimatePresence mode="wait">
              {mode === 'login' ? (
                <motion.form
                  key="login"
                  onSubmit={handleLogin}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  className="space-y-4"
                >
                  <Field label="Email">
                    <input
                      type="email"
                      required
                      value={loginForm.email}
                      onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                      className="erp-input"
                      placeholder="markaz@example.com"
                    />
                  </Field>
                  <Field label="Parol">
                    <input
                      type="password"
                      required
                      value={loginForm.password}
                      onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                      className="erp-input"
                      placeholder="••••••••"
                    />
                  </Field>
                  {err && <ErrorBanner message={err} />}
                  <SubmitButton loading={loading} label="Kirish" />
                  <p className="text-xs text-center text-muted-foreground">
                    Demo admin: <code className="font-mono">admin@erp.uz</code> / <code className="font-mono">admin12345</code>
                  </p>
                </motion.form>
              ) : (
                <motion.form
                  key="register"
                  onSubmit={handleRegister}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="space-y-4"
                >
                  <div className="grid sm:grid-cols-2 gap-4">
                    <Field label="F.I.O *">
                      <input required value={regForm.full_name} onChange={(e) => setRegForm({ ...regForm, full_name: e.target.value })} className="erp-input" placeholder="Aliyev Vali" />
                    </Field>
                    <Field label="Telefon *">
                      <input required value={regForm.phone} onChange={(e) => setRegForm({ ...regForm, phone: e.target.value })} className="erp-input" placeholder="+998901234567" />
                    </Field>
                  </div>
                  <Field label="O'quv markaz nomi *">
                    <input required value={regForm.center_name} onChange={(e) => setRegForm({ ...regForm, center_name: e.target.value })} className="erp-input" placeholder="Mening Markazim" />
                  </Field>
                  <Field label="Email *">
                    <input type="email" required value={regForm.email} onChange={(e) => setRegForm({ ...regForm, email: e.target.value })} className="erp-input" placeholder="markaz@example.com" />
                  </Field>
                  <Field label="Manzil (ixtiyoriy)">
                    <input value={regForm.address} onChange={(e) => setRegForm({ ...regForm, address: e.target.value })} className="erp-input" placeholder="Toshkent, Chilonzor" />
                  </Field>
                  <Field label="Parol * (min. 6 belgi)">
                    <input type="password" required minLength={6} value={regForm.password} onChange={(e) => setRegForm({ ...regForm, password: e.target.value })} className="erp-input" placeholder="••••••••" />
                  </Field>
                  {err && <ErrorBanner message={err} />}
                  <SubmitButton loading={loading} label="Ro'yxatdan o'tish" />
                </motion.form>
              )}
            </AnimatePresence>

            <div className="mt-6 pt-6 border-t border-border/50 text-center">
              <a href={TELEGRAM_URL} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-emerald-600 transition">
                <TelegramIcon className="w-3.5 h-3.5" />
                Yordam: @{TELEGRAM_HANDLE}
              </a>
            </div>
          </div>
        </motion.div>
      </div>

      <style jsx global>{`
        .erp-input {
          width: 100%;
          padding: 0.625rem 1rem;
          border-radius: 0.75rem;
          border: 1px solid var(--input);
          background: color-mix(in oklch, var(--background) 60%, transparent);
          outline: none;
          transition: all 0.15s;
          font-size: 0.9rem;
        }
        .erp-input:focus {
          border-color: var(--primary);
          background: var(--background);
          box-shadow: 0 0 0 3px color-mix(in oklch, var(--primary) 20%, transparent);
        }
      `}</style>
    </div>
  )
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-foreground mb-1.5">{label}</label>
      {children}
    </div>
  )
}

export function ErrorBanner({ message }: { message: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -5 }}
      animate={{ opacity: 1, y: 0 }}
      className="px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700"
    >
      {message}
    </motion.div>
  )
}

export function SubmitButton({ loading, label, icon }: { loading: boolean; label: string; icon?: React.ReactNode }) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
    >
      {loading ? <Spinner className="w-4 h-4" /> : icon}
      {loading ? 'Biroz kuting...' : label}
    </button>
  )
}

function FeaturePill({ icon, label }: { icon: string; label: string }) {
  return (
    <div className="flex items-center gap-2.5 p-3 rounded-xl bg-white/70 border border-emerald-100 backdrop-blur">
      <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700">
        <FeatureIcon name={icon} />
      </div>
      <span className="text-sm font-medium">{label}</span>
    </div>
  )
}

function FeatureIcon({ name }: { name: string }) {
  const cls = 'w-4 h-4'
  switch (name) {
    case 'users': return <Users className={cls} />
    case 'payments': return <Wallet className={cls} />
    case 'calendar': return <Calendar className={cls} />
    case 'chart': return <BarChart3 className={cls} />
    default: return null
  }
}

// ============================================================================
//  BLOCKED SCREEN — faqat aktivatsiya kodi kiritish + telegram kontakt
// ============================================================================
function BlockedScreen({ user, onActivated, onLogout }: { user: PublicUser; onActivated: () => void; onLogout: () => void }) {
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  async function handleActivate(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setErr(null); setSuccess(null)
    const { ok, data, error } = await apiFetch('/api/activate', { method: 'POST', body: JSON.stringify({ code }) })
    setLoading(false)
    if (!ok) return setErr(error || 'Xatolik')
    setSuccess(`Tabriklaymiz! Sizning tizimga kirish huquqingiz ${data?.days_added || 30} kunga uzaytirildi.`)
    setTimeout(() => onActivated(), 2000)
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="aurora-blob absolute -top-40 -left-40 w-[40rem] h-[40rem] rounded-full bg-emerald-500/20 blur-3xl" />
        <div className="aurora-blob absolute top-1/2 -right-40 w-[35rem] h-[35rem] rounded-full bg-teal-500/15 blur-3xl" style={{ animationDelay: '4s' }} />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 w-full max-w-md"
      >
        <div className="glass rounded-3xl shadow-2xl border border-white/10 p-8 backdrop-blur-xl">
          {/* Lock icon */}
          <div className="flex justify-center mb-6">
            <motion.div
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-2xl shadow-amber-500/30"
            >
              <Lock className="w-10 h-10 text-white" />
            </motion.div>
          </div>

          <h2 className="text-center text-2xl font-bold text-white mb-2">Tizim bloklangan</h2>
          <p className="text-center text-slate-300 text-sm mb-6">
            Hurmatli <span className="font-semibold text-white">{user.full_name}</span>,
            sizning bepul 14 kunlik sinov muddatingiz tugadi.
            Tizimda davom etish uchun aktivatsiya kodini kiriting.
          </p>

          {/* Activation form */}
          <form onSubmit={handleActivate} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-2">AKTIVATSIYA KODI</label>
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="XXXX-XXXX-XXXX-XXXX-XXXX-XXXX"
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white font-mono tracking-wider text-center focus:bg-white/10 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/30 outline-none transition"
                required
              />
            </div>
            {err && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="px-4 py-2.5 rounded-xl bg-red-500/20 border border-red-500/30 text-sm text-red-200">
                {err}
              </motion.div>
            )}
            {success && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="px-4 py-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-sm text-emerald-200 flex items-center gap-2">
                <CheckCircle className="w-4 h-4" /> {success}
              </motion.div>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? <Spinner className="w-4 h-4" /> : <KeyRound className="w-4 h-4" />}
              {loading ? 'Tekshirilmoqda...' : 'Aktivlashtirish'}
            </button>
          </form>

          {/* Telegram CTA */}
          <div className="mt-6 pt-6 border-t border-white/10">
            <div className="text-center text-xs text-slate-400 mb-3">AKTIVATSIYA KODINI OLISH UCHUN</div>
            <a
              href={TELEGRAM_URL}
              target="_blank"
              rel="noreferrer"
              className="block w-full py-3 rounded-xl bg-[#229ED9] hover:bg-[#1d8bc4] text-white font-semibold shadow-lg transition-all hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2"
            >
              <TelegramIcon className="w-5 h-5" />
              Telegram orqali yozing: @{TELEGRAM_HANDLE}
            </a>
            <p className="text-center text-xs text-slate-400 mt-3 leading-relaxed">
              To'lovni amalga oshiring va @<strong className="text-slate-200">{TELEGRAM_HANDLE}</strong> akkauntiga yozing.
              Sizga 30 kunlik aktivatsiya kodi yuboriladi.
            </p>
          </div>

          <button
            onClick={onLogout}
            className="mt-4 w-full text-center text-xs text-slate-500 hover:text-slate-300 transition"
          >
            Tizimdan chiqish
          </button>
        </div>
      </motion.div>
    </div>
  )
}

// ============================================================================
//  APP SHELL — asosiy ERP interfeysi (sidebar + content)
// ============================================================================
function AppShell({ user, onRefresh, onLogout }: { user: PublicUser; onRefresh: () => void; onLogout: () => void }) {
  const [activeTab, setActiveTab] = useState<string>('dashboard')
  const [mobileNav, setMobileNav] = useState(false)

  const navItems = useMemo(() => {
    const items = [
      { id: 'dashboard', label: 'Boshqaruv paneli', icon: LayoutDashboard },
      { id: 'students', label: 'Talabalar', icon: Users },
      { id: 'teachers', label: 'O\'qituvchilar', icon: UserCog },
      { id: 'groups', label: 'Guruhlar', icon: Users },
      { id: 'courses', label: 'Kurslar', icon: BookOpen },
      { id: 'payments', label: 'To\'lovlar', icon: Wallet },
      { id: 'attendance', label: 'Davomat', icon: ClipboardCheck },
    ]
    if (user.role === 'admin') {
      items.push({ id: 'admin', label: 'Admin Panel', icon: Crown } as any)
    }
    return items
  }, [user.role])

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return <DashboardPanel user={user} />
      case 'students': return <StudentsPanel />
      case 'teachers': return <TeachersPanel />
      case 'groups': return <GroupsPanel />
      case 'courses': return <CoursesPanel />
      case 'payments': return <PaymentsPanel />
      case 'attendance': return <AttendancePanel />
      case 'admin': return user.role === 'admin' ? <AdminPanel user={user} /> : null
      default: return null
    }
  }

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-emerald-50/30 via-background to-teal-50/20">
      {/* Sidebar — desktop */}
      <aside className="hidden lg:flex w-64 flex-col bg-sidebar text-sidebar-foreground shrink-0">
        <SidebarContent
          user={user}
          navItems={navItems}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onLogout={onLogout}
        />
      </aside>

      {/* Sidebar — mobile */}
      <AnimatePresence>
        {mobileNav && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileNav(false)}
              className="lg:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
            />
            <motion.aside
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              transition={{ type: 'spring', damping: 25, stiffness: 250 }}
              className="lg:hidden fixed left-0 top-0 bottom-0 z-50 w-72 flex flex-col bg-sidebar text-sidebar-foreground"
            >
              <SidebarContent
                user={user}
                navItems={navItems}
                activeTab={activeTab}
                setActiveTab={(t) => { setActiveTab(t); setMobileNav(false) }}
                onLogout={onLogout}
              />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main content */}
      <main className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-30 glass border-b border-border/40 px-4 lg:px-8 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileNav(true)}
              className="lg:hidden p-2 rounded-lg hover:bg-muted"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div>
              <div className="text-xs text-muted-foreground">Assalomu alaykum,</div>
              <div className="font-semibold text-sm">{user.full_name}</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <StatusBadge user={user} />
            <button
              onClick={onLogout}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition"
            >
              <LogOut className="w-3.5 h-3.5" /> Chiqish
            </button>
          </div>
        </header>

        <div className="flex-1 p-4 lg:p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              {renderContent()}
            </motion.div>
          </AnimatePresence>
        </div>

        <footer className="px-4 lg:px-8 py-4 text-center text-xs text-muted-foreground border-t border-border/40">
          <span>EduMarkaz ERP v1.0 • </span>
          <a href={TELEGRAM_URL} target="_blank" rel="noreferrer" className="hover:text-emerald-600 transition inline-flex items-center gap-1">
            <TelegramIcon className="w-3 h-3" /> @{TELEGRAM_HANDLE}
          </a>
        </footer>
      </main>
    </div>
  )
}

function SidebarContent({ user, navItems, activeTab, setActiveTab, onLogout }: {
  user: PublicUser
  navItems: any[]
  activeTab: string
  setActiveTab: (id: string) => void
  onLogout: () => void
}) {
  return (
    <>
      <div className="p-5 border-b border-sidebar-border/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <GraduationCap className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="font-bold text-sidebar-foreground">EduMarkaz</div>
            <div className="text-[10px] text-sidebar-foreground/60">{user.center_name}</div>
          </div>
        </div>
      </div>
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = activeTab === item.id
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-lg shadow-emerald-500/20'
                  : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="truncate">{item.label}</span>
              {isActive && <ChevronRight className="w-4 h-4 ml-auto" />}
            </button>
          )
        })}
      </nav>
      <div className="p-3 border-t border-sidebar-border/50">
        <div className="px-3 py-2 mb-2 rounded-xl bg-sidebar-accent/50">
          <div className="flex items-center gap-2 text-xs">
            {user.status === 'trial' && <Sparkles className="w-3.5 h-3.5 text-amber-400" />}
            {user.status === 'active' && <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />}
            <span className="text-sidebar-foreground/80">
              {user.status === 'trial' && `Bepul sinov: ${user.days_left} kun qoldi`}
              {user.status === 'active' && `Aktiv: ${user.days_left} kun qoldi`}
              {user.role === 'admin' && 'Administrator'}
            </span>
          </div>
        </div>
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground transition"
        >
          <LogOut className="w-4 h-4" /> Tizimdan chiqish
        </button>
      </div>
    </>
  )
}

function StatusBadge({ user }: { user: PublicUser }) {
  if (user.role === 'admin') {
    return (
      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 text-xs font-semibold">
        <Crown className="w-3 h-3" /> Admin
      </div>
    )
  }
  if (user.status === 'trial') {
    return (
      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 text-xs font-semibold">
        <Sparkles className="w-3 h-3" /> Sinov: {user.days_left}k
      </div>
    )
  }
  if (user.status === 'active') {
    return (
      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-semibold">
        <CheckCircle className="w-3 h-3" /> Aktiv: {user.days_left}k
      </div>
    )
  }
  return null
}

// ============================================================================
//  PANEL: DASHBOARD
// ============================================================================
function DashboardPanel({ user }: { user: PublicUser }) {
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

  const attendanceRate = stats.attendance.total > 0
    ? Math.round((stats.attendance.present / stats.attendance.total) * 100)
    : 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold">Boshqaruv paneli</h1>
        <p className="text-muted-foreground text-sm mt-1">{user.center_name} — umumiy ko'rinish</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Jami talabalar" value={stats.totalStudents} sub={`${stats.activeStudents} faol`} icon={Users} color="emerald" />
        <StatCard label="Guruhlar" value={stats.totalGroups} sub={`${stats.totalCourses} kurs`} icon={BookOpen} color="teal" />
        <StatCard label="O'qituvchilar" value={stats.totalTeachers} sub="murabbiylar" icon={UserCog} color="cyan" />
        <StatCard label="Oylik daromad" value={formatMoney(stats.monthRevenue)} sub={`Jami: ${formatMoney(stats.totalRevenue)}`} icon={Wallet} color="amber" />
      </div>

      {/* Charts row */}
      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader title="Oylik daromad dinamikasi" subtitle="So'nggi 6 oy" />
          <div className="p-4 pt-0">
            <SimpleBarChart data={stats.monthlyRevenue.map((m: any) => ({ label: m.month.slice(5), value: m.total }))} />
          </div>
        </Card>

        <Card>
          <CardHeader title="Davomat statistikasi" subtitle={`${attendanceRate}% kelish`} />
          <div className="p-4 pt-0">
            <div className="grid grid-cols-3 gap-3">
              <AttendanceStat label="Keldi" value={stats.attendance.present} color="emerald" />
              <AttendanceStat label="Kelmadi" value={stats.attendance.absent} color="red" />
              <AttendanceStat label="Kechikdi" value={stats.attendance.late} color="amber" />
            </div>
            <div className="mt-4">
              <div className="text-xs text-muted-foreground mb-1.5">Umumiy kelish foizi</div>
              <div className="h-3 rounded-full bg-muted overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${attendanceRate}%` }}
                  transition={{ duration: 1, ease: 'easeOut' }}
                  className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full"
                />
              </div>
              <div className="text-right text-xs text-muted-foreground mt-1">{attendanceRate}%</div>
            </div>
          </div>
        </Card>
      </div>

      {/* Trial banner */}
      {user.status === 'trial' && (
        <Card>
          <div className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <div className="font-semibold">Bepul sinov muddati — {user.days_left} kun qoldi</div>
                <div className="text-sm text-muted-foreground">Davom etish uchun aktivatsiya kodi oling: @{TELEGRAM_HANDLE}</div>
              </div>
            </div>
            <a href={TELEGRAM_URL} target="_blank" rel="noreferrer" className="shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#229ED9] hover:bg-[#1d8bc4] text-white text-sm font-semibold transition">
              <TelegramIcon className="w-4 h-4" /> Yozish
            </a>
          </div>
        </Card>
      )}
    </div>
  )
}

function StatCard({ label, value, sub, icon: Icon, color }: { label: string; value: any; sub: string; icon: any; color: string }) {
  const colorMap: any = {
    emerald: 'from-emerald-500 to-emerald-600 shadow-emerald-500/25',
    teal: 'from-teal-500 to-teal-600 shadow-teal-500/25',
    cyan: 'from-cyan-500 to-cyan-600 shadow-cyan-500/25',
    amber: 'from-amber-500 to-orange-600 shadow-amber-500/25',
  }
  return (
    <motion.div
      whileHover={{ y: -2 }}
      className="bg-card rounded-2xl border border-border/50 p-4 shadow-sm"
    >
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <div className="text-xs text-muted-foreground font-medium">{label}</div>
          <div className="text-xl lg:text-2xl font-bold mt-1 truncate">{value}</div>
          <div className="text-[10px] text-muted-foreground mt-0.5">{sub}</div>
        </div>
        <div className={`shrink-0 w-9 h-9 rounded-xl bg-gradient-to-br ${colorMap[color]} flex items-center justify-center shadow-lg`}>
          <Icon className="w-4 h-4 text-white" />
        </div>
      </div>
    </motion.div>
  )
}

function AttendanceStat({ label, value, color }: { label: string; value: number; color: string }) {
  const map: any = {
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    red: 'bg-red-50 text-red-700 border-red-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
  }
  return (
    <div className={`rounded-xl border p-3 text-center ${map[color]}`}>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs font-medium">{label}</div>
    </div>
  )
}

function SimpleBarChart({ data }: { data: { label: string; value: number }[] }) {
  const max = Math.max(...data.map((d) => d.value), 1)
  return (
    <div className="flex items-end gap-2 h-40">
      {data.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
          <div className="text-[10px] text-muted-foreground font-medium">
            {d.value > 0 ? Math.round(d.value / 1000) + 'k' : ''}
          </div>
          <div className="w-full bg-muted rounded-t-lg overflow-hidden flex items-end" style={{ height: '100%' }}>
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: `${(d.value / max) * 100}%` }}
              transition={{ duration: 0.6, delay: i * 0.1 }}
              className="w-full bg-gradient-to-t from-emerald-500 to-teal-400 rounded-t-lg"
            />
          </div>
          <div className="text-[10px] text-muted-foreground">{d.label}</div>
        </div>
      ))}
    </div>
  )
}

// ============================================================================
//  YORDAMCHI UI KOMPONENTLARI
// ============================================================================
export function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-card rounded-2xl border border-border/50 shadow-sm overflow-hidden ${className}`}>
      {children}
    </div>
  )
}

export function CardHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="px-5 py-4 border-b border-border/40 flex items-center justify-between">
      <div>
        <h3 className="font-semibold text-base">{title}</h3>
        {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}

export function PanelLoader() {
  return (
    <div className="flex items-center justify-center py-20">
      <Spinner className="w-8 h-8 text-emerald-500" />
    </div>
  )
}

export function EmptyState({ title, description, action }: { title: string; description?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
        <Search className="w-7 h-7 text-muted-foreground" />
      </div>
      <h3 className="font-semibold text-lg">{title}</h3>
      {description && <p className="text-sm text-muted-foreground mt-1 max-w-md">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export function Modal({ open, onClose, title, children, size = 'md' }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode; size?: 'sm' | 'md' | 'lg' }) {
  const sizeMap = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl' }
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className={`bg-card rounded-2xl shadow-2xl border border-border/50 w-full ${sizeMap[size]} max-h-[90vh] overflow-y-auto pointer-events-auto`}
            >
              <div className="px-5 py-4 border-b border-border/40 flex items-center justify-between sticky top-0 bg-card z-10">
                <h3 className="font-semibold">{title}</h3>
                <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-5">{children}</div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}

export function PrimaryButton({ children, onClick, type = 'button', disabled, className = '' }: { children: React.ReactNode; onClick?: () => void; type?: 'button' | 'submit'; disabled?: boolean; className?: string }) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-sm font-semibold shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    >
      {children}
    </button>
  )
}

export function GhostButton({ children, onClick, className = '' }: { children: React.ReactNode; onClick?: () => void; className?: string }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition ${className}`}
    >
      {children}
    </button>
  )
}

export function IconButton({ children, onClick, title, danger }: { children: React.ReactNode; onClick?: () => void; title?: string; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`p-1.5 rounded-lg transition ${danger ? 'text-red-600 hover:bg-red-50' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}
    >
      {children}
    </button>
  )
}

// ============================================================================
//  TALABALAR PANELI
// ============================================================================
function StudentsPanel() {
  const [items, setItems] = useState<any[]>([])
  const [groups, setGroups] = useState<any[]>([])
  const [courses, setCourses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [openModal, setOpenModal] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [form, setForm] = useState<any>({ full_name: '', phone: '', parent_phone: '', birth_date: '', address: '', group_id: '', course_id: '', status: 'active', notes: '' })

  const load = useCallback(async () => {
    setLoading(true)
    const [s, g, c] = await Promise.all([
      apiFetch('/api/students'),
      apiFetch('/api/groups'),
      apiFetch('/api/courses'),
    ])
    if (s.ok) setItems(s.data?.students || [])
    if (g.ok) setGroups(g.data?.groups || [])
    if (c.ok) setCourses(c.data?.courses || [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = items.filter((s) =>
    !search || s.full_name?.toLowerCase().includes(search.toLowerCase()) || s.phone?.includes(search)
  )

  async function handleSave() {
    if (editing) {
      const { ok, error } = await apiFetch('/api/students', { method: 'PUT', body: JSON.stringify({ id: editing.id, ...form }) })
      if (!ok) return alert(error)
    } else {
      const { ok, error } = await apiFetch('/api/students', { method: 'POST', body: JSON.stringify(form) })
      if (!ok) return alert(error)
    }
    setOpenModal(false)
    setEditing(null)
    load()
  }

  async function handleDelete(id: string) {
    if (!confirm('Rostdan ham o\'chirmoqchimisiz?')) return
    const { ok, error } = await apiFetch(`/api/students?id=${id}`, { method: 'DELETE' })
    if (!ok) return alert(error)
    load()
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold">Talabalar</h1>
          <p className="text-muted-foreground text-sm mt-1">{items.length} talaba ro'yxatdan o'tgan</p>
        </div>
        <PrimaryButton onClick={() => { setEditing(null); setForm({ full_name: '', phone: '', parent_phone: '', birth_date: '', address: '', group_id: '', course_id: '', status: 'active', notes: '' }); setOpenModal(true) }}>
          <Plus className="w-4 h-4" /> Yangi talaba
        </PrimaryButton>
      </div>

      <div className="flex items-center gap-2 px-3 py-2 bg-card rounded-xl border border-border/50">
        <Search className="w-4 h-4 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Ism yoki telefon bo'yicha qidirish..."
          className="flex-1 bg-transparent outline-none text-sm"
        />
      </div>

      {loading ? <PanelLoader /> : filtered.length === 0 ? (
        <Card><EmptyState title="Talabalar topilmadi" description="Birinchi talabangizni qo'shing." /></Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((s) => (
            <motion.div key={s.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <Card>
                <div className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar name={s.full_name} />
                      <div className="min-w-0">
                        <div className="font-semibold truncate">{s.full_name}</div>
                        <div className="text-xs text-muted-foreground truncate">{s.phone || '—'}</div>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <IconButton title="Tahrirlash" onClick={() => { setEditing(s); setForm({ full_name: s.full_name, phone: s.phone || '', parent_phone: s.parent_phone || '', birth_date: s.birth_date || '', address: s.address || '', group_id: s.group_id || '', course_id: s.course_id || '', status: s.status, notes: s.notes || '' }); setOpenModal(true) }}>
                        <Pencil className="w-3.5 h-3.5" />
                      </IconButton>
                      <IconButton title="O'chirish" danger onClick={() => handleDelete(s.id)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </IconButton>
                    </div>
                  </div>
                  <div className="mt-3 space-y-1.5 text-xs">
                    {s.group && <Row label="Guruh" value={s.group.name} />}
                    {s.course && <Row label="Kurs" value={s.course.name} />}
                    {s.parent_phone && <Row label="Ota-ona" value={s.parent_phone} />}
                  </div>
                  <div className="mt-3 pt-3 border-t border-border/40 flex items-center justify-between">
                    <StatusChip status={s.status} />
                    <span className="text-[10px] text-muted-foreground">{formatDate(s.enrollment_date)}</span>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      <Modal open={openModal} onClose={() => setOpenModal(false)} title={editing ? 'Talabani tahrirlash' : 'Yangi talaba'} size="md">
        <div className="space-y-3">
          <Field label="F.I.O *">
            <input className="erp-input" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
          </Field>
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Telefon">
              <input className="erp-input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </Field>
            <Field label="Ota-ona telefoni">
              <input className="erp-input" value={form.parent_phone} onChange={(e) => setForm({ ...form, parent_phone: e.target.value })} />
            </Field>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Tug'ilgan sana">
              <input type="date" className="erp-input" value={form.birth_date} onChange={(e) => setForm({ ...form, birth_date: e.target.value })} />
            </Field>
            <Field label="Holat">
              <select className="erp-input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                <option value="active">Faol</option>
                <option value="paused">To'xtatilgan</option>
                <option value="graduated">Bitirgan</option>
                <option value="left">Ketgan</option>
              </select>
            </Field>
          </div>
          <Field label="Guruh">
            <select className="erp-input" value={form.group_id} onChange={(e) => setForm({ ...form, group_id: e.target.value })}>
              <option value="">— Tanlang —</option>
              {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </Field>
          <Field label="Kurs">
            <select className="erp-input" value={form.course_id} onChange={(e) => setForm({ ...form, course_id: e.target.value })}>
              <option value="">— Tanlang —</option>
              {courses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
          <Field label="Manzil">
            <input className="erp-input" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          </Field>
          <Field label="Izoh">
            <textarea className="erp-input" rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </Field>
          <div className="flex gap-2 pt-2">
            <PrimaryButton onClick={handleSave} className="flex-1">Saqlash</PrimaryButton>
            <GhostButton onClick={() => setOpenModal(false)}>Bekor</GhostButton>
          </div>
        </div>
      </Modal>
    </div>
  )
}

function Avatar({ name }: { name: string }) {
  const initials = (name || '?').split(' ').slice(0, 2).map((s) => s[0]?.toUpperCase()).join('')
  return (
    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 text-white flex items-center justify-center font-semibold text-sm shrink-0">
      {initials}
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-muted-foreground shrink-0">{label}:</span>
      <span className="font-medium text-right truncate">{value}</span>
    </div>
  )
}

function StatusChip({ status }: { status: string }) {
  const map: any = {
    active: { label: 'Faol', cls: 'bg-emerald-100 text-emerald-700' },
    paused: { label: 'To\'xtatilgan', cls: 'bg-amber-100 text-amber-700' },
    graduated: { label: 'Bitirgan', cls: 'bg-blue-100 text-blue-700' },
    left: { label: 'Ketgan', cls: 'bg-red-100 text-red-700' },
  }
  const s = map[status] || map.active
  return <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${s.cls}`}>{s.label}</span>
}

// ============================================================================
//  O'QITUVCHILAR PANELI
// ============================================================================
function TeachersPanel() {
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

  async function handleDelete(id: string) {
    if (!confirm('O\'chirmoqchimisiz?')) return
    const { ok, error } = await apiFetch(`/api/teachers?id=${id}`, { method: 'DELETE' })
    if (!ok) return alert(error)
    load()
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold">O'qituvchilar</h1>
          <p className="text-muted-foreground text-sm mt-1">{items.length} murabbiy</p>
        </div>
        <PrimaryButton onClick={() => { setEditing(null); setForm({ full_name: '', phone: '', subject: '', salary_amount: 0, hire_date: '', notes: '' }); setOpenModal(true) }}>
          <Plus className="w-4 h-4" /> Yangi o'qituvchi
        </PrimaryButton>
      </div>

      {loading ? <PanelLoader /> : items.length === 0 ? (
        <Card><EmptyState title="O'qituvchilar yo'q" description="Birinchi murabbiyingizni qo'shing." /></Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((t) => (
            <Card key={t.id}>
              <div className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-teal-600 text-white flex items-center justify-center font-semibold text-sm">
                      {t.full_name?.[0]?.toUpperCase()}
                    </div>
                    <div>
                      <div className="font-semibold">{t.full_name}</div>
                      <div className="text-xs text-muted-foreground">{t.subject || 'Fan ko\'rsatilmagan'}</div>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <IconButton title="Tahrirlash" onClick={() => { setEditing(t); setForm({ full_name: t.full_name, phone: t.phone || '', subject: t.subject || '', salary_amount: t.salary_amount || 0, hire_date: t.hire_date || '', notes: t.notes || '' }); setOpenModal(true) }}>
                      <Pencil className="w-3.5 h-3.5" />
                    </IconButton>
                    <IconButton title="O'chirish" danger onClick={() => handleDelete(t.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </IconButton>
                  </div>
                </div>
                <div className="mt-3 space-y-1.5 text-xs">
                  {t.phone && <Row label="Telefon" value={t.phone} />}
                  <Row label="Maosh" value={formatMoney(t.salary_amount)} />
                  <Row label="Ish boshlagan" value={formatDate(t.hire_date)} />
                </div>
              </div>
            </Card>
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
          <div className="flex gap-2 pt-2">
            <PrimaryButton onClick={handleSave} className="flex-1">Saqlash</PrimaryButton>
            <GhostButton onClick={() => setOpenModal(false)}>Bekor</GhostButton>
          </div>
        </div>
      </Modal>
    </div>
  )
}

// ============================================================================
//  GURUHLAR PANELI
// ============================================================================
function GroupsPanel() {
  const [items, setItems] = useState<any[]>([])
  const [courses, setCourses] = useState<any[]>([])
  const [teachers, setTeachers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [openModal, setOpenModal] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [form, setForm] = useState<any>({ name: '', course_id: '', teacher_id: '', start_date: '', end_date: '', schedule: '', max_students: 12 })

  const load = useCallback(async () => {
    setLoading(true)
    const [g, c, t] = await Promise.all([apiFetch('/api/groups'), apiFetch('/api/courses'), apiFetch('/api/teachers')])
    if (g.ok) setItems(g.data?.groups || [])
    if (c.ok) setCourses(c.data?.courses || [])
    if (t.ok) setTeachers(t.data?.teachers || [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

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

  async function handleDelete(id: string) {
    if (!confirm('O\'chirmoqchimisiz?')) return
    const { ok, error } = await apiFetch(`/api/groups?id=${id}`, { method: 'DELETE' })
    if (!ok) return alert(error)
    load()
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold">Guruhlar</h1>
          <p className="text-muted-foreground text-sm mt-1">{items.length} guruh</p>
        </div>
        <PrimaryButton onClick={() => { setEditing(null); setForm({ name: '', course_id: '', teacher_id: '', start_date: '', end_date: '', schedule: '', max_students: 12 }); setOpenModal(true) }}>
          <Plus className="w-4 h-4" /> Yangi guruh
        </PrimaryButton>
      </div>

      {loading ? <PanelLoader /> : items.length === 0 ? (
        <Card><EmptyState title="Guruhlar yo'q" description="Birinchi guruhingizni yarating." /></Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((g) => (
            <Card key={g.id}>
              <div className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center">
                      <Users className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-semibold">{g.name}</div>
                      <div className="text-xs text-muted-foreground">{g.course?.name || 'Kurs yo\'q'}</div>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <IconButton title="Tahrirlash" onClick={() => { setEditing(g); setForm({ name: g.name, course_id: g.course_id || '', teacher_id: g.teacher_id || '', start_date: g.start_date || '', end_date: g.end_date || '', schedule: g.schedule || '', max_students: g.max_students || 12 }); setOpenModal(true) }}>
                      <Pencil className="w-3.5 h-3.5" />
                    </IconButton>
                    <IconButton title="O'chirish" danger onClick={() => handleDelete(g.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </IconButton>
                  </div>
                </div>
                <div className="mt-3 space-y-1.5 text-xs">
                  {g.teacher && <Row label="O'qituvchi" value={g.teacher.full_name} />}
                  <Row label="Jadval" value={g.schedule || '—'} />
                  <Row label="Boshlanish" value={formatDate(g.start_date)} />
                  <Row label="Tugash" value={formatDate(g.end_date)} />
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={openModal} onClose={() => setOpenModal(false)} title={editing ? 'Guruhni tahrirlash' : 'Yangi guruh'}>
        <div className="space-y-3">
          <Field label="Guruh nomi *"><input className="erp-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Kurs">
              <select className="erp-input" value={form.course_id} onChange={(e) => setForm({ ...form, course_id: e.target.value })}>
                <option value="">— Tanlang —</option>
                {courses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>
            <Field label="O'qituvchi">
              <select className="erp-input" value={form.teacher_id} onChange={(e) => setForm({ ...form, teacher_id: e.target.value })}>
                <option value="">— Tanlang —</option>
                {teachers.map((t) => <option key={t.id} value={t.id}>{t.full_name}</option>)}
              </select>
            </Field>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Boshlanish sana"><input type="date" className="erp-input" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} /></Field>
            <Field label="Tugash sana"><input type="date" className="erp-input" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} /></Field>
          </div>
          <Field label="Jadval (matn)"><input className="erp-input" value={form.schedule} onChange={(e) => setForm({ ...form, schedule: e.target.value })} placeholder="Du-Chor-Juma 14:00-16:00" /></Field>
          <Field label="Maks talabalar soni"><input type="number" className="erp-input" value={form.max_students} onChange={(e) => setForm({ ...form, max_students: Number(e.target.value) })} /></Field>
          <div className="flex gap-2 pt-2">
            <PrimaryButton onClick={handleSave} className="flex-1">Saqlash</PrimaryButton>
            <GhostButton onClick={() => setOpenModal(false)}>Bekor</GhostButton>
          </div>
        </div>
      </Modal>
    </div>
  )
}

// ============================================================================
//  KURSLAR PANELI
// ============================================================================
function CoursesPanel() {
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [openModal, setOpenModal] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [form, setForm] = useState<any>({ name: '', description: '', duration_months: 3, price: 0 })

  const load = useCallback(async () => {
    setLoading(true)
    const { ok, data } = await apiFetch('/api/courses')
    if (ok) setItems(data?.courses || [])
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

  async function handleDelete(id: string) {
    if (!confirm('O\'chirmoqchimisiz?')) return
    const { ok, error } = await apiFetch(`/api/courses?id=${id}`, { method: 'DELETE' })
    if (!ok) return alert(error)
    load()
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold">Kurslar</h1>
          <p className="text-muted-foreground text-sm mt-1">{items.length} kurs</p>
        </div>
        <PrimaryButton onClick={() => { setEditing(null); setForm({ name: '', description: '', duration_months: 3, price: 0 }); setOpenModal(true) }}>
          <Plus className="w-4 h-4" /> Yangi kurs
        </PrimaryButton>
      </div>

      {loading ? <PanelLoader /> : items.length === 0 ? (
        <Card><EmptyState title="Kurslar yo'q" description="Birinchi kursingizni yarating." /></Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((c) => (
            <Card key={c.id}>
              <div className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 text-white flex items-center justify-center">
                      <BookOpen className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-semibold">{c.name}</div>
                      <div className="text-xs text-muted-foreground">{c.duration_months} oy</div>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <IconButton title="Tahrirlash" onClick={() => { setEditing(c); setForm({ name: c.name, description: c.description || '', duration_months: c.duration_months, price: c.price }); setOpenModal(true) }}>
                      <Pencil className="w-3.5 h-3.5" />
                    </IconButton>
                    <IconButton title="O'chirish" danger onClick={() => handleDelete(c.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </IconButton>
                  </div>
                </div>
                {c.description && <p className="mt-3 text-xs text-muted-foreground line-clamp-2">{c.description}</p>}
                <div className="mt-3 pt-3 border-t border-border/40 flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Narxi</span>
                  <span className="font-bold text-emerald-600">{formatMoney(c.price)}</span>
                </div>
              </div>
            </Card>
          ))}
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
          <div className="flex gap-2 pt-2">
            <PrimaryButton onClick={handleSave} className="flex-1">Saqlash</PrimaryButton>
            <GhostButton onClick={() => setOpenModal(false)}>Bekor</GhostButton>
          </div>
        </div>
      </Modal>
    </div>
  )
}

// ============================================================================
//  TO'LOVLAR PANELI
// ============================================================================
function PaymentsPanel() {
  const [items, setItems] = useState<any[]>([])
  const [students, setStudents] = useState<any[]>([])
  const [groups, setGroups] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [openModal, setOpenModal] = useState(false)
  const [form, setForm] = useState<any>({ student_id: '', group_id: '', amount: 0, payment_date: new Date().toISOString().slice(0, 10), payment_type: 'cash', for_month: '', description: '' })

  const total = items.reduce((sum, p) => sum + Number(p.amount || 0), 0)
  const monthTotal = items.filter((p) => String(p.payment_date).startsWith(new Date().toISOString().slice(0, 7))).reduce((sum, p) => sum + Number(p.amount || 0), 0)

  const load = useCallback(async () => {
    setLoading(true)
    const [p, s, g] = await Promise.all([apiFetch('/api/payments'), apiFetch('/api/students'), apiFetch('/api/groups')])
    if (p.ok) setItems(p.data?.payments || [])
    if (s.ok) setStudents(s.data?.students || [])
    if (g.ok) setGroups(g.data?.groups || [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function handleSave() {
    const { ok, error } = await apiFetch('/api/payments', { method: 'POST', body: JSON.stringify(form) })
    if (!ok) return alert(error)
    setOpenModal(false)
    setForm({ student_id: '', group_id: '', amount: 0, payment_date: new Date().toISOString().slice(0, 10), payment_type: 'cash', for_month: '', description: '' })
    load()
  }

  async function handleDelete(id: string) {
    if (!confirm('O\'chirmoqchimisiz?')) return
    const { ok, error } = await apiFetch(`/api/payments?id=${id}`, { method: 'DELETE' })
    if (!ok) return alert(error)
    load()
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold">To'lovlar</h1>
          <p className="text-muted-foreground text-sm mt-1">{items.length} to'lov yozuvi</p>
        </div>
        <PrimaryButton onClick={() => setOpenModal(true)}>
          <Plus className="w-4 h-4" /> Yangi to'lov
        </PrimaryButton>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <StatCard label="Jami to'lovlar" value={formatMoney(total)} sub={`${items.length} ta`} icon={Wallet} color="emerald" />
        <StatCard label="Shu oygi" value={formatMoney(monthTotal)} sub={new Date().toLocaleDateString('uz-UZ', { month: 'long' })} icon={BarChart3} color="teal" />
      </div>

      {loading ? <PanelLoader /> : items.length === 0 ? (
        <Card><EmptyState title="To'lovlar yo'q" description="Birinchi to'lov yozuvini qo'shing." /></Card>
      ) : (
        <Card>
          <CardHeader title="To'lovlar tarixi" subtitle={`${items.length} yozuv`} />
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/40 text-xs text-muted-foreground">
                  <th className="text-left px-4 py-3 font-medium">Talaba</th>
                  <th className="text-left px-4 py-3 font-medium">Guruh</th>
                  <th className="text-right px-4 py-3 font-medium">Summa</th>
                  <th className="text-left px-4 py-3 font-medium">Sana</th>
                  <th className="text-left px-4 py-3 font-medium">Turi</th>
                  <th className="text-left px-4 py-3 font-medium">Oy</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((p) => (
                  <tr key={p.id} className="border-b border-border/20 hover:bg-muted/40 transition">
                    <td className="px-4 py-3 font-medium">{p.student?.full_name || '—'}</td>
                    <td className="px-4 py-3 text-muted-foreground">{p.group?.name || '—'}</td>
                    <td className="px-4 py-3 text-right font-bold text-emerald-600">{formatMoney(p.amount)}</td>
                    <td className="px-4 py-3">{formatDate(p.payment_date)}</td>
                    <td className="px-4 py-3"><PaymentTypeChip type={p.payment_type} /></td>
                    <td className="px-4 py-3 text-muted-foreground">{p.for_month || '—'}</td>
                    <td className="px-4 py-3 text-right">
                      <IconButton danger onClick={() => handleDelete(p.id)} title="O'chirish">
                        <Trash2 className="w-3.5 h-3.5" />
                      </IconButton>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Modal open={openModal} onClose={() => setOpenModal(false)} title="Yangi to'lov">
        <div className="space-y-3">
          <Field label="Talaba *">
            <select className="erp-input" value={form.student_id} onChange={(e) => setForm({ ...form, student_id: e.target.value })}>
              <option value="">— Tanlang —</option>
              {students.map((s) => <option key={s.id} value={s.id}>{s.full_name}</option>)}
            </select>
          </Field>
          <Field label="Guruh">
            <select className="erp-input" value={form.group_id} onChange={(e) => setForm({ ...form, group_id: e.target.value })}>
              <option value="">— Tanlang —</option>
              {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </Field>
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Summa (so'm) *"><input type="number" className="erp-input" value={form.amount} onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })} /></Field>
            <Field label="To'lov sanasi"><input type="date" className="erp-input" value={form.payment_date} onChange={(e) => setForm({ ...form, payment_date: e.target.value })} /></Field>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="To'lov turi">
              <select className="erp-input" value={form.payment_type} onChange={(e) => setForm({ ...form, payment_type: e.target.value })}>
                <option value="cash">Naqd</option>
                <option value="card">Karta</option>
                <option value="transfer">O'tkazma</option>
                <option value="other">Boshqa</option>
              </select>
            </Field>
            <Field label="Oy (YYYY-MM)"><input className="erp-input" value={form.for_month} onChange={(e) => setForm({ ...form, for_month: e.target.value })} placeholder="2026-06" /></Field>
          </div>
          <Field label="Izoh"><input className="erp-input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
          <div className="flex gap-2 pt-2">
            <PrimaryButton onClick={handleSave} className="flex-1">Saqlash</PrimaryButton>
            <GhostButton onClick={() => setOpenModal(false)}>Bekor</GhostButton>
          </div>
        </div>
      </Modal>
    </div>
  )
}

function PaymentTypeChip({ type }: { type: string }) {
  const map: any = {
    cash: { label: 'Naqd', cls: 'bg-emerald-100 text-emerald-700' },
    card: { label: 'Karta', cls: 'bg-blue-100 text-blue-700' },
    transfer: { label: 'O\'tkazma', cls: 'bg-violet-100 text-violet-700' },
    other: { label: 'Boshqa', cls: 'bg-slate-100 text-slate-700' },
  }
  const s = map[type] || map.other
  return <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${s.cls}`}>{s.label}</span>
}

// ============================================================================
//  DAVOMAT PANELI
// ============================================================================
function AttendancePanel() {
  const [items, setItems] = useState<any[]>([])
  const [students, setStudents] = useState<any[]>([])
  const [groups, setGroups] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [openModal, setOpenModal] = useState(false)
  const [form, setForm] = useState<any>({ group_id: '', lesson_date: new Date().toISOString().slice(0, 10), records: [] })

  const load = useCallback(async () => {
    setLoading(true)
    const [a, s, g] = await Promise.all([apiFetch('/api/attendance'), apiFetch('/api/students'), apiFetch('/api/groups')])
    if (a.ok) setItems(a.data?.attendance || [])
    if (s.ok) setStudents(s.data?.students || [])
    if (g.ok) setGroups(g.data?.groups || [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  // Form uchun guruh talabalari
  const groupStudents = useMemo(() => {
    if (!form.group_id) return []
    return students.filter((s) => s.group_id === form.group_id)
  }, [form.group_id, students])

  // Guruh tanlanganda barcha talaba uchun "present" qilamiz
  useEffect(() => {
    if (form.group_id) {
      setForm((prev: any) => ({
        ...prev,
        records: groupStudents.map((s) => ({ student_id: s.id, group_id: prev.group_id, lesson_date: prev.lesson_date, status: 'present' })),
      }))
    } else {
      setForm((prev: any) => ({ ...prev, records: [] }))
    }
  }, [form.group_id, groupStudents.length])

  function updateRecord(i: number, status: string) {
    setForm((prev: any) => {
      const records = [...prev.records]
      records[i] = { ...records[i], status }
      return { ...prev, records }
    })
  }

  async function handleSave() {
    if (form.records.length === 0) return alert('Talabalar yo\'q')
    const { ok, error } = await apiFetch('/api/attendance', { method: 'POST', body: JSON.stringify({ records: form.records }) })
    if (!ok) return alert(error)
    setOpenModal(false)
    setForm({ group_id: '', lesson_date: new Date().toISOString().slice(0, 10), records: [] })
    load()
  }

  async function handleDelete(id: string) {
    if (!confirm('O\'chirmoqchimisiz?')) return
    const { ok, error } = await apiFetch(`/api/attendance?id=${id}`, { method: 'DELETE' })
    if (!ok) return alert(error)
    load()
  }

  // Guruhlash
  const grouped = useMemo(() => {
    const m: Record<string, any[]> = {}
    items.forEach((a) => {
      const key = a.lesson_date
      if (!m[key]) m[key] = []
      m[key].push(a)
    })
    return Object.entries(m).sort(([a], [b]) => b.localeCompare(a))
  }, [items])

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold">Davomat</h1>
          <p className="text-muted-foreground text-sm mt-1">{items.length} yozuv</p>
        </div>
        <PrimaryButton onClick={() => setOpenModal(true)}>
          <Plus className="w-4 h-4" /> Davomat belgilash
        </PrimaryButton>
      </div>

      {loading ? <PanelLoader /> : items.length === 0 ? (
        <Card><EmptyState title="Davomat yo'q" description="Birinchi davomat yozuvini qo'shing." /></Card>
      ) : (
        <div className="space-y-4">
          {grouped.map(([date, recs]) => (
            <Card key={date}>
              <CardHeader title={formatDate(date)} subtitle={`${recs.length} talaba`} />
              <div className="p-4 pt-3 grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {recs.map((a) => (
                  <div key={a.id} className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-muted/40 transition">
                    <div className="text-sm font-medium truncate">{a.student?.full_name}</div>
                    <div className="flex items-center gap-1">
                      <AttendanceStatus status={a.status} />
                      <IconButton danger onClick={() => handleDelete(a.id)} title="O'chirish">
                        <Trash2 className="w-3 h-3" />
                      </IconButton>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={openModal} onClose={() => setOpenModal(false)} title="Davomat belgilash" size="lg">
        <div className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Guruh *">
              <select className="erp-input" value={form.group_id} onChange={(e) => setForm({ ...form, group_id: e.target.value })}>
                <option value="">— Tanlang —</option>
                {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
            </Field>
            <Field label="Dars sanasi *">
              <input type="date" className="erp-input" value={form.lesson_date} onChange={(e) => setForm({ ...form, lesson_date: e.target.value })} />
            </Field>
          </div>

          {form.group_id && groupStudents.length === 0 && (
            <div className="px-4 py-3 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-700">
              Bu guruhda talabalar yo'q. Avval talabalar bo'limidan guruhga talaba qo'shing.
            </div>
          )}

          {groupStudents.length > 0 && (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {groupStudents.map((s, i) => (
                <div key={s.id} className="flex items-center justify-between px-3 py-2 rounded-xl bg-muted/40">
                  <span className="text-sm font-medium">{s.full_name}</span>
                  <div className="flex gap-1">
                    {[
                      { v: 'present', label: 'Keldi', cls: 'bg-emerald-500 text-white' },
                      { v: 'absent', label: 'Kelmadi', cls: 'bg-red-500 text-white' },
                      { v: 'late', label: 'Kechikdi', cls: 'bg-amber-500 text-white' },
                      { v: 'excused', label: 'Sababli', cls: 'bg-blue-500 text-white' },
                    ].map((opt) => (
                      <button
                        key={opt.v}
                        type="button"
                        onClick={() => updateRecord(i, opt.v)}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold transition ${
                          form.records[i]?.status === opt.v ? opt.cls : 'bg-white text-muted-foreground border border-border/50 hover:bg-muted'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <PrimaryButton onClick={handleSave} className="flex-1" disabled={form.records.length === 0}>Saqlash</PrimaryButton>
            <GhostButton onClick={() => setOpenModal(false)}>Bekor</GhostButton>
          </div>
        </div>
      </Modal>
    </div>
  )
}

function AttendanceStatus({ status }: { status: string }) {
  const map: any = {
    present: { label: 'Keldi', cls: 'bg-emerald-100 text-emerald-700' },
    absent: { label: 'Kelmadi', cls: 'bg-red-100 text-red-700' },
    late: { label: 'Kechikdi', cls: 'bg-amber-100 text-amber-700' },
    excused: { label: 'Sababli', cls: 'bg-blue-100 text-blue-700' },
  }
  const s = map[status] || map.present
  return <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${s.cls}`}>{s.label}</span>
}

// ============================================================================
//  ADMIN PANEL — aktivatsiya kodlari generatsiyasi
// ============================================================================
function AdminPanel({ user }: { user: PublicUser }) {
  const [codes, setCodes] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'codes' | 'users'>('codes')
  const [genCount, setGenCount] = useState(1)
  const [genDays, setGenDays] = useState(30)
  const [generating, setGenerating] = useState(false)
  const [filterStatus, setFilterStatus] = useState<'all' | 'unused' | 'used' | 'expired'>('all')
  const [copied, setCopied] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const [c, u] = await Promise.all([
      apiFetch(`/api/admin/generate-code?status=${filterStatus}`),
      apiFetch('/api/admin/users'),
    ])
    if (c.ok) setCodes(c.data?.codes || [])
    if (u.ok) setUsers(u.data?.users || [])
    setLoading(false)
  }, [filterStatus])

  useEffect(() => { load() }, [load])

  async function handleGenerate() {
    setGenerating(true)
    const { ok, error } = await apiFetch('/api/admin/generate-code', {
      method: 'POST',
      body: JSON.stringify({ count: genCount, duration_days: genDays }),
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

  const unused = codes.filter((c) => c.status === 'unused').length
  const used = codes.filter((c) => c.status === 'used').length
  const totalUsers = users.length
  const activeUsers = users.filter((u) => u.status === 'active').length
  const blockedUsers = users.filter((u) => u.status === 'blocked').length
  const trialUsers = users.filter((u) => u.status === 'trial').length

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold flex items-center gap-2">
          <Crown className="w-6 h-6 text-amber-500" /> Admin Panel
        </h1>
        <p className="text-muted-foreground text-sm mt-1">Aktivatsiya kodlari va foydalanuvchilarni boshqaring</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Foydalanuvchilar" value={totalUsers} sub={`${activeUsers} aktiv`} icon={Users} color="emerald" />
        <StatCard label="Sinovda" value={trialUsers} sub={`${blockedUsers} bloklangan`} icon={Sparkles} color="amber" />
        <StatCard label="Bo'sh kodlar" value={unused} sub={`${used} ishlatilgan`} icon={KeyRound} color="teal" />
        <StatCard label="Jami kodlar" value={codes.length} sub={`${codes.length} generatsiya`} icon={CheckCircle} color="cyan" />
      </div>

      {/* Generate codes */}
      <Card>
        <CardHeader title="Aktivatsiya kodi generatsiyasi" subtitle="Foydalanuvchilarga berish uchun yangi kodlar yarating" />
        <div className="p-5 grid sm:grid-cols-3 gap-3 items-end">
          <Field label="Miqdori">
            <input type="number" min={1} max={50} className="erp-input" value={genCount} onChange={(e) => setGenCount(Number(e.target.value))} />
          </Field>
          <Field label="Muddati (kun)">
            <input type="number" min={1} max={365} className="erp-input" value={genDays} onChange={(e) => setGenDays(Number(e.target.value))} />
          </Field>
          <PrimaryButton onClick={handleGenerate} disabled={generating} className="h-[42px]">
            {generating ? <Spinner className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
            {generating ? 'Yaratilmoqda...' : 'Generatsiya qilish'}
          </PrimaryButton>
        </div>
      </Card>

      {/* Tabs */}
      <div className="flex p-1 bg-muted rounded-xl max-w-md">
        <button onClick={() => setTab('codes')} className={`flex-1 py-2 text-sm font-semibold rounded-lg transition ${tab === 'codes' ? 'bg-card shadow' : 'text-muted-foreground'}`}>Aktivatsiya kodlari</button>
        <button onClick={() => setTab('users')} className={`flex-1 py-2 text-sm font-semibold rounded-lg transition ${tab === 'users' ? 'bg-card shadow' : 'text-muted-foreground'}`}>Foydalanuvchilar</button>
      </div>

      {loading ? <PanelLoader /> : tab === 'codes' ? (
        <Card>
          <CardHeader
            title="Aktivatsiya kodlari ro'yxati"
            subtitle={`${codes.length} ta kod`}
            action={
              <select className="px-3 py-1.5 rounded-lg border border-border/50 text-xs bg-background" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as any)}>
                <option value="all">Barchasi</option>
                <option value="unused">Ishlatilmagan</option>
                <option value="used">Ishlatilgan</option>
                <option value="expired">Muddati tugagan</option>
              </select>
            }
          />
          {codes.length === 0 ? (
            <EmptyState title="Kodlar yo'q" description="Yuqoridan generatsiya qiling." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/40 text-xs text-muted-foreground">
                    <th className="text-left px-4 py-3 font-medium">Kod</th>
                    <th className="text-left px-4 py-3 font-medium">Muddat</th>
                    <th className="text-left px-4 py-3 font-medium">Holat</th>
                    <th className="text-left px-4 py-3 font-medium">Yaratilgan</th>
                    <th className="text-left px-4 py-3 font-medium">Ishlatgan</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {codes.map((c) => (
                    <tr key={c.id} className="border-b border-border/20 hover:bg-muted/40 transition">
                      <td className="px-4 py-3 font-mono text-xs font-semibold tracking-wider">{c.code}</td>
                      <td className="px-4 py-3">{c.duration_days} kun</td>
                      <td className="px-4 py-3"><CodeStatusChip status={c.status} /></td>
                      <td className="px-4 py-3 text-muted-foreground">{formatDateTime(c.created_at)}</td>
                      <td className="px-4 py-3 text-muted-foreground">{c.used_at ? formatDateTime(c.used_at) : '—'}</td>
                      <td className="px-4 py-3 text-right">
                        {c.status === 'unused' && (
                          <IconButton title="Nusxa olish" onClick={() => copyCode(c.code)}>
                            {copied === c.code ? <CheckCircle className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                          </IconButton>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      ) : (
        <Card>
          <CardHeader title="Foydalanuvchilar ro'yxati" subtitle={`${users.length} foydalanuvchi`} />
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/40 text-xs text-muted-foreground">
                  <th className="text-left px-4 py-3 font-medium">Ism</th>
                  <th className="text-left px-4 py-3 font-medium">Markaz</th>
                  <th className="text-left px-4 py-3 font-medium">Email</th>
                  <th className="text-left px-4 py-3 font-medium">Holat</th>
                  <th className="text-left px-4 py-3 font-medium">Sinov tugaydi</th>
                  <th className="text-left px-4 py-3 font-medium">Aktiv tugaydi</th>
                  <th className="text-left px-4 py-3 font-medium">Oxirgi kirish</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b border-border/20 hover:bg-muted/40 transition">
                    <td className="px-4 py-3 font-medium">{u.full_name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{u.center_name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{u.email}</td>
                    <td className="px-4 py-3"><UserStatusChip status={u.status} role={u.role} /></td>
                    <td className="px-4 py-3 text-muted-foreground">{formatDate(u.trial_ends_at)}</td>
                    <td className="px-4 py-3 text-muted-foreground">{formatDate(u.active_until)}</td>
                    <td className="px-4 py-3 text-muted-foreground">{formatDateTime(u.last_login_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}

function CodeStatusChip({ status }: { status: string }) {
  const map: any = {
    unused: { label: 'Bo\'sh', cls: 'bg-emerald-100 text-emerald-700' },
    used: { label: 'Ishlatilgan', cls: 'bg-slate-100 text-slate-700' },
    expired: { label: 'Muddati o\'tgan', cls: 'bg-red-100 text-red-700' },
  }
  const s = map[status] || map.unused
  return <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${s.cls}`}>{s.label}</span>
}

function UserStatusChip({ status, role }: { status: string; role: string }) {
  if (role === 'admin') return <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-700">Admin</span>
  const map: any = {
    trial: { label: 'Sinov', cls: 'bg-amber-100 text-amber-700' },
    active: { label: 'Aktiv', cls: 'bg-emerald-100 text-emerald-700' },
    blocked: { label: 'Bloklangan', cls: 'bg-red-100 text-red-700' },
  }
  const s = map[status] || map.trial
  return <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${s.cls}`}>{s.label}</span>
}
