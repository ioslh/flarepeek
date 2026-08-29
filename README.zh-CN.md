# FlarePeek

[English](./README.md) | 简体中文

[Chrome Web Store](https://chromewebstore.google.com/detail/ffdbljcgdjkbbbbodnjbbgpahhnkfbnl)

面向 Cloudflare Workers 开发者的 Chrome 插件。用户登录 Cloudflare 账号后，打开一个由 Workers 提供服务的 zone 域名时，插件自动识别对应的 Worker，并提供开发辅助工具——例如一键把生产域名的流量临时切换到某个 preview version（基于 [Version Overrides](https://developers.cloudflare.com/workers/versions-and-deployments/version-overrides/)），查看灰度部署状态、Worker 请求/错误指标等。

## 文档

以下文档目前仅提供英文版，供全球贡献者共用：

- [Tech stack](./docs/tech-stack.md) —— 项目启动时确定的一次性技术选型。
- [Cloudflare capability boundaries reference](./docs/cloudflare-reference.md) —— 约束本插件功能边界的 Cloudflare 官方限制。
- [Sidepanel multi-tab design](./docs/sidepanel-tabs-design.md) —— sidepanel 多标签功能背后的设计决策。
- [AGENTS.md](./AGENTS.md) —— 项目长期编码规范。

## 认证方式

Cloudflare 未对第三方应用开放公开的 OAuth client 注册流程（`wrangler login` 使用的 OAuth 是 Cloudflare 内部专用 client）。因此本插件采用 **Scoped API Token** 方式登录：用户通过插件内预填权限模板的链接跳转到 Cloudflare Dashboard 创建一个最小权限的 API Token，粘贴回插件保存。

## 开发

```sh
pnpm install       # 安装依赖
pnpm dev           # 启动开发服务器（Chrome，带 HMR）
pnpm dev:firefox   # 启动开发服务器（Firefox）

pnpm compile       # TypeScript 类型检查
pnpm lint          # ESLint 检查
pnpm lint:fix      # ESLint 自动修复
pnpm format        # Prettier 格式化
pnpm format:check  # 仅检查格式，不写入

pnpm test          # Vitest 单元测试
pnpm test:watch    # Vitest watch 模式
pnpm build         # 构建生产版本到 .output/chrome-mv3
pnpm test:e2e      # Playwright e2e（依赖 pnpm build 先产出 .output/chrome-mv3）

pnpm zip           # 打包成可上传 Chrome Web Store 的 zip
```

首次加载到 Chrome 调试：`pnpm build` 后，在 `chrome://extensions` 打开开发者模式 → 加载已解压的扩展程序 → 选择 `.output/chrome-mv3`。

**避免每次重载都要重新粘贴 API Token**：把 `.env.example` 复制为 `.env.development.local`，在 `WXT_DEV_CF_API_TOKENS` 里填一个或多个逗号分隔的 Cloudflare API Token（配多个也方便测试多账号切换）。仅在开发构建下、且插件存储里还没有任何 Token 时，会自动校验并写入——参见 `entrypoints/background/dev-token-seed.ts`。`.env.development.local` 已被 gitignore，且按 mode 加载，`pnpm build`/`pnpm zip` 永远不会读取它，不会混进正式构建产物。

## 许可证

[MIT](./LICENSE)
