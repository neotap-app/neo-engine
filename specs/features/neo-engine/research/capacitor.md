# 调研：Capacitor 打包 H5 游戏（Android/iOS）

> 调研日期 2026-10-05。用于 D1 移动端打包。**结论：Capacitor 是「复用 H5 产物 + 共享宿主运行时」架构的合理接入点；壳内嵌宿主运行时，UGC 游戏产物保持远程加载。**

## 版本与机制

- **当前稳定版 v8**（2025-12 发布，Active；v9 next）。环境：Node ≥ 22、Xcode ≥ 26、Android Studio ≥ 2025.2.1（iOS 构建必须 macOS）。最低平台 iOS 15+ / Android 7.0 (API 24)+。
- 机制 = **WebView 壳 + 原生能力桥接**：iOS 用 WKWebView，Android 用 Android System WebView（要求 Chrome 60+，Android 10+ 用系统 WebView；`android.minWebViewVersion` 默认 60）。
- 本地 scheme：Android 默认 `https://localhost`，iOS 默认 `capacitor://localhost`。

来源：
- https://capacitorjs.com/docs/main/reference/support-policy
- https://capacitorjs.com/docs/getting-started/environment-setup
- https://capacitorjs.com/docs/ios
- https://capacitorjs.com/docs/android
- https://capacitorjs.com/docs/config

## 标准流程

```
npm i @capacitor/core @capacitor/cli
npx cap init   # appName + appId（反向域名）
npm i @capacitor/android @capacitor/ios
npx cap add android / ios      # 生成原生工程（需提交 git）
npm run build                  # 构建 web 产物
npx cap sync                   # webDir 拷贝进原生工程
npx cap run android|ios        # 调试
npx cap build android|ios      # 出签名 AAB/APK/IPA
```

- 前置：web 项目有 `package.json`、独立构建产物目录（`webDir`，如 dist/www）、目录根有含 `<head>` 的 `index.html`。
- **生产默认本地打包**（webDir 拷贝进 app，启动快、离线可用）；`server.url` 仅开发/热重载用，官方明确 not intended for production。
- **纯 Web 内容更新不发新版也能过审**（Appflow Live Update 官方指南确认 Apple/Google 允许 web 内容更新）——对「远端拉取 UGC 游戏」是利好。

来源：
- https://capacitorjs.com/docs/getting-started
- https://capacitorjs.com/docs/basics/workflow
- https://capacitorjs.com/docs/guides/deploying-updates

## WebGL 游戏兼容性

- **Capacitor 官方 Games 指南首推 Phaser + Capacitor**（官方教程），明确支持 WebGL/canvas。
- Phaser 官方移动适配要点：`scale.width = window.innerWidth * devicePixelRatio`；输入补 `pointerup`/`setInteractive`；`viewport-fit=cover` + `env(safe-area-inset-*)` 处理安全区；`Capacitor.isNativePlatform()` 区分平台。
- **context lost**：Phaser 3.60+ 不再自动重建，`CONTEXT_RESTORED` 移除，context lost 时需整页 reload —— 宿主层要兜底（监听 `webglcontextlost` 提示/自动 reload）。
- 低端机：按「每像素 VRAM 预算」控显存；Android 用 ETC2 / iOS 用 PVRTC，跨平台可用 Basis Universal；`alpha:false` 在部分平台开销大；Phaser 3.60 引入 Mobile Pipeline（移动端性能大幅提升）与 `highp` 精度修复。

来源：
- https://capacitorjs.com/docs/guides/games
- https://phaser.io/tutorials/bring-your-phaser-game-to-ios-and-android-with-capacitor
- https://github.com/phaserjs/phaser/releases/tag/v3.60.0
- https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices

## 原生能力插件 ↔ RAL 映射

| RAL 能力 | Capacitor 插件 | 要点 |
| --- | --- | --- |
| 存储（KV） | `@capacitor/preferences` | iOS=UserDefaults/Android=SharedPreferences/Web=localStorage 回退；**官方建议勿用 `window.localStorage`**（系统可能清空）；仅字符串 |
| 存储（大文件/DB） | `@capacitor/filesystem`、`@capacitor-community/sqlite` | Preferences「不是数据库」 |
| 音频 | `@capacitor-community/native-audio` | preload/play/pause/loop/volume/complete 事件 |
| 震动 | `@capacitor/haptics` | 无硬件时静默 resolve |
| 分享 | `@capacitor/share` | iOS/Android + Web Share API |
| 生命周期 | `@capacitor/app` | `appStateChange`/`pause`/`resume`/`appUrlOpen`/`backButton`/`appRestoredResult` |
| 其它 | 官方 `@capacitor/browser`、`@capacitor/keyboard`、`@capacitor/network` | |

关键：**插件在 iOS/Android/Web 三端暴露同一套 JS API**（PWA 下自动降级）——与 RAL「能力接口 + 每平台实现 + 降级」天然对齐。

来源：
- https://capacitorjs.com/docs/apis/preferences
- https://capacitorjs.com/docs/apis/app
- https://github.com/capacitor-community/native-audio

## 分发要求简述

- 本质是普通原生应用：iOS 走 App Store Connect，Android 走 Google Play。
- **iOS**：签名/证书/描述文件；**隐私清单（Privacy Manifest）2024-05-01 起上架必填**（Preferences/Filesystem 触发 `NSPrivacyAccessedAPICategoryUserDefaults` + 理由 CA92.1 等）；游戏有年龄分级。
- **Android**：keystore 签名；**target SDK 与 Capacitor 主版本强绑定**（8.x→36，不支持自定义，需每年随大版本升级）。
- **国内安卓**（应用宝/厂商商店，行业惯例待核实）：**App 备案**（2023-09 起先备案后上架）、**软著**；**含内购/付费游戏需版号**——立项前专项核实。

来源：
- https://capacitorjs.com/docs/ios/privacy-manifest
- https://capacitorjs.com/docs/android/setting-target-sdk
- https://capacitorjs.com/docs/config

## 落地建议

1. **接入点**：宿主平台的前端应用（Next.js H5 产物）build → `webDir`；新增 `capacitor.config.ts` + `@capacitor/android` / `@capacitor/ios` 原生壳工程（git 管理）。
2. **宿主 vs 游戏产物分离**：壳内嵌**宿主运行时**（登录/游戏列表/RAL 能力/账号体系）；**UGC 小游戏产物保持远程加载**（现有 CDN/COS 分发），不打进 APK——契合共享宿主运行时 + 动态拉取游戏定位。
3. **RAL 接入点**：RAL 平台能力接口用「能力 → 插件」适配层实现，Web 与 Native 两端同一接口签名。
4. **WebGL 兜底**：宿主层监听 `webglcontextlost/restored`，context lost 时提示 + reload；低端机限制纹理规模，优先压缩纹理。
5. **注意**：v8 需 Node 22/Xcode 26/Android Studio 2025.2.1，iOS 构建需 macOS（CI 需 mac runner 或云构建）；Android WebView 碎片化（minWebViewVersion 门槛 + 版本检测引导）；iOS 上架前补 `PrivacyInfo.xcprivacy`；用 `@capacitor/app` 的 `appStateChange` 暂停/恢复 Phaser 循环避免后台空转。
