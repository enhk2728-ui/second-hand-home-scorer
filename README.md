# 二手房 FCE 评分器

一个本地优先的 React/Vite 工具，用于录入二手房房源、配置指标体系、统一评分，并通过 FCE 与 AHP 权重辅助筛选候选房源。

公开页面：

```text
https://enhk2728-ui.github.io/second-hand-home-scorer/
```

## 功能

- 房源基础信息录入与编辑
- 统一批量打分
- 可编辑指标体系
- AHP 两两判断矩阵权重
- 几何平均法计算权重
- AHP 一致性检验
- FCE 模糊综合评价
- 硬伤否决
- 结果排序、雷达图、热力图
- 本地浏览器保存
- JSON 备份/恢复
- CSV 导出

## 本地运行

```powershell
npm install
npm run dev
```

## 构建 GitHub Pages 静态页面

```powershell
npm run build
```

构建产物输出到 `docs/`，用于 GitHub Pages 从 `main` 分支的 `/docs` 目录发布。
