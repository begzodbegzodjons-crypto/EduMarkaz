'use client'
import { useEffect, useState, useCallback } from 'react'

export interface PublicUser {
  id: string
  email: string
  full_name: string
  phone: string
  center_name: string
  address: string | null
  role: 'user' | 'admin'
  status: 'trial' | 'active' | 'blocked'
  trial_started_at: string | null
  trial_ends_at: string | null
  active_until: string | null
  last_login_at: string | null
  days_left: number
}

export async function apiFetch<T = any>(url: string, opts?: RequestInit): Promise<{ ok: boolean; data?: T; error?: string; status?: number }> {
  try {
    const res = await fetch(url, {
      ...opts,
      headers: {
        'Content-Type': 'application/json',
        ...(opts?.headers || {}),
      },
      credentials: 'include',
    })
    let json: any = null
    try { json = await res.json() } catch {}
    if (!res.ok) return { ok: false, error: json?.error || json?.message || `HTTP ${res.status}`, status: res.status, data: json }
    return { ok: true, data: json, status: res.status }
  } catch (e: any) {
    return { ok: false, error: e?.message || 'Tarmoq xatosi' }
  }
}

export function useUser() {
  const [user, setUser] = useState<PublicUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    const { ok, data, error } = await apiFetch<{ ok: boolean; user: PublicUser | null }>('/api/auth/me')
    if (ok && data?.ok && data.user) {
      setUser(data.user)
      setError(null)
    } else {
      setUser(null)
      setError(error || null)
    }
    setLoading(false)
  }, [])

  useEffect(() => { refresh() }, [refresh])

  return { user, loading, error, refresh, setUser }
}

export function formatDate(d?: string | null, fallback = '—'): string {
  if (!d) return fallback
  try {
    const date = new Date(d)
    return date.toLocaleDateString('uz-UZ', { day: '2-digit', month: '2-digit', year: 'numeric' })
  } catch {
    return fallback
  }
}

export function formatDateTime(d?: string | null): string {
  if (!d) return '—'
  try {
    return new Date(d).toLocaleString('uz-UZ', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  } catch {
    return '—'
  }
}

export function formatMoney(n: number | string): string {
  const num = Number(n || 0)
  return num.toLocaleString('ru-RU') + ' so\'m'
}
