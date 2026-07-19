FROM python:3.13-slim

WORKDIR /app

COPY services/media-ai /app

RUN pip install --no-cache-dir fastapi uvicorn[standard] pydantic pydantic-settings

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8100"]

