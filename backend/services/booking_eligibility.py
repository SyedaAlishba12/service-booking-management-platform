"""
Booking eligibility seam.

This module is the ONLY place in the Review module that knows about bookings.
It decouples the Review service from the Booking service via a replaceable
provider pattern: call set_eligibility_provider() once at startup (or in
tests) to inject the real implementation.

TODO: Replace the default provider with Sayeel's booking-service function.
      Confirm with Sayeel whether the function takes users.id or customers.id
      — we pass the logged-in users.id from the X-User-Id header.
"""

from __future__ import annotations

import uuid
from dataclasses import dataclass
from typing import Awaitable, Callable

from sqlalchemy.ext.asyncio import AsyncSession


# ---------------------------------------------------------------------------
# Result dataclass
# ---------------------------------------------------------------------------


@dataclass
class ReviewEligibility:
    """Eligibility result returned by get_review_eligibility.

    completed:   True if the booking status is COMPLETED.
    owned:       True if user_id matches the booking's customer/user.
    provider_id: The provider associated with the booking (None if unavailable).
    service_id:  The service associated with the booking (None if unavailable).
    """

    completed: bool
    owned: bool
    provider_id: uuid.UUID | None
    service_id: uuid.UUID | None


# ---------------------------------------------------------------------------
# Provider protocol / type alias
# ---------------------------------------------------------------------------

EligibilityProvider = Callable[
    [AsyncSession, uuid.UUID, uuid.UUID],
    Awaitable[ReviewEligibility],
]


# ---------------------------------------------------------------------------
# Custom exception
# ---------------------------------------------------------------------------


class EligibilityUnavailableError(Exception):
    """Raised when the booking service is not connected.

    The Review controller maps this to HTTP 503.
    """

    def __init__(self, message: str = "Booking service is not connected yet"):
        self.message = message
        super().__init__(self.message)


# ---------------------------------------------------------------------------
# Internal registry
# ---------------------------------------------------------------------------

_provider: EligibilityProvider | None = None


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


def set_eligibility_provider(fn: EligibilityProvider) -> None:
    """Register the eligibility provider function.

    Call this once at application startup (or in tests) to inject the
    real implementation.

    TODO: wire up Sayeel's function here — confirm whether it accepts
    users.id or customers.id (we forward the logged-in users.id).
    """
    global _provider
    _provider = fn


async def get_review_eligibility(
    db: AsyncSession,
    booking_id: uuid.UUID,
    user_id: uuid.UUID,
) -> ReviewEligibility:
    """Return eligibility information for reviewing a booking.

    Dispatches to the registered provider.  If no provider has been
    registered the default path raises EligibilityUnavailableError —
    there is intentionally NO fake data on the default path so a
    misconfigured environment fails loudly.

    Args:
        db:         Async database session (forwarded to the provider).
        booking_id: UUID of the booking to check.
        user_id:    UUID of the currently authenticated user (users.id).
                    TODO: confirm with Sayeel whether his function uses
                    users.id or customers.id.

    Raises:
        EligibilityUnavailableError: No provider registered yet.
    """
    if _provider is None:
        raise EligibilityUnavailableError(
            "Booking service is not connected yet"
        )
    return await _provider(db, booking_id, user_id)
