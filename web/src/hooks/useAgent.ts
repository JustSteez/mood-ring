import { useCallback, useEffect, useRef, useState } from 'react'
import type { Address } from 'viem'
import { loadHistory, loadNames, loadPieces, loadWallet } from '../lib/agent/data'
import { route, type SkillId } from '../lib/agent/router'
import { answer, type Answer, type DayMood, type OwnedPiece, type WalletData } from '../lib/agent/skills'
import type { MoodState } from './useMood'

export interface Message {
  id: number
  from: 'you' | 'agent'
  text?: string
  answer?: Answer
}

const WALLET_TTL_MS = 20_000
const THINK_MS = 650 // a short pause so answers feel considered, not instant
const UNKNOWN: Answer = {
  lines: ['I only know what I can read on Robinhood Chain. Try one of the questions below, or name a stock.'],
}

let nextId = 1

/** Pieces, agent names and the conversation for the connected wallet. */
export function useAgent(account: Address | null, state: MoodState | null, refreshKey: number) {
  const [pieces, setPieces] = useState<OwnedPiece[] | null>(null)
  const [names, setNames] = useState<Map<number, string>>(new Map())
  const [selected, setSelected] = useState<number | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [thinking, setThinking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const walletCache = useRef<{ at: number; data: WalletData } | null>(null)
  const historyCache = useRef<DayMood[] | null>(null)

  const reloadNames = useCallback(async (ids: number[]) => {
    try {
      setNames(await loadNames(ids))
    } catch (e) {
      console.error('Failed to load agent names', e)
    }
  }, [])

  useEffect(() => {
    walletCache.current = null
    historyCache.current = null
    setMessages([])
    if (!account) {
      setPieces(null)
      return
    }
    let cancelled = false
    setError(null)
    loadPieces(account)
      .then(async (owned) => {
        if (cancelled) return
        setPieces(owned)
        setSelected((cur) => (cur && owned.some((p) => p.tokenId === cur) ? cur : (owned[0]?.tokenId ?? null)))
        await reloadNames(owned.map((p) => p.tokenId))
      })
      .catch((e) => {
        console.error('Failed to load pieces', e)
        if (!cancelled) setError('Could not read your pieces from Robinhood Chain. Try again in a moment.')
      })
    return () => {
      cancelled = true
    }
  }, [account, refreshKey, reloadNames])

  const agentName = (tokenId: number | null) =>
    (tokenId !== null && names.get(tokenId)) || (tokenId !== null ? `Agent #${tokenId}` : 'Agent')

  const ask = useCallback(
    async (question: string, forced?: { skill: SkillId; arg?: string }) => {
      if (!state || !account || thinking) return
      setMessages((m) => [...m, { id: nextId++, from: 'you', text: question }])
      setThinking(true)
      try {
        const r = forced ?? route(question, state.tickers)
        const out = r.skill === 'unknown' ? UNKNOWN : answer(r.skill, await contextFor(r.skill), r.arg)
        await new Promise((res) => window.setTimeout(res, THINK_MS))
        setMessages((m) => [...m, { id: nextId++, from: 'agent', answer: out }])
      } catch (e) {
        console.error('Agent failed to answer', e)
        setMessages((m) => [
          ...m,
          { id: nextId++, from: 'agent', answer: { lines: ['Robinhood Chain didn’t answer in time. Ask me again in a moment.'] } },
        ])
      } finally {
        setThinking(false)
      }

      async function contextFor(skill: SkillId) {
        const s = state!
        const needsWallet = ['portfolio', 'pnl', 'wallet', 'stock'].includes(skill)
        if (needsWallet && (!walletCache.current || Date.now() - walletCache.current.at > WALLET_TTL_MS)) {
          walletCache.current = { at: Date.now(), data: await loadWallet(account!, s.tickers) }
        }
        if (skill === 'history' && !historyCache.current) historyCache.current = await loadHistory(s.snapshotCount)
        return {
          agentName: agentName(selected),
          market: {
            tickers: s.tickers,
            prices: s.prices,
            bps: s.liveBps,
            avgBps: s.liveAvgBps,
            hasBaseline: s.snapshotCount > 0,
            genesis: s.snapshotCount === 0 || s.todayNumber === 1,
            snapshotCount: s.snapshotCount,
          },
          wallet: walletCache.current?.data,
          pieces: pieces ?? [],
          history: historyCache.current ?? [],
        }
      }
    },
    // agentName reads `names`/`selected`, both listed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state, account, thinking, pieces, names, selected],
  )

  return {
    pieces,
    names,
    selected,
    select: setSelected,
    agentName: agentName(selected),
    messages,
    thinking,
    error,
    ask,
    reloadNames: () => reloadNames((pieces ?? []).map((p) => p.tokenId)),
  }
}
