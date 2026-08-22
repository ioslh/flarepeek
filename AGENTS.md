# AGENTS.md

本文件是本仓库的长期编码规范，任何人（含 AI agent）在本仓库写代码时都必须遵守。一次性技术选型见 [README.md](./README.md)，本文件只记录持续生效的约定。

## 目录结构

- 按 WXT 的 entrypoints 约定组织入口：`entrypoints/popup/`、`entrypoints/sidepanel/`、`entrypoints/options/`、`entrypoints/background/`。
  - `popup`：点工具栏图标打开，只做最高频操作（识别当前 tab 的 Worker + 一键预览版本），不放统计/Bindings/灰度控制这类重内容；账号/Token 只读展示，不提供切换（那是低频纠偏操作）。
  - `sidepanel`：完整工具面板，通过 popup 里的按钮或 Chrome 自带入口打开。**不跟随浏览器 tab 切换自动刷新**——固定在打开时那个 tab，tab 变了只在顶部提示条里提示，用户点了才切换（见 `entrypoints/sidepanel/use-pinned-hostname.ts`）。加新的重数据请求前，想一下是不是应该走这套"手动切换"逻辑，而不是让它跟着 tab 变化自动重新请求。承担账号切换、灰度控制、bindings 等重操作；页面按"操作优先、参考其次"排布——最高频的 Versions 卡片在最前面，且默认收起编辑类控件（如"Manage deployment"），只在用户主动展开时才铺开，不要把大块编辑表单默认展示出来。
- 入口内部按 feature 分文件夹，不要按 type（`components/`、`hooks/` 大杂烩）分。
- **popup 和 sidepanel 都要用的、且交互行为一致的 hook/组件放 `shared/worker-panel/`**（如 `use-worker-lookup.ts`、`version-row.tsx`、`identity-header.tsx`），不要在两个 entrypoint 里各写一份。**两边都要展示同一份数据、但交互能力不同时**（例如账号信息 popup 只读、sidepanel 可切换+管理），拆成两个各自归属其 entrypoint 的小组件（如 `entrypoints/sidepanel/account/account-control.tsx` + `entrypoints/popup/account-badge.tsx`），不要塞进一个组件里用 prop 切换模式。只有单个 entrypoint 用的东西才留在它自己的 feature 文件夹里。
- **`shared/ui/`**：shadcn/ui 生成的纯 UI 基础组件（`Button`、`Card`、`Dialog` 等），不包含任何产品/业务知识，通过 `pnpm dlx shadcn@latest add <name>` 管理；升级 shadcn 版本前不要手改这些文件的核心结构，样式/变体上的小调整可以直接改。与之相对，`shared/worker-panel/` 存放的是有产品知识的业务组件（如 `version-row.tsx`）。
- 多个 feature 共用的非 UI 逻辑放到顶层 `shared/`（如 `shared/cloudflare-api/`、`shared/storage/`）。

## 命名规范

- **组件文件名**：kebab-case，例如 `version-switcher.tsx`、`api-token-form.tsx`。
- **代码内组件标识符**：PascalCase，例如 `export function VersionSwitcher() {}`，与文件名不必字面一致但要能一一对应（`version-switcher.tsx` → `VersionSwitcher`）。
- **hooks 文件**：`use-xxx.ts`（kebab-case），导出的 hook 名为 camelCase，例如 `use-current-worker.ts` → `useCurrentWorker`。
- **工具函数文件**：`xxx-utils.ts`（kebab-case），导出函数 camelCase。
- **目录名**：统一 kebab-case。
- **类型/interface**：PascalCase，放在使用它最多的文件内联定义；跨文件共用的类型放对应 feature 或 shared 目录下的 `types.ts`。

## 类型与数据校验

- 全项目 TypeScript，禁止使用 `any`；无法确定类型时用 `unknown` 并做类型收窄。
- 所有 Cloudflare API 响应必须用 zod schema 做运行时校验，不能假设外部返回的 JSON 形状一定符合 SDK 类型声明。

## 组件范式

- 只写函数组件 + hooks，不使用 class 组件。
- 容器组件（负责发起请求、管理状态）与展示组件（纯渲染、只接收 props）分离，避免一个组件里既 fetch 又画 UI。
- 数据获取逻辑封装进对应 feature 的 hook 里，不要直接在组件 body 里裸写 `useEffect` + fetch。

## 错误处理

- Cloudflare API 调用失败要用统一的错误展示组件/方案（错误码 → 用户可读文案的映射表），不要每个组件各写一套 try/catch + 局部错误态。
- 网络层的错误分类（鉴权失败 / 权限不足 / 限流 / 未知错误）在 `shared/cloudflare-api/` 里统一处理，上层组件只消费分类后的结果。

## 鉴权与敏感信息

- API Token 只存 `chrome.storage.local`，禁止存 `chrome.storage.sync`（避免被同步到 Google 账号云端）。
- 任何日志（`console.log`、错误上报等）禁止打印 Token 明文或其他敏感字段。
- 生产构建移除调试用的 `console.log`（保留 `console.error`/`console.warn`）。

## 权限最小化

- `wxt.config.ts` / `manifest` 中每新增一个 `permissions` 或 `host_permissions`，对应 PR 描述里必须说明为什么必须要这个权限，不能"以防万一"式申请。

## 国际化

- 所有面向用户的文案通过 `chrome.i18n`（`_locales/<lang>/messages.json`）读取，禁止在组件里硬编码中/英文字符串。
- 新增文案时至少同步维护 `en` 和 `zh_CN` 两个语言文件。

## 提交规范

- 使用 Conventional Commits：`feat:`、`fix:`、`chore:`、`refactor:`、`test:`、`docs:` 等前缀。
- 一个提交只做一件事，避免把 feature 开发和格式化/重构混在一次提交里。

## 测试

- 纯逻辑（hooks、工具函数、Cloudflare API 封装）用 Vitest 写单元测试。
- 涉及跨 entrypoint 的交互（如 side panel 触发 background 注入 header 并验证生效）用 Playwright e2e 覆盖。
- 新增 feature 至少要有对应的单元测试，不要求 100% 覆盖率但核心逻辑分支需要覆盖。
