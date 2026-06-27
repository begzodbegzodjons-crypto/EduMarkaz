-- =====================================================================
--  O'QUV MARKAZ ERP — SUPABASE SQL SCHEMA
--  Version: 1.0
--  Engine:  PostgreSQL (Supabase)
--  Author:  NorinKomp
--  Telegram: @norinkomp
--
--  Foydalanish:
--   1. Supabase dashboard -> SQL Editor -> New query
--   2. Ushbu faylning to'liq mazmunini joylashtiring
--   3. "Run" tugmasini bosing
--   4. Supabase -> Project Settings -> API
--      - NEXT_PUBLIC_SUPABASE_URL  = Project URL
--      - SUPABASE_SERVICE_ROLE_KEY = service_role key (maxfiy)
-- =====================================================================

-- ---------- EXTENSIONS ----------
create extension if not exists "pgcrypto";

-- ---------- 1. FOYDALANUVCHILAR (users) ----------
create table if not exists public.users (
    id              uuid primary key default gen_random_uuid(),
    full_name       text not null,
    phone           text not null,
    email           text not null unique,
    center_name     text not null,                       -- o'quv markaz nomi
    address         text,
    password_hash   text not null,                       -- bcrypt hash
    role            text not null default 'user' check (role in ('user','admin')),
    status          text not null default 'trial' check  -- trial | active | blocked
                    (status in ('trial','active','blocked')),
    trial_started_at   timestamptz not null default now(),
    trial_ends_at      timestamptz not null default (now() + interval '14 days'),
    active_until       timestamptz,                       -- 30 kungacha aktiv
    last_login_at      timestamptz,
    created_at         timestamptz not null default now(),
    updated_at         timestamptz not null default now()
);

create index if not exists idx_users_email      on public.users(email);
create index if not exists idx_users_status     on public.users(status);
create index if not exists idx_users_role       on public.users(role);

-- ---------- 2. AKTIVATSIYA KODLARI (activation_codes) ----------
create table if not exists public.activation_codes (
    id              uuid primary key default gen_random_uuid(),
    code            text not null unique,                -- 24 belgidan iborat
    duration_days   integer not null default 30,
    status          text not null default 'unused' check -- unused | used | expired
                    (status in ('unused','used','expired')),
    generated_by    uuid references public.users(id) on delete set null, -- admin
    used_by         uuid references public.users(id) on delete set null, -- user
    used_at         timestamptz,
    expires_at      timestamptz,                          -- kodning amal qilish muddati (oy)
    created_at      timestamptz not null default now()
);

create index if not exists idx_codes_code   on public.activation_codes(code);
create index if not exists idx_codes_status on public.activation_codes(status);

-- ---------- 3. AUDIT LOG (har bir harakat yoziladi) ----------
create table if not exists public.audit_log (
    id          uuid primary key default gen_random_uuid(),
    user_id     uuid references public.users(id) on delete cascade,
    action      text not null,                            -- login, register, activate, create_student, ...
    entity      text,
    entity_id   text,
    detail      jsonb,
    ip_address  text,
    user_agent  text,
    created_at  timestamptz not null default now()
);

create index if not exists idx_audit_user   on public.audit_log(user_id);
create index if not exists idx_audit_action  on public.audit_log(action);
create index if not exists idx_audit_created on public.audit_log(created_at);

-- ---------- 4. O'QITUVCHILAR (teachers) ----------
create table if not exists public.teachers (
    id            uuid primary key default gen_random_uuid(),
    user_id       uuid not null references public.users(id) on delete cascade,
    full_name     text not null,
    phone         text,
    subject       text,                                  -- fan / mutaxassislik
    salary_amount numeric(12,2) default 0,
    hire_date     date,
    notes         text,
    created_at    timestamptz not null default now(),
    updated_at    timestamptz not null default now()
);

create index if not exists idx_teachers_user on public.teachers(user_id);

-- ---------- 5. KURSLAR (courses) ----------
create table if not exists public.courses (
    id            uuid primary key default gen_random_uuid(),
    user_id       uuid not null references public.users(id) on delete cascade,
    name          text not null,
    description   text,
    duration_months integer default 3,
    price         numeric(12,2) default 0,
    created_at    timestamptz not null default now(),
    updated_at    timestamptz not null default now()
);

create index if not exists idx_courses_user on public.courses(user_id);

-- ---------- 6. GURUHLAR (groups) ----------
create table if not exists public.groups (
    id            uuid primary key default gen_random_uuid(),
    user_id       uuid not null references public.users(id) on delete cascade,
    name          text not null,
    course_id     uuid references public.courses(id) on delete set null,
    teacher_id    uuid references public.teachers(id) on delete set null,
    start_date    date,
    end_date      date,
    schedule      text,                                  -- "Du-Chor-Juma 14:00-16:00"
    max_students  integer default 12,
    created_at    timestamptz not null default now(),
    updated_at    timestamptz not null default now()
);

create index if not exists idx_groups_user   on public.groups(user_id);
create index if not exists idx_groups_course on public.groups(course_id);

-- ---------- 7. TALABALAR (students) ----------
create table if not exists public.students (
    id            uuid primary key default gen_random_uuid(),
    user_id       uuid not null references public.users(id) on delete cascade,
    full_name     text not null,
    phone         text,
    parent_phone  text,
    birth_date    date,
    address       text,
    group_id      uuid references public.groups(id) on delete set null,
    course_id     uuid references public.courses(id) on delete set null,
    enrollment_date date default current_date,
    status        text not null default 'active' check (status in ('active','graduated','paused','left')),
    notes         text,
    created_at    timestamptz not null default now(),
    updated_at    timestamptz not null default now()
);

create index if not exists idx_students_user   on public.students(user_id);
create index if not exists idx_students_group   on public.students(group_id);
create index if not exists idx_students_status  on public.students(status);

-- ---------- 8. TO'LOVLAR (payments) ----------
create table if not exists public.payments (
    id            uuid primary key default gen_random_uuid(),
    user_id       uuid not null references public.users(id) on delete cascade,
    student_id    uuid not null references public.students(id) on delete cascade,
    group_id      uuid references public.groups(id) on delete set null,
    amount        numeric(12,2) not null,
    payment_date  date not null default current_date,
    payment_type  text not null default 'cash' check (payment_type in ('cash','card','transfer','other')),
    for_month     text,                                  -- "2026-06"
    description   text,
    created_at    timestamptz not null default now()
);

create index if not exists idx_payments_user    on public.payments(user_id);
create index if not exists idx_payments_student on public.payments(student_id);
create index if not exists idx_payments_date     on public.payments(payment_date);

-- ---------- 9. DAVOMAT (attendance) ----------
create table if not exists public.attendance (
    id            uuid primary key default gen_random_uuid(),
    user_id       uuid not null references public.users(id) on delete cascade,
    student_id    uuid not null references public.students(id) on delete cascade,
    group_id      uuid references public.groups(id) on delete set null,
    lesson_date   date not null,
    status        text not null check (status in ('present','absent','late','excused')),
    notes         text,
    created_at    timestamptz not null default now()
);

create index if not exists idx_attendance_user    on public.attendance(user_id);
create index if not exists idx_attendance_student  on public.attendance(student_id);
create index if not exists idx_attendance_date     on public.attendance(lesson_date);

-- ---------- 10. DARS JADVALI (schedule) ----------
create table if not exists public.schedule (
    id            uuid primary key default gen_random_uuid(),
    user_id       uuid not null references public.users(id) on delete cascade,
    group_id      uuid references public.groups(id) on delete cascade,
    teacher_id    uuid references public.teachers(id) on delete set null,
    weekday       smallint not null check (weekday between 0 and 6), -- 0=Du, 6=Yak
    start_time    time not null,
    end_time      time not null,
    room          text,
    created_at    timestamptz not null default now()
);

create index if not exists idx_schedule_user  on public.schedule(user_id);
create index if not exists idx_schedule_group on public.schedule(group_id);

-- ---------- 11. UPDATED_AT TRIGGERS ----------
create or replace function public.set_updated_at()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

do $$
declare t text;
begin
    for t in select unnest(array[
        'users','teachers','courses','groups','students'
    ])
    loop
        execute format(
            'drop trigger if exists trg_%I_updated on public.%I;
             create trigger trg_%I_updated before update on public.%I
             for each row execute function public.set_updated_at();',
            t, t, t, t
        );
    end loop;
end$$;

-- ---------- 12. ROW LEVEL SECURITY (RLS) ----------
-- Faqat o'z yozuvlarini ko'radi / o'zgartiradi
alter table public.users             enable row level security;
alter table public.teachers          enable row level security;
alter table public.courses           enable row level security;
alter table public.groups            enable row level security;
alter table public.students          enable row level security;
alter table public.payments          enable row level security;
alter table public.attendance        enable row level security;
alter table public.schedule          enable row level security;
alter table public.activation_codes  enable row level security;
alter table public.audit_log         enable row level security;

-- SERVICE_ROLE to'liq kirish huquqi (backend orqali ishlaydi)
create policy "service_role full access teachers"   on public.teachers          for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
create policy "service_role full access courses"    on public.courses           for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
create policy "service_role full access groups"     on public.groups            for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
create policy "service_role full access students"   on public.students          for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
create policy "service_role full access payments"   on public.payments          for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
create policy "service_role full access attendance" on public.attendance        for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
create policy "service_role full access schedule"   on public.schedule          for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
create policy "service_role full access codes"      on public.activation_codes  for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
create policy "service_role full access users"      on public.users             for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
create policy "service_role full access audit"      on public.audit_log         for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

-- ---------- 13. ADMIN FOYDALANUVCHINI YARATISH ----------
-- Default admin: email = admin@erp.uz, password = "admin12345"
-- (Birinchi kirishda albatta parolni o'zgartiring!)
insert into public.users (
    full_name, phone, email, center_name, address,
    password_hash, role, status,
    trial_started_at, trial_ends_at, active_until
)
select
    'Administrator', '+998901234567', 'admin@erp.uz', 'Boshqaruv Markazi', 'Toshkent',
    '$2a$10$N9qo8uLOickgx2ZMRZoMy.Mrq4VjYH8IvQY0OJ7XqfByHkQY5LQ5W', -- "admin12345"
    'admin', 'active',
    now(), now() + interval '100 years', now() + interval '100 years'
where not exists (
    select 1 from public.users where email = 'admin@erp.uz'
);

-- =====================================================================
--  Tugadi. Endi backend tayyor.
-- =====================================================================
