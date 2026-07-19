from dataclasses import dataclass
import os


@dataclass(frozen=True)
class WorkerSettings:
    environment: str = os.getenv("WORKER_ENVIRONMENT", "development")
    queue_name: str = os.getenv("AWS_SQS_QUEUE_PREFIX", "fizzion-dev")


settings = WorkerSettings()

