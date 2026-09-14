import asyncio
import logging
from typing import Callable, Any

logger = logging.getLogger("queue_service")


async def enqueue_background_job(job_func: Callable[..., Any], *args, **kwargs) -> None:
    """Dispatch an async task to execute non-blockingly in the background task queue."""
    try:
        asyncio.create_task(job_func(*args, **kwargs))
        logger.info(f"Enqueued background job: {job_func.__name__}")
    except Exception as e:
        logger.error(f"Failed to enqueue job {job_func.__name__}: {e}")
