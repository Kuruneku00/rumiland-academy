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

# ---------- 2. Download Electron binary (before first run) ----------
echo "[4/5] دانلود باینری Electron (فقط بار اول، ~۱۲۰ مگابایت)..."
ELECTRON_MIRROR="${ELECTRON_MIRROR:-}"
if [ -n "$ELECTRON_MIRROR" ]; then
  export ELECTRON_MIRROR
fi

ELECTRON_OK=0
for i in 1 2 3 4 5; do
  if node node_modules/electron/install.js 2>/dev/null; then
    ELECTRON_OK=1
    break
  fi
  echo "   تلاش $i برای دانلود Electron ناموفق بود، دوباره تلاش می‌شود..."
  sleep 3
done

if [ "$ELECTRON_OK" -ne 1 ]; then
  echo "   ⚠️ دانلود خودکار Electron کامل نشد."
  echo "   اگر اینترنتت کند است، با متغیر ELECTRON_MIRROR دوباره امتحان کن:"
  echo "     ELECTRON_MIRROR='https://npmmirror.com/mirrors/electron/' bash install.sh"
  echo "   (این هم اکنون تلاش می‌کند هنگام اجرا دانلود شود)"
fi

echo "[5/5] ساخت برنامه (build)..."
npm run build
node scripts/build-electron.mjs

# ---------- 3. Create launcher ----------
echo "ساخت دستور اجرا..."

LAUNCHER="$HOME/.rumiland-academy-app/launch.sh"
cat > "$LAUNCHER" << 'LAUNCHER_EOF'
#!/usr/bin/env bash
cd "$HOME/.rumiland-academy-app"
exec node_modules/.bin/electron . 2>/dev/null || exec npx electron .
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
echo "   داده‌ها در این مسیر ذخیره می‌شوند (پاک نمی‌شوند):"
echo "       ~/.rumiland-academy/data.json"
echo ""
echo "   پشتیبان‌گیری خودکار در:"
echo "       ~/.rumiland-academy/backups/"
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

# ---------- 4. Run ----------
echo ""
echo "در حال اجرای برنامه..."
"$BIN_DIR/rumiland" || "$LAUNCHER"
