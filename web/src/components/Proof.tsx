import { explorerAddress } from '../config/network'
import { STOCKS } from '../config/stocks'
import { shortAddress } from '../lib/format'
import { CountUp } from './CountUp'

function Addr({ address }: { address: string }) {
  const href = explorerAddress(address)
  return href ? (
    <a className="mono addr" href={href} target="_blank" rel="noreferrer">
      {shortAddress(address)} <span aria-hidden="true">↗</span>
    </a>
  ) : (
    <span className="mono addr">{shortAddress(address)}</span>
  )
}

const FAQ = [
  [
    'Does it cost anything?',
    'No. Minting is free and so is snapping. You only pay Robinhood Chain gas, which is a fraction of a cent.',
  ],
  [
    'Who can take the snapshot?',
    'Anyone, once per UTC day. Whoever snaps first freezes that day’s prices. Snap and mint happen in one transaction from the button at the top.',
  ],
  [
    'What happens on a day nobody snaps?',
    'That day simply has no piece. The next snapshot measures every move since the last one, so nothing is lost.',
  ],
  [
    'Where is the art stored?',
    'Nowhere but the chain. The contract draws each SVG from the stored prices every time it is asked, with no IPFS and no server.',
  ],
  [
    'What if a price feed goes down?',
    'The contract reuses that stock’s last known price, so a snapshot can never get stuck.',
  ],
  [
    'Is this made by Robinhood or Chainlink?',
    'No. Mood Ring is independent. It reads public Chainlink feeds on Robinhood Chain.',
  ],
]

export function Proof({ snapshots, minted }: { snapshots: number; minted: number }) {
  return (
    <>
      <section className="section" id="proof" aria-labelledby="proof-h">
        <div className="wrap">
          <div className="section-head" data-reveal>
            <span className="kicker">04 · Proof, not promises</span>
            <h2 id="proof-h">
              Don’t trust us. <em>Verify</em> it.
            </h2>
            <p>Everything below is live on Robinhood Chain. Every price feed links to the block explorer.</p>
          </div>

          <div className="proof-grid">
            <article className="panel" data-reveal>
              <span className="kicker">The contracts</span>
              <h3>Nobody can change it. Not even us.</h3>
              <p>There is no owner, no admin switch, no fee and no upgrade path. It reads prices, stores them and draws.</p>
              <dl className="kv">
                <div>
                  <dt>Owner / admin</dt>
                  <dd>None</dd>
                </div>
                <div>
                  <dt>Accepts payment</dt>
                  <dd>Never</dd>
                </div>
              </dl>
            </article>

            <article className="panel" data-reveal style={{ '--delay': '110ms' } as React.CSSProperties}>
              <span className="kicker">The prices</span>
              <h3>Eight Chainlink feeds.</h3>
              <p>Fixed at deploy. The contract reads them directly, so the art can’t be fed made-up numbers.</p>
              <dl className="kv feeds">
                {Object.entries(STOCKS).map(([t, s]) => (
                  <div key={t}>
                    <dt className="mono">{t}</dt>
                    <dd>
                      <Addr address={s.feed} />
                    </dd>
                  </div>
                ))}
              </dl>
            </article>

            <article className="panel proof-live" data-reveal style={{ '--delay': '220ms' } as React.CSSProperties}>
              <span className="kicker">Live counts</span>
              <div className="big">
                <div>
                  <b>
                    <CountUp value={snapshots} />
                  </b>
                  <span className="kicker">Snapshots</span>
                </div>
                <div>
                  <b>
                    <CountUp value={minted} />
                  </b>
                  <span className="kicker">Minted</span>
                </div>
                <div>
                  <b>0</b>
                  <span className="kicker">Fees</span>
                </div>
              </div>
              <p>Read from the chain every 20 seconds.</p>
            </article>
          </div>
        </div>
      </section>

      <section className="section" id="faq" aria-labelledby="faq-h">
        <div className="wrap faq-wrap">
          <div className="section-head" data-reveal>
            <span className="kicker">FAQ</span>
            <h2 id="faq-h">
              Questions, answered <em>plainly</em>.
            </h2>
          </div>
          <div className="faq" data-reveal>
            {FAQ.map(([q, a]) => (
              <details key={q}>
                <summary>
                  {q}
                  <span className="plus" aria-hidden="true" />
                </summary>
                <p>{a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}
