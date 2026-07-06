import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { cookies } from 'next/headers'
import { getSupabase, isSupabaseConfigured } from './supabase'
import { getDemoSupabase } from './demo-db'

const JWT_SECRET = process.env.JWT_SECRET || 'norinkomp-erp-secret-key-2026-very-secure'
const COOKIE_NAME = 'erp_session'
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7 // 7 kun

export type UserRole = 'user' | 'admin'
export type UserStatus = 'trial' | 'active' | 'blocked'

export interface SessionUser {
  id: string
  email: string
  full_name: string
  center_name: string
  role: UserRole
  status: UserStatus
  trial_ends_at: string | null
  active_until: string | null
}

export interface PublicUser extends SessionUser {
  phone: string
  address: string | null
  trial_started_at: string | null
  last_login_at: string | null
  last_activation_at: string | null
  days_left: number
}

// ---------- Hash & verify ----------
export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10)
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash)
}

// ---------- JWT ----------
export function signToken(user: SessionUser): string {
  return jwt.sign(user, JWT_SECRET, { expiresIn: '7d' })
}

export function verifyToken(token: string): SessionUser | null {
  try {
    return jwt.verify(token, JWT_SECRET) as SessionUser
  } catch {
    return null
  }
}

// ---------- Cookie ----------
export async function setSessionCookie(user: SessionUser) {
  const token = signToken(user)
  const store = await cookies()
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: COOKIE_MAX_AGE,
  })
}

export async function clearSessionCookie() {
  const store = await cookies()
  store.delete(COOKIE_NAME)
}

export async function getSession(): Promise<SessionUser | null> {
  const store = await cookies()
  const token = store.get(COOKIE_NAME)?.value
  if (!token) return null
  return verifyToken(token)
}

// ---------- DB helpers (real Supabase yoki demo rejim) ----------
export interface DbUser {
  id: string
  full_name: string
  phone: string
  email: string
  center_name: string
  address: string | null
  password_hash: string
  role: UserRole
  status: UserStatus
  trial_started_at: string
  trial_ends_at: string
  active_until: string | null
  last_login_at: string | null
  created_at: string
  updated_at: string
}

/**
 * Real yoki demo DB client — konfiguratsiyaga qarab.
 */
function getDB() {
  return isSupabaseConfigured() ? getSupabase() : (getDemoSupabase() as any)
}

/**
 * Trial muddati o'tgan bo'lsa, statusni "blocked" ga o'tkazadi va bazaga yozadi.
 */
export function computeStatus(u: Pick<DbUser, 'status' | 'trial_ends_at' | 'active_until'>): UserStatus {
  const now = new Date()
  if (u.status === 'active') {
    if (u.active_until && new Date(u.active_until) > now) return 'active'
    return 'blocked'
  }
  if (u.status === 'trial') {
    if (new Date(u.trial_ends_at) > now) return 'trial'
    return 'blocked'
  }
  return 'blocked'
}

export function daysLeft(u: { status: UserStatus; trial_ends_at: string | null; active_until: string | null }): number {
  const now = new Date()
  if (u.status === 'trial' && u.trial_ends_at) {
    const diff = new Date(u.trial_ends_at).getTime() - now.getTime()
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
  }
  if (u.status === 'active' && u.active_until) {
    const diff = new Date(u.active_until).getTime() - now.getTime()
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
  }
  return 0
}

/**
 * Baza bilan sinxronlashtiradi (statusni yangilaydi).
 */
export async function syncUserStatus(user: DbUser): Promise<DbUser> {
  const newStatus = computeStatus(user)
  if (newStatus !== user.status) {
    try {
      const sb = getDB()
      await sb.from('users').update({ status: newStatus, updated_at: new Date().toISOString() }).eq('id', user.id)
    } catch (e) { /* demo rejimda e'tibor berilmaydi */ }
    return { ...user, status: newStatus }
  }
  return user
}

export async function getUserById(id: string): Promise<DbUser | null> {
  try {
    const sb = getDB()
    const { data, error } = await sb.from('users').select('*').eq('id', id).maybeSingle()
    if (error || !data) return null
    return data as DbUser
  } catch (e) {
    return null
  }
}

export async function getUserByEmail(email: string): Promise<DbUser | null> {
  try {
    const sb = getDB()
    const { data, error } = await sb.from('users').select('*').eq('email', email).maybeSingle()
    if (error || !data) return null
    return data as DbUser
  } catch (e) {
    return null
  }
}

export async function audit(
  userId: string | null,
  action: string,
  entity?: string,
  entityId?: string,
  detail?: any,
  ip?: string,
  ua?: string
) {
  try {
    if (!userId) return
    const sb = getDB()
    await sb.from('audit_log').insert({
      user_id: userId,
      action,
      entity,
      entity_id: entityId,
      detail: detail ?? null,
      ip_address: ip ?? null,
      user_agent: ua ?? null,
    })
  } catch (e) {
    // Audit log xatosi asosiy oqimga ta'sir qilmasligi kerak
    console.error('audit error:', e)
  }
}

export function toPublicUser(u: DbUser): PublicUser {
  return {
    id: u.id,
    email: u.email,
    full_name: u.full_name,
    phone: u.phone,
    center_name: u.center_name,
    address: u.address,
    role: u.role,
    status: u.status,
    trial_started_at: u.trial_started_at,
    trial_ends_at: u.trial_ends_at,
    active_until: u.active_until,
    last_login_at: u.last_login_at,
    last_activation_at: (u as any).last_activation_at || null,
    days_left: daysLeft(u),
  }
}

// ---------- ADMIN PANEL (sayt egasi uchun) ----------
// URL: /?adminkod bilan kiriladi (maxfiy kalit so'z)
// So'ng parol so'raladi: Balandtoglar1 (env'dan olinadi)
const ADMIN_URL_KEYWORD = process.env.NEXT_PUBLIC_ADMIN_URL || 'adminkod'
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Balandtoglar1'

export function getAdminUrlKeyword(): string {
  return ADMIN_URL_KEYWORD
}

/**
 * Admin parolini tekshiradi (admin panel uchun).
 * Header orqali keladi: x-admin-password
 */
export function verifyAdminPassword(password: string | null | undefined): boolean {
  if (!password) return false
  return password === ADMIN_PASSWORD
}

/**
 * Admin huquqini tekshiradi — session admin bo'lsa YOKI parol to'g'ri bo'lsa.
 */
export async function requireAdmin(req: any): Promise<{ ok: boolean; error?: string }> {
  // 1. x-admin-password header tekshirish
  const password = req.headers?.get?.('x-admin-password') || req.headers?.['x-admin-password']
  if (verifyAdminPassword(password)) {
    return { ok: true }
  }
  // 2. Admin session tekshirish
  const sess = await getSession()
  if (sess && sess.role === 'admin') {
    return { ok: true }
  }
  return { ok: false, error: 'Admin huquqi kerak.' }
}
