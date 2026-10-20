import { describe, expect, test } from 'vitest'
import { dayLabel, moodOf, percent } from './mood'

describe('mood helpers (mirror the contract)', () => {
  test('mood thresholds', () => {
    expect(moodOf(200).name).toBe('EUPHORIC')
    expect(moodOf(30).name).toBe('BULLISH')
    expect(moodOf(0).name).toBe('FLAT')
    expect(moodOf(-30).name).toBe('BEARISH')
    expect(moodOf(-200).name).toBe('PANIC')
    expect(moodOf(500, true).name).toBe('GENESIS')
  })

  test('percent formatting', () => {
    expect(percent(142)).toBe('+1.42%')
    expect(percent(-8)).toBe('-0.08%')
    expect(percent(0)).toBe('+0.00%')
    expect(percent(-1250)).toBe('-12.50%')
  })

  test('day labels match the contract', () => {
    expect(dayLabel(0)).toBe('THU JAN 1 1970')
    expect(dayLabel(20746)).toBe('TUE OCT 20 2026')
    expect(dayLabel(19782)).toBe('THU FEB 29 2024')
  })
})
