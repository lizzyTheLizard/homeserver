'use client'
import { useState } from 'react'
import { DataTable } from '@/app/shared/_components/table/DataTable'
import { dateColumn, textColumn } from '@/app/shared/_components/table/DataTableColumnBuilders'
import { useSidebar } from '@/app/shared/_components/sidebar/SidebarContext'
import { Sidebar } from '@/app/shared/_components/sidebar/Sidebar'
import { DateTime } from '@/app/shared/_components/DateTime'
import styles from './MicrosoftCalendar.module.css'
import type { SerializedCalendarEvent } from '@assistant/microsoft/types'

export function MicrosoftCalendar({ events }: { events: SerializedCalendarEvent[] }) {
  const [selectedEvent, setSelectedEvent] = useState<SerializedCalendarEvent | null>(null),
   [eventSidebarId, openEventSidebar] = useSidebar()

  function showEventDetails(event: CalendarPlus) {
    setSelectedEvent(event._original)
    openEventSidebar()
  }

  return (
    <>
      <DataTable
        data={events.map(event => formatCalendar(event))}
        columns={calendarColumns}
        onRowClick={showEventDetails}
        initialSortingOrder={[{ direction: 'ASC', key: 'startDate' }]}
        searchLabel="Search calendar…"
      />
      <Sidebar id={eventSidebarId} title={selectedEvent?.subject ?? ''} type="Calendar Event" noDelete>
        {selectedEvent && (
          <div className={styles.eventContent}>
            <div className={styles.eventField}>
              <strong>Start: </strong>
              <DateTime date={selectedEvent.start} oneLine />
            </div>
            <div className={styles.eventField}>
              <strong>End: </strong>
              <DateTime date={selectedEvent.end} oneLine />
            </div>
            {selectedEvent.location.displayName && (
              <div className={styles.eventField}>
                <strong>Location: </strong>
                {selectedEvent.location.displayName}
              </div>
            )}
            <div className={styles.eventField}>
              <strong>All Day: </strong>
              {selectedEvent.isAllDay ? 'Yes' : 'No'}
            </div>
            <div className={styles.eventField}>
              <strong>Show As: </strong>
              {selectedEvent.showAs}
            </div>
            {selectedEvent.bodyPreview && (
              <div className={styles.eventBodyPreview}>{selectedEvent.bodyPreview}</div>
            )}
            {selectedEvent.body.content && (
              <div className={styles.eventBodyPreview}>{selectedEvent.body.content}</div>
            )}
          </div>
        )}
      </Sidebar>
    </>
  )
}

const calendarColumns = [
  textColumn('subject', { header: 'Subject', style: {} }),
  dateColumn('startDate', { header: 'Start', style: { width: '18%' } }),
  dateColumn('endDate', { header: 'End', style: { width: '18%' } }),
  textColumn('locationDisplay', { header: 'Location', style: { width: '15%' } }),
]

interface CalendarPlus {
  id: string
  subject: string
  startDate: string
  endDate: string
  locationDisplay: string
  _original: SerializedCalendarEvent
}

function formatCalendar(event: SerializedCalendarEvent): CalendarPlus {
  return {
    _original: event,
    endDate: event.end,
    id: event.id,
    locationDisplay: event.location.displayName,
    startDate: event.start,
    subject: event.subject,
  }
}
