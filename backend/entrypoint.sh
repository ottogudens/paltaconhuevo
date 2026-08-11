#!/bin/bash
echo "Running migrations..."
python manage.py migrate

echo "Creating superuser and sample data..."
python manage.py shell < init_db.py

echo "Collecting static files..."
python manage.py collectstatic --noinput

echo "Starting Gunicorn..."
PORT="${PORT:-8000}"
gunicorn core.wsgi:application --bind 0.0.0.0:$PORT --workers 2
