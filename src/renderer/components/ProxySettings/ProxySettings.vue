<template>
  <FtSettingsSection
    :title="$t('Settings.Proxy Settings.Proxy Settings')"
  >
    <FtFlexBox class="settingsFlexStart500px">
      <p
        v-if="useProxy"
        class="proxy-warning"
      >
        <FontAwesomeIcon
          :icon="['fas', 'circle-exclamation']"
          class="warning-icon"
        />
        {{ $t('Settings.Proxy Settings.Proxy Warning') }}
      </p>
      <FtToggleSwitch
        :label="$t('Settings.Proxy Settings.Enable Tor / Proxy')"
        :default-value="useProxy"
        @change="handleUpdateProxy"
      />
    </FtFlexBox>
    <template
      v-if="useProxy"
    >
      <p class="center">
        {{ $t('Settings.Proxy Settings.Clicking on Test Proxy will send a request to') }} {{ proxyTestUrl }}
      </p>
      <FtFlexBox class="proxyActionRow">
        <FtButton
          class="proxyActionButton"
          :label="$t('Settings.Proxy Settings.New Proxy')"
          background-color="var(--ui-glass-control, rgb(0 0 0 / 38%))"
          text-color="var(--ui-glass-text-strong, rgb(255 255 255 / 92%))"
          @click="addProxy"
        />
        <FtButton
          class="proxyActionButton"
          :label="$t('Settings.Proxy Settings.Test Proxy')"
          @click="testProxy"
        />
      </FtFlexBox>
      <div
        v-if="proxies.length > 0"
        class="proxyList"
      >
        <div
          v-for="proxy in proxies"
          :key="proxy.id"
          class="proxyRow"
          :class="{ selected: proxy.selected }"
        >
          <FtSelect
            class="proxyProtocol"
            :placeholder="$t('Settings.Proxy Settings.Proxy Protocol')"
            :value="proxy.protocol"
            :select-names="PROTOCOL_NAMES"
            :select-values="PROTOCOL_VALUES"
            :icon="['fas', 'network-wired']"
            @change="(value) => updateProxyField(proxy.id, 'protocol', value)"
          />
          <FtInput
            class="proxyHost"
            :placeholder="$t('Settings.Proxy Settings.Proxy Host')"
            :show-action-button="false"
            show-label
            :value="proxy.hostname"
            @input="(value) => updateProxyField(proxy.id, 'hostname', value)"
            @keydown.enter="testProxy"
          />
          <FtInput
            class="proxyPort"
            :placeholder="$t('Settings.Proxy Settings.Proxy Port Number')"
            :show-action-button="false"
            show-label
            :value="proxy.port"
            :maxlength="5"
            @input="(value) => updateProxyField(proxy.id, 'port', value)"
            @keydown.enter="testProxy"
          />
          <button
            type="button"
            class="proxyDeleteButton"
            :title="$t('Settings.Proxy Settings.Delete Proxy')"
            :aria-label="$t('Settings.Proxy Settings.Delete Proxy')"
            @click="removeProxy(proxy.id)"
          >
            <FontAwesomeIcon :icon="['fas', 'trash']" />
          </button>
          <FtToggleSwitch
            class="proxySelectSwitch"
            :label="$t('Settings.Proxy Settings.Use This Proxy')"
            :default-value="proxy.selected"
            :compact="true"
            @change="(enabled) => selectProxy(proxy.id, enabled)"
          />
        </div>
      </div>
      <FtFlexBox
        v-if="areCredentialsSupported"
      >
        <FtInput
          :placeholder="$t('Settings.Proxy Settings.Proxy Username')"
          :show-action-button="false"
          show-label
          :value="proxyUsername"
          @input="handleUpdateProxyUsername"
          @keydown.enter="testProxy"
        />
        <FtInput
          :placeholder="$t('Settings.Proxy Settings.Proxy Password')"
          :show-action-button="false"
          show-label
          :value="proxyPassword"
          input-type="password"
          @input="handleUpdateProxyPassword"
          @keydown.enter="testProxy"
        />
      </FtFlexBox>
      <FtLoader
        v-if="isLoading"
      />
      <div
        v-if="!isLoading && dataAvailable"
        class="center"
      >
        <h3>
          {{ $t('Settings.Proxy Settings.Your Info') }}
        </h3>
        <p>
          {{ $t('Display Label', { label: $t('Settings.Proxy Settings.Ip'), value: proxyIp }) }}
        </p>
        <p>
          {{ $t('Display Label', { label: $t('Settings.Proxy Settings.Country'), value: proxyCountry }) }}
        </p>
        <p>
          {{ $t('Display Label', { label: $t('Settings.Proxy Settings.Region'), value: proxyRegion }) }}
        </p>
        <p>
          {{ $t('Display Label', { label: $t('Settings.Proxy Settings.City'), value: proxyCity }) }}
        </p>
      </div>
    </template>
  </FtSettingsSection>
</template>

<script setup>
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from '../../composables/use-i18n-polyfill'

import FtSettingsSection from '../FtSettingsSection/FtSettingsSection.vue'
import FtToggleSwitch from '../FtToggleSwitch/FtToggleSwitch.vue'
import FtButton from '../FtButton/FtButton.vue'
import FtSelect from '../FtSelect/FtSelect.vue'
import FtInput from '../FtInput/FtInput.vue'
import FtLoader from '../FtLoader/FtLoader.vue'
import FtFlexBox from '../ft-flex-box/ft-flex-box.vue'

import store from '../../store/index'

import { debounce, showToast } from '../../helpers/utils'

const { locale, t } = useI18n()

const PROTOCOL_NAMES = [
  'HTTP',
  'HTTPS',
  'SOCKS5'
]

const PROTOCOL_VALUES = [
  'http',
  'https',
  'socks5'
]

/**
 * @typedef {{ id: string, protocol: string, hostname: string, port: string, selected: boolean }} ProxyEntry
 */

const isLoading = ref(false)
const dataAvailable = ref(false)
const proxyIp = ref('')
const proxyCountry = ref('')
const proxyRegion = ref('')
const proxyCity = ref('')

/** @type {import('vue').ComputedRef<boolean>} */
const useProxy = computed(() => store.getters.getUseProxy)

/** @type {import('vue').ComputedRef<string>} */
const proxyUsername = computed(() => store.getters.getProxyUsername)

/** @type {import('vue').ComputedRef<string>} */
const proxyPassword = computed(() => store.getters.getProxyPassword)

/** @type {import('vue').Ref<ProxyEntry[]>} */
const proxies = ref([])

function createProxyId() {
  return `proxy-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

/**
 * @returns {ProxyEntry[]}
 */
function readStoredProxyList() {
  const raw = store.getters.getProxyList
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw
    if (!Array.isArray(parsed)) {
      return []
    }
    return parsed
      .filter((entry) => entry && typeof entry === 'object')
      .map((entry) => ({
        id: typeof entry.id === 'string' ? entry.id : createProxyId(),
        protocol: PROTOCOL_VALUES.includes(entry.protocol) ? entry.protocol : 'socks5',
        hostname: typeof entry.hostname === 'string' && entry.hostname.length > 0 ? entry.hostname : '127.0.0.1',
        port: typeof entry.port === 'string' && entry.port.length > 0 ? entry.port : '9050',
        selected: entry.selected === true,
      }))
  } catch {
    return []
  }
}

/**
 * @param {ProxyEntry[]} list
 */
function persistProxyList(list) {
  let selectedCount = 0
  const normalized = list.map((entry) => {
    const selected = entry.selected === true && selectedCount === 0
    if (selected) {
      selectedCount += 1
    }
    return {
      ...entry,
      selected,
    }
  })

  proxies.value = normalized
  store.dispatch('updateProxyList', JSON.stringify(normalized))

  const selected = normalized.find((entry) => entry.selected) ?? null
  if (selected != null) {
    store.dispatch('updateProxyProtocol', selected.protocol)
    store.dispatch('updateProxyHostname', selected.hostname)
    store.dispatch('updateProxyPort', selected.port)
    if (useProxy.value) {
      debouncedEnableProxy()
    }
  }
}

function ensureProxyListInitialized() {
  const stored = readStoredProxyList()
  if (stored.length > 0) {
    proxies.value = stored
    const selected = stored.find((entry) => entry.selected)
    if (selected != null) {
      store.dispatch('updateProxyProtocol', selected.protocol)
      store.dispatch('updateProxyHostname', selected.hostname)
      store.dispatch('updateProxyPort', selected.port)
    }
    return
  }

  // Migrate legacy single-proxy settings into the list.
  const legacy = {
    id: createProxyId(),
    protocol: PROTOCOL_VALUES.includes(store.getters.getProxyProtocol)
      ? store.getters.getProxyProtocol
      : 'socks5',
    hostname: store.getters.getProxyHostname || '127.0.0.1',
    port: store.getters.getProxyPort || '9050',
    selected: true,
  }
  persistProxyList([legacy])
}

const selectedProxy = computed(() => proxies.value.find((entry) => entry.selected) ?? null)

const proxyUrl = computed(() => {
  const selected = selectedProxy.value
  if (selected == null) {
    return ''
  }
  return `${selected.protocol}://${selected.hostname}:${selected.port}`
})

// locales found here: https://ipwhois.io/documentation
const SUPPORTED_LANGS = ['en', 'ru', 'de', 'es', 'pt-BR', 'fr', 'zh-CN', 'ja']

const localeToUse = computed(() => {
  const freeTubeLang = locale.value

  return SUPPORTED_LANGS.find(lang => freeTubeLang === lang) ?? SUPPORTED_LANGS.find(lang => freeTubeLang.slice(0, 2) === lang.slice(0, 2))
})

const proxyTestUrl = computed(() => {
  let url = 'https://ipwho.is/?output=json&fields=ip,country,city,region'

  if (localeToUse.value) {
    url += `&lang=${localeToUse.value}`
  }

  return url
})

/** @type {import('vue').ComputedRef<boolean>} */
const areCredentialsSupported = computed(() => {
  const protocol = selectedProxy.value?.protocol
  return protocol === 'http' || protocol === 'https'
})

/**
 * @param {boolean} enabled
 */
function handleUpdateProxy(enabled) {
  if (enabled) {
    if (proxies.value.length === 0) {
      addProxy()
    } else if (selectedProxy.value == null && proxies.value.length > 0) {
      selectProxy(proxies.value[0].id, true)
    }
    enableProxy()
  } else {
    disableProxy()
  }

  store.dispatch('updateUseProxy', enabled)
}

function addProxy() {
  const next = {
    id: createProxyId(),
    protocol: 'socks5',
    hostname: '127.0.0.1',
    port: '9050',
    selected: proxies.value.length === 0,
  }
  persistProxyList([...proxies.value, next])
}

/**
 * @param {string} id
 */
function removeProxy(id) {
  const remaining = proxies.value.filter((entry) => entry.id !== id)
  if (remaining.length > 0 && !remaining.some((entry) => entry.selected)) {
    remaining[0].selected = true
  }
  persistProxyList(remaining)
}

/**
 * @param {string} id
 * @param {'protocol' | 'hostname' | 'port'} field
 * @param {string} value
 */
function updateProxyField(id, field, value) {
  const next = proxies.value.map((entry) => {
    if (entry.id !== id) {
      return entry
    }
    return {
      ...entry,
      [field]: value,
    }
  })
  persistProxyList(next)
}

/**
 * @param {string} id
 * @param {boolean} enabled
 */
function selectProxy(id, enabled) {
  const next = proxies.value.map((entry) => ({
    ...entry,
    selected: enabled ? entry.id === id : false,
  }))
  persistProxyList(next)
}

/**
 * @param {string} value
 */
function handleUpdateProxyUsername(value) {
  if (useProxy.value) {
    debouncedEnableProxy()
  }

  store.dispatch('updateProxyUsername', value)
}

/**
 * @param {string} value
 */
function handleUpdateProxyPassword(value) {
  if (useProxy.value) {
    debouncedEnableProxy()
  }

  store.dispatch('updateProxyPassword', value)
}

function enableProxy() {
  if (process.env.IS_ELECTRON && proxyUrl.value.length > 0) {
    window.ftElectron.enableProxy(proxyUrl.value)
  }
}

const debouncedEnableProxy = debounce(enableProxy, 200)

function disableProxy() {
  if (process.env.IS_ELECTRON) {
    window.ftElectron.disableProxy()
  }

  dataAvailable.value = false
  proxyIp.value = ''
  proxyCountry.value = ''
  proxyRegion.value = ''
  proxyCity.value = ''
}

async function testProxy() {
  if (selectedProxy.value == null) {
    showToast(t('Settings.Proxy Settings.Select a proxy module first'))
    return
  }

  isLoading.value = true
  enableProxy()

  try {
    const response = await fetch(proxyTestUrl.value)
    const json = await response.json()

    proxyIp.value = json.ip
    proxyCountry.value = json.country
    proxyRegion.value = json.region
    proxyCity.value = json.city
    dataAvailable.value = true
  } catch (error) {
    console.error('errored while testing proxy:', error)
    showToast(t('Settings.Proxy Settings["Error getting network information. Is your proxy configured properly?"]'))
    dataAvailable.value = false
  } finally {
    if (!useProxy.value) {
      disableProxy()
    }

    isLoading.value = false
  }
}

onMounted(() => {
  ensureProxyListInitialized()
})

watch(useProxy, (enabled) => {
  if (enabled && proxies.value.length === 0) {
    ensureProxyListInitialized()
  }
})
</script>

<style scoped src="./ProxySettings.css" />
