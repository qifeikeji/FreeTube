<template>
  <nav
    class="topNav"
    :class="{ topNavBarColor: barColor }"
  >
    <div class="side">
      <button
        class="menuButton navButton"
        :aria-label="expandCollapseSideBarLabel"
        :title="expandCollapseSideBarLabel"
        @click="toggleSideNav"
      >
        <FontAwesomeIcon
          class="navIcon"
          :icon="['fas', 'bars']"
        />
      </button>
      <FtIconButton
        class="navIconButton"
        :disabled="isArrowBackwardDisabled"
        :class="{ arrowDisabled: isArrowBackwardDisabled }"
        :icon="['fas', 'arrow-left']"
        :theme="null"
        :size="20"
        :use-shadow="false"
        dropdown-position-x="right"
        :dropdown-options="navigationHistoryDropdownOptions"
        open-on-right-or-long-click
        :title="backwardText"
        @click="historyBack"
      />
      <FtIconButton
        class="navIconButton"
        :disabled="isArrowForwardDisabled"
        :class="{ arrowDisabled: isArrowForwardDisabled }"
        :icon="['fas', 'arrow-right']"
        :theme="null"
        :size="20"
        :use-shadow="false"
        dropdown-position-x="right"
        :dropdown-options="navigationHistoryDropdownOptions"
        open-on-right-or-long-click
        :title="forwardText"
        @click="historyForward"
      />
      <button
        class="navNewWindowButton navButton"
        :aria-label="t('Open New Window')"
        :title="newWindowText"
        @click="createNewWindow"
      >
        <FontAwesomeIcon
          class="navIcon"
          :icon="['fas', 'clone']"
        />
      </button>
      <RouterLink
        v-if="!hideHeaderLogo"
        class="logo"
        dir="ltr"
        :title="headerLogoTitle"
        :to="landingPage"
      >
        <div
          class="logoIcon"
        />
        <div
          class="logoText"
        />
      </RouterLink>
    </div>
    <div class="middle">
      <FtProfileSelector display-mode="buttons" />
    </div>
    <div class="side profiles" />
  </nav>
</template>

<script setup>
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { computed, nextTick, onMounted, ref, shallowRef, watch } from 'vue'
import { useI18n } from '../../composables/use-i18n-polyfill'
import { useRoute, useRouter } from 'vue-router'

import FtProfileSelector from '../FtProfileSelector/FtProfileSelector.vue'
import FtIconButton from '../FtIconButton/FtIconButton.vue'

import store from '../../store/index'

import { KeyboardShortcuts } from '../../../constants'
import { localizeAndAddKeyboardShortcutToActionTitle } from '../../helpers/utils'
import { translateWindowTitle } from '../../helpers/strings'

const { t } = useI18n()
const router = useRouter()
const route = useRoute()

/** @type {import('vue').ShallowRef<string[]>} */
const navigationHistoryDropdownOptions = shallowRef([])

/** @type {import('vue').ComputedRef<boolean>} */
const hideHeaderLogo = computed(() => store.getters.getHideHeaderLogo)
/** @type {import('vue').ComputedRef<string>} */
const barColor = computed(() => store.getters.getBarColor)

const expandCollapseSideBarLabel = computed(() => {
  return store.getters.getIsSideNavOpen ? t('Compact side navigation') : t('Expand side navigation')
})

const landingPage = computed(() => '/' + store.getters.getLandingPage)

const headerLogoTitle = computed(() => {
  return t('Go to page', {
    page: translateWindowTitle(
      router.getRoutes()
        .find((route) => route.path === landingPage.value)
        .meta.title)
  })
})

const navigationHistoryAddendum = computed(() => {
  return navigationHistoryDropdownOptions.value.length === 0
    ? ''
    : `\n${t('Right-click or hold to see history')}`
})

const backwardText = computed(() => {
  const shortcuts = process.platform === 'darwin'
    ? [
        KeyboardShortcuts.APP.GENERAL.HISTORY_BACKWARD,
        KeyboardShortcuts.APP.GENERAL.HISTORY_BACKWARD_ALT_MAC
      ]
    : KeyboardShortcuts.APP.GENERAL.HISTORY_BACKWARD

  return localizeAndAddKeyboardShortcutToActionTitle(
    t('Back'),
    shortcuts
  ) + navigationHistoryAddendum.value
})

const forwardText = computed(() => {
  const shortcuts = process.platform === 'darwin'
    ? [
        KeyboardShortcuts.APP.GENERAL.HISTORY_FORWARD,
        KeyboardShortcuts.APP.GENERAL.HISTORY_FORWARD_ALT_MAC
      ]
    : KeyboardShortcuts.APP.GENERAL.HISTORY_FORWARD

  return localizeAndAddKeyboardShortcutToActionTitle(
    t('Forward'),
    shortcuts
  ) + navigationHistoryAddendum.value
})

/**
 * @param {number} offset
 */
function goToOffset(offset) {
  // no point navigating to the current route
  if (offset !== 0) {
    router.go(offset)
  }
}

/**
 * @param {number} [offset]
 */
function historyBack(offset) {
  if (offset != null) {
    goToOffset(offset)
  } else {
    router.back()
  }
}

/**
 * @param {number} [offset]
 */
function historyForward(offset) {
  if (offset != null) {
    goToOffset(offset)
  } else {
    router.forward()
  }
}

const newWindowText = computed(() => {
  return localizeAndAddKeyboardShortcutToActionTitle(
    t('Open New Window'),
    KeyboardShortcuts.APP.GENERAL.NEW_WINDOW
  )
})

function createNewWindow() {
  const url = new URL(window.location.href)
  url.hash = landingPage.value

  window.open(url.toString(), '_blank', 'noreferrer')
}

const isArrowBackwardDisabled = ref(true)
const isArrowForwardDisabled = ref(true)

if (process.env.IS_ELECTRON || 'navigation' in window) {
  watch(route, () => {
    setNavigationHistoryDropdownOptions()

    isArrowForwardDisabled.value = !window.navigation.canGoForward
    isArrowBackwardDisabled.value = !window.navigation.canGoBack
  }, { deep: true })
} else {
  // If the Navigation API isn't supported (Firefox and Safari)
  // keep the back and forwards buttons always enabled
  isArrowBackwardDisabled.value = false
  isArrowForwardDisabled.value = false
}

let navigationHistoryDropdownActiveEntry = null
let isLoadingNavigationHistory = false
let pendingNavigationHistoryLabel = null

async function setNavigationHistoryDropdownOptions() {
  if (process.env.IS_ELECTRON) {
    isLoadingNavigationHistory = true
    const dropdownOptions = await window.ftElectron.getNavigationHistory()

    const activeEntry = dropdownOptions.find(option => option.active)

    if (pendingNavigationHistoryLabel) {
      activeEntry.label = pendingNavigationHistoryLabel
    }

    navigationHistoryDropdownOptions.value = dropdownOptions
    navigationHistoryDropdownActiveEntry = activeEntry
    isLoadingNavigationHistory = false
  }
}

/** @type {import('vue').ComputedRef<string>} */
const appTitle = computed(() => store.getters.getAppTitle)

watch(appTitle, (value) => {
  nextTick(() => {
    if (isLoadingNavigationHistory) {
      pendingNavigationHistoryLabel = value
    } else if (navigationHistoryDropdownActiveEntry) {
      navigationHistoryDropdownActiveEntry.label = value
    }
  })
})

function toggleSideNav() {
  store.commit('toggleSideNav')
}

onMounted(() => {
  // Store is not up-to-date when the component mounts, so we use timeout.
  setTimeout(() => {
    if (store.getters.getExpandSideBar) {
      toggleSideNav()
    }
  }, 0)

  setNavigationHistoryDropdownOptions()
})
</script>

<style scoped lang="scss" src="./TopNav.scss" />
