<template>
  <div
    v-if="displayMode === 'buttons'"
    class="profileButtons"
    role="toolbar"
  >
    <button
      v-for="profile in profileListForButtons"
      :key="profile._id"
      class="profileButton"
      type="button"
      :class="{ active: isActiveProfile(profile) }"
      :title="translateProfileName(profile)"
      @click="setActiveProfileById(profile._id)"
    >
      <span dir="auto">{{ translateProfileName(profile) }}</span>
    </button>
  </div>

  <button
    v-else
    type="button"
    class="profileSettingsButton"
    :aria-label="t('Profile.Profile Manager')"
    :title="t('Profile.Profile Manager')"
    @click="openProfileSettings"
  >
    <FontAwesomeIcon
      class="navIcon"
      :icon="['fas', 'sliders-h']"
    />
  </button>
</template>

<script setup>
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { computed } from 'vue'
import { useI18n } from '../../composables/use-i18n-polyfill'
import { useRouter } from 'vue-router'

import store from '../../store/index'

import { showToast } from '../../helpers/utils'
import { MAIN_PROFILE_ID } from '../../../constants'

defineProps({
  displayMode: {
    type: String,
    default: 'dropdown',
  },
})

/**
 * @typedef {object} Profile
 * @property {string} _id
 * @property {string} name
 * @property {string} bgColor
 * @property {string} textColor
 * @property {object[]} subscriptions
 * @property {string} subscriptions[].id
 * @property {string|undefined} subscriptions[].name
 * @property {string|undefined} subscriptions[].thumbnail
 */

const { t } = useI18n()
const router = useRouter()

/** @type {import('vue').ComputedRef<Profile[]>} */
const profileList = computed(() => store.getters.getProfileList)
/** @type {import('vue').ComputedRef<Profile>} */
const activeProfile = computed(() => store.getters.getActiveProfile)

/** @type {import('vue').ComputedRef<Profile[]>} */
const profileListForButtons = computed(() => {
  const hiddenIds = store.getters.getHiddenTopNavProfileButtonIds ?? []
  return profileList.value.filter((profile) => !hiddenIds.includes(profile._id))
})

/**
 * @param {Profile} profile
 */
function isActiveProfile(profile) {
  return profile._id === activeProfile.value._id
}

function openProfileSettings() {
  router.push({ path: '/settings/profile' })
}

/**
 * @param {string} profileId
 */
function setActiveProfileById(profileId) {
  if (activeProfile.value._id !== profileId) {
    const targetProfile = profileList.value.find((x) => x._id === profileId)

    if (targetProfile) {
      store.commit('setActiveProfile', profileId)
      showToast(t('Profile.{profile} is now the active profile', { profile: translateProfileName(targetProfile) }))
    }
  }
}

/**
 * @param {Profile} profile
 */
function translateProfileName(profile) {
  return profile._id === MAIN_PROFILE_ID ? t('Profile.All Channels') : profile.name
}
</script>

<style scoped src="./FtProfileSelector.css" />
