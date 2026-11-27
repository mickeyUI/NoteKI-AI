FROM python:3.12-slim

WORKDIR /app

# Install Python dependencies first to leverage Docker layer caching
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend source code
COPY . .

EXPOSE 8000

CMD ["sh", "-c", "uvicorn Main:app --host 0.0.0.0 --port ${PORT:-8000}"]
