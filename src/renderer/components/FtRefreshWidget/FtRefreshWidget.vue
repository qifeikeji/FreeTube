<template>
  <div class="refreshPageShell">
    <div class="floatingRefreshSection">
      <div class="left">
        <div class="leftMainRow">
          <slot name="left" />
          <p
            v-if="formattedLastRefreshTimestamp"
            class="lastRefreshTimestamp"
            :class="lastRefreshTimestampTone"
          >
            {{ t('Feed.Feed Last Updated', { feedName: title, date: formattedLastRefreshTimestamp }) }}
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
    <div class="refreshPageBody">
      <slot />
    </div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useI18n } from '../../composables/use-i18n-polyfill'

import FtIconButton from '../FtIconButton/FtIconButton.vue'

import { KeyboardShortcuts } from '../../../constants'
import {
  addKeyboardShortcutToActionTitle,
  FEED_REFRESH_LABEL_RECENT_MS,
  getFeedRefreshLabelTone,
  getRelativeTimeFromDate
} from '../../helpers/utils'

/** Refresh the relative label often while young, then once a minute. */
const TICK_MS_RECENT = 15 * 1000
const TICK_MS_DEFAULT = 60 * 1000

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

const nowMs = ref(Date.now())
/** @type {ReturnType<typeof setInterval> | null} */
let tickTimer = null

const refreshFeedButtonTitle = computed(() => {
  return addKeyboardShortcutToActionTitle(
    t('Feed.Refresh Feed', { subscriptionName: props.title }),
    KeyboardShortcuts.APP.SITUATIONAL.REFRESH
  )
})

const formattedLastRefreshTimestamp = computed(() => {
  // Depend on nowMs so the relative label advances while the page stays open.
  // getRelativeTimeFromDate reads Date.now(); the tick keeps this computed fresh.
  const ageBasis = nowMs.value

  if (props.lastRefreshAtMs != null && Number.isFinite(props.lastRefreshAtMs) && ageBasis > 0) {
    return getRelativeTimeFromDate(props.lastRefreshAtMs, true)
  }

  return props.lastRefreshTimestamp
})

const lastRefreshTimestampTone = computed(() => {
  return getFeedRefreshLabelTone(props.lastRefreshAtMs, nowMs.value)
})

const emit = defineEmits(['click'])

function click() {
  emit('click')
}

function clearTickTimer() {
  if (tickTimer != null) {
    clearInterval(tickTimer)
    tickTimer = null
  }
}

function scheduleTickTimer() {
  clearTickTimer()

  if (props.lastRefreshAtMs == null || !Number.isFinite(props.lastRefreshAtMs)) {
    return
  }

  const ageMs = Date.now() - props.lastRefreshAtMs
  const intervalMs = ageMs < FEED_REFRESH_LABEL_RECENT_MS ? TICK_MS_RECENT : TICK_MS_DEFAULT

  tickTimer = setInterval(() => {
    nowMs.value = Date.now()

    // Switch to the slower cadence once the label is no longer in the recent window.
    if (intervalMs === TICK_MS_RECENT) {
      const nextAgeMs = Date.now() - props.lastRefreshAtMs
      if (nextAgeMs >= FEED_REFRESH_LABEL_RECENT_MS) {
        scheduleTickTimer()
      }
    }
  }, intervalMs)
}

watch(() => props.lastRefreshAtMs, () => {
  nowMs.value = Date.now()
  scheduleTickTimer()
}, { immediate: true })

onMounted(() => {
  nowMs.value = Date.now()
  scheduleTickTimer()
})

onBeforeUnmount(() => {
  clearTickTimer()
})
</script>

<style scoped lang="scss" src="./FtRefreshWidget.scss" />
