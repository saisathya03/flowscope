#!/usr/bin/env bash
set -e
echo "FlowScope AI is starting at http://localhost:8000"
echo "Press Ctrl+C to stop the server."
python3 -m http.server 8000
