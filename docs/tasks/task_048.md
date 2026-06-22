# TASK-048 - 房源指标雷达图与 rating10 默认分修复

## 背景

仓库：`C:\Users\Administrator\PycharmProjects\projects\second-hand-home-scorer`

用户反馈两个问题：

1. 房源页面选择某个房源后，详情区域里的“维度得分图”现在不是按现有指标展示，而是按类别汇总展示。用户希望它与当前指标保持一致：有多少参与评分的指标，就有多少维度，并增加不同的内外环，让图能完整反映某个房源的得分情况。
2. 之前出现过一个小 bug：`1-10 分`打分型指标在打分页面默认显示 5 分，结果页应以 50 分作为基准。但如果新增指标后没有对某个房源调整该指标，热力图里会按 0 分显示/计算。

## 根因证据

- `src/components/PropertyDetail.tsx` 当前传给 `RadarChart` 的是 `score.categoryScores`，因此图上只有类别维度，而不是每个指标维度。
- `src/components/charts/Heatmap.tsx` 当前使用 `score?.indicatorScores[ind.id] ?? 0`，当 `calculatePropertyScore()` 没有为未填写指标写入 `indicatorScores` 时，热力图显示为 0。
- `src/domain/fce.ts` 当前对 `property.valuesByIndicatorId[indicator.id] ?? ""` 取值；`rating10` 未填写时得到空字符串，`membershipFromRule()` 返回 `null`，该指标被跳过。
- `src/components/ScoringMatrix.tsx` 的 `rating10` 控件显示默认值 `value || 5`，但这个默认值没有写回数据，也没有被评分函数视作有效默认值。

## 安全边界

Claude Code 本任务允许在非沙箱模式执行，但必须遵守：

- 只允许修改本仓库内文件。
- 不允许提交 commit、push、发布、创建 PR。
- 不允许安装、升级、删除依赖。
- 不允许访问或修改 secrets、环境变量、凭证、CI/CD、GitHub Actions、部署 token。
- 不允许运行破坏性命令，例如 `rm -rf`、`git reset --hard`、`git checkout --`、批量删除。
- 不允许重写核心 FCE 架构或改变非本任务相关业务逻辑。
- 网络仅限 Claude API 自身调用；不要主动访问外网资料或下载资源。
- 如遇阻塞，写入 `docs/tasks/result_048.md` 说明，不要绕过限制。

## 目标

### 1. 房源详情图改为指标级得分图

当前“维度得分”图必须改为按当前参与评分的指标展示：

- `PropertyDetail` 需要拿到当前 `indicators`，只展示 `participatesInScoring === true` 的指标。
- 图的维度数量应等于参与评分指标数量。
- 每个维度使用对应指标名称，而不是类别名称。
- 每个维度的得分来自该房源该指标的有效单项分，范围 0-100。
- 如果指标过多，标签不能互相覆盖到不可读；可以采取短标签、外侧图例、可滚动列表、tooltip/title 或简化标签策略。
- 图需要增加内外环：
  - 至少显示 25/50/75/100 或 20/40/60/80/100 的刻度环。
  - 外环标识满分轮廓。
  - 可选：用不同透明度或虚线区分内环。
- 图应能清晰表达“该房源在每个指标上的实际得分”，而不仅是类别平均。
- 如果指标数量少于 3，应优雅降级为条形/列表或仍能正常绘制，不要空白或报错。

建议做法：

- 将 `src/components/charts/RadarChart.tsx` 从 `Record<string, number>` 改为接收结构化数据，例如：

```ts
interface RadarDatum {
  id: string;
  label: string;
  score: number;
}
```

- 在 `PropertyDetail` 中根据 `indicators` 和 `score.indicatorScores` 生成 `RadarDatum[]`。
- `App.tsx` 调用 `PropertyDetail` 时传入 `state.indicators`。

### 2. 修复 rating10 缺失值默认 5 / 热力图 0 分问题

对 `rating10` 指标建立一致的有效默认值逻辑：

- 当 `indicator.inputType === "rating10"` 且房源没有该指标值或值为空字符串时，评分应使用默认值 5。
- 结果页热力图中，该指标应显示 50，而不是 0。
- 单项分数的展示规则：`rating10` 的单项分数使用 `分值 * 10`，因此 5 => 50，8 => 80，10 => 100。
- 总分计算也应使用同一有效默认值，避免新增指标在未调整时被当作缺失/0 或被跳过。
- 不要把 `number`、`select`、`boolean` 的缺失值也默认成 5；它们仍按现有缺失逻辑处理。
- 硬伤 boolean 的逻辑不要改变：未勾选不应降低总分，不应导致淘汰。

建议做法：

- 在 `src/domain/fce.ts` 中新增小型 helper，例如：

```ts
export function effectiveValueForScoring(indicator: Indicator, rawValue: string | number | boolean | "") {
  if (indicator.inputType === "rating10" && rawValue === "") return 5;
  return rawValue;
}

export function indicatorDisplayScore(indicator: Indicator, membership: MembershipVector, value: string | number | boolean | "") {
  if (indicator.inputType === "rating10") return Math.max(0, Math.min(100, Number(value) * 10));
  return scoreMembership(membership);
}
```

实现时以类型安全和现有代码风格为准，不要求逐字照搬。

## 测试要求

必须增加或更新测试，至少覆盖：

1. `rating10` 指标缺失值时，`calculatePropertyScore()` 的 `indicatorScores[indicator.id]` 是 50。
2. `rating10` 指标值为 8 时，`indicatorScores[indicator.id]` 是 80。
3. `rating10` 缺失值不会被跳过：总分计算中该指标应参与权重。
4. 非 `rating10` 指标缺失值仍保持原有跳过/不贡献逻辑。
5. `PropertyDetail` / `RadarChart` 的数据输入使用指标级数据，而不是 `categoryScores`。如现有测试环境不方便渲染组件，至少通过提取 helper 并测试 helper。

## 视觉与交互要求

- 维持 TASK-047 后的整体 UI 风格，不回退到旧配色。
- 不引入新依赖。
- 雷达图 SVG 尺寸稳定，桌面和移动端不应撑破卡片。
- 图表文本不要明显重叠；指标多时用合理降级方式。
- 内外环和数据多边形需要有清晰对比度。
- 继续支持 `prefers-reduced-motion`，不要增加强动效。

## 文档

更新 `README.md` 的相关说明：

- 房源详情图现在按指标维度展示。
- 说明 `1-10 分`指标未填写时按默认 5 分处理，热力图显示 50 分基准。

## 验证要求

必须执行并在 `docs/tasks/result_048.md` 记录命令、退出码和关键输出：

- `npm.cmd test`
- `npm.cmd run build`
- `git status --short --branch`
- `git diff --stat`

构建后确认：

- `docs/.nojekyll` 仍存在。
- `docs/tasks/task_048.md`、`result_048.md` 未被构建清理。
- 本地页面能在 `http://127.0.0.1:5173/second-hand-home-scorer/` 或构建产物中正常打开。

## 结果文件

完成后写入 `docs/tasks/result_048.md`，必须包含：

- 实际变更摘要。
- 修改文件列表。
- 测试/构建命令、退出码和关键输出。
- 是否遵守安全边界。
- 未完成事项或风险。

