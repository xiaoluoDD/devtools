# 个人在线工具集（DevTools）

极简前后端分离 + 纯 API 工具 + 零数据库。前端原生 HTML/JS（零构建），后端 Go + Gin 单二进制。适合腾讯云 2 核 2G，服务器只需 `git` + `nginx`（+ systemd）。

## 功能

| 分类 | 功能 | 实现 |
|------|------|------|
| 代码调试 | JSON 格式化 / 压缩 / 转义 | 纯前端 |
| 代码调试 | 组 JSON 包（键值动态组装） | 纯前端 |
| 编解码 | Base64 编解码 | `POST /api/base64` |
| 编解码 | URL 编解码 | `POST /api/url` |
| 开发常用 | 时间戳 ↔ 标准时间 | 前端 + `GET /api/time` |
| 开发常用 | UUID / 随机密码 | `POST /api/uuid`、`POST /api/password` |
| 开发常用 | 2/8/10/16 进制互转 | 纯前端 |
| 加密哈希 | MD5 / SHA1 / SHA256 | `POST /api/hash` |
| 实用工具 | 文本生成二维码 | `POST /api/qrcode` |

## 目录

```
frontend/     静态站点
backend/      Go API（监听 127.0.0.1:8080）
deploy/       nginx / systemd / 部署脚本
```

## 日常更新流程

与其它项目相同：**本机 push 后服务器立刻一键更新，不必等镜像。**

1. **本机**：`git add` / `commit` / `push` 到 GitHub  
2. **服务器**：`sudo devtools-update`  
3. **浏览器**：Ctrl+F5  

服务器通过 **SSH Deploy Key** 直连 `git@github.com:xiaoluoDD/devtools.git` 执行 `git pull --ff-only`（同 ProjectShow 的 `update-all.sh` 思路）。

首次在服务器执行一次：

```bash
sudo bash /opt/devtools/deploy/install-update-cmd.sh
# 按提示把公钥加到仓库 Deploy keys，再：
ssh -T git@github.com
sudo devtools-update
```

## 本地运行

### 1. 启动后端

```bash
cd backend
# 国内建议
set GOPROXY=https://goproxy.cn,direct   # Windows PowerShell: $env:GOPROXY="https://goproxy.cn,direct"
go mod tidy
go run .
```

默认监听 `127.0.0.1:8080`。可用环境变量改地址：

```bash
# PowerShell
$env:ADDR="0.0.0.0:8080"
go run .
```

### 2. 打开前端

任选其一：

- 用 VS Code / Cursor 的 Live Server 打开 `frontend/index.html`
- 或 Python 静态服务：

```bash
cd frontend
python -m http.server 5500
```

浏览器访问 `http://127.0.0.1:5500`。前端在本地端口下会自动把 API 指到 `http://127.0.0.1:8080`（也可 `?api=http://127.0.0.1:8080` 强制指定）。

### 3. 快速自检

```bash
curl http://127.0.0.1:8080/api/health
curl http://127.0.0.1:8080/api/time
curl -X POST http://127.0.0.1:8080/api/hash -H "Content-Type: application/json" -d "{\"text\":\"hello\",\"algo\":\"md5\"}"
```

## 腾讯云部署（2 核 2G）

假设系统为 Ubuntu / Debian，代码目录 `/opt/devtools`。

### 1. 安装依赖

```bash
sudo apt update
sudo apt install -y git nginx golang-go   # 或只装 git+nginx，本机交叉编译后上传二进制
```

国内 Go 模块代理（写入 `~/.bashrc`）：

```bash
export GOPROXY=https://goproxy.cn,direct
```

### 2. 拉取代码

```bash
sudo mkdir -p /opt/devtools
sudo chown "$USER":"$USER" /opt/devtools
git clone <你的仓库地址> /opt/devtools
```

若暂无 git，可用 `scp` / `rsync` 把本项目同步到 `/opt/devtools`。

### 3. 编译后端

```bash
cd /opt/devtools/backend
CGO_ENABLED=0 go build -ldflags="-s -w" -o tools-server .
sudo chown www-data:www-data tools-server
```

本机交叉编译（Windows → Linux）：

```powershell
$env:CGO_ENABLED="0"; $env:GOOS="linux"; $env:GOARCH="amd64"
go build -ldflags="-s -w" -o tools-server .
# 上传 tools-server 到服务器 /opt/devtools/backend/
```

### 4. systemd

```bash
sudo cp /opt/devtools/deploy/tools.service /etc/systemd/system/tools.service
sudo systemctl daemon-reload
sudo systemctl enable --now tools
sudo systemctl status tools
```

### 5. Nginx

```bash
sudo cp /opt/devtools/deploy/nginx.conf /etc/nginx/sites-available/devtools
# 编辑 server_name 为你的域名或公网 IP
sudo ln -sf /etc/nginx/sites-available/devtools /etc/nginx/sites-enabled/devtools
sudo rm -f /etc/nginx/sites-enabled/default   # 可选
sudo nginx -t && sudo systemctl reload nginx
```

腾讯云安全组放行 **TCP 80**（以及后续 HTTPS 的 443）。

浏览器访问：`http://<公网IP>/`

### 6. 一键更新（推荐）

```bash
sudo bash /opt/devtools/deploy/install-update-cmd.sh   # 仅首次
sudo devtools-update                                    # 日常
```

流程：`git pull --ff-only`（SSH 直连 GitHub）→ 编译 → 重启 `tools` → 同步 nginx → 健康检查。  
**不走 gitclone 镜像，push 后可马上更新。**

### 可选：HTTPS（Let's Encrypt）

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your.domain.com
```

## API 约定

请求：`Content-Type: application/json`

成功：

```json
{ "ok": true, "data": "..." }
```

失败：

```json
{ "ok": false, "error": "原因" }
```

文本输入上限约 **1MB**；单 IP 约 **60 次/分钟** 限流。

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/health` | 健康检查 |
| GET | `/api/time` | 服务器时间 |
| POST | `/api/base64` | `{ "text","action":"encode\|decode" }` |
| POST | `/api/url` | 同上 |
| POST | `/api/hash` | `{ "text","algo":"md5\|sha1\|sha256" }` |
| POST | `/api/uuid` | `{ "count":1 }` |
| POST | `/api/password` | `{ "length":16,"symbols":true,"count":1 }` |
| POST | `/api/qrcode` | `{ "text","size":256 }` → `data_url` |

## 资源占用

无数据库、无队列。Go 二进制通常数十 MB 内存内即可运行；systemd 中已设 `MemoryMax=256M`，在 2G 机器上与 nginx 共存足够。
