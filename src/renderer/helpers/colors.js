import { randomArrayItem } from './utils'

// When adding new colors here,
// remember to update the name translations in `src/renderer/composables/colors.js`
export const colors = [
  { name: 'Red', value: '#d50000' },
  { name: 'Pink', value: '#C51162' },
  { name: 'Purple', value: '#AA00FF' },
  { name: 'DeepPurple', value: '#6200EA' },
  { name: 'Indigo', value: '#304FFE' },
  { name: 'Blue', value: '#2962FF' },
  { name: 'LightBlue', value: '#0091EA' },
  { name: 'Cyan', value: '#00B8D4' },
  { name: 'Teal', value: '#00BFA5' },
  { name: 'Green', value: '#00C853' },
  { name: 'LightGreen', value: '#64DD17' },
  { name: 'Lime', value: '#AEEA00' },
  { name: 'Yellow', value: '#FFD600' },
  { name: 'Amber', value: '#FFAB00' },
  { name: 'Orange', value: '#FF6D00' },
  { name: 'DeepOrange', value: '#DD2C00' },
  { name: 'CatppuccinFrappeRosewater', value: '#f2d5cf' },
  { name: 'CatppuccinFrappeFlamingo', value: '#eebebe' },
  { name: 'CatppuccinFrappePink', value: '#f4b8e4' },
  { name: 'CatppuccinFrappeMauve', value: '#ca9ee6' },
  { name: 'CatppuccinFrappeRed', value: '#e78284' },
  { name: 'CatppuccinFrappeMaroon', value: '#ea999c' },
  { name: 'CatppuccinFrappePeach', value: '#ef9f76' },
  { name: 'CatppuccinFrappeYellow', value: '#e5c890' },
  { name: 'CatppuccinFrappeGreen', value: '#a6d189' },
  { name: 'CatppuccinFrappeTeal', value: '#81c8be' },
  { name: 'CatppuccinFrappeSky', value: '#99d1db' },
  { name: 'CatppuccinFrappeSapphire', value: '#85c1dc' },
  { name: 'CatppuccinFrappeBlue', value: '#8caaee' },
  { name: 'CatppuccinFrappeLavender', value: '#babbf1' },
  { name: 'CatppuccinLatteMauve', value: '#8839ef' },
  { name: 'CatppuccinLatteRed', value: '#d20f39' },
  { name: 'CatppuccinMochaRosewater', value: '#F5E0DC' },
  { name: 'CatppuccinMochaFlamingo', value: '#F2CDCD' },
  { name: 'CatppuccinMochaPink', value: '#F5C2E7' },
  { name: 'CatppuccinMochaMauve', value: '#CBA6F7' },
  { name: 'CatppuccinMochaRed', value: '#F38BA8' },
  { name: 'CatppuccinMochaMaroon', value: '#EBA0AC' },
  { name: 'CatppuccinMochaPeach', value: '#FAB387' },
  { name: 'CatppuccinMochaYellow', value: '#F9E2AF' },
  { name: 'CatppuccinMochaGreen', value: '#A6E3A1' },
  { name: 'CatppuccinMochaTeal', value: '#94E2D5' },
  { name: 'CatppuccinMochaSky', value: '#89DCEB' },
  { name: 'CatppuccinMochaSapphire', value: '#74C7EC' },
  { name: 'CatppuccinMochaBlue', value: '#89B4FA' },
  { name: 'CatppuccinMochaLavender', value: '#B4BEFE' },
  { name: 'DraculaCyan', value: '#8BE9FD' },
  { name: 'DraculaGreen', value: '#50FA7B' },
  { name: 'DraculaOrange', value: '#FFB86C' },
  { name: 'DraculaPink', value: '#FF79C6' },
  { name: 'DraculaPurple', value: '#BD93F9' },
  { name: 'DraculaRed', value: '#FF5555' },
  { name: 'DraculaYellow', value: '#F1FA8C' },
  { name: 'EverforestDarkRed', value: '#E67E80' },
  { name: 'EverforestDarkOrange', value: '#E69875' },
  { name: 'EverforestDarkYellow', value: '#DBBC7F' },
  { name: 'EverforestDarkGreen', value: '#A7C080' },
  { name: 'EverforestDarkAqua', value: '#83C092' },
  { name: 'EverforestDarkBlue', value: '#7FBBB3' },
  { name: 'EverforestDarkPurple', value: '#D699B6' },
  { name: 'EverforestLightRed', value: '#D83532' },
  { name: 'EverforestLightOrange', value: '#D55D0F' },
  { name: 'EverforestLightYellow', value: '#A96E00' },
  { name: 'EverforestLightGreen', value: '#6D8100' },
  { name: 'EverforestLightAqua', value: '#25976C' },
  { name: 'EverforestLightBlue', value: '#2a84b5' },
  { name: 'EverforestLightPurple', value: '#CF59aa' },
  { name: 'GruvboxDarkGreen', value: '#b8bb26' },
  { name: 'GruvboxDarkYellow', value: '#fabd2f' },
  { name: 'GruvboxDarkBlue', value: '#83a593' },
  { name: 'GruvboxDarkPurple', value: '#d3869b' },
  { name: 'GruvboxDarkAqua', value: '#8ec07c' },
  { name: 'GruvboxDarkOrange', value: '#fe8019' },
  { name: 'GruvboxLightRed', value: '#9d0006' },
  { name: 'GruvboxLightBlue', value: '#076678' },
  { name: 'GruvboxLightPurple', value: '#8f3f71' },
  { name: 'GruvboxLightOrange', value: '#af3a03' },
  { name: 'SolarizedYellow', value: '#b58900' },
  { name: 'SolarizedOrange', value: '#cb4b16' },
  { name: 'SolarizedRed', value: '#dc322f' },
  { name: 'SolarizedMagenta', value: '#d33682' },
  { name: 'SolarizedViolet', value: '#6c71c4' },
  { name: 'SolarizedBlue', value: '#268bd2' },
  { name: 'SolarizedCyan', value: '#2aa198' },
  { name: 'SolarizedGreen', value: '#859900' },
]

/** Preset colors shown in Theme Settings (main + secondary). */
export const themePresetColors = [
  { name: 'LightBlue', value: '#03a9f4', hover: '#039be5', active: '#0277bd' },
  { name: 'LightGreen', value: '#8bc34a', hover: '#7cb342', active: '#558b2f' },
  { name: 'Cyan', value: '#00bcd4', hover: '#00acc1', active: '#00838f' },
  { name: 'Red', value: '#f44336', hover: '#e53935', active: '#c62828' },
  { name: 'LightGray', value: '#bdbdbd', hover: '#9e9e9e', active: '#757575' },
  { name: 'DarkGray', value: '#616161', hover: '#424242', active: '#212121' },
]

export const ALLOWED_BASE_THEMES = ['light', 'dark']
export const ALLOWED_THEME_COLOR_NAMES = themePresetColors.map((color) => color.name)

const LIGHT_BASE_THEME_ALIASES = new Set([
  'light',
  'pastelPink',
  'catppuccinLatte',
  'gruvboxLight',
  'solarizedLight',
  'everforestLightHard',
  'everforestLightMedium',
  'everforestLightLow',
])

/**
 * @param {string} theme
 * @param {'light' | 'dark'} [systemPreference='dark']
 * @returns {'light' | 'dark'}
 */
export function normalizeBaseTheme(theme, systemPreference = 'dark') {
  if (theme === 'light' || theme === 'dark') {
    return theme
  }
  if (theme === 'system') {
    return systemPreference === 'light' ? 'light' : 'dark'
  }
  return LIGHT_BASE_THEME_ALIASES.has(theme) ? 'light' : 'dark'
}

/**
 * @param {string} colorName
 * @param {string} [fallback='Red']
 * @returns {string}
 */
export function normalizeThemeColorName(colorName, fallback = 'Red') {
  if (ALLOWED_THEME_COLOR_NAMES.includes(colorName)) {
    return colorName
  }
  return fallback
}

/**
 * @param {string} colorName
 */
export function getThemePresetColor(colorName) {
  return themePresetColors.find((color) => color.name === colorName) ?? themePresetColors[3]
}

/**
 * Channel note / highlight swatch colors (dark + light theme variants).
 * Light variants use lower lightness for readability on pale backgrounds.
 */
export const channelAccentColors = [
  { key: 'red', dark: '#e53935', light: '#c62828' },
  { key: 'yellow', dark: '#fdd835', light: '#f9a825' },
  { key: 'blue', dark: '#1e88e5', light: '#1565c0' },
  { key: 'green', dark: '#43a047', light: '#2e7d32' },
  { key: 'purple', dark: '#8e24aa', light: '#6a1b9a' },
]

/**
 * @param {string} storedColor
 * @param {boolean} isLightTheme
 * @returns {string}
 */
export function resolveChannelAccentColor(storedColor, isLightTheme) {
  if (typeof storedColor !== 'string' || storedColor.trim() === '') {
    return ''
  }
  const normalized = storedColor.trim().toLowerCase()
  const match = channelAccentColors.find((entry) => {
    return entry.dark.toLowerCase() === normalized || entry.light.toLowerCase() === normalized
  })
  if (!match) {
    return storedColor.trim()
  }
  return isLightTheme ? match.light : match.dark
}

/**
 * @param {string} hex
 * @returns {{ r: number, g: number, b: number } | null}
 */
export function parseHexColor(hex) {
  if (typeof hex !== 'string') {
    return null
  }
  const value = hex.trim()
  const match = /^#([\da-f]{3}|[\da-f]{6})$/i.exec(value)
  if (!match) {
    return null
  }
  const raw = match[1].length === 3
    ? match[1].split('').map((ch) => ch + ch).join('')
    : match[1]
  return {
    r: parseInt(raw.slice(0, 2), 16),
    g: parseInt(raw.slice(2, 4), 16),
    b: parseInt(raw.slice(4, 6), 16),
  }
}

/**
 * @param {string} hex
 * @param {number} amount positive = darker
 * @returns {string}
 */
export function adjustHexBrightness(hex, amount) {
  const rgb = parseHexColor(hex)
  if (!rgb) {
    return hex
  }
  const clamp = (n) => Math.max(0, Math.min(255, Math.round(n)))
  const toHex = (n) => clamp(n).toString(16).padStart(2, '0')
  return `#${toHex(rgb.r - amount)}${toHex(rgb.g - amount)}${toHex(rgb.b - amount)}`
}

/**
 * @param {HTMLElement} target
 * @param {string} hex
 */
export function applyCustomPrimaryColor(target, hex) {
  const rgb = parseHexColor(hex)
  if (!rgb) {
    return
  }
  const text = calculateColorLuminance(hex)
  target.style.setProperty('--primary-color', hex)
  target.style.setProperty('--primary-color-hover', adjustHexBrightness(hex, 12))
  target.style.setProperty('--primary-color-active', adjustHexBrightness(hex, 28))
  target.style.setProperty('--text-with-main-color', text)
}

/**
 * @param {HTMLElement} target
 * @param {string} hex
 */
export function applyCustomAccentColor(target, hex) {
  const rgb = parseHexColor(hex)
  if (!rgb) {
    return
  }
  const text = calculateColorLuminance(hex)
  target.style.setProperty('--accent-color-rgb', `${rgb.r} ${rgb.g} ${rgb.b}`)
  target.style.setProperty('--accent-color-hover', adjustHexBrightness(hex, 12))
  target.style.setProperty('--accent-color-active', adjustHexBrightness(hex, 28))
  target.style.setProperty('--accent-color-light', adjustHexBrightness(hex, -40))
  target.style.setProperty('--accent-color-visited', adjustHexBrightness(hex, 40))
  target.style.setProperty('--text-with-accent-color', text)
}

/**
 * @param {HTMLElement} target
 */
export function clearCustomPrimaryColor(target) {
  target.style.removeProperty('--primary-color')
  target.style.removeProperty('--primary-color-hover')
  target.style.removeProperty('--primary-color-active')
  target.style.removeProperty('--text-with-main-color')
}

/**
 * @param {HTMLElement} target
 */
export function clearCustomAccentColor(target) {
  target.style.removeProperty('--accent-color-rgb')
  target.style.removeProperty('--accent-color-hover')
  target.style.removeProperty('--accent-color-active')
  target.style.removeProperty('--accent-color-light')
  target.style.removeProperty('--accent-color-visited')
  target.style.removeProperty('--text-with-accent-color')
}

export function getRandomColorClass() {
  return 'main' + getRandomColor().name
}

export function getRandomColor() {
  return randomArrayItem(colors)
}

export function calculateColorLuminance(colorValue) {
  let colorValues

  if (colorValue.startsWith('#')) {
    const cutHex = colorValue.length === 4
      ? colorValue.slice(1).split('').map(value => value + value).join('')
      : colorValue.substring(1, 7)

    colorValues = [
      parseInt(cutHex.substring(0, 2), 16),
      parseInt(cutHex.substring(2, 4), 16),
      parseInt(cutHex.substring(4, 6), 16)
    ]
  } else {
    colorValues = colorValue.match(/\d+(\.\d+)?/g)?.slice(0, 3).map(Number)
  }

  if (!colorValues || colorValues.some(value => isNaN(value))) {
    return '#FFFFFF'
  }

  const [colorValueR, colorValueG, colorValueB] = colorValues

  const luminance = (0.299 * colorValueR + 0.587 * colorValueG + 0.114 * colorValueB) / 255

  if (luminance > 0.5) {
    return '#000000'
  } else {
    return '#FFFFFF'
  }
}
