# zhixinx.xyz

一个部署到 Cloudflare Workers + D1 的简单登录网站。

## 本地开发

```bash
npm install
npm run db:migrate:local
npm run dev
```

打开 `http://localhost:8787`。首次使用先创建管理员账号，之后使用该账号登录。

## Cloudflare 部署

1. 登录 Cloudflare Wrangler：

```bash
npx wrangler login
```

2. 创建免费的 D1 数据库：

```bash
npx wrangler d1 create zhixinx-db
```

3. 把命令输出里的 `database_id` 填到 `wrangler.toml`。

4. 执行远端数据库迁移：

```bash
npm run db:migrate
```

5. 部署 Worker：

```bash
npm run deploy
```

## 域名配置

如果域名 DNS 托管在阿里云，先在阿里云域名控制台把 `zhixinx.xyz` 的 nameserver 改成 Cloudflare 给出的两个 nameserver。等待生效后，在 Cloudflare 里：

1. 进入 Websites，添加 `zhixinx.xyz`。
2. 进入 Workers & Pages，打开 `zhixinx-xyz` Worker。
3. 在 Settings -> Domains & Routes 添加 Custom Domain，例如 `zhixinx.xyz` 或 `www.zhixinx.xyz`。
4. 如果同时使用根域名和 `www`，两个域名都添加到 Custom Domain。

Cloudflare 官方文档中，D1 需要先创建数据库并绑定到 Worker，Custom Domain 可以在 Worker 的 Domains & Routes 中添加。
