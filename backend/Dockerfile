# ASSURE-TWIN Backend Production Dockerfile
# Python 3.13 Slim base image
FROM python:3.13-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy and install python dependencies
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend application source
COPY backend/ ./backend/

# Expose FastAPI port
EXPOSE 8000

# Set environment
ENV PYTHONUNBUFFERED=1
ENV PYTHONPATH=/app

# Initialize DB and start Uvicorn with dynamic port support
CMD ["sh", "-c", "python -m backend.app.seed && uvicorn backend.app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
