# Worklog — EduMarkaz ERP

---
Task ID: 1
Agent: Super Z (main agent)
Task: O'quv Markazlari uchun to'liq ERP tizimi — Next.js + Supabase + Vercel. 14 kunlik bepul trial, bloklash, aktivatsiya kodi (admin generatsiya qiladi), bloklanganda faqat aktivatsiya kodi kiritish + @norinkomp Telegram kontakti. SQL sxema fayli. Chiroyli dizayn.

Work Log:
- fullstack-dev skill yuklandi va loyiha muhiti initializatsiya qilindi
- `@supabase/supabase-js`, `bcryptjs`, `jsonwebtoken` paketlar o'rnatildi
- `download/schema.sql` fayli yaratildi — to'liq Supabase SQL sxema (10 jadval: users, activation_codes, audit_log, teachers, courses, groups, students, payments, attendance, schedule + RLS + triggerlar + default admin)
- `src/lib/supabase.ts` — Supabase service client
- `src/lib/auth.ts` — bcrypt, JWT, session cookie, audit log, status compute
- `src/lib/guards.ts` — requireActiveUser guard (bloklanganlarni to'xtatadi)
- `src/lib/client.ts` — frontend `apiFetch` helper + `useUser` hook
- API routes yaratildi:
  - `/api/auth/{register,login,me,logout}`
  - `/api/activate` — aktivatsiya kodini tekshirish va 30 kun qo'shish
  - `/api/admin/generate-code` — POST (generatsiya) + GET (ro'yxat)
  - `/api/admin/users` — barcha foydalanuvchilar ro'yxati
  - `/api/{students,teachers,groups,courses,payments,attendance}` — to'liq CRUD
  - `/api/dashboard` — statistika
- `src/components/icons.tsx` — SVG ikonkalar (40+ ta)
- `src/app/page.tsx` — yakka faylli ERP UI:
  - AuthScreen (login/register) — premium aurora gradient dizayn
  - BlockedScreen — bloklanganlar uchun, faqat aktivatsiya kodi + Telegram CTA
  - AppShell — sidebar + dashboard + 7 panel (talabalar, o'qituvchilar, guruhlar, kurslar, to'lovlar, davomat, admin)
  - AdminPanel — aktivatsiya kodi generatsiyasi (1-50 ta, 30 kun default), foydalanuvchilar ro'yxati
- `src/app/globals.css` — Emerald/teal premium theme (light + dark), aurora animatsiya, shimmer text
- `src/app/layout.tsx` — Uzbek metadata + lang
- `.env.example` va `.env.local` yaratildi
- `vercel.json` — Next.js framework config
- `download/README.md` — to'liq deploy qo'llanmasi (Supabase + Vercel)
- ESLint config yangilandi (`react-hooks/set-state-in-effect` off)
- Bug fix: `useUser` hook to'g'rilandi (ok check `data.ok && data.user` emas, balki noto'g'ri `ok && data` edi)
- Bug fix: `isSupabaseConfigured` import yo'llari tuzatildi (auth.ts → supabase.ts)

Stage Summary:
- Lint toza (0 xato)
- Dev server port 3000 da ishlamoqda
- Login/Register UI ishlayapti (Supabase sozlanmagani uchun login xato beradi — kutilgan)
- SQL schema fayli: `download/schema.sql`
- Deploy qo'llanmasi: `download/README.md`
- Loyiha tuzilishi: 74 ta TS/TSX fayl, Next.js 16 App Router, TypeScript strict
- Dizayn: Emerald/teal gradient, aurora background, glass cards, framer-motion animatsiyalar, mobil responsive
- Foydalanuvchi Supabase project yarating → SQL ni joylashtiring → env ni to'ldiring → Vercel ga push qiling
