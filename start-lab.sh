#!/usr/bin/env bash
# Start JupyterLab using the uv-managed project environment
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
exec uv run --project "$SCRIPT_DIR" jupyter lab --no-browser "$@"
