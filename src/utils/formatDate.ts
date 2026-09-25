// Formatter construction is the expensive part of Intl on Hermes, so each one
// is built once at module scope and reused by every bubble.
const timeFormatter = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' })
const dayFormatter = new Intl.DateTimeFormat('en-US', {
  weekday: 'short',
  month: 'short',
  day: 'numeric',
})
const dateFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'long',
  day: 'numeric',
  year: 'numeric',
})

const MILLISECONDS_IN_DAY = 24 * 60 * 60 * 1000

/** "5:40 am" — matches the design's lowercase meridiem. */
export const formatMessageTime = (timestamp: number) =>
  timeFormatter.format(timestamp).toLowerCase()

export const getLocalDayKey = (timestamp: number) => {
  const date = new Date(timestamp)
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
}

export const formatDayLabel = (timestamp: number, now: number) => {
  const dayKey = getLocalDayKey(timestamp)
  if (dayKey === getLocalDayKey(now)) {
    return 'Today'
  }
  if (dayKey === getLocalDayKey(now - MILLISECONDS_IN_DAY)) {
    return 'Yesterday'
  }
  return dayFormatter.format(timestamp)
}

export const formatLongDate = (timestamp: number) => dateFormatter.format(timestamp)
