-- =====================================================================
--  PATCH v6: Super admin uchun parollarni ko'rish imkoni
--  Supabase SQL Editor'da ishga tushiring
-- =====================================================================

-- 1) users jadvaliga plain_password maydonini qo'shamiz
-- (faqat super admin ko'radi, foydalanuvchi emas)
alter table public.users
  add column if not exists plain_password text;

-- 2) Mavjud foydalanuvchilar uchun plain_password bo'sh qoladi
-- (faqat yangi ro'yxatdan o'tganlar yoki parolni o'zgartirganlar uchun to'ldiriladi)

-- 3) Tekshirish
-- select id, email, center_name, plain_password from public.users;
