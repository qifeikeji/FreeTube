<template>
  <SubscriptionsTabUi
    :is-loading="isLoading"
    :video-list="postList"
    :error-channels="errorChannels"
    :attempted-fetch="attemptedFetch"
    :is-community="true"
    :initial-data-limit="20"
    :last-refresh-timestamp="lastPostsRefreshTimestamp"
    :last-refresh-at-ms="lastPostsRefreshAtMs"
    :title="t('Global.Posts')"
    @refresh="loadPostsForSubscriptionsFromRemote"
  />
</template>

<script setup>
import { computed, onMounted, ref, shallowRef, watch } from 'vue'
import { useI18n } from '../composables/use-i18n-polyfill'

import SubscriptionsTabUi from './SubscriptionsTabUi/SubscriptionsTabUi.vue'

import store from '../store/index'

import { copyToClipboard, getRelativeTimeFromDate, getOldestSubscriptionCacheRefreshAtMs, showToast } from '../helpers/utils'
import { mapWithConcurrency } from '../helpers/concurrency'
import { isChannelDead, markChannelDead } from '../helpers/deadChannels'
import { createLightInnertubeSession, getLocalChannelCommunity } from '../helpers/api/local'

const SUBSCRIPTION_FETCH_CONCURRENCY = 6

const { t } = useI18n()

const isLoading = ref(true)
const postList = shallowRef([])
const errorChannels = ref([])
const attemptedFetch = ref(false)

let alreadyLoadedRemotely = false

/** @type {import('vue').ComputedRef<boolean>} */
const subscriptionCacheReady = computed(() => store.getters.getSubscriptionCacheReady)

/** @type {import('vue').ComputedRef<boolean>} */
const fetchSubscriptionsAutomatically = computed(() => store.getters.getFetchSubscriptionsAutomatically)

const activeSubscriptionList = computed(() => store.getters.getActiveProfile.subscriptions)

/** @type {import('vue').ComputedRef<string>} */
const activeProfileId = computed(() => store.getters.getActiveProfile._id)

const cacheEntriesForAllActiveProfileChannels = computed(() => {
  const postsCache = store.getters.getPostsCache
  const entries = []

  activeSubscriptionList.value.forEach((channel) => {
    const cacheEntry = postsCache[channel.id]

    if (cacheEntry != null) {
      entries.push(cacheEntry)
    }
  })

  return entries
})

const postCacheForAllActiveProfileChannelsPresent = computed(() => {
  if (
    cacheEntriesForAllActiveProfileChannels.value.length === 0 ||
    cacheEntriesForAllActiveProfileChannels.value.length < activeSubscriptionList.value.length
  ) {
    return false
  }

  return cacheEntriesForAllActiveProfileChannels.value.every((cacheEntry) => {
    return cacheEntry.posts != null
  })
})

const lastPostsRefreshAtMs = computed(() => {
  const remoteAt = store.getters.getLastSubscriptionRefreshTimestamp.posts[activeProfileId.value]
  if (remoteAt != null) {
    return remoteAt
  }

  if (
    !postCacheForAllActiveProfileChannelsPresent.value ||
    cacheEntriesForAllActiveProfileChannels.value.length === 0
  ) {
    return null
  }

  return getOldestSubscriptionCacheRefreshAtMs(cacheEntriesForAllActiveProfileChannels.value, null)
})

const lastPostsRefreshTimestamp = computed(() => {
  const at = lastPostsRefreshAtMs.value
  if (at == null) {
    return ''
  }
  return getRelativeTimeFromDate(at, true)
})

// Reload when the subscribed channel set changes (profile switch / subscribe / unsubscribe).
const activeSubscriptionChannelIdsKey = computed(() => {
  return activeSubscriptionList.value.map((channel) => channel.id).join(',')
})

watch(activeSubscriptionChannelIdsKey, () => {
  isLoading.value = true
  loadPostsFromCacheSometimes()
})

if (!subscriptionCacheReady.value) {
  watch(subscriptionCacheReady, () => {
    if (!alreadyLoadedRemotely) {
      loadPostsFromCacheSometimes()
    }
  })
}

onMounted(() => {
  loadPostsFromRemoteFirstPerWindowSometimes()
})

function loadPostsFromRemoteFirstPerWindowSometimes() {
  if (
    !fetchSubscriptionsAutomatically.value ||
    // Only auto fetch once per window
    store.getters.getSubscriptionForPostsFirstAutoFetchRun
  ) {
    loadPostsFromCacheSometimes()
    return
  }

  alreadyLoadedRemotely = true
  loadPostsForSubscriptionsFromRemote()
  store.commit('setSubscriptionForPostsFirstAutoFetchRun')
}

function loadPostsFromCacheSometimes() {
  // Can only load reliably when cache ready
  if (!subscriptionCacheReady.value) { return }

  // This method is called on view visible
  if (postCacheForAllActiveProfileChannelsPresent.value) {
    loadPostsFromCacheForAllActiveProfileChannels()
    return
  }

  if (fetchSubscriptionsAutomatically.value) {
    // `isLoading.value = false` is called inside `loadPostsForSubscriptionsFromRemote` when needed
    loadPostsForSubscriptionsFromRemote()
    return
  }

  // Auto fetch disabled, not enough cache for profile = show nothing
  postList.value = []
  attemptedFetch.value = false
  isLoading.value = false
}

/** @type {import('vue').ComputedRef<string[]>} */
const forbiddenTitles = computed(() => {
  return JSON.parse(store.getters.getForbiddenTitles.toLowerCase())
})

function loadPostsFromCacheForAllActiveProfileChannels() {
  const postList_ = cacheEntriesForAllActiveProfileChannels.value.flatMap((cacheEntry) => {
    return cacheEntry.posts
  })

  postList_.sort((a, b) => {
    return b.publishedTime - a.publishedTime
  })

  postList.value = postList_.filter(post => !forbiddenTitles.value.some(text => post.author.toLowerCase().includes(text)))
  isLoading.value = false
}

async function loadPostsForSubscriptionsFromRemote() {
  if (activeSubscriptionList.value.length === 0) {
    isLoading.value = false
    postList.value = []
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

  /** @type {import('youtubei.js').Innertube | null} */
  let sharedInnertube = await createLightInnertubeSession()

  try {
    const postListFromRemote = (await mapWithConcurrency(
      channelsToLoadFromRemote,
      SUBSCRIPTION_FETCH_CONCURRENCY,
      async (channel) => {
        if (isChannelDead(channel.id)) {
          errorChannels.value.push(channel)
          channelCount++
          store.commit('setProgressBarPercentage', (channelCount / channelsToLoadFromRemote.length) * 100)
          return []
        }

        let posts = await getChannelPostsLocal(channel, sharedInnertube)

        channelCount++
        store.commit('setProgressBarPercentage', (channelCount / channelsToLoadFromRemote.length) * 100)

        store.dispatch('updateSubscriptionPostsCacheByChannel', {
          channelId: channel.id,
          posts
        })

        if (posts.length > 0) {
          const post = posts.find(post => post.authorId === channel.id)

          if (post) {
            const name = post.author
            let thumbnailUrl = post.authorThumbnails?.[0]?.url

            if (name || thumbnailUrl) {
              if (thumbnailUrl?.startsWith('//')) {
                thumbnailUrl = 'https:' + thumbnailUrl
              }

              subscriptionUpdates.push({
                channelId: channel.id,
                channelName: name,
                channelThumbnailUrl: thumbnailUrl
              })
            }
          }
        }

        posts = posts.filter(post => !forbiddenTitles.value.some(text => post.author.toLowerCase().includes(text)))
        return posts
      }
    )).flat()

    postListFromRemote.sort((a, b) => {
      return b.publishedTime - a.publishedTime
    })

    postList.value = postListFromRemote
  } finally {
    sharedInnertube = null
    isLoading.value = false
    store.commit('setShowProgressBar', false)
    await store.dispatch('batchUpdateSubscriptionDetails', subscriptionUpdates)
    // Persist per-profile so switching profiles / feed tabs keeps the refresh-click time.
    store.commit('setLastSubscriptionRefreshTimestamp', {
      feed: 'posts',
      profileId: activeProfileId.value,
      timestamp: Date.now()
    })
  }
}

/**
 * @param {object} channel
 * @param {import('youtubei.js').Innertube | null} [innertube]
 */
async function getChannelPostsLocal(channel, innertube = null) {
  try {
    const entries = await getLocalChannelCommunity(channel.id, { innertube })

    if (entries === null) {
      markChannelDead(channel.id, 'channel_error')
      errorChannels.value.push(channel)
      return []
    }

    return entries
  } catch (err) {
    console.error(err)
    const errorMessage = t('Local API Error (Click to copy)')
    showToast(`${errorMessage}: ${err}`, 10000, () => {
      copyToClipboard(err)
    })

    return []
  }
}
</script>
