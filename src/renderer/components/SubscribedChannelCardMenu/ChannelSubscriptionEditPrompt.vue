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
        <p
          v-if="channelHandleUrl"
          class="dialogChannelUrl"
          dir="ltr"
        >
          {{ channelHandleUrl }}
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
            :key="`notes-${option.value || 'default'}`"
            type="button"
            class="colorSwatch"
            role="radio"
            :aria-checked="draftNotesColor === option.value"
            :class="{
              selected: draftNotesColor === option.value,
              isDefault: option.value === defaultNotesColor
            }"
            :style="option.display ? { backgroundColor: option.display } : undefined"
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
            :key="`highlight-${option.value || 'default'}`"
            type="button"
            class="colorSwatch"
            role="radio"
            :aria-checked="draftHighlightColor === option.value"
            :class="{
              selected: draftHighlightColor === option.value,
              isDefault: option.value === defaultHighlightColor
            }"
            :style="option.display ? { backgroundColor: option.display } : undefined"
            :title="option.label"
            @click="selectHighlightColor(option.value)"
          />
        </div>
      </section>
      <FtFlexBox class="actions">
        <FtButton
          class="actionButton saveButton"
          :label="t('Channels.Save Channel Notes')"
          background-color="color-mix(in srgb, var(--primary-color) 78%, transparent)"
          text-color="var(--ui-glass-text-strong, rgb(255 255 255 / 92%))"
          @click="save"
        />
        <FtButton
          class="actionButton cancelButton"
          :label="t('Cancel')"
          background-color="rgb(0 0 0 / 10%)"
          text-color="var(--ui-glass-text-strong, rgb(255 255 255 / 92%))"
          @click="cancel"
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

import {
  channelAccentColors,
  normalizeBaseTheme,
} from '../../helpers/colors'
import { resolveYoutubeChannelHandleUrl } from '../../helpers/youtubeChannelHandle'
import store from '../../store/index'

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

const isLightTheme = computed(() => {
  const systemPreference = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  return normalizeBaseTheme(store.getters.getBaseTheme || 'dark', systemPreference) === 'light'
})

const noteColorOptions = computed(() => {
  const labels = {
    red: t('Channels.Note Color Red'),
    yellow: t('Channels.Note Color Yellow'),
    blue: t('Channels.Note Color Blue'),
    green: t('Channels.Note Color Green'),
    purple: t('Channels.Note Color Purple'),
  }

  return [
    ...channelAccentColors.map((entry) => ({
      label: labels[entry.key],
      value: entry.dark,
      display: isLightTheme.value ? entry.light : entry.dark,
    })),
    { label: t('Channels.Note Color Default'), value: '', display: '' },
  ]
})

const draftNotes = ref('')
const draftNotesColor = ref(defaultNotesColor)
const draftHighlightColor = ref(defaultHighlightColor)
const draftHighlighted = ref(false)
const draftBoldChannelName = ref(false)
const channelHandleUrl = ref('')

/**
 * @param {string} color
 */
function normalizeStoredColor(color) {
  if (typeof color !== 'string' || color.trim() === '') {
    return ''
  }
  const normalized = color.trim().toLowerCase()
  const match = channelAccentColors.find((entry) => {
    return entry.dark.toLowerCase() === normalized || entry.light.toLowerCase() === normalized
  })
  return match ? match.dark : ''
}

/**
 * @param {object|null} channel
 */
async function loadChannelHandleUrl(channel) {
  channelHandleUrl.value = ''
  if (channel?.id == null) {
    return
  }

  const expectedChannelId = channel.id
  try {
    const handleUrl = await resolveYoutubeChannelHandleUrl(channel.id)
    if (props.channel?.id === expectedChannelId) {
      channelHandleUrl.value = handleUrl ?? ''
    }
  } catch (error) {
    console.error(error)
    if (props.channel?.id === expectedChannelId) {
      channelHandleUrl.value = ''
    }
  }
}

watch(() => props.channel, (channel) => {
  if (channel == null) {
    channelHandleUrl.value = ''
    return
  }

  const rawNotes = channel.notes ?? channel.note ?? ''
  draftNotes.value = typeof rawNotes === 'string' ? rawNotes : ''

  draftNotesColor.value = normalizeStoredColor(channel.notesColor ?? '')
  draftHighlightColor.value = normalizeStoredColor(channel.highlightColor ?? '')
  draftHighlighted.value = channel.highlighted === true
  draftBoldChannelName.value = channel.boldChannelName === true
  loadChannelHandleUrl(channel)
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
  if (!value) {
    draftBoldChannelName.value = false
  }
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

/**
 * @param {string} value
 */
function selectHighlightColor(value) {
  draftHighlightColor.value = value
  draftHighlighted.value = true
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
  color: var(--ui-glass-text-strong, rgb(255 255 255 / 92%));
}

.dialogChannelName {
  margin: 0;
  color: var(--ui-glass-text-muted, rgb(255 255 255 / 55%));
  font-size: 1rem;
  font-weight: 500;
}

.dialogChannelUrl {
  margin: 6px 0 0;
  color: var(--ui-glass-text-muted, rgb(255 255 255 / 55%));
  font-size: 0.85rem;
  font-weight: 400;
  line-height: 1.35;
  word-break: break-all;
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
  background-color: rgb(0 0 0 / 10%);
  border: 1px solid var(--ui-glass-border, rgb(255 255 255 / 12%));
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
  color: var(--ui-glass-text, rgb(255 255 255 / 86%));
}

.fieldLabel {
  display: block;
  font-weight: 600;
  margin-block-end: 8px;
  color: var(--ui-glass-text, rgb(255 255 255 / 82%));
}

.notesField {
  box-sizing: border-box;
  inline-size: 100%;
  flex: 1;
  min-block-size: 96px;
  padding: 12px;
  border: 1px solid var(--ui-glass-border, rgb(255 255 255 / 10%));
  border-radius: 10px;
  font-size: 15px;
  line-height: 1.45;
  font-family: inherit;
  color: var(--ui-glass-text-strong, rgb(255 255 255 / 88%));
  background-color: rgb(0 0 0 / 10%);
  resize: none;
}

.notesField::placeholder {
  color: var(--ui-glass-text-muted, rgb(255 255 255 / 40%));
}

.notesField:focus {
  outline: none;
  border-color: color-mix(in srgb, var(--ui-glass-border, rgb(255 255 255 / 28%)) 100%, transparent);
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--ui-glass-border, rgb(255 255 255 / 10%)) 100%, transparent);
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
  border: 2px solid var(--ui-glass-border, rgb(255 255 255 / 12%));
  box-sizing: border-box;
  cursor: pointer;
  padding: 0;
  transition: border-color 0.12s ease-out, box-shadow 0.12s ease-out;
}

.colorSwatch.isDefault {
  background-color: var(--primary-text-color, #eee);
  background-image:
    linear-gradient(45deg, rgb(0 0 0 / 18%) 25%, transparent 25%),
    linear-gradient(-45deg, rgb(0 0 0 / 18%) 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, rgb(0 0 0 / 18%) 75%),
    linear-gradient(-45deg, transparent 75%, rgb(0 0 0 / 18%) 75%);
  background-position: 0 0, 0 6px, 6px -6px, -6px 0;
  background-size: 12px 12px;
}

.colorSwatch:hover {
  border-color: color-mix(in srgb, var(--ui-glass-text-strong, #fff) 45%, transparent);
}

.colorSwatch.selected {
  border-color: var(--ui-glass-text-strong, #fff);
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--ui-glass-text-strong, #fff) 35%, transparent);
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
  transition: background-color 0.15s ease-out, border-color 0.15s ease-out, filter 0.15s ease-out;
}

.actions :deep(.cancelButton.btn) {
  border-color: var(--ui-glass-border, rgb(255 255 255 / 28%));
  background-color: rgb(0 0 0 / 10%) !important;
  color: var(--ui-glass-text-strong, rgb(255 255 255 / 92%)) !important;
}

.actions :deep(.cancelButton.btn:hover) {
  background-color: rgb(0 0 0 / 14%) !important;
  border-color: color-mix(in srgb, var(--ui-glass-border, rgb(255 255 255 / 48%)) 100%, transparent);
  filter: none;
}

.actions :deep(.saveButton.btn) {
  border-color: color-mix(in srgb, var(--primary-color) 62%, white 18%);
}

.actions :deep(.saveButton.btn:hover) {
  background-color: color-mix(in srgb, var(--primary-color) 92%, white 12%) !important;
  border-color: color-mix(in srgb, var(--primary-color) 70%, white 30%);
  filter: none;
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
