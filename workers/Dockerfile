FROM python:3.13-slim

WORKDIR /app

COPY workers /app/workers

ENV PYTHONPATH=/app

CMD ["python", "-c", "print('Choose a concrete worker entrypoint at deployment time.')"]

