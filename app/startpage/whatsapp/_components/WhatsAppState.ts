export interface WhatsAppState {
  qrCode: string | undefined
  loading: boolean
  error: string | undefined
  sync: boolean
}

export type WhatsAppStateAction = | { type: 'SET_QR_CODE', qrCode: string }
  | { type: 'ERROR', error: string }
  | { type: 'AUTHENTICATED' }
  | { type: 'READY' }

export const initialWhatsAppState: WhatsAppState = {
  qrCode: undefined,
  loading: true,
  error: undefined,
  sync: false,
}

export function whatsAppStateReducer(state: WhatsAppState, action: WhatsAppStateAction): WhatsAppState {
  switch (action.type) {
    case 'SET_QR_CODE':
      return { ...state, qrCode: action.qrCode, loading: false }
    case 'ERROR':
      return { ...state, error: action.error }
    case 'AUTHENTICATED':
      return { ...state, qrCode: undefined, loading: true }
    case 'READY':
      return { ...state, loading: false }
  }
}
