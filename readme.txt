FreeTube 外部播放器“自定义可执行文件 → 自动生成播放器名”的修改要点

目的
- 允许用户在“自定义外部播放器可执行文件”里填写任意路径/文件名，例如：
  - /app/bin/sunflower-mpv
  - /app/bin/sunflower-mpv-123
  - /app/bin/sun-123
- 自动把“外部播放器(下拉选择)”切换为该可执行文件的 basename（最后一段文件名）。
- 但参数拼装规则仍沿用一个“模板播放器”(mpv/vlc/…)，以保证诸如 startOffset/playbackRate 等功能仍按正确规则传参。

关键设计（把“显示名”和“参数模板”拆开）
- player
  - 用途：UI 上显示/选择的外部播放器名字（可以是任意自定义字符串）。
  - 来源：用户在可执行文件输入框里填的 basename。
- templatePlayer
  - 用途：决定使用哪个内置 external-player-map.json 的 cmdArguments 模板（mpv/vlc/…）。
  - 来源：用户在下拉框里选择的“模板播放器”。

本次涉及的 3 个关键文件（重点改动）

1) src/renderer/components/ExternalPlayerSettings.vue
- 动态下拉项
  - 若当前 player 不在 shipped 列表里，则把它临时追加到 select 的 names/values 里，确保能显示并保持选中。
- 输入可执行文件时自动改 player
  - 从路径中提取 basename（兼容 / 和 \ 分隔符；并去掉 .exe 后缀）
  - 将 profile.externalPlayerSettings.player 设置为 basename（允许任意字符串）
  - templatePlayer 保持为原来的 template（不跟着 basename 变）
- 下拉选择模板播放器时
  - 选择 mpv/vlc 等：同时设置 player=value 且 templatePlayer=value（即“非自定义模式”）
  - 选择 None：清空 player/templatePlayer/executable
- 自定义参数提示
  - Tooltip/默认参数提示改为读取 templatePlayer 对应的 cmdArguments
    （避免 player 是自定义字符串时取不到 cmdArgs）

2) src/renderer/store/modules/profiles.js
- 创建 profile 时 seed 外部播放器设置
  - 新增 templatePlayer 字段
  - 默认令 templatePlayer = defaultPlayer（与 player 一致）
  - 这样以后即使 player 被改成自定义名字，也仍有模板可用

3) src/main/externalPlayer.js
- 主进程打开外部播放器时的 cmdArguments 获取逻辑
  - 以前：cmdArgs = externalPlayerCmdArgs.get(externalPlayer)
  - 现在：cmdArgs = externalPlayerCmdArgs.get(templatePlayer ?? externalPlayer)
  - spawn 仍使用用户自定义 executable（profile.externalPlayerSettings.executable）或默认 executable
- 防止 Electron 因 spawn 失败崩溃
  - 为 child_process 增加 'error' 监听，避免未捕获异常导致主进程弹窗崩溃

数据来源说明
- external-player-map.json 仍只维护“模板播放器列表”（mpv/vlc/...）
- 不需要把任意自定义可执行文件名写进 external-player-map.json

常见问题
- EACCES
  - 这是系统拒绝执行该文件（权限/挂载 noexec/沙盒等），不是模板逻辑问题。
  - 本次修改仅确保不会因此导致主进程未捕获异常崩溃，并会在控制台打印错误。


