import { type FormEvent, useEffect, useState } from 'react'
import { DEPLOYMENT } from '../config/network'
import type { useAgent } from '../hooks/useAgent'
import { svgOf } from '../hooks/useArchive'
import { isValidAgentName } from '../lib/agent/data'
import { dayLabel, moodOf, svgDataUrl } from '../lib/mood'
import { AgentChat } from './AgentChat'

interface Props {
  connected: boolean
  agent: ReturnType<typeof useAgent>
  busy: string | null
  todayLabel: string
  onConnect: () => void
  onMintToday: () => void
  onRename: (tokenId: number, name: string) => Promise<boolean>
}

function Locked({ title, body, action }: { title: string; body: string; action?: React.ReactNode }) {
  return (
    <div className="agent-locked panel" data-reveal>
      <div className="agent-orb" aria-hidden="true" />
      <h3>{title}</h3>
      <p>{body}</p>
      {action}
    </div>
  )
}

function Rename({ tokenId, current, busy, onRename }: { tokenId: number; current: string; busy: boolean; onRename: Props['onRename'] }) {
  const [draft, setDraft] = useState(current)
  useEffect(() => setDraft(current), [current, tokenId])
  const valid = isValidAgentName(draft)
  const changed = draft !== current

  if (!DEPLOYMENT?.agents) return <p className="kicker">Naming opens soon</p>

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (valid && changed) await onRename(tokenId, draft)
  }
  return (
    <form className="rename" onSubmit={submit}>
      <label className="kicker" htmlFor="agent-name">
        {current ? 'Rename your agent' : 'Name your agent'}
      </label>
      <div className="rename-row">
        <input id="agent-name" value={draft} maxLength={24} placeholder="e.g. Nova" onChange={(e) => setDraft(e.target.value)} />
        <button className="pill pill-ghost pill-sm" disabled={busy || !valid || !changed}>
          Save
        </button>
      </div>
      <small className={draft && !valid ? 'bad' : ''}>
        {draft && !valid ? 'Letters, numbers, spaces and - _ . only (max 24).' : 'Saved on-chain. Gas only. It stays with the piece.'}
      </small>
    </form>
  )
}

export function Agent({ connected, agent, busy, todayLabel, onConnect, onMintToday, onRename }: Props) {
  const piece = agent.pieces?.find((p) => p.tokenId === agent.selected) ?? null
  const [art, setArt] = useState<string | null>(null)

  useEffect(() => {
    if (!piece) return setArt(null)
    let live = true
    svgOf(piece.number)
      .then((s) => live && setArt(s))
      .catch((e) => console.error('Failed to load agent art', e))
    return () => {
      live = false
    }
  }, [piece?.number]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <section className="section" id="agent" aria-labelledby="agent-h">
      <div className="wrap">
        <div className="section-head" data-reveal>
          <span className="kicker">02 · Your agent</span>
          <h2 id="agent-h">
            Every piece wakes an <em>agent</em>.
          </h2>
          <p>
            Mint any day and you get a personal agent. Name it, then ask it about the market, your stock tokens and your
            collection. It reads Robinhood Chain live and can never touch your funds.
          </p>
        </div>

        {!connected ? (
          <Locked
            title="Connect to meet your agent"
            body="Your agent lives in your wallet’s pieces. Connect to see if you already have one."
            action={
              <button className="pill pill-lime pill-lg" onClick={onConnect}>
                Connect wallet <span aria-hidden="true">→</span>
              </button>
            }
          />
        ) : agent.error ? (
          <Locked title="Couldn’t reach your agent" body={agent.error} />
        ) : agent.pieces === null ? (
          <Locked title="Waking your agent…" body="Reading your pieces from Robinhood Chain." />
        ) : agent.pieces.length === 0 ? (
          <Locked
            title="No agent yet"
            body="Mint any piece, free, and your agent wakes up right here."
            action={
              <button className="pill pill-lime pill-lg" disabled={Boolean(busy)} onClick={onMintToday}>
                {busy ? `${busy}…` : todayLabel} <span aria-hidden="true">→</span>
              </button>
            }
          />
        ) : (
          <div className="agent-grid">
            <aside className="agent-card panel" data-reveal>
              <div className="agent-avatar" style={{ '--mood': piece ? moodOf(piece.avgBps, piece.number === 1).bg : undefined } as React.CSSProperties}>
                {art && <img src={svgDataUrl(art)} alt="" width={1000} height={1000} />}
              </div>
              <span className="kicker live">
                <span className="pulse" /> Online
              </span>
              <h3>{agent.agentName}</h3>
              {piece && (
                <p className="kicker">
                  Agent of piece #{piece.number} · {dayLabel(piece.day)}
                </p>
              )}
              {agent.pieces.length > 1 && (
                <div className="agent-switch" role="tablist" aria-label="Your agents">
                  {agent.pieces.map((p) => (
                    <button
                      key={p.tokenId}
                      role="tab"
                      aria-selected={p.tokenId === agent.selected}
                      className={p.tokenId === agent.selected ? 'on' : ''}
                      onClick={() => agent.select(p.tokenId)}
                    >
                      {agent.names.get(p.tokenId) || `#${p.tokenId}`}
                    </button>
                  ))}
                </div>
              )}
              {agent.selected !== null && (
                <Rename tokenId={agent.selected} current={agent.names.get(agent.selected) ?? ''} busy={Boolean(busy)} onRename={onRename} />
              )}
            </aside>
            <div data-reveal style={{ '--delay': '120ms' } as React.CSSProperties}>
              <AgentChat name={agent.agentName} messages={agent.messages} thinking={agent.thinking} onAsk={agent.ask} />
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
