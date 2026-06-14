<template>
  <Teleport to=".app">
    <div
      v-if="channel != null"
      ref="menuRoot"
      class="channelContextMenu"
      :style="menuStyle"
      role="menu"
      @click.stop
      @contextmenu.prevent
    >
      <button
        type="button"
        class="menuItem"
        role="menuitem"
        @click="emit('edit')"
      >
        {{ t('Channels.Edit Channel Content') }}
      </button>
      <button
        v-if="showUnsubscribe"
        type="button"
        class="menuItem destructive"
        role="menuitem"
        @click="emit('unsubscribe')"
      >
        {{ t('Channel.Unsubscribe') }}
      </button>
    </div>
  </Teleport>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, useTemplateRef } from 'vue'
import { useI18n } from '../../composables/use-i18n-polyfill'

const props = defineProps({
  channel: {
    type: Object,
    default: null
  },
  position: {
    type: Object,
    default: () => ({ x: 0, y: 0 })
  },
  showUnsubscribe: {
    type: Boolean,
    default: true
  }
})

const emit = defineEmits(['edit', 'unsubscribe', 'close'])

const { t } = useI18n()

const menuRoot = useTemplateRef('menuRoot')

const menuStyle = computed(() => ({
  insetBlockStart: `${props.position.y}px`,
  insetInlineStart: `${props.position.x}px`,
}))

function handleDocumentPointer(event) {
  const root = menuRoot.value
  if (root != null && event.target instanceof Node && root.contains(event.target)) {
    return
  }
  emit('close')
}

function handleEscape(event) {
  if (event.key === 'Escape') {
    emit('close')
  }
}

function handleScroll() {
  emit('close')
}

onMounted(() => {
  document.addEventListener('pointerdown', handleDocumentPointer, true)
  document.addEventListener('keydown', handleEscape, true)
  window.addEventListener('scroll', handleScroll, true)
})

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', handleDocumentPointer, true)
  document.removeEventListener('keydown', handleEscape, true)
  window.removeEventListener('scroll', handleScroll, true)
})
</script>

<style scoped>
.channelContextMenu {
  position: fixed;
  z-index: 12;
  min-inline-size: 200px;
  padding-block: 6px;
  border-radius: 8px;
  background-color: var(--card-bg-color);
  box-shadow: 0 4px 16px rgb(0 0 0 / 25%);
  border: 1px solid var(--primary-shadow-color);
}

.menuItem {
  display: block;
  inline-size: 100%;
  box-sizing: border-box;
  border: 0;
  margin: 0;
  padding-block: 10px;
  padding-inline: 14px;
  background: transparent;
  color: var(--primary-text-color);
  font-size: 15px;
  text-align: start;
  cursor: pointer;
}

.menuItem:hover,
.menuItem:focus-visible {
  background-color: var(--side-nav-hover-color);
  color: var(--side-nav-hover-text-color);
}

.menuItem.destructive {
  color: var(--destructive-text-color, #cf222e);
}

.menuItem.destructive:hover,
.menuItem.destructive:focus-visible {
  background-color: var(--destructive-color, #cf222e);
  color: var(--destructive-text-color, #fff);
}
</style>
