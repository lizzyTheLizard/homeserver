import { describe, expect, test } from 'vitest'
import { transactional, nontransactional } from '@/app/shared/_external/db/access'
import { findRecentEvents, logEvent } from './Event'

describe('logEvent', () => {
  test('writes an event that findRecentEvents returns', async () => {
    await transactional(tx => logEvent(tx, 'INFO', 'test event'))

    const events = await nontransactional(c => findRecentEvents(c))

    expect(events.some(e => e.message === 'test event' && e.level === 'INFO')).toBe(true)
  })
})

describe('findRecentEvents', () => {
  test('returns events ordered newest first', async () => {
    await transactional(tx => logEvent(tx, 'INFO', 'first'))
    await transactional(tx => logEvent(tx, 'ERROR', 'second'))

    const events = await nontransactional(c => findRecentEvents(c))
    const relevant = events.filter(e => e.message === 'first' || e.message === 'second')

    expect(relevant[0].message).toBe('second')
    expect(relevant[1].message).toBe('first')
  })
})
