# TASK-047 Result - 指标升级引导、首次教程声明与 UI 美化

## 变更摘要

- 新增 `src/domain/stateMigration.ts`，支持检测缺失默认指标、非破坏性合并新版默认指标、记录 onboarding 与指标版本。
- 新增 `src/components/OnboardingGuide.tsx`，首次打开展示风险声明、快速教程；旧状态缺失新版指标时展示“合并新版默认指标 / 保留现有指标 / 重置为新版示例数据”。
- 更新 `src/App.tsx`，接入 onboarding、迁移状态和帮助入口；修复 review 中发现的弹窗关闭后无法再次打开、迁移状态 stale 的问题。
- 更新 `src/components/Shell.tsx`，新增左侧帮助按钮。
- 重写 `src/styles.css` 的视觉层级、响应式布局和 CSS 动效，并支持 `prefers-reduced-motion`。
- 更新 `README.md`，说明新版 21 项默认指标、旧用户 localStorage 导致仍看到旧指标的原因和升级方法。
- 更新 `vite.config.ts`，将 `emptyOutDir` 改为 `false`，避免构建清空 `docs/tasks` 和 `docs/.nojekyll`。
- 重建 GitHub Pages 静态产物到 `docs/`，并保留 `.nojekyll`。

## 修改文件

- `README.md`
- `vite.config.ts`
- `src/App.tsx`
- `src/components/Shell.tsx`
- `src/components/OnboardingGuide.tsx`
- `src/domain/stateMigration.ts`
- `src/domain/stateMigration.test.ts`
- `src/styles.css`
- `docs/.nojekyll`
- `docs/index.html`
- `docs/assets/*`
- `docs/tasks/task_047.md`
- `docs/tasks/result_047.md`
- `docs/tasks/review_047.md`
- `docs/tasks/queue.md`

## 验证

### `npm.cmd test`

Exit code: 0

```text
Test Files  6 passed (6)
Tests       73 passed (73)
```

### `npm.cmd run build`

Exit code: 0

```text
vite v7.3.5 building client environment for production...
1596 modules transformed.
docs/index.html                 0.46 kB
docs/assets/index-C5zDosz4.css  17.75 kB
docs/assets/index-_RltO76J.js   251.31 kB
built in 2.52s
```

### 构建保留检查

Exit code: 0

```text
docs/.nojekyll exists: True
docs/tasks/task_047.md exists: True
```

## 安全边界

- Claude 未提交、未 push、未安装依赖、未修改 secrets/CI/CD。
- Codex 独立复核并修复构建清理 `docs/tasks` 的工程化问题。
- 发现 Claude 工具生成的 `.omc/` 本地元数据目录，未纳入提交，后续由 Codex 清理。

