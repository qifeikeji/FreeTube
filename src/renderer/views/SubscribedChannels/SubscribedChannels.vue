<template>
  <div>
    <ft-card class="card">
      <h2>
        <FontAwesomeIcon
          :icon="['fas', 'user-check']"
          class="headingIcon"
        />
        {{ $t('Channels.Title') }}
      </h2>
      <ft-input
        v-show="subscribedChannels.length > 1"
        ref="searchBarChannels"
        :placeholder="$t('Channels.Search bar placeholder')"
        :value="query"
        :show-clear-text-button="true"
        :show-action-button="false"
        :maxlength="255"
        @input="handleQueryChange"
        @clear="() => handleQueryChange('')"
      />
      <ft-flex-box
        v-if="activeSubscriptionList.length === 0"
      >
        <p class="message">
          {{ $t('Channels.Empty') }}
        </p>
      </ft-flex-box>
      <template v-else>
        <ft-flex-box class="count">
          {{ $t('Channels.Count', { number: channelList.length }) }}
        </ft-flex-box>
        <div class="channels">
          <article
            v-for="channel in channelList"
            :key="channel.id"
            class="channelCard"
            @contextmenu.prevent="openChannelContextMenu($event, channel)"
          >
            <div class="channelCardMain">
              <router-link
                tabindex="-1"
                class="channelIconLink"
                :to="`/channel/${channel.id}`"
                @contextmenu.prevent="openChannelContextMenu($event, channel)"
              >
                <div
                  class="channelIconWrap"
                  :class="{ isPlaceholder: !shouldShowChannelThumbnail(channel) }"
                >
                  <img
                    v-if="shouldShowChannelThumbnail(channel)"
                    class="channelThumbnail"
                    :src="thumbnailURL(channel.thumbnail)"
                    alt=""
                    @error="handleThumbnailError(channel)"
                  >
                </div>
              </router-link>
              <div class="channelText">
                <router-link
                  class="channelName"
                  dir="auto"
                  :title="channel.name"
                  :to="`/channel/${channel.id}`"
                  @contextmenu.prevent="openChannelContextMenu($event, channel)"
                >
                  {{ channel.name }}
                </router-link>
                <p
                  v-if="getChannelNotes(channel)"
                  class="channelNotes"
                  :style="getChannelNotesStyle(channel)"
                >
                  {{ getChannelNotes(channel) }}
                </p>
              </div>
            </div>
          </article>
        </div>
      </template>
    </ft-card>
    <SubscribedChannelContextMenu
      v-if="contextMenuChannel != null"
      :channel="contextMenuChannel"
      :position="contextMenuPosition"
      :show-unsubscribe="!hideUnsubscribeButton"
      @edit="openChannelEditPrompt"
      @unsubscribe="requestUnsubscribeFromContextMenu"
      @close="closeChannelContextMenu"
    />
    <ChannelSubscriptionEditPrompt
      :channel="editingChannel"
      @save="saveChannelCustomization"
      @cancel="closeChannelEditPrompt"
    />
    <FtPrompt
      v-if="unsubscribePromptChannel != null"
      :label="t('Channels.Unsubscribe Prompt', { channelName: unsubscribePromptChannel.name })"
      :option-names="[t('Yes'), t('No')]"
      :option-values="['yes', 'no']"
      autosize
      :is-first-option-destructive="true"
      @click="handleUnsubscribeConfirmation"
    />
  </div>
</template>

<script setup>
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { computed, onMounted, onBeforeUnmount, ref, watch, useTemplateRef } from 'vue'
import { isNavigationFailure, NavigationFailureType, useRoute, useRouter } from 'vue-router'
import FtCard from '../../components/ft-card/ft-card.vue'
import FtFlexBox from '../../components/ft-flex-box/ft-flex-box.vue'
import FtInput from '../../components/FtInput/FtInput.vue'
import FtPrompt from '../../components/FtPrompt/FtPrompt.vue'
import SubscribedChannelContextMenu from '../../components/SubscribedChannelCardMenu/SubscribedChannelContextMenu.vue'
import ChannelSubscriptionEditPrompt from '../../components/SubscribedChannelCardMenu/ChannelSubscriptionEditPrompt.vue'
import { invidiousGetChannelInfo, youtubeImageUrlToInvidious, invidiousImageUrlToInvidious } from '../../helpers/api/invidious'
import { getLocalChannel, parseLocalChannelHeader } from '../../helpers/api/local'
import { ctrlFHandler, debounce, showToast } from '../../helpers/utils'
import { useI18n } from '../../composables/use-i18n-polyfill.js'
import store from '../../store/index'
import { MAIN_PROFILE_ID } from '../../../constants'

const route = useRoute()
const router = useRouter()
const { locale, t } = useI18n()

const re = {
  url: /(.+=\w)\d+(.+)/,
  ivToYt: /^.+ggpht\/(.+)/
}
const ytBaseURL = 'https://yt3.ggpht.com'
const thumbnailSize = 176
let errorCount = 0

const query = ref('')
const subscribedChannels = ref([])
const filteredChannels = ref([])

const searchBarChannels = useTemplateRef('searchBarChannels')

/** @type {import('vue').Ref<Record<string, boolean>>} */
const failedThumbnailByChannelId = ref({})
/** @type {import('vue').Ref<object | null>} */
const contextMenuChannel = ref(null)
const contextMenuPosition = ref({ x: 0, y: 0 })
/** @type {import('vue').Ref<object | null>} */
const editingChannel = ref(null)
/** @type {import('vue').Ref<object | null>} */
const unsubscribePromptChannel = ref(null)

/** @type {import('vue').ComputedRef<object[]>} */
const profileList = computed(() => store.getters.getProfileList)

/** @type {import('vue').ComputedRef<object>} */
const activeProfile = computed(() => {
  return store.getters.getActiveProfile
})

/** @type {import('vue').ComputedRef<string>} */
const activeProfileId = computed(() => {
  return activeProfile.value._id
})

/** @type {import('vue').ComputedRef<Array>} */
const activeSubscriptionList = computed(() => {
  return activeProfile.value.subscriptions
})

/** @type {import('vue').ComputedRef<Array>} */
const channelList = computed(() => {
  if (query.value !== '') {
    return filteredChannels.value
  } else {
    return subscribedChannels.value
  }
})

/** @type {import('vue').ComputedRef<boolean>} */
const hideUnsubscribeButton = computed(() => {
  return store.getters.getHideUnsubscribeButton
})

/** @type {import('vue').ComputedRef<'local' | 'invidious'>} */
const backendPreference = computed(() => {
  return store.getters.getBackendPreference
})

/** @type {import('vue').ComputedRef<string>} */
const currentInvidiousInstanceUrl = computed(() => {
  return store.getters.getCurrentInvidiousInstanceUrl
})

function getChannelNotes(channel) {
  const raw = channel.notes ?? channel.note ?? ''
  return typeof raw === 'string' ? raw.trim() : ''
}

function getChannelNotesStyle(channel) {
  const color = channel.notesColor
  if (typeof color !== 'string' || color.trim() === '') {
    return undefined
  }
  return { color: color.trim() }
}

/**
 * @param {object} channel
 */
function shouldShowChannelThumbnail(channel) {
  if (channel.thumbnail == null) {
    return false
  }
  return !failedThumbnailByChannelId.value[channel.id]
}

/**
 * @param {object} channel
 */
function handleThumbnailError(channel) {
  failedThumbnailByChannelId.value = {
    ...failedThumbnailByChannelId.value,
    [channel.id]: true,
  }
  updateThumbnail(channel)
}

/**
 * @param {string} channelId
 */
function clearThumbnailLoadFailure(channelId) {
  if (!failedThumbnailByChannelId.value[channelId]) {
    return
  }
  const next = { ...failedThumbnailByChannelId.value }
  delete next[channelId]
  failedThumbnailByChannelId.value = next
}

/**
 * @param {MouseEvent} event
 * @param {object} channel
 */
function openChannelContextMenu(event, channel) {
  event.preventDefault()
  event.stopPropagation()
  contextMenuChannel.value = channel
  contextMenuPosition.value = { x: event.clientX, y: event.clientY }
}

function closeChannelContextMenu() {
  contextMenuChannel.value = null
}

function openChannelEditPrompt() {
  if (contextMenuChannel.value == null) { return }
  editingChannel.value = contextMenuChannel.value
  closeChannelContextMenu()
}

function closeChannelEditPrompt() {
  editingChannel.value = null
}

/**
 * @param {{ notes: string, notesColor: string, highlightColor: string, highlighted: boolean, boldChannelName: boolean }} payload
 */
async function saveChannelCustomization(payload) {
  const channel = editingChannel.value
  if (channel == null) { return }

  await store.dispatch('updateChannelSubscriptionCustomization', {
    channelId: channel.id,
    notes: payload.notes,
    notesColor: payload.notesColor,
    highlightColor: payload.highlightColor,
    highlighted: payload.highlighted,
    boldChannelName: payload.boldChannelName,
  })

  closeChannelEditPrompt()
  getSubscription()
}

function requestUnsubscribeFromContextMenu() {
  if (contextMenuChannel.value == null) { return }

  const channel = contextMenuChannel.value
  closeChannelContextMenu()

  if (store.getters.getUnsubscriptionPopupStatus) {
    unsubscribePromptChannel.value = channel
  } else {
    unsubscribeChannel(channel.id)
  }
}

/**
 * @param {'yes' | 'no' | null} value
 */
function handleUnsubscribeConfirmation(value) {
  const channel = unsubscribePromptChannel.value
  unsubscribePromptChannel.value = null

  if (value === 'yes' && channel != null) {
    unsubscribeChannel(channel.id)
  }
}

/**
 * @param {string} channelId
 */
function unsubscribeChannel(channelId) {
  const active = activeProfile.value
  const profileIds = [active._id]

  if (active._id === MAIN_PROFILE_ID) {
    profileList.value.forEach((profileInList) => {
      if (profileInList._id === MAIN_PROFILE_ID) {
        return
      }

      if (profileInList.subscriptions.some((entry) => entry.id === channelId)) {
        profileIds.push(profileInList._id)
      }
    })
  }

  store.dispatch('removeChannelFromProfiles', { channelId, profileIds })

  showToast(t('Channel.Channel has been removed from your subscriptions'))

  if (active._id === MAIN_PROFILE_ID && profileIds.length > 1) {
    showToast(t('Channel.Removed subscription from {count} other channel(s)', { count: profileIds.length - 1 }))
  }
}

function getSubscription() {
  subscribedChannels.value = activeSubscriptionList.value.slice().sort((a, b) => {
    return a.name?.toLowerCase().localeCompare(b.name?.toLowerCase(), locale.value)
  })
}

function filterChannels() {
  if (query.value === '') {
    filteredChannels.value = []
    return
  }

  const escapedQuery = query.value.replaceAll(/[$()*+.?[\\\]^{|}]/g, '\\$&')
  const re = new RegExp(escapedQuery, 'i')
  filteredChannels.value = subscribedChannels.value.filter(channel => {
    return re.test(channel.name)
  })
}

const filterChannelsDebounce = debounce(filterChannels, 500)

function thumbnailURL(originalURL) {
  if (originalURL == null) { return null }
  let newURL = originalURL
  // Sometimes relative protocol URLs are passed in
  if (originalURL.startsWith('//')) {
    newURL = `https:${originalURL}`
  }
  const hostname = new URL(newURL).hostname
  if (hostname === 'yt3.ggpht.com' || hostname === 'yt3.googleusercontent.com') {
    if (backendPreference.value === 'invidious') { // YT to IV
      newURL = youtubeImageUrlToInvidious(newURL, currentInvidiousInstanceUrl.value)
    }
  } else {
    if (backendPreference.value === 'local') { // IV to YT
      newURL = newURL.replace(re.ivToYt, `${ytBaseURL}/$1`)
    } else { // IV to IV
      newURL = invidiousImageUrlToInvidious(newURL, currentInvidiousInstanceUrl.value)
    }
  }

  return newURL.replace(re.url, `$1${thumbnailSize}$2`)
}

function updateThumbnail(channel) {
  errorCount += 1
  if (backendPreference.value === 'local') {
    // avoid too many concurrent requests
    setTimeout(() => {
      getLocalChannel(channel.id).then(response => {
        if (!response.alert) {
          store.dispatch('updateSubscriptionDetails', {
            channelThumbnailUrl: thumbnailURL(parseLocalChannelHeader(response).thumbnailUrl),
            channelName: channel.name,
            channelId: channel.id
          }).then(() => {
            clearThumbnailLoadFailure(channel.id)
          })
        }
      })
    }, errorCount * 500)
  } else {
    setTimeout(() => {
      invidiousGetChannelInfo(channel.id).then(response => {
        store.dispatch('updateSubscriptionDetails', {
          channelThumbnailUrl: thumbnailURL(response.authorThumbnails[0].url),
          channelName: channel.name,
          channelId: channel.id
        }).then(() => clearThumbnailLoadFailure(channel.id))
      })
    }, errorCount * 500)
  }
}

function handleQueryChange(val, filterNow = false) {
  query.value = val

  saveStateInRouter(val)

  filterNow ? filterChannels() : filterChannelsDebounce()
}

async function saveStateInRouter(query) {
  if (query.value === '') {
    await router.replace({ name: 'subscribedChannels' }).catch(failure => {
      if (isNavigationFailure(failure, NavigationFailureType.duplicated)) {
        return
      }

      throw failure
    })
    return
  }

  await router.replace({
    name: 'subscribedChannels',
    query: { searchQueryText: query },
  }).catch(failure => {
    if (isNavigationFailure(failure, NavigationFailureType.duplicated)) {
      return
    }

    throw failure
  })
}

function keyboardShortcutHandler(event) {
  ctrlFHandler(event, searchBarChannels.value)
}

watch(activeProfileId, () => {
  query.value = ''
  getSubscription()
})

watch(activeSubscriptionList, () => {
  getSubscription()
  filterChannels()
})

// region created

getSubscription()

const oldQuery = route.query.searchQueryText ?? ''
if (oldQuery !== null && oldQuery !== '') {
  // `handleQueryChange` must be called after `filterHistoryDebounce` assigned
  handleQueryChange(oldQuery, true)
}

// endregion created

onMounted(() => {
  document.addEventListener('keydown', keyboardShortcutHandler)
})

onBeforeUnmount(() => {
  document.removeEventListener('keydown', keyboardShortcutHandler)
})
</script>
<style scoped src="./SubscribedChannels.css" />
