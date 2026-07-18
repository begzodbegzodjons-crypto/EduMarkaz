'use client'
// Common UI helpers — Soft Slate theme
import { AnimatePresence, motion } from 'framer-motion'
import {
  Plus, Trash2, Pencil, Search, X, Spinner,
} from '@/components/icons'

export function Card({ children, className = '', color }: { children: React.ReactNode; className?: string; color?: string }) {
  return <div className={`bg-card rounded-2xl border border-border shadow-sm shadow-indigo-500/5 overflow-hidden ${className}`}>{children}</div>
}
export function CardHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="px-5 py-4 border-b border-border flex items-center justify-between">
      <div>
        <h3 className="font-semibold text-base text-foreground">{title}</h3>
        {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}
export function PanelLoader() { return <div className="flex items-center justify-center py-20"><Spinner className="w-8 h-8 text-indigo-500" /></div> }
export function EmptyState({ title, description, action }: { title: string; description?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4"><Search className="w-7 h-7 text-muted-foreground" /></div>
      <h3 className="font-semibold text-lg">{title}</h3>
      {description && <p className="text-sm text-muted-foreground mt-1 max-w-md">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
export function Modal({ open, onClose, title, children, size = 'md' }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode; size?: 'sm' | 'md' | 'lg' }) {
  const sizeMap = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl' }
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm" />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className={`bg-card rounded-2xl shadow-2xl border border-border w-full ${sizeMap[size]} max-h-[90vh] overflow-y-auto pointer-events-auto`}>
              <div className="px-5 py-4 border-b border-border flex items-center justify-between sticky top-0 bg-card z-10">
                <h3 className="font-semibold">{title}</h3>
                <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition"><X className="w-4 h-4" /></button>
              </div>
              <div className="p-5">{children}</div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}
export function PrimaryButton({ children, onClick, type = 'button', disabled, className = '' }: { children: React.ReactNode; onClick?: () => void; type?: 'button' | 'submit'; disabled?: boolean; className?: string }) {
  return <button type={type} onClick={onClick} disabled={disabled} className={`inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold shadow-sm shadow-indigo-500/25 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${className}`}>{children}</button>
}
export function GhostButton({ children, onClick, className = '' }: { children: React.ReactNode; onClick?: () => void; className?: string }) {
  return <button onClick={onClick} className={`inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition ${className}`}>{children}</button>
}
export function IconButton({ children, onClick, title, danger }: { children: React.ReactNode; onClick?: () => void; title?: string; danger?: boolean }) {
  return <button onClick={onClick} title={title} className={`p-1.5 rounded-lg transition ${danger ? 'text-red-600 hover:bg-red-50' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}>{children}</button>
}
export function Field({ label, children, labelSize = 'sm' }: { label: string; children: React.ReactNode; labelSize?: 'sm' | 'lg' }) {
  return (
    <div>
      <label className={`block font-semibold text-foreground mb-1.5 ${labelSize === 'lg' ? 'text-base' : 'text-xs'}`}>{label}</label>
      {children}
    </div>
  )
}
export function Avatar({ name, color }: { name: string; color?: string }) {
  const initials = (name || '?').split(' ').slice(0, 2).map((s) => s[0]?.toUpperCase()).join('')
  return <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-semibold text-sm shrink-0">{initials}</div>
}
export function Row({ label, value }: { label: string; value: string }) {
  return <div className="flex justify-between gap-2"><span className="text-muted-foreground shrink-0">{label}:</span><span className="font-medium text-right truncate">{value}</span></div>
}
export function StatCard({ label, value, sub, icon: Icon, color, trend, onClick }: { label: string; value: any; sub?: string; icon: any; color: string; trend?: 'up' | 'down'; onClick?: () => void }) {
  const clickable = !!onClick
  return (
    <div
      onClick={onClick}
      className={`bg-card rounded-2xl border border-border p-4 shadow-sm ${clickable ? 'cursor-pointer hover:border-indigo-300 hover:shadow-md transition-all' : ''}`}
    >
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <div className="text-xs text-muted-foreground font-medium">{label}</div>
          <div className="text-xl lg:text-2xl font-bold mt-1 truncate text-foreground">{value}</div>
          {sub && <div className="text-[10px] text-muted-foreground mt-0.5">{sub}</div>}
        </div>
        <div className="shrink-0 w-9 h-9 rounded-xl bg-indigo-100 flex items-center justify-center"><Icon className="w-4 h-4 text-indigo-600" /></div>
      </div>
    </div>
  )
}
