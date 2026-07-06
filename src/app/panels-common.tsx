'use client'
// Common UI helpers shared across panel files
import { AnimatePresence, motion } from 'framer-motion'
import {
  Plus, Trash2, Pencil, Search, X, Spinner,
} from '@/components/icons'

export function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`relative bg-card rounded-2xl border border-border/50 shadow-sm shadow-blue-500/5 overflow-hidden card-shimmer-wrap ${className}`}>
      {/* Yaltirash nur effekti */}
      <div className="card-shimmer" />
      <div className="relative z-10">{children}</div>
    </div>
  )
}
export function CardHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="px-5 py-4 border-b border-border/40 flex items-center justify-between relative">
      <div>
        <h3 className="font-semibold text-base">{title}</h3>
        {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}
export function PanelLoader() { return <div className="flex items-center justify-center py-20"><Spinner className="w-8 h-8 text-blue-500" /></div> }
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
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className={`bg-card rounded-2xl shadow-2xl border border-border/50 w-full ${sizeMap[size]} max-h-[90vh] overflow-y-auto pointer-events-auto`}>
              <div className="px-5 py-4 border-b border-border/40 flex items-center justify-between sticky top-0 bg-card z-10">
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
  return <button type={type} onClick={onClick} disabled={disabled} className={`inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-500 to-sky-600 text-white text-sm font-semibold shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed ${className}`}>{children}</button>
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
export function Avatar({ name, color = 'blue' }: { name: string; color?: string }) {
  const initials = (name || '?').split(' ').slice(0, 2).map((s) => s[0]?.toUpperCase()).join('')
  const colorMap: any = {
    blue: 'from-blue-400 to-sky-500', cyan: 'from-cyan-500 to-sky-600', amber: 'from-amber-500 to-orange-600',
    violet: 'from-violet-500 to-purple-600', blue: 'from-blue-500 to-indigo-600', rose: 'from-rose-500 to-pink-600',
  }
  return <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${colorMap[color] || colorMap.blue} text-white flex items-center justify-center font-semibold text-sm shrink-0`}>{initials}</div>
}
export function Row({ label, value }: { label: string; value: string }) {
  return <div className="flex justify-between gap-2"><span className="text-muted-foreground shrink-0">{label}:</span><span className="font-medium text-right truncate">{value}</span></div>
}
export function StatCard({ label, value, sub, icon: Icon, color, trend, onClick }: { label: string; value: any; sub?: string; icon: any; color: string; trend?: 'up' | 'down'; onClick?: () => void }) {
  // Har bir rang uchun: gradient, shadow, glow, pastel bg, border, icon bg
  const colorMap: any = {
    blue:    { grad: 'from-blue-500 to-blue-600',     shadow: 'shadow-blue-500/30',    glow: 'rgba(59,130,246,0.4)',   bg: 'bg-blue-50',    border: 'border-blue-200',    text: 'text-blue-600' },
    sky:     { grad: 'from-sky-500 to-sky-600',       shadow: 'shadow-sky-500/30',     glow: 'rgba(14,165,233,0.4)',   bg: 'bg-sky-50',     border: 'border-sky-200',     text: 'text-sky-600' },
    cyan:    { grad: 'from-cyan-500 to-cyan-600',     shadow: 'shadow-cyan-500/30',    glow: 'rgba(6,182,212,0.4)',    bg: 'bg-cyan-50',    border: 'border-cyan-200',    text: 'text-cyan-600' },
    amber:   { grad: 'from-amber-500 to-orange-600',  shadow: 'shadow-amber-500/30',   glow: 'rgba(245,158,11,0.4)',   bg: 'bg-amber-50',   border: 'border-amber-200',   text: 'text-amber-600' },
    rose:    { grad: 'from-rose-500 to-pink-600',     shadow: 'shadow-rose-500/30',    glow: 'rgba(244,63,94,0.4)',    bg: 'bg-rose-50',    border: 'border-rose-200',    text: 'text-rose-600' },
    violet:  { grad: 'from-violet-500 to-purple-600', shadow: 'shadow-violet-500/30',  glow: 'rgba(139,92,246,0.4)',   bg: 'bg-violet-50',  border: 'border-violet-200',  text: 'text-violet-600' },
    indigo:  { grad: 'from-indigo-500 to-indigo-600', shadow: 'shadow-indigo-500/30',  glow: 'rgba(99,102,241,0.4)',   bg: 'bg-indigo-50',  border: 'border-indigo-200',  text: 'text-indigo-600' },
  }
  const c = colorMap[color] || colorMap.blue
  const clickable = !!onClick
  return (
    <motion.div
      whileHover={clickable ? { y: -4, scale: 1.03 } : { y: -2 }}
      onClick={onClick}
      className={`relative overflow-hidden rounded-2xl border ${c.border} ${c.bg} p-4 shadow-md ${c.shadow} ${clickable ? 'cursor-pointer transition-all' : ''}`}
      style={{ boxShadow: `0 4px 20px -6px ${c.glow}` }}
    >
      {/* Yaltirab turuvchi nur effekti */}
      <div className="stat-card-shimmer" style={{ '--shimmer-color': c.glow } as any} />
      {/* Kontent */}
      <div className="relative z-10 flex items-start justify-between">
        <div className="min-w-0">
          <div className="text-xs text-muted-foreground font-medium">{label}</div>
          <div className={`text-xl lg:text-2xl font-bold mt-1 truncate ${c.text}`}>{value}</div>
          {sub && <div className="text-[10px] text-muted-foreground mt-0.5">{sub}</div>}
        </div>
        <div className={`shrink-0 w-9 h-9 rounded-xl bg-gradient-to-br ${c.grad} flex items-center justify-center shadow-lg ${c.shadow}`}>
          <Icon className="w-4 h-4 text-white" />
        </div>
      </div>
    </motion.div>
  )
}

