import logging
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from database.session import AsyncSessionLocal
from services.booking_service import get_upcoming_appointments_for_reminders
from services.notification_service import NotificationService
from models.notification import NotificationType

logger = logging.getLogger(__name__)

# AsyncIOScheduler instance
scheduler = AsyncIOScheduler()


async def check_and_send_appointment_reminders():
    """
    Background job: Calls Sayeel's booking service method to fetch 
    upcoming appointments and triggers notifications via NotificationService.
    """
    async with AsyncSessionLocal() as session:
        try:
            # 1. Fetch upcoming appointments using Sayeel's service method
            upcoming_bookings = await get_upcoming_appointments_for_reminders(session)

            if not upcoming_bookings:
                return

            notification_service = NotificationService(session)

            # 2. Loop through bookings and notify both Customer and Provider
            for booking in upcoming_bookings:
                # send reminder to customer
                if booking.customer_id:
                    await notification_service.notify(
                        user_id=booking.customer_id,
                        notification_type=NotificationType.APPOINTMENT_REMINDER,
                        title="Upcoming Appointment Reminder",
                        message=f"Reminder: You have an upcoming appointment on {booking.booking_date} at {booking.start_time}.",
                        entity_type="booking",
                        entity_id=booking.id,
                    )

                # send reminder to provider
                if booking.provider_id:
                    await notification_service.notify(
                        user_id=booking.provider_id,
                        notification_type=NotificationType.APPOINTMENT_REMINDER,
                        title="Upcoming Service Reminder",
                        message=f"Reminder: You have a scheduled service booking on {booking.booking_date} at {booking.start_time}.",
                        entity_type="booking",
                        entity_id=booking.id,
                    )

            logger.info(f"Successfully processed reminders for {len(upcoming_bookings)} bookings.")

        except Exception as e:
            logger.error(f"Error in appointment reminder scheduler: {str(e)}")


def start_scheduler():
    """Starts the background scheduler (runs every 15 minutes)."""
    # will run after every 15 mins 
    scheduler.add_job(
        check_and_send_appointment_reminders,
        "interval",
        minutes=15,
        id="appointment_reminder_job",
        replace_existing=True,
    )
    scheduler.start()


def shutdown_scheduler():
    """Stops the scheduler on application shutdown."""
    if scheduler.running:
        scheduler.shutdown()