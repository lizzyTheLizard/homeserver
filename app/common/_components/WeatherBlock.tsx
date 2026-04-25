import { WeatherGroup, WeatherIcon } from './WeatherIcon'
import styles from './WeatherBlock.module.css'

export interface WeatherInfo {
  temp: number
  weatherCode: number
  detailUrl: string | null
}

const WMO_DATA: Partial<Record<number, { label: string, group: WeatherGroup }>> = {
  0: { label: 'Clear sky', group: 'clear' },
  1: { label: 'Mainly clear', group: 'clear' },
  2: { label: 'Partly cloudy', group: 'partly-cloudy' },
  3: { label: 'Overcast', group: 'overcast' },
  45: { label: 'Fog', group: 'fog' },
  48: { label: 'Icy fog', group: 'fog' },
  51: { label: 'Light drizzle', group: 'rain' },
  53: { label: 'Drizzle', group: 'rain' },
  55: { label: 'Heavy drizzle', group: 'rain' },
  61: { label: 'Light rain', group: 'rain' },
  63: { label: 'Rain', group: 'rain' },
  65: { label: 'Heavy rain', group: 'rain' },
  71: { label: 'Light snow', group: 'snow' },
  73: { label: 'Snow', group: 'snow' },
  75: { label: 'Heavy snow', group: 'snow' },
  77: { label: 'Snow grains', group: 'snow' },
  80: { label: 'Rain showers', group: 'rain' },
  81: { label: 'Rain showers', group: 'rain' },
  82: { label: 'Heavy rain showers', group: 'rain' },
  85: { label: 'Snow showers', group: 'snow' },
  86: { label: 'Heavy snow showers', group: 'snow' },
  95: { label: 'Thunderstorm', group: 'thunder' },
  96: { label: 'Thunderstorm with hail', group: 'thunder' },
  99: { label: 'Thunderstorm with hail', group: 'thunder' },
}

export function WeatherBlock({ weather }: { weather: WeatherInfo | undefined }) {
  if (!weather) return null

  const wmo = WMO_DATA[weather.weatherCode]
  const label = wmo?.label ?? 'Unknown'
  const group = wmo?.group ?? 'overcast'

  const content = (
    <span className={styles.inner}>
      <WeatherIcon group={group} />
      <span>
        {weather.temp}
        {'°C — '}
        {label}
      </span>
    </span>
  )

  if (weather.detailUrl) {
    return (
      <a href={weather.detailUrl} target="_blank" rel="noopener noreferrer" className={styles.link}>
        {content}
      </a>
    )
  }

  return <div className={styles.link}>{content}</div>
}
