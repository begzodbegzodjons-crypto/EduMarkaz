/**
 * DEMO MA'LUMOTLAR BAZASI (in-memory)
 *
 * Bu faqat test rejimi uchun — Supabase sozlanmaganida ishlaydi.
 * Ma'lumotlar server qayta ishga tushganda yo'qoladi.
 *
 * Real deployment'da SUPABASE_SERVICE_ROLE_KEY sozlanganda
 * bu kod ishlatilmaydi — Supabase ga to'g'ridan-to'g'ri yoziladi.
 */

import { randomUUID } from 'crypto'

type Row = Record<string, any>

// Server-side global store (Vercel serverless da har bir so'rov yangi instance yaratadi,
// lekin bir session ichida ishlaydi)
const g: any = globalThis as any
if (!g.__demoDB) {
  g.__demoDB = {
    users: [] as Row[],
    activation_codes: [] as Row[],
    audit_log: [] as Row[],
    teachers: [] as Row[],
    courses: [] as Row[],
    groups: [] as Row[],
    students: [] as Row[],
    leads: [] as Row[],
    payments: [] as Row[],
    expenses: [] as Row[],
    attendance: [] as Row[],
    teacher_attendance: [] as Row[],
    ratings: [] as Row[],
    reminders: [] as Row[],
    settings: [] as Row[],
    rooms: [] as Row[],
    schedule: [] as Row[],
    exams: [] as Row[],
    grades: [] as Row[],
    certificates: [] as Row[],
    discounts: [] as Row[],
    teacher_payouts: [] as Row[],
    password_resets: [] as Row[],
    notifications: [] as Row[],
  }

  // Default admin — email: admin@erp.uz, password: admin12345
  g.__demoDB.users.push({
    id: randomUUID(),
    full_name: 'Administrator',
    phone: '+998901234567',
    email: 'admin@erp.uz',
    center_name: 'Boshqaruv Markazi',
    address: 'Toshkent',
    // bcrypt hash for "admin12345" (verified working)
    password_hash: '$2b$10$IKoqNrXC2mQ1ECp10pv08eX3Nb1/Yf.iAo/za4MqnPC5oHlobnsNi',
    role: 'admin',
    status: 'active',
    trial_started_at: new Date().toISOString(),
    trial_ends_at: new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000).toISOString(),
    active_until: new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000).toISOString(),
    last_login_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  })

  // Demo ma'lumotlar (bo'sh — foydalanuvchi o'zi to'ldiradi)
}

export const demoDB = g.__demoDB

/**
 * Mock Supabase query builder.
 * Asosiy CRUD operatsiyalarini qo'llab-quvvatlaydi:
 *   .from(table).select(columns).eq(col, val).order(col, {ascending}).limit(n).maybeSingle()
 *   .from(table).insert(row).select().single()
 *   .from(table).update(patch).eq(col, val).select().single()
 *   .from(table).delete().eq(col, val)
 */
class QueryBuilder {
  private table: string
  private rows: Row[] = []
  private filters: { col: string; val: any; op: string }[] = []
  private orderCol: string | null = null
  private orderAsc = true
  private limitN: number | null = null
  private singleMode = false
  private maybeSingleMode = false
  private selectCols: string = '*'

  constructor(table: string) {
    this.table = table
    this.rows = demoDB[table] || []
  }

  select(cols: string = '*') {
    this.selectCols = cols
    return this
  }

  eq(col: string, val: any) {
    this.filters.push({ col, val, op: 'eq' })
    return this
  }

  neq(col: string, val: any) {
    this.filters.push({ col, val, op: 'neq' })
    return this
  }

  gte(col: string, val: any) {
    this.filters.push({ col, val, op: 'gte' })
    return this
  }

  lte(col: string, val: any) {
    this.filters.push({ col, val, op: 'lte' })
    return this
  }

  in(col: string, val: any[]) {
    this.filters.push({ col, val, op: 'in' })
    return this
  }

  neq(col: string, val: any) {
    this.filters.push({ col, val, op: 'neq' })
    return this
  }

  or(condition: string) {
    // condition format: "and(start_time.lt.X,end_time.gt.Y)" — soddalashtirilgan, e'tibor berilmaydi
    return this
  }

  order(col: string, opts?: { ascending?: boolean }) {
    this.orderCol = col
    this.orderAsc = opts?.ascending !== false
    return this
  }

  limit(n: number) {
    this.limitN = n
    return this
  }

  single() {
    this.singleMode = true
    return this.execute()
  }

  maybeSingle() {
    this.maybeSingleMode = true
    return this.execute()
  }

  private applyFilters(rows: Row[]): Row[] {
    return rows.filter((r) => {
      return this.filters.every((f) => {
        const v = r[f.col]
        if (f.op === 'eq') return v === f.val
        if (f.op === 'neq') return v !== f.val
        if (f.op === 'gte') return v >= f.val
        if (f.op === 'lte') return v <= f.val
        if (f.op === 'in') return Array.isArray(f.val) && f.val.includes(v)
        return true
      })
    })
  }

  private applyOrder(rows: Row[]): Row[] {
    if (!this.orderCol) return rows
    return [...rows].sort((a, b) => {
      let av = a[this.orderCol], bv = b[this.orderCol]
      if (av == null) return 1
      if (bv == null) return -1
      if (typeof av === 'string' && typeof bv === 'string') {
        return this.orderAsc ? av.localeCompare(bv) : bv.localeCompare(av)
      }
      return this.orderAsc ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1)
    })
  }

  private resolveNested(row: Row, cols: string): Row {
    // cols: "*, student:students(id,full_name), group:groups(id,name,course:courses(id,name))"
    // Nested relation'larni qo'llab-quvvatlaydi (recursive)
    if (cols === '*') return row
    const parts = this.splitTopLevel(cols)
    const result: Row = { ...row }
    for (const p of parts) {
      const trimmed = p.trim()
      if (trimmed === '*') continue
      // field:table(columns)
      const m = trimmed.match(/^(\w+):(\w+)\((.*)\)$/)
      if (m) {
        const [, alias, table, tableCols] = m
        const fkCol = `${alias}_id`
        const fkVal = row[fkCol]
        if (fkVal) {
          const target = (demoDB[table] || []).find((x) => x.id === fkVal)
          if (target) {
            // Recursive nested resolution
            result[alias] = this.resolveNested({ ...target }, tableCols)
          } else {
            result[alias] = null
          }
        } else {
          result[alias] = null
        }
      } else {
        // oddgina column nomi
        result[trimmed] = row[trimmed]
      }
    }
    return result
  }

  // Vergul bo'yicha ajratadi, lekin qavslar ichidagi vergullarga tegmaydi
  private splitTopLevel(s: string): string[] {
    const parts: string[] = []
    let depth = 0, current = ''
    for (const ch of s) {
      if (ch === '(') { depth++; current += ch }
      else if (ch === ')') { depth--; current += ch }
      else if (ch === ',' && depth === 0) { parts.push(current); current = '' }
      else current += ch
    }
    if (current.trim()) parts.push(current)
    return parts
  }

  private execute() {
    let rows = [...this.rows]
    rows = this.applyFilters(rows)
    rows = this.applyOrder(rows)
    if (this.limitN) rows = rows.slice(0, this.limitN)

    if (this.singleMode) {
      const row = rows[0]
      if (!row) return { data: null, error: { message: 'No rows found' } }
      return { data: this.resolveNested(row, this.selectCols), error: null }
    }
    if (this.maybeSingleMode) {
      const row = rows[0]
      return { data: row ? this.resolveNested(row, this.selectCols) : null, error: null }
    }
    return { data: rows.map((r) => this.resolveNested(r, this.selectCols)), error: null }
  }

  // INSERT
  insert(payload: any) {
    const builder = new InsertBuilder(this.table, payload)
    return builder
  }

  // UPDATE
  update(patch: any) {
    const builder = new UpdateBuilder(this.table, patch)
    builder.filters = [...this.filters]
    return builder
  }

  // DELETE
  delete() {
    const builder = new DeleteBuilder(this.table)
    builder.filters = [...this.filters]
    return builder
  }

  // Upsert (demo'da oddiy insert/update sifatida)
  upsert(payload: any, opts?: any) {
    const builder = new UpsertBuilder(this.table, payload, opts)
    return builder
  }

  then(resolve: any, reject?: any) {
    const res = this.execute()
    return Promise.resolve(res).then(resolve, reject)
  }
}

class InsertBuilder {
  private table: string
  private payload: any
  private selectCols: string = '*'
  private isSingle = false

  constructor(table: string, payload: any) {
    this.table = table
    this.payload = payload
  }

  select(cols: string = '*') {
    this.selectCols = cols
    return this
  }

  single() {
    this.isSingle = true
    return this.execute()
  }

  private execute() {
    const arr = Array.isArray(this.payload) ? this.payload : [this.payload]
    const inserted: Row[] = []
    for (const row of arr) {
      const newRow: Row = {
        id: row.id || randomUUID(),
        created_at: row.created_at || new Date().toISOString(),
        ...row,
      }
      // created_at ni qayta yozmaslik
      if (row.created_at) newRow.created_at = row.created_at
      demoDB[this.table].push(newRow)
      inserted.push(newRow)
    }
    if (this.isSingle) {
      return { data: inserted[0] || null, error: null }
    }
    return { data: inserted, error: null }
  }

  then(resolve: any, reject?: any) {
    return Promise.resolve(this.execute()).then(resolve, reject)
  }
}

class UpdateBuilder {
  private table: string
  private patch: any
  filters: { col: string; val: any; op: string }[] = []

  constructor(table: string, patch: any) {
    this.table = table
    this.patch = { ...patch, updated_at: new Date().toISOString() }
  }

  eq(col: string, val: any) {
    this.filters.push({ col, val, op: 'eq' })
    return this
  }

  select(_cols: string = '*') {
    return this
  }

  single() {
    return this.execute()
  }

  private execute() {
    const rows = demoDB[this.table]
    let updated: Row | null = null
    for (let i = 0; i < rows.length; i++) {
      const matches = this.filters.every((f) => rows[i][f.col] === f.val)
      if (matches) {
        rows[i] = { ...rows[i], ...this.patch }
        updated = rows[i]
      }
    }
    return { data: updated, error: null }
  }

  then(resolve: any, reject?: any) {
    return Promise.resolve(this.execute()).then(resolve, reject)
  }
}

class DeleteBuilder {
  private table: string
  filters: { col: string; val: any; op: string }[] = []

  constructor(table: string) {
    this.table = table
  }

  eq(col: string, val: any) {
    this.filters.push({ col, val, op: 'eq' })
    return this
  }

  private execute() {
    const rows = demoDB[this.table]
    const before = rows.length
    const remaining = rows.filter((r) => !this.filters.every((f) => r[f.col] === f.val))
    demoDB[this.table] = remaining
    return { data: null, error: null, count: before - remaining.length }
  }

  then(resolve: any, reject?: any) {
    return Promise.resolve(this.execute()).then(resolve, reject)
  }
}

class UpsertBuilder {
  private table: string
  private payload: any
  private onConflict?: string
  private selectCols: string = '*'

  constructor(table: string, payload: any, opts?: any) {
    this.table = table
    this.payload = payload
    this.onConflict = opts?.onConflict
  }

  select(cols: string = '*') {
    this.selectCols = cols
    return this
  }

  private execute() {
    const arr = Array.isArray(this.payload) ? this.payload : [this.payload]
    const result: Row[] = []
    for (const row of arr) {
      let existing: Row | null = null
      if (this.onConflict) {
        const conflictCols = this.onConflict.split(',')
        existing = demoDB[this.table].find((r) =>
          conflictCols.every((c: string) => r[c.trim()] === row[c.trim()])
        ) || null
      }
      if (existing) {
        // update
        const idx = demoDB[this.table].indexOf(existing)
        demoDB[this.table][idx] = { ...existing, ...row, updated_at: new Date().toISOString() }
        result.push(demoDB[this.table][idx])
      } else {
        // insert
        const newRow: Row = { id: row.id || randomUUID(), created_at: new Date().toISOString(), ...row }
        demoDB[this.table].push(newRow)
        result.push(newRow)
      }
    }
    return { data: result, error: null }
  }

  then(resolve: any, reject?: any) {
    return Promise.resolve(this.execute()).then(resolve, reject)
  }
}

/**
 * getDemoSupabase — Supabase client'ga o'xshash mock qaytaradi.
 */
export function getDemoSupabase() {
  return {
    from(table: string) {
      return new QueryBuilder(table)
    },
  }
}
