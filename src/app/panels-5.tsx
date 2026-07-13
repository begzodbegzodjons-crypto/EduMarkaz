'use client'
import { useEffect, useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { apiFetch, formatDate, formatDateTime, type PublicUser } from '@/lib/client'
import {
  Plus, Trash2, Bell, Settings as SettingsIcon, TelegramIcon, KeyRound,
  CheckCircle, AlertTriangle, Copy, Sparkles, Crown, Phone, MapPin,
} from '@/components/icons'
import {
  Card, CardHeader, EmptyState, Modal, PrimaryButton, GhostButton, IconButton,
  PanelLoader, Field,
} from './panels-common'

const TELEGRAM_HANDLE = process.env.NEXT_PUBLIC_TELEGRAM_HANDLE || 'norinkomp'
const TELEGRAM_URL = process.env.NEXT_PUBLIC_TELEGRAM_URL || `https://t.me/${TELEGRAM_HANDLE}`

// ============================================================================
//  ESLATMALAR PANEL
// ============================================================================
export function RemindersPanel() {
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [openModal, setOpenModal] = useState(false)
  const [form, setForm] = useState<any>({ title: '', description: '', reminder_date: new Date().toISOString().slice(0, 10) })

  const load = useCallback(async () => {
    setLoading(true)
    const { ok, data } = await apiFetch('/api/reminders')
    if (ok) setItems(data?.reminders || [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function handleSave() {
    if (!form.title || !form.reminder_date) return alert('Barcha maydonlarni to\'ldiring')
    const { ok, error } = await apiFetch('/api/reminders', { method: 'POST', body: JSON.stringify(form) })
    if (!ok) return alert(error)
    setOpenModal(false)
    setForm({ title: '', description: '', reminder_date: new Date().toISOString().slice(0, 10) })
    load()
  }
  async function toggleDone(r: any) {
    const { ok, error } = await apiFetch('/api/reminders', { method: 'PUT', body: JSON.stringify({ id: r.id, is_done: !r.is_done }) })
    if (!ok) return alert(error)
    load()
  }
  async function handleDelete(id: string) { if (!confirm('O\'chirmoqchimisiz?')) return; const { ok, error } = await apiFetch(`/api/reminders?id=${id}`, { method: 'DELETE' }); if (!ok) return alert(error); load() }

  const today = new Date().toISOString().slice(0, 10)
  const sorted = [...items].sort((a, b) => {
    if (a.is_done !== b.is_done) return a.is_done ? 1 : -1
    return a.reminder_date.localeCompare(b.reminder_date)
  })

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="text-2xl lg:text-3xl font-bold">Eslatmalar</h1><p className="text-muted-foreground text-sm mt-1">{items.length} ta eslatma</p></div>
        <PrimaryButton onClick={() => setOpenModal(true)}><Plus className="w-4 h-4" /> Yangi eslatma</PrimaryButton>
      </div>

      {loading ? <PanelLoader /> : sorted.length === 0 ? <Card color="slate"><EmptyState title="Eslatmalar yo'q" description="Muhim narsalarni eslab qolish uchun qo'shing." /></Card> : (
        <div className="space-y-2">
          {sorted.map((r) => {
            const isOverdue = !r.is_done && r.reminder_date < today
            const isToday = !r.is_done && r.reminder_date === today
            return (
              <motion.div key={r.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <Card color="blue">
                  <div className={`p-4 flex items-start gap-3 ${r.is_done ? 'opacity-50' : ''}`}>
                    <button onClick={() => toggleDone(r)} className={`mt-1 w-5 h-5 rounded-md border-2 flex items-center justify-center transition ${r.is_done ? 'bg-blue-500 border-blue-500' : 'border-border hover:border-blue-500'}`}>
                      {r.is_done && <CheckCircle className="w-3 h-3 text-white" />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className={`font-semibold ${r.is_done ? 'line-through' : ''}`}>{r.title}</div>
                      {r.description && <div className="text-sm text-muted-foreground mt-1">{r.description}</div>}
                      <div className="flex items-center gap-2 mt-2">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${isOverdue ? 'bg-red-100 text-red-700' : isToday ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                          {isOverdue ? 'Muddati o\'tgan' : isToday ? 'Bugun' : formatDate(r.reminder_date)}
                        </span>
                      </div>
                    </div>
                    <IconButton danger onClick={() => handleDelete(r.id)}><Trash2 className="w-4 h-4" /></IconButton>
                  </div>
                </Card>
              </motion.div>
            )
          })}
        </div>
      )}

      <Modal open={openModal} onClose={() => setOpenModal(false)} title="Yangi eslatma">
        <div className="space-y-3">
          <Field label="Sarlavha *"><input className="erp-input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Muhim ish..." /></Field>
          <Field label="Sana *"><input type="date" className="erp-input" value={form.reminder_date} onChange={(e) => setForm({ ...form, reminder_date: e.target.value })} /></Field>
          <Field label="Tavsif"><textarea className="erp-input" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
          <div className="flex gap-2 pt-2"><PrimaryButton onClick={handleSave} className="flex-1">Saqlash</PrimaryButton><GhostButton onClick={() => setOpenModal(false)}>Bekor</GhostButton></div>
        </div>
      </Modal>
    </div>
  )
}

// ============================================================================
//  SOZLAMALAR PANEL
// ============================================================================
export function SettingsPanel({ user }: { user: PublicUser }) {
  const [form, setForm] = useState<any>({ center_name: user.center_name, center_phone: user.phone, center_address: user.address || '', currency: 'so\'m', telegram_bot_token: '', sms_api_key: '', monthly_payment_amount: 0 })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // === YANGI: Login va parolni o'zgartirish state ===
  const [credForm, setCredForm] = useState<any>({ current_password: '', new_email: '', new_password: '', confirm_password: '' })
  const [savingCred, setSavingCred] = useState(false)
  const [credSaved, setCredSaved] = useState(false)
  const [showCurrentPass, setShowCurrentPass] = useState(false)
  const [showNewPass, setShowNewPass] = useState(false)

  useEffect(() => {
    apiFetch('/api/settings').then(({ ok, data }) => {
      if (ok && data?.settings) {
        const s = data.settings
        setForm({ center_name: s.center_name || user.center_name, center_phone: s.center_phone || user.phone, center_address: s.center_address || user.address || '', currency: s.currency || 'so\'m', telegram_bot_token: s.telegram_bot_token || '', sms_api_key: s.sms_api_key || '', monthly_payment_amount: s.monthly_payment_amount || 0 })
      }
      setLoading(false)
    })
  }, [])

  async function handleSave() {
    setSaving(true)
    const { ok, error } = await apiFetch('/api/settings', { method: 'PUT', body: JSON.stringify(form) })
    setSaving(false)
    if (!ok) return alert(error)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  // === YANGI: Login va parolni o'zgartirish ===
  async function handleChangeCredentials() {
    if (!credForm.current_password) {
      return alert('Joriy parolni kiriting.')
    }

    // Email yoki paroldan kamida bittasi o'zgartirilgan bo'lishi kerak
    const emailChanged = credForm.new_email && credForm.new_email.trim() !== user.email
    const passwordChanged = credForm.new_password && credForm.new_password.length > 0

    if (!emailChanged && !passwordChanged) {
      return alert('Yangi email yoki parolni kiriting.')
    }

    // Parol tasdiqi
    if (passwordChanged && credForm.new_password !== credForm.confirm_password) {
      return alert('Yangi parol va tasdiq paroli mos kelmadi.')
    }

    setSavingCred(true)
    const { ok, error, data } = await apiFetch('/api/auth/change-credentials', {
      method: 'POST',
      body: JSON.stringify({
        current_password: credForm.current_password,
        new_email: emailChanged ? credForm.new_email.trim() : undefined,
        new_password: passwordChanged ? credForm.new_password : undefined,
      }),
    })
    setSavingCred(false)

    if (!ok) {
      alert(error || 'Xatolik yuz berdi.')
      return
    }

    alert(data?.message || 'Ma\'lumotlar muvaffaqiyatli yangilandi!')
    setCredForm({ current_password: '', new_email: '', new_password: '', confirm_password: '' })
    setCredSaved(true)
    setTimeout(() => setCredSaved(false), 3000)

    // Agar email o'zgarsa, sahifani yangilash
    if (data?.new_email) {
      setTimeout(() => window.location.reload(), 1500)
    }
  }

  if (loading) return <PanelLoader />

  return (
    <div className="space-y-5 max-w-2xl">
      <div><h1 className="text-2xl lg:text-3xl font-bold">Sozlamalar</h1><p className="text-muted-foreground text-sm mt-1">Markaz profilingizni boshqaring</p></div>

      <Card color="amber">
        <CardHeader title="Markaz profili" subtitle="Asosiy ma'lumotlar" />
        <div className="p-5 space-y-3">
          <Field label="Markaz nomi"><input className="erp-input" value={form.center_name} onChange={(e) => setForm({ ...form, center_name: e.target.value })} /></Field>
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Telefon"><input className="erp-input" value={form.center_phone} onChange={(e) => setForm({ ...form, center_phone: e.target.value })} /></Field>
            <Field label="Valyuta"><select className="erp-input" value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })}><option value="so'm">so'm</option><option value="USD">USD</option><option value="RUB">RUB</option></select></Field>
          </div>
          <Field label="Manzil"><input className="erp-input" value={form.center_address} onChange={(e) => setForm({ ...form, center_address: e.target.value })} /></Field>
        </div>
      </Card>

      <Card color="slate">
        <CardHeader title="Moliyaviy sozlamalar" subtitle="Oylik to'lov summasi" />
        <div className="p-5 space-y-3">
          <Field label="Oylik to'lov summasi (avtomatik hisob uchun)">
            <input
              type="number"
              className="erp-input"
              value={form.monthly_payment_amount}
              onChange={(e) => setForm({ ...form, monthly_payment_amount: Number(e.target.value) })}
              placeholder="Masalan: 250000"
            />
          </Field>
          <p className="text-xs text-muted-foreground">
            Bu summa yangi talaba qo'shganda avtomatik to'lov sifatida taklif qilinadi.
            Masalan: 250000 so'm kiritsangiz, yangi talaba uchun 250000 so'mlik to'lov yozuvi avtomatik yaratiladi.
          </p>
          {form.monthly_payment_amount === 0 && (
            <div className="rounded-lg bg-amber-50 border border-amber-200 p-2.5 text-xs text-amber-800">
              <strong>Ogohlantirish:</strong> Oylik to'lov summasi 0 ga teng. Yangi talabalar uchun avtomatik to'lov yozuvi yaratilmaydi. Iltimos, markazingizning oylik to'lov summasini kiriting (masalan: 250000).
            </div>
          )}
        </div>
      </Card>

      <Card color="blue">
        <CardHeader title="Integratsiyalar" subtitle="Telegram va SMS" />
        <div className="p-5 space-y-3">
          <Field label="Telegram bot tokeni"><input className="erp-input" value={form.telegram_bot_token} onChange={(e) => setForm({ ...form, telegram_bot_token: e.target.value })} placeholder="@BotFather dan oling" /></Field>
          <Field label="SMS API kalit"><input className="erp-input" value={form.sms_api_key} onChange={(e) => setForm({ ...form, sms_api_key: e.target.value })} placeholder="eskiz.uz yoki playmobile.uz" /></Field>
          <p className="text-xs text-muted-foreground">Bu kalitlar ota-onalarga avtomatik xabar yuborish uchun ishlatiladi.</p>
        </div>
      </Card>

      <div className="flex items-center gap-3">
        <PrimaryButton onClick={handleSave} disabled={saving}>{saving ? 'Saqlanmoqda...' : 'Saqlash'}</PrimaryButton>
        {saved && <span className="text-sm text-blue-600 font-medium flex items-center gap-1"><CheckCircle className="w-4 h-4" /> Saqlandi</span>}
      </div>

      {/* === YANGI: Login va parolni o'zgartirish === */}
      <Card color="amber">
        <CardHeader title="Login va parolni o'zgartirish" subtitle="Tizimga kirish ma'lumotlarini yangilang" />
        <div className="p-5 space-y-4">
          {/* Joriy parol (xavfsizlik uchun) */}
          <Field label="Joriy parol * (xavfsizlik uchun)">
            <div className="relative">
              <input
                type={showCurrentPass ? 'text' : 'password'}
                className="erp-input pr-10"
                value={credForm.current_password}
                onChange={(e) => setCredForm({ ...credForm, current_password: e.target.value })}
                placeholder="Joriy parolingizni kiriting"
              />
              <button
                type="button"
                onClick={() => setShowCurrentPass(!showCurrentPass)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                title={showCurrentPass ? 'Yashirish' : 'Ko\'rsatish'}
              >
                {showCurrentPass ? '🙈' : '👁'}
              </button>
            </div>
          </Field>

          <div className="border-t border-border/40 pt-4 space-y-3">
            <div className="text-xs font-semibold text-muted-foreground">Quyidagilardan kamida bittasini o'zgartiring:</div>

            {/* Yangi email (login) */}
            <Field label="Yangi login (email)">
              <input
                type="email"
                className="erp-input"
                value={credForm.new_email}
                onChange={(e) => setCredForm({ ...credForm, new_email: e.target.value })}
                placeholder={user.email}
              />
              <p className="text-[10px] text-muted-foreground mt-1">Joriy: {user.email}</p>
            </Field>

            {/* Yangi parol */}
            <Field label="Yangi parol (kamida 6 belgi)">
              <div className="relative">
                <input
                  type={showNewPass ? 'text' : 'password'}
                  className="erp-input pr-10"
                  value={credForm.new_password}
                  onChange={(e) => setCredForm({ ...credForm, new_password: e.target.value })}
                  placeholder="Yangi parol"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPass(!showNewPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  title={showNewPass ? 'Yashirish' : 'Ko\'rsatish'}
                >
                  {showNewPass ? '🙈' : '👁'}
                </button>
              </div>
            </Field>

            {/* Parolni tasdiqlash */}
            {credForm.new_password && (
              <Field label="Yangi parolni tasdiqlang">
                <input
                  type={showNewPass ? 'text' : 'password'}
                  className="erp-input"
                  value={credForm.confirm_password}
                  onChange={(e) => setCredForm({ ...credForm, confirm_password: e.target.value })}
                  placeholder="Yangi parolni qayta kiriting"
                />
                {credForm.confirm_password && credForm.new_password !== credForm.confirm_password && (
                  <p className="text-[10px] text-red-600 mt-1">⚠ Parollar mos kelmadi</p>
                )}
                {credForm.confirm_password && credForm.new_password === credForm.confirm_password && (
                  <p className="text-[10px] text-blue-600 mt-1">✓ Parollar mos</p>
                )}
              </Field>
            )}
          </div>

          <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800">
            ⚠️ <strong>Eslatma:</strong> Login (email) yoki parolni o'zgartirish uchun joriy parolni kiritishingiz shart.
            Email o'zgarsa, keyingi kirishda yangi email bilan kirishingiz kerak bo'ladi.
          </div>

          <div className="flex items-center gap-3">
            <PrimaryButton onClick={handleChangeCredentials} disabled={savingCred}>
              {savingCred ? 'Saqlanmoqda...' : 'Login va parolni yangilash'}
            </PrimaryButton>
            {credSaved && <span className="text-sm text-blue-600 font-medium flex items-center gap-1"><CheckCircle className="w-4 h-4" /> Yangilandi</span>}
          </div>
        </div>
      </Card>
    </div>
  )
}

// ============================================================================
//  TELEGRAM PANEL
// ============================================================================
export function TelegramPanel({ user }: { user: PublicUser }) {
  return (
    <div className="space-y-5 max-w-2xl">
      <div><h1 className="text-2xl lg:text-3xl font-bold">Telegram</h1><p className="text-muted-foreground text-sm mt-1">Yordam va qo'llab-quvvatlash</p></div>

      <Card color="slate">
        <div className="p-6 text-center">
          <div className="w-20 h-20 rounded-2xl bg-[#229ED9] flex items-center justify-center mx-auto mb-4 shadow-lg ">
            <TelegramIcon className="w-12 h-12 text-white" />
          </div>
          <h2 className="text-xl font-bold mb-2">NorinKomp Yordam Markazi</h2>
          <p className="text-sm text-muted-foreground mb-6">Har qanday savol, muammo yoki takliflar uchun Telegram orqali bog'laning.</p>

          <a href={TELEGRAM_URL} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#229ED9] hover:bg-[#1d8bc4] text-white font-semibold shadow-lg transition-all hover:scale-105">
            <TelegramIcon className="w-5 h-5" />@{TELEGRAM_HANDLE} ga yozish
          </a>
        </div>
      </Card>

      <Card color="blue">
        <CardHeader title="Tez-tez beriladigan savollar" />
        <div className="p-5 space-y-4">
          <FAQItem q="Aktivatsiya kodini qayerdan olaman?" a={`To'lovni amalga oshiring va @${TELEGRAM_HANDLE} telegram akkauntiga yozing. Sizga 30 kunlik aktivatsiya kodi yuboriladi.`} />
          <FAQItem q="Sinov muddati qancha?" a="Har bir yangi foydalanuvchi 10 kun bepul sinov oladi. Sinov tugagach, tizim avtomatik bloklanadi." />
          <FAQItem q="Ma'lumotlarim saqlanadimi?" a="Ha, barcha ma'lumotlaringiz serverda xavfsiz saqlanadi. Hech kim ruxsatsiz kirib ko'rolmaydi." />
          <FAQItem q="Boshqa qurilmada kirsa bo'ladimi?" a="Ha, istalgan qurilmadan (kompyuter, telefon, planshet) tizimga kirishingiz mumkin." />
        </div>
      </Card>
    </div>
  )
}
function FAQItem({ q, a }: { q: string; a: string }) {
  return (
    <div className="border-l-2 border-blue-500 pl-3">
      <div className="font-semibold text-sm">{q}</div>
      <div className="text-sm text-muted-foreground mt-1">{a}</div>
    </div>
  )
}

// ============================================================================
//  LITSENZIYA PANEL
// ============================================================================
export function LicensePanel({ user, onActivated }: { user: PublicUser; onActivated?: () => void }) {
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
    setCode('')
    setTimeout(() => onActivated?.() || window.location.reload(), 2000)
  }

  const isAdmin = user.role === 'admin'
  const isTrial = user.status === 'trial'
  const isActive = user.status === 'active'
  const isBlocked = user.status === 'blocked'

  // ====== ADMIN UCHUN MAXSUS KO'RINISH ======
  if (isAdmin) {
    return (
      <div className="space-y-5 max-w-2xl">
        <div><h1 className="text-2xl lg:text-3xl font-bold">Administrator</h1><p className="text-muted-foreground text-sm mt-1">Sayt egasi kabineti</p></div>
        <Card color="amber">
          <div className="p-8 text-center">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center mx-auto mb-4 shadow-lg ">
              <Crown className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-2xl font-bold">Administrator rejimi</h2>
            <p className="text-muted-foreground text-sm mt-2 max-w-md mx-auto">
              Siz sayt egasi sifatida tizimga kirdingiz. Administrator uchun litsenziya cheksiz muddatga amal qiladi.
              Aktivatsiya kodlarini generatsiya qilish uchun alohida admin portaldan foydalaning.
            </p>
            <div className="mt-6 grid grid-cols-2 gap-3 max-w-md mx-auto">
              <div className="rounded-xl bg-amber-50 border border-amber-200 p-4">
                <div className="text-xs text-amber-700 uppercase">Holat</div>
                <div className="text-lg font-bold text-amber-900 mt-1">Administrator</div>
              </div>
              <div className="rounded-xl bg-blue-50 border border-blue-200 p-4">
                <div className="text-xs text-blue-700 uppercase">Muddat</div>
                <div className="text-lg font-bold text-blue-900 mt-1">Cheksiz</div>
              </div>
            </div>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-5 max-w-2xl">
      <div><h1 className="text-2xl lg:text-3xl font-bold">Litsenziya</h1><p className="text-muted-foreground text-sm mt-1">Tizimga kirish huquqi</p></div>

      {/* Hozirgi holat — batafsil */}
      <Card color="slate">
        <div className="p-6">
          <div className="flex items-center gap-4 mb-5">
<<<<<<< HEAD
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${isActive ? 'bg-gradient-to-br from-slate-600 to-slate-700' : isTrial ? 'bg-gradient-to-br from-slate-600 to-slate-700' : 'bg-gradient-to-br from-red-500 to-rose-600'}`}>
=======
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${isActive ? 'bg-gradient-to-br from-blue-500 to-sky-600' : isTrial ? 'bg-gradient-to-br from-amber-500 to-orange-600' : 'bg-gradient-to-br from-red-500 to-rose-600'}`}>
>>>>>>> 60c09f695ed8547d48c6b25600dcf641241250cd
              {isActive ? <CheckCircle className="w-8 h-8 text-white" /> : isTrial ? <Sparkles className="w-8 h-8 text-white" /> : <AlertTriangle className="w-8 h-8 text-white" />}
            </div>
            <div>
              <div className="text-xs text-muted-foreground uppercase tracking-wide">Joriy holat</div>
              <div className="text-2xl font-bold">
                {isActive ? 'Aktiv' : isTrial ? 'Bepul sinov' : 'Bloklangan'}
              </div>
            </div>
          </div>

          {/* Aktivlik ma'lumotlari */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Qolgan kun */}
            <div className={`rounded-xl p-4 ${isActive ? 'bg-blue-50 border border-blue-200' : isTrial ? 'bg-amber-50 border border-amber-200' : 'bg-red-50 border border-red-200'}`}>
              <div className="text-xs text-muted-foreground">Aktivlik kunlari qoldi</div>
              <div className={`text-2xl font-bold mt-1 ${isActive ? 'text-blue-700' : isTrial ? 'text-amber-700' : 'text-red-700'}`}>
                {user.days_left} kun
              </div>
              <div className="text-[10px] text-muted-foreground mt-1">
                {isActive && user.active_until && `Tugaydi: ${formatDate(user.active_until)}`}
                {isTrial && user.trial_ends_at && `Sinov tugaydi: ${formatDate(user.trial_ends_at)}`}
                {isBlocked && 'Muddat tugagan'}
              </div>
            </div>

            {/* Oxirgi aktivatsiya */}
            <div className="rounded-xl p-4 bg-muted/40 border border-border/40">
              <div className="text-xs text-muted-foreground">Oxirgi aktivatsiya</div>
              <div className="text-base font-bold mt-1">
                {user.last_activation_at ? formatDate(user.last_activation_at) : '—'}
              </div>
              <div className="text-[10px] text-muted-foreground mt-1">
                {user.last_activation_at ? formatDateTime(user.last_activation_at) : 'Hali aktivlashtirilmagan'}
              </div>
            </div>
          </div>

          {/* Holat eslatmalari */}
          {isTrial && (
            <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm">
              <div className="font-semibold text-amber-700 flex items-center gap-2"><Sparkles className="w-4 h-4" /> Bepul sinov davom etmoqda</div>
              <div className="text-amber-900 mt-1">Sinov muddati {user.days_left} kundan so'ng tugaydi. Tugagandan so'ng tizim bloklanadi.</div>
            </div>
          )}
          {isActive && (
            <div className="mt-4 bg-blue-50 border border-blue-200 rounded-xl p-3 text-sm">
              <div className="font-semibold text-blue-700 flex items-center gap-2"><CheckCircle className="w-4 h-4" /> Tizim faol</div>
              <div className="text-blue-900 mt-1">Tizimga kirish huquqingiz aktiv. {user.days_left} kun qoldi.</div>
            </div>
          )}
          {isBlocked && (
            <div className="mt-4 bg-red-50 border border-red-200 rounded-xl p-3 text-sm">
              <div className="font-semibold text-red-700 flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> Tizim bloklangan</div>
              <div className="text-red-900 mt-1">Aktivlik muddati tugagan. Davom etish uchun adminga murojaat qiling va aktivatsiya kodini oling.</div>
            </div>
          )}
        </div>
      </Card>

      {/* Aktivatsiya kodi kiritish */}
      <Card color="blue">
        <CardHeader title="Aktivatsiya kodi" subtitle="Sotib olingan kodni kiriting" />
        <div className="p-5">
          <form onSubmit={handleActivate} className="space-y-4">
            <Field label="Aktivatsiya kodini kiriting">
              <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="XXXX-XXXX-XXXX-XXXX-XXXX-XXXX" className="erp-input font-mono tracking-wider text-center text-lg" />
            </Field>
            {err && <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">{err}</div>}
            {success && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="px-4 py-3 rounded-xl bg-blue-50 border border-blue-200 text-sm text-blue-700 flex items-center gap-2"><CheckCircle className="w-4 h-4" /> {success}</motion.div>}
            <PrimaryButton type="submit" disabled={loading || !code} className="w-full">
              {loading ? 'Tekshirilmoqda...' : <><KeyRound className="w-4 h-4" /> Aktivlashtirish</>}
            </PrimaryButton>
          </form>

          {/* Eslatma */}
          <div className="mt-5 p-4 rounded-xl bg-blue-50 border border-blue-200">
            <div className="text-xs font-semibold text-blue-700 mb-2">ℹ Eslatma</div>
            <div className="text-sm text-blue-900 leading-relaxed">
              Aktivatsiya kodini sotib olish uchun adminga murojaat qiling. Kod Telegram orqali yuboriladi.
              Aktivatsiya kodi kirgizilgandan so'ng tizimga kirish huquqi 30 kunga uzaytiriladi.
            </div>
          </div>

          {/* Telegram murojaat */}
          <a href={TELEGRAM_URL} target="_blank" rel="noreferrer" className="mt-4 block w-full py-3.5 rounded-xl bg-[#229ED9] hover:bg-[#1d8bc4] text-white text-center font-semibold transition-all hover:scale-[1.01] active:scale-[0.99] shadow-lg ">
            <TelegramIcon className="w-5 h-5 inline mr-2" />Adminga murojaat qiling: @{TELEGRAM_HANDLE}
          </a>
        </div>
      </Card>
    </div>
  )
}

function CodeStatusChip({ status }: { status: string }) {
  const map: any = { unused: { label: 'Bo\'sh', cls: 'bg-blue-100 text-blue-700' }, used: { label: 'Ishlatilgan', cls: 'bg-slate-100 text-slate-700' }, expired: { label: 'Muddati o\'tgan', cls: 'bg-red-100 text-red-700' } }
  const s = map[status] || map.unused
  return <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${s.cls}`}>{s.label}</span>
}
