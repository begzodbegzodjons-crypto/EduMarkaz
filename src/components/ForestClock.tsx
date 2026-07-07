'use client'

import { useEffect, useState } from 'react'

// =====================================================================
//  ModernClock — zamonaviy soat + aylanuvchi globus
//  - Chiroyli raqamlar (soat:daqiqa:sekund)
//  - Sana (oy, kun, yil, hafta kuni)
//  - 3D globus aylanish animatsiyasi (meridianlar, qit'alar, graduslar)
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
    <div className="modern-clock-container">
      {/* === Globus (o'ng tomonda) === */}
      <div className="globe-wrapper">
        <div className="globe">
          {/* Globus sferasi */}
          <div className="globe-sphere" />
          {/* Meridianlar (vertikal chiziqlar) */}
          <div className="globe-meridians">
            <div className="meridian m1" />
            <div className="meridian m2" />
            <div className="meridian m3" />
            <div className="meridian m4" />
            <div className="meridian m5" />
          </div>
          {/* Parallellar (gorizontal chiziqlar) */}
          <div className="globe-parallels">
            <div className="parallel p1" />
            <div className="parallel p2" />
            <div className="parallel p3" />
            <div className="parallel p4" />
            <div className="parallel p5" />
          </div>
          {/* Qit'alar (soddalashtirilgan) */}
          <div className="continents">
            <div className="continent c1" />
            <div className="continent c2" />
            <div className="continent c3" />
            <div className="continent c4" />
          </div>
          {/* Ekvator chizig'i */}
          <div className="equator" />
          {/* Yorug'lik refleksi */}
          <div className="globe-shine" />
        </div>
        {/* Globus orbitasi (halqa) */}
        <div className="globe-orbit" />
      </div>

      {/* === Soat va sana (chap tomonda) === */}
      <div className="clock-section">
        <div className="modern-time">
          <span className="time-digit">{hh}</span>
          <span className="time-colon">:</span>
          <span className="time-digit">{mm}</span>
          <span className="time-colon">:</span>
          <span className="time-digit time-second">{ss}</span>
        </div>
        <div className="modern-date">
          <span className="modern-weekday">{weekday}</span>
          <span className="date-separator">•</span>
          <span className="modern-dmy">{day} {month} {year}</span>
        </div>
      </div>
    </div>
  )
}
