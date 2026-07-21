#!/usr/bin/env bash
# DevTools 一键更新：git pull → 编译后端 → 重启服务 → 健康检查
#
# 日常用法（安装命令后）：
#   sudo devtools-update
#
# 或直接：
#   sudo bash /opt/devtools/deploy/deploy.sh
#
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/devtools}"
SERVICE_NAME="${SERVICE_NAME:-tools}"
# 国内访问 GitHub 不稳定时走镜像（只影响服务器 pull，不影响你本机 push）
GIT_MIRROR="${GIT_MIRROR:-https://gitclone.com/github.com/xiaoluoDD/devtools.git}"
GIT_BRANCH="${GIT_BRANCH:-main}"

log() { echo -e "\n==> $*"; }
die() { echo "错误: $*" >&2; exit 1; }

[[ "$(id -u)" -eq 0 ]] || die "请使用 root 或 sudo 执行（需要重启 systemd / 写二进制）"

cd "$APP_DIR" || die "目录不存在: $APP_DIR"
[[ -d .git ]] || die "$APP_DIR 不是 git 仓库"

# ---------- 1. 拉取最新代码 ----------
log "配置 git 远程并拉取 ($GIT_BRANCH)"
export GOPROXY="${GOPROXY:-https://goproxy.cn,direct}"

# 确保 origin 指向可用镜像（避免 github.com TLS 失败）
current_url="$(git remote get-url origin 2>/dev/null || true)"
if [[ "$current_url" != "$GIT_MIRROR" ]]; then
  echo "    remote: $current_url"
  echo "    切换为: $GIT_MIRROR"
  git remote set-url origin "$GIT_MIRROR" 2>/dev/null || git remote add origin "$GIT_MIRROR"
fi

git fetch origin "$GIT_BRANCH"
git reset --hard "origin/$GIT_BRANCH"
echo "    当前提交: $(git log -1 --oneline)"

# ---------- 2. 编译后端 ----------
log "编译后端"
cd "$APP_DIR/backend"
CGO_ENABLED=0 go build -ldflags="-s -w" -o tools-server .
chown www-data:www-data tools-server
chmod 755 tools-server
echo "    二进制: $(ls -lh tools-server | awk '{print $5, $9}')"

# ---------- 3. 同步 systemd / nginx（若有变更）----------
log "同步服务配置"
if [[ -f "$APP_DIR/deploy/tools.service" ]]; then
  cp "$APP_DIR/deploy/tools.service" /etc/systemd/system/tools.service
  systemctl daemon-reload
fi

# 从 unit 读取实际监听地址（默认 8080；若你改过端口会自动跟上）
API_ADDR="$(grep -E '^Environment=ADDR=' /etc/systemd/system/tools.service 2>/dev/null | cut -d= -f3 || true)"
API_ADDR="${API_ADDR:-127.0.0.1:8080}"
API_PORT="${API_ADDR##*:}"

if [[ -f "$APP_DIR/deploy/nginx.conf" ]]; then
  # 按实际 API 端口改写代理，再覆盖站点配置
  sed "s/127\.0\.0\.1:8080/${API_ADDR}/g" "$APP_DIR/deploy/nginx.conf" \
    > /etc/nginx/sites-available/devtools
  if nginx -t 2>/dev/null; then
    systemctl reload nginx
    echo "    nginx 已 reload"
  else
    echo "    警告: nginx -t 失败，跳过 reload（请手动检查）"
  fi
fi

# ---------- 4. 重启 API ----------
log "重启 $SERVICE_NAME"
systemctl restart "$SERVICE_NAME"
sleep 1
if ! systemctl is-active --quiet "$SERVICE_NAME"; then
  systemctl --no-pager --full status "$SERVICE_NAME" || true
  die "服务启动失败，请查看: journalctl -u $SERVICE_NAME -n 50"
fi
systemctl --no-pager --full status "$SERVICE_NAME" | head -n 12

# ---------- 5. 健康检查 ----------
log "健康检查"
ok=0
for i in 1 2 3 4 5; do
  if curl -fsS "http://127.0.0.1:${API_PORT}/api/health" >/tmp/devtools-health.json 2>/dev/null; then
    cat /tmp/devtools-health.json
    echo
    ok=1
    break
  fi
  sleep 1
done
[[ "$ok" -eq 1 ]] || die "健康检查失败 (http://127.0.0.1:${API_PORT}/api/health)"

echo
echo "=========================================="
echo " 更新完成"
echo " 提交: $(cd "$APP_DIR" && git log -1 --oneline)"
echo " API : http://127.0.0.1:${API_PORT}"
echo " 站点: 浏览器 Ctrl+F5 强制刷新即可"
echo "=========================================="
