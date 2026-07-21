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
            @change="onHighlightChange"
          />
          <FtToggleSwitch
            :label="t('Channels.Bold Channel Name')"
            :default-value="draftBoldChannelName"
            :compact="true"
            @change="onBoldChange"
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
          class="actionButton saveButton"
          :label="t('Channels.Save Channel Notes')"
          background-color="color-mix(in srgb, var(--primary-color) 72%, transparent)"
          text-color="var(--ui-glass-text-strong, rgb(255 255 255 / 92%))"
          @click="save"
        />
        <FtButton
          class="actionButton cancelButton"
          :label="t('Cancel')"
          background-color="var(--ui-glass-control, rgb(0 0 0 / 38%))"
          text-color="var(--ui-glass-text-strong, rgb(255 255 255 / 92%))"
          @click="cancel"
        />
        <FtButton
          class="actionButton resetButton"
          :label="t('Channels.Reset Notes Color')"
          background-color="color-mix(in srgb, var(--accent-color) 72%, transparent)"
          text-color="var(--ui-glass-text-strong, rgb(255 255 255 / 92%))"
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

/**
 * @param {boolean} value
 */
function onHighlightChange(value) {
  draftHighlighted.value = value
}

/**
 * @param {boolean} value
 */
function onBoldChange(value) {
  draftBoldChannelName.value = value
  if (value) {
    draftHighlighted.value = true
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
  flex-shrink: 0;
}

.dialogTitle {
  margin-block: 0 6px;
  color: rgb(255 255 255 / 92%);
}

.dialogChannelName {
  margin: 0;
  color: rgb(255 255 255 / 55%);
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
  overflow-x: visible;
  overflow-y: auto;
  box-sizing: border-box;
  padding-inline: 2px;
  padding-block: 2px;
}

.formSection {
  box-sizing: border-box;
  padding: 14px;
  border-radius: 14px;
  background-color: rgb(0 0 0 / 38%);
  border: 1px solid rgb(255 255 255 / 12%);
  box-shadow: none;
  backdrop-filter: blur(10px);
  /* stylelint-disable-next-line property-no-vendor-prefix */
  -webkit-backdrop-filter: blur(10px);
}

.notesSection {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-block-size: 120px;
}

.togglesSection {
  padding-block: 10px;
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

.togglesRow :deep(.switch-label) {
  color: rgb(255 255 255 / 86%);
}

.fieldLabel {
  display: block;
  font-weight: 600;
  margin-block-end: 8px;
  color: rgb(255 255 255 / 82%);
}

.notesField {
  box-sizing: border-box;
  inline-size: 100%;
  flex: 1;
  min-block-size: 96px;
  padding: 12px;
  border: 1px solid rgb(255 255 255 / 10%);
  border-radius: 10px;
  font-size: 15px;
  line-height: 1.45;
  font-family: inherit;
  color: rgb(255 255 255 / 88%);
  background-color: rgb(0 0 0 / 35%);
  resize: none;
}

.notesField::placeholder {
  color: rgb(255 255 255 / 40%);
}

.notesField:focus {
  outline: none;
  border-color: rgb(255 255 255 / 28%);
  box-shadow: 0 0 0 1px rgb(255 255 255 / 10%);
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
  border-radius: 10px;
  border: 2px solid rgb(255 255 255 / 12%);
  box-sizing: border-box;
  cursor: pointer;
  padding: 0;
  transition: border-color 0.12s ease-out, box-shadow 0.12s ease-out;
}

.colorSwatch:hover {
  border-color: rgb(255 255 255 / 45%);
}

.colorSwatch.selected {
  border-color: #fff;
  box-shadow: 0 0 0 1px rgb(255 255 255 / 35%);
}

.actions {
  margin-block-start: auto;
  justify-content: center;
  flex-wrap: wrap;
  gap: 8px;
  flex-shrink: 0;
  padding-block-start: 4px;
}

.actions :deep(.btn) {
  box-sizing: border-box;
  block-size: var(--ui-control-height, 36px);
  min-block-size: var(--ui-control-height, 36px);
  margin: 0;
  padding-block: var(--ui-control-padding-block, 8px);
  padding-inline: 16px;
  border-width: 1px;
  border-style: solid;
  border-radius: var(--ui-control-radius, 10px);
  box-shadow: none;
  backdrop-filter: blur(10px);
  /* stylelint-disable-next-line property-no-vendor-prefix */
  -webkit-backdrop-filter: blur(10px);
}

.actions :deep(.cancelButton.btn) {
  border-color: var(--ui-glass-border, rgb(255 255 255 / 12%));
}

.actions :deep(.saveButton.btn) {
  border-color: color-mix(in srgb, var(--primary-color) 55%, transparent);
}

.actions :deep(.resetButton.btn) {
  border-color: color-mix(in srgb, var(--accent-color) 55%, transparent);
}

.actions :deep(.btn:hover) {
  filter: brightness(1.08);
}
</style>

<style>
.channelSubscriptionEditDialog.ft-card.promptCard {
  box-sizing: border-box;
  inline-size: 500px;
  block-size: auto;
  max-inline-size: min(500px, 95vw) !important;
  max-block-size: min(680px, 95vh);
  border-radius: 18px;
  overflow: visible;
  display: flex;
  flex-direction: column;
  padding-block: 18px 20px;
  padding-inline: 20px;
  background-color: var(--ui-glass-surface, rgb(18 18 18 / 72%)) !important;
  border: 1px solid var(--ui-glass-border, rgb(255 255 255 / 12%));
  box-shadow: 0 16px 40px rgb(0 0 0 / 40%);
  color: var(--ui-glass-text-strong, rgb(255 255 255 / 90%));
  backdrop-filter: blur(20px) saturate(140%);
  /* stylelint-disable-next-line property-no-vendor-prefix */
  -webkit-backdrop-filter: blur(20px) saturate(140%);
  scrollbar-width: thin;
}
</style>
