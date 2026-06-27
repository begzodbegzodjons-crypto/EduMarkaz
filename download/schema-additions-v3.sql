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
      'create policy if not exists "service_role_all_%I" on public.%I for all using (auth.role() = ''service_role'') with check (auth.role() = ''service_role'');',
      t, t
    );
  end loop;
end$$;

-- =====================================================================
