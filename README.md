# Vercel 部署指南

## 项目结构

```
wechat-vercel/
├── vercel.json    # Vercel配置
└── api/
    └── index.js   # 主代码
```

## 部署步骤

### 方法一：通过GitHub部署（推荐）

1. 创建GitHub仓库
2. 上传这两个文件
3. 访问 https://vercel.com
4. 用GitHub登录
5. 点击 "New Project" → 导入你的仓库
6. 点击 "Deploy"

### 方法二：通过Vercel CLI部署

```bash
# 1. 安装Vercel CLI
npm i -g vercel

# 2. 进入项目目录
cd wechat-vercel

# 3. 登录
vercel login

# 4. 部署
vercel

# 5. 生产环境部署
vercel --prod
```

---

## 部署后

1. Vercel会生成一个域名，格式如：
   ```
   xxx.vercel.app
   ```

2. 把这个域名填到企业微信：
   - URL: `https://xxx.vercel.app`

---

## 修改配置

如需修改配置，编辑 `api/index.js` 开头的配置区域：

```javascript
const CORP_ID = 'wwf13f93d7d6f34e4e';      // 企业ID
const APP_SECRET = 'xxx';                  // Secret
const APP_AGENTID = '1000004';             // AgentId
const TOKEN = 'WexinToken2024';            // Token
const ENCODING_AESKEY = 'xxx';             // EncodingAESKey
```
