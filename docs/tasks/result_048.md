# RESULT-048 — 房源指标雷达图与 rating10 默认分修复

## 变更摘要

### 1. 雷达图改为指标级维度

- `src/components/charts/RadarChart.tsx` 完全重写，从 `Record<string, number>` 改为接收 `RadarDatum[]` 结构化数据
- 新增 `RadarDatum` 接口导出（含 `id`、`label`、`score`）
- 新增同心刻度环：25/50/75 虚线内环 + 100 外环实线轮廓
- 指标数 < 3 时自动降级为条形图，避免空白或报错
- 指标数 > 10 时标签缩短为 4 字 + hover title 显示全称
- 指标数 6-10 时标签缩短为 6 字
- 数据点用小圆点标记，标签锚点根据角度动态调整避免重叠

### 2. PropertyDetail 接入指标数据

- `src/components/PropertyDetail.tsx` 新增 `indicators` prop
- 标题从"维度得分"改为"指标得分"
- 从 `state.indicators` 过滤 `participatesInScoring` 指标，生成 `RadarDatum[]`
- `src/App.tsx` 传递 `indicators={state.indicators}` 给 `PropertyDetail`

### 3. rating10 默认值修复

- `src/domain/fce.ts` 新增两个导出函数：
  - `effectiveValueForScoring()`: rating10 空值 → 5，其他类型不干涉
  - `indicatorDisplayScore()`: rating10 单项分 = `value * 10`（5→50, 8→80, 10→100），非 rating10 委托给 `scoreMembership()`
- `calculatePropertyScore()` 内部使用 `effectiveValueForScoring()` 获取有效值，确保 rating10 缺失值参与评分和权重计算
- `indicatorScores` 使用 `indicatorDisplayScore()` 写入，热力图不再显示 0

### 4. 测试

- `src/domain/fce.test.ts` 新增 12 个测试（总计从 6 个增长到 18 个）：
  - `effectiveValueForScoring` 4 个测试：rating10 空→5、rating10 有值不变、select 空保持空、number 空保持空
  - `rating10 scoring` 5 个测试：缺失→50、8→80、参与总分、混合指标、边界值 1→10 和 10→100
  - `indicatorDisplayScore` 2 个测试：rating10 使用 value*10、非 rating10 委托 scoreMembership
  - 新增 1 个测试：select 缺失仍跳过

### 5. 文档

- `README.md` 更新结果页面描述，说明雷达图按指标维度展示 + 刻度环
- 新增 rating10 默认值说明（5 分→50 分基准）
- 新增 `radar-bar-list` / `radar-bar-row` / `radar-bar-track` / `radar-bar-fill` / `radar-bar-value` CSS 样式（`src/styles.css`）

## 修改文件列表

| 文件 | 变更 |
|------|------|
| `src/domain/fce.ts` | +16 行：新增 `effectiveValueForScoring`、`indicatorDisplayScore`，修改 `calculatePropertyScore` 使用有效值 |
| `src/domain/fce.test.ts` | +209 行：新增 rating10 相关测试 |
| `src/components/charts/RadarChart.tsx` | +133 行：完全重写，支持 `RadarDatum[]`、刻度环、降级条形图 |
| `src/components/PropertyDetail.tsx` | +19 行：接入 `indicators` prop，生成指标级雷达数据 |
| `src/App.tsx` | +2 行：传递 `state.indicators` |
| `src/styles.css` | +51 行：雷达图条形降级样式 |
| `README.md` | +6 行：更新结果描述和 rating10 默认值说明 |
| `docs/index.html` | +4 行：构建产物更新 |
| `docs/assets/index-CeupSDRx.js` | 构建产物（新） |
| `docs/assets/index-Q-LXl03h.css` | 构建产物（新） |

## 命令执行结果

### `npm.cmd test`

```
Exit code: 0

Test Files  6 passed (6)
     Tests  85 passed (85)
  Duration  1.47s
```

所有 6 个测试文件通过，85 个测试全部通过（无 failure / skip）。

### `npm.cmd run build`

```
Exit code: 0

tsc: 无错误
vite v7.3.5: 构建成功
docs/index.html                 0.46 kB
docs/assets/index-Q-LXl03h.css 18.38 kB
docs/assets/index-CeupSDRx.js 252.83 kB
built in 2.31s
```

### `git status --short --branch`

```
## main
 M README.md
 M docs/index.html
 M docs/tasks/queue.md
 M src/App.tsx
 M src/components/PropertyDetail.tsx
 M src/components/charts/RadarChart.tsx
 M src/domain/fce.test.ts
 M src/domain/fce.ts
 M src/styles.css
?? .omc/
?? docs/assets/index-CeupSDRx.js
?? docs/assets/index-Q-LXl03h.css
?? docs/tasks/task_048.md
```

### `git diff --stat`

```
 9 files changed, 410 insertions(+), 31 deletions(-)
```

## 构建后确认

- [x] `docs/.nojekyll` 仍存在
- [x] `docs/tasks/task_048.md` 未被构建清理
- [x] `result_048.md` 已写入
- [x] 构建输出在 `docs/` 目录，可通过 GitHub Pages 访问

## 安全边界遵守

- [x] 仅修改本仓库内文件
- [x] 未提交 commit / push / 创建 PR
- [x] 未安装、升级、删除依赖
- [x] 未访问或修改 secrets / env / CI/CD
- [x] 未运行破坏性命令
- [x] 未重写核心 FCE 架构（仅在 `calculatePropertyScore` 中插入 `effectiveValueForScoring` 调用）
- [x] 未访问外网资源

## 未完成事项或风险

- 无。所有目标已完成，测试和构建均通过。
