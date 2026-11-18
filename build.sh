#!/usr/bin/env bash
set -o errexit

pip install --upgrade pip
pip install -r backend/requirements.txt

# Build the React app if Node is available; otherwise use the committed frontend/dist
if command -v npm >/dev/null 2>&1; then
  (cd frontend && npm ci && npm run build) || echo "Frontend build skipped - using committed frontend/dist"
fi

cd backend
python manage.py collectstatic --noinput
python manage.py migrate --noinput
python manage.py ensure_admin
