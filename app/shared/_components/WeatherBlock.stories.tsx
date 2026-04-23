import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { WeatherBlock } from './WeatherBlock'

const meta = {
  title: 'Portal/WeatherBlock',
  component: WeatherBlock,
  tags: ['autodocs'],
  args: {
    weather: { temp: 17, weatherCode: 2, detailUrl: 'https://www.srf.ch/meteo' },
  },
} satisfies Meta<typeof WeatherBlock>
export default meta

export const Clear: StoryObj<typeof meta> = {
  args: { weather: { temp: 24, weatherCode: 0, detailUrl: null } },
}

export const PartlyCloudy: StoryObj<typeof meta> = {
  args: { weather: { temp: 17, weatherCode: 2, detailUrl: 'https://www.srf.ch/meteo' } },
}

export const Overcast: StoryObj<typeof meta> = {
  args: { weather: { temp: 12, weatherCode: 3, detailUrl: null } },
}

export const Fog: StoryObj<typeof meta> = {
  args: { weather: { temp: 8, weatherCode: 45, detailUrl: null } },
}

export const Rain: StoryObj<typeof meta> = {
  args: { weather: { temp: 11, weatherCode: 63, detailUrl: null } },
}

export const Snow: StoryObj<typeof meta> = {
  args: { weather: { temp: -2, weatherCode: 73, detailUrl: null } },
}

export const Thunder: StoryObj<typeof meta> = {
  args: { weather: { temp: 19, weatherCode: 95, detailUrl: null } },
}

export const NoData: StoryObj<typeof meta> = {
  args: { weather: undefined },
}
