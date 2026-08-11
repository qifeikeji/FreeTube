<template>
  <SubscriptionsTabUi
    :is-loading="isLoading"
    :video-list="videoList"
    :error-channels="errorChannels"
    :attempted-fetch="attemptedFetch"
    :last-refresh-timestamp="lastShortRefreshTimestamp"
    :last-refresh-at-ms="lastShortRefreshAtMs"
    :title="t('Global.Shorts')"
    @refresh="loadVideosForSubscriptionsFromRemote"
  />
</template>

<script setup>
import { computed, shallowRef, ref, watch, onMounted } from 'vue'
import { useI18n } from '../composables/use-i18n-polyfill'

import SubscriptionsTabUi from './SubscriptionsTabUi/SubscriptionsTabUi.vue'

import store from '../store/index'

import { parseYouTubeRSSFeed, updateVideoListAfterProcessing } from '../helpers/subscriptions'
import {
  copyToClipboard,
  getChannelPlaylistId,
  getRelativeTimeFromDate,
  getOldestSubscriptionCacheRefreshAtMs,
  showToast
} from '../helpers/utils'
import { mapWithConcurrency } from '../helpers/concurrency'
import { isChannelDead, markChannelDead } from '../helpers/deadChannels'

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
const fetchSubscriptionsAutomatically = computed(() => store.getters.getFetchSubscriptionsAutomatically)

const activeSubscriptionList = computed(() => store.getters.getActiveProfile.subscriptions)

const cacheEntriesForAllActiveProfileChannels = computed(() => {
  const shortsCache = store.getters.getShortsCache
  const entries = []

  activeSubscriptionList.value.forEach((channel) => {
    const cacheEntry = shortsCache[channel.id]

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

const lastShortRefreshAtMs = computed(() => {
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

const lastShortRefreshTimestamp = computed(() => {
  const at = lastShortRefreshAtMs.value
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
    store.getters.getSubscriptionForShortsFirstAutoFetchRun
  ) {
    loadVideosFromCacheSometimes()
    return
  }

  alreadyLoadedRemotely = true
  loadVideosForSubscriptionsFromRemote()
  store.commit('setSubscriptionForShortsFirstAutoFetchRun')
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
  store.commit('setShowProgressBar', true)
  store.commit('setProgressBarPercentage', 0)
  attemptedFetch.value = true

  errorChannels.value = []
  const subscriptionUpdates = []

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

        const { videos, name } = await getChannelShortsLocalRSS(channel)

        channelCount++
        store.commit('setProgressBarPercentage', (channelCount / channelsToLoadFromRemote.length) * 100)

        if (videos != null) {
          store.dispatch('updateSubscriptionShortsCacheByChannel', {
            channelId: channel.id,
            videos: videos
          })
        }

        if (name) {
          subscriptionUpdates.push({
            channelId: channel.id,
            channelName: name
          })
        }

        return videos ?? []
      }
    )).flat()

    videoList.value = updateVideoListAfterProcessing(videoListFromRemote)
  } finally {
    isLoading.value = false
    store.commit('setShowProgressBar', false)
    await store.dispatch('batchUpdateSubscriptionDetails', subscriptionUpdates)
    // Record completion after metadata updates so the label tracks the refresh click, not oldest cache.
    lastRemoteRefreshSuccessTimestamp.value = Date.now()
  }
}

/**
 * @param {object} channel
 */
async function getChannelShortsLocalRSS(channel) {
  const playlistId = getChannelPlaylistId(channel.id, 'shorts', 'newest')
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

    return {
      videos: []
    }
  }
}
</script>
