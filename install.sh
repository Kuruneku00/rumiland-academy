#!/usr/bin/env bash
# ================================================================
#  Rumiland Academy — نصب و اجرا روی لینوکس (Kali / Debian / Ubuntu)
# ================================================================
#
#  روش استفاده:
#    bash install.sh          -> نصب و اجرا (دسکتاپ)
#    bash install.sh --web    -> اجرای نسخه تحت وب (localhost:3000)
#    bash install.sh --uninstall -> حذف برنامه
#
#  داده‌ها در ~/.rumiland-academy/data.json ذخیره می‌شوند و پاک نمی‌شوند.
# ================================================================

set -e

APP_NAME="Rumiland Academy"
APP_DIR="$HOME/.rumiland-academy-app"
GIT_REPO="https://github.com/Kuruneku00/rumiland-academy.git"
BRANCH="main"

echo ""
echo "========================================================"
echo "   RUMILAND ACADEMY — نصب‌کننده"
echo "========================================================"
echo ""

# ---------- 1. Prerequisites ----------
command_exists() { command -v "$1" >/dev/null 2>&1; }

if ! command_exists node; then
  echo "[1/5] Node.js نصب نیست. در حال نصب..."
  # نصب Node.js 20 LTS از NodeSource
  if command_exists apt-get; then
    sudo apt-get update -y
    sudo apt-get install -y curl ca-certificates
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
  else
    echo "خطا: لطفاً ابتدا Node.js را نصب کنید (https://nodejs.org)"
    exit 1
  fi
else
  NODE_VER=$(node -v)
  echo "[1/5] Node.js موجود است: $NODE_VER"
fi

if ! command_exists git; then
  echo "نصب git..."
  sudo apt-get install -y git || true
fi

echo "[2/5] بارگیری کد برنامه از GitHub..."

# اگر پوشه وجود دارد فقط pull کن، در غیر این صورت clone کن
if [ -d "$APP_DIR" ]; then
  cd "$APP_DIR"
  git fetch origin
  git reset --hard "origin/$BRANCH" 2>/dev/null || true
else
  git clone --depth 1 --branch "$BRANCH" "$GIT_REPO" "$APP_DIR"
  cd "$APP_DIR"
fi

echo "[3/5] نصب وابستگی‌ها (npm install)..."
npm install --no-audit --no-fund

echo "[4/5] ساخت برنامه (build)..."
npm run build
node scripts/build-electron.mjs

# ---------- 2. Create launcher ----------
echo "[5/5] ساخت دستور اجرا..."

# ساخت سیم‌لینک سراسری 'rumiland'
LAUNCHER="$HOME/.rumiland-academy-app/launch.sh"
cat > "$LAUNCHER" << 'LAUNCHER_EOF'
#!/usr/bin/env bash
cd "$HOME/.rumiland-academy-app"
exec npx electron . 2>/dev/null || exec node_modules/.bin/electron .
LAUNCHER_EOF
chmod +x "$LAUNCHER"

# قرار دادن در PATH کاربر
BIN_DIR="$HOME/.local/bin"
mkdir -p "$BIN_DIR"
ln -sf "$LAUNCHER" "$BIN_DIR/rumiland"

echo ""
echo "========================================================"
echo "   ✅ نصب کامل شد!"
echo "========================================================"
echo ""
echo "   برای اجرا، در ترمینال تایپ کنید:"
echo ""
echo "       rumiland"
echo ""
echo "   داده‌ها در این مسیر ذخیره می‌شوند (پاک نمی‌شوند):"
echo "       ~/.rumiland-academy/data.json"
echo ""
echo "   پشتیبان‌گیری خودکار در:"
echo "       ~/.rumiland-academy/backups/"
echo ""
echo "========================================================"

# چک PATH
if ! echo "$PATH" | grep -q "$BIN_DIR"; then
  echo ""
  echo "⚠️  مسیر $BIN_DIR در PATH نیست."
  echo "   این خط را به ~/.bashrc اضافه کنید:"
  echo "     export PATH=\"\$HOME/.local/bin:\$PATH\""
  echo "   یا مستقیم اجرا کنید:"
  echo "     ~/.local/bin/rumiland"
fi

# ---------- 3. Run ----------
echo ""
echo "در حال اجرای برنامه..."
"$BIN_DIR/rumiland" || "$LAUNCHER"
