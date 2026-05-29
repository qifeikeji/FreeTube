Firefox 版做“自定义外部播放器可执行文件 → 自动生成播放器名”的迁移笔记

前提说明
- Firefox WebExtension 也不能直接 spawn 本地可执行文件。
- 通常需要使用：
  - Native Messaging（推荐）：extension -> native app -> spawn

目标（与 Electron 版一致）
- 可执行文件路径支持任意 basename（sunflower-mpv-123 / sun-123 / ...）
- UI 的“外部播放器”自动显示为 basename
- 参数拼装仍使用 templatePlayer（mpv/vlc/…）的模板

建议的数据结构（browser.storage）
在 browser.storage.local 存：
- externalPlayerSettings: {
    player: string,
    templatePlayer: string,
    executable: string,
    customArgs: string[],
    ignoreWarnings: boolean,
    ignoreDefaultArgs: boolean
  }

UI（Options 页面）要点
- 下拉框主要用于“选择模板播放器”
  - 当用户选择模板：player=value, templatePlayer=value
- 可执行文件输入框：
  - 输入路径后：
    - 解析 basename（兼容 / 与 \）
    - player = basename（允许任意字符串）
    - templatePlayer 不变
  - 动态下拉项：
    - 如果当前 player 不在模板列表中，将 player 临时追加到选项中，保证 UI 能显示/保持选中

参数模板来源
- 维护一份 external-player-map.json（或等价对象）：
  - key = templatePlayer（mpv/vlc/…）
  - value = cmdArguments（startOffset/playbackRate/...）
- 构造 args 时永远使用 templatePlayer 查表（不要用 player）

消息链路（Native Messaging）
- UI/content -> background：
  - 发送打开请求 payload（videoId/playlistId/startTime/...）
- background：
  - 读取 externalPlayerSettings
  - templatePlayer 查表生成 args
  - browser.runtime.sendNativeMessage(appId, { executable, args })
- native app：
  - spawn(executable, args)
  - 处理并上报错误（EACCES/ENOENT 等）

错误处理建议
- extension 侧：
  - 接到 native app 返回的错误时用通知/提示展示
- native app 侧：
  - 必须捕获 spawn 错误，避免 native app 崩溃


