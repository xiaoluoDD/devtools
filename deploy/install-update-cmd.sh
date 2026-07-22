#!/usr/bin/env bash
# 安装一键命令 + 配置 GitHub SSH 直连（无镜像延迟）
# 用法：sudo bash /opt/devtools/deploy/install-update-cmd.sh
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/devtools}"
TARGET="/usr/local/bin/devtools-update"
KEY="/root/.ssh/id_ed25519_devtools"
SSH_URL="git@github.com:xiaoluoDD/devtools.git"

[[ "$(id -u)" -eq 0 ]] || { echo "请使用 sudo 执行"; exit 1; }
[[ -f "$APP_DIR/deploy/deploy.sh" ]] || { echo "找不到 $APP_DIR/deploy/deploy.sh"; exit 1; }

chmod +x "$APP_DIR/deploy/deploy.sh" "$APP_DIR/deploy/install-update-cmd.sh"

# 一键命令
cat > "$TARGET" << EOF
#!/usr/bin/env bash
exec bash "$APP_DIR/deploy/deploy.sh" "\$@"
EOF
chmod +x "$TARGET"
echo "已安装: $TARGET"

# SSH 直连 GitHub（与其它可秒更项目相同思路）
mkdir -p /root/.ssh
chmod 700 /root/.ssh

if [[ ! -f "$KEY" ]]; then
  echo "==> 生成 Deploy Key: $KEY"
  ssh-keygen -t ed25519 -C "devtools-server" -f "$KEY" -N ""
fi

# ssh config：github.com 固定用这把钥匙
if ! grep -q "IdentityFile $KEY" /root/.ssh/config 2>/dev/null; then
  cat >> /root/.ssh/config << EOF

Host github.com
  HostName github.com
  User git
  IdentityFile $KEY
  IdentitiesOnly yes
EOF
  chmod 600 /root/.ssh/config
fi

if [[ -d "$APP_DIR/.git" ]]; then
  git -C "$APP_DIR" remote set-url origin "$SSH_URL" 2>/dev/null \
    || git -C "$APP_DIR" remote add origin "$SSH_URL"
  echo "已设置 origin = $SSH_URL"
fi

echo
echo "=========================================="
echo " 请把下面【公钥】加到 GitHub："
echo "   仓库 → Settings → Deploy keys → Add deploy key"
echo "   标题随意，Allow write access 不用勾选"
echo "------------------------------------------"
cat "${KEY}.pub"
echo "------------------------------------------"
echo "添加后测试："
echo "  ssh -T git@github.com"
echo "  （应提示 Hi xiaoluoDD/devtools! ...）"
echo
echo "以后本机 push 后，服务器立即："
echo "  sudo devtools-update"
echo "=========================================="
