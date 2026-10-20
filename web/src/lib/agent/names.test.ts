import { describe, expect, it } from 'vitest'
import { isValidAgentName } from './data'

describe('isValidAgentName (mirrors MoodAgents.isValidName)', () => {
  it.each(['Nova', 'Agent_007 Mk-2.0', 'a', 'abcdefghijklmnopqrstuvwx'])('accepts %s', (n) => {
    expect(isValidAgentName(n)).toBe(true)
  })
  it.each(['', 'abcdefghijklmnopqrstuvwxy', ' Nova', 'Nova ', 'No  va', '<script>', 'Növa'])('rejects "%s"', (n) => {
    expect(isValidAgentName(n)).toBe(false)
  })
})
