<template>
  <FtSettingsSection
    :title="$t('Settings.Theme Settings.Theme Settings')"
  >
    <div class="switchColumnGrid">
      <div class="switchColumn">
        <FtToggleSwitch
          :label="$t('Settings.Theme Settings.Match Top Bar with Main Color')"
          compact
          :default-value="barColor"
          @change="updateBarColor"
        />
        <FtToggleSwitch
          :label="$t('Settings.Theme Settings.Expand Side Bar by Default')"
          compact
          :default-value="expandSideBar"
          @change="handleExpandSideBar"
        />
        <FtToggleSwitch
          v-if="usingElectron"
          :label="$t('Settings.Theme Settings.Disable Smooth Scrolling')"
          compact
          :default-value="disableSmoothScrollingToggleValue"
          @change="handleRestartPrompt"
        />
      </div>
      <div class="switchColumn">
        <FtToggleSwitch
          :label="$t('Settings.Theme Settings.Hide Side Bar Labels')"
          compact
          :default-value="hideLabelsSideBar"
          @change="updateHideLabelsSideBar"
        />
        <FtToggleSwitch
          :label="$t('Settings.Theme Settings.Hide FreeTube Header Logo')"
          compact
          :default-value="hideHeaderLogo"
          @change="updateHideHeaderLogo"
        />
      </div>
    </div>
    <template v-if="usingElectron">
      <FtFlexBox>
        <FtSlider
          :label="$t('Settings.Theme Settings.UI Scale')"
          :default-value="uiScale"
          :min-value="50"
          :max-value="300"
          :step="5"
          value-extension="%"
          @change="updateUiScale"
        />
      </FtFlexBox>
      <br>
      <FtFlexBox class="titleBarSettings">
        <div class="titleBarColorSection">
          <label for="windowTitleBarColorPicker">{{ $t('Settings.Theme Settings.Window Title Bar Color') }}</label>
          <div class="titleBarColorControls">
            <input
              id="windowTitleBarColorPicker"
              type="color"
              :value="windowTitleBarColor"
              @input="updateWindowTitleBarColor($event.target.value)"
            >
            <FtInput
              class="titleBarColorValue"
              placeholder=""
              :value="windowTitleBarColor"
              :show-action-button="false"
              :disabled="true"
            />
          </div>
        </div>
        <FtInput
          :placeholder="$t('Settings.Theme Settings.Window Title Suffix')"
          :show-action-button="false"
          :show-label="true"
          :value="windowTitleSuffix"
          :maxlength="64"
          :tooltip="$t('Tooltips.Theme Settings.Window Title Suffix')"
          @input="updateWindowTitleSuffix"
        />
      </FtFlexBox>
      <br>
    </template>
    <FtFlexBox class="themeSelectors">
      <FtSelect
        :placeholder="$t('Settings.Theme Settings.Base Theme.Base Theme')"
        :value="resolvedBaseTheme"
        :select-names="baseThemeNames"
        :select-values="BASE_THEME_VALUES"
        :icon="['fas', 'palette']"
        @change="updateBaseTheme"
      />
      <FtSlider
        :label="$t('Settings.Theme Settings.Side Nav Darken Percent')"
        :default-value="sideNavDarkenPercent"
        :min-value="0"
        :max-value="100"
        :step="1"
        value-extension="%"
        @change="updateSideNavDarkenPercent"
      />
    </FtFlexBox>
    <FtFlexBox class="themeColorRow">
      <FtSelect
        :placeholder="$t('Settings.Theme Settings.Main Color Theme.Main Color Theme')"
        :value="resolvedMainColor"
        :select-names="colorNames"
        :select-values="COLOR_VALUES"
        :icon="['fas', 'palette']"
        icon-color="var(--primary-color)"
        @change="updateMainColor"
      />
      <label
        class="themeColorPicker"
        :title="$t('Settings.Theme Settings.Pick Custom Color')"
      >
        <span
          class="themeColorPickerSwatch"
          :style="{ backgroundColor: displayedMainColor }"
        />
        <input
          type="color"
          class="themeColorPickerInput"
          :value="displayedMainColor"
          :aria-label="$t('Settings.Theme Settings.Pick Custom Color')"
          @input="updateMainColorCustomHex($event.target.value)"
        >
      </label>
      <FtSelect
        :placeholder="$t('Settings.Theme Settings.Secondary Color Theme')"
        :value="resolvedSecColor"
        :select-names="colorNames"
        :select-values="COLOR_VALUES"
        :icon="['fas', 'palette']"
        icon-color="var(--accent-color)"
        @change="updateSecColor"
      />
      <label
        class="themeColorPicker"
        :title="$t('Settings.Theme Settings.Pick Custom Color')"
      >
        <span
          class="themeColorPickerSwatch"
          :style="{ backgroundColor: displayedSecColor }"
        />
        <input
          type="color"
          class="themeColorPickerInput"
          :value="displayedSecColor"
          :aria-label="$t('Settings.Theme Settings.Pick Custom Color')"
          @input="updateSecColorCustomHex($event.target.value)"
        >
      </label>
    </FtFlexBox>
    <FtPrompt
      v-if="showRestartPrompt"
      :label="$t('Settings[\'The app needs to restart for changes to take effect. Restart and apply change?\']')"
      :option-names="restartPromptNames"
      :option-values="RESTART_PROMPT_VALUES"
      @click="handleSmoothScrolling"
    />
  </FtSettingsSection>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useI18n } from '../composables/use-i18n-polyfill'

import FtSettingsSection from './FtSettingsSection/FtSettingsSection.vue'
import FtSelect from './FtSelect/FtSelect.vue'
import FtToggleSwitch from './FtToggleSwitch/FtToggleSwitch.vue'
import FtSlider from './FtSlider/FtSlider.vue'
import FtFlexBox from './ft-flex-box/ft-flex-box.vue'
import FtPrompt from './FtPrompt/FtPrompt.vue'
import FtInput from './FtInput/FtInput.vue'

import store from '../store/index'

import {
  getThemePresetColor,
  normalizeBaseTheme,
  normalizeThemeColorName,
  themePresetColors,
} from '../helpers/colors'
import { useThemePresetColorTranslations } from '../composables/colors'

const { t } = useI18n()

const BASE_THEME_VALUES = [
  'light',
  'dark',
]

const baseThemeNames = computed(() => [
  t('Settings.Theme Settings.Base Theme.Light'),
  t('Settings.Theme Settings.Base Theme.Dark'),
])

const COLOR_VALUES = themePresetColors.map(color => color.name)
const colorNames = useThemePresetColorTranslations()

/** @type {import('vue').ComputedRef<boolean>} */
const barColor = computed(() => {
  return store.getters.getBarColor
})

/**
 * @param {boolean} value
 */
function updateBarColor(value) {
  store.dispatch('updateBarColor', value)
}

/** @type {import('vue').ComputedRef<string>} */
const baseTheme = computed(() => {
  return store.getters.getBaseTheme
})

const resolvedBaseTheme = computed(() => {
  const systemPreference = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  return normalizeBaseTheme(baseTheme.value || 'dark', systemPreference)
})

/**
 * @param {string} value
 */
function updateBaseTheme(value) {
  store.dispatch('updateBaseTheme', value)
}

/** @type {import('vue').ComputedRef<number>} */
const sideNavDarkenPercent = computed(() => {
  const value = Number(store.getters.getSideNavDarkenPercent)
  return Number.isFinite(value) ? value : 40
})

/**
 * @param {number} value
 */
function updateSideNavDarkenPercent(value) {
  store.dispatch('updateSideNavDarkenPercent', value)
}

/** @type {import('vue').ComputedRef<string>} */
const mainColor = computed(() => {
  return store.getters.getMainColor
})

const resolvedMainColor = computed(() => normalizeThemeColorName(mainColor.value || 'Red', 'Red'))

/** @type {import('vue').ComputedRef<string>} */
const mainColorCustomHex = computed(() => {
  const value = store.getters.getMainColorCustomHex
  return typeof value === 'string' ? value.trim() : ''
})

const displayedMainColor = computed(() => {
  if (mainColorCustomHex.value) {
    return mainColorCustomHex.value
  }
  return getThemePresetColor(resolvedMainColor.value).value
})

/**
 * @param {string} value
 */
function updateMainColor(value) {
  store.dispatch('updateMainColorCustomHex', '')
  store.dispatch('updateMainColor', value)
}

/**
 * @param {string} value
 */
function updateMainColorCustomHex(value) {
  store.dispatch('updateMainColorCustomHex', value)
}

/** @type {import('vue').ComputedRef<string>} */
const secColor = computed(() => {
  return store.getters.getSecColor
})

const resolvedSecColor = computed(() => normalizeThemeColorName(secColor.value || 'Cyan', 'Cyan'))

/** @type {import('vue').ComputedRef<string>} */
const secColorCustomHex = computed(() => {
  const value = store.getters.getSecColorCustomHex
  return typeof value === 'string' ? value.trim() : ''
})

const displayedSecColor = computed(() => {
  if (secColorCustomHex.value) {
    return secColorCustomHex.value
  }
  return getThemePresetColor(resolvedSecColor.value).value
})

/**
 * @param {string} value
 */
function updateSecColor(value) {
  store.dispatch('updateSecColorCustomHex', '')
  store.dispatch('updateSecColor', value)
}

/**
 * @param {string} value
 */
function updateSecColorCustomHex(value) {
  store.dispatch('updateSecColorCustomHex', value)
}

/** @type {import('vue').ComputedRef<boolean>} */
const expandSideBar = computed(() => {
  return store.getters.getExpandSideBar
})

/** @type {import('vue').ComputedRef<boolean>} */
const isSideNavOpen = computed(() => {
  return store.getters.getIsSideNavOpen
})

/**
 * @param {boolean} value
 */
function handleExpandSideBar(value) {
  if (isSideNavOpen.value !== value) {
    store.commit('toggleSideNav')
  }

  store.dispatch('updateExpandSideBar', value)
}

/** @type {import('vue').ComputedRef<boolean>} */
const hideLabelsSideBar = computed(() => {
  return store.getters.getHideLabelsSideBar
})

/**
 * @param {boolean} value
 */
function updateHideLabelsSideBar(value) {
  store.dispatch('updateHideLabelsSideBar', value)
}

/** @type {import('vue').ComputedRef<boolean>} */
const hideHeaderLogo = computed(() => {
  return store.getters.getHideHeaderLogo
})

/**
 * @param {boolean} value
 */
function updateHideHeaderLogo(value) {
  store.dispatch('updateHideHeaderLogo', value)
}

/** @type {import('vue').ComputedRef<number>} */
const uiScale = computed(() => store.getters.getUiScale)

/**
 * @param {number} value
 */
function updateUiScale(value) {
  store.dispatch('updateUiScale', value)
}

/** @type {import('vue').ComputedRef<string>} */
const windowTitleBarColor = computed(() => {
  const color = store.getters.getWindowTitleBarColor
  return typeof color === 'string' && color.trim() !== '' ? color.trim() : '#202020'
})

/**
 * @param {string} value
 */
function updateWindowTitleBarColor(value) {
  store.dispatch('updateWindowTitleBarColor', value)
}

/** @type {import('vue').ComputedRef<string>} */
const windowTitleSuffix = computed(() => {
  const suffix = store.getters.getWindowTitleSuffix
  return typeof suffix === 'string' ? suffix : 'FreeTube'
})

/**
 * @param {string} value
 */
function updateWindowTitleSuffix(value) {
  store.dispatch('updateWindowTitleSuffix', value)
}

/** @type {boolean} */
const usingElectron = process.env.IS_ELECTRON

const RESTART_PROMPT_VALUES = [
  'restart',
  'cancel'
]

const restartPromptNames = computed(() => [
  t('Yes, Restart'),
  t('Cancel')
])

/** @type {import('vue').Ref<boolean>} */
const disableSmoothScrollingToggleValue = ref(store.getters.getDisableSmoothScrolling)
const showRestartPrompt = ref(false)

/**
 * @param {boolean} value
 */
function handleRestartPrompt(value) {
  disableSmoothScrollingToggleValue.value = value
  showRestartPrompt.value = true
}

/**
 * @param {'restart' | 'cancel' | null} value
 */
function handleSmoothScrolling(value) {
  showRestartPrompt.value = false

  if (value === null || value === 'cancel') {
    disableSmoothScrollingToggleValue.value = !disableSmoothScrollingToggleValue.value
    return
  }

  if (process.env.IS_ELECTRON) {
    store.dispatch('updateDisableSmoothScrolling',
      disableSmoothScrollingToggleValue.value
    ).then(() => {
      window.ftElectron.relaunch()
    })
  }
}
</script>

<style scoped>
.titleBarSettings {
  flex-wrap: wrap;
  gap: 24px;
  align-items: flex-end;
  justify-content: center;
}

.titleBarColorSection {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.titleBarColorControls {
  display: flex;
  align-items: center;
  gap: 10px;
}

.titleBarColorControls input[type='color'] {
  inline-size: 42px;
  block-size: 36px;
  padding: 0;
  border: 1px solid var(--primary-shadow-color);
  border-radius: 6px;
  background: transparent;
  cursor: pointer;
}

.titleBarColorValue {
  min-inline-size: 120px;
}

.themeSelectors,
.themeColorRow {
  flex-wrap: wrap;
  gap: 16px;
  align-items: flex-end;
  justify-content: center;
}

.themeColorPicker {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  block-size: var(--ui-control-height, 36px);
  inline-size: var(--ui-control-height, 36px);
  margin-block-end: 4px;
  border: 1px solid var(--primary-text-color);
  border-radius: var(--ui-control-radius, 10px);
  overflow: hidden;
  cursor: pointer;
  flex-shrink: 0;
}

.themeColorPickerSwatch {
  display: block;
  inline-size: 100%;
  block-size: 100%;
}

.themeColorPickerInput {
  position: absolute;
  inset: 0;
  opacity: 0;
  cursor: pointer;
  border: 0;
  padding: 0;
  inline-size: 100%;
  block-size: 100%;
}
</style>
