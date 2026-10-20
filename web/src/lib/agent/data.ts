import { type Address, formatEther, formatUnits, parseAbiItem } from 'viem'
import { DEPLOYMENT } from '../../config/network'
import { MOOD_RING_DEPLOY_BLOCK, STOCKS } from '../../config/stocks'
import { erc20Abi, moodAgentsAbi, moodRingAbi } from '../abi'
import { publicClient } from '../client'
import type { DayMood, OwnedPiece, WalletData } from './skills'

const LOG_RANGE = 9_000_000n // public RPC caps eth_getLogs at 10M blocks
const HISTORY_DEPTH = 14
const MAX_NAME_LENGTH = 24 // MoodAgents.MAX_NAME_BYTES
const TRANSFER = parseAbiItem('event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)')

function ring(): Address {
  if (!DEPLOYMENT) throw new Error('Mood Ring is not deployed')
  return DEPLOYMENT.moodRing
}

/** ETH, nonce, gas price and the eight stock token balances of a wallet. */
export async function loadWallet(account: Address, tickers: string[]): Promise<WalletData> {
  const [balance, txCount, gasPrice, balances] = await Promise.all([
    publicClient.getBalance({ address: account }),
    publicClient.getTransactionCount({ address: account }),
    publicClient.getGasPrice(),
    publicClient.multicall({
      allowFailure: true,
      contracts: tickers.map((t) => ({
        address: STOCKS[t].token,
        abi: erc20Abi,
        functionName: 'balanceOf' as const,
        args: [account] as const,
      })),
    }),
  ])
  return {
    eth: Number(formatEther(balance)),
    txCount,
    gasGwei: Number(formatUnits(gasPrice, 9)),
    amounts: balances.map((b) => (b.status === 'success' ? Number(formatUnits(b.result, 18)) : 0)),
  }
}

/** Every token id ever sent to `account`, found from Transfer logs in RPC-sized chunks. */
async function receivedTokenIds(account: Address): Promise<bigint[]> {
  const latest = await publicClient.getBlockNumber()
  const ids = new Set<bigint>()
  for (let from = MOOD_RING_DEPLOY_BLOCK; from <= latest; from += LOG_RANGE) {
    const to = from + LOG_RANGE - 1n < latest ? from + LOG_RANGE - 1n : latest
    const logs = await publicClient.getLogs({
      address: ring(),
      event: TRANSFER,
      args: { to: account },
      fromBlock: from,
      toBlock: to,
    })
    for (const l of logs) if (l.args.tokenId !== undefined) ids.add(l.args.tokenId)
  }
  return [...ids]
}

/** Pieces `account` holds right now, with their snapshot details. */
export async function loadPieces(account: Address): Promise<OwnedPiece[]> {
  const candidates = await receivedTokenIds(account)
  if (candidates.length === 0) return []
  const address = ring()
  const lookups = await publicClient.multicall({
    allowFailure: true,
    contracts: candidates.flatMap((id) => [
      { address, abi: moodRingAbi, functionName: 'ownerOf' as const, args: [id] as const },
      { address, abi: moodRingAbi, functionName: 'snapshotOfToken' as const, args: [id] as const },
    ]),
  })
  const owned = candidates
    .map((id, i) => ({ id, owner: lookups[i * 2], number: lookups[i * 2 + 1] }))
    .filter((x) => x.owner.status === 'success' && (x.owner.result as Address).toLowerCase() === account.toLowerCase())
    .map((x) => ({ tokenId: Number(x.id), number: Number(x.number.result ?? 0n) }))

  const numbers = [...new Set(owned.map((o) => o.number))]
  const details = await snapshotDetails(numbers)
  return owned
    .map((o) => ({ ...o, ...details.get(o.number)! }))
    .sort((a, b) => b.number - a.number || b.tokenId - a.tokenId)
}

async function snapshotDetails(numbers: number[]) {
  const address = ring()
  const res = await publicClient.multicall({
    allowFailure: false,
    contracts: numbers.flatMap((n) => [
      { address, abi: moodRingAbi, functionName: 'getSnapshot' as const, args: [BigInt(n)] as const },
      { address, abi: moodRingAbi, functionName: 'moves' as const, args: [BigInt(n)] as const },
      { address, abi: moodRingAbi, functionName: 'mintedPerSnapshot' as const, args: [BigInt(n)] as const },
    ]),
  })
  const out = new Map<number, { day: number; avgBps: number; mintedOfSnapshot: number }>()
  numbers.forEach((n, i) => {
    const snap = res[i * 3] as { day: number }
    const moves = res[i * 3 + 1] as readonly [readonly bigint[], bigint]
    out.set(n, { day: Number(snap.day), avgBps: Number(moves[1]), mintedOfSnapshot: Number(res[i * 3 + 2]) })
  })
  return out
}

/** The most recent snapshots' moods, newest first. */
export async function loadHistory(snapshotCount: number): Promise<DayMood[]> {
  const numbers = Array.from({ length: Math.min(HISTORY_DEPTH, snapshotCount) }, (_, i) => snapshotCount - i)
  if (numbers.length === 0) return []
  const details = await snapshotDetails(numbers)
  return numbers.map((n) => ({ number: n, day: details.get(n)!.day, avgBps: details.get(n)!.avgBps }))
}

/** Agent names for the given pieces ("" where unnamed). Empty map until the registry is deployed. */
export async function loadNames(tokenIds: number[]): Promise<Map<number, string>> {
  const agents = DEPLOYMENT?.agents
  if (!agents || tokenIds.length === 0) return new Map()
  const names = await publicClient.readContract({
    address: agents,
    abi: moodAgentsAbi,
    functionName: 'namesOf',
    args: [tokenIds.map(BigInt)],
  })
  return new Map(tokenIds.map((id, i) => [id, names[i] ?? '']))
}

/** Same rule as MoodAgents.isValidName, so bad names are caught before the wallet opens. */
export function isValidAgentName(name: string): boolean {
  if (name.length === 0 || name.length > MAX_NAME_LENGTH) return false
  if (name.startsWith(' ') || name.endsWith(' ') || name.includes('  ')) return false
  return /^[A-Za-z0-9 ._-]+$/.test(name)
}
