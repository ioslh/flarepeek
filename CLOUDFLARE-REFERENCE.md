# Cloudflare 能力边界参考

本文件汇总了开发 FlarePeek 过程中查证过的、会直接约束本插件功能边界的 Cloudflare 官方特性/限制。**官方文档的描述是能力边界的唯一可信来源（only source of truth）**——凡是本文件与代码注释/记忆冲突时，以重新查证官方文档为准，不要凭印象假设。

每条包含：官方链接、官方原话（尽量逐字引用）、对我们产品的具体影响。查不到官方文档、只能靠直接调用 API 或线上实测确认的，单独放在文末「未见官方文档、仅实测确认」一节，并标注确认方式，方便以后重新验证或在 Cloudflare 文档更新时优先复查。

## Version Overrides（预览指定版本）

**官方文档**：https://developers.cloudflare.com/workers/versions-and-deployments/version-overrides/

- 机制：通过请求头 `Cloudflare-Workers-Version-Overrides`（RFC 8941 Dictionary Structured Header，`worker名="version_id"`）让指定请求命中某个版本，哪怕该版本在当前 deployment 里是 0% 流量。
- 原话：**"A version override will only be applied if the specified version is in the current deployment."** —— 只有当前 deployment 里的版本才能被 override 命中。
- 原话：**"Workers currently only supports serving two different versions in one deployment."** —— 一个 deployment 最多同时服务两个版本（这是官方文档明确写出的限制，不只是我们实测碰到的 API 报错）。
- 原话：**"Version overrides only apply to `fetch()`-based service binding calls"**，不适用于 RPC 方式调用的 service binding。

**对 FlarePeek 的影响**：`shared/version-override/` 整套"预览此版本"功能的技术基础；也解释了为什么 sidepanel 只能对"当前 deployment 里的版本"提供 Activate 按钮——不在 deployment 里的版本理论上也能尝试注入 override header，但 Cloudflare 不保证生效，这一点还没有在 UI 上做出提示（可能的后续改进点）。

## 灰度部署（Gradual Deployments）——版本数量与候选窗口

**官方文档**：https://developers.cloudflare.com/workers/versions-and-deployments/gradual-deployments/

- 原话：**"You can only create a gradual deployment with the last 100 uploaded versions of your Worker."** —— 能拿来组成新 deployment 的候选版本，只能是最近上传的 100 个。
- Durable Objects 场景下的特殊限制：**"only one version of each Durable Object can run at a time"** —— 同一个 Durable Object 实例任意时刻只能运行一个版本，灰度百分比是按"实例"分配版本，不是按请求随机分配。

**对 FlarePeek 的影响**：`shared/cloudflare-api/versions.ts` 里 `listRecentVersions` 的 `DEFAULT_LIMIT = 40` 是我们自己选择"展示多少"，不是 Cloudflare 的限制——真正的硬限制是 100，这个数字来自本节和下一节两处文档的双重确认。`version-combobox.tsx` 的候选列表理论上应该覆盖到 100（目前只展示最近 40 个，够用但不是全部）。

## 版本回滚/部署资格窗口从 10 提升到 100

**官方 changelog**：https://developers.cloudflare.com/changelog/post/2025-09-11-increased-version-rollback-limit/

- 原话：**"The number of recent versions available for a Worker rollback has been increased from 10 to 100."**（2025-09-11）

**对 FlarePeek 的影响**：这是本 session 早前一次自我纠正的依据——此前误以为限制是"最近 10 个"，实际是 2025 年 9 月已提升到 100。`shared/cloudflare-api/versions.ts` 的注释里引用了这个 changelog 作为出处。

## Rollback（回滚）与 Durable Object migrations 的交互

**官方文档**：

- https://developers.cloudflare.com/workers/versions-and-deployments/rollbacks/
- https://developers.cloudflare.com/workers/versions-and-deployments/gradual-deployments/with-durable-objects/

- 原话（rollbacks 页）：**"You can only roll back to the 100 most recently published versions."**（与上一节一致）
- 原话（rollbacks 页）：如果"a Durable Object class lifecycle change (via exports or the legacy migrations array) has occurred between the version in the active deployment and the version selected to roll back to"，则不允许回滚。
- 原话（rollbacks 页）：**"Rolling back to a previous version of your Worker will immediately create a new deployment"** —— 回滚本质是创建一个新 deployment，不是"撤销"操作。
- 原话（with-durable-objects 页）：**"Durable Object lifecycle changes are atomic operations. Once a lifecycle change is deployed, rollbacks cannot take place to any version prior to the one that included the change."**
- 原话（with-durable-objects 页）：**"Versions of Worker bundles that change Durable Object class lifecycle cannot be uploaded [via versions upload]"** —— 涉及 DO class 增删改的版本必须走 `wrangler deploy`，不能只 `versions upload`。

**对 FlarePeek 的影响**：这是 `entrypoints/sidepanel/version-switcher/use-recent-versions.ts` 里 `everDeployed` 字段/"从未部署过，回滚可能失败"提示背后的真实约束之一——即使某版本 `everDeployed === true`，只要它和当前 active 版本之间跨越了一次 DO migration，回滚仍然会被 Cloudflare 拒绝，而这一点我们目前完全没有能力检测（deploylab 没有 Durable Objects，未做过实测；真实用户的 Worker 如果用了 DO，点 Deploy 回退到旧版本时可能会遇到我们 UI 上没有预警的失败）。**已知的产品缺口，值得后续补一个针对这种失败的专门错误提示**，而不是走通用错误文案。

## `version_metadata` Binding

**官方文档**：https://developers.cloudflare.com/workers/runtime-apis/bindings/version-metadata/

- 提供 `env.CF_VERSION_METADATA` binding，Worker 运行时可以读到 `{id, tag}`（当前处理这个请求的版本自己的 id/tag）。

**对 FlarePeek 的影响**：目前仅用在 `deploylab`（配套测试项目）的 `wrangler.jsonc` 里，用来在页面上显示"当前是哪个版本在响应"。FlarePeek 本体没有用到——这是此前"如果配合后端还能做什么"头脑风暴阶段调研的能力，用户当时决定不做后端方案，此条留档只是为了不丢失调研结论，不代表近期会实现。

## GraphQL Analytics API 权限与 orderBy/dimensions 关系

**官方文档**：

- 权限：Cloudflare Dashboard 创建 Token 时选 Account → Account Analytics → Read 即可访问 `workersInvocationsAdaptive`/`kvOperationsAdaptiveGroups`/`d1AnalyticsAdaptiveGroups`/`r2OperationsAdaptiveGroups` 等所有 adaptive-groups 数据集，不需要额外权限组。
- 查询基础：https://developers.cloudflare.com/analytics/graphql-api/getting-started/querying-basics/

**对 FlarePeek 的影响**：`shared/cloudflare-api/create-token-url.ts` 预填的权限模板里只申请了一个 "Account Analytics: Read"，同时覆盖 Worker 请求统计和 KV/D1/R2 用量统计四类查询——不需要为每种 binding 类型单独申请权限，这一点已经过官方文档确认，不是我们的假设。

## 未见官方文档、仅实测确认（需要定期复查）

以下几点在 Cloudflare 官方文档中没有找到明确成文说明，是本 session 通过直接调用真实 Cloudflare API 或触发真实报错确认的。**这类"未文档化行为"存在被 Cloudflare 静默调整的风险，不能像上面几节一样长期当作稳定契约**，建议每隔一段时间用 `deploylab` 重新验证一遍。

- **一个 deployment 的两个版本槽位，可以同时是之前从未上过线的版本**（不要求任一槽位与当前 deployment 有重叠）——通过直接调用 `deployments.create()` 真实测试确认，官方文档没有单独就"两个槽位是否需要与当前 deployment 重叠"给出文字说明（只在 version-overrides 文档里提到"最多两个版本"这个数量限制，见上文）。`entrypoints/sidepanel/version-switcher/deployment-control.tsx` 的两个 `VersionCombobox` 能自由组合任意候选版本，依据就是这次实测。
- **GraphQL adaptive-groups 查询里，`orderBy` 引用的字段必须同时出现在 `dimensions {}` 里，否则报错 "cannot order by date: it is neither aggregated, nor a dimension"**——通过一次真实用户报的 bug（binding 用量数据完全不显示）触发实际报错后定位到的，官方 Querying basics 文档展示的例子里 orderBy 和 dimensions 字段本来就一致，没有单独写"这是强制要求"。`shared/cloudflare-api/{kv,d1,r2}-usage.ts` 三个文件都因为这个坑各修过一次。
