'use client'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useUser, apiFetch, formatDate, type PublicUser } from '@/lib/client'
import {
  GraduationCap, Users, Wallet, Calendar, BarChart3, BookOpen, UserCog,
  LayoutDashboard, ClipboardCheck, Settings, LogOut, Plus, Trash2, Pencil,
  Search, Lock, CheckCircle, AlertTriangle, Copy, KeyRound, Sparkles,
  Spinner, Menu, X, TelegramIcon, ChevronRight, Crown,
  TrendingUp, TrendingDown, Star, Bell, FileText, Award, Percent,
} from '@/components/icons'

// Panellar
import { DashboardPanel, LeadsPanel, StudentsPanel } from './panels-1'
import { TeachersPanel, GroupsPanel, CoursesPanel, RatingsPanel } from './panels-2'
import { AttendancePanel, AttendanceReportPanel, TeacherAttendancePanel } from './panels-3'
import { PaymentsPanel, FinancePanel, ExpensesPanel, ReportsPanel } from './panels-4'
import { RemindersPanel, SettingsPanel, TelegramPanel, LicensePanel } from './panels-5'
import { ForestClock } from '@/components/ForestClock'
import {
  SchedulePanel, ExamsPanel, CertificatesPanel, DiscountsPanel, DebtsPanel,
  TeacherPayoutsPanel, NotificationsPanel, ReportsExportPanel,
} from './panels-6'
import { AdminPortal } from './admin-portal'

const TELEGRAM_HANDLE = process.env.NEXT_PUBLIC_TELEGRAM_HANDLE || 'norinkomp'
const TELEGRAM_URL = process.env.NEXT_PUBLIC_TELEGRAM_URL || `https://t.me/${TELEGRAM_HANDLE}`
const ADMIN_URL_KEYWORD = process.env.NEXT_PUBLIC_ADMIN_URL || 'adminkod'

const NAV_SECTIONS = [
  { title: 'Boshqaruv', items: [{ id: 'dashboard', label: 'Boshqaruv paneli', icon: LayoutDashboard }] },
  { title: 'Sotuv va Talabalar', items: [
    { id: 'leads', label: 'Lidlar', icon: Sparkles },
    { id: 'students', label: 'Talabalar', icon: Users },
  ] },
  { title: 'O\'qitish', items: [
    { id: 'teachers', label: 'O\'qituvchilar', icon: UserCog },
    { id: 'groups', label: 'Guruhlar', icon: Users },
    { id: 'courses', label: 'Kurslar', icon: BookOpen },
    { id: 'ratings', label: 'Reyting', icon: Star },
  ] },
  { title: 'Davomat', items: [
    { id: 'attendance', label: 'Davomat', icon: ClipboardCheck },
    { id: 'attendance-report', label: 'Davomatlar hisoboti', icon: BarChart3 },
    { id: 'teacher-attendance', label: 'Ustozlar davomati', icon: UserCog },
  ] },
  { title: 'Dars va Imtihon', items: [
    { id: 'schedule', label: 'Dars jadvali', icon: Calendar },
    { id: 'exams', label: 'Imtihonlar', icon: FileText },
    { id: 'certificates', label: 'Sertifikatlar', icon: Award },
  ] },
  { title: 'Moliya', items: [
    { id: 'payments', label: 'To\'lovlar', icon: Wallet },
    { id: 'finance', label: 'Moliya', icon: TrendingUp },
    { id: 'expenses', label: 'Xarajatlar', icon: TrendingDown },
    { id: 'debts', label: 'Talaba qarzlari', icon: AlertTriangle },
    { id: 'teacher-payouts', label: 'O\'qituvchi maoshlari', icon: Wallet },
    { id: 'discounts', label: 'Chegirmalar', icon: Percent },
    { id: 'reports', label: 'Hisobotlar', icon: FileText },
    { id: 'reports-export', label: 'Eksport', icon: FileText },
  ] },
  { title: 'Aloqa', items: [
    { id: 'notifications', label: 'Ota-onaga xabar', icon: Bell },
  ] },
  { title: 'Tizim', items: [
    { id: 'reminders', label: 'Eslatmalar', icon: Bell },
    { id: 'settings', label: 'Sozlamalar', icon: Settings },
    { id: 'telegram', label: 'Telegram', icon: TelegramIcon },
    { id: 'license', label: 'Litsenziya', icon: KeyRound },
  ] },
]

export default function Home() {
  const { user, loading, refresh } = useUser()
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login')
  const [adminMode, setAdminMode] = useState(false)

  // Admin URL parametri: ?adminkod (yoki env'dagi kalit so'z)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      // Faqat kalit so'z mavjud bo'lsa admin rejimini yoqamiz
      // params.get(ADMIN_URL_KEYWORD) emas — kalit so'z o'zi URL'da bo'lishi kerak
      // URL: /?adminkod (qiymatsiz)
      if (params.has(ADMIN_URL_KEYWORD)) {
        setAdminMode(true)
      }
    }
  }, [])

  // Admin portal — sayt egasi uchun
  if (adminMode) {
    return <AdminPortal onExit={() => {
      setAdminMode(false)
      sessionStorage.removeItem('admin_password')
      // URL parametrini olib tashlash
      const url = new URL(window.location.href)
      url.searchParams.delete(ADMIN_URL_KEYWORD)
      window.history.replaceState({}, '', url.toString())
    }} />
  }

  if (loading) return <FullScreenLoader />
  if (!user) return <AuthScreen mode={authMode} onModeChange={setAuthMode} onSuccess={() => refresh()} />
  if (user.status === 'blocked' && user.role !== 'admin') {
    return <BlockedScreen user={user} onActivated={() => refresh()} onLogout={async () => { await apiFetch('/api/auth/logout', { method: 'POST' }); refresh() }} />
  }
  return <AppShell user={user} onRefresh={refresh} onLogout={async () => { await apiFetch('/api/auth/logout', { method: 'POST' }); refresh() }} />
}

function FullScreenLoader() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-teal-50">
      <AuroraBackground />
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="relative z-10 flex flex-col items-center gap-4">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-xl shadow-emerald-500/30"><Spinner className="w-8 h-8 text-white" /></div>
        <div className="text-emerald-700 font-medium">Yuklanmoqda...</div>
      </motion.div>
    </div>
  )
}

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
//  AUTH SCREEN
// ============================================================================
function AuthScreen({ mode, onModeChange, onSuccess }: { mode: 'login' | 'register'; onModeChange: (m: 'login' | 'register') => void; onSuccess: () => void }) {
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [loginForm, setLoginForm] = useState({ email: '', password: '' })
  const [regForm, setRegForm] = useState({ full_name: '', phone: '', email: '', center_name: '', address: '', password: '' })
  const [forgotOpen, setForgotOpen] = useState(false)

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
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6 }} className="hidden lg:flex flex-col gap-7 p-12 xl:p-16 2xl:p-20 justify-center">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-xl shadow-emerald-500/30"><GraduationCap className="w-10 h-10 text-white" /></div>
            <div><div className="text-3xl font-bold tracking-tight">EduMarkaz</div><div className="text-base text-emerald-600 font-medium">ERP Boshqaruv Tizimi</div></div>
          </div>
          <h1 className="text-5xl xl:text-6xl 2xl:text-7xl font-bold leading-tight tracking-tight">O'quv markazingizni <span className="shimmer-text">bir tizimda</span> boshqaring</h1>
          <p className="text-muted-foreground text-xl leading-relaxed">Talabalar, guruhlar, o'qituvchilar, to'lovlar, davomat va statistika — barchasi bir joyda. Zamonaviy dizayn, tezkor ishlash va ishonchli ma'lumotlar bazasi.</p>
          <div className="grid grid-cols-2 gap-5 mt-2">
            <FeaturePill icon="users" label="Talabalar boshqaruvi" />
            <FeaturePill icon="payments" label="To'lov kuzatuvi" />
            <FeaturePill icon="calendar" label="Dars jadvali" />
            <FeaturePill icon="chart" label="Statistika & Hisobot" />
          </div>
          <div className="mt-6 p-6 rounded-2xl bg-emerald-50/80 border border-emerald-200">
            <div className="text-base text-emerald-700 font-bold mb-2 tracking-wide">BEPUL SINOV</div>
            <div className="text-lg text-emerald-900 leading-relaxed">10 kun davomida barcha funksiyalar bilan bepul foydalaning. Karta talab qilinmaydi.</div>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }} className="w-full flex items-center justify-center p-6 sm:p-10 lg:p-12 xl:p-16 2xl:p-20">
          <div className="glass rounded-3xl shadow-2xl shadow-emerald-900/10 border border-emerald-100/50 p-8 sm:p-10 lg:p-10 xl:p-12 w-full max-w-2xl">
            <div className="lg:hidden flex items-center gap-3 mb-8">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center"><GraduationCap className="w-7 h-7 text-white" /></div>
              <div className="text-2xl font-bold">EduMarkaz</div>
            </div>
            <div className="flex p-1.5 bg-muted rounded-2xl mb-8">
              <button type="button" onClick={() => onModeChange('login')} className={`flex-1 py-3.5 text-lg font-semibold rounded-xl transition-all ${mode === 'login' ? 'bg-white text-emerald-700 shadow' : 'text-muted-foreground'}`}>Tizimga kirish</button>
              <button type="button" onClick={() => onModeChange('register')} className={`flex-1 py-3.5 text-lg font-semibold rounded-xl transition-all ${mode === 'register' ? 'bg-white text-emerald-700 shadow' : 'text-muted-foreground'}`}>Ro'yxatdan o'tish</button>
            </div>
            <AnimatePresence mode="wait">
              {mode === 'login' ? (
                <motion.form key="login" onSubmit={handleLogin} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="space-y-6">
                  <Field label="Email" labelSize="lg"><input type="email" required value={loginForm.email} onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })} className="erp-input" placeholder="markaz@example.com" /></Field>
                  <Field label="Parol" labelSize="lg"><input type="password" required value={loginForm.password} onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })} className="erp-input" placeholder="••••••••" /></Field>
                  {err && <ErrorBanner message={err} />}
                  <SubmitButton loading={loading} label="Kirish" size="lg" />
                  <div className="text-center">
                    <button type="button" onClick={() => setForgotOpen(true)} className="text-sm text-emerald-600 hover:text-emerald-700 hover:underline">Parolni unutdingizmi?</button>
                  </div>
                </motion.form>
              ) : (
                <motion.form key="register" onSubmit={handleRegister} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="space-y-5">
                  <div className="grid sm:grid-cols-2 gap-5">
                    <Field label="F.I.O *" labelSize="lg"><input required value={regForm.full_name} onChange={(e) => setRegForm({ ...regForm, full_name: e.target.value })} className="erp-input" placeholder="Aliyev Vali" /></Field>
                    <Field label="Telefon *" labelSize="lg"><input required value={regForm.phone} onChange={(e) => setRegForm({ ...regForm, phone: e.target.value })} className="erp-input" placeholder="+998901234567" /></Field>
                  </div>
                  <Field label="O'quv markaz nomi *" labelSize="lg"><input required value={regForm.center_name} onChange={(e) => setRegForm({ ...regForm, center_name: e.target.value })} className="erp-input" placeholder="Mening Markazim" /></Field>
                  <Field label="Email *" labelSize="lg"><input type="email" required value={regForm.email} onChange={(e) => setRegForm({ ...regForm, email: e.target.value })} className="erp-input" placeholder="markaz@example.com" /></Field>
                  <Field label="Manzil (ixtiyoriy)" labelSize="lg"><input value={regForm.address} onChange={(e) => setRegForm({ ...regForm, address: e.target.value })} className="erp-input" placeholder="Toshkent, Chilonzor" /></Field>
                  <Field label="Parol * (min. 6 belgi)" labelSize="lg"><input type="password" required minLength={6} value={regForm.password} onChange={(e) => setRegForm({ ...regForm, password: e.target.value })} className="erp-input" placeholder="••••••••" /></Field>
                  {err && <ErrorBanner message={err} />}
                  <SubmitButton loading={loading} label="Ro'yxatdan o'tish" size="lg" />
                </motion.form>
              )}
            </AnimatePresence>
            <div className="mt-8 pt-6 border-t border-border/50 text-center">
              <a href={TELEGRAM_URL} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-base text-muted-foreground hover:text-emerald-600 transition"><TelegramIcon className="w-5 h-5" />Yordam: @{TELEGRAM_HANDLE}</a>
            </div>
          </div>
        </motion.div>
      </div>
      <ForgotPasswordModal open={forgotOpen} onClose={() => setForgotOpen(false)} />
    </div>
  )
}

function FeaturePill({ icon, label }: { icon: string; label: string }) {
  const map: any = { users: Users, payments: Wallet, calendar: Calendar, chart: BarChart3 }
  const Icon = map[icon] || Users
  return (
    <div className="flex items-center gap-3.5 p-4 rounded-2xl bg-white/70 border border-emerald-100 backdrop-blur">
      <div className="w-11 h-11 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700"><Icon className="w-5 h-5" /></div>
      <span className="text-base font-medium">{label}</span>
    </div>
  )
}

// ============================================================================
//  PAROLNI TIKLASH MODALI — yangi funksiya
// ============================================================================
function ForgotPasswordModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [step, setStep] = useState<1 | 2>(1)
  const [email, setEmail] = useState('')
  const [token, setToken] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  function handleClose() {
    onClose()
    setTimeout(() => { setStep(1); setEmail(''); setToken(''); setNewPassword(''); setMsg(null); setErr(null) }, 300)
  }

  async function handleRequest() {
    if (!email) return setErr('Email kiriting')
    setLoading(true); setErr(null); setMsg(null)
    const { ok, data, error } = await apiFetch('/api/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) })
    setLoading(false)
    if (!ok) return setErr(error || 'Xatolik')
    setMsg(data?.message || 'Tiklash kodi yaratildi.')
    setStep(2)
  }

  async function handleReset() {
    if (!email || !token || !newPassword) return setErr('Barcha maydonlarni to\'ldiring')
    if (newPassword.length < 6) return setErr('Parol kamida 6 belgi bo\'lishi kerak')
    setLoading(true); setErr(null); setMsg(null)
    const { ok, data, error } = await apiFetch('/api/auth/reset-password', { method: 'POST', body: JSON.stringify({ email, token, new_password: newPassword }) })
    setLoading(false)
    if (!ok) return setErr(error || 'Xatolik')
    setMsg(data?.message || 'Parol o\'zgartirildi!')
    setTimeout(() => handleClose(), 2000)
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={handleClose} className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="bg-card rounded-2xl shadow-2xl border border-border/50 w-full max-w-md pointer-events-auto">
              <div className="px-5 py-4 border-b border-border/40 flex items-center justify-between">
                <h3 className="font-semibold">{step === 1 ? 'Parolni tiklash' : 'Yangi parol'}</h3>
                <button onClick={handleClose} className="p-1.5 rounded-lg hover:bg-muted transition"><X className="w-4 h-4" /></button>
              </div>
              <div className="p-5 space-y-4">
                {step === 1 ? (
                  <>
                    <p className="text-sm text-muted-foreground">Email manzilingizni kiriting. Sizga tiklash kodi yuboriladi (admin @norinkomp orqali).</p>
                    <Field label="Email"><input type="email" className="erp-input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="markaz@example.com" /></Field>
                    {err && <div className="px-4 py-2.5 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">{err}</div>}
                    {msg && <div className="px-4 py-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-sm text-emerald-700">{msg}</div>}
                    <button onClick={handleRequest} disabled={loading} className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold disabled:opacity-50 flex items-center justify-center gap-2">
                      {loading && <Spinner className="w-4 h-4" />}{loading ? 'Yuborilmoqda...' : 'Kod so\'rash'}
                    </button>
                  </>
                ) : (
                  <>
                    <p className="text-sm text-muted-foreground">Emailingizga yuborilgan 6-xonali kodni va yangi parolni kiriting.</p>
                    <Field label="Email"><input type="email" className="erp-input" value={email} onChange={(e) => setEmail(e.target.value)} disabled /></Field>
                    <Field label="Tiklash kodi"><input className="erp-input font-mono tracking-wider text-center" value={token} onChange={(e) => setToken(e.target.value)} placeholder="123456" maxLength={6} /></Field>
                    <Field label="Yangi parol"><input type="password" className="erp-input" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="••••••••" /></Field>
                    {err && <div className="px-4 py-2.5 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">{err}</div>}
                    {msg && <div className="px-4 py-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-sm text-emerald-700 flex items-center gap-2"><CheckCircle className="w-4 h-4" /> {msg}</div>}
                    <button onClick={handleReset} disabled={loading} className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold disabled:opacity-50 flex items-center justify-center gap-2">
                      {loading && <Spinner className="w-4 h-4" />}{loading ? 'O\'zgartirilmoqda...' : 'Parolni o\'zgartirish'}
                    </button>
                    <button onClick={() => setStep(1)} className="w-full text-center text-xs text-muted-foreground hover:text-foreground">← Orqaga</button>
                  </>
                )}
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}

export function Field({ label, children, labelSize = 'sm' }: { label: string; children: React.ReactNode; labelSize?: 'sm' | 'lg' }) {
  return <div><label className={`block font-semibold text-foreground mb-1.5 ${labelSize === 'lg' ? 'text-base' : 'text-xs'}`}>{label}</label>{children}</div>
}
export function ErrorBanner({ message }: { message: string }) {
  return <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">{message}</motion.div>
}
export function SubmitButton({ loading, label, icon, size = 'md' }: { loading: boolean; label: string; icon?: React.ReactNode; size?: 'md' | 'lg' }) {
  const pad = size === 'lg' ? 'py-4 text-lg' : 'py-3 text-sm'
  return (
    <button type="submit" disabled={loading} className={`w-full ${pad} rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2`}>
      {loading ? <Spinner className="w-5 h-5" /> : icon}{loading ? 'Biroz kuting...' : label}
    </button>
  )
}

// ============================================================================
//  BLOCKED SCREEN
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
      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="relative z-10 w-full max-w-md">
        <div className="glass rounded-3xl shadow-2xl border border-white/10 p-8 backdrop-blur-xl">
          <div className="flex justify-center mb-6">
            <motion.div animate={{ scale: [1, 1.05, 1] }} transition={{ duration: 2, repeat: Infinity }} className="w-20 h-20 rounded-2xl bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center shadow-2xl shadow-red-500/30"><Lock className="w-10 h-10 text-white" /></motion.div>
          </div>
          <h2 className="text-center text-2xl font-bold text-white mb-2">Tizim bloklangan</h2>
          <p className="text-center text-slate-300 text-sm mb-6">Hurmatli <span className="font-semibold text-white">{user.full_name}</span>, aktivlik muddati tugagan. Tizimni davom ettirish uchun aktivatsiya kodini kiriting.</p>

          {/* Holat ma'lumotlari */}
          <div className="grid grid-cols-2 gap-2 mb-6">
            <div className="rounded-xl bg-white/5 border border-white/10 p-3 text-center">
              <div className="text-[10px] text-slate-400 uppercase">Holat</div>
              <div className="text-sm font-bold text-red-400 mt-1">Bloklangan</div>
            </div>
            <div className="rounded-xl bg-white/5 border border-white/10 p-3 text-center">
              <div className="text-[10px] text-slate-400 uppercase">Oxirgi aktivatsiya</div>
              <div className="text-sm font-bold text-white mt-1">{user.last_activation_at ? formatDate(user.last_activation_at) : '—'}</div>
            </div>
          </div>

          <form onSubmit={handleActivate} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-2">AKTIVATSIYA KODI</label>
              <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="XXXX-XXXX-XXXX-XXXX-XXXX-XXXX" className="w-full px-4 py-3 rounded-xl bg-white/5 border-2 border-white/10 text-white font-mono tracking-wider text-center focus:bg-white/10 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/30 outline-none transition" required />
            </div>
            {err && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="px-4 py-2.5 rounded-xl bg-red-500/20 border border-red-500/30 text-sm text-red-200">{err}</motion.div>}
            {success && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="px-4 py-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-sm text-emerald-200 flex items-center gap-2"><CheckCircle className="w-4 h-4" /> {success}</motion.div>}
            <button type="submit" disabled={loading} className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 flex items-center justify-center gap-2">
              {loading ? <Spinner className="w-4 h-4" /> : <KeyRound className="w-4 h-4" />}
              {loading ? 'Tekshirilmoqda...' : 'Aktivlashtirish'}
            </button>
          </form>

          {/* Eslatma */}
          <div className="mt-5 p-3 rounded-xl bg-blue-500/10 border border-blue-500/30">
            <div className="text-xs text-blue-200 leading-relaxed">
              <strong className="text-blue-100">Adminga murojaat qiling</strong> va aktivatsiya kodini sotib oling. Kod Telegram orqali yuboriladi. Kod kiritilgandan so'ng tizim 30 kunga aktiv bo'ladi.
            </div>
          </div>

          <div className="mt-5 pt-5 border-t border-white/10">
            <a href={TELEGRAM_URL} target="_blank" rel="noreferrer" className="block w-full py-3 rounded-xl bg-[#229ED9] hover:bg-[#1d8bc4] text-white font-semibold shadow-lg transition-all hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2">
              <TelegramIcon className="w-5 h-5" />Adminga murojaat: @{TELEGRAM_HANDLE}
            </a>
          </div>
          <button onClick={onLogout} className="mt-4 w-full text-center text-xs text-slate-500 hover:text-slate-300 transition">Tizimdan chiqish</button>
        </div>
      </motion.div>
    </div>
  )
}

// ============================================================================
//  APP SHELL
// ============================================================================
function AppShell({ user, onRefresh, onLogout }: { user: PublicUser; onRefresh: () => void; onLogout: () => void }) {
  const [activeTab, setActiveTab] = useState<string>('dashboard')
  const [mobileNav, setMobileNav] = useState(false)

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return <DashboardPanel user={user} setActiveTab={setActiveTab} />
      case 'leads': return <LeadsPanel />
      case 'students': return <StudentsPanel />
      case 'teachers': return <TeachersPanel />
      case 'groups': return <GroupsPanel />
      case 'courses': return <CoursesPanel />
      case 'ratings': return <RatingsPanel />
      case 'attendance': return <AttendancePanel />
      case 'attendance-report': return <AttendanceReportPanel />
      case 'teacher-attendance': return <TeacherAttendancePanel />
      case 'schedule': return <SchedulePanel />
      case 'exams': return <ExamsPanel />
      case 'certificates': return <CertificatesPanel />
      case 'payments': return <PaymentsPanel />
      case 'finance': return <FinancePanel />
      case 'expenses': return <ExpensesPanel />
      case 'debts': return <DebtsPanel />
      case 'teacher-payouts': return <TeacherPayoutsPanel />
      case 'discounts': return <DiscountsPanel />
      case 'reports': return <ReportsPanel />
      case 'reports-export': return <ReportsExportPanel />
      case 'notifications': return <NotificationsPanel />
      case 'reminders': return <RemindersPanel />
      case 'settings': return <SettingsPanel user={user} />
      case 'telegram': return <TelegramPanel user={user} />
      case 'license': return <LicensePanel user={user} />
      default: return <DashboardPanel user={user} setActiveTab={setActiveTab} />
    }
  }

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-emerald-50/30 via-background to-teal-50/20">
      <aside className="hidden lg:flex w-64 flex-col bg-sidebar text-sidebar-foreground shrink-0"><SidebarContent user={user} activeTab={activeTab} setActiveTab={setActiveTab} onLogout={onLogout} /></aside>
      <AnimatePresence>
        {mobileNav && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setMobileNav(false)} className="lg:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" />
            <motion.aside initial={{ x: -300 }} animate={{ x: 0 }} exit={{ x: -300 }} transition={{ type: 'spring', damping: 25, stiffness: 250 }} className="lg:hidden fixed left-0 top-0 bottom-0 z-50 w-72 flex flex-col bg-sidebar text-sidebar-foreground">
              <SidebarContent user={user} activeTab={activeTab} setActiveTab={(t) => { setActiveTab(t); setMobileNav(false) }} onLogout={onLogout} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
      <main className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-30 glass border-b border-border/40 px-4 lg:px-8 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 shrink-0">
            <button onClick={() => setMobileNav(true)} className="lg:hidden p-2 rounded-lg hover:bg-muted"><Menu className="w-5 h-5" /></button>
            <div>
              <div className="text-xs text-muted-foreground">Assalomu alaykum,</div>
              <div className="font-semibold text-sm">{user.center_name || user.full_name}</div>
            </div>
          </div>
          {/* === Zamonaviy soat (o'rtonda, kattaroq) === */}
          <div className="hidden md:flex flex-1 justify-center">
            <ForestClock />
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <StatusBadge user={user} />
            <button onClick={onLogout} className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition"><LogOut className="w-3.5 h-3.5" /> Chiqish</button>
          </div>
        </header>
        {/* Mobil versiyada soat header ostida */}
        <div className="md:hidden px-4 pt-3 flex justify-center">
          <ForestClock />
        </div>
        <div className="flex-1 p-4 lg:p-8">
          <AnimatePresence mode="wait">
            <motion.div key={activeTab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
              {renderContent()}
            </motion.div>
          </AnimatePresence>
        </div>
        <footer className="px-4 lg:px-8 py-4 text-center text-xs text-muted-foreground border-t border-border/40">
          <span>EduMarkaz ERP v2.0 • </span>
          <a href={TELEGRAM_URL} target="_blank" rel="noreferrer" className="hover:text-emerald-600 transition inline-flex items-center gap-1"><TelegramIcon className="w-3 h-3" /> @{TELEGRAM_HANDLE}</a>
        </footer>
      </main>
    </div>
  )
}

function SidebarContent({ user, activeTab, setActiveTab, onLogout }: { user: PublicUser; activeTab: string; setActiveTab: (id: string) => void; onLogout: () => void }) {
  return (
    <>
      <div className="p-5 border-b border-sidebar-border/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/20"><GraduationCap className="w-6 h-6 text-white" /></div>
          <div><div className="font-bold text-sidebar-foreground">EduMarkaz</div><div className="text-[10px] text-sidebar-foreground/60">{user.center_name}</div></div>
        </div>
      </div>
      <nav className="flex-1 p-3 space-y-4 overflow-y-auto">
        {NAV_SECTIONS.map((section, si) => (
          <div key={si}>
            <div className="text-[10px] font-bold uppercase tracking-wider text-sidebar-foreground/40 px-3 mb-1.5">{section.title}</div>
            <div className="space-y-1">
              {section.items.map((item) => {
                const Icon = item.icon
                const isActive = activeTab === item.id
                return (
                  <button key={item.id} onClick={() => setActiveTab(item.id)} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${isActive ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-lg shadow-emerald-500/20' : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground'}`}>
                    <Icon className="w-4 h-4 shrink-0" /><span className="truncate">{item.label}</span>{isActive && <ChevronRight className="w-4 h-4 ml-auto" />}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
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
        <button onClick={onLogout} className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground transition"><LogOut className="w-4 h-4" /> Tizimdan chiqish</button>
      </div>
    </>
  )
}

function StatusBadge({ user }: { user: PublicUser }) {
  if (user.role === 'admin') return <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 text-xs font-semibold"><Crown className="w-3 h-3" /> Admin</div>
  if (user.status === 'trial') return <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 text-xs font-semibold"><Sparkles className="w-3 h-3" /> Sinov: {user.days_left}k</div>
  if (user.status === 'active') return <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-semibold"><CheckCircle className="w-3 h-3" /> Aktiv: {user.days_left}k</div>
  return null
}
