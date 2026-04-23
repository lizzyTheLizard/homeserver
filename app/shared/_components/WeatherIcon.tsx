export type WeatherGroup = 'clear' | 'partly-cloudy' | 'overcast' | 'fog' | 'rain' | 'snow' | 'thunder'

const BLUE = 'rgba(0,0,220,0.7)'
const GRAY_LIGHT = 'rgba(200,200,200,1)'
const GRAY_MID = 'rgba(160,160,160,1)'
const GRAY_DARK = 'rgba(100,100,100,1)'

export function WeatherIcon({ group }: { group: WeatherGroup }) {
  if (group === 'clear') {
    return (
      <svg width="20" height="20" viewBox="0 0 32 32" fill="none" aria-hidden="true">
        <circle cx="16" cy="16" r="5" fill={BLUE} />
        <line x1="16" y1="8" x2="16" y2="5" stroke={BLUE} strokeWidth="1.5" strokeLinecap="round" />
        <line x1="16" y1="24" x2="16" y2="27" stroke={BLUE} strokeWidth="1.5" strokeLinecap="round" />
        <line x1="8" y1="16" x2="5" y2="16" stroke={BLUE} strokeWidth="1.5" strokeLinecap="round" />
        <line x1="24" y1="16" x2="27" y2="16" stroke={BLUE} strokeWidth="1.5" strokeLinecap="round" />
        <line x1="10.3" y1="10.3" x2="8.2" y2="8.2" stroke={BLUE} strokeWidth="1.5" strokeLinecap="round" />
        <line x1="21.7" y1="21.7" x2="23.8" y2="23.8" stroke={BLUE} strokeWidth="1.5" strokeLinecap="round" />
        <line x1="21.7" y1="10.3" x2="23.8" y2="8.2" stroke={BLUE} strokeWidth="1.5" strokeLinecap="round" />
        <line x1="10.3" y1="21.7" x2="8.2" y2="23.8" stroke={BLUE} strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    )
  }

  if (group === 'partly-cloudy') {
    return (
      <svg width="20" height="20" viewBox="0 0 32 32" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="5" fill={BLUE} />
        <line x1="12" y1="4" x2="12" y2="2" stroke={BLUE} strokeWidth="1.5" strokeLinecap="round" />
        <line x1="12" y1="22" x2="12" y2="20" stroke={BLUE} strokeWidth="1.5" strokeLinecap="round" />
        <line x1="4" y1="12" x2="2" y2="12" stroke={BLUE} strokeWidth="1.5" strokeLinecap="round" />
        <line x1="22" y1="12" x2="20" y2="12" stroke={BLUE} strokeWidth="1.5" strokeLinecap="round" />
        <line x1="6.34" y1="6.34" x2="4.93" y2="4.93" stroke={BLUE} strokeWidth="1.5" strokeLinecap="round" />
        <line x1="19.07" y1="19.07" x2="17.66" y2="17.66" stroke={BLUE} strokeWidth="1.5" strokeLinecap="round" />
        <rect x="8" y="18" width="18" height="9" rx="4.5" fill={GRAY_LIGHT} />
        <rect x="13" y="15" width="10" height="8" rx="4" fill={GRAY_LIGHT} />
      </svg>
    )
  }

  if (group === 'overcast') {
    return (
      <svg width="20" height="20" viewBox="0 0 32 32" fill="none" aria-hidden="true">
        <rect x="4" y="17" width="24" height="11" rx="5.5" fill={GRAY_LIGHT} />
        <rect x="9" y="11" width="14" height="10" rx="5" fill={GRAY_LIGHT} />
      </svg>
    )
  }

  if (group === 'fog') {
    return (
      <svg width="20" height="20" viewBox="0 0 32 32" fill="none" aria-hidden="true">
        <rect x="5" y="7" width="22" height="9" rx="4.5" fill={GRAY_LIGHT} />
        <rect x="10" y="4" width="12" height="7" rx="3.5" fill={GRAY_LIGHT} />
        <line x1="4" y1="20" x2="28" y2="20" stroke={GRAY_LIGHT} strokeWidth="2" strokeLinecap="round" />
        <line x1="6" y1="25" x2="26" y2="25" stroke={GRAY_LIGHT} strokeWidth="2" strokeLinecap="round" />
        <line x1="10" y1="30" x2="22" y2="30" stroke={GRAY_LIGHT} strokeWidth="2" strokeLinecap="round" />
      </svg>
    )
  }

  if (group === 'rain') {
    return (
      <svg width="20" height="20" viewBox="0 0 32 32" fill="none" aria-hidden="true">
        <rect x="4" y="7" width="24" height="10" rx="5" fill={GRAY_MID} />
        <rect x="10" y="4" width="12" height="7" rx="3.5" fill={GRAY_MID} />
        <line x1="10" y1="21" x2="8" y2="28" stroke={BLUE} strokeWidth="1.5" strokeLinecap="round" />
        <line x1="16" y1="21" x2="14" y2="28" stroke={BLUE} strokeWidth="1.5" strokeLinecap="round" />
        <line x1="22" y1="21" x2="20" y2="28" stroke={BLUE} strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    )
  }

  if (group === 'snow') {
    return (
      <svg width="20" height="20" viewBox="0 0 32 32" fill="none" aria-hidden="true">
        <rect x="4" y="7" width="24" height="10" rx="5" fill={GRAY_MID} />
        <rect x="10" y="4" width="12" height="7" rx="3.5" fill={GRAY_MID} />
        <circle cx="10" cy="24" r="2" fill={BLUE} />
        <circle cx="16" cy="27" r="2" fill={BLUE} />
        <circle cx="22" cy="24" r="2" fill={BLUE} />
      </svg>
    )
  }

  return (
    <svg width="20" height="20" viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <rect x="4" y="5" width="24" height="11" rx="5.5" fill={GRAY_DARK} />
      <rect x="9" y="2" width="14" height="8" rx="4" fill={GRAY_DARK} />
      <polyline points="18,16 13,22 17,22 12,30" stroke="rgba(255,200,0,1)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  )
}
