-- =====================================================================
--  PATCH v5: O'qituvchilar uchun parol va login tizimi
--  Supabase SQL Editor'da ishga tushiring
-- =====================================================================

-- 1) teachers jadvaliga password_hash maydonini qo'shamiz
alter table public.teachers
  add column if not exists password_hash text;

-- 2) teachers jadvaliga login (foydalanuvchi nomi) maydonini qo'shamiz
-- Bu maydon ixtiyoriy - agar bo'lmasa, telefon raqami login sifatida ishlatiladi
alter table public.teachers
  add column if not exists login text;

-- 3) Tekshirish
-- select id, full_name, phone, login, password_hash is not null as has_password
-- from public.teachers;
