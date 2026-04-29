export const MONTHLY_STATES = ['NEON', 'NEONCHECK', 'CREDITCARDCHECK', 'SHAREDCHECK', 'SHARED', 'FINISHED'] as const
export type MonthlyState = typeof MONTHLY_STATES[number]

export function nextState(state: MonthlyState): MonthlyState {
  switch (state) {
    case 'NEON':
      return 'NEONCHECK'
    case 'NEONCHECK':
      return 'CREDITCARDCHECK'
    case 'CREDITCARDCHECK':
      return 'SHAREDCHECK'
    case 'SHAREDCHECK':
      return 'SHARED'
    case 'SHARED':
      return 'FINISHED'
    default:
      throw new Error('Invalid monthly state')
  }
}
