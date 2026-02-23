#!/usr/bin/env bash
# Build and deploy the jupyterlab-spark-webui extension.
#
# Steps:
#   1. Ensure Python venv is up-to-date (uv sync --dev)
#   2. Install / update npm dependencies
#   3. Compile TypeScript  →  lib/
#   4. Bundle federated labextension  →  jupyterlab_spark_webui/labextension/
#   5. Deploy to the venv's labextensions directory (for local testing)
#   6. Build pip-installable wheel  →  dist/
#
# Usage:
#   ./build.sh          # full build + local deploy + wheel
#   ./build.sh --no-wheel   # skip wheel (faster, for dev iteration)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

SOURCE_DIR="jupyterlab_spark_webui/labextension"
DEST_DIR=".venv/share/jupyter/labextensions/jupyterlab-spark-webui"
BUILD_WHEEL=true

for arg in "$@"; do
  [[ "$arg" == "--no-wheel" ]] && BUILD_WHEEL=false
done

# ── 1. Python environment ────────────────────────────────────────────────────
echo "[1/6] Syncing Python environment (uv sync --dev)..."
uv sync --dev --quiet

# ── 2. Node dependencies ─────────────────────────────────────────────────────
echo "[2/6] Installing npm dependencies..."
if [ ! -d node_modules ] || [ package.json -nt node_modules ]; then
  npm install --silent
else
  echo "      node_modules up to date, skipping."
fi

# ── 3. TypeScript → lib/ ─────────────────────────────────────────────────────
echo "[3/6] Compiling TypeScript..."
./node_modules/.bin/tsc --sourceMap

# ── 4. Webpack bundle (federated extension) ──────────────────────────────────
echo "[4/6] Building federated labextension..."
uv run jupyter labextension build .

# ── 5. Deploy to venv (local testing) ────────────────────────────────────────
echo "[5/6] Deploying to venv..."
rm -rf "$DEST_DIR"
mkdir -p "$DEST_DIR"
cp -r "$SOURCE_DIR"/. "$DEST_DIR/"

# ── 6. Build pip wheel ────────────────────────────────────────────────────────
if $BUILD_WHEEL; then
  echo "[6/6] Building pip wheel..."
  rm -rf dist/
  uv build --wheel --quiet
  echo "      $(ls dist/*.whl)"
else
  echo "[6/6] Skipping wheel build (--no-wheel)."
fi

echo ""
echo "Done."
echo "  Local test : ./start-lab.sh"
$BUILD_WHEEL && echo "  pip install: pip install dist/$(ls dist/*.whl | xargs basename)" || true
