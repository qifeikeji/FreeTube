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
      <section class="formSection notesSection">
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
          :maxlength="2000"
          :placeholder="t('Channels.Channel Notes Placeholder')"
        />
      </section>
      <section class="formSection">
        <span
          :id="colorFieldId"
          class="fieldLabel"
        >
          {{ t('Channels.Notes Color') }}
        </span>
        <div class="colorAndHighlightRow">
          <div
            class="colorSwatches"
            role="radiogroup"
            :aria-labelledby="colorFieldId"
          >
            <button
              v-for="option in noteColorOptions"
              :key="option.value"
              type="button"
              class="colorSwatch"
              role="radio"
              :aria-checked="draftNotesColor === option.value"
              :class="{ selected: draftNotesColor === option.value }"
              :style="{ backgroundColor: option.value }"
              :title="option.label"
              @click="draftNotesColor = option.value"
            />
          </div>
          <label class="highlightControl">
            <input
              v-model="draftHighlighted"
              class="highlightCheckbox"
              type="checkbox"
            >
            <span class="highlightLabel">{{ t('Channels.Highlight Channel') }}</span>
          </label>
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
          @click="resetNotesColor"
        />
      </FtFlexBox>
    </div>
  </FtPrompt>
</template>

<script setup>
import { useId, watch, ref, computed } from 'vue'
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

const defaultNotesColor = ''

const noteColorOptions = computed(() => [
  { label: t('Channels.Note Color Red'), value: '#e53935' },
  { label: t('Channels.Note Color Yellow'), value: '#fdd835' },
  { label: t('Channels.Note Color Blue'), value: '#1e88e5' },
  { label: t('Channels.Note Color Green'), value: '#43a047' },
  { label: t('Channels.Note Color Purple'), value: '#8e24aa' },
])

const draftNotes = ref('')
const draftNotesColor = ref(defaultNotesColor)
const draftHighlighted = ref(false)

/**
 * @param {string} color
 */
function normalizeStoredNotesColor(color) {
  if (typeof color !== 'string' || color.trim() === '') {
    return defaultNotesColor
  }
  const normalized = color.trim().toLowerCase()
  const match = noteColorOptions.value.find((option) => option.value.toLowerCase() === normalized)
  return match ? match.value : defaultNotesColor
}

watch(() => props.channel, (channel) => {
  if (channel == null) { return }

  const rawNotes = channel.notes ?? channel.note ?? ''
  draftNotes.value = typeof rawNotes === 'string' ? rawNotes : ''

  draftNotesColor.value = normalizeStoredNotesColor(channel.notesColor ?? '')
  draftHighlighted.value = channel.highlighted === true
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
    highlighted: draftHighlighted.value,
  })
}

function resetNotesColor() {
  draftNotesColor.value = defaultNotesColor
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
  overflow: hidden;
  box-sizing: border-box;
}

.formSection {
  padding: 14px;
  border-radius: 12px;
  background-color: #282828;
  box-shadow: 0 0 0 1px var(--primary-shadow-color);
}

.notesSection {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-block-size: 0;
}

.fieldLabel {
  display: block;
  font-weight: 600;
  margin-block-end: 8px;
}

.notesField {
  box-sizing: border-box;
  inline-size: 100%;
  flex: 1;
  min-block-size: 0;
  padding: 12px;
  border: 0;
  border-radius: 8px;
  font-size: 15px;
  line-height: 1.45;
  font-family: inherit;
  color: var(--secondary-text-color);
  background-color: var(--search-bar-color);
  resize: none;
}

.notesField:focus {
  outline: 2px solid var(--primary-color);
  outline-offset: 1px;
}

.colorAndHighlightRow {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.colorSwatches {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
}

.highlightControl {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  user-select: none;
  flex-shrink: 0;
}

.highlightCheckbox {
  appearance: none;
  box-sizing: border-box;
  inline-size: 20px;
  block-size: 20px;
  margin: 0;
  border: 2px solid var(--primary-text-color);
  border-radius: 4px;
  background-color: transparent;
  cursor: pointer;
}

.highlightCheckbox:checked {
  background-color: var(--primary-color);
  border-color: var(--primary-color);
  box-shadow: inset 0 0 0 2px var(--card-bg-color);
}

.highlightLabel {
  font-size: 15px;
  font-weight: 600;
  line-height: 1;
}

.colorSwatch {
  block-size: 40px;
  inline-size: 40px;
  border-radius: 8px;
  border: 2px solid transparent;
  box-sizing: border-box;
  cursor: pointer;
  padding: 0;
  transition: border-color 0.12s ease-out;
}

.colorSwatch:hover {
  border-color: rgb(255 255 255 / 45%);
}

.colorSwatch.selected {
  border-color: #fff;
}

.actions {
  margin-block-start: auto;
  justify-content: center;
  flex-wrap: wrap;
  gap: 8px;
}
</style>

<style>
.channelSubscriptionEditDialog.ft-card.promptCard {
  box-sizing: border-box;
  inline-size: 500px;
  block-size: 560px;
  max-inline-size: min(500px, 95vw) !important;
  max-block-size: min(560px, 95vh);
  border-radius: 16px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  padding-block: 16px 20px;
  padding-inline: 20px;
  scrollbar-width: none;
}

.channelSubscriptionEditDialog.ft-card.promptCard::-webkit-scrollbar {
  display: none;
  inline-size: 0;
}
</style>
