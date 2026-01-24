'use client'
import { Select } from '@/app/shared/_components/form/Select'
import { Period, periodToString } from '../_helper/Period'
import style from './PeriodPicker.module.css'

export interface PeriodPickerProps extends React.HTMLAttributes<HTMLSpanElement> {
  period: Period
  onPeriodChange?: (period: Period) => void
  project_id?: string
}

const maxYear = new Date().getFullYear()
const minYear = 2020

export function PeriodPicker({ period, onPeriodChange, project_id, ...props }: PeriodPickerProps) {
  function defaultOnPeriodChange(p: Period) {
    const split = window.location.pathname.split('/')
    const href = `/cash/${project_id ?? ''}/${periodToString(p)}` + '/' + split.slice(4).join('/')
    window.location.href = href
  }

  function setYear(year: string | undefined) {
    const newYear = year ? parseInt(year) : undefined
    const newMonth = (year === period.year?.toString()) ? period.month : undefined
    const newPeriod = { current: false, year: newYear, month: newMonth }
    if (onPeriodChange) { onPeriodChange(newPeriod) }
    else { defaultOnPeriodChange(newPeriod) }
  }

  function setMonth(month: string | undefined) {
    const newYear = period.year
    const newMonth = (period.year && month) ? parseInt(month) : undefined
    const newPeriod = { current: false, year: newYear, month: newMonth }
    if (onPeriodChange) { onPeriodChange(newPeriod) }
    else { defaultOnPeriodChange(newPeriod) }
  }

  const year = period.year?.toString() ?? ''
  const month = period.month?.toString().padStart(2, '0') ?? ''

  console.log('Rendering PeriodPicker with period:', periodToString(period), year, month)

  return (
    <span {...props} className={style.container + ' ' + (props.className ?? '')}>
      <Select label="Year" emptyLabel="All" value={year} onChange={(e) => { setYear(e.target.value) }}>
        {Array.from({ length: maxYear - minYear + 1 }, (_, i) => maxYear - i).map(y => (
          <option key={y} value={y.toString()}>{y}</option>
        ))}
      </Select>

      <Select label="Month" emptyLabel="All" value={month} onChange={(e) => { setMonth(e.target.value) }} disabled={!period.year}>
        <option value="01">January</option>
        <option value="02">February</option>
        <option value="03">March</option>
        <option value="04">April</option>
        <option value="05">May</option>
        <option value="06">June</option>
        <option value="07">July</option>
        <option value="08">August</option>
        <option value="09">September</option>
        <option value="10">October</option>
        <option value="11">November</option>
        <option value="12">December</option>
      </Select>
    </span>
  )
}
