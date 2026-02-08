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
  flex-wrap: wrap;
  align-items: center;
}

.subscriptionsTabButton {
  border: 1px solid var(--primary-shadow-color);
  border-radius: 8px;
  background-color: rgb(0 0 0 / 10%);
  color: var(--primary-text-color);
  cursor: pointer;
  line-height: 1;
  padding-block: 6px;
  padding-inline: 10px;
  white-space: nowrap;
  transition: box-shadow 0.15s ease-out, background-color 0.15s ease-out, transform 0.15s ease-out;
}

.subscriptionsTabButton:hover {
  background-color: var(--card-bg-color);
  box-shadow:
    0 0 0 2px var(--primary-color),
    0 6px 18px rgb(0 0 0 / 18%);
  transform: translateY(-1px);
}

.subscriptionsTabButton.selected {
  background-color: var(--primary-color);
  color: var(--text-with-main-color);
}
</style>
