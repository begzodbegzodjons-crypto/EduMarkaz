'use client'

import { useEffect, useState } from 'react'

// =====================================================================
//  LCD Clock — rasmga o'xshash LCD/segmentli ko'k raqamli soat
//  - Katta ko'k segmentli raqamlar (soat:daqiqa:soniya)
//  - Yashil LCD fon
//  - Sana (hafta kuni, kun-oy-yil)
//  - Minimalistik, retro elektron soat uslubi
// =====================================================================

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
    <div className="lcd-clock-container">
      {/* LCD "off" segmentlar (yorug' bo'lmagan, lekin ko'rinadigan) */}
      <div className="lcd-segments-bg" aria-hidden="true">
        <span className="seg-bg">88:88:88</span>
      </div>

      {/* Asosiy soat (ko'k segmentli raqamlar) */}
      <div className="lcd-time">
        <span className="lcd-digit">{hh}</span>
        <span className="lcd-colon">:</span>
        <span className="lcd-digit">{mm}</span>
        <span className="lcd-colon">:</span>
        <span className="lcd-digit lcd-second">{ss}</span>
      </div>

      {/* Sana pastda */}
      <div className="lcd-date">
        <span className="lcd-weekday">{weekday}</span>
        <span className="lcd-separator">•</span>
        <span className="lcd-dmy">{day} {month} {year}</span>
      </div>
    </div>
  )
}
