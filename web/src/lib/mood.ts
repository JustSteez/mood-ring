/** Mirrors MoodArt.mood() so the UI can label moods without another contract call. */
export interface Mood {
  name: string
  bg: string
  fg: string
}

export function moodOf(avgBps: number, genesis = false): Mood {
  if (genesis) return { name: 'GENESIS', bg: '#5B2EFF', fg: '#FFFFFF' }
  if (avgBps >= 200) return { name: 'EUPHORIC', bg: '#D4FF3A', fg: '#0E0E10' }
  if (avgBps >= 30) return { name: 'BULLISH', bg: '#B8F5D2', fg: '#0E0E10' }
  if (avgBps > -30) return { name: 'FLAT', bg: '#5B2EFF', fg: '#FFFFFF' }
  if (avgBps > -200) return { name: 'BEARISH', bg: '#FF8A3D', fg: '#0E0E10' }
  return { name: 'PANIC', bg: '#FF3B30', fg: '#FFFFFF' }
}

/** Basis points as "+1.42%" (same format as the contract). */
export function percent(bps: number): string {
  const a = Math.abs(bps)
  return `${bps < 0 ? '-' : '+'}${Math.floor(a / 100)}.${String(a % 100).padStart(2, '0')}%`
}

/** "TUE OCT 20 2026" for a day number since the Unix epoch (UTC), like the contract. */
export function dayLabel(day: number): string {
  const d = new Date(day * 86_400_000)
  const wd = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'][d.getUTCDay()]
  const mn = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'][d.getUTCMonth()]
  return `${wd} ${mn} ${d.getUTCDate()} ${d.getUTCFullYear()}`
}

export function svgDataUrl(svg: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}
