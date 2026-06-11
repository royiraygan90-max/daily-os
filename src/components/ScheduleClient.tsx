'use client'

import { useState, useEffect, useRef } from 'react'
import AddEventModal from './AddEventModal'

interface Event {
  id: number
  title: string
  description: string | null
  color: string
  startTime: string
  endTime: string
  isRecurring: boolean
  daysOfWeek: string | null
  date: string | null
}

interface Props {
  initialWeekStart: string
  initialEvents: Event[]
  todayStr: string
}

const START_HOUR = 8
const ROW_HEIGHT = 40
const HOURS = Array.from({ length: 16 }, (_, i) => START_HOUR + i) // 8..23

const DAY_NAMES_HE = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת']

function getWeekDates(weekStart: string): string[] {
  const base = new Date(weekStart + 'T12:00:00')
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(base)
    d.setDate(d.getDate() + i)
    return d.toISOString().slice(0, 10)
  })
}

function addWeeks(weekStart: string, delta: number): string {
  const d = new Date(weekStart + 'T12:00:00')
  d.setDate(d.getDate() + delta * 7)
  return d.toISOString().slice(0, 10)
}

function getWeekLabel(weekStart: string): string {
  const start = new Date(weekStart + 'T12:00:00')
  const end = new Date(start)
  end.setDate(end.getDate() + 6)
  const startMonth = new Intl.DateTimeFormat('he-IL', { month: 'long' }).format(start)
  const endMonth = new Intl.DateTimeFormat('he-IL', { month: 'long' }).format(end)
  const year = start.getFullYear()
  if (start.getMonth() === end.getMonth()) {
    return `${start.getDate()}–${end.getDate()} ב${startMonth} ${year}`
  }
  return `${start.getDate()} ב${startMonth} – ${end.getDate()} ב${endMonth} ${year}`
}

function getEventsForDay(events: Event[], date: string): Event[] {
  const dayOfWeek = new Date(date + 'T12:00:00').getDay()
  return events.filter((event) => {
    if (event.isRecurring) {
      try {
        const days = JSON.parse(event.daysOfWeek || '[]') as number[]
        return days.includes(dayOfWeek)
      } catch {
        return false
      }
    }
    return event.date === date
  })
}

function timeToFraction(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h + m / 60
}

function getMobileVisible(center: number): number[] {
  if (center <= 0) return [0, 1, 2]
  if (center >= 6) return [4, 5, 6]
  return [center - 1, center, center + 1]
}

export default function ScheduleClient({ initialWeekStart, initialEvents, todayStr }: Props) {
  const [weekStart, setWeekStart] = useState(initialWeekStart)
  const [events, setEvents] = useState<Event[]>(initialEvents)
  const [showModal, setShowModal] = useState(false)
  const [hoveredKey, setHoveredKey] = useState<string | null>(null)
  const [isMobile, setIsMobile] = useState(false)
  const [mobileCenter, setMobileCenter] = useState<number>(() => {
    return new Date(todayStr + 'T12:00:00').getDay()
  })
  const scrollRef = useRef<HTMLDivElement>(null)
  const touchStartX = useRef<number>(0)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0
    }
  }, [])

  async function fetchEvents(ws: string) {
    const res = await fetch(`/api/events?weekStart=${ws}`)
    setEvents(await res.json())
  }

  function navigateWeek(delta: number) {
    const next = addWeeks(weekStart, delta)
    setWeekStart(next)
    fetchEvents(next)
    if (delta < 0) setMobileCenter(6)
    else setMobileCenter(0)
  }

  function shiftMobileCenter(delta: number) {
    const next = mobileCenter + delta
    if (next < 0) {
      navigateWeek(-1)
    } else if (next > 6) {
      navigateWeek(1)
    } else {
      setMobileCenter(next)
    }
  }

  async function deleteEvent(id: number) {
    await fetch(`/api/events/${id}`, { method: 'DELETE' })
    setEvents((prev) => prev.filter((e) => e.id !== id))
  }

  function handleAdd(event: Event) {
    setEvents((prev) => [...prev, event])
  }

  const weekDates = getWeekDates(weekStart)
  const weekLabel = getWeekLabel(weekStart)

  const visibleIndices = isMobile ? getMobileVisible(mobileCenter) : [0, 1, 2, 3, 4, 5, 6]
  const visibleDates = visibleIndices.map((i) => weekDates[i])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 130px)', minHeight: '400px' }}>
      {/* Week navigation */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '10px',
          gap: '8px',
          flexWrap: 'wrap',
        }}
      >
        <button
          onClick={() => navigateWeek(-1)}
          className="btn-primary"
          style={{ background: 'var(--bg-card-hover)', padding: '6px 14px', fontSize: '13px' }}
        >
          {'‹ '}השבוע הקודם
        </button>
        <span
          style={{
            color: 'var(--text-primary)',
            fontWeight: 600,
            fontSize: '15px',
            textAlign: 'center',
            flex: 1,
          }}
        >
          {weekLabel}
        </span>
        <button
          onClick={() => navigateWeek(1)}
          className="btn-primary"
          style={{ background: 'var(--bg-card-hover)', padding: '6px 14px', fontSize: '13px' }}
        >
          {' '}השבוע הבא{' ›'}
        </button>
      </div>

      {/* Calendar card */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: '12px',
          overflow: 'hidden',
          direction: 'ltr',
        }}
      >
        {/* Day headers */}
        <div
          style={{
            display: 'flex',
            borderBottom: '1px solid var(--border)',
            background: 'var(--bg-card)',
            flexShrink: 0,
          }}
        >
          <div style={{ width: '52px', flexShrink: 0 }} />
          {visibleDates.map((date, idx) => {
            const isToday = date === todayStr
            const dayName = DAY_NAMES_HE[visibleIndices[idx]]
            const d = new Date(date + 'T12:00:00')
            return (
              <div
                key={date}
                style={{
                  flex: 1,
                  padding: '8px 2px',
                  textAlign: 'center',
                  borderBottom: isToday ? '2px solid var(--accent-purple)' : '2px solid transparent',
                  background: isToday ? '#1a1a2e' : 'transparent',
                }}
              >
                <div
                  style={{
                    fontSize: '11px',
                    color: isToday ? 'var(--accent-purple)' : 'var(--text-secondary)',
                  }}
                >
                  {dayName}
                </div>
                <div
                  style={{
                    fontSize: '14px',
                    fontWeight: isToday ? 700 : 400,
                    color: isToday ? 'var(--accent-purple)' : 'var(--text-primary)',
                  }}
                >
                  {d.getDate()}/{d.getMonth() + 1}
                </div>
              </div>
            )
          })}
        </div>

        {/* Scrollable grid */}
        <div
          ref={scrollRef}
          style={{ overflowY: 'auto', flex: 1 }}
          onTouchStart={(e) => { touchStartX.current = e.touches[0].clientX }}
          onTouchEnd={(e) => {
            const dx = e.changedTouches[0].clientX - touchStartX.current
            if (isMobile && Math.abs(dx) > 50) shiftMobileCenter(dx < 0 ? 1 : -1)
          }}
        >
          <div style={{ display: 'flex', position: 'relative', paddingTop: '8px' }}>
            {/* Time labels */}
            <div style={{ width: '52px', flexShrink: 0 }}>
              {HOURS.map((h) => (
                <div key={h} style={{ height: `${ROW_HEIGHT}px`, position: 'relative' }}>
                  <span
                    style={{
                      position: 'absolute',
                      top: '-7px',
                      right: '6px',
                      fontSize: '10px',
                      color: 'var(--text-secondary)',
                      whiteSpace: 'nowrap',
                      userSelect: 'none',
                    }}
                  >
                    {h.toString().padStart(2, '0')}:00
                  </span>
                </div>
              ))}
            </div>

            {/* Day columns */}
            {visibleDates.map((date) => {
              const dayEvents = getEventsForDay(events, date)
              return (
                <div
                  key={date}
                  style={{
                    flex: 1,
                    minWidth: 0,
                    position: 'relative',
                    borderLeft: '1px solid var(--border)',
                  }}
                >
                  {/* Hour grid lines */}
                  {HOURS.map((h) => (
                    <div
                      key={h}
                      style={{
                        height: `${ROW_HEIGHT}px`,
                        borderBottom: '1px solid var(--border)',
                      }}
                    />
                  ))}

                  {/* Events */}
                  {dayEvents.map((event) => {
                    const startFrac = timeToFraction(event.startTime)
                    const endFrac = timeToFraction(event.endTime)
                    const top = (startFrac - START_HOUR) * ROW_HEIGHT
                    const height = Math.max(18, (endFrac - startFrac) * ROW_HEIGHT)
                    const key = `${event.id}-${date}`
                    const isHovered = hoveredKey === key

                    return (
                      <div
                        key={key}
                        onMouseEnter={() => setHoveredKey(key)}
                        onMouseLeave={() => setHoveredKey(null)}
                        style={{
                          position: 'absolute',
                          top: `${top}px`,
                          height: `${height}px`,
                          left: '2px',
                          right: '2px',
                          background: event.color,
                          opacity: isHovered ? 1 : 0.9,
                          filter: isHovered ? 'brightness(1.2)' : 'none',
                          borderRadius: '4px',
                          overflow: 'hidden',
                          padding: '2px 5px',
                          cursor: 'default',
                          zIndex: isHovered ? 2 : 1,
                          transition: 'filter 150ms',
                        }}
                      >
                        <div
                          style={{
                            fontSize: '11px',
                            fontWeight: 600,
                            color: 'white',
                            lineHeight: 1.3,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            direction: 'rtl',
                          }}
                        >
                          {event.title}
                        </div>
                        {height > 28 && (
                          <div
                            style={{
                              fontSize: '10px',
                              color: 'rgba(255,255,255,0.85)',
                              whiteSpace: 'nowrap',
                              direction: 'ltr',
                            }}
                          >
                            {event.startTime}–{event.endTime}
                          </div>
                        )}
                        {isHovered && (
                          <button
                            onClick={() => deleteEvent(event.id)}
                            style={{
                              position: 'absolute',
                              top: '2px',
                              right: '2px',
                              background: 'rgba(0,0,0,0.45)',
                              border: 'none',
                              borderRadius: '3px',
                              color: 'white',
                              cursor: 'pointer',
                              fontSize: '11px',
                              padding: '1px 4px',
                              lineHeight: 1.2,
                            }}
                          >
                            🗑
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Mobile day nav */}
      {isMobile && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '12px',
            marginTop: '10px',
          }}
        >
          <button
            onClick={() => shiftMobileCenter(-1)}
            style={{
              padding: '6px 16px',
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              fontSize: '18px',
            }}
          >
            ‹
          </button>
          <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            {DAY_NAMES_HE[mobileCenter > 6 ? 6 : mobileCenter < 0 ? 0 : mobileCenter]}
          </span>
          <button
            onClick={() => shiftMobileCenter(1)}
            style={{
              padding: '6px 16px',
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              fontSize: '18px',
            }}
          >
            ›
          </button>
        </div>
      )}

      {/* FAB */}
      <button
        onClick={() => setShowModal(true)}
        style={{
          position: 'fixed',
          bottom: '80px',
          right: '24px',
          width: '52px',
          height: '52px',
          borderRadius: '50%',
          background: 'var(--accent-purple)',
          color: 'white',
          border: 'none',
          fontSize: '26px',
          lineHeight: 1,
          cursor: 'pointer',
          boxShadow: '0 4px 20px rgba(124,58,237,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 40,
        }}
      >
        +
      </button>

      {showModal && <AddEventModal onClose={() => setShowModal(false)} onAdd={handleAdd} />}
    </div>
  )
}
