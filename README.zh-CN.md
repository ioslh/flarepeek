# FlarePeek

[English](./README.md) | 简体中文

面向 Cloudflare Workers 开发者的 Chrome 插件。用户登录 Cloudflare 账号后，打开一个由 Workers 提供服务的 zone 域名时，插件自动识别对应的 Worker，并提供开发辅助工具——例如一键把生产域名的流量临时切换到某个 preview version（基于 [Version Overrides](https://developers.cloudflare.com/workers/versions-and-deployments/version-overrides/)），查看灰度部署状态、Worker 请求/错误指标等。

## 技术选型

以下是项目启动时确定的一次性技术选型，除非有充分理由否则不应中途更换。长期编码规范见 [AGENTS.md](./AGENTS.md)（目前仅提供英文版，供全球贡献者共用）。

| 类别                  | 选择                                                                                                                                      | 备注                                                                                                                                                                              |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 扩展开发框架          | [WXT](https://wxt.dev/)                                                                                                                   | 活跃维护、Vite 驱动、跨浏览器、bundle 体积小。Plasmo 官方已自评进入少人维护状态，故不选                                                                                           |
| 语言                  | TypeScript                                                                                                                                | 全项目强制，禁用 `any`                                                                                                                                                            |
| UI 框架               | React                                                                                                                                     | 生态最大、AI 辅助编码资料最多                                                                                                                                                     |
| 样式方案              | Tailwind CSS                                                                                                                              | 原子化写法，适合插件内小型 UI 快速迭代                                                                                                                                            |
| 组件库                | [shadcn/ui](https://ui.shadcn.com/)（[Radix Primitives](https://www.radix-ui.com/) + Tailwind）+ [lucide-react](https://lucide.dev/) 图标 | 生成到 `shared/ui/` 的源码级组件，不是运行时依赖包；建立在已锁定的 Tailwind 之上而非替换它，提供无障碍的 Dialog/Popover/DropdownMenu 等原语，避免继续手写焦点陷阱/Escape 关闭逻辑 |
| 包管理器              | pnpm                                                                                                                                      | WXT 官方样例默认使用                                                                                                                                                              |
| Lint / Format         | ESLint 9 + Prettier                                                                                                                       | `eslint-plugin-react` 7.x 与 ESLint 10 的 flat config 运行时不兼容（`context.getFilename is not a function`），暂时锁定 ESLint 9；该插件发新版本支持 10 后再升级                  |
| Manifest 版本         | MV3                                                                                                                                       | MV2 已停止支持                                                                                                                                                                    |
| Cloudflare API 客户端 | 官方 [`cloudflare`](https://www.npmjs.com/package/cloudflare) npm SDK                                                                     | 类型齐全，避免手写 fetch 封装和追踪 API 版本变化                                                                                                                                  |
| 状态管理              | WXT `storage` API + React Context                                                                                                         | 先不引入额外状态库；真正复杂后再评估 Zustand                                                                                                                                      |
| 测试                  | Vitest（单元）+ Playwright（e2e，支持测试 Chrome 扩展）                                                                                   |                                                                                                                                                                                   |
| 国际化                | `browser.i18n` + `public/_locales/`                                                                                                       | 从第一天接入；`_locales` 必须放在 `public/` 下 WXT 才会读取并生成类型                                                                                                             |
| 项目结构              | 单仓库                                                                                                                                    | 暂不拆分为 monorepo                                                                                                                                                               |

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

## 许可证

[MIT](./LICENSE)
