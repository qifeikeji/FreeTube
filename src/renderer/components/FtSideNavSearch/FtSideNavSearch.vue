<template>
  <div
    v-if="!hideSearchBar"
    class="sideNavSearch"
    :class="{ compact }"
  >
    <FtInput
      ref="searchInput"
      :placeholder="t('Search / Go to URL')"
      class="searchInput"
      is-search
      :data-list="activeDataList"
      :data-list-properties="activeDataListProperties"
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
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { computed, onBeforeUnmount, onMounted, ref, shallowRef, useTemplateRef, watch } from 'vue'
import { useI18n } from '../../composables/use-i18n-polyfill'
import { useRoute } from 'vue-router'

import FtInput from '../FtInput/FtInput.vue'

import store from '../../store/index'

import { SEARCH_RESULTS_DISPLAY_LIMIT } from '../../../constants'
import { debounce, openInternalPath } from '../../helpers/utils'
import { clearLocalSearchSuggestionsSession, getLocalSearchSuggestions } from '../../helpers/api/local'
import { getInvidiousSearchSuggestions } from '../../helpers/api/invidious'

const props = defineProps({
  compact: {
    type: Boolean,
    default: false,
  },
  /** When true, Ctrl/Cmd+V pastes clipboard into the search field if focus is not already in an input. */
  enableIdlePaste: {
    type: Boolean,
    default: false,
  },
})

const { t } = useI18n()
const route = useRoute()

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
  if (usingOnlySearchHistoryResults.value) {
    return latestSearchHistoryNames.value
  }

  const searchResults = [...latestMatchingSearchHistoryNames.value]

  if (enableSearchSuggestions.value) {
    for (const searchSuggestion of searchSuggestionsDataList.value) {
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

  searchInput.value?.blur()

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
            prioritize: searchSettings.value.prioritize,
            time: searchSettings.value.time,
            type: searchSettings.value.type,
            duration: searchSettings.value.duration,
            features: [...searchSettings.value.features],
          },
          doCreateNewWindow,
          searchQueryText: queryText,
        })
      }
    }

    if (doCreateNewWindow) {
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

    setTimeout(() => {
      searchInput.value?.focus()
      searchInput.value?.select()
    }, 0)
    return
  }

  if (
    props.enableIdlePaste &&
    !hideSearchBar.value &&
    ctrlOrCommandPressed &&
    (event.key === 'v' || event.key === 'V') &&
    !event.repeat
  ) {
    const active = document.activeElement
    if (
      active instanceof HTMLInputElement ||
      active instanceof HTMLTextAreaElement ||
      active?.isContentEditable
    ) {
      return
    }

    event.preventDefault()

    navigator.clipboard.readText().then((text) => {
      if (typeof text !== 'string' || text.length === 0) {
        return
      }

      updateSearchInputText(text)
      getSearchSuggestionsDebounce(text)
      searchInput.value?.focus()
    }).catch((error) => {
      console.error('Failed to read clipboard for search paste', error)
    })
  }
}

onMounted(() => {
  syncSearchInputFromRoute()

  window.addEventListener('keydown', handleKeyboardShortcuts)

  if (process.env.IS_ELECTRON) {
    window.ftElectron.handleUpdateSearchInputText((searchQueryText) => {
      if (searchQueryText) {
        updateSearchInputText(searchQueryText)
      }
    })
  }
})

function syncSearchInputFromRoute() {
  const queryParam = route.params.query
  if (typeof queryParam !== 'string' || queryParam.length === 0) {
    return
  }

  if (!route.path.startsWith('/search/')) {
    return
  }

  try {
    updateSearchInputText(decodeURIComponent(queryParam))
  } catch {
    updateSearchInputText(queryParam)
  }
}

watch(() => route.path, () => {
  syncSearchInputFromRoute()
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeyboardShortcuts)

  if (process.env.IS_ELECTRON) {
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

.sideNavSearch.compact {
  gap: 6px;
  padding: 0;
  inline-size: 100%;
  max-inline-size: 100%;
  align-items: center;
}

.sideNavSearch.compact :deep(.ft-input-component) {
  box-sizing: border-box;
  block-size: var(--ui-control-height, 36px);
  min-block-size: var(--ui-control-height, 36px);
}

.sideNavSearch.compact :deep(.inputWrapper) {
  block-size: 100%;
  display: flex;
  align-items: center;
}

.sideNavSearch.compact :deep(.ft-input) {
  box-sizing: border-box;
  block-size: var(--ui-control-height, 36px);
  min-block-size: var(--ui-control-height, 36px);
  margin-block: 0;
  margin-inline: 0;
  padding-block: var(--ui-control-padding-block, 8px);
  padding-inline-start: 12px;
  font-size: 14px;
  line-height: 1.25;
  border-radius: var(--ui-control-radius, 10px);
  border: 1px solid var(--ui-glass-border, rgb(255 255 255 / 10%));
  background-color: var(--ui-glass-control, rgb(0 0 0 / 38%));
  color: var(--ui-glass-text, rgb(255 255 255 / 78%));
  backdrop-filter: blur(10px);
  /* stylelint-disable-next-line property-no-vendor-prefix */
  -webkit-backdrop-filter: blur(10px);
}

.sideNavSearch.compact :deep(.showActionButton .ft-input) {
  padding-inline-end: calc(var(--ui-control-height, 36px) + 6px);
}

.sideNavSearch.compact :deep(.clearTextButtonVisible.search .ft-input),
.sideNavSearch.compact :deep(.showClearTextButton:focus-within .ft-input) {
  padding-inline-start: 46px;
}

.sideNavSearch.compact :deep(.ft-input:focus) {
  outline: none;
  border-color: rgb(255 255 255 / 22%);
  box-shadow: 0 0 0 1px rgb(255 255 255 / 8%);
}

.sideNavSearch.compact :deep(.forceTextColor .ft-input),
.sideNavSearch.compact :deep(.forceTextColor .ft-input:focus) {
  background-color: var(--ui-glass-control, rgb(0 0 0 / 38%));
  color: var(--ui-glass-text, rgb(255 255 255 / 78%));
  box-shadow: none;
}

.sideNavSearch.compact :deep(.ft-input::placeholder),
.sideNavSearch.compact :deep(.forceTextColor .ft-input::placeholder),
.sideNavSearch.compact :deep(.forceTextColor ::placeholder) {
  color: rgb(255 255 255 / 42%);
}

:global(body.light) .sideNavSearch.compact :deep(.ft-input::placeholder),
:global(body.light) .sideNavSearch.compact :deep(.forceTextColor .ft-input::placeholder),
:global(body.light) .sideNavSearch.compact :deep(.forceTextColor ::placeholder) {
  color: rgb(0 0 0 / 42%);
}

:global(body.light) .sideNavSearch.compact :deep(.ft-input:focus) {
  border-color: rgb(0 0 0 / 22%);
  box-shadow: 0 0 0 1px rgb(0 0 0 / 8%);
}

:global(body.light) .sideNavSearch.compact .navFilterButton:hover {
  border-color: rgb(0 0 0 / 18%);
}

/* Search history / suggestions dropdown — match search-filter glass standard */
.sideNavSearch.compact :deep(.list) {
  box-sizing: border-box;
  margin-block-start: 6px;
  padding-block: 6px;
  padding-inline: 0;
  border-radius: var(--ui-control-radius, 10px);
  border: 1px solid var(--ui-glass-border, rgb(255 255 255 / 12%));
  background-color: var(--ui-glass-surface, rgb(18 18 18 / 86%)) !important;
  color: var(--ui-glass-text-strong, rgb(255 255 255 / 90%));
  box-shadow: 0 16px 40px rgb(0 0 0 / 40%);
  backdrop-filter: var(--ui-glass-blur, blur(20px) saturate(140%));
  /* stylelint-disable-next-line property-no-vendor-prefix */
  -webkit-backdrop-filter: var(--ui-glass-blur, blur(20px) saturate(140%));
  overflow: hidden;
}

.sideNavSearch.compact :deep(.list li) {
  color: var(--ui-glass-text, rgb(255 255 255 / 78%));
}

.sideNavSearch.compact :deep(.list .hover),
.sideNavSearch.compact :deep(.list li:hover) {
  background-color: rgb(255 255 255 / 10%);
  color: var(--ui-glass-text-strong, rgb(255 255 255 / 92%));
}

.sideNavSearch.compact :deep(.list .searchResultIcon),
.sideNavSearch.compact :deep(.list .removeButton) {
  color: var(--ui-glass-text-muted, rgb(255 255 255 / 55%));
}

.sideNavSearch.compact :deep(.list .removeButton:hover),
.sideNavSearch.compact :deep(.list .removeButtonSelected) {
  color: var(--ui-glass-text-strong, rgb(255 255 255 / 92%));
}

/* Center action icons inside the compact field; keep icon colors unchanged. */
.sideNavSearch.compact :deep(.inputAction),
.sideNavSearch.compact :deep(.clearInputTextButton),
.sideNavSearch.compact :deep(.search .clearInputTextButton) {
  inset-block-start: 50%;
  transform: translateY(-50%);
  margin-block: 0;
  padding: 6px;
  color: var(--ui-glass-text, rgb(255 255 255 / 78%));
}

.sideNavSearch.compact .navFilterButton {
  box-sizing: border-box;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  align-self: center;
  block-size: var(--ui-control-height, 36px);
  inline-size: var(--ui-control-height, 36px);
  min-block-size: var(--ui-control-height, 36px);
  padding: 0;
  font-size: 16px;
  line-height: 1;
  border-radius: var(--ui-control-radius, 10px);
  background-color: var(--ui-glass-control, rgb(0 0 0 / 38%));
  border: 1px solid var(--ui-glass-border, rgb(255 255 255 / 10%));
  color: var(--ui-glass-text, rgb(255 255 255 / 78%));
  backdrop-filter: blur(10px);
  /* stylelint-disable-next-line property-no-vendor-prefix */
  -webkit-backdrop-filter: blur(10px);
}

.sideNavSearch.compact .navFilterButton:hover {
  background-color: var(--ui-glass-control-hover, rgb(0 0 0 / 52%));
  border-color: rgb(255 255 255 / 18%);
  color: var(--ui-glass-text-strong, rgb(255 255 255 / 92%));
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
</style>
