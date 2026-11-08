FROM python:3.12-slim
WORKDIR /app
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
COPY ml/service/requirements.txt /tmp/requirements.txt
RUN pip install --no-cache-dir torch==2.11.0 torchvision==0.26.0 --index-url https://download.pytorch.org/whl/cpu \
    && pip install --no-cache-dir -r /tmp/requirements.txt \
    && useradd --uid 10001 --create-home inference
COPY ml/service /app/ml/service
COPY ml/src/evaluation.py /app/ml/src/evaluation.py
COPY ml/models/resnet18_coffee_base.pth /app/ml/models/resnet18_coffee_base.pth
USER inference
EXPOSE 8000
CMD ["python", "-m", "uvicorn", "ml.service.app:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1", "--limit-concurrency", "16", "--no-access-log"]
