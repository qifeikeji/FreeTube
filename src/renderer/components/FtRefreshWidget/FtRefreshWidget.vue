<template>
  <div
    class="floatingRefreshSection"
  >
    <div class="left">
      <div class="leftMainRow">
        <slot name="left" />
        <p
          v-if="lastRefreshTimestamp"
          class="lastRefreshTimestamp"
          :class="lastRefreshTimestampTone"
        >
          {{ t('Feed.Feed Last Updated', { feedName: title, date: lastRefreshTimestamp }) }}
        </p>
      </div>
    </div>
    <div class="center">
      <slot name="center" />
    </div>
    <div class="right">
      <FtIconButton
        v-if="showRefreshButton"
        :disabled="disableRefresh"
        :icon="['fas', 'sync']"
        class="refreshButton"
        :title="refreshFeedButtonTitle"
        :size="12"
        theme="primary"
        @click="click"
      />
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useI18n } from '../../composables/use-i18n-polyfill'

import FtIconButton from '../FtIconButton/FtIconButton.vue'

import { KeyboardShortcuts } from '../../../constants'
import { addKeyboardShortcutToActionTitle, getFeedRefreshLabelTone } from '../../helpers/utils'

const props = defineProps({
  disableRefresh: {
    type: Boolean,
    default: false
  },
  lastRefreshTimestamp: {
    type: String,
    default: ''
  },
  lastRefreshAtMs: {
    type: Number,
    default: null
  },
  title: {
    type: String,
    default: ''
  },
  showRefreshButton: {
    type: Boolean,
    default: true
  }
})

const { t } = useI18n()

const refreshFeedButtonTitle = computed(() => {
  return addKeyboardShortcutToActionTitle(
    t('Feed.Refresh Feed', { subscriptionName: props.title }),
    KeyboardShortcuts.APP.SITUATIONAL.REFRESH
  )
})

const lastRefreshTimestampTone = computed(() => {
  return getFeedRefreshLabelTone(props.lastRefreshAtMs)
})

const emit = defineEmits(['click'])

function click() {
  emit('click')
}
</script>

<style scoped lang="scss" src="./FtRefreshWidget.scss" />
