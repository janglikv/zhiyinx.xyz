# Cell 游戏 — 音频 / 代码整理 To-Do

范围：`src/frontend/pages/games/cell/`（音频、UI 交互音、结构整理）  
现状：BGM 用 HTMLAudio；射击/烟花用 `@pixi/sound`；hit/hurt/die/UI 用 Web Audio 合成。

---

## 已完成（近期）

- [x] 合成 SFX：hit / hurt / die / UI（tap · confirm · back）
- [x] 合成 SFX 音量拉高（`SFX_MASTER` + 各包络 peak）
- [x] UI：hover 与点击分轨；可交互按钮覆盖 hover + click
- [x] BGM：hub / battle 分场景；HTMLAudio 避免 pixi 孤儿轨叠播
- [x] 射击分阵营限流；烟花 pan；HMR 清理 AudioContext / alias

---

## P0 — 低成本清理（优先）

- [x] 删除无外部引用的 deprecated API：`playBgm` / `fadeOutBgm` / `restartBgm`
- [x] 清理 `CELL_SOUND_ALIASES`：去掉已不走 pixi 的 `bgm` / `bgm-hub` / `bgm-play`，仅保留 `bullet` / `firework`（启动时仍 purge 旧 alias）
- [x] `playUi` 的 presets 提到模块级常量 `UI_PRESETS`
- [x] 限流时钟统一为 `performance.now()`
- [x] 增加 `uiSfx(clickKind, onClick)` helper
- [x] 用 `uiSfx` 迁移现有按钮（index / hub / 设置 / 结算 / 引导 / 工具按钮；重置进度二次确认仍用 `onUiHover` + 分支 `playUi`）
- [x] 消除 Chrome AudioContext autoplay 警告：`@pixi/sound` 改为手势内动态 import；合成音无手势时不 `resume`

---

## P1 — 结构拆分

- [x] `index.jsx` 高收益拆分（稳）：
  - `hooks/useCellProgress` — 进度读写 / 重置 / 全解锁
  - `hooks/useScreenTransition` — 黑场转场
  - `hooks/useCellBgm` — 场景 BGM 副作用
  - `ui/StartGate` · `HubScene` · `PlayScene` · `StageTools`
  - `progress.js` 补 `resetAllProgress` / `unlockAllLevels`
  - 对局 `mountCellGame` 仍留 index（与 Pixi 生命周期紧绑）
- [ ] 拆分 `audio.js`（约 480 行），建议：
  - `audio/bgm.js` — HTMLAudio 场景 BGM
  - `audio/media-sfx.js` — pixi bullet / firework
  - `audio/synth-sfx.js` — hit / hurt / die / UI
  - `audio/index.js` — 再导出 + `unlockCellAudio`
- [ ] 调用方保持 `from "./audio"`，对 `combat.js` / UI 透明
- [ ] （可选）`useCellPlaySession` — 再抽 mount / win-lose / tutorial

---

## P2 — 体验与工程

### 音量 / 静音

- [x] 设置弹窗：静音开关 + BGM / SFX 音量
- [x] `localStorage` 持久化（`muted` / `bgm` / `sfx`，key `cell-audio-settings-v1`）
- [x] 调试项（通关/解锁/重置）独立分组，仅 `import.meta.env.DEV` 显示
- [ ] 合成 SFX：共享 `masterGain` bus（替代每次 `connectOut` 新建 master）
- [ ] BGM：直接调 `HTMLAudioElement.volume`

### 音质 / 性能

- [ ] 双层 hit/hurt/die 削波：略降 peak 或 bus 上 `DynamicsCompressorNode`
- [ ] （可选）共用输出图 / 节点池，减轻密集 hit 时的 GC
- [ ] `makePanner` 无 `StereoPanner` 时：补等功率 L/R，或明确只支持现代浏览器并删无效 fallback

### 后端收敛（中长期，再加多种 SFX 时做）

- [ ] 评估：射击/烟花迁到 Web Audio buffer（与合成统一 master/mute/pan）
- [ ] 或：短媒体 + HTMLAudio 池（实现简单，细控弱）
- [ ] 不建议：为 UI 单独引入大型音效库

### 平台

- [ ] 触屏不依赖 hover（现状 `onMouseEnter` 正确）；勿用 `pointerenter` 乱播导致与 tap 打架

---

## 明确不做（当前）

- [ ] ~~为所有按钮做重型统一 `CellButton` 组件~~（样式差异大，helper 更划算）
- [ ] ~~立刻把 hit/hurt 全换成外部 wav~~（合成够用，除非要品牌音色）

---

## 建议落地顺序

1. **P0 清理** — 删废弃 API、alias、hoist presets、统一时钟、`uiSfx` 迁移  
2. **P2 静音/音量** — 设置里可调，体验收益大  
3. **P1 拆文件** — 再加音效或改 master bus 前做  
4. **P2 后端收敛 / 节点池** — 按需

---

## 相关文件速查

| 文件 | 职责 |
|------|------|
| `audio.js` | BGM + 媒体 SFX + 合成 SFX + UI helper |
| `combat.js` | hit / hurt / die 触发 |
| `index.jsx` | 场景、BGM、开始门、设置入口 |
| `hub/LevelSelect.jsx` | 选关 UI 音 |
| `ui/*Button*.jsx` / `SettingsModal.jsx` | 工具与设置 UI 音 |
| `settlement/*Overlay.jsx` | 胜负按钮 UI 音 |
| `tutorial/Hud.jsx` | 引导跳过 UI 音 |
| `settlement/fireworks.js` | 烟花媒体音 |
