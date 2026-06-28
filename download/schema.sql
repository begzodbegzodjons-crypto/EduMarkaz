-- =====================================================================
--  O'QUV MARKAZ ERP — SUPABASE SQL SCHEMA  v2.0
--  Engine:  PostgreSQL (Supabase)
--  Telegram: @norinkomp
-- =====================================================================

create extension if not exists "pgcrypto";

-- ---------- 1. FOYDALANUVCHILAR (users) ----------
create table if not exists public.users (
    id              uuid primary key default gen_random_uuid(),
    full_name       text not null,
    phone           text not null,
    email           text not null unique,
    center_name     text not null,
    address         text,
    password_hash   text not null,
    role            text not null default 'user' check (role in ('user','admin')),
    status          text not null default 'trial' check (status in ('trial','active','blocked')),
    trial_started_at   timestamptz not null default now(),
    trial_ends_at      timestamptz not null default (now() + interval '10 days'),
    active_until       timestamptz,
    last_login_at      timestamptz,
    created_at         timestamptz not null default now(),
    updated_at         timestamptz not null default now()
);
create index if not exists idx_users_email  on public.users(email);
create index if not exists idx_users_status on public.users(status);

-- ---------- 2. AKTIVATSIYA KODLARI ----------
create table if not exists public.activation_codes (
    id              uuid primary key default gen_random_uuid(),
    code            text not null unique,
    duration_days   integer not null default 30,
    status          text not null default 'unused' check (status in ('unused','used','expired')),
    generated_by    uuid references public.users(id) on delete set null,
    used_by         uuid references public.users(id) on delete set null,
    used_at         timestamptz,
    expires_at      timestamptz,
    created_at      timestamptz not null default now()
);
create index if not exists idx_codes_code   on public.activation_codes(code);
create index if not exists idx_codes_status on public.activation_codes(status);

-- ---------- 3. AUDIT LOG ----------
create table if not exists public.audit_log (
    id          uuid primary key default gen_random_uuid(),
    user_id     uuid references public.users(id) on delete cascade,
    action      text not null,
    entity      text,
    entity_id   text,
    detail      jsonb,
    ip_address  text,
    user_agent  text,
    created_at  timestamptz not null default now()
);
create index if not exists idx_audit_user  on public.audit_log(user_id);
create index if not exists idx_audit_action on public.audit_log(action);

-- ---------- 4. KURSLAR (courses) — avval kurs, keyin guruh, keyin talaba ----------
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

-- ---------- 5. O'QITUVCHILAR (teachers) ----------
create table if not exists public.teachers (
    id            uuid primary key default gen_random_uuid(),
    user_id       uuid not null references public.users(id) on delete cascade,
    full_name     text not null,
    phone         text,
    subject       text,
    salary_amount numeric(12,2) default 0,
    hire_date     date,
    notes         text,
    created_at    timestamptz not null default now(),
    updated_at    timestamptz not null default now()
);
create index if not exists idx_teachers_user on public.teachers(user_id);

-- ---------- 6. GURUHLAR (groups) — kursga bog'langan ----------
create table if not exists public.groups (
    id            uuid primary key default gen_random_uuid(),
    user_id       uuid not null references public.users(id) on delete cascade,
    name          text not null,
    course_id     uuid references public.courses(id) on delete set null,
    teacher_id    uuid references public.teachers(id) on delete set null,
    start_date    date,
    end_date      date,
    schedule      text,
    max_students  integer default 12,
    created_at    timestamptz not null default now(),
    updated_at    timestamptz not null default now()
);
create index if not exists idx_groups_user   on public.groups(user_id);
create index if not exists idx_groups_course on public.groups(course_id);

-- ---------- 7. TALABALAR (students) — guruhga bog'langan ----------
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
create index if not exists idx_students_course  on public.students(course_id);
create index if not exists idx_students_status  on public.students(status);

-- ---------- 8. LIDLAR (leads) — potensial talabalar ----------
create table if not exists public.leads (
    id            uuid primary key default gen_random_uuid(),
    user_id       uuid not null references public.users(id) on delete cascade,
    full_name     text not null,
    phone         text,
    source        text,                                  -- reklama, tanish, ijtimoiy tarmoq
    interested_course_id uuid references public.courses(id) on delete set null,
    status        text not null default 'new' check (status in ('new','contacted','visited','enrolled','rejected')),
    notes         text,
    created_at    timestamptz not null default now(),
    updated_at    timestamptz not null default now()
);
create index if not exists idx_leads_user   on public.leads(user_id);
create index if not exists idx_leads_status on public.leads(status);

-- ---------- 9. TO'LOVLAR (payments) ----------
create table if not exists public.payments (
    id            uuid primary key default gen_random_uuid(),
    user_id       uuid not null references public.users(id) on delete cascade,
    student_id    uuid not null references public.students(id) on delete cascade,
    group_id      uuid references public.groups(id) on delete set null,
    amount        numeric(12,2) not null,
    payment_date  date not null default current_date,
    payment_type  text not null default 'cash' check (payment_type in ('cash','card','transfer','other')),
    for_month     text,
    description   text,
    created_at    timestamptz not null default now()
);
create index if not exists idx_payments_user    on public.payments(user_id);
create index if not exists idx_payments_student on public.payments(student_id);
create index if not exists idx_payments_date    on public.payments(payment_date);

-- ---------- 10. XARAJATLAR (expenses) — moliya uchun ----------
create table if not exists public.expenses (
    id            uuid primary key default gen_random_uuid(),
    user_id       uuid not null references public.users(id) on delete cascade,
    category      text not null,                          -- ijara, kommunal, maosh, reklama, material, other
    amount        numeric(12,2) not null,
    expense_date  date not null default current_date,
    description   text,
    teacher_id    uuid references public.teachers(id) on delete set null, -- maosh to'lovi uchun
    created_at    timestamptz not null default now()
);
create index if not exists idx_expenses_user on public.expenses(user_id);
create index if not exists idx_expenses_date on public.expenses(expense_date);
create index if not exists idx_expenses_cat  on public.expenses(category);

-- ---------- 11. DAVOMAT (attendance) — talabalar ----------
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
create index if not exists idx_att_user    on public.attendance(user_id);
create index if not exists idx_att_student  on public.attendance(student_id);
create index if not exists idx_att_group    on public.attendance(group_id);
create index if not exists idx_att_date     on public.attendance(lesson_date);

-- ---------- 12. USTOZLAR DAVOMATI (teacher_attendance) ----------
create table if not exists public.teacher_attendance (
    id            uuid primary key default gen_random_uuid(),
    user_id       uuid not null references public.users(id) on delete cascade,
    teacher_id    uuid not null references public.teachers(id) on delete cascade,
    group_id      uuid references public.groups(id) on delete set null,
    lesson_date   date not null,
    status        text not null check (status in ('present','absent','late','excused')),
    notes         text,
    created_at    timestamptz not null default now()
);
create index if not exists idx_tatt_user    on public.teacher_attendance(user_id);
create index if not exists idx_tatt_teacher  on public.teacher_attendance(teacher_id);
create index if not exists idx_tatt_date     on public.teacher_attendance(lesson_date);

-- ---------- 13. REYTING (ratings) — talabalar uchun ----------
create table if not exists public.ratings (
    id            uuid primary key default gen_random_uuid(),
    user_id       uuid not null references public.users(id) on delete cascade,
    student_id    uuid not null references public.students(id) on delete cascade,
    group_id      uuid references public.groups(id) on delete set null,
    rating_date   date not null default current_date,
    score         integer not null check (score between 1 and 5),
    comment       text,
    created_at    timestamptz not null default now()
);
create index if not exists idx_ratings_user    on public.ratings(user_id);
create index if not exists idx_ratings_student on public.ratings(student_id);

-- ---------- 14. ESLATMALAR (reminders) ----------
create table if not exists public.reminders (
    id            uuid primary key default gen_random_uuid(),
    user_id       uuid not null references public.users(id) on delete cascade,
    title         text not null,
    description   text,
    reminder_date date not null,
    is_done       boolean not null default false,
    created_at    timestamptz not null default now()
);
create index if not exists idx_reminders_user on public.reminders(user_id);
create index if not exists idx_reminders_date on public.reminders(reminder_date);

-- ---------- 15. SOZLAMALAR (settings) — markaz profili ----------
create table if not exists public.settings (
    id            uuid primary key default gen_random_uuid(),
    user_id       uuid not null unique references public.users(id) on delete cascade,
    center_name   text,
    center_phone  text,
    center_address text,
    currency      text default 'so''m',
    telegram_bot_token text,
    sms_api_key   text,
    monthly_payment_amount numeric(12,2) default 0,
    created_at    timestamptz not null default now(),
    updated_at    timestamptz not null default now()
);
create index if not exists idx_settings_user on public.settings(user_id);

-- ---------- UPDATED_AT TRIGGERS ----------
create or replace function public.set_updated_at()
returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

do $$
declare t text;
begin
    for t in select unnest(array[
        'users','teachers','courses','groups','students','leads','settings'
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

-- ---------- ROW LEVEL SECURITY ----------
alter table public.users              enable row level security;
alter table public.teachers           enable row level security;
alter table public.courses            enable row level security;
alter table public.groups             enable row level security;
alter table public.students           enable row level security;
alter table public.leads              enable row level security;
alter table public.payments           enable row level security;
alter table public.expenses           enable row level security;
alter table public.attendance         enable row level security;
alter table public.teacher_attendance enable row level security;
alter table public.ratings            enable row level security;
alter table public.reminders          enable row level security;
alter table public.settings           enable row level security;
alter table public.activation_codes   enable row level security;
alter table public.audit_log          enable row level security;

do $$
declare t text;
begin
  for t in select unnest(array[
    'users','teachers','courses','groups','students','leads','payments','expenses',
    'attendance','teacher_attendance','ratings','reminders','settings',
    'activation_codes','audit_log'
  ])
  loop
    execute format(
      'drop policy if exists "service_role_all_%I" on public.%I;',
      t, t
    );

    execute format(
      'create policy "service_role_all_%I" on public.%I
       for all
       using (auth.role() = ''service_role'')
       with check (auth.role() = ''service_role'');',
      t, t
    );
  end loop;
end $$;

-- ---------- ADMIN FOYDALANUVCHI ----------
-- email: admin@erp.uz  parol: admin12345
insert into public.users (
    full_name, phone, email, center_name, address,
    password_hash, role, status,
    trial_started_at, trial_ends_at, active_until
)
select
    'Administrator', '+998901234567', 'admin@erp.uz', 'Boshqaruv Markazi', 'Toshkent',
    '$2a$10$N9qo8uLOickgx2ZMRZoMy.Mrq4VjYH8IvQY0OJ7XqfByHkQY5LQ5W',
    'admin', 'active',
    now(), now() + interval '100 years', now() + interval '100 years'
where not exists (
    select 1 from public.users where email = 'admin@erp.uz'
);

-- =====================================================================
--  ERP v3 QO'SHIMCHA MIGRATION
--  Avval schema.sql ni ishga tushiring, keyin shu faylni bajaring.
--  Yangi jadvallar: rooms, schedule, exams, grades, certificates,
--                   discounts, teacher_payouts, password_resets, notifications
-- =====================================================================

-- ---------- 1. XONALAR (rooms) ----------
create table if not exists public.rooms (
    id            uuid primary key default gen_random_uuid(),
    user_id       uuid not null references public.users(id) on delete cascade,
    name          text not null,
    capacity      integer default 20,
    notes         text,
    created_at    timestamptz not null default now()
);
create index if not exists idx_rooms_user on public.rooms(user_id);

-- ---------- 2. DARS JADVALI (schedule) ----------
create table if not exists public.schedule (
    id            uuid primary key default gen_random_uuid(),
    user_id       uuid not null references public.users(id) on delete cascade,
    group_id      uuid references public.groups(id) on delete cascade,
    room_id       uuid references public.rooms(id) on delete set null,
    teacher_id    uuid references public.teachers(id) on delete set null,
    weekday       smallint not null check (weekday between 0 and 6),
    start_time    time not null,
    end_time      time not null,
    created_at    timestamptz not null default now()
);
create index if not exists idx_schedule_user  on public.schedule(user_id);
create index if not exists idx_schedule_group on public.schedule(group_id);
create index if not exists idx_schedule_day   on public.schedule(weekday);

-- ---------- 3. IMTIHONLAR (exams) ----------
create table if not exists public.exams (
    id            uuid primary key default gen_random_uuid(),
    user_id       uuid not null references public.users(id) on delete cascade,
    group_id      uuid references public.groups(id) on delete set null,
    course_id     uuid references public.courses(id) on delete set null,
    title         text not null,
    description   text,
    exam_date     date not null,
    max_score     integer not null default 100,
    created_at    timestamptz not null default now()
);
create index if not exists idx_exams_user   on public.exams(user_id);
create index if not exists idx_exams_group  on public.exams(group_id);

-- ---------- 4. BAHOLAR (grades) ----------
create table if not exists public.grades (
    id            uuid primary key default gen_random_uuid(),
    user_id       uuid not null references public.users(id) on delete cascade,
    exam_id       uuid not null references public.exams(id) on delete cascade,
    student_id    uuid not null references public.students(id) on delete cascade,
    score         numeric(6,2) not null default 0,
    comment       text,
    created_at    timestamptz not null default now(),
    unique (exam_id, student_id)
);
create index if not exists idx_grades_user     on public.grades(user_id);
create index if not exists idx_grades_exam     on public.grades(exam_id);
create index if not exists idx_grades_student  on public.grades(student_id);

-- ---------- 5. SERTIFIKATLAR (certificates) ----------
create table if not exists public.certificates (
    id                uuid primary key default gen_random_uuid(),
    user_id           uuid not null references public.users(id) on delete cascade,
    student_id        uuid not null references public.students(id) on delete cascade,
    course_id         uuid references public.courses(id) on delete set null,
    certificate_number text not null unique,
    issue_date        date not null default current_date,
    notes             text,
    created_at        timestamptz not null default now()
);
create index if not exists idx_certs_user     on public.certificates(user_id);
create index if not exists idx_certs_student  on public.certificates(student_id);
create index if not exists idx_certs_number   on public.certificates(certificate_number);

-- ---------- 6. CHEGIRMALAR (discounts) ----------
create table if not exists public.discounts (
    id            uuid primary key default gen_random_uuid(),
    user_id       uuid not null references public.users(id) on delete cascade,
    name          text not null,
    discount_type text not null check (discount_type in ('percent','fixed')),
    value         numeric(12,2) not null,
    valid_from    date,
    valid_until   date,
    applies_to    text not null default 'all' check (applies_to in ('all','course','student')),
    course_id     uuid references public.courses(id) on delete set null,
    student_id    uuid references public.students(id) on delete set null,
    is_active     boolean not null default true,
    created_at    timestamptz not null default now()
);
create index if not exists idx_discounts_user on public.discounts(user_id);

-- ---------- 7. O'QITUVCHI MAOSHLARI (teacher_payouts) ----------
create table if not exists public.teacher_payouts (
    id            uuid primary key default gen_random_uuid(),
    user_id       uuid not null references public.users(id) on delete cascade,
    teacher_id    uuid not null references public.teachers(id) on delete cascade,
    amount        numeric(12,2) not null,
    period_month  text not null,                              -- YYYY-MM
    lesson_count  integer default 0,
    bonus         numeric(12,2) default 0,
    deduction     numeric(12,2) default 0,
    status        text not null default 'pending' check (status in ('pending','paid')),
    paid_at       timestamptz,
    notes         text,
    created_at    timestamptz not null default now()
);
create index if not exists idx_payouts_user    on public.teacher_payouts(user_id);
create index if not exists idx_payouts_teacher  on public.teacher_payouts(teacher_id);
create index if not exists idx_payouts_month    on public.teacher_payouts(period_month);

-- ---------- 8. PAROLNI TIKLASH (password_resets) ----------
create table if not exists public.password_resets (
    id            uuid primary key default gen_random_uuid(),
    user_id       uuid not null references public.users(id) on delete cascade,
    email         text not null,
    token         text not null unique,
    expires_at    timestamptz not null,
    used          boolean not null default false,
    created_at    timestamptz not null default now()
);
create index if not exists idx_presets_token on public.password_resets(token);
create index if not exists idx_presets_email on public.password_resets(email);

-- ---------- 9. BILDIRISHNOMALAR (notifications) — ota-onaga yuboriladigan ----------
create table if not exists public.notifications (
    id            uuid primary key default gen_random_uuid(),
    user_id       uuid not null references public.users(id) on delete cascade,
    student_id    uuid references public.students(id) on delete set null,
    type          text not null,                              -- absent, payment_received, payment_reminder, custom
    channel       text not null default 'telegram' check (channel in ('telegram','sms','in_app')),
    recipient     text,                                       -- phone or username
    message       text not null,
    status        text not null default 'pending' check (status in ('pending','sent','failed')),
    sent_at       timestamptz,
    created_at    timestamptz not null default now()
);
create index if not exists idx_notif_user   on public.notifications(user_id);
create index if not exists idx_notif_status on public.notifications(status);

-- ---------- 10. RLS ----------
alter table public.rooms              enable row level security;
alter table public.schedule           enable row level security;
alter table public.exams              enable row level security;
alter table public.grades             enable row level security;
alter table public.certificates       enable row level security;
alter table public.discounts          enable row level security;
alter table public.teacher_payouts    enable row level security;
alter table public.password_resets    enable row level security;
alter table public.notifications      enable row level security;

do $$
declare t text;
begin
  for t in select unnest(array[
    'rooms','schedule','exams','grades','certificates','discounts',
    'teacher_payouts','password_resets','notifications'
  ])
  loop
    execute format(
      'drop policy if exists "service_role_all_%I" on public.%I;',
      t, t
    );

    execute format(
      'create policy "service_role_all_%I" on public.%I
       for all
       using (auth.role() = ''service_role'')
       with check (auth.role() = ''service_role'');',
      t, t
    );
  end loop;
end $$;

-- =====================================================================

-- (v3 qo'shimcha jadvallar yuqorida)
