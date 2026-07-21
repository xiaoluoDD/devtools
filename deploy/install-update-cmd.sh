#!/usr/bin/env bash
# 安装一键更新命令：sudo devtools-update
# 用法：sudo bash /opt/devtools/deploy/install-update-cmd.sh
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/devtools}"
TARGET="/usr/local/bin/devtools-update"

[[ "$(id -u)" -eq 0 ]] || { echo "请使用 sudo 执行"; exit 1; }
[[ -f "$APP_DIR/deploy/deploy.sh" ]] || { echo "找不到 $APP_DIR/deploy/deploy.sh"; exit 1; }

chmod +x "$APP_DIR/deploy/deploy.sh"

cat > "$TARGET" << EOF
#!/usr/bin/env bash
exec bash "$APP_DIR/deploy/deploy.sh" "\$@"
EOF
chmod +x "$TARGET"

echo "已安装: $TARGET"
echo
echo "以后本机 git push 后，在服务器执行："
echo "  sudo devtools-update"
