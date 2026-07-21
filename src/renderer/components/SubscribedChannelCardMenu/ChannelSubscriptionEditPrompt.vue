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
      <section class="formSection togglesSection">
        <div class="togglesRow">
          <FtToggleSwitch
            :label="t('Channels.Highlight Channel')"
            :default-value="draftHighlighted"
            :compact="true"
            @change="draftHighlighted = $event"
          />
          <FtToggleSwitch
            :label="t('Channels.Bold Channel Name')"
            :default-value="draftBoldChannelName"
            :compact="true"
            @change="draftBoldChannelName = $event"
          />
        </div>
      </section>
      <section class="formSection">
        <span
          :id="colorFieldId"
          class="fieldLabel"
        >
          {{ t('Channels.Notes Color') }}
        </span>
        <div
          class="colorSwatches"
          role="radiogroup"
          :aria-labelledby="colorFieldId"
        >
          <button
            v-for="option in noteColorOptions"
            :key="`notes-${option.value}`"
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
      </section>
      <section class="formSection">
        <span
          :id="highlightColorFieldId"
          class="fieldLabel"
        >
          {{ t('Channels.Highlight Color') }}
        </span>
        <div
          class="colorSwatches"
          role="radiogroup"
          :aria-labelledby="highlightColorFieldId"
        >
          <button
            v-for="option in noteColorOptions"
            :key="`highlight-${option.value}`"
            type="button"
            class="colorSwatch"
            role="radio"
            :aria-checked="draftHighlightColor === option.value"
            :class="{ selected: draftHighlightColor === option.value }"
            :style="{ backgroundColor: option.value }"
            :title="option.label"
            @click="draftHighlightColor = option.value"
          />
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
          @click="resetColors"
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
import FtToggleSwitch from '../FtToggleSwitch/FtToggleSwitch.vue'

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
const highlightColorFieldId = useId()

const defaultNotesColor = ''
const defaultHighlightColor = ''

const noteColorOptions = computed(() => [
  { label: t('Channels.Note Color Red'), value: '#e53935' },
  { label: t('Channels.Note Color Yellow'), value: '#fdd835' },
  { label: t('Channels.Note Color Blue'), value: '#1e88e5' },
  { label: t('Channels.Note Color Green'), value: '#43a047' },
  { label: t('Channels.Note Color Purple'), value: '#8e24aa' },
])

const draftNotes = ref('')
const draftNotesColor = ref(defaultNotesColor)
const draftHighlightColor = ref(defaultHighlightColor)
const draftHighlighted = ref(false)
const draftBoldChannelName = ref(false)

/**
 * @param {string} color
 */
function normalizeStoredColor(color) {
  if (typeof color !== 'string' || color.trim() === '') {
    return ''
  }
  const normalized = color.trim().toLowerCase()
  const match = noteColorOptions.value.find((option) => option.value.toLowerCase() === normalized)
  return match ? match.value : ''
}

watch(() => props.channel, (channel) => {
  if (channel == null) { return }

  const rawNotes = channel.notes ?? channel.note ?? ''
  draftNotes.value = typeof rawNotes === 'string' ? rawNotes : ''

  draftNotesColor.value = normalizeStoredColor(channel.notesColor ?? '')
  draftHighlightColor.value = normalizeStoredColor(channel.highlightColor ?? '')
  draftHighlighted.value = channel.highlighted === true
  draftBoldChannelName.value = channel.boldChannelName === true
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
    highlightColor: draftHighlightColor.value === defaultHighlightColor ? '' : draftHighlightColor.value,
    highlighted: draftHighlighted.value,
    boldChannelName: draftBoldChannelName.value,
  })
}

function resetColors() {
  draftNotesColor.value = defaultNotesColor
  draftHighlightColor.value = defaultHighlightColor
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
  gap: 12px;
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

.togglesSection {
  padding-block: 8px;
}

.togglesRow {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px 24px;
}

.togglesRow :deep(.switch-ctn) {
  flex: 1 1 140px;
  min-inline-size: 0;
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

.colorSwatches {
  display: flex;
  flex-wrap: nowrap;
  align-items: stretch;
  gap: 10px;
  inline-size: 100%;
}

.colorSwatch {
  flex: 1 1 0;
  block-size: 40px;
  min-inline-size: 0;
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
  block-size: 640px;
  max-inline-size: min(500px, 95vw) !important;
  max-block-size: min(640px, 95vh);
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
