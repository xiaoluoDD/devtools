#!/usr/bin/env bash
# DevTools 一键更新（与 ProjectShow 的 update-all.sh 同思路）
#
# 本机 push 到 GitHub 后，服务器立刻执行：
#   sudo devtools-update
#
# 可选：
#   SKIP_GIT=1     跳过拉取，只编译重启
#   SKIP_NGINX=1   跳过 nginx 同步
#
set -euo pipefail

SCRIPT_PATH="$(readlink -f "${BASH_SOURCE[0]}")"
ROOT="$(cd "$(dirname "$SCRIPT_PATH")/.." && pwd)"
APP_DIR="${APP_DIR:-$ROOT}"
SERVICE_NAME="${SERVICE_NAME:-tools}"
GIT_BRANCH="${GIT_BRANCH:-main}"
# 直连 GitHub（SSH，无镜像延迟）。首次需配好 Deploy Key / 本机 SSH key
GIT_SSH_URL="${GIT_SSH_URL:-git@github.com:xiaoluoDD/devtools.git}"

log() { echo -e "\n==> $*"; }
die() { echo "错误: $*" >&2; exit 1; }
info() { echo "    $*"; }

[[ "$(id -u)" -eq 0 ]] || die "请使用 sudo / root 执行"
cd "$APP_DIR" || die "目录不存在: $APP_DIR"
export GOPROXY="${GOPROXY:-https://goproxy.cn,direct}"

echo "=========================================="
echo " DevTools 一键更新"
echo "=========================================="
echo "目录: $APP_DIR"
echo ""

# ---------- 1. git pull（直连 GitHub，与其它项目一致）----------
if [[ "${SKIP_GIT:-0}" != "1" ]]; then
  log "[1/3] 拉取代码"
  [[ -d .git ]] || die "$APP_DIR 不是 git 仓库"

  # 统一成 SSH 地址，避免再走会滞后的 https 镜像
  current="$(git remote get-url origin 2>/dev/null || true)"
  if [[ "$current" != "$GIT_SSH_URL" ]]; then
    info "remote: ${current:-"(无)"}"
    info "切换为: $GIT_SSH_URL"
    git remote set-url origin "$GIT_SSH_URL" 2>/dev/null || git remote add origin "$GIT_SSH_URL"
  fi

  info "更新前: $(git log -1 --oneline)"
  if [[ -f /root/.ssh/id_ed25519_devtools ]]; then
    export GIT_SSH_COMMAND="ssh -i /root/.ssh/id_ed25519_devtools -o IdentitiesOnly=yes -o StrictHostKeyChecking=accept-new"
  fi

  # 部署机只认 GitHub：先 fetch，再强制对齐（不要先 reset HEAD / clean，否则会把未提交的新文件清掉却停在旧提交）
  git fetch origin "$GIT_BRANCH"
  git reset --hard "origin/${GIT_BRANCH}"
  git clean -fd
  info "更新后: $(git log -1 --oneline)"

  # 更新失败自检：关键文件必须存在
  if [[ ! -f "$APP_DIR/frontend/js/json-builder.js" ]] || ! grep -q "jsonBuild" "$APP_DIR/frontend/index.html"; then
    die "代码已拉取但仍缺「组 JSON 包」文件，请检查 GitHub main 是否包含该功能后重试"
  fi
  if ! grep -q "bootApp" "$APP_DIR/frontend/js/app.js"; then
    die "app.js 缺少 bootApp，前端会空白。请确认已 push 完整代码"
  fi
else
  log "[1/3] 跳过 git 拉取 (SKIP_GIT=1)"
fi

# ---------- 2. 编译并重启后端 ----------
log "[2/3] 编译后端并重启 $SERVICE_NAME"
cd "$APP_DIR/backend"
CGO_ENABLED=0 go build -ldflags="-s -w" -o tools-server .
chown www-data:www-data tools-server
chmod 755 tools-server

if [[ -f "$APP_DIR/deploy/tools.service" ]]; then
  cp "$APP_DIR/deploy/tools.service" /etc/systemd/system/tools.service
  systemctl daemon-reload
fi

systemctl restart "$SERVICE_NAME"
sleep 1
systemctl --no-pager --full status "$SERVICE_NAME" | head -n 15 || true
systemctl is-active --quiet "$SERVICE_NAME" || die "服务未就绪: journalctl -u $SERVICE_NAME -n 40"

# ---------- 3. Nginx ----------
if [[ "${SKIP_NGINX:-0}" != "1" ]]; then
  log "[3/3] 同步 Nginx 并 reload"
  API_ADDR="$(grep -E '^Environment=ADDR=' /etc/systemd/system/tools.service 2>/dev/null | cut -d= -f3 || true)"
  API_ADDR="${API_ADDR:-127.0.0.1:8080}"

  if [[ -f "$APP_DIR/deploy/nginx.conf" ]]; then
    old_name="$(grep -E '^\s*server_name\s+' /etc/nginx/sites-available/devtools 2>/dev/null | head -n1 | awk '{print $2}' | tr -d ';' || true)"
    sed "s/127\.0\.0\.1:8080/${API_ADDR}/g" "$APP_DIR/deploy/nginx.conf" \
      > /etc/nginx/sites-available/devtools
    if [[ -n "${old_name:-}" && "$old_name" != "_" ]]; then
      sed -i "s/server_name .*/server_name ${old_name};/" /etc/nginx/sites-available/devtools
    fi
    ln -sfn /etc/nginx/sites-available/devtools /etc/nginx/sites-enabled/devtools
    nginx -t
    systemctl reload nginx
    info "Nginx 已更新"
  else
    info "未找到 deploy/nginx.conf，跳过"
  fi
else
  log "[3/3] 跳过 Nginx (SKIP_NGINX=1)"
fi

# 保证一键命令指向最新脚本
if [[ -f "$APP_DIR/deploy/install-update-cmd.sh" ]]; then
  bash "$APP_DIR/deploy/install-update-cmd.sh" >/dev/null
fi

# ---------- 自检 ----------
log "自检"
API_ADDR="$(grep -E '^Environment=ADDR=' /etc/systemd/system/tools.service 2>/dev/null | cut -d= -f3 || true)"
API_ADDR="${API_ADDR:-127.0.0.1:8080}"
API_PORT="${API_ADDR##*:}"

curl -fsS "http://127.0.0.1:${API_PORT}/api/health" && echo
curl -s -o /dev/null -w "nginx /              %{http_code}\n" http://127.0.0.1/ || true
curl -s -o /dev/null -w "nginx /api/health    %{http_code}\n" http://127.0.0.1/api/health || true
[[ -f "$APP_DIR/frontend/js/app.js" ]] || die "缺少 frontend/js/app.js"
grep -q "bootApp" "$APP_DIR/frontend/js/app.js" || info "警告: app.js 中未找到 bootApp"

echo
echo "=========================================="
echo " 完成: $(cd "$APP_DIR" && git log -1 --oneline)"
echo " 站点: http://<公网IP>/  （浏览器 Ctrl+F5）"
echo "=========================================="
