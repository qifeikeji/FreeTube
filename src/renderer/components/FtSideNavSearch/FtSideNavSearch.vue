<template>
  <div
    v-if="!hideSearchBar"
    class="sideNavSearch"
  >
    <FtInput
      ref="searchInput"
      :placeholder="t('Search / Go to URL')"
      class="searchInput"
      is-search
      :data-list="activeDataList"
      :data-list-properties="activeDataListProperties"
      show-clear-text-button
      show-data-when-empty
      @input="getSearchSuggestionsDebounce"
      @click="goToSearch"
      @clear="clearLastSuggestionQuery"
      @remove="removeSearchHistoryEntryInDbAndCache"
    />
    <button
      class="navFilterButton"
      :class="{ filterChanged: searchFilterValueChanged }"
      :aria-label="t('Search Filters.Search Filters')"
      :title="t('Search Filters.Search Filters')"
      @click="showSearchFilters"
    >
      <FontAwesomeIcon
        class="navIcon"
        :icon="['fas', 'filter']"
      />
    </button>
  </div>
</template>

<script setup>
/* eslint-disable @stylistic/eol-last */
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { computed, onBeforeUnmount, onMounted, ref, shallowRef, useTemplateRef } from 'vue'
import { useI18n } from '../../composables/use-i18n-polyfill'

import FtInput from '../FtInput/FtInput.vue'

import store from '../../store/index'

import { MOBILE_WIDTH_THRESHOLD, SEARCH_RESULTS_DISPLAY_LIMIT } from '../../../constants'
import { debounce, openInternalPath } from '../../helpers/utils'
import { clearLocalSearchSuggestionsSession, getLocalSearchSuggestions } from '../../helpers/api/local'
import { getInvidiousSearchSuggestions } from '../../helpers/api/invidious'

const { t } = useI18n()

/** @type {import('vue').ShallowRef<string[]>} */
const searchSuggestionsDataList = shallowRef([])
const lastSuggestionQuery = ref('')

/** @type {import('vue').ComputedRef<boolean>} */
const hideSearchBar = computed(() => store.getters.getHideSearchBar)
/** @type {import('vue').ComputedRef<boolean>} */
const enableSearchSuggestions = computed(() => store.getters.getEnableSearchSuggestions)

const usingOnlySearchHistoryResults = computed(() => lastSuggestionQuery.value.length === 0)

/** @type {import('vue').ComputedRef<string[]>} */
const latestMatchingSearchHistoryNames = computed(() => {
  return store.getters.getLatestMatchingSearchHistoryNames(lastSuggestionQuery.value)
})

/** @type {import('vue').ComputedRef<string[]>} */
const latestSearchHistoryNames = computed(() => store.getters.getLatestSearchHistoryNames)

const activeDataList = computed(() => {
  // show latest search history when the search bar is empty
  if (usingOnlySearchHistoryResults.value) {
    return latestSearchHistoryNames.value
  }

  const searchResults = [...latestMatchingSearchHistoryNames.value]

  if (enableSearchSuggestions.value) {
    for (const searchSuggestion of searchSuggestionsDataList.value) {
      // prevent duplicate results between search history entries and YT search suggestions
      if (latestMatchingSearchHistoryNames.value.includes(searchSuggestion)) {
        continue
      }

      searchResults.push(searchSuggestion)

      if (searchResults.length === SEARCH_RESULTS_DISPLAY_LIMIT) {
        break
      }
    }
  }

  return searchResults
})

const activeDataListProperties = computed(() => {
  const searchHistoryEntriesCount = usingOnlySearchHistoryResults.value
    ? latestSearchHistoryNames.value.length
    : latestMatchingSearchHistoryNames.value.length

  const properties = []

  for (let i = 0; i < activeDataList.value.length; i++) {
    properties.push(i < searchHistoryEntriesCount
      ? { isRemoveable: true, iconName: 'clock-rotate-left' }
      : { isRemoveable: false, iconName: 'magnifying-glass' }
    )
  }

  return properties
})

/** @type {import('vue').ComputedRef<boolean>} */
const searchFilterValueChanged = computed(() => store.getters.getSearchFilterValueChanged)

function showSearchFilters() {
  store.dispatch('showSearchFilters')
}

const searchInput = useTemplateRef('searchInput')

/** @type {import('vue').ComputedRef<any>} */
const searchSettings = computed(() => store.getters.getSearchSettings)

/**
 * @param {string} queryText
 * @param {object} options
 * @param {MouseEvent} options.event
 */
function goToSearch(queryText, { event }) {
  const doCreateNewWindow = event && event.shiftKey

  if (window.innerWidth <= MOBILE_WIDTH_THRESHOLD) {
    searchInput.value?.blur()
  } else {
    searchInput.value?.blur()
  }

  clearLocalSearchSuggestionsSession()

  store.dispatch('getYoutubeUrlInfo', queryText).then((result) => {
    switch (result.urlType) {
      case 'video': {
        const { videoId, timestamp, playlistId } = result

        const query = {}
        if (timestamp) {
          query.timestamp = timestamp
        }
        if (playlistId && playlistId.length > 0) {
          query.playlistId = playlistId
        }

        openInternalPath({
          path: `/watch/${videoId}`,
          query,
          doCreateNewWindow,
          searchQueryText: queryText,
        })
        break
      }

      case 'playlist': {
        const { playlistId, query } = result

        openInternalPath({
          path: `/playlist/${playlistId}`,
          query,
          doCreateNewWindow,
          searchQueryText: queryText,
        })
        break
      }

      case 'search': {
        const { searchQuery, query } = result

        openInternalPath({
          path: `/search/${encodeURIComponent(searchQuery)}`,
          query,
          doCreateNewWindow,
          searchQueryText: searchQuery,
        })
        break
      }

      case 'hashtag': {
        const { hashtag } = result
        openInternalPath({
          path: `/hashtag/${encodeURIComponent(hashtag)}`,
          doCreateNewWindow,
          searchQueryText: `#${hashtag}`,
        })

        break
      }

      case 'post': {
        const { postId, query } = result

        openInternalPath({
          path: `/post/${postId}`,
          query,
          doCreateNewWindow,
          searchQueryText: queryText,
        })
        break
      }

      case 'channel': {
        const { channelId, subPath, url } = result

        openInternalPath({
          path: `/channel/${channelId}/${subPath}`,
          doCreateNewWindow,
          query: {
            url,
          },
          searchQueryText: queryText,
        })
        break
      }

      case 'trending':
      case 'subscriptions':
      case 'history':
      case 'userplaylists':
        openInternalPath({
          path: `/${result.urlType}`,
          doCreateNewWindow,
          searchQueryText: queryText
        })
        break

      case 'invalid_url':
      default: {
        openInternalPath({
          path: `/search/${encodeURIComponent(queryText)}`,
          query: {
            sortBy: searchSettings.value.sortBy,
            time: searchSettings.value.time,
            type: searchSettings.value.type,
            duration: searchSettings.value.duration,
            // Array proxy cannot be cloned during IPC call
            features: [...searchSettings.value.features],
          },
          doCreateNewWindow,
          searchQueryText: queryText,
        })
      }
    }

    if (doCreateNewWindow) {
      // Query text copied to new window = can be removed from current window
      updateSearchInputText('')
    }
  })
}

function clearLastSuggestionQuery() {
  lastSuggestionQuery.value = ''
}

/**
 * @param {string} text
 */
function updateSearchInputText(text) {
  searchInput.value?.setText(text)
}

/**
 * @param {string} query
 */
function getSearchSuggestionsDebounce(query) {
  if (query === lastSuggestionQuery.value) {
    return
  }

  lastSuggestionQuery.value = query

  if (enableSearchSuggestions.value) {
    debounceSearchResults(query.trim())
  }
}

/** @type {import('vue').ComputedRef<'local' | 'invidious'>} */
const backendPreference = computed(() => store.getters.getBackendPreference)
/** @type {import('vue').ComputedRef<boolean>} */
const backendFallback = computed(() => store.getters.getBackendFallback)

const debounceSearchResults = debounce(/** @param {string} query */(query) => {
  if (!process.env.SUPPORTS_LOCAL_API || backendPreference.value === 'invidious') {
    getSearchSuggestionsInvidious(query)
  } else {
    getSearchSuggestionsLocal(query)
  }
}, 200)

/**
 * @param {string} query
 */
async function getSearchSuggestionsLocal(query) {
  searchSuggestionsDataList.value = query.length > 0
    ? await getLocalSearchSuggestions(query)
    : []
}

async function getSearchSuggestionsInvidious(query) {
  if (query === '') {
    searchSuggestionsDataList.value = []
    return
  }

  try {
    searchSuggestionsDataList.value = (await getInvidiousSearchSuggestions(query)).suggestions
  } catch (err) {
    console.error(err)

    if (process.env.SUPPORTS_LOCAL_API && backendFallback.value) {
      console.error(
        'Error gettings search suggestions.  Falling back to Local API'
      )
      getSearchSuggestionsLocal(query)
    }
  }
}

/**
 * @param {string} query
 */
function removeSearchHistoryEntryInDbAndCache(query) {
  store.dispatch('removeSearchHistoryEntry', query)
  store.commit('removeFromSessionSearchHistory', query)
}

/**
 * @param {KeyboardEvent} event
 */
function handleKeyboardShortcuts(event) {
  const ctrlOrCommandPressed = (process.platform !== 'darwin' && event.ctrlKey) ||
    (process.platform === 'darwin' && event.metaKey)

  if (
    !hideSearchBar.value &&
    (
      (ctrlOrCommandPressed && (event.key === 'L' || event.key === 'l')) ||
      (event.altKey && (event.key === 'D' || event.key === 'd' || (process.platform === 'darwin' && event.key === '∂')))
    )
  ) {
    event.preventDefault()

    // prevent KDE Plasma selection clipboard quirk (see issue #2019)
    setTimeout(() => {
      searchInput.value?.focus()
      searchInput.value?.select()
    }, 0)
  }
}

onMounted(() => {
  if (process.env.IS_ELECTRON) {
    window.addEventListener('keydown', handleKeyboardShortcuts)

    window.ftElectron.handleUpdateSearchInputText((searchQueryText) => {
      if (searchQueryText) {
        updateSearchInputText(searchQueryText)
      }
    })
  }
})

onBeforeUnmount(() => {
  if (process.env.IS_ELECTRON) {
    window.removeEventListener('keydown', handleKeyboardShortcuts)
    window.ftElectron.handleUpdateSearchInputText(null)
  }
})
</script>

<style scoped>
.sideNavSearch {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px;
}

.searchInput {
  flex: 1;
  min-inline-size: 0;
}

.navFilterButton {
  border-radius: 50%;
  border-style: none;
  background-color: transparent;
  color: var(--primary-text-color);
  cursor: pointer;
  font-size: 18px;
  line-height: 1em;
  padding: 8px;
  transition: background 0.2s ease-out;
}

.navFilterButton:hover {
  background-color: var(--side-nav-hover-color);
  color: var(--side-nav-hover-text-color);
}

.navFilterButton:active {
  background-color: var(--side-nav-active-color);
  color: var(--side-nav-active-text-color);
}

.navFilterButton.filterChanged {
  box-shadow: 0 0 16px var(--primary-color);
  color: var(--primary-color);
}
/* end */
</style>