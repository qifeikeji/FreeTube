import { defineComponent } from 'vue'
import FtIconButton from '../FtIconButton/FtIconButton.vue'
import FtGlassContextMenu from '../FtGlassContextMenu/FtGlassContextMenu.vue'
import ChannelSubscriptionEditPrompt from '../SubscribedChannelCardMenu/ChannelSubscriptionEditPrompt.vue'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { mapActions } from 'vuex'
import {
  copyToClipboard,
  formatDurationAsTimestamp,
  formatNumber,
  getRelativeTimeFromDate,
  openExternalLink,
  showToast,
  toDistractionFreeTitle,
  deepCopy,
  debounce
} from '../../helpers/utils'
import { resolveYoutubeChannelHandleUrl } from '../../helpers/youtubeChannelHandle'
import { normalizeBaseTheme, resolveChannelAccentColor } from '../../helpers/colors'
import { deArrowData, deArrowThumbnail } from '../../helpers/sponsorblock'
import { getOriginalTitle } from '../../helpers/originalTitle'
import thumbnailPlaceholder from '../../assets/img/thumbnail_placeholder.svg'
import { vSaferHtml } from '../../directives/vSaferHtml.js'

export default defineComponent({
  name: 'FtListVideo',
  components: {
    'ft-icon-button': FtIconButton,
    'ft-awesome-icon': FontAwesomeIcon,
    FtGlassContextMenu,
    ChannelSubscriptionEditPrompt,
  },
  directives: {
    'safer-html': vSaferHtml
  },
  props: {
    data: {
      type: Object,
      required: true
    },
    playlistId: {
      type: String,
      default: null
    },
    playlistType: {
      type: String,
      default: null
    },
    playlistItemId: {
      type: String,
      default: null
    },
    playlistIndex: {
      type: Number,
      default: null
    },
    playlistReverse: {
      type: Boolean,
      default: false
    },
    playlistShuffle: {
      type: Boolean,
      default: false
    },
    playlistLoop: {
      type: Boolean,
      default: false
    },
    forceListType: {
      type: String,
      default: null
    },
    appearance: {
      type: String,
      required: true
    },
    showVideoWithLastViewedPlaylist: {
      type: Boolean,
      default: false
    },
    alwaysShowAddToPlaylistButton: {
      type: Boolean,
      default: false,
    },
    quickBookmarkButtonEnabled: {
      type: Boolean,
      default: true,
    },
    canMoveVideoUp: {
      type: Boolean,
      default: false,
    },
    canMoveVideoDown: {
      type: Boolean,
      default: false,
    },
    canRemoveFromPlaylist: {
      type: Boolean,
      default: false,
    },
    layout: {
      type: String,
      default: 'list',
    },
    showGrabBar: {
      type: Boolean,
      default: false,
    },
  },
  emits: ['move-video-down', 'move-video-up', 'pause-player', 'remove-from-playlist'],
  data: function () {
    return {
      id: '',
      title: '',
      channelName: null,
      channelId: null,
      viewCount: 0,
      parsedViewCount: '',
      uploadedTime: '',
      lengthSeconds: 0,
      duration: '',
      description: '',
      published: undefined,
      isLive: false,
      is4k: false,
      is8k: false,
      isNew: false,
      isVr180: false,
      isVr360: false,
      is3D: false,
      hasCaptions: false,
      isUpcoming: false,
      isPremium: false,
      hideViews: false,
      addToPlaylistPromptCloseCallback: null,
      debounceGetDeArrowThumbnail: null,
      deArrowTogglePinned: false,
      showDeArrowTitle: false,
      showDeArrowThumbnail: false,
      subscriptionContextMenuVisible: false,
      subscriptionContextMenuPosition: { x: 0, y: 0 },
      editingSubscriptionChannel: null,
    }
  },
  computed: {
    historyEntry: function () {
      return this.$store.getters.getHistoryCacheById[this.id]
    },

    historyEntryExists: function () {
      return typeof this.historyEntry !== 'undefined'
    },

    watchProgress: function () {
      if (!this.historyEntryExists || !this.watchedProgressSavingEnabled) {
        return 0
      }

      return this.historyEntry.watchProgress
    },

    listType: function () {
      return this.$store.getters.getListType
    },

    effectiveListTypeIsList: function () {
      return (this.listType === 'list' || this.forceListType === 'list') && this.forceListType !== 'grid'
    },

    thumbnailPreference: function () {
      return this.$store.getters.getThumbnailPreference
    },

    blurThumbnails: function () {
      return this.$store.getters.getBlurThumbnails
    },

    blurThumbnailsStyle: function () {
      return this.blurThumbnails ? 'blur(20px)' : null
    },

    backendPreference: function () {
      return this.$store.getters.getBackendPreference
    },

    currentInvidiousInstanceUrl: function () {
      return this.$store.getters.getCurrentInvidiousInstanceUrl
    },

    showPlaylists: function () {
      return !this.$store.getters.getHidePlaylists
    },

    inHistory: function () {
      // When in the history page, showing relative dates isn't very useful.
      // We want to show the exact date instead
      return this.$route.name === 'history'
    },

    inSubscriptions: function () {
      return this.$route.name === 'subscriptions' || this.$route.name === 'default'
    },

    subscriptionChannelCustomization: function () {
      if (!this.inSubscriptions || this.channelId == null) {
        return null
      }

      const subscriptions = this.$store.getters.getActiveProfile.subscriptions
      return subscriptions.find((channel) => channel.id === this.channelId) ?? null
    },

    highlightedSubscriptionChannelName: function () {
      return this.subscriptionChannelCustomization?.highlighted === true
    },

    boldSubscriptionChannelName: function () {
      return this.subscriptionChannelCustomization?.boldChannelName === true
    },

    subscriptionChannelNameStyle: function () {
      const style = {}
      const systemPreference = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
      const isLight = normalizeBaseTheme(this.$store.getters.getBaseTheme || 'dark', systemPreference) === 'light'

      if (this.highlightedSubscriptionChannelName) {
        const color = this.subscriptionChannelCustomization?.highlightColor
        style.color = (typeof color === 'string' && color.trim() !== '')
          ? resolveChannelAccentColor(color, isLight)
          : (isLight ? '#1565c0' : '#1e88e5')
      }

      if (this.boldSubscriptionChannelName) {
        style.fontWeight = '700'
      }

      return style
    },

    inUserPlaylist: function () {
      return this.playlistTypeFinal === 'user' || this.selectedUserPlaylist != null
    },

    selectedUserPlaylist: function () {
      if (this.playlistIdFinal == null) { return null }
      if (this.playlistIdFinal === '') { return null }

      return this.$store.getters.getPlaylist(this.playlistIdFinal)
    },

    playlistSharable() {
      // `playlistId` can be undefined
      // User playlist ID should not be shared
      return this.playlistIdFinal && this.playlistIdFinal.length !== 0 && !this.inUserPlaylist
    },

    invidiousUrl: function () {
      let videoUrl = `${this.currentInvidiousInstanceUrl}/watch?v=${this.id}`
      // `playlistId` can be undefined
      if (this.playlistSharable) {
        // `index` seems can be ignored
        videoUrl += `&list=${this.playlistIdFinal}`
      }
      return videoUrl
    },

    invidiousChannelUrl: function () {
      return `${this.currentInvidiousInstanceUrl}/channel/${this.channelId}`
    },

    youtubeUrl: function () {
      let videoUrl = `https://www.youtube.com/watch?v=${this.id}`
      if (this.playlistSharable) {
        // `index` seems can be ignored
        videoUrl += `&list=${this.playlistIdFinal}`
      }
      return videoUrl
    },

    youtubeShareUrl: function () {
      const videoUrl = `https://youtu.be/${this.id}`
      if (this.playlistSharable) {
        // `index` seems can be ignored
        return `${videoUrl}?list=${this.playlistIdFinal}`
      }
      return videoUrl
    },

    youtubeChannelUrl: function () {
      return `https://youtube.com/channel/${this.channelId}`
    },

    youtubeEmbedUrl: function () {
      return `https://www.youtube-nocookie.com/embed/${this.id}`
    },

    progressPercentage: function () {
      if (typeof this.lengthSeconds !== 'number' || this.lengthSeconds === 0) {
        return 0
      }
      const percentage = (this.watchProgress / this.lengthSeconds) * 100
      return Math.min(percentage, 100)
    },

    hideSharingActions: function() {
      return this.$store.getters.getHideSharingActions
    },

    showInvidiousShareOptions: function () {
      return this.backendPreference === 'invidious' || this.$store.getters.getBackendFallback
    },

    dropdownOptions: function () {
      if (this.inSubscriptions) {
        const options = [
          {
            label: this.$t('Video.Copy Video Link'),
            value: 'copyYoutube'
          }
        ]

        if (this.channelId !== null) {
          options.push(
            {
              label: this.$t('Video.Copy Channel Link'),
              value: 'copyYoutubeChannel'
            },
            {
              label: this.$t('Video.Copy Channel Handle Link'),
              value: 'copyYoutubeChannelHandle'
            }
          )
        }

        options.push({
          label: this.$t('Video.Copy Thumbnail Link'),
          value: 'copyThumbnail'
        })

        if (this.subscriptionChannelCustomization != null) {
          options.push({
            label: this.$t('Channels.Edit Channel Content'),
            value: 'editChannelContent'
          })
        }

        return options
      }

      const options = [
        {
          label: this.historyEntryExists
            ? this.$t('Video.Remove From History')
            : this.$t('Video.Mark As Watched'),
          value: 'history'
        }
      ]
      if (!this.hideSharingActions) {
        options.push(
          {
            type: 'divider'
          },
          {
            label: this.$t('Video.Copy YouTube Link'),
            value: 'copyYoutube'
          },
          {
            label: this.$t('Video.Copy YouTube Embedded Player Link'),
            value: 'copyYoutubeEmbed'
          },
          ...this.showInvidiousShareOptions
            ? [{
                label: this.$t('Video.Copy Invidious Link'),
                value: 'copyInvidious'
              }]
            : [],
          {
            type: 'divider'
          },
          {
            label: this.$t('Video.Open in YouTube'),
            value: 'openYoutube'
          },
          {
            label: this.$t('Video.Open YouTube Embedded Player'),
            value: 'openYoutubeEmbed'
          },
          ...this.showInvidiousShareOptions
            ? [{
                label: this.$t('Video.Open in Invidious'),
                value: 'openInvidious'
              }]
            : [],
        )
        if (this.channelId !== null) {
          options.push(
            {
              type: 'divider'
            },
            {
              label: this.$t('Video.Copy YouTube Channel Link'),
              value: 'copyYoutubeChannel'
            },
            ...this.showInvidiousShareOptions
              ? [{
                  label: this.$t('Video.Copy Invidious Channel Link'),
                  value: 'copyInvidiousChannel'
                }]
              : [],
            {
              type: 'divider'
            },
            {
              label: this.$t('Video.Open Channel in YouTube'),
              value: 'openYoutubeChannel'
            },
            ...this.showInvidiousShareOptions
              ? [{
                  label: this.$t('Video.Open Channel in Invidious'),
                  value: 'openInvidiousChannel'
                }]
              : [],
          )
        }
      }

      if (this.channelId !== null && !this.inSubscriptions) {
        const hiddenChannels = JSON.parse(this.$store.getters.getChannelsHidden)
        const channelShouldBeHidden = hiddenChannels.some(c => c.name === this.channelId)

        options.push(
          {
            type: 'divider'
          },

          channelShouldBeHidden
            ? {
                label: this.$t('Video.Unhide Channel'),
                value: 'unhideChannel'
              }
            : {
                label: this.$t('Video.Hide Channel'),
                value: 'hideChannel'
              }
        )
      }

      return options
    },

    subscriptionContextMenuItems: function () {
      const items = [
        {
          label: this.$t('Video.Copy Video Link'),
          value: 'copyYoutube'
        }
      ]

      if (this.channelId !== null) {
        items.push(
          {
            label: this.$t('Video.Copy Channel Link'),
            value: 'copyYoutubeChannel'
          },
          {
            label: this.$t('Video.Copy Channel Handle Link'),
            value: 'copyYoutubeChannelHandle'
          }
        )
      }

      items.push({
        label: this.$t('Video.Copy Thumbnail Link'),
        value: 'copyThumbnail'
      })

      if (this.subscriptionChannelCustomization != null) {
        items.push({
          label: this.$t('Channels.Edit Channel Content'),
          value: 'editChannelContent'
        })
      }

      return items
    },

    thumbnail: function () {
      if (this.thumbnailPreference === 'hidden') {
        return thumbnailPlaceholder
      }

      if (this.showDeArrowThumbnail && this.deArrowCache?.thumbnail != null) {
        return this.deArrowCache.thumbnail
      }

      let baseUrl
      if (this.backendPreference === 'invidious') {
        baseUrl = this.currentInvidiousInstanceUrl
      } else {
        baseUrl = 'https://i.ytimg.com'
      }

      switch (this.thumbnailPreference) {
        case 'start':
          return `${baseUrl}/vi/${this.id}/mq1.jpg`
        case 'middle':
          return `${baseUrl}/vi/${this.id}/mq2.jpg`
        case 'end':
          return `${baseUrl}/vi/${this.id}/mq3.jpg`
        default:
          return `${baseUrl}/vi/${this.id}/mqdefault.jpg`
      }
    },

    hideVideoViews: function () {
      return this.$store.getters.getHideVideoViews
    },

    addWatchedStyle: function () {
      return this.historyEntryExists && !this.inHistory
    },

    currentLocale: function () {
      return this.$i18n.locale
    },

    externalPlayer: function () {
      return this.$store.getters.getExternalPlayer
    },
    externalPlayerOpenVideosOnClick: function () {
      return this.$store.getters.getExternalPlayerOpenVideosOnClick
    },

    externalPlayerIsDefaultViewingMode: function () {
      return process.env.IS_ELECTRON && this.externalPlayer !== '' && this.$store.getters.getDefaultViewingMode === 'external_player'
    },

    defaultPlayback: function () {
      return this.$store.getters.getDefaultPlayback
    },

    watchedProgressSavingEnabled: function () {
      return ['auto', 'semi-auto'].includes(this.$store.getters.getWatchedProgressSavingMode)
    },
    rememberHistory: function () {
      return this.$store.getters.getRememberHistory
    },

    saveVideoHistoryWithLastViewedPlaylist: function () {
      return this.$store.getters.getSaveVideoHistoryWithLastViewedPlaylist
    },

    showDistractionFreeTitles: function () {
      return this.$store.getters.getShowDistractionFreeTitles
    },

    displayTitle: function () {
      let title
      if (this.showDeArrowTitle && this.deArrowCache?.title) {
        title = this.deArrowCache.title
      } else if (this.preferOriginalTitles && this.originalTitleCache?.title) {
        title = this.originalTitleCache.title
      } else {
        title = this.title
      }

      if (this.showDistractionFreeTitles) {
        return toDistractionFreeTitle(title)
      } else {
        return title
      }
    },

    displayDuration: function () {
      if (this.useDeArrowTitles && (this.duration === '' || this.duration === '0:00') && this.deArrowCache?.videoDuration) {
        return formatDurationAsTimestamp(this.deArrowCache.videoDuration)
      }
      return this.duration
    },

    playlistIdTypePairFinal() {
      if (this.playlistId) {
        return {
          playlistId: this.playlistId,
          playlistType: this.playlistType,
          playlistItemId: this.playlistItemId,
        }
      }

      // Get playlist ID from history ONLY if option enabled
      if (!this.showVideoWithLastViewedPlaylist) { return }
      if (!this.saveVideoHistoryWithLastViewedPlaylist) { return }

      return {
        playlistId: this.historyEntry?.lastViewedPlaylistId,
        playlistType: this.historyEntry?.lastViewedPlaylistType,
        playlistItemId: this.historyEntry?.lastViewedPlaylistItemId,
      }
    },

    playlistIdFinal: function () {
      return this.playlistIdTypePairFinal?.playlistId
    },
    playlistTypeFinal: function () {
      return this.playlistIdTypePairFinal?.playlistType
    },
    playlistItemIdFinal: function () {
      return this.playlistIdTypePairFinal?.playlistItemId
    },

    quickBookmarkPlaylist() {
      return this.$store.getters.getQuickBookmarkPlaylist
    },
    isQuickBookmarkEnabled() {
      return this.quickBookmarkPlaylist != null
    },
    isInQuickBookmarkPlaylist: function () {
      if (!this.isQuickBookmarkEnabled) { return false }

      // Accessing a reactive property has a negligible amount of overhead,
      // however as we know that some users have playlists that have more than 10k items in them
      // it adds up quickly, especially as there are usually lots of ft-list-video instances active at the same time.
      // So create a temporary variable outside of the array, so we only have to do it once.
      // Also the search is retriggered every time any playlist is modified.
      const id = this.id

      return this.quickBookmarkPlaylist.videos.some((video) => {
        return video.videoId === id
      })
    },
    quickBookmarkIconText: function () {
      if (!this.isQuickBookmarkEnabled) { return false }

      const translationProperties = {
        playlistName: this.quickBookmarkPlaylist.playlistName,
      }
      return this.isInQuickBookmarkPlaylist
        ? this.$t('User Playlists.Remove from Favorites', translationProperties)
        : this.$t('User Playlists.Add to Favorites', translationProperties)
    },
    quickBookmarkIconTheme: function () {
      return this.isInQuickBookmarkPlaylist ? 'base favorite' : 'base'
    },

    watchVideoRouterLink() {
    // For `router-link` attribute `to`
      if (!this.externalPlayerIsDefaultViewingMode) {
        return {
          path: `/watch/${this.id}`,
          query: this.watchPageLinkQuery,
        }
      } else {
        return {}
      }
    },

    watchPageLinkQuery() {
      const query = {}
      if (this.playlistIdFinal) { query.playlistId = this.playlistIdFinal }
      if (this.playlistTypeFinal) { query.playlistType = this.playlistTypeFinal }
      if (this.playlistItemIdFinal) { query.playlistItemId = this.playlistItemIdFinal }
      return query
    },

    useDeArrowTitles: function () {
      return this.$store.getters.getUseDeArrowTitles
    },
    useDeArrowThumbnails: function () {
      return this.$store.getters.getUseDeArrowThumbnails
    },
    preferOriginalTitles: function () {
      return this.$store.getters.getPreferOriginalTitles
    },
    deArrowChangedContent: function () {
      return (this.useDeArrowThumbnails && this.deArrowCache?.thumbnail) ||
        (this.useDeArrowTitles && this.deArrowCache?.title &&
          this.data.title.localeCompare(this.deArrowCache.title, undefined, { sensitivity: 'accent' }) !== 0)
    },

    deArrowToggleTitle: function() {
      return this.deArrowTogglePinned
        ? this.$t('Video.DeArrow.Show Modified Details')
        : this.$t('Video.DeArrow.Show Original Details')
    },

    deArrowCache: function () {
      return this.$store.getters.getDeArrowCache[this.id]
    },

    originalTitleCache: function () {
      return this.$store.getters.getOriginalTitleCache[this.id]
    },
  },
  watch: {
    showAddToPlaylistPrompt(value) {
      if (value) { return }
      // Execute on prompt close

      if (this.addToPlaylistPromptCloseCallback == null) { return }
      this.addToPlaylistPromptCloseCallback()
    },
    preferOriginalTitles: function (enabled) {
      if (enabled) {
        this.fetchOriginalTitle()
      }
    },
  },
  created: function () {
    this.parseVideoData()

    this.showDeArrowTitle = this.useDeArrowTitles
    this.showDeArrowThumbnail = this.useDeArrowThumbnails

    if ((this.showDeArrowTitle || this.showDeArrowThumbnail) && !this.deArrowCache) {
      this.fetchDeArrowData()
    }

    if (this.showDeArrowThumbnail && this.deArrowCache && this.deArrowCache.thumbnail == null) {
      if (this.debounceGetDeArrowThumbnail == null) {
        this.debounceGetDeArrowThumbnail = debounce(this.fetchDeArrowThumbnail, 1000)
      }

      this.debounceGetDeArrowThumbnail()
    }

    if (this.preferOriginalTitles) {
      this.fetchOriginalTitle()
    }
  },
  methods: {
    handleWatchPageLinkClick: function(event) {
      if (this.externalPlayerIsDefaultViewingMode) {
        this.handleExternalPlayer()
        return
      }

      if (
        process.env.IS_ELECTRON &&
        this.externalPlayer !== '' &&
        this.externalPlayerOpenVideosOnClick
      ) {
        event?.preventDefault?.()
        event?.stopPropagation?.()
        event?.stopImmediatePropagation?.()
        this.handleExternalPlayer()
      }
    },
    fetchDeArrowThumbnail: async function() {
      if (this.thumbnailPreference === 'hidden') { return }
      const videoId = this.id
      const thumbnail = await deArrowThumbnail(videoId, this.deArrowCache.thumbnailTimestamp)
      if (thumbnail) {
        const deArrowCacheClone = deepCopy(this.deArrowCache)
        deArrowCacheClone.thumbnail = thumbnail
        this.$store.commit('addThumbnailToDeArrowCache', deArrowCacheClone)
      }
    },
    fetchOriginalTitle: async function () {
      if (!this.preferOriginalTitles || !this.id || this.data?.isRSS) {
        return
      }

      if (this.originalTitleCache !== undefined) {
        return
      }

      await getOriginalTitle(this.id)
    },
    fetchDeArrowData: async function() {
      const videoId = this.id
      const data = await deArrowData(this.id)
      const cacheData = { videoId, title: null, videoDuration: null, thumbnail: null, thumbnailTimestamp: null }
      if (Array.isArray(data?.titles) && data.titles.length > 0 && (data.titles[0].locked || data.titles[0].votes >= 0)) {
        // remove dearrow formatting markers https://github.com/ajayyy/DeArrow/blob/0da266485be902fe54259214c3cd7c942f2357c5/src/titles/titleFormatter.ts#L460
        cacheData.title = data.titles[0].title.replaceAll(/(^|\s)>(\S)/g, '$1$2').trim()
      }
      if (Array.isArray(data?.thumbnails) && data.thumbnails.length > 0 && (data.thumbnails[0].locked || data.thumbnails[0].votes >= 0)) {
        cacheData.thumbnailTimestamp = data.thumbnails.at(0).timestamp
      } else if (data?.videoDuration != null) {
        cacheData.thumbnailTimestamp = data.videoDuration * data.randomTime
      }
      cacheData.videoDuration = data?.videoDuration ? Math.floor(data.videoDuration) : null

      // Save data to cache whether data available or not to prevent duplicate requests
      this.$store.commit('addVideoToDeArrowCache', cacheData)

      // fetch dearrow thumbnails if enabled
      if (this.showDeArrowThumbnail && this.deArrowCache?.thumbnail === null) {
        if (this.debounceGetDeArrowThumbnail == null) {
          this.debounceGetDeArrowThumbnail = debounce(this.fetchDeArrowThumbnail, 1000)
        }

        this.debounceGetDeArrowThumbnail()
      }
    },
    toggleDeArrow() {
      if (!this.deArrowChangedContent) {
        return
      }

      this.deArrowTogglePinned = !this.deArrowTogglePinned

      if (this.useDeArrowTitles) {
        this.showDeArrowTitle = !this.showDeArrowTitle
      }
      if (this.useDeArrowThumbnails) {
        this.showDeArrowThumbnail = !this.showDeArrowThumbnail
      }
    },

    handleExternalPlayer: function () {
      this.$emit('pause-player')

      const payload = {
        profileId: this.$store.getters.getActiveProfile?._id,
        videoId: this.id,
        playlistId: this.playlistIdFinal,
        startTime: this.watchProgress,
        playbackRate: this.defaultPlayback,
        playlistIndex: this.playlistIndex,
        playlistReverse: this.playlistReverse,
        playlistShuffle: this.playlistShuffle,
        playlistLoop: this.playlistLoop,
      }
      // Only play video in non playlist mode when user playlist detected
      if (this.inUserPlaylist) {
        Object.assign(payload, {
          playlistId: null,
          playlistIndex: null,
          playlistReverse: null,
          playlistShuffle: null,
          playlistLoop: null,
        })
      }
      if (process.env.IS_ELECTRON) {
        window.ftElectron.openInExternalPlayer(payload)
      }

      if (this.rememberHistory) {
        this.markAsWatched()
      }
    },

    handleOptionsClick: function (option) {
      switch (option) {
        case 'history':
          if (this.historyEntryExists) {
            this.removeFromWatched()
          } else {
            this.markAsWatched()
          }
          break
        case 'copyYoutube':
          copyToClipboard(this.youtubeShareUrl, { messageOnSuccess: this.$t('Share.YouTube URL copied to clipboard') })
          break
        case 'openYoutube':
          openExternalLink(this.youtubeUrl)
          break
        case 'copyYoutubeEmbed':
          copyToClipboard(this.youtubeEmbedUrl, { messageOnSuccess: this.$t('Share.YouTube Embed URL copied to clipboard') })
          break
        case 'openYoutubeEmbed':
          openExternalLink(this.youtubeEmbedUrl)
          break
        case 'copyInvidious':
          copyToClipboard(this.invidiousUrl, { messageOnSuccess: this.$t('Share.Invidious URL copied to clipboard') })
          break
        case 'openInvidious':
          openExternalLink(this.invidiousUrl)
          break
        case 'copyYoutubeChannel':
          copyToClipboard(this.youtubeChannelUrl, { messageOnSuccess: this.$t('Share.YouTube Channel URL copied to clipboard') })
          break
        case 'copyYoutubeChannelHandle':
          this.copyYoutubeChannelHandleLink()
          break
        case 'editChannelContent':
          this.openChannelEditPrompt()
          break
        case 'openYoutubeChannel':
          openExternalLink(this.youtubeChannelUrl)
          break
        case 'copyInvidiousChannel':
          copyToClipboard(this.invidiousChannelUrl, { messageOnSuccess: this.$t('Share.Invidious Channel URL copied to clipboard') })
          break
        case 'openInvidiousChannel':
          openExternalLink(this.invidiousChannelUrl)
          break
        case 'copyThumbnail':
          copyToClipboard(this.thumbnail, { messageOnSuccess: this.$t('Share.Thumbnail URL copied to clipboard') })
          break
        case 'hideChannel':
          this.hideChannel(this.channelName, this.channelId)
          break
        case 'unhideChannel':
          this.unhideChannel(this.channelName, this.channelId)
          break
      }
    },

    handleSubscriptionContextMenu: function (event) {
      if (!this.inSubscriptions) {
        return
      }

      event.preventDefault()
      event.stopPropagation()
      this.subscriptionContextMenuPosition = { x: event.clientX, y: event.clientY }
      this.subscriptionContextMenuVisible = true
    },

    closeSubscriptionContextMenu: function () {
      this.subscriptionContextMenuVisible = false
    },

    handleSubscriptionContextMenuSelect: function (option) {
      this.closeSubscriptionContextMenu()
      this.handleOptionsClick(option)
    },

    copyYoutubeChannelHandleLink: async function () {
      try {
        const handleUrl = await resolveYoutubeChannelHandleUrl(this.channelId, {
          authorUrl: this.data?.authorUrl
        })
        if (handleUrl == null) {
          showToast(this.$t('Share.Channel handle URL unavailable'))
          return
        }

        await copyToClipboard(handleUrl, {
          messageOnSuccess: this.$t('Share.YouTube Channel Handle URL copied to clipboard')
        })
      } catch (error) {
        console.error(error)
        showToast(this.$t('Share.Channel handle URL unavailable'))
      }
    },

    openChannelEditPrompt: function () {
      if (this.subscriptionChannelCustomization == null) {
        return
      }

      this.editingSubscriptionChannel = {
        ...this.subscriptionChannelCustomization,
        id: this.channelId,
        name: this.channelName ?? this.subscriptionChannelCustomization.name,
      }
    },

    closeChannelEditPrompt: function () {
      this.editingSubscriptionChannel = null
    },

    /**
     * @param {{ notes: string, notesColor: string, highlightColor: string, highlighted: boolean, boldChannelName: boolean }} payload
     */
    saveChannelCustomization: async function (payload) {
      const channel = this.editingSubscriptionChannel
      if (channel == null) {
        return
      }

      await this.updateChannelSubscriptionCustomization({
        channelId: channel.id,
        notes: payload.notes,
        notesColor: payload.notesColor,
        highlightColor: payload.highlightColor,
        highlighted: payload.highlighted,
        boldChannelName: payload.boldChannelName,
      })

      this.closeChannelEditPrompt()
    },

    parseVideoData: function () {
      this.id = this.data.videoId
      this.title = this.data.title
      // this.thumbnail = this.data.videoThumbnails[4].url

      this.channelName = this.data.author ?? null
      this.channelId = this.data.authorId ?? null

      if ((this.data.lengthSeconds === '' || this.data.lengthSeconds === '0:00') && this.historyEntryExists) {
        this.lengthSeconds = this.historyEntry.lengthSeconds
        this.duration = formatDurationAsTimestamp(this.historyEntry.lengthSeconds)
      } else {
        this.lengthSeconds = this.data.lengthSeconds
        this.duration = formatDurationAsTimestamp(this.data.lengthSeconds)
      }

      this.description = this.data.description
      this.isLive = this.data.liveNow || this.data.lengthSeconds === 'undefined'
      this.isUpcoming = this.data.isUpcoming || this.data.premiere
      this.is4k = this.data.is4k
      this.is8k = this.data.is8k
      this.isNew = this.data.isNew
      this.isVr180 = this.data.isVr180
      this.isVr360 = this.data.isVr360
      this.is3D = this.data.is3d
      this.hasCaptions = this.data.hasCaptions
      this.isPremium = this.data.premium || false
      this.viewCount = this.data.viewCount

      if (typeof this.data.premiereDate !== 'undefined') {
        let premiereDate = this.data.premiereDate

        // premiereDate will be a string when the subscriptions are restored from the cache
        if (typeof premiereDate === 'string') {
          premiereDate = new Date(premiereDate)
        }
        this.uploadedTime = premiereDate.toLocaleString([this.currentLocale, 'en'])
        this.published = premiereDate.getTime()
      } else if (typeof (this.data.premiereTimestamp) !== 'undefined') {
        this.uploadedTime = new Date(this.data.premiereTimestamp * 1000).toLocaleString([this.currentLocale, 'en'])
        this.published = this.data.premiereTimestamp * 1000
      } else if (typeof this.data.published === 'number' && !this.isLive) {
        this.published = this.data.published

        if (this.inHistory) {
          this.uploadedTime = new Date(this.data.published).toLocaleDateString([this.currentLocale, 'en'])
        } else {
          // Use 30 days per month, just like calculatePublishedDate
          this.uploadedTime = getRelativeTimeFromDate(this.data.published, false)
        }
      }

      if (this.hideVideoViews) {
        this.hideViews = true
      } else if (typeof (this.data.viewCount) !== 'undefined' && this.data.viewCount !== null) {
        this.parsedViewCount = formatNumber(this.data.viewCount)
      } else if (typeof (this.data.viewCountText) !== 'undefined') {
        this.parsedViewCount = this.data.viewCountText.replace(' views', '')
      } else {
        this.hideViews = true
      }
    },

    markAsWatched: function () {
      const videoData = {
        videoId: this.id,
        title: this.title,
        author: this.channelName,
        authorId: this.channelId,
        published: this.published,
        description: this.description,
        viewCount: this.viewCount,
        lengthSeconds: this.data.lengthSeconds,
        watchProgress: 0,
        timeWatched: Date.now(),
        isLive: false,
        type: 'video'
      }
      this.updateHistory(videoData)

      if (!this.historyEntryExists) {
        showToast(this.$t('Video.Video has been marked as watched'))
      }
    },

    removeFromWatched: function () {
      this.removeFromHistory(this.id)

      showToast(this.$t('Video.Video has been removed from your history'))
    },

    togglePlaylistPrompt: function () {
      const videoData = {
        videoId: this.id,
        title: this.title,
        author: this.channelName,
        authorId: this.channelId,
        description: this.description,
        viewCount: this.viewCount,
        lengthSeconds: this.data.lengthSeconds,
        published: this.published,
        premiereDate: this.data.premiereDate,
        premiereTimestamp: this.data.premiereTimestamp,
      }

      this.showAddToPlaylistPromptForManyVideos({ videos: [videoData] })

      // Focus when prompt closed
      this.addToPlaylistPromptCloseCallback = () => {
        // Run once only
        this.addToPlaylistPromptCloseCallback = null
      }
    },

    hideChannel: function(channelName, channelId) {
      const hiddenChannels = JSON.parse(this.$store.getters.getChannelsHidden)
      hiddenChannels.push({ name: channelId, preferredName: channelName })
      this.updateChannelsHidden(JSON.stringify(hiddenChannels))

      showToast(this.$t('Channel Hidden', { channel: channelName }))
    },

    unhideChannel: function(channelName, channelId) {
      const hiddenChannels = JSON.parse(this.$store.getters.getChannelsHidden)
      this.updateChannelsHidden(JSON.stringify(hiddenChannels.filter(c => c.name !== channelId)))

      showToast(this.$t('Channel Unhidden', { channel: channelName }))
    },

    toggleQuickBookmarked() {
      if (!this.isQuickBookmarkEnabled) {
        // This should be prevented by UI
        return
      }

      if (this.isInQuickBookmarkPlaylist) {
        this.removeFromQuickBookmarkPlaylist()
      } else {
        this.addToQuickBookmarkPlaylist()
      }
    },
    addToQuickBookmarkPlaylist() {
      const videoData = {
        videoId: this.id,
        title: this.title,
        author: this.channelName,
        authorId: this.channelId,
        lengthSeconds: this.data.lengthSeconds,
        published: this.published,
        premiereDate: this.data.premiereDate,
        premiereTimestamp: this.data.premiereTimestamp,
      }

      this.addVideo({
        _id: this.quickBookmarkPlaylist._id,
        videoData,
      })

      // TODO: Maybe show playlist name
      showToast(this.$t('Video.Video has been saved'))
    },
    removeFromQuickBookmarkPlaylist() {
      this.removeVideo({
        _id: this.quickBookmarkPlaylist._id,
        // Remove all playlist items with same videoId
        videoId: this.id,
      })

      // TODO: Maybe show playlist name
      showToast(this.$t('Video.Video has been removed from your saved list'))
    },
    moveVideoUp: function() {
      this.$emit('move-video-up', this.id, this.playlistItemId)
    },

    moveVideoDown: function() {
      this.$emit('move-video-down', this.id, this.playlistItemId)
    },

    removeFromPlaylist: function() {
      this.$emit('remove-from-playlist', this.id, this.playlistItemId)
    },

    onDragStart(event) {
      // Prevent drag event except links
      if (event.target.nodeName === 'A') { return }

      event.preventDefault()
      event.stopPropagation()
    },

    ...mapActions([
      'updateHistory',
      'removeFromHistory',
      'updateChannelsHidden',
      'updateChannelSubscriptionCustomization',
      'showAddToPlaylistPromptForManyVideos',
      'addVideo',
      'removeVideo',
    ])
  }
})
