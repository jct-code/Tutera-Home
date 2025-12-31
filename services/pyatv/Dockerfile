# pyatv Apple TV Control Service
# For Synology NAS / Docker deployment
# Using full Python image (includes build tools)

FROM python:3.11

WORKDIR /app

# Upgrade pip first
RUN pip install --upgrade pip

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application
COPY main.py .

# Expose port
EXPOSE 8000

# Run the service
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
