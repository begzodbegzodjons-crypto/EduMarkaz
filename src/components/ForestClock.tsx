'use client'

import { useEffect, useState } from 'react'

// =====================================================================
//  ForestClock — chiroyli animatsiyali soat
//  - Real-time soat (soat:daqiqa:soniya)
//  - Sana (kun, oy, yil, hafta kuni)
//  - O'rmon foni: archalar, quyosh, bulutlar
//  - Kiyik bolasi yugurish animatsiyasi
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
    <div className="forest-clock-container">
      {/* === O'rmon foni === */}
      <div className="forest-scene">
        {/* Quyosh */}
        <div className="forest-sun" />

        {/* Bulutlar */}
        <div className="forest-cloud forest-cloud-1" />
        <div className="forest-cloud forest-cloud-2" />
        <div className="forest-cloud forest-cloud-3" />

        {/* Tog'lar (uzoqda) */}
        <svg className="forest-mountains" viewBox="0 0 400 60" preserveAspectRatio="none">
          <path d="M0,60 L60,20 L100,40 L160,15 L220,35 L280,10 L340,30 L400,20 L400,60 Z" fill="rgba(16,185,129,0.25)" />
          <path d="M0,60 L40,35 L90,25 L150,40 L210,20 L270,35 L330,25 L400,40 L400,60 Z" fill="rgba(16,185,129,0.4)" />
        </svg>

        {/* Daraxtlar (archalar) - uzoq qator */}
        <div className="forest-trees-far">
          {[...Array(12)].map((_, i) => (
            <div key={i} className="forest-tree-small" style={{ left: `${i * 8.5}%`, animationDelay: `${i * 0.3}s` }}>
              <div className="tree-top" />
              <div className="tree-trunk" />
            </div>
          ))}
        </div>

        {/* Daraxtlar - yaqin qator */}
        <div className="forest-trees-near">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="forest-tree-big" style={{ left: `${i * 13 + 2}%`, animationDelay: `${i * 0.5}s` }}>
              <div className="tree-top-big" />
              <div className="tree-trunk-big" />
            </div>
          ))}
        </div>

        {/* O'tlar (yer) */}
        <div className="forest-ground" />

        {/* Kiyik bolasi - yugurayotgan */}
        <div className="forest-deer">
          <svg viewBox="0 0 80 60" className="deer-svg">
            {/* Tanasi */}
            <ellipse cx="40" cy="32" rx="18" ry="10" fill="#92400e" />
            {/* Boshi */}
            <circle cx="58" cy="24" r="7" fill="#92400e" />
            {/* Bo'yni */}
            <path d="M50,28 Q56,24 58,24" stroke="#92400e" strokeWidth="4" fill="none" />
            {/* Shoxlari (kichik, bola uchun) */}
            <path d="M58,18 L56,12 M60,18 L62,12" stroke="#5b3010" strokeWidth="1.5" fill="none" />
            {/* Qulog'i */}
            <ellipse cx="55" cy="18" rx="2" ry="4" fill="#92400e" />
            {/* Ko'zi */}
            <circle cx="60" cy="23" r="1" fill="#1f2937" />
            {/* Oyoqlari (yugurish animatsiyasi) */}
            <g className="deer-legs">
              <line x1="28" y1="40" x2="26" y2="52" stroke="#92400e" strokeWidth="2.5" className="leg-1" />
              <line x1="34" y1="40" x2="36" y2="52" stroke="#92400e" strokeWidth="2.5" className="leg-2" />
              <line x1="44" y1="40" x2="42" y2="52" stroke="#92400e" strokeWidth="2.5" className="leg-3" />
              <line x1="50" y1="40" x2="52" y2="52" stroke="#92400e" strokeWidth="2.5" className="leg-4" />
            </g>
            {/* Dumi */}
            <ellipse cx="22" cy="30" rx="3" ry="2" fill="#92400e" className="deer-tail" />
            {/* Oq dog'lar (bolaga xos) */}
            <circle cx="35" cy="30" r="1.5" fill="#fef3c7" opacity="0.7" />
            <circle cx="42" cy="33" r="1.5" fill="#fef3c7" opacity="0.7" />
            <circle cx="38" cy="36" r="1.2" fill="#fef3c7" opacity="0.7" />
          </svg>
        </div>

        {/* Yugurish izlari (chang) */}
        <div className="forest-dust">
          <div className="dust-particle" style={{ animationDelay: '0s' }} />
          <div className="dust-particle" style={{ animationDelay: '0.5s' }} />
          <div className="dust-particle" style={{ animationDelay: '1s' }} />
        </div>
      </div>

      {/* === Soat va sana (yuqorida, yarim shaffof) === */}
      <div className="clock-overlay">
        <div className="clock-time">
          <span className="digit">{hh}</span>
          <span className="colon">:</span>
          <span className="digit">{mm}</span>
          <span className="colon">:</span>
          <span className="digit second">{ss}</span>
        </div>
        <div className="clock-date">
          <span className="weekday">{weekday}</span>
          <span className="separator">•</span>
          <span className="date">{day} {month} {year}</span>
        </div>
      </div>
    </div>
  )
}
