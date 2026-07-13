'use client'

import { useEffect, useState } from 'react'

const MONTHS = ['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun', 'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr']
const WEEKDAYS = ['Yakshanba', 'Dushanba', 'Seshanba', 'Chorshanba', 'Payshanba', 'Juma', 'Shanba']

export function ForestClock() {
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const hh = String(now.getHours()).padStart(2, '0')
  const mm = String(now.getMinutes()).padStart(2, '0')
  const ss = String(now.getSeconds()).padStart(2, '0')
  const day = now.getDate()
  const month = MONTHS[now.getMonth()]
  const year = now.getFullYear()
  const weekday = WEEKDAYS[now.getDay()]

  return (
    <div className="flex items-center gap-3 px-3 py-1.5 rounded-xl bg-muted/50">
      <div className="flex items-baseline gap-0.5 font-mono font-bold text-foreground">
        <span className="text-2xl">{hh}</span>
        <span className="text-xl text-muted-foreground">:</span>
        <span className="text-2xl">{mm}</span>
        <span className="text-xl text-muted-foreground">:</span>
        <span className="text-lg text-muted-foreground">{ss}</span>
      </div>
      <div className="flex flex-col">
        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{weekday}</span>
        <span className="text-[10px] text-muted-foreground">{day} {month} {year}</span>
      </div>
    </div>
  )
}
