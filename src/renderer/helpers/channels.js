import { getLocalChannel, parseLocalChannelHeader } from './api/local'

/**
 * @param {string} id
 */
async function findChannelById(id) {
  try {
    return await getLocalChannel(id)
  } catch (err) {
    // don't bother if channel doesn't exist
    if (err.message && err.message === 'This channel does not exist.') {
      return { invalid: true }
    }
    throw err
  }
}

/**
 * @param {string} id
 * @param {{
 *   preference?: string,
 *   fallback?: boolean,
 * }} [_backendOptions] Unused — Local API only
 * @returns {Promise<{icon: string, iconHref: string, preferredName: string} | { invalidId: boolean }>}
 */
export async function findChannelTagInfo(id, _backendOptions) {
  if (!checkYoutubeChannelId(id)) return { invalidId: true }
  try {
    const channel = await findChannelById(id)
    if (channel.alert || channel.invalid) return { invalidId: true }

    const { name, thumbnailUrl } = parseLocalChannelHeader(channel)

    return {
      preferredName: name,
      icon: thumbnailUrl,
      iconHref: `/channel/${id}`
    }
  } catch (err) {
    console.error(err)
    return { preferredName: '', icon: '', iconHref: '', err }
  }
}

/**
 * Check whether Id provided might be a YouTube Id
 * @param {string} id
 * @returns {boolean}
 */
export function checkYoutubeChannelId(id) {
  return /^UC[\w-]{22}$/.test(id)
}
