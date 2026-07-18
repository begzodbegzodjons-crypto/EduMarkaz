# EduMarkaz ERP — O'zgartirishlar jurnali

## 2026-07-03 — Lidlar → Talabaga aylantirish + Dashboard yaxshilanishi

### Qilingan o'zgarishlar:

#### 1. YANGI FAYL: `src/app/api/leads/accept/route.ts`
- Lidni talabaga aylantiruvchi API endpoint
- POST /api/leads/accept { lead_id, course_id, group_id }
- Lid ma'lumotlarini o'qiydi → yangi talaba yozuvini yaratadi → lidni o'chiradi
- Audit log yozadi
- Xatoliklarni chuqur boshqarish (lead topilmasa, talaba yaratilmasa, o'chirilmasa)

#### 2. TAHRIRLANGAN: `src/app/panels-1.tsx`

**a) LeadsPanel funksiyasi (Lidlar bo'limi):**
- Har bir lid kartasiga yashil "Qabul qilish" tugmasi qo'shildi
- Yangi modal oyna: kurs va guruh tanlash uchun
- Kurs tanlangach, faqat o'sha kursga tegishli guruhlar ko'rinadi
- Agar kurs uchun guruhlar bo'lmasa — ogohlantirish chiqadi
- Muvaffaqiyatli qabul qilingach — lid avtomatik ro'yxatdan o'chiriladi
- Lidning "qiziqqan kurs"i avtomatik tanlanadi

**b) DualBarChart funksiyasi (Dashboard diagrammasi):**
- Bo'sh ma'lumotlar uchun chiroyli empty state (icon + matn)
- Bar height calculation tuzatildi — endi barlar to'g'ri ko'rinadi
- min-h-[2px] qo'shildi — kichik qiymatlar ham ko'rinadi
- Chap tomonda o'lchov (max/2/0) qo'shildi
- Barlar balandligi oshirildi (h-40 → h-48)

**c) Xarajatlar tarkibi (Dashboard):**
- Bo'sh holatda icon va tushuntirish matni qo'shildi
- Har bir kategoriya uchun progress bar qo'shildi (foiz ko'rinishida)
- Umumiy summadan nisbatan hisoblanadi

#### 3. TAHRIRLANGAN: `src/app/panels-5.tsx` (Sozlamalar)
- Oylik to'lov summasi maydoniga placeholder qo'shildi ("Masalan: 250000")
- Qiymat 0 bo'lsa — sariq ogohlantirish kartochkasi chiqadi
- Yordamchi matn kengaytirildi (qanday ishlashi tushuntirilgan)

---

### Sinovdan o'tkazish kerak:
1. Lidlar bo'limiga kirib, "Qabul qilish" tugmasini bosish
2. Modalda kurs va guruh tanlash
3. Talabalar ro'yxatiga yangi talaba tushganini tekshirish
4. Lidlar ro'yxatidan lid o'chirilganini tekshirish
5. Dashboard diagrammasining to'g'ri ko'rinishini tekshirish
6. Sozlamalarda oylik to'lov summasini kiritib, ogohlantirish yo'qolishini tekshirish

### Fayllar ro'yxati (o'zgartirilgan):
- `src/app/api/leads/accept/route.ts` (YANGI)
- `src/app/panels-1.tsx` (TAHRIRLANGAN)
- `src/app/panels-5.tsx` (TAHRIRLANGAN)
