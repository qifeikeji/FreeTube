<template>
  <FtSettingsSection
    :title="$t('Settings.External Player Settings.External Player Settings')"
  >
    <FtFlexBox
      class="profileTabs"
      role="tablist"
      :aria-label="$t('Profile.Profile Select')"
    >
      <!-- eslint-disable-next-line vuejs-accessibility/interactive-supports-focus -->
      <button
        v-for="profile in profileList"
        :key="profile._id"
        class="profileTab"
        role="tab"
        type="button"
        :aria-selected="selectedProfileId === profile._id"
        :tabindex="selectedProfileId === profile._id ? 0 : -1"
        :class="{ selected: selectedProfileId === profile._id }"
        @click="selectedProfileId = profile._id"
      >
        <span dir="auto">{{ translateProfileName(profile) }}</span>
      </button>
    </FtFlexBox>
    <FtFlexBox>
      <FtSelect
        :placeholder="$t('Settings.External Player Settings.External Player')"
        :value="externalPlayer"
        :select-names="externalPlayerNames"
        :select-values="externalPlayerValues"
        :tooltip="$t('Tooltips.External Player Settings.External Player')"
        :icon="['fas', 'external-link-alt']"
        @change="updateExternalPlayer"
      />
    </FtFlexBox>
    <FtFlexBox>
      <FtToggleSwitch
        :label="$t('Settings.External Player Settings.Ignore Unsupported Action Warnings')"
        :default-value="externalPlayerIgnoreWarnings"
        :disabled="externalPlayer === ''"
        :compact="true"
        :tooltip="$t('Tooltips.External Player Settings.Ignore Warnings')"
        @change="updateExternalPlayerIgnoreWarnings"
      />
      <FtToggleSwitch
        :label="$t('Settings.External Player Settings.Ignore Default Arguments')"
        :default-value="externalPlayerIgnoreDefaultArgs"
        :disabled="externalPlayer === ''"
        :compact="true"
        :tooltip="$t('Tooltips.External Player Settings.Ignore Default Arguments')"
        @change="updateExternalPlayerIgnoreDefaultArgs"
      />
    </FtFlexBox>
    <FtFlexBox
      v-if="externalPlayer !== ''"
      class="settingsFlexStart460px"
    >
      <FtInput
        :placeholder="$t('Settings.External Player Settings.Custom External Player Executable')"
        :show-action-button="false"
        :show-label="true"
        :value="externalPlayerExecutable"
        :tooltip="$t('Tooltips.External Player Settings.Custom External Player Executable')"
        @input="updateExternalPlayerExecutable"
      />
    </FtFlexBox>
    <FtFlexBox
      v-if="externalPlayer !== ''"
    >
      <FtInputTags
        :label="$t('Settings.External Player Settings.Custom External Player Arguments')"
        :tag-name-placeholder="$t('Settings.External Player Settings.Custom External Player Arguments')"
        :tag-list="externalPlayerCustomArgs"
        :tooltip="externalPlayerCustomArgsTooltip"
        :show-tags="showAddedExternalPlayerCustomArgs"
        @change="handleExternalPlayerCustomArgs"
        @toggle-show-tags="handleAddedExternalPayerCustomArgs"
      />
    </FtFlexBox>
  </FtSettingsSection>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useI18n } from '../composables/use-i18n-polyfill'

import FtSettingsSection from './FtSettingsSection/FtSettingsSection.vue'
import FtSelect from './FtSelect/FtSelect.vue'
import FtInput from './FtInput/FtInput.vue'
import FtToggleSwitch from './FtToggleSwitch/FtToggleSwitch.vue'
import FtFlexBox from './ft-flex-box/ft-flex-box.vue'
import FtInputTags from './FtInputTags/FtInputTags.vue'

import store from '../store/index'
import { MAIN_PROFILE_ID } from '../../constants'

const { t } = useI18n()

/** @typedef {{ _id: string, name: string, externalPlayerSettings?: { player?: string, executable?: string, ignoreWarnings?: boolean, ignoreDefaultArgs?: boolean, customArgs?: string[] } }} Profile */

/** @type {import('vue').ComputedRef<Profile[]>} */
const profileList = computed(() => store.getters.getProfileList)
/** @type {import('vue').ComputedRef<Profile>} */
const activeProfile = computed(() => store.getters.getActiveProfile)

const selectedProfileId = ref(activeProfile.value?._id ?? '')

watch(activeProfile, (value) => {
  // keep a valid selected id when switching active profile
  if (!profileList.value.some(p => p._id === selectedProfileId.value)) {
    selectedProfileId.value = value?._id ?? ''
  }
})

const selectedProfile = computed(() => {
  return profileList.value.find(p => p._id === selectedProfileId.value) ?? activeProfile.value
})

const globalExternalPlayerDefaults = computed(() => {
  // fall back values from the global settings for profiles without overrides
  const customArgsString = store.state.settings.externalPlayerCustomArgs ?? '[]'
  return {
    player: store.state.settings.externalPlayer ?? '',
    executable: store.state.settings.externalPlayerExecutable ?? '',
    ignoreWarnings: store.state.settings.externalPlayerIgnoreWarnings ?? false,
    ignoreDefaultArgs: store.state.settings.externalPlayerIgnoreDefaultArgs ?? false,
    customArgs: typeof customArgsString === 'string' ? JSON.parse(customArgsString) : [],
  }
})

function getSelectedExternalPlayerSettings() {
  const overrides = selectedProfile.value?.externalPlayerSettings ?? {}
  return {
    ...globalExternalPlayerDefaults.value,
    ...overrides,
    customArgs: Array.isArray(overrides.customArgs) ? overrides.customArgs : globalExternalPlayerDefaults.value.customArgs,
  }
}

/** @type {import('vue').ComputedRef<string>} */
const externalPlayer = computed(() => getSelectedExternalPlayerSettings().player)

/** @type {import('vue').ComputedRef<string[]>} */
const externalPlayerNames = computed(() => {
  return store.getters.getExternalPlayerNames.map((name) => {
    return name === 'None'
      ? t('Settings.External Player Settings.Players.None.Name')
      : name
  })
})

/** @type {import('vue').ComputedRef<string[]>} */
const externalPlayerValues = computed(() => store.getters.getExternalPlayerValues)

/** @type {import('vue').ComputedRef<string>} */
const externalPlayerExecutable = computed(() => getSelectedExternalPlayerSettings().executable)

/** @type {import('vue').ComputedRef<boolean>} */
const externalPlayerIgnoreWarnings = computed(() => getSelectedExternalPlayerSettings().ignoreWarnings)

/** @type {import('vue').ComputedRef<boolean>} */
const externalPlayerIgnoreDefaultArgs = computed(() => getSelectedExternalPlayerSettings().ignoreDefaultArgs)

/** @type {import('vue').ComputedRef<string[]>} */
const externalPlayerCustomArgs = computed(() => getSelectedExternalPlayerSettings().customArgs)

const externalPlayerCustomArgsTooltip = computed(() => {
  const tooltip = t('Tooltips.External Player Settings.Custom External Player Arguments')

  const cmdArgs = store.getters.getExternalPlayerCmdArguments[externalPlayer.value]
  if (cmdArgs && typeof cmdArgs.defaultCustomArguments === 'string' && cmdArgs.defaultCustomArguments !== '') {
    const defaultArgs = t(
      'Tooltips.External Player Settings.DefaultCustomArgumentsTemplate',
      {
        defaultCustomArguments: cmdArgs.defaultCustomArguments
      })
    return `${tooltip} ${defaultArgs}`
  }

  return tooltip
})

/**
 * @param {string} value
 */
function updateExternalPlayer(value) {
  updateSelectedProfileExternalPlayerSettings({ player: value })
}

/**
 * @param {boolean} value
 */
function updateExternalPlayerIgnoreWarnings(value) {
  updateSelectedProfileExternalPlayerSettings({ ignoreWarnings: value })
}

/**
 * @param {boolean} value
 */
function updateExternalPlayerIgnoreDefaultArgs(value) {
  updateSelectedProfileExternalPlayerSettings({ ignoreDefaultArgs: value })
}

/**
 * @param {string} value
 */
function updateExternalPlayerExecutable(value) {
  updateSelectedProfileExternalPlayerSettings({ executable: value })
}

/**
 * @param {string[]} args
 */
function handleExternalPlayerCustomArgs(args) {
  updateSelectedProfileExternalPlayerSettings({ customArgs: args })
}

/** @type {import('vue').ComputedRef<boolean>} */
const showAddedExternalPlayerCustomArgs = computed(() => store.getters.getShowAddedExternalPlayerCustomArgs)

function handleAddedExternalPayerCustomArgs() {
  store.dispatch('updateShowAddedExternalPlayerCustomArgs', !showAddedExternalPlayerCustomArgs.value)
}

/**
 * @param {Partial<NonNullable<Profile['externalPlayerSettings']>>} patch
 */
function updateSelectedProfileExternalPlayerSettings(patch) {
  const profile = selectedProfile.value
  if (!profile?._id) { return }

  const existing = profile.externalPlayerSettings ?? {}
  store.dispatch('updateProfile', {
    ...profile,
    externalPlayerSettings: {
      ...existing,
      ...patch,
    }
  })
}

/**
 * @param {Profile} profile
 */
function translateProfileName(profile) {
  return profile._id === MAIN_PROFILE_ID ? t('Profile.All Channels') : profile.name
}
</script>

<style scoped>
.profileTabs {
  gap: 5px;
  flex-wrap: wrap;
  justify-content: flex-start;
  margin-block-end: 10px;
}

.profileTab {
  border: 1px solid var(--primary-shadow-color);
  border-radius: 8px;
  background-color: var(--side-nav-hover-color);
  color: var(--primary-text-color);
  cursor: pointer;
  line-height: 1;
  padding-block: 8px;
  padding-inline: 10px;
  white-space: nowrap;
}

.profileTab.selected {
  background-color: var(--primary-color);
  color: var(--text-with-main-color);
}
</style>
