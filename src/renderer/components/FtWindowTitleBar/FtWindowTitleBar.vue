<template>
  <header
    class="windowTitleBar"
    :style="titleBarStyle"
    @dblclick="toggleMaximize"
  >
    <div class="titleDragArea">
      <span class="windowTitleText">{{ displayTitle }}</span>
    </div>
    <div class="windowControls">
      <button
        type="button"
        class="windowControlButton minimize"
        :aria-label="t('Minimize')"
        :title="t('Minimize')"
        @click="minimize"
      >
        <svg
          class="controlIcon"
          viewBox="0 0 10 10"
          aria-hidden="true"
        >
          <rect
            x="1"
            y="4.5"
            width="8"
            height="1"
            :fill="iconFill"
          />
        </svg>
      </button>
      <button
        type="button"
        class="windowControlButton maximize"
        :aria-label="isMaximized ? t('Restore') : t('Maximize')"
        :title="isMaximized ? t('Restore') : t('Maximize')"
        @click="toggleMaximize"
      >
        <!-- Restore (when maximized) -->
        <svg
          v-if="isMaximized"
          class="controlIcon"
          viewBox="0 0 10 10"
          aria-hidden="true"
        >
          <path
            fill="none"
            :stroke="iconFill"
            stroke-width="1"
            d="M2.5 3.5h5v5h-5z"
          />
          <path
            fill="none"
            :stroke="iconFill"
            stroke-width="1"
            d="M3.5 3.5V2.5h5v5H7.5"
          />
        </svg>
        <!-- Maximize -->
        <svg
          v-else
          class="controlIcon"
          viewBox="0 0 10 10"
          aria-hidden="true"
        >
          <path
            fill="none"
            :stroke="iconFill"
            stroke-width="1"
            d="M1.5 1.5h7v7h-7z"
          />
        </svg>
      </button>
      <button
        type="button"
        class="windowControlButton close"
        :aria-label="t('Close')"
        :title="t('Close')"
        @click="close"
      >
        <svg
          class="controlIcon"
          viewBox="0 0 10 10"
          aria-hidden="true"
        >
          <path
            :stroke="iconFill"
            stroke-width="1.2"
            fill="none"
            d="M2 2l6 6M8 2L2 8"
          />
        </svg>
      </button>
    </div>
  </header>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useI18n } from '../../composables/use-i18n-polyfill'
import store from '../../store/index'

const { t } = useI18n()

const isMaximized = ref(false)

const titleBarColor = computed(() => {
  const color = store.getters.getWindowTitleBarColor
  return typeof color === 'string' && color.trim() !== '' ? color.trim() : '#202020'
})

const windowTitleSuffix = computed(() => {
  const suffix = store.getters.getWindowTitleSuffix
  const trimmed = typeof suffix === 'string' ? suffix.trim() : ''
  return trimmed !== '' ? trimmed : 'FreeTube'
})

const appTitle = computed(() => store.getters.getAppTitle)

const displayTitle = computed(() => {
  if (typeof appTitle.value === 'string' && appTitle.value.length > 0) {
    return `${appTitle.value} - ${windowTitleSuffix.value}`
  }
  return windowTitleSuffix.value
})

/**
 * Relative luminance of a hex color (0–1). Higher = lighter.
 * @param {string} hex
 */
function getRelativeLuminance(hex) {
  const normalized = hex.trim().replace('#', '')
  const full = normalized.length === 3
    ? normalized.split('').map((c) => c + c).join('')
    : normalized

  if (!/^[\dA-Fa-f]{6}$/.test(full)) {
    return 0.1
  }

  const r = Number.parseInt(full.slice(0, 2), 16) / 255
  const g = Number.parseInt(full.slice(2, 4), 16) / 255
  const b = Number.parseInt(full.slice(4, 6), 16) / 255
  return (0.299 * r) + (0.587 * g) + (0.114 * b)
}

const useDarkIcons = computed(() => getRelativeLuminance(titleBarColor.value) > 0.55)

const iconFill = computed(() => (useDarkIcons.value ? '#1a1a1a' : '#ffffff'))

const titleBarStyle = computed(() => ({
  backgroundColor: titleBarColor.value,
  color: iconFill.value,
  '--titlebar-icon-fill': iconFill.value,
}))

async function refreshMaximizedState() {
  if (!process.env.IS_ELECTRON) { return }
  isMaximized.value = await window.ftElectron.isWindowMaximized()
}

function minimize() {
  window.ftElectron.minimizeWindow()
}

function toggleMaximize() {
  window.ftElectron.toggleMaximizeWindow()
}

function close() {
  window.ftElectron.closeWindow()
}

/** @type {((maximized: boolean) => void) | null} */
let maximizedListener = null

onMounted(async () => {
  await refreshMaximizedState()
  maximizedListener = (maximized) => {
    isMaximized.value = maximized
  }
  window.ftElectron.handleWindowMaximizedChange(maximizedListener)
})

onBeforeUnmount(() => {
  if (maximizedListener) {
    window.ftElectron.handleWindowMaximizedChange(null)
    maximizedListener = null
  }
})
</script>

<style scoped>
.windowTitleBar {
  position: fixed;
  inset-block-start: 0;
  inset-inline: 0;
  z-index: 20;
  display: flex;
  align-items: stretch;
  block-size: var(--window-titlebar-height, 32px);
  inline-size: 100%;
  user-select: none;
  box-sizing: border-box;
}

.titleDragArea {
  flex: 1 1 auto;
  min-inline-size: 0;
  display: flex;
  align-items: center;
  padding-inline: 12px;
  /* Electron window drag region */
  -webkit-app-region: drag;
  app-region: drag;
}

.windowTitleText {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 12px;
  line-height: 1;
  opacity: 0.92;
}

.windowControls {
  display: flex;
  flex: 0 0 auto;
  align-items: stretch;
  block-size: 100%;
  /* Buttons must not drag the window */
  -webkit-app-region: no-drag;
  app-region: no-drag;
}

.windowControlButton {
  box-sizing: border-box;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin: 0;
  padding: 0;
  border: 0;
  border-radius: 0;
  block-size: 100%;
  /* Perfect square: height equals title bar height */
  inline-size: var(--window-titlebar-height, 32px);
  background: transparent;
  color: inherit;
  cursor: default;
}

.windowControlButton:hover {
  background-color: rgb(255 255 255 / 12%);
}

.windowControlButton:active {
  background-color: rgb(255 255 255 / 18%);
}

.windowControlButton.minimize:hover,
.windowControlButton.maximize:hover {
  background-color: color-mix(in srgb, var(--titlebar-icon-fill) 12%, transparent);
}

.windowControlButton.minimize:active,
.windowControlButton.maximize:active {
  background-color: color-mix(in srgb, var(--titlebar-icon-fill) 20%, transparent);
}

.windowControlButton.close:hover {
  background-color: #e81123;
}

.windowControlButton.close:hover .controlIcon :is(path, rect),
.windowControlButton.close:active .controlIcon :is(path, rect) {
  fill: #fff;
  stroke: #fff;
}

.windowControlButton.close:active {
  background-color: #f1707a;
}

.controlIcon {
  inline-size: 10px;
  block-size: 10px;
  display: block;
  pointer-events: none;
}
</style>
