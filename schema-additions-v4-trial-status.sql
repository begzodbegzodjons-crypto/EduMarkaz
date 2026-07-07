-- =====================================================================
--  PATCH: leads.status ga 'trial' (Sinovdagi) holatini qo'shish
--  Supabase SQL Editor'da ishga tushiring
-- =====================================================================

-- 1) Avval mavjud constraint'ni o'chiramiz
alter table public.leads
  drop constraint if exists leads_status_check;

-- 2) Yangi constraint 'trial' bilan
alter table public.leads
  add constraint leads_status_check
  check (status in ('new','contacted','visited','enrolled','trial','rejected'));

-- 3) Tekshirish
-- select status, count(*) from public.leads group by status;
