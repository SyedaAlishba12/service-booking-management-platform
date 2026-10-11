"""Single-process scheduler for booking hold expiry and appointment reminders.

Run with: python -m services.booking_scheduler
Keep one scheduler process per database to avoid duplicate work across app workers.
"""
import asyncio
import logging
import os
from datetime import datetime, timedelta, timezone

from database.connection import engine
from database.session import AsyncSessionLocal
from services.booking_service import expire_payment_holds, send_appointment_reminders

logger = logging.getLogger(__name__)
UTC = timezone.utc


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
    reminder_lead_hours = _positive_int("BOOKING_REMINDER_LEAD_HOURS", 24)
    reminder_window = timedelta(minutes=5)
    logger.info("Booking scheduler started; poll interval=%ss", interval_seconds)
    try:
        while True:
            now = datetime.now(UTC)
            try:
                async with AsyncSessionLocal() as session:
                    expired = await expire_payment_holds(session, now)
                    reminder_center = now + timedelta(hours=reminder_lead_hours)
                    reminders = await send_appointment_reminders(
                        session,
                        reminder_center - reminder_window,
                        reminder_center + reminder_window,
                    )
                if expired or reminders:
                    logger.info("Expired %s holds and created %s reminders", expired, reminders)
            except Exception:
                logger.exception("Booking scheduler tick failed")
            await asyncio.sleep(interval_seconds)
    finally:
        await engine.dispose()


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    try:
        asyncio.run(run_scheduler())
    except KeyboardInterrupt:
        logger.info("Booking scheduler stopped")
