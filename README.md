# 瞬刻门户（GitHub 版）

工作室门户：**文章 / 视频点播 / 音乐** 三板块，积木式装修，手机竖屏 + 平板横屏双档适配。
纯静态站点，**不需要买服务器**：内容存在这个仓库里，后台直接改仓库文件。

- 前台：`docs/index.html`
- 后台：`docs/admin.html`（需先填入仓库信息和 Token）
- 数据：`docs/data/db.json`（所有页面、视频、文章、音乐、通知都在这里）
- 签名服务：`worker/polyv.js`（只有「跳保利威带昵称」这一个功能需要它）

---

## 一、开启网站（3 分钟）

1. 进入仓库 → **Settings** → 左侧 **Pages**
2. Source 选 **Deploy from a branch**
3. Branch 选 **main**，目录选 **/docs**，点 **Save**
4. 等 1–2 分钟，访问：`https://339965523.github.io/shunke-portal/`

后台地址就是同一域名下的 `/admin.html`。

---

## 二、把后台连上仓库（2 分钟）

后台不写服务器，它直接通过 GitHub API 改 `docs/data/db.json`，所以需要一个访问令牌。

1. GitHub 右上角头像 → **Settings** → **Developer settings** → **Personal access tokens** → **Fine-grained tokens** → **Generate new token**
2. Repository access 选 **Only select repositories** → 选中本仓库
3. Permissions → Repository permissions → **Contents: Read and write**
4. 生成后复制令牌（`github_pat_...`）
5. 打开 `.../admin.html`，填：用户名、仓库名、分支 `main`、令牌 → 连接

连接成功后：左边选页面 → 中间改积木 → 右边调属性 → 右上角 **保存到 GitHub**。
保存是一次 commit，**前台刷新即可看到**，一般 10–60 秒生效（Pages 有缓存）。

> 令牌只存在你自己浏览器的 localStorage，不会进仓库。换电脑要重新填一次。

---

## 三、部署签名服务（只有「跳保利威带昵称」需要）

保利威要求链接里带 `sign = md5(密钥 + userid + 密钥 + ts)`，密钥不能放网页里，所以要一个小服务。

1. 打开 <https://dash.cloudflare.com>，免费注册
2. 左侧 **Workers & Pages** → **Create** → **Worker** → 随便起个名，如 `shunke-polyv`
3. 点 **Edit code**，把 `worker/polyv.js` 的内容整段粘进去 → **Deploy**
4. 进入这个 Worker → **Settings** → **Variables and Secrets**，加四个变量：

| 变量名 | 填什么 |
| --- | --- |
| `POLYV_SECRET` | 保利威后台「独立授权」里的 secretkey |
| `POLYV_CHANNEL_ID` | 频道号（观看链接里 `/watch/` 后面那串数字） |
| `POLYV_DOMAIN` | `live.polyv.cn`（有定制域名就填自己的） |
| `ALLOW_ORIGIN` | `https://339965523.github.io` |

5. 复制 Worker 的地址（形如 `https://shunke-polyv.xxx.workers.dev`）
6. 回到装修后台 → **仓库设置** → 填进「Worker 地址」→ 保存到 GitHub

**验证方法**：浏览器直接打开
`https://你的worker地址/polyv?userid=test_user&nickname=瞬刻测试`
返回一段 JSON，里面 `url` 点开能进直播间、聊天区显示「瞬刻测试」，就说明对了。

---

## 四、接甲方直播间：配置对照表

| 你要拿到的值 | 从哪拿 | 填到哪 | 备注 |
| --- | --- | --- | --- |
| **secretkey** | 保利威后台 → 我的直播 → 频道设置 → 观看条件设置 → 选「独立授权」 | Worker 环境变量 `POLYV_SECRET` | 绝对不能出现在网页/仓库里 |
| **频道号** | 观看链接 `https://live.polyv.cn/watch/**1965681**` 里的数字 | Worker 环境变量 `POLYV_CHANNEL_ID` | 一个甲方一个频道号 |
| **观看页域名** | 保利威给的后台地址前缀 | Worker 环境变量 `POLYV_DOMAIN` | 没有定制域名就填 `live.polyv.cn` |
| **观众昵称** | 用户在「我的」页面自己填 | 自动传给 Worker | 前端只传明文，签名由 Worker 算 |
| **观众 ID** | 首次打开自动生成并存在本地 | 自动传给 Worker | 只能用字母数字下划线，最长 64 |
| **回放视频 ID**（可选） | 保利威「查询视频库列表」返回的 videoId | 视频管理里「地址」或链接 `vid` 参数 | 只想看某条回放时才需要 |

### 需要告诉甲方的两件事

1. **把观看条件设成「独立授权」**，并把 secretkey 单独给你（不是账号密码）。
2. **同一个 userid 不能两处同时登录**——后进的会把先进的踢掉。所以每个人的 userid 必须唯一（本方案已自动生成）。

### 签名规则（自查用）

```
sign     = md5(secretkey + userid + secretkey + ts)
ts       = 13 位毫秒时间戳，3 分钟内有效
nickname = 标准 base64 → "+" "/" 换成 "-" "_" → 去掉尾部 "="
```

三个常见坑：
- **链接只能用一次**，刷新就失效 —— 所以每次点都重新请求 Worker，不能收藏。
- **中文昵称不做 base64 会乱码**，Worker 已处理。
- **userid 带中文或空格会验证失败**，本方案用 `sk_xxxxxxxx` 格式，安全。

---

## 五、功能对照

| 功能 | GitHub 版（网页） | APK 版 |
| --- | --- | --- |
| 积木装修 + 手机/平板双档 | 支持 | 支持 |
| 文章（微信编辑器排版还原） | 支持 | 支持 |
| 视频点播 | 支持（m3u8 靠 hls.js，iOS 原生支持） | 支持（原生播放器更稳） |
| 音乐 | 支持 | 支持 |
| 字体/字号/字重/颜色/背景可调 | 支持 | 支持 |
| 跳保利威带昵称 | 支持（需 Worker） | 支持（需后端） |
| 通知 | 只能站内（打开页面才弹） | 系统通知栏 |
| 分享给客户 | 发一条链接 | 发 APK 安装 |
| 成本 | 0 元 | 0 元（除打包） |

**为什么网页版没有系统通知**：浏览器推送需要 Service Worker + 推送服务商 + 备案域名，做不到零成本。要「关着也能收到」，用 APK 版。

---

## 六、已知限制（老实话）

- **国内访问 `github.io` 有时慢或被拦**。给客户长期用，建议把仓库同步一份到腾讯云 COS 静态网站托管，或直接用 APK 版。
- **保存后不是立刻生效**，Pages 有 CDN 缓存，通常 10–60 秒。
- **后台是公开页面**，谁打开都要填 Token 才能编辑；没有 Token 只能看登录框。
- **仓库是 public**：`db.json` 里的内容（视频标题、文章正文）是公开的。别把客户隐私、合同、密钥写进去。

---

## 七、目录

```
docs/
  index.html      前台门户（纯静态，无依赖）
  admin.html      装修后台（GitHub API 读写）
  data/db.json    全部内容
worker/
  polyv.js        保利威签名 Worker
```
