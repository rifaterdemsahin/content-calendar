# Scheduled stats job. Build context is the repo root (see jobs/stats/README in the setup page).
FROM python:3.12-slim
ENV PYTHONUNBUFFERED=1
WORKDIR /job
RUN pip install --no-cache-dir azure-storage-blob==12.24.0
COPY scripts/ scripts/
COPY data/ data/
CMD ["python3", "scripts/cron_stats.py"]
