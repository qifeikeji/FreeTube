import store from '../store/index'

/** @type {Map<string, Promise<string|null>>} */
const pendingRequests = new Map()

/**
 * Fetch the original (non-auto-translated) title for a YouTube video via oEmbed.
 * Same approach as the "YouTube No Title Translate" browser extension.
 *
 * @param {string} videoId
 * @returns {Promise<string|null>}
 */
export async function fetchOEmbedTitle(videoId) {
  if (typeof videoId !== 'string' || videoId.length === 0) {
    return null
  }

  const watchUrl = `https://www.youtube.com/watch?v=${videoId}`
  const requestUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(watchUrl)}&format=json`

  try {
    const response = await fetch(requestUrl)

    if (!response.ok) {
      throw new Error(`oEmbed request failed with status ${response.status}`)
    }

    const json = await response.json()
    const title = typeof json?.title === 'string' ? json.title.trim() : ''
    return title.length > 0 ? title : null
  } catch (error) {
    console.error('failed to fetch original title via oEmbed', requestUrl, error)
    throw error
  }
}

/**
 * Resolve an original title, using the Vuex cache and in-flight request deduplication.
 * Failed lookups are cached as `null` to avoid repeated requests.
 *
 * @param {string} videoId
 * @returns {Promise<string|null>}
 */
export async function getOriginalTitle(videoId) {
  if (typeof videoId !== 'string' || videoId.length === 0) {
    return null
  }

  const cached = store.getters.getOriginalTitleCache[videoId]
  if (cached !== undefined) {
    return cached.title
  }

  const pending = pendingRequests.get(videoId)
  if (pending) {
    return pending
  }

  const request = (async () => {
    try {
      const title = await fetchOEmbedTitle(videoId)
      store.commit('addVideoToOriginalTitleCache', { videoId, title })
      return title
    } catch {
      store.commit('addVideoToOriginalTitleCache', { videoId, title: null })
      return null
    }
  })()

  pendingRequests.set(videoId, request)

  try {
    return await request
  } finally {
    pendingRequests.delete(videoId)
  }
}
