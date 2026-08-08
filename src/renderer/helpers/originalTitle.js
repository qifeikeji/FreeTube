import store from '../store/index'

/** @type {Map<string, Promise<string|null>>} */
const pendingRequests = new Map()

const YOUTUBE_OEMBED_HEADERS = {
  Referer: 'https://www.youtube.com/',
  Origin: 'https://www.youtube.com',
}

/**
 * @param {string} requestUrl
 * @param {RequestInit} [init]
 * @returns {Promise<string|null>}
 */
async function fetchTitleFromJsonEndpoint(requestUrl, init = {}) {
  const response = await fetch(requestUrl, init)

  if (!response.ok) {
    throw new Error(`title request failed with status ${response.status}`)
  }

  const json = await response.json()
  const title = typeof json?.title === 'string' ? json.title.trim() : ''
  return title.length > 0 ? title : null
}

/**
 * Fetch the original (non-auto-translated) title for a YouTube video via oEmbed.
 * Same approach as the "YouTube No Title Translate" browser extension.
 * Falls back to noembed.com when YouTube oEmbed rejects the Electron origin.
 *
 * @param {string} videoId
 * @returns {Promise<string|null>}
 */
export async function fetchOEmbedTitle(videoId) {
  if (typeof videoId !== 'string' || videoId.length === 0) {
    return null
  }

  const watchUrl = `https://www.youtube.com/watch?v=${videoId}`
  const youtubeOEmbedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(watchUrl)}&format=json`
  const noEmbedUrl = `https://noembed.com/embed?url=${encodeURIComponent(watchUrl)}`

  try {
    return await fetchTitleFromJsonEndpoint(youtubeOEmbedUrl, { headers: YOUTUBE_OEMBED_HEADERS })
  } catch (youtubeError) {
    try {
      return await fetchTitleFromJsonEndpoint(noEmbedUrl)
    } catch {
      // Keep a single concise warning; avoid dumping stacks for every video card.
      console.warn(`failed to fetch original title for ${videoId}: ${youtubeError.message || youtubeError}`)
      throw youtubeError
    }
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
