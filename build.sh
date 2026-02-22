#!/usr/bin/env bash
# Build and deploy the jupyterlab-spark-webui extension.
#
# Steps:
#   1. Ensure Python venv is up-to-date (uv sync --dev)
#   2. Install / update npm dependencies
#   3. Compile TypeScript  →  lib/
#   4. Bundle federated labextension  →  jupyterlab_spark_webui/labextension/
#   5. Deploy to the venv's labextensions directory

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

SOURCE_DIR="jupyterlab_spark_webui/labextension"
DEST_DIR=".venv/share/jupyter/labextensions/jupyterlab-spark-webui"

# ── 1. Python environment ────────────────────────────────────────────────────
echo "[1/5] Syncing Python environment (uv sync --dev)..."
uv sync --dev --quiet

# ── 2. Node dependencies ─────────────────────────────────────────────────────
echo "[2/5] Installing npm dependencies..."
# Only run install if node_modules is missing or package.json is newer
if [ ! -d node_modules ] || [ package.json -nt node_modules ]; then
  npm install --silent
else
  echo "      node_modules up to date, skipping."
fi

# ── 3. TypeScript → lib/ ─────────────────────────────────────────────────────
echo "[3/5] Compiling TypeScript..."
./node_modules/.bin/tsc --sourceMap

# ── 4. Webpack bundle (federated extension) ──────────────────────────────────
echo "[4/5] Building federated labextension..."
uv run jupyter labextension build .

# ── 5. Deploy to venv ────────────────────────────────────────────────────────
echo "[5/5] Deploying to venv..."
rm -rf "$DEST_DIR"
mkdir -p "$DEST_DIR"
cp -r "$SOURCE_DIR"/. "$DEST_DIR/"

echo ""
echo "Done. Extension deployed to $DEST_DIR"
echo "Start JupyterLab with: ./start-lab.sh"
