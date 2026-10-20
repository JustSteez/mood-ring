import { useCallback, useState } from 'react'
import { Agent } from './components/Agent'
import { Archive } from './components/Archive'
import { Footer } from './components/Footer'
import { Hero } from './components/Hero'
import { HowItWorks } from './components/HowItWorks'
import { Movers } from './components/Movers'
import { Nav } from './components/Nav'
import { PreLaunch } from './components/PreLaunch'
import { Proof } from './components/Proof'
import { Scene } from './components/Scene'
import { Toasts } from './components/Toasts'
import { openWalletMenu } from './components/WalletMenu'
import { DEPLOYMENT, IS_PRELAUNCH } from './config/network'
import { useAgent } from './hooks/useAgent'
import { useArchive } from './hooks/useArchive'
import { useMood } from './hooks/useMood'
import { useNow } from './hooks/useNow'
import { useReveal } from './hooks/useReveal'
import { useTx } from './hooks/useTx'
import { useWallet } from './hooks/useWallet'
import { moodAgentsAbi, moodRingAbi } from './lib/abi'
import { moodOf } from './lib/mood'

const noTicker = () => ''

export default function App() {
  const wallet = useWallet()
  const { state, error, refresh } = useMood()
  const [pages, setPages] = useState(1)
  const [archiveKey, setArchiveKey] = useState(0)
  const archive = useArchive(state?.snapshotCount ?? 0, pages, archiveKey)
  const wallNow = useNow()
  const now = wallNow + (state && Math.abs(state.clockOffset) > 2 ? state.clockOffset : 0)
  const tx = useTx(wallet.account, noTicker)
  const agent = useAgent(wallet.account, state, archiveKey)
  useReveal(`${Boolean(state)}-${archive.pieces.length}-${agent.pieces?.length ?? -1}-${Boolean(wallet.account)}`)

  const send = useCallback(
    async (functionName: 'snapAndMint' | 'mint', args: readonly unknown[], label: string) => {
      if (!DEPLOYMENT) return
      if (!wallet.account) {
        openWalletMenu()
        return
      }
      const ok = await tx.send({ address: DEPLOYMENT.moodRing, abi: moodRingAbi, functionName, args, label })
      if (ok) {
        await refresh()
        setArchiveKey((k) => k + 1)
      }
    },
    [wallet.account, tx, refresh],
  )

  const accent = state ? moodOf(state.liveAvgBps, state.snapshotCount === 0 || state.todayNumber === 1).bg : '#5B2EFF'
  const snapMint = () => send('snapAndMint', [], 'Snapping today')
  const mint = (n: number) => send('mint', [BigInt(n)], `Minting #${n}`)
  const snapped = Boolean(state && state.todayNumber > 0)
  const mintToday = () => (snapped && state ? mint(state.todayNumber) : snapMint())

  const rename = async (tokenId: number, name: string) => {
    if (!DEPLOYMENT?.agents) return false
    const ok = await tx.send({
      address: DEPLOYMENT.agents,
      abi: moodAgentsAbi,
      functionName: 'setName',
      args: [BigInt(tokenId), name],
      label: 'Naming your agent',
    })
    if (ok) agent.nameSaved(tokenId, name)
    return ok
  }

  return (
    <div className="page" style={{ '--accent': accent } as React.CSSProperties}>
      <Scene color={accent} />
      <div className="vignette" aria-hidden="true" />
      <Nav wallet={wallet} showWallet={!IS_PRELAUNCH} />
      <main>
        {IS_PRELAUNCH ? (
          <PreLaunch />
        ) : state ? (
          <>
            <Hero state={state} now={now} busy={tx.busy} onSnapMint={snapMint} onMint={mint} />
            <Movers state={state} />
            <Agent
              connected={Boolean(wallet.account)}
              agent={agent}
              busy={tx.busy}
              todayLabel={snapped ? `Mint today’s #${state.todayNumber}` : 'Snap today and mint'}
              onConnect={openWalletMenu}
              onMintToday={mintToday}
              onRename={rename}
            />
          </>
        ) : (
          <div className="loading kicker">{error ?? 'Reading the market…'}</div>
        )}

        <HowItWorks />

        {!IS_PRELAUNCH && state && (
          <>
            <Archive
              pieces={archive.pieces}
              total={state.snapshotCount}
              loading={archive.loading}
              busy={tx.busy}
              onMint={mint}
              onMore={() => setPages((p) => p + 1)}
            />
            <Proof snapshots={state.snapshotCount} minted={state.totalMinted} />
            <section className="final" aria-labelledby="final-h">
              <h2 id="final-h" data-reveal>
                Own a piece of <em>today</em>.
              </h2>
              <p data-reveal>One transaction. Free forever. Painted by the market.</p>
              <div data-reveal>
                <button
                  className="pill pill-lime pill-lg"
                  disabled={Boolean(tx.busy)}
                  onClick={mintToday}
                >
                  {tx.busy ? `${tx.busy}…` : snapped ? `Mint today’s #${state.todayNumber}` : 'Snap today and mint'}{' '}
                  <span aria-hidden="true">→</span>
                </button>
              </div>
            </section>
          </>
        )}
      </main>
      <Footer />
      <Toasts toasts={tx.toasts} onDismiss={tx.dismiss} />
    </div>
  )
}
