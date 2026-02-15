export type MonthlyState = 'NEON' | 'NEONCHECK' | 'CREDITCARDCHECK' | 'SHAREDCHECK' | 'SHARED' | 'FINISHED'

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
