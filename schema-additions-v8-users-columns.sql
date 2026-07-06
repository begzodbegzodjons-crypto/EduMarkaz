-- =====================================================================
--  PATCH v8: users jadvalidagi yetishmayotgan ustunlar
--  Supabase SQL Editor'da ishga tushiring
--
--  Bu patch quyidagi muammoni hal qiladi:
--  "Could not find the 'last_activation_at' column of 'users' in the schema cache"
-- =====================================================================

-- 1) last_activation_at ustuni (aktivlashtirilgan vaqt)
alter table public.users
  add column if not exists last_activation_at timestamptz;

-- 2) plain_password ustini (avval v6 patchda, lekin tekshirib chiqamiz)
alter table public.users
  add column if not exists plain_password text;

-- 3) Schema cache'ni yangilash (PostgreSQL 14+)
-- Bu Supabase'da avtomatik, lekin xavfsirab qo'yamiz
-- (agar xato chiqsa - e'tibor bermang, normal hol)
NOTIFY pgrst, 'reload schema';

-- 4) Tekshirish - barcha kerakli ustunlar borligini ko'rish
-- select column_name, data_type
-- from information_schema.columns
-- where table_name = 'users' and table_schema = 'public'
-- order by ordinal_position;
