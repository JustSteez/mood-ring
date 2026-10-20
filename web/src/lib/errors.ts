import { BaseError, ContractFunctionRevertedError, UserRejectedRequestError } from 'viem'

/** Turn a viem/contract error into one short sentence a person can act on. */
export function friendlyError(error: unknown, _unused?: unknown): string {
  if (!(error instanceof BaseError)) return error instanceof Error ? error.message : 'Something went wrong.'
  if (error.walk((e) => e instanceof UserRejectedRequestError)) return 'You cancelled the transaction.'
  const revert = error.walk((e) => e instanceof ContractFunctionRevertedError)
  if (revert instanceof ContractFunctionRevertedError && revert.data) {
    switch (revert.data.errorName) {
      case 'AlreadySnappedToday':
        return 'Someone already snapped today. You can still mint it.'
      case 'NoSuchSnapshot':
        return 'That snapshot does not exist yet.'
      default:
        return `Transaction reverted (${revert.data.errorName}).`
    }
  }
  if (/insufficient funds/i.test(error.message)) return 'Not enough ETH on Robinhood Chain for gas.'
  return error.shortMessage || 'Something went wrong.'
}
