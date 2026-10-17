"""Expiry-only polling worker. Appointment reminders are owned by Zainab's APScheduler."""
import asyncio
import logging
import os

from database.connection import engine
from database.session import AsyncSessionLocal
from services.booking_service import expire_payment_holds

logger = logging.getLogger(__name__)


def _positive_int(name: str, default: int) -> int:
    raw = os.getenv(name, str(default))
    try:
        value = int(raw)
    except ValueError as exc:
        raise ValueError(f"{name} must be a positive integer") from exc
    if value <= 0:
        raise ValueError(f"{name} must be a positive integer")
    return value


async def run_scheduler() -> None:
    interval_seconds = _positive_int("BOOKING_SCHEDULER_INTERVAL_SECONDS", 60)
    logger.info("Booking hold-expiry worker started; poll interval=%ss", interval_seconds)
    try:
        while True:
            try:
                async with AsyncSessionLocal() as session:
                    expired = await expire_payment_holds(session)
                if expired:
                    logger.info("Expired %s payment holds", expired)
            except Exception:
                logger.exception("Booking hold-expiry tick failed")
            await asyncio.sleep(interval_seconds)
    finally:
        await engine.dispose()


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    try:
        asyncio.run(run_scheduler())
    except KeyboardInterrupt:
        logger.info("Booking hold-expiry worker stopped")
