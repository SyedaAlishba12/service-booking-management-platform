"""APScheduler jobs for appointment reminders and payment-hold expiry."""

import logging
from datetime import datetime, timezone
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from sqlalchemy import select

from database.session import AsyncSessionLocal
from models.notification import Notification, NotificationType
from services.booking_service import (
    expire_payment_holds,
    get_upcoming_appointments_for_reminders,
)
from services.notification_service import NotificationService

logger = logging.getLogger(__name__)
scheduler = AsyncIOScheduler(timezone="UTC")


def _reminder_message(appointment: dict) -> str:
    start_at = appointment["start_at"]
    timezone_name = appointment.get("provider_timezone") or "UTC"
    try:
        local_start = start_at.astimezone(ZoneInfo(timezone_name))
    except (ZoneInfoNotFoundError, TypeError, ValueError):
        local_start = start_at.astimezone(timezone.utc)
    label = local_start.strftime("%A, %B %d at %I:%M %p %Z")
    return f"Your appointment is scheduled for {label}."


async def check_and_send_appointment_reminders() -> int:
    """Send each reminder once for each recipient and scheduled time."""
    async with AsyncSessionLocal() as session:
        appointments = await get_upcoming_appointments_for_reminders(session)
        notification_service = NotificationService(session)
        sent = 0

        for appointment in appointments:
            booking_id = appointment["booking_id"]
            message = _reminder_message(appointment)
            recipients = {
                appointment.get("customer_user_id"),
                appointment.get("provider_user_id"),
            } - {None}

            for user_id in recipients:
                existing = await session.scalar(
                    select(Notification.id)
                    .where(
                        Notification.user_id == user_id,
                        Notification.notification_type
                        == NotificationType.APPOINTMENT_REMINDER,
                        Notification.entity_type == "booking",
                        Notification.entity_id == booking_id,
                        Notification.message == message,
                    )
                    .limit(1)
                )
                if existing is None:
                    await notification_service.notify(
                        user_id=user_id,
                        notification_type=NotificationType.APPOINTMENT_REMINDER,
                        title="Appointment reminder",
                        message=message,
                        entity_type="booking",
                        entity_id=booking_id,
                    )
                    sent += 1

        if sent:
            logger.info("Sent %s appointment reminder notifications", sent)
        return sent


async def expire_unpaid_booking_holds() -> int:
    """Expire unpaid holds so their provider time slots become available."""
    async with AsyncSessionLocal() as session:
        expired = await expire_payment_holds(session, datetime.now(timezone.utc))
        if expired:
            logger.info("Expired %s unpaid booking holds", expired)
        return expired


def start_scheduler() -> None:
    if scheduler.running:
        return
    scheduler.add_job(
        check_and_send_appointment_reminders,
        "interval",
        minutes=15,
        id="appointment_reminder_job",
        replace_existing=True,
        max_instances=1,
        coalesce=True,
    )
    scheduler.add_job(
        expire_unpaid_booking_holds,
        "interval",
        minutes=1,
        id="booking_hold_expiry_job",
        replace_existing=True,
        max_instances=1,
        coalesce=True,
    )
    scheduler.start()


def shutdown_scheduler() -> None:
    if scheduler.running:
        scheduler.shutdown(wait=False)
