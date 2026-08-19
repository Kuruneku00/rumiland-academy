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

# مقدار پیش‌فرض میرور (اگر اینترنت به سرور اصلی کند بود، از میرور چین استفاده کن)
ELECTRON_MIRROR="${ELECTRON_MIRROR:-https://npmmirror.com/mirrors/electron/}"
export ELECTRON_MIRROR

echo ""
echo "========================================================"
echo "   RUMILAND ACADEMY — نصب‌کننده"
echo "========================================================"
echo ""

# ---------- 1. Prerequisites ----------
command_exists() { command -v "$1" >/dev/null 2>&1; }

if ! command_exists node; then
  echo "[1/6] Node.js نصب نیست. در حال نصب..."
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
  echo "[1/6] Node.js موجود است: $NODE_VER"
fi

if ! command_exists git; then
  echo "نصب git..."
  sudo apt-get install -y git || true
fi

# ---------- 2. Clone ----------
echo "[2/6] بارگیری کد برنامه از GitHub..."
if [ -d "$APP_DIR" ]; then
  cd "$APP_DIR"
  git fetch origin
  git reset --hard "origin/$BRANCH" 2>/dev/null || true
else
  git clone --depth 1 --branch "$BRANCH" "$GIT_REPO" "$APP_DIR"
  cd "$APP_DIR"
fi

# ---------- 3. npm install (با اجرای اسکریپت‌ها) ----------
echo "[3/6] نصب وابستگی‌ها (npm install)..."
# غیرفعال‌کردن بلاک allow-scripts برای اطمینان از اجرای postinstall
export npm_config_allow_scripts=false
# ابتدا اسکریپت‌های allow-scripts را تأیید کن (در صورت وجود این npm جدید)
npm install --no-audit --no-fund --ignore-scripts=false 2>&1 | grep -viE "deprecated|audit" | tail -30 || true

# ---------- 4. Download Electron binary explicitly ----------
echo "[4/6] دانلود باینری Electron (بار اول ~۱۲۰ مگابایت)..."
ELECTRON_DIST="$APP_DIR/node_modules/electron/dist/electron"
if [ -x "$ELECTRON_DIST" ]; then
  echo "   ✅ باینری Electron از قبل موجود است."
else
  # تلاش برای دانلود از طریق install.js خود پکیج electron
  echo "   در حال دانلود باینری Electron از $ELECTRON_MIRROR ..."
  (cd "$APP_DIR/node_modules/electron" && node install.js)
  if [ ! -x "$ELECTRON_DIST" ]; then
    echo "   ⚠️ دانلود از میرور ناموفق بود، تلاش از سرور اصلی GitHub..."
    ELECTRON_MIRROR="https://github.com/electron/electron/releases/download/" \
      node "$APP_DIR/node_modules/electron/install.js" || true
  fi
fi

if [ ! -x "$ELECTRON_DIST" ]; then
  echo "   ❌ باینری Electron دانلود نشد."
  echo "   دلیل معمول: اینترنت به GitHub Releases کند/مسدود است."
  echo "   راه‌حل: بعداً کافی است فقط این خط را اجرا کن:"
  echo "     ELECTRON_MIRROR='https://npmmirror.com/mirrors/electron/' node ~/.rumiland-academy-app/node_modules/electron/install.js"
fi

# ---------- 5. Build renderer + electron ----------
echo "[5/6] ساخت برنامه (build)..."
npm run build
node scripts/build-electron.mjs

# ---------- 6. Launcher ----------
echo "[6/6] ساخت دستور اجرا..."

LAUNCHER="$APP_DIR/launch.sh"
cat > "$LAUNCHER" << 'LAUNCHER_EOF'
#!/usr/bin/env bash
APP_DIR="$HOME/.rumiland-academy-app"
cd "$APP_DIR"
ELECTRON="$APP_DIR/node_modules/electron/dist/electron"
if [ -x "$ELECTRON" ]; then
  exec "$ELECTRON" .
else
  echo "باینری Electron پیدا نشد. در حال دانلود..."
  ELECTRON_MIRROR='https://npmmirror.com/mirrors/electron/' node "$APP_DIR/node_modules/electron/install.js"
  exec "$APP_DIR/node_modules/electron/dist/electron" .
fi
LAUNCHER_EOF
chmod +x "$LAUNCHER"

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
echo "   داده‌ها در: ~/.rumiland-academy/data.json"
echo "   پشتیبان خودکار در: ~/.rumiland-academy/backups/"
echo ""
echo "========================================================"

if ! echo "$PATH" | grep -q "$BIN_DIR"; then
  echo ""
  echo "⚠️  مسیر $BIN_DIR در PATH نیست."
  echo "   این خط را به ~/.bashrc اضافه کنید:"
  echo "     export PATH=\"\$HOME/.local/bin:\$PATH\""
  echo "   یا مستقیم اجرا کنید:"
  echo "     ~/.local/bin/rumiland"
fi

# ---------- 7. Run ----------
echo ""
echo "در حال اجرای برنامه..."
"$BIN_DIR/rumiland" || "$LAUNCHER"
