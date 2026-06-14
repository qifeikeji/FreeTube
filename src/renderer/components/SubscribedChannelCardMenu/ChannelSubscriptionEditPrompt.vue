<template>
  <FtPrompt
    v-if="channel != null"
    :label="t('Channels.Edit Channel Content')"
    autosize
    @click="handlePromptClick"
  >
    <div class="editForm">
      <label
        class="fieldLabel"
        :for="notesFieldId"
      >
        {{ t('Channels.Channel Notes') }}
      </label>
      <textarea
        :id="notesFieldId"
        v-model="draftNotes"
        class="notesField"
        rows="5"
        :maxlength="2000"
        :placeholder="t('Channels.Channel Notes Placeholder')"
      />
      <label
        class="fieldLabel"
        :for="colorFieldId"
      >
        {{ t('Channels.Notes Color') }}
      </label>
      <div class="colorRow">
        <input
          :id="colorFieldId"
          v-model="draftNotesColor"
          type="color"
          class="colorInput"
        >
        <FtButton
          :label="t('Channels.Reset Notes Color')"
          background-color="var(--accent-color)"
          text-color="var(--text-with-accent-color)"
          @click="draftNotesColor = defaultNotesColor"
        />
      </div>
      <FtFlexBox class="actions">
        <FtButton
          :label="t('Channels.Save Channel Notes')"
          background-color="var(--primary-color)"
          text-color="var(--text-with-main-color)"
          @click="save"
        />
        <FtButton
          :label="t('Cancel')"
          @click="cancel"
        />
      </FtFlexBox>
    </div>
  </FtPrompt>
</template>

<script setup>
import { useId, watch, ref } from 'vue'
import { useI18n } from '../../composables/use-i18n-polyfill'

import FtPrompt from '../FtPrompt/FtPrompt.vue'
import FtFlexBox from '../ft-flex-box/ft-flex-box.vue'
import FtButton from '../FtButton/FtButton.vue'

const props = defineProps({
  channel: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['save', 'cancel'])

const { t } = useI18n()

const notesFieldId = useId()
const colorFieldId = useId()

const defaultNotesColor = '#8b949e'

const draftNotes = ref('')
const draftNotesColor = ref(defaultNotesColor)

watch(() => props.channel, (channel) => {
  if (channel == null) { return }

  const rawNotes = channel.notes ?? channel.note ?? ''
  draftNotes.value = typeof rawNotes === 'string' ? rawNotes : ''

  const rawColor = channel.notesColor ?? ''
  draftNotesColor.value = typeof rawColor === 'string' && rawColor !== '' ? rawColor : defaultNotesColor
}, { immediate: true })

/**
 * @param {null} value
 */
function handlePromptClick(value) {
  if (value === null) {
    cancel()
  }
}

function save() {
  emit('save', {
    notes: draftNotes.value,
    notesColor: draftNotesColor.value === defaultNotesColor ? '' : draftNotesColor.value,
  })
}

function cancel() {
  emit('cancel')
}
</script>

<style scoped>
.editForm {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-block-end: 8px;
}

.fieldLabel {
  font-weight: 600;
  margin-block-start: 4px;
}

.notesField {
  box-sizing: border-box;
  inline-size: 100%;
  min-block-size: 120px;
  padding: 10px;
  border: 0;
  border-radius: 5px;
  font-size: 15px;
  font-family: inherit;
  color: var(--secondary-text-color);
  background-color: var(--search-bar-color);
  resize: vertical;
}

.colorRow {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
}

.colorInput {
  block-size: 40px;
  inline-size: 56px;
  padding: 0;
  border: 0;
  background: transparent;
  cursor: pointer;
}

.actions {
  margin-block-start: 12px;
}
</style>
