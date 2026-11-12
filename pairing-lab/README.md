# Pairing Lab：部署指南

整个网站由三部分组成：

| 部分 | 文件 | 作用 |
|---|---|---|
| 前端 | `index.html` | 用户在浏览器里看到的所有页面（Lab + Mercado 3D） |
| 数据 | `data/ingredients.json` | 500 种食材和约 1 万条搭配，来自 Ahn et al. 2011 开放数据（CC BY 4.0） |
| 后端 | `api/ai.js` | 一个"无服务器函数"：替你保管 API Key，并调用 Claude |

部署流程用一句话概括：**代码放在 GitHub → Vercel 自动从 GitHub 拿代码 → 发布成一个网址**。全程不需要终端。

---

## 第 1 步：把代码放到 GitHub

**原理**：GitHub 是代码的"云端保险箱"，会记录每次修改的版本。Vercel 不直接读你电脑里的文件，而是从 GitHub 读取，所以代码要先放到这里。

1. 注册或登录 github.com。
2. 点右上角 **+** → **New repository**。名字填 `pairing-lab`，选 **Private**，其他保持默认 → **Create repository**。
3. 在新仓库页面点 **uploading an existing file**。
4. 把解压后 `pairing-lab` 文件夹**里面**的所有内容（`index.html`、`api`、`data`、`package.json`、`README.md`）一起拖进去。注意拖的是内容，不是外层文件夹本身。
5. 页面底部点 **Commit changes**。这一步相当于"保存并记录一个版本"。

> 注意：`.gitignore` 是隐藏文件，拖拽时可能看不到，不传也没关系。它的作用是防止密钥文件被误传。

## 第 2 步：申请 Claude API Key

**原理**：网站上每生成一次菜谱，都要向 Anthropic 付一点 token 费用。API Key 就是你的"付款凭证"，所以**绝对不能出现在前端代码里**，只能放在后端。

1. 登录 console.anthropic.com，绑定付款方式。
2. **API Keys** → **Create Key**，复制下来。这串字符只显示一次。
3. 强烈建议：在 **Limits / Billing** 里设置**每月消费上限**，比如 $10。这样即使被刷，最坏情况也只损失这么多。

## 第 3 步：用 Vercel 部署

**原理**：Vercel 会把 `index.html` 和 `data/` 当作静态文件放到全球的服务器上；`api/` 文件夹里的每个文件会自动变成一个后端接口（`api/ai.js` 对应 `/api/ai`）。

1. 打开 vercel.com，用 **Continue with GitHub** 登录。
2. **Add New… → Project** → 找到 `pairing-lab` → **Import**。
3. **Framework Preset** 选 **Other**，其他保持默认。
4. 展开 **Environment Variables**，添加：
   - Name：`ANTHROPIC_API_KEY`
   - Value：粘贴第 2 步复制的 key

   **原理**：环境变量是"只有服务器知道的设置"。`api/ai.js` 运行时会读取它，但访客永远看不到。
5. 点 **Deploy**，大约 1 分钟后会得到一个 `pairing-lab-xxx.vercel.app` 网址。打开就是你的网站。

## 以后怎么更新网站

在 GitHub 仓库里修改或重新上传文件，然后 **Commit**。Vercel 检测到 GitHub 有新版本，会自动重新部署，一两分钟后网站就更新了。这个机制叫"持续部署"。

## 可选设置（Vercel → Project → Settings → Environment Variables）

| 变量 | 默认值 | 作用 |
|---|---|---|
| `ANTHROPIC_MODEL` | `claude-haiku-5-5` | 想要更强的菜谱可以改成 `claude-sonnet-5-5`，单次成本会更高 |
| `AI_REQUESTS_PER_HOUR` | `20` | 每个访客每小时最多生成几次 |

改完变量之后，需要在 **Deployments** 页面点 **Redeploy** 才会生效。

## 后端已经做了哪些保护

- API Key 只存在于服务器上。
- 每个访客每小时有次数上限。这个上限是"减速带"：服务器重启后会清零。以后流量大了，可以换成 Upstash Redis 做严格限流。
- 只接受格式正确、长度合理的请求。
- 系统提示词限定 AI 只回答和食物相关的问题，防止网站被拿来当免费聊天机器人。

## 自定义域名（可选）

先在域名商（如 Namecheap、Cloudflare）买一个域名，然后在 Vercel → Project → **Settings → Domains** 里添加，再按提示到域名商那里填 DNS 记录。

## 数据来源

Ahn, Ahnert, Bagrow & Barabási (2011). *Flavor network and the principles of food pairing.* Scientific Reports 1:196. 数据集 doi:10.5281/zenodo.11449658，CC BY 4.0。网站上需要保留这个署名（页面里已经写了）。
