<template>
  <FtGlassContextMenu
    :visible="channel != null"
    :position="position"
    :items="menuItems"
    @select="handleSelect"
    @close="emit('close')"
  />
</template>

<script setup>
import { computed } from 'vue'
import { useI18n } from '../../composables/use-i18n-polyfill'
import FtGlassContextMenu from '../FtGlassContextMenu/FtGlassContextMenu.vue'

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

const menuItems = computed(() => {
  const items = [
    {
      label: t('Channels.Edit Channel Content'),
      value: 'edit',
      icon: ['fas', 'edit']
    }
  ]

  if (props.showUnsubscribe) {
    items.push({
      label: t('Channel.Unsubscribe'),
      value: 'unsubscribe',
      destructive: true,
      icon: ['fas', 'trash']
    })
  }

  return items
})

/**
 * @param {string} value
 */
function handleSelect(value) {
  if (value === 'edit') {
    emit('edit')
  } else if (value === 'unsubscribe') {
    emit('unsubscribe')
  }
}
</script>
