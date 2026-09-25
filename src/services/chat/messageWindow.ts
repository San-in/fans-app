import type { MessageDto } from '@types'

/** Index of the first message whose seq is >= `seq` (messages are sorted by seq). */
const lowerBound = (messages: ReadonlyArray<MessageDto>, seq: number) => {
  let low = 0
  let high = messages.length
  while (low < high) {
    const middle = (low + high) >>> 1
    if ((messages[middle]?.seq ?? Infinity) < seq) {
      low = middle + 1
    } else {
      high = middle
    }
  }
  return low
}

/** Merges already-deduplicated messages into a sorted window. Appending is the fast path. */
export const insertSorted = (
  existing: ReadonlyArray<MessageDto>,
  incoming: ReadonlyArray<MessageDto>
): ReadonlyArray<MessageDto> => {
  const sortedIncoming = [...incoming].sort((first, second) => first.seq - second.seq)
  const lastExisting = existing[existing.length - 1]
  const firstIncoming = sortedIncoming[0]
  if (!firstIncoming) {
    return existing
  }
  if (!lastExisting || firstIncoming.seq > lastExisting.seq) {
    return [...existing, ...sortedIncoming]
  }

  const merged: Array<MessageDto> = []
  let existingIndex = 0
  let incomingIndex = 0
  while (existingIndex < existing.length || incomingIndex < sortedIncoming.length) {
    const nextExisting = existing[existingIndex]
    const nextIncoming = sortedIncoming[incomingIndex]
    if (nextIncoming && (!nextExisting || nextIncoming.seq < nextExisting.seq)) {
      merged.push(nextIncoming)
      incomingIndex += 1
    } else if (nextExisting) {
      merged.push(nextExisting)
      existingIndex += 1
    }
  }
  return merged
}

/**
 * Highest seq reachable from `fromSeq` without a hole. Seqs are dense on the
 * server, so any jump means messages were missed and must be fetched.
 */
export const findContiguousEnd = (messages: ReadonlyArray<MessageDto>, fromSeq: number) => {
  let contiguousSeq = fromSeq
  let index = lowerBound(messages, contiguousSeq + 1)
  while (messages[index]?.seq === contiguousSeq + 1) {
    contiguousSeq += 1
    index += 1
  }
  return contiguousSeq
}
