# 细胞分裂战 — 音频说明

实现入口：[`audio.js`](./audio.js)  
设置 UI：[`ui/SettingsModal.jsx`](./ui/SettingsModal.jsx)  
素材目录：[`assets/`](./assets/)

---

## 总览

音频分三条后端，职责分离，避免互相抢轨道：

| 后端 | 用途 | 素材 / 方式 |
|------|------|-------------|
| **HTMLAudio** | 场景 BGM | `hub-bgm.mp3` / `battle-bgm.mp3` |
| **@pixi/sound** | 媒体文件 SFX | `shoot.mp3` / `firework.mp3`（手势后懒加载） |
| **Web Audio 合成** | 战斗反馈 + UI 音 | 振荡器 / 噪声包络，无额外文件 |

玩家设置（**静音**、**音乐**、**音效**）写入 `localStorage` key：`cell-audio-settings-v1`。  
静音或对应滑条为 0 时，BGM 音量为 0，SFX 直接跳过播放。

浏览器策略：首次出声前需用户手势，调用 `unlockCellAudio()`（开始游戏 / 进关 / 按钮 `uiSfx` 点击路径内）。

---

## 1. 背景音乐（BGM）

| 场景 | API | 文件 | 说明 |
|------|-----|------|------|
| 选关大厅 | `setBgmScene("hub")` | `assets/hub-bgm.mp3` | 循环 |
| 对局 | `setBgmScene("play")` | `assets/battle-bgm.mp3` | 循环；同场景重开/下一关不重切，保持连续 |
| 离开页面 | `stopBgm()` | — | 两轨 pause + 归零 |

- 由 `hooks/useCellBgm.js` 在 `gameStarted` + `screen` 变化时切换。
- 实际响度 = 用户「音乐」滑条 × 内部上限 `BGM_VOLUME_MAX`（约 0.35，避免默认过吵）。
- 不用 `@pixi/sound` 播 BGM，避免 stop 后孤儿节点与战斗曲叠播。

> 目录里若还有 `bgm.mp3` 等旧文件，当前代码未引用。

---

## 2. 媒体音效（@pixi/sound）

仅在 `unlockCellAudio` → 动态 `import("@pixi/sound")` 后注册，避免无手势时创建 AudioContext 刷 Chrome 警告。

### 2.1 射击 `playBulletShot({ x, color })`

| 项 | 说明 |
|----|------|
| 文件 | `assets/shoot.mp3`（alias：`bullet`） |
| 触发 | `combat.js` 发射子弹时 |
| 听感 | 短促射击；裁剪有效段约 `0.105s–0.23s` |
| 差异 | **己方**（玩家色）：音量更高、略加速；**敌方**：音量稍低、略减速 |
| 空间 | 按 `x` 做左右 pan（约 ±0.7） |
| 限流 | 己方间隔 ≥ 55ms，敌方 ≥ 75ms，分通道，避免连射吞掉操作反馈 |

### 2.2 烟花 `playFirework({ x, width })`

| 项 | 说明 |
|----|------|
| 文件 | `assets/firework.mp3`（alias：`firework`） |
| 触发 | `settlement/fireworks.js` 胜利烟花每发爆炸 |
| 听感 | 烟花爆裂 |
| 空间 | 按爆炸位置 pan |

---

## 3. 合成战斗音效（Web Audio）

无媒体文件，全部用振荡器 + 滤波噪声。经 `connectOut` 统一乘以「音效」滑条与静音。  
命中位置支持 `x` / `width` pan。

### 3.1 命中 `playHit({ x?, width?, strength?, variant?, force? })`

| 项 | 说明 |
|----|------|
| 听感 | 多变体合成（默认偏细胞打击）；由 `getHitVariant()` / `setHitVariant(id)` 选择 |
| 触发 | 子弹打到**非己方**细胞；子弹对撞等（`combat.js`） |
| 参数 | `strength`；`variant` 临时指定试听；`force` 调试跳过限流 |
| 限流 | ≥ 42ms（`force` 时不限） |
| 持久化 | `localStorage` key `cell-hit-variant-v1` |

**变体列表**（`HIT_VARIANT_LIST`，调试面板可试听/选用）：

| id | 名称 | 倾向 |
|----|------|------|
| `gel` | 凝胶 | 软弹胶质 |
| `pop` | 膜破 | 气泡「啵」 |
| `squish` | 湿黏 | 湿润挤压 |
| `plop` | 水滴 | 液滴 plop |
| `thud` | 闷击 | 软组织闷响（默认） |
| `crack` | 脆裂 | 膜裂 + 短噪声 |
| `splash` | 溅射 | 能量溅开 |
| `blast` | 爆炸 | 旧版小爆炸对照 |

### 3.2 受伤 `playHurt({ x?, width?, strength? })`

| 项 | 说明 |
|----|------|
| 听感 | 偏低闷击 + 低通噪声（钝、闷） |
| 触发 | 子弹打到**己方**（玩家侧）细胞 |
| 限流 | ≥ 70ms |

> 原「吞噬 / 变色」独立音效已移除；细胞被吞并时改为播放 `playHurt`。

---

## 4. UI 交互音（Web Audio）

统一入口：`playUi(kind)`；按钮推荐用 `uiSfx(clickKind, onClick)`（hover + 点击 + 手势解锁）。

| kind | 听感（简述） | 典型用途 |
|------|----------------|----------|
| `hover` | 极短上扬轻点 | 鼠标移入可点控件（禁用时静默） |
| `tap` | 中短下落 | 设置、全屏、跳过引导等一般点击 |
| `confirm` | 稍长上扬 + 高音点缀 | 开始游戏、进关、通关/解锁、重试、下一关 |
| `back` | 下落收束 | 返回、关闭弹层、取消类 |

**限流**：hover 与点击分轨（约 55ms / 40ms），避免滑过后立刻点不响。

**手势**：`hover` 不 `resume` AudioContext（避免 autoplay 警告）；点击路径可 resume。

### 使用映射（便于改音时对照）

| 控件 / 场景 | 点击 kind |
|-------------|-----------|
| 开始游戏 `StartGate` | `confirm` |
| 选关卡片 / 推荐关 | `confirm` |
| 返回大厅 `BackButton` | `back` |
| 设置按钮 | `tap` |
| 全屏按钮 | `tap` |
| 设置关闭 / 点遮罩关闭 | `back` |
| 设置内：重置二次确认 | 首次 `tap`，确认 `confirm` |
| 设置内：滑条松手试听 | `tap`（未静音且音效 > 0） |
| 引导跳过 | `tap` |
| 胜利：下一关 / 返回 | `confirm` / `back` |
| 失败：重试 / 返回 | `confirm` / `back` |
| 开发调试：直接通关 / 解锁 | `confirm` |

---

## 5. 设置与 API 速查

### 玩家设置

| 字段 | 含义 | API |
|------|------|-----|
| `muted` | 总静音 | `setAudioMuted(boolean)` |
| `bgm` | 音乐 0–1 | `setBgmVolume(number)` |
| `sfx` | 音效 0–1 | `setSfxVolume(number)` |
| — | 读取 | `getAudioSettings()` |
| — | 批量 | `updateAudioSettings({ muted?, bgm?, sfx? })` |

### 其它导出

| API | 作用 |
|-----|------|
| `unlockCellAudio()` | 手势内解锁：懒加载 pixi、resume 合成 ctx、补播被拦的 BGM |
| `setBgmScene("hub"\|"play")` | 切场景 BGM |
| `stopBgm()` | 停 BGM |
| `playBulletShot` / `playFirework` | 媒体 SFX |
| `playHit` / `playHurt` | 合成战斗 SFX |
| `playUi` / `onUiHover` / `uiSfx` | UI 音 |

---

## 6. 清单（按类型）

**BGM（2）**

1. 大厅循环曲  
2. 对战循环曲  

**媒体 SFX（2）**

3. 射击  
4. 胜利烟花  

**合成战斗 SFX（2）**

5. 命中（敌方/中性）  
6. 受伤（己方受击；细胞被吞并/变色时也用此音）  

**UI SFX（4 种 kind）**

7. hover  
8. tap  
9. confirm  
10. back  

共 **10** 类可区分的声音事件（BGM 2 + 媒体 2 + 战斗 2 + UI 4）。

---

## 7. 音效调试面板（仅 DEV）

路径：工具栏 **调试按钮**（设置齿轮右侧）→ 开发调试面板 → 音效调试（`ui/DebugButton.jsx` / `ui/DebugModal.jsx` / `ui/AudioDebugPanel.jsx`）。  
设置弹窗仅保留玩家向声音选项。

点击按钮会 `unlockCellAudio()` 后播放对应项，分组与上文一致：

| 分组 | 按钮 |
|------|------|
| 媒体 | 射击·己方 / 射击·敌方 / 烟花 |
| 战斗 | 命中 / 受伤 |
| UI | hover / tap / confirm / back |
| BGM | 大厅曲 / 对战曲（会真正切换当前 BGM） |

- 静音或对应滑条为 0 时只提示、不播。
- 媒体 SFX 依赖懒加载的 `@pixi/sound`，首次点击需在用户手势内。
- 生产构建不展示（`import.meta.env.DEV`）。

---

## 8. 维护注意

1. **加新媒体 SFX**：在 `audio.js` 注册 alias，走懒加载 `initPixiSound`，播放时乘 `sfxGain()`。  
2. **加合成音**：复用 `getPlayableAudioCtx` / `connectOut` / 限流表，并在本文件补一行说明。  
3. **UI 按钮**：优先 `uiSfx`，保证 hover + 解锁 + 点击音一致。  
4. **不要**在模块顶层 `import "@pixi/sound"` 或无手势 `AudioContext.resume()`。  
5. HMR：`import.meta.hot.dispose` 会停 BGM、卸 alias、关 AudioContext。
