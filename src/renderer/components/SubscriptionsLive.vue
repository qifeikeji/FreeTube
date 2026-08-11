<template>
  <SubscriptionsTabUi
    :is-loading="isLoading"
    :video-list="videoList"
    :error-channels="errorChannels"
    :attempted-fetch="attemptedFetch"
    :last-refresh-timestamp="lastLiveRefreshTimestamp"
    :last-refresh-at-ms="lastLiveRefreshAtMs"
    :title="t('Global.Live')"
    @refresh="loadVideosForSubscriptionsFromRemote"
  />
</template>

<script setup>
import { computed, onMounted, ref, shallowRef, watch } from 'vue'
import { useI18n } from '../composables/use-i18n-polyfill'

import SubscriptionsTabUi from './SubscriptionsTabUi/SubscriptionsTabUi.vue'

import store from '../store/index'

import {
  getChannelPlaylistId,
  copyToClipboard,
  getRelativeTimeFromDate,
  getOldestSubscriptionCacheRefreshAtMs,
  showToast
} from '../helpers/utils'
import { mapWithConcurrency } from '../helpers/concurrency'
import { isChannelDead, markChannelDead } from '../helpers/deadChannels'
import { createLightInnertubeSession, getLocalChannelLiveStreams } from '../helpers/api/local'
import { parseYouTubeRSSFeed, updateVideoListAfterProcessing } from '../helpers/subscriptions'

const SUBSCRIPTION_FETCH_CONCURRENCY = 6

const { t } = useI18n()

const isLoading = ref(true)
const videoList = shallowRef([])
const errorChannels = ref([])
const attemptedFetch = ref(false)
/** @type {import('vue').Ref<number | null>} */
const lastRemoteRefreshSuccessTimestamp = ref(null)

let alreadyLoadedRemotely = false

/** @type {import('vue').ComputedRef<boolean>} */
const subscriptionCacheReady = computed(() => store.getters.getSubscriptionCacheReady)

/** @type {import('vue').ComputedRef<boolean>} */
const useRssFeeds = computed(() => store.getters.getUseRssFeeds)

/** @type {import('vue').ComputedRef<boolean>} */
const fetchSubscriptionsAutomatically = computed(() => store.getters.getFetchSubscriptionsAutomatically)

const activeSubscriptionList = computed(() => store.getters.getActiveProfile.subscriptions)

const cacheEntriesForAllActiveProfileChannels = computed(() => {
  const liveCache = store.getters.getLiveCache
  const entries = []

  activeSubscriptionList.value.forEach((channel) => {
    const cacheEntry = liveCache[channel.id]

    if (cacheEntry != null) {
      entries.push(cacheEntry)
    }
  })

  return entries
})

const videoCacheForAllActiveProfileChannelsPresent = computed(() => {
  if (
    cacheEntriesForAllActiveProfileChannels.value.length === 0 ||
    cacheEntriesForAllActiveProfileChannels.value.length < activeSubscriptionList.value.length
  ) {
    return false
  }

  return cacheEntriesForAllActiveProfileChannels.value.every((cacheEntry) => {
    return cacheEntry.videos != null
  })
})

const lastLiveRefreshAtMs = computed(() => {
  if (lastRemoteRefreshSuccessTimestamp.value != null) {
    return lastRemoteRefreshSuccessTimestamp.value
  }

  if (
    !videoCacheForAllActiveProfileChannelsPresent.value ||
    cacheEntriesForAllActiveProfileChannels.value.length === 0
  ) {
    return null
  }

  return getOldestSubscriptionCacheRefreshAtMs(cacheEntriesForAllActiveProfileChannels.value, null)
})

const lastLiveRefreshTimestamp = computed(() => {
  const at = lastLiveRefreshAtMs.value
  if (at == null) {
    return ''
  }
  return getRelativeTimeFromDate(at, true)
})

// Only reset when the subscribed channel set changes (profile switch / subscribe / unsubscribe).
// Deep-watching the full list incorrectly cleared the refresh timestamp when channel
// names/thumbnails were updated after a successful remote refresh.
const activeSubscriptionChannelIdsKey = computed(() => {
  return activeSubscriptionList.value.map((channel) => channel.id).join(',')
})

watch(activeSubscriptionChannelIdsKey, () => {
  lastRemoteRefreshSuccessTimestamp.value = null
  isLoading.value = true
  loadVideosFromCacheSometimes()
})

if (!subscriptionCacheReady.value) {
  watch(subscriptionCacheReady, () => {
    if (!alreadyLoadedRemotely) {
      loadVideosFromCacheSometimes()
    }
  })
}

onMounted(() => {
  loadVideosFromRemoteFirstPerWindowSometimes()
})

function loadVideosFromRemoteFirstPerWindowSometimes() {
  if (
    !fetchSubscriptionsAutomatically.value ||
    // Only auto fetch once per window
    store.getters.getSubscriptionForLiveStreamsFirstAutoFetchRun
  ) {
    loadVideosFromCacheSometimes()
    return
  }

  alreadyLoadedRemotely = true
  loadVideosForSubscriptionsFromRemote()
  store.commit('setSubscriptionForLiveStreamsFirstAutoFetchRun')
}

function loadVideosFromCacheSometimes() {
  // Can only load reliably when cache ready
  if (!subscriptionCacheReady.value) { return }

  // This method is called on view visible
  if (videoCacheForAllActiveProfileChannelsPresent.value) {
    loadVideosFromCacheForAllActiveProfileChannels()
    return
  }

  if (fetchSubscriptionsAutomatically.value) {
    // `isLoading.value = false` is called inside `loadVideosForSubscriptionsFromRemote` when needed
    loadVideosForSubscriptionsFromRemote()
    return
  }

  // Auto fetch disabled, not enough cache for profile = show nothing
  videoList.value = []
  attemptedFetch.value = false
  isLoading.value = false
}

function loadVideosFromCacheForAllActiveProfileChannels() {
  const videoList_ = cacheEntriesForAllActiveProfileChannels.value.flatMap((cacheEntry) => {
    return cacheEntry.videos
  })

  videoList.value = updateVideoListAfterProcessing(videoList_)
  isLoading.value = false
}

async function loadVideosForSubscriptionsFromRemote() {
  if (activeSubscriptionList.value.length === 0) {
    isLoading.value = false
    videoList.value = []
    return
  }

  const channelsToLoadFromRemote = activeSubscriptionList.value
  let channelCount = 0
  isLoading.value = true

  let useRss = useRssFeeds.value
  if (channelsToLoadFromRemote.length >= 125 && !useRss) {
    showToast(
      t('Subscriptions["This profile has a large number of subscriptions. Forcing RSS to avoid rate limiting"]'),
      10000
    )
    useRss = true
  }

  store.commit('setShowProgressBar', true)
  store.commit('setProgressBarPercentage', 0)
  attemptedFetch.value = true

  errorChannels.value = []
  const subscriptionUpdates = []

  /** @type {import('youtubei.js').Innertube | null} */
  let sharedInnertube = null
  if (!useRss) {
    sharedInnertube = await createLightInnertubeSession()
  }

  try {
    const videoListFromRemote = (await mapWithConcurrency(
      channelsToLoadFromRemote,
      SUBSCRIPTION_FETCH_CONCURRENCY,
      async (channel) => {
        if (isChannelDead(channel.id)) {
          errorChannels.value.push(channel)
          channelCount++
          store.commit('setProgressBarPercentage', (channelCount / channelsToLoadFromRemote.length) * 100)
          return []
        }

        let videos, name, thumbnailUrl

        if (useRss) {
          ({ videos, name, thumbnailUrl } = await getChannelLiveLocalRSS(channel))
        } else {
          ({ videos, name, thumbnailUrl } = await getChannelLiveLocalScraper(channel, 0, sharedInnertube))
        }

        channelCount++
        store.commit('setProgressBarPercentage', (channelCount / channelsToLoadFromRemote.length) * 100)

        if (videos != null) {
          store.dispatch('updateSubscriptionLiveCacheByChannel', {
            channelId: channel.id,
            videos: videos
          })
        }

        if (name || thumbnailUrl) {
          subscriptionUpdates.push({
            channelId: channel.id,
            channelName: name,
            channelThumbnailUrl: thumbnailUrl
          })
        }

        return videos ?? []
      }
    )).flat()

    videoList.value = updateVideoListAfterProcessing(videoListFromRemote)
  } finally {
    sharedInnertube = null
    isLoading.value = false
    store.commit('setShowProgressBar', false)
    await store.dispatch('batchUpdateSubscriptionDetails', subscriptionUpdates)
    // Record completion after metadata updates so the label tracks the refresh click, not oldest cache.
    lastRemoteRefreshSuccessTimestamp.value = Date.now()
  }
}

/**
 * @param {object} channel
 * @param {number} [failedAttempts]
 * @param {import('youtubei.js').Innertube | null} [innertube]
 */
async function getChannelLiveLocalScraper(channel, failedAttempts = 0, innertube = null) {
  try {
    const result = await getLocalChannelLiveStreams(channel.id, { innertube })

    if (result === null) {
      markChannelDead(channel.id, 'channel_error')
      errorChannels.value.push(channel)
      return {
        videos: []
      }
    }

    return result
  } catch (err) {
    console.error(err)
    const errorMessage = t('Local API Error (Click to copy)')
    showToast(`${errorMessage}: ${err}`, 10000, () => {
      copyToClipboard(err)
    })

    if (failedAttempts === 0) {
      return await getChannelLiveLocalRSS(channel, failedAttempts + 1)
    }

    return {
      videos: []
    }
  }
}

/**
 * @param {object} channel
 * @param {number} [failedAttempts]
 */
async function getChannelLiveLocalRSS(channel, failedAttempts = 0) {
  const playlistId = getChannelPlaylistId(channel.id, 'live', 'newest')
  const feedUrl = `https://www.youtube.com/feeds/videos.xml?playlist_id=${playlistId}`

  try {
    const response = await fetch(feedUrl)

    if (response.status === 403) {
      return {
        videos: null
      }
    }

    if (response.status === 404) {
      // playlists don't exist if the channel was terminated but also if it doesn't have the tab,
      // so we need to check the channel feed too before deciding it errored, as that only 404s if the channel was terminated

      const response2 = await fetch(`https://www.youtube.com/feeds/videos.xml?channel_id=${channel.id}`, {
        method: 'HEAD'
      })

      if (response2.status === 404) {
        markChannelDead(channel.id, 'rss_404')
        errorChannels.value.push(channel)
      }

      return {
        videos: []
      }
    }

    return await parseYouTubeRSSFeed(await response.text(), channel.id)
  } catch (error) {
    console.error(error)
    const errorMessage = t('Local API Error (Click to copy)')
    showToast(`${errorMessage}: ${error}`, 10000, () => {
      copyToClipboard(error)
    })

    if (failedAttempts === 0) {
      return await getChannelLiveLocalScraper(channel, failedAttempts + 1)
    }

    return {
      videos: []
    }
  }
}
</script>
