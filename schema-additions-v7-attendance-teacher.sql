-- =====================================================================
--  PATCH v7: attendance jadvaliga teacher_id qo'shish
--  Supabase SQL Editor'da ishga tushiring
-- =====================================================================

-- 1) attendance jadvaliga teacher_id maydonini qo'shamiz
-- Bu maydon davomatni QAYSIsi o'qituvchi belgilaganini ko'rsatadi
alter table public.attendance
  add column if not exists teacher_id uuid references public.teachers(id) on delete set null;

-- 2) Indeks qo'shamiz (tez qidirish uchun)
create index if not exists idx_attendance_teacher on public.attendance(teacher_id);

-- 3) Tekshirish
-- select id, group_id, lesson_date, teacher_id, created_at from public.attendance limit 10;
