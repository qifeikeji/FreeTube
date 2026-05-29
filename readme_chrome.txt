Chrome 版做“自定义外部播放器可执行文件 → 自动生成播放器名”的迁移笔记

前提说明
- Chrome 扩展本身不能直接 spawn 本地可执行文件。
- 要实现“外部播放器打开”，通常需要二选一：
  - A) Native Messaging Host（推荐）：扩展把参数发给本机 host，由 host 负责 spawn。
  - B) 自定义协议（不推荐/受限多）：通过 protocol handler 交给系统处理。

目标（与 Electron 版一致）
- 可执行文件路径里填任意 basename（sunflower-mpv-123 等）
- UI 的“外部播放器”自动显示为该 basename
- 但参数模板仍用 templatePlayer（mpv/vlc/…）来生成参数

建议的数据结构（storage）
在 chrome.storage.local / chrome.storage.sync 存：
- externalPlayerSettings: {
    player: string,          // UI 显示名（可自定义，来自 executable basename）
    templatePlayer: string,  // 参数模板名（mpv/vlc/…）
    executable: string,      // 可执行文件完整路径（传给 native host）
    customArgs: string[],
    ignoreWarnings: boolean,
    ignoreDefaultArgs: boolean
  }

UI（Options 页面）要点
- 下拉框只列出“模板播放器”（None/mpv/vlc/…）
  - 当用户选择模板时：player=templatePlayer=value
- 可执行文件输入框
  - 用户输入路径后：解析 basename，设置 player=basename（允许任意字符串），templatePlayer 保持不变
  - 为了让“player=basename”能在 UI 下拉框里显示：
    - 做一个“动态追加当前自定义项”的逻辑（names/values 临时追加当前 player）

参数模板来源（external-player-map.json）
- 与 Electron 版相同维护一个模板映射（mpv/vlc/… -> cmdArguments）
- 扩展端在构造参数时使用 templatePlayer 查表，而不是 player

消息链路（Native Messaging）
- content script / UI -> background/service worker：
  - 发送 payload（videoId/playlistId/startTime/...）
- background：
  - 读取 externalPlayerSettings
  - 用 templatePlayer 取 cmdArguments，生成 args
  - 调用 chrome.runtime.sendNativeMessage(hostName, { executable, args, detached: true })
- native host：
  - 做权限校验 / 处理 EACCES/ENOENT
  - spawn(executable, args) 并返回结果（或仅记录日志）

与 Electron 版的关键差异
- “spawn” 必须在 native host 里完成；扩展端只负责：
  - 计算 args（按 templatePlayer）
  - 传递 executable（用户自定义路径）
  - UI 展示 player（basename）


