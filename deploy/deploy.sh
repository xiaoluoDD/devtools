#!/usr/bin/env bash
# 一键部署：git pull → go build → restart systemd
# 用法：sudo bash /opt/devtools/deploy/deploy.sh
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/devtools}"
SERVICE_NAME="${SERVICE_NAME:-tools}"

cd "$APP_DIR"

echo "==> git pull"
if [ -d .git ]; then
  git pull --ff-only
else
  echo "警告: $APP_DIR 不是 git 仓库，跳过 pull"
fi

echo "==> build backend"
cd "$APP_DIR/backend"
export GOPROXY="${GOPROXY:-https://goproxy.cn,direct}"
CGO_ENABLED=0 go build -ldflags="-s -w" -o tools-server .

# 若以 www-data 运行，确保可执行
chown www-data:www-data tools-server 2>/dev/null || true
chmod +x tools-server

echo "==> restart $SERVICE_NAME"
systemctl restart "$SERVICE_NAME"
systemctl --no-pager --full status "$SERVICE_NAME" | head -n 20

echo "==> health check"
sleep 1
curl -fsS "http://127.0.0.1:8080/api/health" && echo
echo "部署完成"
