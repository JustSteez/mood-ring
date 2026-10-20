import { type Address, type Chain, defineChain } from 'viem'
import { robinhood } from 'viem/chains'
import mainnetDeployment from './deployments/mainnet.json'

export interface Deployment {
  chainId: number
  moodRing: Address
  renderer: Address
}

export type NetworkName = 'mainnet' | 'local'

// Local anvil fork addresses (gitignored); absent in production builds.
const localFiles = import.meta.glob<{ default: unknown }>('./deployments/local.json', { eager: true })
const localDeployment = (Object.values(localFiles)[0]?.default ?? null) as Deployment | null

const localChain = defineChain({
  ...robinhood,
  name: 'Local mainnet fork',
  rpcUrls: { default: { http: [import.meta.env.VITE_RPC_URL ?? 'http://127.0.0.1:8548'] } },
})

const NETWORKS: Record<NetworkName, { chain: Chain; deployment: Deployment | null; explorer: string }> = {
  mainnet: {
    chain: robinhood,
    deployment: mainnetDeployment as Deployment | null,
    explorer: 'https://robinhoodchain.blockscout.com',
  },
  local: { chain: localChain, deployment: localDeployment, explorer: '' },
}

export const NETWORK_NAME = (import.meta.env.VITE_NETWORK ?? 'mainnet') as NetworkName
export const NETWORK = NETWORKS[NETWORK_NAME] ?? NETWORKS.mainnet
export const CHAIN = NETWORK.chain
export const DEPLOYMENT = NETWORK.deployment
/** Contract not deployed yet: the site shows its launch state. */
export const IS_PRELAUNCH = !DEPLOYMENT

export function explorerTx(hash: string): string | null {
  return NETWORK.explorer ? `${NETWORK.explorer}/tx/${hash}` : null
}

export function explorerAddress(address: string): string | null {
  return NETWORK.explorer ? `${NETWORK.explorer}/address/${address}` : null
}
