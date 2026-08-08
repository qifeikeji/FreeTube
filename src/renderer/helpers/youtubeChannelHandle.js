import { extractYoutubeChannelHandle, youtubeChannelHandleUrl } from './utils'
import { getLocalChannel } from './api/local'

/**
 * @param {string} channelId
 * @returns {Promise<string|null>}
 */
async function resolveFromLocal(channelId) {
  const channel = await getLocalChannel(channelId)
  if (channel?.alert) {
    return null
  }

  const handle = extractYoutubeChannelHandle(channel?.metadata?.vanity_channel_url) ??
    extractYoutubeChannelHandle(channel?.metadata?.url)

  return handle != null ? youtubeChannelHandleUrl(handle) : null
}

/**
 * Resolve a YouTube channel @handle URL for the given channel.
 * Local API only — Invidious backend is disabled.
 * @param {string|null|undefined} channelId
 * @param {{ authorUrl?: string|null }} [options]
 * @returns {Promise<string|null>}
 */
export async function resolveYoutubeChannelHandleUrl(channelId, { authorUrl = null } = {}) {
  const fromAuthorUrl = extractYoutubeChannelHandle(authorUrl)
  if (fromAuthorUrl != null) {
    return youtubeChannelHandleUrl(fromAuthorUrl)
  }

  if (channelId == null || channelId === '') {
    return null
  }

  try {
    return await resolveFromLocal(channelId)
  } catch (error) {
    console.error(error)
    return null
  }
}
