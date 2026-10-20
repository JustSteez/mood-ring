import { type FormEvent, useEffect, useRef, useState } from 'react'
import type { Message } from '../hooks/useAgent'
import type { SkillId } from '../lib/agent/router'

const QUICK: { label: string; skill: SkillId }[] = [
  { label: 'How’s the market right now?', skill: 'market' },
  { label: 'What do I hold?', skill: 'portfolio' },
  { label: 'Did I make money since the last snapshot?', skill: 'pnl' },
  { label: 'Who’s leading today?', skill: 'leaders' },
  { label: 'What’s the mood been lately?', skill: 'history' },
  { label: 'Tell me about my pieces', skill: 'collection' },
  { label: 'Check my wallet', skill: 'wallet' },
]

interface Props {
  name: string
  messages: Message[]
  thinking: boolean
  onAsk: (question: string, forced?: { skill: SkillId }) => void
}

export function AgentChat({ name, messages, thinking, onAsk }: Props) {
  const [draft, setDraft] = useState('')
  const log = useRef<HTMLDivElement>(null)

  // Keep the newest message in view without scrolling the page itself.
  useEffect(() => {
    const el = log.current
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
  }, [messages.length, thinking])

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const q = draft.trim()
    if (!q || thinking) return
    onAsk(q)
    setDraft('')
  }

  return (
    <div className="chat panel">
      <div className="chat-log" ref={log} aria-live="polite">
        <div className="bubble agent">
          <p>
            Hi, I’m <b>{name}</b>. I read Robinhood Chain for you: live Chainlink prices, your stock tokens, your pieces
            and the market’s mood. I can’t move funds, ever.
          </p>
        </div>
        {messages.map((m) =>
          m.from === 'you' ? (
            <div key={m.id} className="bubble you">
              <p>{m.text}</p>
            </div>
          ) : (
            <div key={m.id} className="bubble agent">
              {m.answer?.lines.map((l) => <p key={l}>{l}</p>)}
              {m.answer?.rows && (
                <dl className="bubble-rows">
                  {m.answer.rows.map(([k, v]) => (
                    <div key={k}>
                      <dt>{k}</dt>
                      <dd className="mono">{v}</dd>
                    </div>
                  ))}
                </dl>
              )}
            </div>
          ),
        )}
        {thinking && (
          <div className="bubble agent typing" aria-label={`${name} is thinking`}>
            <i />
            <i />
            <i />
          </div>
        )}
      </div>

      <div className="chat-quick" role="list">
        {QUICK.map((q) => (
          <button key={q.skill} role="listitem" className="quick" disabled={thinking} onClick={() => onAsk(q.label, { skill: q.skill })}>
            {q.label}
          </button>
        ))}
      </div>

      <form className="chat-input" onSubmit={submit}>
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={`Ask ${name} about the market, your bag or a stock…`}
          maxLength={160}
          aria-label={`Ask ${name} a question`}
        />
        <button className="pill pill-lime" disabled={thinking} aria-label="Send">
          <span aria-hidden="true">→</span>
        </button>
      </form>
    </div>
  )
}
