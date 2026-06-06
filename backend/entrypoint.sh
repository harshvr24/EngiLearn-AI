#!/usr/bin/env bash
set -euo pipefail

# Apply database migrations, then start the API server.
echo "Running database migrations..."
alembic upgrade head

echo "Starting Gunicorn..."
exec gunicorn app.main:app \
    --worker-class uvicorn.workers.UvicornWorker \
    --workers "${WEB_CONCURRENCY:-2}" \
    --bind 0.0.0.0:8000 \
    --timeout 120 \
    --access-logfile - \
    --error-logfile -
