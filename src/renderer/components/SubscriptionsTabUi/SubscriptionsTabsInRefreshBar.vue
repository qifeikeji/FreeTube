<template>
  <div
    v-if="ctx && ctx.visibleTabs.value.length > 0"
    class="subscriptionsTabsInRefreshBar"
    role="tablist"
    :aria-label="t('Subscriptions.Subscriptions Tabs')"
  >
    <button
      v-for="tab in ctx.visibleTabs.value"
      :key="tab"
      class="subscriptionsTabButton"
      type="button"
      role="tab"
      :aria-selected="ctx.currentTab.value === tab"
      :class="{ selected: ctx.currentTab.value === tab }"
      @click="ctx.changeTab(tab)"
    >
      <span dir="auto">{{ tabLabel(tab) }}</span>
    </button>
  </div>
</template>

<script setup>
import { useI18n } from '../../composables/use-i18n-polyfill'
import { useSubscriptionsTabsContext } from '../../views/Subscriptions/subscriptions-tabs-context'

const { t } = useI18n()
const ctx = useSubscriptionsTabsContext()

/**
 * @param {'videos' | 'shorts' | 'live' | 'community'} tab
 */
function tabLabel(tab) {
  switch (tab) {
    case 'videos':
      return t('Global.Videos')
    case 'shorts':
      return t('Global.Shorts')
    case 'live':
      return t('Global.Live')
    case 'community':
      return t('Global.Posts')
  }
}
</script>

<style scoped>
.subscriptionsTabsInRefreshBar {
  display: flex;
  gap: 6px;
  flex-wrap: nowrap;
  align-items: center;
  flex-shrink: 0;
}

.subscriptionsTabButton {
  border: 1px solid var(--ui-glass-border, rgb(255 255 255 / 10%));
  border-radius: var(--ui-control-radius, 10px);
  background-color: var(--ui-glass-control, rgb(0 0 0 / 38%));
  color: var(--ui-glass-text, rgb(255 255 255 / 78%));
  cursor: pointer;
  line-height: 1;
  padding-block: var(--ui-control-padding-block, 8px);
  padding-inline: 12px;
  white-space: nowrap;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  block-size: var(--ui-control-height, 36px);
  min-block-size: var(--ui-control-height, 36px);
  backdrop-filter: blur(10px);
  /* stylelint-disable-next-line property-no-vendor-prefix */
  -webkit-backdrop-filter: blur(10px);
  transition: background-color 0.15s ease-out, border-color 0.15s ease-out, box-shadow 0.15s ease-out;
}

.subscriptionsTabButton:hover {
  background-color: var(--ui-glass-control-hover, rgb(0 0 0 / 52%));
  border-color: var(--ui-glass-border, rgb(255 255 255 / 18%));
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--ui-glass-border, rgb(255 255 255 / 8%)) 100%, transparent);
}

.subscriptionsTabButton.selected {
  background-color: color-mix(in srgb, var(--primary-color) 82%, transparent);
  border-color: color-mix(in srgb, var(--primary-color) 70%, white 12%);
  color: var(--text-with-main-color);
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--primary-color) 45%, transparent);
}
</style>
