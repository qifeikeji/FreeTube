<template>
  <FtPrompt
    v-if="video != null"
    autosize
    theme="flex-column"
    prompt-card-class="videoDescriptionDialog"
    @click="handlePromptClick"
  >
    <template #label="{ labelId }">
      <div class="dialogHeader">
        <h2
          :id="labelId"
          class="dialogTitle"
        >
          {{ t('Video.View Video Description') }}
        </h2>
        <p
          class="dialogVideoTitle"
          dir="auto"
        >
          {{ video.title }}
        </p>
      </div>
    </template>
    <div class="descriptionBody">
      <div
        class="descriptionScroll"
        tabindex="0"
      >
        <FtLoader
          v-if="isLoading"
          class="descriptionLoader"
        />
        <p
          v-else-if="errorMessage"
          class="descriptionMessage"
          dir="auto"
        >
          {{ errorMessage }}
        </p>
        <p
          v-else-if="!hasDescription"
          class="descriptionMessage"
          dir="auto"
        >
          {{ t('Video.No Video Description') }}
        </p>
        <div
          v-else-if="descriptionHtml"
          v-safer-html="descriptionHtml"
          class="descriptionText"
          dir="auto"
        />
        <p
          v-else
          class="descriptionText"
          dir="auto"
        >
          {{ descriptionText }}
        </p>
      </div>
      <FtFlexBox class="actions">
        <FtButton
          class="actionButton copyButton"
          :label="t('Copy')"
          background-color="color-mix(in srgb, var(--primary-color) 78%, transparent)"
          text-color="var(--ui-glass-text-strong, rgb(255 255 255 / 92%))"
          @click="copyDescription"
        />
        <FtButton
          class="actionButton closeButton"
          :label="t('Close')"
          background-color="rgb(0 0 0 / 10%)"
          text-color="var(--ui-glass-text-strong, rgb(255 255 255 / 92%))"
          @click="close"
        />
      </FtFlexBox>
    </div>
  </FtPrompt>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useI18n } from '../../composables/use-i18n-polyfill'

import FtPrompt from '../FtPrompt/FtPrompt.vue'
import FtFlexBox from '../ft-flex-box/ft-flex-box.vue'
import FtButton from '../FtButton/FtButton.vue'
import FtLoader from '../FtLoader/FtLoader.vue'

import { vSaferHtml } from '../../directives/vSaferHtml.js'
import { getLocalVideoDescription } from '../../helpers/api/local'
import { copyToClipboard } from '../../helpers/utils'

const props = defineProps({
  video: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['close'])

const { t } = useI18n()

const isLoading = ref(false)
const errorMessage = ref('')
const descriptionText = ref('')
const descriptionHtml = ref('')
let loadToken = 0

const hasDescription = computed(() => {
  return descriptionText.value.trim().length > 0 || descriptionHtml.value.trim().length > 0
})

const copyableText = computed(() => {
  if (descriptionText.value.trim().length > 0) {
    return descriptionText.value
  }

  if (descriptionHtml.value.trim().length > 0) {
    const container = document.createElement('div')
    container.innerHTML = descriptionHtml.value
    return container.textContent ?? ''
  }

  return ''
})

watch(() => props.video, (video) => {
  loadDescription(video)
}, { immediate: true })

/**
 * @param {object | null} video
 */
async function loadDescription(video) {
  const token = ++loadToken

  descriptionText.value = ''
  descriptionHtml.value = ''
  errorMessage.value = ''

  if (video == null) {
    isLoading.value = false
    return
  }

  const existingDescription = typeof video.description === 'string' ? video.description : ''
  if (existingDescription.trim().length > 0) {
    descriptionText.value = existingDescription
    isLoading.value = false
    return
  }

  if (!video.videoId) {
    isLoading.value = false
    return
  }

  isLoading.value = true

  try {
    const result = await getLocalVideoDescription(video.videoId)
    if (token !== loadToken) {
      return
    }

    descriptionText.value = result.text ?? ''
    descriptionHtml.value = result.html ?? ''
  } catch (error) {
    console.error(error)
    if (token !== loadToken) {
      return
    }

    errorMessage.value = t('Local API Error (Click to copy)')
  } finally {
    if (token === loadToken) {
      isLoading.value = false
    }
  }
}

/**
 * @param {null} value
 */
function handlePromptClick(value) {
  if (value === null) {
    close()
  }
}

async function copyDescription() {
  const text = copyableText.value
  if (!text) {
    return
  }

  await copyToClipboard(text, {
    messageOnSuccess: t('Share.Video Description copied to clipboard')
  })
}

function close() {
  emit('close')
}
</script>

<style scoped>
.dialogHeader {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-block-end: 14px;
  flex-shrink: 0;
}

.dialogTitle {
  margin: 0;
  font-size: 1.2rem;
  font-weight: 650;
  color: var(--ui-glass-text-strong, rgb(255 255 255 / 92%));
}

.dialogVideoTitle {
  margin: 0;
  font-size: 0.95rem;
  line-height: 1.4;
  color: var(--ui-glass-text-muted, rgb(255 255 255 / 62%));
  overflow-wrap: anywhere;
}

.descriptionBody {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-block-size: 0;
  gap: 14px;
}

.descriptionScroll {
  flex: 1;
  min-block-size: 0;
  overflow: auto;
  padding: 14px 16px;
  border-radius: 14px;
  border: 1px solid var(--ui-glass-border, rgb(255 255 255 / 12%));
  background-color: rgb(0 0 0 / 10%);
  backdrop-filter: blur(10px);
  /* stylelint-disable-next-line property-no-vendor-prefix */
  -webkit-backdrop-filter: blur(10px);
  scrollbar-width: none;
}

.descriptionScroll::-webkit-scrollbar {
  display: none;
  inline-size: 0;
  block-size: 0;
}

.descriptionLoader {
  display: flex;
  justify-content: center;
  align-items: center;
  min-block-size: 180px;
}

.descriptionMessage,
.descriptionText {
  margin: 0;
  font-size: 15px;
  line-height: 1.55;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  color: var(--ui-glass-text-strong, rgb(255 255 255 / 88%));
}

.descriptionMessage {
  color: var(--ui-glass-text-muted, rgb(255 255 255 / 55%));
}

.descriptionText :deep(a) {
  color: var(--primary-color);
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

.actions :deep(.closeButton.btn) {
  border-color: var(--ui-glass-border, rgb(255 255 255 / 28%));
  background-color: rgb(0 0 0 / 10%) !important;
  color: var(--ui-glass-text-strong, rgb(255 255 255 / 92%)) !important;
}

.actions :deep(.closeButton.btn:hover) {
  background-color: rgb(0 0 0 / 14%) !important;
  border-color: color-mix(in srgb, var(--ui-glass-border, rgb(255 255 255 / 48%)) 100%, transparent);
  filter: none;
}

.actions :deep(.copyButton.btn) {
  border-color: color-mix(in srgb, var(--primary-color) 62%, white 18%);
}

.actions :deep(.copyButton.btn:hover) {
  background-color: color-mix(in srgb, var(--primary-color) 92%, white 12%) !important;
  border-color: color-mix(in srgb, var(--primary-color) 70%, white 30%);
  filter: none;
}
</style>

<style>
.videoDescriptionDialog.ft-card.promptCard {
  box-sizing: border-box;
  inline-size: 750px;
  block-size: 850px;
  max-inline-size: min(750px, 95vw) !important;
  max-block-size: min(850px, 95vh);
  border-radius: 18px;
  overflow: hidden;
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
}
</style>
