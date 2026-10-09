import asyncio
import smtplib
from email.message import EmailMessage

from common.config import settings


def _send_email(
    recipient: str,
    subject: str,
    body: str,
) -> None:
    message = EmailMessage()

    message["Subject"] = subject
    message["From"] = (
        f"{settings.smtp_from_name} "
        f"<{settings.smtp_from_email}>"
    )
    message["To"] = recipient

    message.set_content(body)

    with smtplib.SMTP(
        settings.smtp_host,
        settings.smtp_port,
        timeout=20,
    ) as smtp:
        smtp.starttls()

        smtp.login(
            settings.smtp_username,
            settings.smtp_password,
        )

        smtp.send_message(message)


async def send_password_reset_email(
    recipient: str,
    token: str,
) -> None:
    reset_link = (
        f"{settings.frontend_url}"
        f"/reset-password?token={token}"
    )

    subject = "Reset your ServiceHub password"

    body = f"""Hello,

We received a request to reset your ServiceHub password.

Use the following link to create a new password:

{reset_link}

This link will expire in 30 minutes.

If you did not request a password reset, you can safely ignore this email.

Regards,
ServiceHub Team
"""

    await asyncio.to_thread(
        _send_email,
        recipient,
        subject,
        body,
    )