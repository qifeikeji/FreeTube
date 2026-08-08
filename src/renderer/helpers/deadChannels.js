/** @type {Map<string, { reason: string, at: number }>} */
const deadChannels = new Map()

/** Skip dead channels for the rest of the app session (or until TTL). */
const DEAD_CHANNEL_TTL_MS = 24 * 60 * 60 * 1000

/**
 * @param {string} channelId
 * @param {string} [reason]
 */
export function markChannelDead(channelId, reason = 'unknown') {
  if (typeof channelId !== 'string' || channelId.length === 0) {
    return
  }

  deadChannels.set(channelId, {
    reason,
    at: Date.now()
  })
}

/**
 * @param {string} channelId
 * @returns {boolean}
 */
export function isChannelDead(channelId) {
  if (typeof channelId !== 'string' || channelId.length === 0) {
    return false
  }

  const entry = deadChannels.get(channelId)
  if (!entry) {
    return false
  }

  if (Date.now() - entry.at > DEAD_CHANNEL_TTL_MS) {
    deadChannels.delete(channelId)
    return false
  }

  return true
}

/**
 * @param {string} channelId
 */
export function clearDeadChannel(channelId) {
  deadChannels.delete(channelId)
}

export function clearAllDeadChannels() {
  deadChannels.clear()
}
