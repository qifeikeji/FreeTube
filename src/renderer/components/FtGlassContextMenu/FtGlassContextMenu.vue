<template>
  <Teleport to=".app">
    <div
      v-if="visible"
      ref="menuRoot"
      class="glassContextMenu"
      :style="menuStyle"
      role="menu"
      @click.stop
      @contextmenu.prevent
    >
      <button
        v-for="item in items"
        :key="item.value"
        type="button"
        class="menuItem"
        :class="{ destructive: item.destructive }"
        role="menuitem"
        @click="emit('select', item.value)"
      >
        {{ item.label }}
      </button>
    </div>
  </Teleport>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, useTemplateRef, watch } from 'vue'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  position: {
    type: Object,
    default: () => ({ x: 0, y: 0 })
  },
  items: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['select', 'close'])

const menuRoot = useTemplateRef('menuRoot')

const menuStyle = computed(() => ({
  insetBlockStart: `${props.position.y}px`,
  insetInlineStart: `${props.position.x}px`,
}))

function handleDocumentPointer(event) {
  if (!props.visible) { return }
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

watch(() => props.visible, (visible) => {
  if (!visible) { return }
  // Keep the menu inside the viewport after mount.
  requestAnimationFrame(() => {
    const root = menuRoot.value
    if (root == null) { return }
    const rect = root.getBoundingClientRect()
    const pad = 8
    let x = props.position.x
    let y = props.position.y
    if (rect.right > window.innerWidth - pad) {
      x = Math.max(pad, window.innerWidth - rect.width - pad)
    }
    if (rect.bottom > window.innerHeight - pad) {
      y = Math.max(pad, window.innerHeight - rect.height - pad)
    }
    root.style.insetInlineStart = `${x}px`
    root.style.insetBlockStart = `${y}px`
  })
})

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
.glassContextMenu {
  position: fixed;
  z-index: 220;
  min-inline-size: 200px;
  padding-block: 6px;
  border-radius: 12px;
  background-color: rgb(18 18 18 / 72%);
  border: 1px solid rgb(255 255 255 / 12%);
  box-shadow: 0 12px 32px rgb(0 0 0 / 35%);
  backdrop-filter: blur(18px) saturate(140%);
  /* stylelint-disable-next-line property-no-vendor-prefix */
  -webkit-backdrop-filter: blur(18px) saturate(140%);
  overflow: hidden;
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
  color: rgb(255 255 255 / 90%);
  font-size: 14px;
  text-align: start;
  cursor: pointer;
}

.menuItem:hover,
.menuItem:focus-visible {
  background-color: rgb(255 255 255 / 10%);
  color: #fff;
}

.menuItem.destructive {
  color: rgb(255 138 138 / 95%);
}

.menuItem.destructive:hover,
.menuItem.destructive:focus-visible {
  background-color: rgb(207 34 46 / 85%);
  color: #fff;
}
</style>
