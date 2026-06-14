<template>
  <FtPrompt
    v-if="channel != null"
    autosize
    theme="flex-column"
    prompt-card-class="channelSubscriptionEditDialog"
    @click="handlePromptClick"
  >
    <template #label="{ labelId }">
      <div class="dialogHeader">
        <h2
          :id="labelId"
          class="dialogTitle"
        >
          {{ t('Channels.Edit Channel Content') }}
        </h2>
        <p
          class="dialogChannelName"
          dir="auto"
        >
          {{ channel.name }}
        </p>
      </div>
    </template>
    <div class="editForm">
      <section class="formSection">
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
          rows="6"
          :maxlength="2000"
          :placeholder="t('Channels.Channel Notes Placeholder')"
        />
      </section>
      <section class="formSection">
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
          <div
            class="colorPreview"
            :style="{ color: draftNotesColor }"
          >
            {{ t('Channels.Notes Color Preview') }}
          </div>
        </div>
      </section>
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
        <FtButton
          :label="t('Channels.Reset Notes Color')"
          background-color="var(--accent-color)"
          text-color="var(--text-with-accent-color)"
          @click="draftNotesColor = defaultNotesColor"
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
.dialogHeader {
  text-align: center;
  margin-block-end: 4px;
}

.dialogTitle {
  margin-block: 0 6px;
}

.dialogChannelName {
  margin: 0;
  color: var(--tertiary-text-color);
  font-size: 1rem;
  font-weight: 500;
}

.editForm {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 16px;
  margin-block: 8px 4px;
  inline-size: 100%;
  min-block-size: 0;
  box-sizing: border-box;
}

.formSection {
  padding: 14px;
  border-radius: 12px;
  background-color: #282828;
  box-shadow: 0 0 0 1px var(--primary-shadow-color);
}

.fieldLabel {
  display: block;
  font-weight: 600;
  margin-block-end: 8px;
}

.notesField {
  box-sizing: border-box;
  inline-size: 100%;
  min-block-size: 140px;
  padding: 12px;
  border: 0;
  border-radius: 8px;
  font-size: 15px;
  line-height: 1.45;
  font-family: inherit;
  color: var(--secondary-text-color);
  background-color: var(--search-bar-color);
  resize: vertical;
}

.notesField:focus {
  outline: 2px solid var(--primary-color);
  outline-offset: 1px;
}

.colorRow {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
}

.colorInput {
  block-size: 44px;
  inline-size: 64px;
  padding: 0;
  border: 0;
  border-radius: 8px;
  background: transparent;
  cursor: pointer;
}

.colorPreview {
  flex: 1;
  min-inline-size: 120px;
  padding-block: 10px;
  padding-inline: 12px;
  border-radius: 8px;
  background-color: var(--search-bar-color);
  font-size: 14px;
}

.actions {
  margin-block-start: auto;
  justify-content: center;
  flex-wrap: wrap;
  gap: 8px;
}
</style>

<style>
.channelSubscriptionEditDialog.ft-card {
  box-sizing: border-box;
  inline-size: 500px;
  block-size: 500px;
  max-inline-size: min(500px, 95vw) !important;
  max-block-size: min(500px, 95vh);
  border-radius: 16px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  padding-block: 16px 20px;
  padding-inline: 20px;
}

.channelSubscriptionEditDialog.ft-card.flex-column {
  overflow-y: auto;
}
