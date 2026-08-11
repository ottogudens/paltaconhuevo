#!/bin/bash
set -e

echo "Running migrations..."
python manage.py makemigrations users products orders finance marketing recipes loyalty
python manage.py migrate

echo "Creating superuser and sample data..."
python manage.py shell < init_db.py || echo "Warning: init_db.py had errors, continuing..."

echo "Collecting static files..."
python manage.py collectstatic --noinput

PORT="${PORT:-8000}"
echo "Starting Gunicorn on port $PORT..."
exec gunicorn core.wsgi:application \
    --bind 0.0.0.0:$PORT \
    --workers 2 \
    --timeout 120 \
    --access-logfile - \
    --error-logfile - \
    --log-level info

