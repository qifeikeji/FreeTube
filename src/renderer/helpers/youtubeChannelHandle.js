import { extractYoutubeChannelHandle, youtubeChannelHandleUrl } from './utils'
import { invidiousGetChannelInfo } from './api/invidious'
import { getLocalChannel } from './api/local'
import store from '../store/index'

/**
 * @param {string} channelId
 * @returns {Promise<string|null>}
 */
async function resolveFromInvidious(channelId) {
  const channelInfo = await invidiousGetChannelInfo(channelId)
  const handle = extractYoutubeChannelHandle(channelInfo.authorUrl)
  return handle != null ? youtubeChannelHandleUrl(handle) : null
}

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

  const backendPreference = store.getters.getBackendPreference
  const backendFallback = store.getters.getBackendFallback
  const preferInvidious = !process.env.SUPPORTS_LOCAL_API || backendPreference === 'invidious'

  if (preferInvidious) {
    try {
      const handleUrl = await resolveFromInvidious(channelId)
      if (handleUrl != null) {
        return handleUrl
      }
    } catch (error) {
      console.error(error)
    }

    if (process.env.SUPPORTS_LOCAL_API && backendFallback) {
      try {
        return await resolveFromLocal(channelId)
      } catch (error) {
        console.error(error)
      }
    }

    return null
  }

  try {
    const handleUrl = await resolveFromLocal(channelId)
    if (handleUrl != null) {
      return handleUrl
    }
  } catch (error) {
    console.error(error)
  }

  if (backendFallback) {
    try {
      return await resolveFromInvidious(channelId)
    } catch (error) {
      console.error(error)
    }
  }

  return null
}
