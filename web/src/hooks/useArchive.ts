import { useEffect, useState } from 'react'
import { DEPLOYMENT } from '../config/network'
import { moodRingAbi } from '../lib/abi'
import { publicClient } from '../lib/client'

export interface Piece {
  number: number
  day: number
  avgBps: number
  minted: number
  svg: string
}

export const PAGE_SIZE = 12

// Snapshot art never changes once recorded, so cache it for the session.
const svgCache = new Map<number, string>()

/** A snapshot's artwork, cached for the session. */
export async function svgOf(number: number): Promise<string> {
  if (!DEPLOYMENT) throw new Error('Not deployed')
  const cached = svgCache.get(number)
  if (cached) return cached
  const svg = await publicClient.readContract({
    address: DEPLOYMENT.moodRing,
    abi: moodRingAbi,
    functionName: 'svg',
    args: [BigInt(number)],
  })
  svgCache.set(number, svg)
  return svg
}

async function loadPiece(number: number): Promise<Piece> {
  if (!DEPLOYMENT) throw new Error('Not deployed')
  const address = DEPLOYMENT.moodRing
  const n = BigInt(number)
  const [snap, [, avg], minted, svg] = await Promise.all([
    publicClient.readContract({ address, abi: moodRingAbi, functionName: 'getSnapshot', args: [n] }),
    publicClient.readContract({ address, abi: moodRingAbi, functionName: 'moves', args: [n] }),
    publicClient.readContract({ address, abi: moodRingAbi, functionName: 'mintedPerSnapshot', args: [n] }),
    svgCache.has(number)
      ? Promise.resolve(svgCache.get(number)!)
      : publicClient.readContract({ address, abi: moodRingAbi, functionName: 'svg', args: [n] }),
  ])
  svgCache.set(number, svg)
  return { number, day: Number(snap.day), avgBps: Number(avg), minted: Number(minted), svg }
}

/** Snapshots newest-first, `pages` pages deep. Reloads when the count or `refreshKey` changes. */
export function useArchive(snapshotCount: number, pages: number, refreshKey: number) {
  const [pieces, setPieces] = useState<Piece[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!DEPLOYMENT || snapshotCount === 0) return
    let cancelled = false
    const want = Math.min(snapshotCount, pages * PAGE_SIZE)
    const numbers = Array.from({ length: want }, (_, i) => snapshotCount - i)
    setLoading(true)
    // Two at a time keeps us well under the public RPC's rate limit.
    ;(async () => {
      const out: Piece[] = []
      for (let i = 0; i < numbers.length; i += 2) {
        const batch = await Promise.all(numbers.slice(i, i + 2).map(loadPiece))
        out.push(...batch)
        if (cancelled) return
        setPieces([...out])
      }
    })()
      .catch((e) => console.error('Failed to load archive', e))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [snapshotCount, pages, refreshKey])

  return { pieces, loading }
}
