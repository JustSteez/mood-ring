import { useCallback, useEffect, useState } from 'react'
import { DEPLOYMENT } from '../config/network'
import { moodRingAbi } from '../lib/abi'
import { publicClient } from '../lib/client'

export interface MoodState {
  day: number
  snapshotCount: number
  /** Today's snapshot number, or 0 if nobody has snapped yet today. */
  todayNumber: number
  /** Live art: today's snapshot if it exists, otherwise the live preview. */
  heroSvg: string
  liveAvgBps: number
  liveBps: number[]
  tickers: string[]
  /** Chain time minus device time (seconds). */
  clockOffset: number
}

const POLL_MS = 20_000

async function load(): Promise<MoodState> {
  if (!DEPLOYMENT) throw new Error('Not deployed')
  const address = DEPLOYMENT.moodRing
  const [day, count, tickers, [liveBps, liveAvg], block] = await Promise.all([
    publicClient.readContract({ address, abi: moodRingAbi, functionName: 'currentDay' }),
    publicClient.readContract({ address, abi: moodRingAbi, functionName: 'snapshotCount' }),
    publicClient.readContract({ address, abi: moodRingAbi, functionName: 'tickers' }),
    publicClient.readContract({ address, abi: moodRingAbi, functionName: 'liveMoves' }),
    publicClient.getBlock(),
  ])
  const todayNumber = Number(
    await publicClient.readContract({ address, abi: moodRingAbi, functionName: 'snapshotOfDay', args: [day] }),
  )
  const heroSvg = todayNumber
    ? await publicClient.readContract({ address, abi: moodRingAbi, functionName: 'svg', args: [BigInt(todayNumber)] })
    : await publicClient.readContract({ address, abi: moodRingAbi, functionName: 'previewSvg' })
  return {
    day: Number(day),
    snapshotCount: Number(count),
    todayNumber,
    heroSvg,
    liveAvgBps: Number(liveAvg),
    liveBps: liveBps.map(Number),
    tickers: [...tickers],
    clockOffset: Number(block.timestamp) - Date.now() / 1000,
  }
}

/** Today's state, refreshed every 20s while the tab is visible. */
export function useMood() {
  const [state, setState] = useState<MoodState | null>(null)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!DEPLOYMENT) return
    try {
      setState(await load())
      setError(null)
    } catch (e) {
      console.error('Failed to load Mood Ring', e)
      setError('Could not reach Robinhood Chain. Retrying…')
    }
  }, [])

  useEffect(() => {
    if (!DEPLOYMENT) return
    refresh()
    const id = window.setInterval(() => {
      if (document.visibilityState === 'visible') refresh()
    }, POLL_MS)
    return () => window.clearInterval(id)
  }, [refresh])

  return { state, error, refresh }
}
