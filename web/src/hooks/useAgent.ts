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
const OFFLINE: Answer = { lines: ['Robinhood Chain didn’t answer in time. Ask me again in a moment.'] }

let nextId = 1

const displayName = (names: Map<number, string>, tokenId: number | null) =>
  tokenId === null ? 'Agent' : names.get(tokenId) || `Agent #${tokenId}`

/** Pieces, agent names and the conversation for the connected wallet. */
export function useAgent(account: Address | null, state: MoodState | null, refreshKey: number) {
  const [pieces, setPieces] = useState<OwnedPiece[] | null>(null)
  const [names, setNames] = useState<Map<number, string>>(new Map())
  const [selected, setSelected] = useState<number | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [thinking, setThinking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Bumped on every wallet switch; async work started under an older generation is dropped.
  const generation = useRef(0)
  const walletCache = useRef<{ account: Address; at: number; data: WalletData } | null>(null)
  const historyCache = useRef<DayMood[] | null>(null)

  // A different wallet is a different person: start from a clean slate.
  useEffect(() => {
    generation.current++
    walletCache.current = null
    setPieces(null)
    setNames(new Map())
    setSelected(null)
    setMessages([])
    setThinking(false)
    setError(null)
  }, [account])

  // (Re)load pieces and names; refreshKey bumps after mints keep the conversation.
  useEffect(() => {
    historyCache.current = null
    if (!account) return
    const gen = generation.current
    let cancelled = false
    const live = () => !cancelled && gen === generation.current
    ;(async () => {
      try {
        const owned = await loadPieces(account)
        if (!live()) return
        setPieces(owned)
        setError(null)
        setSelected((cur) => (cur !== null && owned.some((p) => p.tokenId === cur) ? cur : (owned[0]?.tokenId ?? null)))
        const loaded = await loadNames(owned.map((p) => p.tokenId))
        if (live()) setNames(loaded)
      } catch (e) {
        console.error('Failed to load pieces', e)
        if (live()) setError('Could not read your pieces from Robinhood Chain. Try again in a moment.')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [account, refreshKey])

  const ask = useCallback(
    async (question: string, forced?: { skill: SkillId; arg?: string }) => {
      if (!state || !account) return
      const gen = generation.current
      const agentName = displayName(names, selected)
      setMessages((m) => [...m, { id: nextId++, from: 'you', text: question }])
      setThinking(true)

      const contextFor = async (skill: SkillId) => {
        const needsWallet = ['portfolio', 'pnl', 'wallet', 'stock'].includes(skill)
        const cached = walletCache.current
        let wallet = cached?.account === account ? cached.data : undefined
        if (needsWallet && (!wallet || Date.now() - (cached?.at ?? 0) > WALLET_TTL_MS)) {
          wallet = await loadWallet(account, state.tickers)
          if (gen === generation.current) walletCache.current = { account, at: Date.now(), data: wallet }
        }
        if (skill === 'history' && !historyCache.current) historyCache.current = await loadHistory(state.snapshotCount)
        return {
          agentName,
          market: {
            tickers: state.tickers,
            prices: state.prices,
            bps: state.liveBps,
            avgBps: state.liveAvgBps,
            hasBaseline: state.snapshotCount > 0,
            genesis: state.snapshotCount === 0 || state.todayNumber === 1,
            snapshotCount: state.snapshotCount,
          },
          wallet,
          pieces: pieces ?? [],
          history: historyCache.current ?? [],
        }
      }

      let out: Answer
      try {
        const r = forced ?? route(question, state.tickers)
        out = r.skill === 'unknown' ? UNKNOWN : answer(r.skill, await contextFor(r.skill), r.arg)
        await new Promise((res) => window.setTimeout(res, THINK_MS))
      } catch (e) {
        console.error('Agent failed to answer', e)
        out = OFFLINE
      }
      if (gen !== generation.current) return // the wallet changed while we were thinking
      setMessages((m) => [...m, { id: nextId++, from: 'agent', answer: out }])
      setThinking(false)
    },
    [state, account, pieces, names, selected],
  )

  /** Show a just-confirmed name immediately, then re-read it from the chain. */
  const nameSaved = useCallback(
    (tokenId: number, name: string) => {
      setNames((m) => new Map(m).set(tokenId, name))
      const gen = generation.current
      const ids = (pieces ?? []).map((p) => p.tokenId)
      loadNames(ids)
        .then((loaded) => {
          // Keep the optimistic name if the RPC node we hit is a block behind.
          if (gen === generation.current && loaded.get(tokenId) === name) setNames(loaded)
        })
        .catch((e) => console.error('Failed to reload agent names', e))
    },
    [pieces],
  )

  return {
    pieces,
    names,
    selected,
    select: setSelected,
    agentName: displayName(names, selected),
    messages,
    thinking,
    error,
    ask,
    nameSaved,
  }
}
