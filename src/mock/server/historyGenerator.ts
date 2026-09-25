import {
  CREATOR,
  CURRENT_USER_ID,
  HISTORY_END_AT,
  HISTORY_INTERVAL_MS,
  HISTORY_SEED,
  HISTORY_SIZE,
} from '@constants'
import type { MessageDto } from '@types'
import { createSeededRandom } from '@utils'

const WORDS = [
  'hey',
  'love',
  'the',
  'new',
  'video',
  'thanks',
  'so',
  'much',
  'when',
  'is',
  'next',
  'drop',
  'that',
  'was',
  'amazing',
  'can',
  'you',
  'share',
  'your',
  'setup',
  'lighting',
  'looks',
  'great',
  'today',
  'tomorrow',
  'live',
  'stream',
  'behind',
  'scenes',
  'camera',
  'lens',
  'edit',
  'music',
  'track',
  'really',
  'good',
  'vibe',
  'studio',
  'weekend',
  'tour',
  'city',
  'coffee',
  'morning',
  'late',
  'night',
  'shoot',
  'photo',
  'post',
  'story',
  'fans',
  'support',
  'appreciate',
  'it',
  'yes',
  'no',
  'maybe',
  'soon',
  'haha',
  'wow',
  'nice',
  'ok',
]
const EMOJIS = ['🔥', '😍', '🙌', '✨', '😂', '👏', '📸', '🎬']

/**
 * Message `seq` is derived from nothing but `seq` and a fixed seed, so the
 * 50,000-row history costs no storage and is identical on every run.
 */
export const createHistoryMessage = (seq: number): MessageDto => {
  const random = createSeededRandom(HISTORY_SEED ^ Math.imul(seq, 2654435761))
  const isFromFan = random() < 0.45
  const wordCount = 2 + Math.floor(random() * 11)

  const words: Array<string> = []
  for (let index = 0; index < wordCount; index += 1) {
    words.push(WORDS[Math.floor(random() * WORDS.length)] ?? 'hey')
  }
  const emoji = random() < 0.2 ? ` ${EMOJIS[Math.floor(random() * EMOJIS.length)] ?? ''}` : ''
  const sentence = words.join(' ')

  return {
    id: `h${seq}`,
    seq,
    clientId: null,
    authorId: isFromFan ? CURRENT_USER_ID : CREATOR.id,
    kind: 'text',
    text: `${sentence.charAt(0).toUpperCase()}${sentence.slice(1)}${emoji}`,
    createdAt: HISTORY_END_AT - (HISTORY_SIZE - seq) * HISTORY_INTERVAL_MS,
  }
}
