#!/bin/bash
set -e

echo "=== NECROLINK Production Start ==="
cd /home/runner/workspace/backend
exec python3 -m uvicorn server:app --host 0.0.0.0 --port 5000 --workers 1 --log-level info
