import { Logo } from './components/Logo'
import { useCallback, useState } from 'react'
import { Archive } from './components/Archive'
import { Hero } from './components/Hero'
import { HowItWorks } from './components/HowItWorks'
import { Movers } from './components/Movers'
import { Nav } from './components/Nav'
import { PreLaunch } from './components/PreLaunch'
import { Toasts } from './components/Toasts'
import { openWalletMenu } from './components/WalletMenu'
import { DEPLOYMENT, explorerAddress, IS_PRELAUNCH } from './config/network'
import { useArchive } from './hooks/useArchive'
import { useMood } from './hooks/useMood'
import { useNow } from './hooks/useNow'
import { useTx } from './hooks/useTx'
import { useWallet } from './hooks/useWallet'
import { moodRingAbi } from './lib/abi'
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

  return (
    <div className="page" style={{ '--accent': accent } as React.CSSProperties}>
      <Nav wallet={wallet} showWallet={!IS_PRELAUNCH} />
      {IS_PRELAUNCH ? (
        <PreLaunch />
      ) : state ? (
        <>
          <Hero
            state={state}
            now={now}
            busy={tx.busy}
            onSnapMint={() => send('snapAndMint', [], 'Snapping today')}
            onMint={(n) => send('mint', [BigInt(n)], `Minting #${n}`)}
          />
          <Movers tickers={state.tickers} bps={state.liveBps} hasBaseline={state.snapshotCount > 0} />
        </>
      ) : (
        <div className="loading">{error ?? 'Reading the market…'}</div>
      )}

      <HowItWorks />

      {!IS_PRELAUNCH && state && (
        <Archive
          pieces={archive.pieces}
          total={state.snapshotCount}
          loading={archive.loading}
          busy={tx.busy}
          onMint={(n) => send('mint', [BigInt(n)], `Minting #${n}`)}
          onMore={() => setPages((p) => p + 1)}
        />
      )}

      <footer className="footer">
        <div className="container">
          <div className="footer-row">
            <a href="#top" className="footer-brand">
              <Logo />
              Mood Ring
            </a>
            <span className="footer-tag">The market, painted once a day.</span>
            {DEPLOYMENT && explorerAddress(DEPLOYMENT.moodRing) && (
              <a className="footer-link" href={explorerAddress(DEPLOYMENT.moodRing)!} target="_blank" rel="noreferrer">
                <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
                  <path d="M6 3H3v10h10v-3M9 3h4v4M13 3 7 9" fill="none" stroke="currentColor" strokeWidth="1.5" />
                </svg>
                View contract
              </a>
            )}
          </div>
          <p className="footer-note">
            Prices from Chainlink on Robinhood Chain. Art stored fully on-chain. Not affiliated with Robinhood or
            Chainlink. Not financial advice.
          </p>
        </div>
      </footer>
      <Toasts toasts={tx.toasts} onDismiss={tx.dismiss} />
    </div>
  )
}
