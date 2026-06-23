#!/bin/bash

# Start backend in background
cd /home/runner/workspace/backend && uvicorn server:app --host localhost --port 8000 &
BACKEND_PID=$!

# Start frontend on port 5000
cd /home/runner/workspace/frontend && PORT=5000 BROWSER=none yarn start &
FRONTEND_PID=$!

# Wait for either process to exit
wait -n $BACKEND_PID $FRONTEND_PID
