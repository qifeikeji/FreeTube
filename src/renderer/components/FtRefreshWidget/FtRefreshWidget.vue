<template>
  <div
    class="floatingRefreshSection"
  >
    <div class="left">
      <slot name="left" />
      <p
        v-if="lastRefreshTimestamp"
        class="lastRefreshTimestamp"
        :class="lastRefreshSeverity"
      >
        {{ t('Feed.Feed Last Updated', { feedName: title, date: lastRefreshTimestamp }) }}
      </p>
    </div>
    <div class="center">
      <slot name="center" />
    </div>
    <FtIconButton
      :disabled="disableRefresh"
      :icon="['fas', 'sync']"
      class="refreshButton"
      :title="refreshFeedButtonTitle"
      :size="12"
      theme="primary"
      @click="click"
    />
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useI18n } from '../../composables/use-i18n-polyfill'

import FtIconButton from '../FtIconButton/FtIconButton.vue'

import { KeyboardShortcuts } from '../../../constants'
import { addKeyboardShortcutToActionTitle } from '../../helpers/utils'

const props = defineProps({
  disableRefresh: {
    type: Boolean,
    default: false
  },
  lastRefreshTimestamp: {
    type: String,
    default: ''
  },
  lastRefreshAgeMs: {
    type: Number,
    default: null,
  },
  title: {
    type: String,
    required: true
  }
})

const { t } = useI18n()

const refreshFeedButtonTitle = computed(() => {
  return addKeyboardShortcutToActionTitle(
    t('Feed.Refresh Feed', { subscriptionName: props.title }),
    KeyboardShortcuts.APP.SITUATIONAL.REFRESH
  )
})

const lastRefreshSeverity = computed(() => {
  const age = props.lastRefreshAgeMs
  if (typeof age !== 'number' || !Number.isFinite(age) || age < 0) {
    return null
  }

  const oneHour = 60 * 60 * 1000
  const fiveHours = 5 * oneHour

  if (age < oneHour) {
    return 'fresh'
  }
  if (age < fiveHours) {
    return 'stale'
  }
  return 'old'
})

const emit = defineEmits(['click'])

function click() {
  emit('click')
}
</script>

<style scoped lang="scss" src="./FtRefreshWidget.scss" />
