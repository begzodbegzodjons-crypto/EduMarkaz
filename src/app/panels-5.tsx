'use client'
import { useEffect, useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { apiFetch, formatDate, type PublicUser } from '@/lib/client'
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

      {loading ? <PanelLoader /> : sorted.length === 0 ? <Card><EmptyState title="Eslatmalar yo'q" description="Muhim narsalarni eslab qolish uchun qo'shing." /></Card> : (
        <div className="space-y-2">
          {sorted.map((r) => {
            const isOverdue = !r.is_done && r.reminder_date < today
            const isToday = !r.is_done && r.reminder_date === today
            return (
              <motion.div key={r.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <Card>
                  <div className={`p-4 flex items-start gap-3 ${r.is_done ? 'opacity-50' : ''}`}>
                    <button onClick={() => toggleDone(r)} className={`mt-1 w-5 h-5 rounded-md border-2 flex items-center justify-center transition ${r.is_done ? 'bg-emerald-500 border-emerald-500' : 'border-border hover:border-emerald-500'}`}>
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

  if (loading) return <PanelLoader />

  return (
    <div className="space-y-5 max-w-2xl">
      <div><h1 className="text-2xl lg:text-3xl font-bold">Sozlamalar</h1><p className="text-muted-foreground text-sm mt-1">Markaz profilingizni boshqaring</p></div>

      <Card>
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

      <Card>
        <CardHeader title="Moliyaviy sozlamalar" subtitle="Oylik to'lov summasi" />
        <div className="p-5 space-y-3">
          <Field label="Oylik to'lov summasi (avtomatik hisob uchun)"><input type="number" className="erp-input" value={form.monthly_payment_amount} onChange={(e) => setForm({ ...form, monthly_payment_amount: Number(e.target.value) })} /></Field>
          <p className="text-xs text-muted-foreground">Bu summa yangi talaba qo'shganda avtomatik to'lov sifatida taklif qilinadi.</p>
        </div>
      </Card>

      <Card>
        <CardHeader title="Integratsiyalar" subtitle="Telegram va SMS" />
        <div className="p-5 space-y-3">
          <Field label="Telegram bot tokeni"><input className="erp-input" value={form.telegram_bot_token} onChange={(e) => setForm({ ...form, telegram_bot_token: e.target.value })} placeholder="@BotFather dan oling" /></Field>
          <Field label="SMS API kalit"><input className="erp-input" value={form.sms_api_key} onChange={(e) => setForm({ ...form, sms_api_key: e.target.value })} placeholder="eskiz.uz yoki playmobile.uz" /></Field>
          <p className="text-xs text-muted-foreground">Bu kalitlar ota-onalarga avtomatik xabar yuborish uchun ishlatiladi.</p>
        </div>
      </Card>

      <div className="flex items-center gap-3">
        <PrimaryButton onClick={handleSave} disabled={saving}>{saving ? 'Saqlanmoqda...' : 'Saqlash'}</PrimaryButton>
        {saved && <span className="text-sm text-emerald-600 font-medium flex items-center gap-1"><CheckCircle className="w-4 h-4" /> Saqlandi</span>}
      </div>
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

      <Card>
        <div className="p-6 text-center">
          <div className="w-20 h-20 rounded-2xl bg-[#229ED9] flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-500/25">
            <TelegramIcon className="w-12 h-12 text-white" />
          </div>
          <h2 className="text-xl font-bold mb-2">NorinKomp Yordam Markazi</h2>
          <p className="text-sm text-muted-foreground mb-6">Har qanday savol, muammo yoki takliflar uchun Telegram orqali bog'laning.</p>

          <a href={TELEGRAM_URL} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#229ED9] hover:bg-[#1d8bc4] text-white font-semibold shadow-lg transition-all hover:scale-105">
            <TelegramIcon className="w-5 h-5" />@{TELEGRAM_HANDLE} ga yozish
          </a>
        </div>
      </Card>

      <Card>
        <CardHeader title="Tez-tez beriladigan savollar" />
        <div className="p-5 space-y-4">
          <FAQItem q="Aktivatsiya kodini qayerdan olaman?" a={`To'lovni amalga oshiring va @${TELEGRAM_HANDLE} telegram akkauntiga yozing. Sizga 30 kunlik aktivatsiya kodi yuboriladi.`} />
          <FAQItem q="Sinov muddati qancha?" a="Har bir yangi foydalanuvchi 10 kun bepul sinov oladi. Sinov tugagach, tizim avtomatik bloklanadi." />
          <FAQItem q="Ma'lumotlarim saqlanadimi?" a="Ha, barcha ma'lumotlaringiz Supabase (PostgreSQL) bulutli bazasida xavfsiz saqlanadi." />
          <FAQItem q="Boshqa qurilmada kirsa bo'ladimi?" a="Ha, istalgan qurilmadan (kompyuter, telefon, planshet) tizimga kirishingiz mumkin." />
        </div>
      </Card>
    </div>
  )
}
function FAQItem({ q, a }: { q: string; a: string }) {
  return (
    <div className="border-l-2 border-emerald-500 pl-3">
      <div className="font-semibold text-sm">{q}</div>
      <div className="text-sm text-muted-foreground mt-1">{a}</div>
    </div>
  )
}

// ============================================================================
//  LITSENZIYA PANEL
// ============================================================================
export function LicensePanel({ user }: { user: PublicUser }) {
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
    setTimeout(() => window.location.reload(), 2000)
  }

  const isAdmin = user.role === 'admin'
  const isTrial = user.status === 'trial'
  const isActive = user.status === 'active'
  const isBlocked = user.status === 'blocked'

  return (
    <div className="space-y-5 max-w-2xl">
      <div><h1 className="text-2xl lg:text-3xl font-bold">Litsenziya</h1><p className="text-muted-foreground text-sm mt-1">Tizimga kirish huquqi</p></div>

      {/* Hozirgi holat */}
      <Card>
        <div className="p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${isAdmin ? 'bg-gradient-to-br from-amber-500 to-orange-600' : isActive ? 'bg-gradient-to-br from-emerald-500 to-teal-600' : isTrial ? 'bg-gradient-to-br from-amber-500 to-orange-600' : 'bg-gradient-to-br from-red-500 to-rose-600'}`}>
              {isAdmin ? <Crown className="w-7 h-7 text-white" /> : isActive ? <CheckCircle className="w-7 h-7 text-white" /> : isTrial ? <Sparkles className="w-7 h-7 text-white" /> : <AlertTriangle className="w-7 h-7 text-white" />}
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Joriy holat</div>
              <div className="text-xl font-bold">
                {isAdmin ? 'Administrator' : isActive ? 'Aktiv' : isTrial ? 'Bepul sinov' : 'Bloklangan'}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {isAdmin ? 'Cheksiz muddatga' : user.days_left > 0 ? `${user.days_left} kun qoldi` : 'Muddat tugagan'}
              </div>
            </div>
          </div>

          {isTrial && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm">
              <div className="font-semibold text-amber-700">Diqqat!</div>
              <div className="text-amber-900 mt-1">Sinov muddati {user.days_left} kundan so'ng tugaydi. Tizimda davom etish uchun vaqtida aktivatsiya kodi oling.</div>
            </div>
          )}
          {isBlocked && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm">
              <div className="font-semibold text-red-700">Tizim bloklangan!</div>
              <div className="text-red-900 mt-1">Davom etish uchun aktivatsiya kodini kiriting yoki @{TELEGRAM_HANDLE} ga bog'laning.</div>
            </div>
          )}
        </div>
      </Card>

      {/* Aktivatsiya kodi kiritish */}
      {!isAdmin && (
        <Card>
          <CardHeader title="Aktivatsiya kodi" subtitle="30 kunlik aktivlik uchun" />
          <div className="p-5">
            <form onSubmit={handleActivate} className="space-y-4">
              <Field label="Kodni kiriting">
                <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="XXXX-XXXX-XXXX-XXXX-XXXX-XXXX" className="erp-input font-mono tracking-wider text-center" />
              </Field>
              {err && <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">{err}</div>}
              {success && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-200 text-sm text-emerald-700 flex items-center gap-2"><CheckCircle className="w-4 h-4" /> {success}</motion.div>}
              <PrimaryButton type="submit" disabled={loading || !code} className="w-full">
                {loading ? 'Tekshirilmoqda...' : <><KeyRound className="w-4 h-4" /> Aktivlashtirish</>}
              </PrimaryButton>
            </form>
          </div>
        </Card>
      )}

      {/* Kod olish yo'riqnoma */}
      {!isAdmin && (
        <Card>
          <CardHeader title="Aktivatsiya kodini qanday olish mumkin?" />
          <div className="p-5 space-y-3">
            <div className="flex gap-3">
              <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-sm shrink-0">1</div>
              <div className="text-sm"><div className="font-semibold">To'lovni amalga oshiring</div><div className="text-muted-foreground mt-0.5">Narx va to'lov turlari haqida @{TELEGRAM_HANDLE} dan so'rang.</div></div>
            </div>
            <div className="flex gap-3">
              <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-sm shrink-0">2</div>
              <div className="text-sm"><div className="font-semibold">Telegramga yozing</div><div className="text-muted-foreground mt-0.5">@{TELEGRAM_HANDLE} akkauntiga to'lov chekini yuboring.</div></div>
            </div>
            <div className="flex gap-3">
              <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-sm shrink-0">3</div>
              <div className="text-sm"><div className="font-semibold">Kodni oling</div><div className="text-muted-foreground mt-0.5">Tez orada sizga 30 kunlik aktivatsiya kodi yuboriladi.</div></div>
            </div>
            <div className="flex gap-3">
              <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-sm shrink-0">4</div>
              <div className="text-sm"><div className="font-semibold">Kodni kiriting</div><div className="text-muted-foreground mt-0.5">Yuqoridagi maydonga kodni kiriting va "Aktivlashtirish" tugmasini bosing.</div></div>
            </div>
            <a href={TELEGRAM_URL} target="_blank" rel="noreferrer" className="block mt-4 px-4 py-3 rounded-xl bg-[#229ED9] hover:bg-[#1d8bc4] text-white text-center font-semibold transition">
              <TelegramIcon className="w-5 h-5 inline mr-2" />@{TELEGRAM_HANDLE} ga yozish
            </a>
          </div>
        </Card>
      )}

      {/* Admin uchun eslatma */}
      {isAdmin && (
        <Card>
          <div className="p-5 text-center">
            <Crown className="w-10 h-10 text-amber-500 mx-auto mb-2" />
            <div className="font-semibold text-sm">Administrator rejimi</div>
            <p className="text-xs text-muted-foreground mt-1">
              Aktivatsiya kodlari generatsiyasi alohida admin panelda amalga oshiriladi.
              <br />URL: <code className="font-mono text-emerald-600">/?admin=norinkomp2024admin</code>
            </p>
          </div>
        </Card>
      )}
    </div>
  )
}

function CodeStatusChip({ status }: { status: string }) {
  const map: any = { unused: { label: 'Bo\'sh', cls: 'bg-emerald-100 text-emerald-700' }, used: { label: 'Ishlatilgan', cls: 'bg-slate-100 text-slate-700' }, expired: { label: 'Muddati o\'tgan', cls: 'bg-red-100 text-red-700' } }
  const s = map[status] || map.unused
  return <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${s.cls}`}>{s.label}</span>
}
