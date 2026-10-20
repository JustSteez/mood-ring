// Copies the Foundry deployment output into the web app so the site knows the contract address.
import { copyFileSync, existsSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const src = resolve(here, '../../contracts/deployments/mainnet.json')
const dst = resolve(here, '../src/config/deployments/mainnet.json')
if (existsSync(src)) {
  copyFileSync(src, dst)
  console.log('synced mainnet.json')
} else if (!existsSync(dst)) {
  writeFileSync(dst, 'null\n')
  console.log('no mainnet deployment yet (wrote null)')
}
