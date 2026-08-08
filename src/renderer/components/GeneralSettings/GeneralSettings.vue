<template>
  <FtSettingsSection
    :title="t('Settings.General Settings.General Settings')"
  >
    <div class="switchColumnGrid">
      <div class="switchColumn">
        <FtToggleSwitch
          :label="t('Settings.General Settings.Check for Updates')"
          :default-value="checkForUpdates"
          :compact="true"
          @change="updateCheckForUpdates"
        />
        <FtToggleSwitch
          :label="t('Settings.General Settings.Auto Load Next Page.Label')"
          :default-value="generalAutoLoadMorePaginatedItemsEnabled"
          :compact="true"
          :tooltip="t('Settings.General Settings.Auto Load Next Page.Tooltip')"
          @change="updateGeneralAutoLoadMorePaginatedItemsEnabled"
        />
      </div>
      <div class="switchColumn">
        <FtToggleSwitch
          :label="t('Settings.General Settings.Enable Search Suggestions')"
          :default-value="enableSearchSuggestions"
          :compact="true"
          @change="updateEnableSearchSuggestions"
        />
        <FtToggleSwitch
          v-if="USING_ELECTRON"
          :label="t('Settings.General Settings.Open Deep Links In New Window')"
          :default-value="openDeepLinksInNewWindow"
          :compact="true"
          :tooltip="t('Tooltips.General Settings.Open Deep Links In New Window')"
          @change="updateOpenDeepLinksInNewWindow"
        />
        <FtToggleSwitch
          v-if="!IS_MAC && USING_ELECTRON"
          :label="t('Settings.General Settings.Minimize to system tray')"
          :default-value="hideToTrayOnMinimize"
          :compact="true"
          @change="updateHideToTrayOnMinimize"
        />
        <FtToggleSwitch
          :label="t('Settings.General Settings.Prefer Original Titles')"
          :default-value="preferOriginalTitles"
          :compact="true"
          :tooltip="t('Tooltips.General Settings.Prefer Original Titles')"
          @change="updatePreferOriginalTitles"
        />
      </div>
    </div>
    <div class="switchGrid">
      <FtSelect
        :placeholder="t('Settings.General Settings.Default Landing Page')"
        :value="landingPage"
        :select-names="defaultPageNames"
        :select-values="defaultPageValues"
        :icon="['fas', 'location-dot']"
        @change="updateLandingPage"
      />
      <FtSelect
        :placeholder="t('Settings.General Settings.Video View Type.Video View Type')"
        :value="listType"
        :select-names="viewTypeNames"
        :select-values="VIEW_TYPE_VALUES"
        :icon="listType === 'grid' ? ['fas', 'grip'] : ['fas', 'list']"
        @change="updateListType"
      />
      <FtInput
        :placeholder="t('Settings.General Settings.Video Grid Min Column Width')"
        :show-action-button="false"
        :show-label="true"
        input-type="number"
        :min="180"
        :max="600"
        :value="videoGridMinColumnWidthString"
        :tooltip="t('Tooltips.General Settings.Video Grid Min Column Width')"
        @input="handleVideoGridMinColumnWidthInput"
      />
      <FtInput
        :placeholder="t('Settings.General Settings.Video Card Border Radius')"
        :show-action-button="false"
        :show-label="true"
        input-type="number"
        :min="0"
        :max="40"
        :value="videoCardBorderRadiusString"
        :tooltip="t('Tooltips.General Settings.Video Card Border Radius')"
        @input="handleVideoCardBorderRadiusInput"
      />
      <FtInput
        :placeholder="t('Settings.General Settings.Video Card Thumbnail Padding')"
        :show-action-button="false"
        :show-label="true"
        input-type="number"
        :min="0"
        :max="30"
        :value="videoCardThumbPaddingString"
        :tooltip="t('Tooltips.General Settings.Video Card Thumbnail Padding')"
        @input="handleVideoCardThumbPaddingInput"
      />
      <FtSelect
        :placeholder="t('Settings.General Settings.Thumbnail Preference.Thumbnail Preference')"
        :value="thumbnailPreference"
        :select-names="thumbnailTypeNames"
        :select-values="THUMBNAIL_TYPE_VALUES"
        :tooltip="t('Tooltips.General Settings.Thumbnail Preference')"
        :icon="['fas', 'images']"
        @change="handleThumbnailPreferenceChange"
      />
      <FtInput
        :placeholder="t('Settings.General Settings.Side Nav Width (px)')"
        :show-action-button="false"
        :show-label="true"
        input-type="number"
        :min="180"
        :max="800"
        :value="sideNavWidthPxString"
        @input="handleSideNavWidthPxInput"
      />
      <FtSelect
        :placeholder="t('Settings.General Settings.Locale Preference')"
        :value="currentLocale"
        :select-names="localeNames"
        :select-values="LOCALE_VALUES"
        :icon="['fas', 'language']"
        :is-locale-selector="true"
        @change="updateCurrentLocale"
      />
      <FtSelect
        v-if="regionDataLoaded"
        :placeholder="t('Settings.General Settings.Region for Trending')"
        :value="region"
        :select-names="regionNames"
        :select-values="regionValues"
        :icon="['fas', 'globe']"
        :tooltip="t('Tooltips.General Settings.Region for Trending')"
        @change="updateRegion"
      />
      <FtSelect
        :placeholder="t('Settings.General Settings.External Link Handling.External Link Handling')"
        :value="externalLinkHandling"
        :select-names="externalLinkHandlingNames"
        :select-values="EXTERNAL_LINK_HANDLING_VALUES"
        :icon="['fas', 'external-link-alt']"
        :tooltip="t('Tooltips.General Settings.External Link Handling')"
        @change="updateExternalLinkHandling"
      />
    </div>
  </FtSettingsSection>
</template>

<script setup>
import { computed } from 'vue'
import { useI18n } from '../../composables/use-i18n-polyfill'
import { useRouter } from 'vue-router'

import FtSettingsSection from '../FtSettingsSection/FtSettingsSection.vue'
import FtSelect from '../FtSelect/FtSelect.vue'
import FtInput from '../FtInput/FtInput.vue'
import FtToggleSwitch from '../FtToggleSwitch/FtToggleSwitch.vue'

import store from '../../store/index'

import allLocales from '../../../../static/locales/activeLocales.json'
import { debounce } from '../../helpers/utils'
import { translateWindowTitle } from '../../helpers/strings'

const USING_ELECTRON = !!process.env.IS_ELECTRON
const IS_MAC = process.platform === 'darwin'

const { t } = useI18n()
const router = useRouter()

/** @type {import('vue').ComputedRef<number>} */
const sideNavWidthPx = computed(() => store.getters.getSideNavWidthPx)
const sideNavWidthPxString = computed(() => String(sideNavWidthPx.value ?? 300))

const sideNavWidthDebouncedUpdate = debounce((value) => {
  store.dispatch('updateSideNavWidthPx', value)
}, 250)

/**
 * @param {string} value
 */
function handleSideNavWidthPxInput(value) {
  const parsed = Math.round(Number(value))
  if (!Number.isFinite(parsed)) { return }
  const clamped = Math.min(Math.max(parsed, 180), 800)
  sideNavWidthDebouncedUpdate(clamped)
}

/** @type {import('vue').ComputedRef<number>} */
const videoGridMinColumnWidth = computed(() => store.getters.getVideoGridMinColumnWidth)
const videoGridMinColumnWidthString = computed(() => String(videoGridMinColumnWidth.value ?? 300))

const videoGridMinColumnWidthDebouncedUpdate = debounce((value) => {
  store.dispatch('updateVideoGridMinColumnWidth', value)
}, 250)

/**
 * @param {string} value
 */
function handleVideoGridMinColumnWidthInput(value) {
  const parsed = Math.round(Number(value))
  if (!Number.isFinite(parsed)) { return }
  const clamped = Math.min(Math.max(parsed, 180), 600)
  videoGridMinColumnWidthDebouncedUpdate(clamped)
}

/** @type {import('vue').ComputedRef<number>} */
const videoCardBorderRadius = computed(() => store.getters.getVideoCardBorderRadius)
const videoCardBorderRadiusString = computed(() => String(videoCardBorderRadius.value ?? 14))

const videoCardBorderRadiusDebouncedUpdate = debounce((value) => {
  store.dispatch('updateVideoCardBorderRadius', value)
}, 250)

/**
 * @param {string} value
 */
function handleVideoCardBorderRadiusInput(value) {
  const parsed = Math.round(Number(value))
  if (!Number.isFinite(parsed)) { return }
  const clamped = Math.min(Math.max(parsed, 0), 40)
  videoCardBorderRadiusDebouncedUpdate(clamped)
}

/** @type {import('vue').ComputedRef<number>} */
const videoCardThumbPadding = computed(() => store.getters.getVideoCardThumbPadding)
const videoCardThumbPaddingString = computed(() => String(videoCardThumbPadding.value ?? 10))

const videoCardThumbPaddingDebouncedUpdate = debounce((value) => {
  store.dispatch('updateVideoCardThumbPadding', value)
}, 250)

/**
 * @param {string} value
 */
function handleVideoCardThumbPaddingInput(value) {
  const parsed = Math.round(Number(value))
  if (!Number.isFinite(parsed)) { return }
  const clamped = Math.min(Math.max(parsed, 0), 30)
  videoCardThumbPaddingDebouncedUpdate(clamped)
}

/** @type {import('vue').ComputedRef<boolean>} */
const checkForUpdates = computed(() => store.getters.getCheckForUpdates)

/**
 * @param {boolean} value
 */
function updateCheckForUpdates(value) {
  store.dispatch('updateCheckForUpdates', value)
}

/** @type {import('vue').ComputedRef<boolean>} */
const generalAutoLoadMorePaginatedItemsEnabled = computed(() => {
  return store.getters.getGeneralAutoLoadMorePaginatedItemsEnabled
})

/**
 * @param {boolean} value
 */
function updateGeneralAutoLoadMorePaginatedItemsEnabled(value) {
  store.dispatch('updateGeneralAutoLoadMorePaginatedItemsEnabled', value)
}

/** @type {import('vue').ComputedRef<boolean>} */
const hideToTrayOnMinimize = computed(() => store.getters.getHideToTrayOnMinimize)

/**
 * @param {boolean} value
 */
function updateHideToTrayOnMinimize(value) {
  store.dispatch('updateHideToTrayOnMinimize', value)
}

/** @type {import('vue').ComputedRef<boolean>} */
const preferOriginalTitles = computed(() => store.getters.getPreferOriginalTitles)

/**
 * @param {boolean} value
 */
function updatePreferOriginalTitles(value) {
  store.dispatch('updatePreferOriginalTitles', value)
}

/** @type {import('vue').ComputedRef<boolean>} */
const enableSearchSuggestions = computed(() => store.getters.getEnableSearchSuggestions)

/**
 * @param {boolean} value
 */
function updateEnableSearchSuggestions(value) {
  store.dispatch('updateEnableSearchSuggestions', value)
}

/** @type {import('vue').ComputedRef<boolean>} */
const openDeepLinksInNewWindow = computed(() => store.getters.getOpenDeepLinksInNewWindow)

/**
 * @param {boolean} value
 */
function updateOpenDeepLinksInNewWindow(value) {
  store.dispatch('updateOpenDeepLinksInNewWindow', value)
}

/** @type {import('vue').ComputedRef<boolean>} */
const hidePlaylists = computed(() => store.getters.getHidePlaylists)

/** @type {import('vue').ComputedRef<boolean>} */
const hideTrendingVideos = computed(() => store.getters.getHideTrendingVideos)

const INCLUDED_DEFAULT_PAGE_NAMES = [
  'subscriptions',
  'subscribedChannels',
  'userPlaylists',
  'history',
  'settings',
  ...(process.env.SUPPORTS_LOCAL_API ? ['trending'] : [])
]

const defaultPages = computed(() => {
  let includedPageNames = INCLUDED_DEFAULT_PAGE_NAMES

  if (hideTrendingVideos.value) {
    includedPageNames = includedPageNames.filter((pageName) => pageName !== 'trending')
  }

  if (hidePlaylists.value) {
    includedPageNames = includedPageNames.filter((pageName) => pageName !== 'userPlaylists')
  }

  return router.getRoutes().filter((route) => includedPageNames.includes(route.name))
})

const defaultPageNames = computed(() => defaultPages.value.map((route) => translateWindowTitle(route.meta.title)))

const defaultPageValues = computed(() => {
  // avoid Vue parsing issues by excluding '/' from path values
  return defaultPages.value.map((route) => route.path.slice(1))
})

/** @type {import('vue').ComputedRef<'subscriptions' | 'subscribedChannels' | 'userPlaylists' | 'history' | 'settings' | 'trending'>} */
const landingPage = computed(() => store.getters.getLandingPage)

/**
 * @param {'subscriptions' | 'subscribedChannels' | 'userPlaylists' | 'history' | 'settings' | 'trending'} value
 */
function updateLandingPage(value) {
  store.dispatch('updateLandingPage', value)
}

const VIEW_TYPE_VALUES = ['grid', 'list']

const viewTypeNames = computed(() => [
  t('Settings.General Settings.Video View Type.Grid'),
  t('Settings.General Settings.Video View Type.List')
])

/** @type {import('vue').ComputedRef<'grid' | 'list'>} */
const listType = computed(() => store.getters.getListType)

/**
 * @param {'grid' | 'list'} value
 */
function updateListType(value) {
  store.dispatch('updateListType', value)
}

const THUMBNAIL_TYPE_VALUES = ['', 'start', 'middle', 'end', 'hidden', 'blur']

const thumbnailTypeNames = computed(() => [
  t('Settings.General Settings.Thumbnail Preference.Default'),
  t('Settings.General Settings.Thumbnail Preference.Beginning'),
  t('Settings.General Settings.Thumbnail Preference.Middle'),
  t('Settings.General Settings.Thumbnail Preference.End'),
  t('Settings.General Settings.Thumbnail Preference.Hidden'),
  t('Settings.General Settings.Thumbnail Preference.Blur')
])

/** @type {import('vue').ComputedRef<boolean>} */
const blurThumbnails = computed(() => store.getters.getBlurThumbnails)

/** @type {import('vue').ComputedRef<'' | 'start' | 'middle' | 'end' | 'hidden' | 'blur'>} */
const thumbnailPreference = computed(() => {
  return blurThumbnails.value ? 'blur' : store.getters.getThumbnailPreference
})

/**
 * @param {'' | 'start' | 'middle' | 'end' | 'hidden' | 'blur'} value
 */
function handleThumbnailPreferenceChange(value) {
  store.dispatch('updateBlurThumbnails', value === 'blur')
  store.dispatch('updateThumbnailPreference', value)
}

const LOCALE_VALUES = ['system', ...allLocales]

const localeNames = computed(() => [
  t('Settings.General Settings.System Default'),
  ...process.env.LOCALE_NAMES
])

/** @type {import('vue').ComputedRef<string>} */
const currentLocale = computed(() => store.getters.getCurrentLocale)

/**
 * @param {string} value
 */
function updateCurrentLocale(value) {
  store.dispatch('updateCurrentLocale', value)
}

/** @type {import('vue').ComputedRef<string[]>} */
const regionNames = computed(() => store.getters.getRegionNames)

/** @type {import('vue').ComputedRef<string[]>} */
const regionValues = computed(() => store.getters.getRegionValues)

const regionDataLoaded = computed(() => regionValues.value.length > 0)

/** @type {import('vue').ComputedRef<string>} */
const region = computed(() => store.getters.getRegion)

/**
 * @param {string} value
 */
function updateRegion(value) {
  store.dispatch('updateRegion', value)
}

const EXTERNAL_LINK_HANDLING_VALUES = ['', 'openLinkAfterPrompt', 'doNothing']

const externalLinkHandlingNames = computed(() => [
  t('Settings.General Settings.External Link Handling.Open Link'),
  t('Settings.General Settings.External Link Handling.Ask Before Opening Link'),
  t('Settings.General Settings.External Link Handling.No Action')
])

/** @type {import('vue').ComputedRef<'' | 'openLinkAfterPrompt' | 'doNothing'>} */
const externalLinkHandling = computed(() => store.getters.getExternalLinkHandling)

/**
 * @param {'' | 'openLinkAfterPrompt' | 'doNothing'} value
 */
function updateExternalLinkHandling(value) {
  store.dispatch('updateExternalLinkHandling', value)
}
</script>

<style scoped src="./GeneralSettings.css" />
