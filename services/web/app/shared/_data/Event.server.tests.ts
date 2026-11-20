import { describe, expect, test } from 'vitest'
import { findRecentEvents, logEvent } from './Event'
import { nontransactional, transactional } from '@/app/shared/_external/db/access'

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
    await new Promise(resolve => setTimeout(resolve, 100)) // Ensure different timestamps
    await transactional(tx => logEvent(tx, 'ERROR', 'second'))

    const events = await nontransactional(c => findRecentEvents(c)),
     relevant = events.filter(e => e.message === 'first' || e.message === 'second')

    expect(relevant[0].message).toBe('second')
    expect(relevant[1].message).toBe('first')
  })
})
