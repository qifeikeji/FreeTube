<template>
  <div>
    <FtCard class="card">
      <h2>{{ $t('Profile.Top Nav Profile Buttons') }}</h2>
      <p class="message">
        {{ $t('Profile.Select which profiles are hidden from the top button row. This does not affect the dropdown menu.') }}
      </p>
      <div class="topNavProfileButtonsSettings">
        <div
          v-for="profile in profileList"
          :key="profile._id"
          class="topNavProfileButtonsSettingRow"
        >
          <input
            :id="'hideTopNavProfileButton-' + profile._id"
            class="topNavProfileButtonsSettingCheckbox"
            type="checkbox"
            :checked="hiddenTopNavProfileButtonIds.includes(profile._id)"
            @change="toggleHiddenTopNavProfileButton(profile._id)"
          >
          <button
            class="topNavProfileButtonsSettingButton"
            type="button"
            :class="{ hidden: hiddenTopNavProfileButtonIds.includes(profile._id) }"
            @click="toggleHiddenTopNavProfileButton(profile._id)"
          >
            <span dir="auto">{{ translateProfileName(profile) }}</span>
          </button>
        </div>
      </div>
    </FtCard>
    <FtCard class="card">
      <h2>{{ $t("Profile.Profile Manager") }}</h2>
      <FtFlexBox
        class="profileList"
      >
        <FtProfileBubble
          v-for="profile in profileList"
          :key="profile._id"
          :is-main-profile="profile._id === MAIN_PROFILE_ID"
          :profile-name="profile.name"
          :background-color="profile.bgColor"
          :text-color="profile.textColor"
          :class="{ openedProfile: openSettingsProfile?._id === profile._id }"
          @click="openSettingsForProfileWithId(profile._id)"
        />
      </FtFlexBox>
      <FtFlexBox
        v-if="!isNewProfileOpen"
      >
        <FtButton
          :label="$t('Profile.Create New Profile')"
          @click="openSettingsForNewProfile"
        />
      </FtFlexBox>
    </FtCard>
    <div
      v-if="openSettingsProfile"
      :key="openSettingsProfileId"
    >
      <FtProfileChannelList
        v-if="!isNewProfileOpen"
        :profile="openSettingsProfile"
        :is-main-profile="isMainProfile"
      />
      <FtProfileFilterChannelsList
        v-if="!isNewProfileOpen && !isMainProfile"
        :profile="openSettingsProfile"
      />
      <FtProfileEdit
        :profile="openSettingsProfile"
        :is-new="isNewProfileOpen"
        :is-main-profile="isMainProfile"
        @new-profile-created="handleNewProfileCreated"
        @profile-deleted="handleProfileDeleted"
      />
    </div>
  </div>
</template>

<script setup>
import { computed, ref, shallowRef, watch } from 'vue'
import { useI18n } from '../../composables/use-i18n-polyfill'

import FtCard from '../../components/ft-card/ft-card.vue'
import FtFlexBox from '../../components/ft-flex-box/ft-flex-box.vue'
import FtProfileBubble from '../../components/FtProfileBubble/FtProfileBubble.vue'
import FtButton from '../../components/FtButton/FtButton.vue'
import FtProfileEdit from '../../components/FtProfileEdit/FtProfileEdit.vue'
import FtProfileChannelList from '../../components/FtProfileChannelList/FtProfileChannelList.vue'
import FtProfileFilterChannelsList from '../../components/FtProfileFilterChannelsList/FtProfileFilterChannelsList.vue'

import store from '../../store/index'

import { calculateColorLuminance, getRandomColor } from '../../helpers/colors'
import { MAIN_PROFILE_ID } from '../../../constants'

const { t } = useI18n()

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
 * @property {boolean} hideFromTopNavButtons
 */

const isNewProfileOpen = ref(false)

/** @type {import('vue').Ref<string>} */
const openSettingsProfileId = ref('')

/** @type {import('vue').ShallowRef<Profile|null>} */
const openSettingsProfile = shallowRef(null)

/** @type {import('vue').ComputedRef<Profile[]>} */
const profileList = computed(() => {
  return store.getters.getProfileList
})

const hiddenTopNavProfileButtonIds = computed(() => {
  return store.getters.getHiddenTopNavProfileButtonIds ?? []
})

/**
 * @param {string} profileId
 */
function toggleHiddenTopNavProfileButton(profileId) {
  const current = hiddenTopNavProfileButtonIds.value
  const set = new Set(current)
  if (set.has(profileId)) {
    set.delete(profileId)
  } else {
    set.add(profileId)
  }
  store.dispatch('updateHiddenTopNavProfileButtonIds', [...set])
}

/**
 * @param {Profile} profile
 */
function translateProfileName(profile) {
  return profile._id === MAIN_PROFILE_ID ? t('Profile.All Channels') : profile.name
}

watch(profileList, () => {
  openSettingsProfile.value = getProfileById(openSettingsProfileId.value)
}, { deep: true })

const isMainProfile = computed(() => {
  return MAIN_PROFILE_ID === openSettingsProfileId.value
})

function openSettingsForNewProfile() {
  isNewProfileOpen.value = true

  openSettingsProfile.value = {
    name: '',
    bgColor: getRandomColor().value,
    textColor: calculateColorLuminance(getRandomColor().value),
    subscriptions: []
  }

  openSettingsProfileId.value = ''
}

/**
 * @param {string} profileId
 */
function openSettingsForProfileWithId(profileId) {
  if (profileId === openSettingsProfileId.value) {
    return
  }

  isNewProfileOpen.value = false
  openSettingsProfileId.value = profileId
  openSettingsProfile.value = getProfileById(profileId)
}

/**
 * @param {string | null} profileId
 */
function getProfileById(profileId) {
  if (!profileId) {
    return null
  }

  return store.getters.profileById(profileId)
}

function handleNewProfileCreated() {
  isNewProfileOpen.value = false
  openSettingsProfile.value = null
  openSettingsProfileId.value = ''
}

function handleProfileDeleted() {
  openSettingsProfile.value = null
  openSettingsProfileId.value = ''
}
</script>

<style scoped src="./ProfileSettings.css" />
