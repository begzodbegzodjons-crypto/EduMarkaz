# EduMarkaz ERP — O'quv Markazlari uchun Boshqaruv Tizimi

To'liq, zamonaviy va chiroyli ERP tizimi. Next.js 16 + Supabase + Vercel stack.

## ✨ Funksiyalar

- **Talabalar boshqaruvi** — ro'yxatga olish, guruhga biriktirish, holat kuzatuvi
- **O'qituvchilar** — murabbiylar bazasi, maosh, ish boshlash sanasi
- **Guruhlar** — guruh yaratish, kurs/o'qituvchi biriktirish, jadval
- **Kurslar** — kurs katalogi, narx, davomiylik
- **To'lovlar** — to'lov yozuvlari, oylik/o'tgan davr statistikasi
- **Davomat** — guruh bo'yicha bir vaqtda bir nechta talaba davomatini belgilash
- **Dashboard** — umumiy statistika, oylik daromad grafigi, davomat foizi
- **Admin panel** — aktivatsiya kodi generatsiyasi, foydalanuvchilar ro'yxati
- **Avtomatik bloklash** — 14 kunlik bepul sinov → bloklash → aktivatsiya kodi → 30 kun aktiv
- **Telegram integratsiyasi** — bloklanganda `@norinkomp` ga yozish ko'rsatiladi

## 🚀 Deploy qilish (Vercel + Supabase)

### 1. Supabase loyihasini yarating

1. [supabase.com](https://supabase.com) ga kiring
2. **New Project** tugmasini bosing
3. Loyiha nomi: `edu-markaz-erp` (yoki o'zingizniki)
4. Database password ni eslab qoling
5. Region: `Singapore` yoki `Frankfurt` (O'zbekistonga yaqin)
6. **Create** tugmasini bosing

### 2. SQL sxema ni yuklang

1. Supabase dashboard → **SQL Editor** → **New query**
2. `download/schema.sql` fayli mazmunini joylashtiring
3. **Run** tugmasini bosing
4. Endi barcha jadvallar yaratildi va admin foydalanuvchi qo'shildi
   - Email: `admin@erp.uz`
   - Parol: `admin12345` (albatta o'zgartiring!)

### 3. Supabase API kalitlarini oling

1. Supabase dashboard → **Project Settings** → **API**
2. Quyidagilarni nusxalang:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **service_role key**: `eyJhbGc...` (maxfiy — hech kimga bermang!)

### 4. GitHub ga yuklang

```bash
git init
git add .
git commit -m "Initial commit — EduMarkaz ERP"
git branch -M main
git remote add origin https://github.com/USERNAME/edu-markaz-erp.git
git push -u origin main
```

### 5. Vercel ga deploy qiling

1. [vercel.com](https://vercel.com) ga kiring
2. **Add New Project** → GitHub repo ni tanlang
3. Framework: Next.js (avtomatik aniqlanadi)
4. **Environment Variables** bo'limiga quyidagilarni kiriting:

   | Key | Value |
   |-----|-------|
   | `NEXT_PUBLIC_SUPABASE_URL` | `https://xxxxx.supabase.co` |
   | `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbGc...` |
   | `JWT_SECRET` | (ixtiyoriy — tasodifiy uzun matn) |
   | `NEXT_PUBLIC_TELEGRAM_HANDLE` | `norinkomp` |
   | `NEXT_PUBLIC_TELEGRAM_URL` | `https://t.me/norinkomp` |
   | `TRIAL_DAYS` | `14` |
   | `ACTIVATION_DAYS` | `30` |

5. **Deploy** tugmasini bosing
6. 1-2 daqiqada tayyor bo'ladi ✅

### 6. Admin parolini o'zgartiring

1. Tizimga admin sifatida kiring: `admin@erp.uz` / `admin12345`
2. Supabase → SQL Editor → quyidagi so'rovni bajaring (yangi parol bilan):

```sql
-- Yangi parol "yangiParol123" bo'lsin
-- Avval bcrypt hash ni oling: https://bcrypt-generator.com/
-- So'ngra:
update users
set password_hash = 'YANGI_BCRYPT_HASH'
where email = 'admin@erp.uz';
```

## 🔐 Litsenziya va to'lov tizimi

- Har bir yangi foydalanuvchi **14 kun bepul** sinov oladi
- Sinov tugagach, tizim avtomatik **bloklanadi**
- Bloklangan foydalanuvchi **faqat aktivatsiya kodi kiritish oynasini** ko'radi
- Aktivatsiya kodi faqat **admin** tomonidan generatsiya qilinadi
- Kod 30 kunlik aktivlik beradi (sozlanadi)
- To'lov va kod olish uchun foydalanuvchi `@norinkomp` Telegram akkauntiga yozadi

## 📁 Loyiha tuzilishi

```
src/
├── app/
│   ├── api/
│   │   ├── auth/{login,register,me,logout}/route.ts
│   │   ├── activate/route.ts
│   │   ├── admin/{generate-code,users}/route.ts
│   │   ├── students/route.ts
│   │   ├── teachers/route.ts
│   │   ├── groups/route.ts
│   │   ├── courses/route.ts
│   │   ├── payments/route.ts
│   │   ├── attendance/route.ts
│   │   └── dashboard/route.ts
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx           ← butun UI shu yerda (yakka fayl)
├── components/
│   └── icons.tsx          ← SVG ikonkalar
└── lib/
    ├── auth.ts            ← JWT, bcrypt, session
    ├── client.ts          ← fetch helper, useUser hook
    ├── guards.ts          ← requireActiveUser
    └── supabase.ts        ← Supabase client
```

## 🛠 Texnologiyalar

- **Next.js 16** + App Router + TypeScript
- **Supabase** (PostgreSQL database)
- **Tailwind CSS 4** + custom design system
- **Framer Motion** — animatsiyalar
- **bcryptjs + JWT** — autentifikatsiya
- **shadcn/ui** — UI komponentlar

## 📞 Yordam

Telegram: [@norinkomp](https://t.me/norinkomp)

---

© 2026 NorinKomp. Barcha huquqlar himoyalangan.
