#!/bin/bash
set -e

echo "=== NECROLINK Production Build ==="

echo "→ Installing backend dependencies..."
cd /home/runner/workspace/backend
pip install -r requirements.txt --quiet

echo "→ Installing frontend dependencies..."
cd /home/runner/workspace/frontend
yarn install --frozen-lockfile --silent 2>/dev/null || yarn install --silent

echo "→ Building React frontend..."
REACT_APP_BACKEND_URL="" yarn build

echo "✅ Build complete!"
