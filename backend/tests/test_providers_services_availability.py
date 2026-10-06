import uuid
from datetime import date, time
from decimal import Decimal

import pytest
from fastapi import HTTPException
from pydantic import ValidationError

from models.provider import ProviderStatus
from schemas.availability import (
    AvailabilityCreate,
    AvailabilityExceptionCreate,
    AvailabilityExceptionUpdate,
    AvailabilityUpdate,
)
from schemas.provider import ProviderCreate, ProviderFilters, ProviderUpdate
from schemas.service import ServiceCreate, ServiceFilters, ServiceUpdate
from services import availability_service as av
from services import provider_service as ps
from services import service_service as ss


def provider_data(**kw):
    base = dict(
        business_name="Glow Salon",
        location="Clifton, Karachi",
        city="Karachi",
        timezone="Asia/Karachi",
    )
    base.update(kw)
    return ProviderCreate(**base)


def service_data(session, **kw):
    base = dict(
        category_id=session.category_ids[0],
        name="Haircut",
        price=Decimal("1500.00"),
        duration_minutes=45,
        service_type="AT_PROVIDER",
    )
    base.update(kw)
    return ServiceCreate(**base)


async def approved_provider(session, idx=0, **kw):
    p = await ps.create_provider(session, session.user_ids[idx], provider_data(**kw))
    return await ps.set_provider_status(session, p.id, ProviderStatus.APPROVED)


# ---------------- schemas ----------------
def test_provider_schema_validation():
    with pytest.raises(ValidationError):
        provider_data(timezone="Mars/Phobos")
    with pytest.raises(ValidationError):
        provider_data(contact_email="not-an-email")
    with pytest.raises(ValidationError):
        provider_data(slot_interval_minutes=0)
    assert provider_data().buffer_minutes == 0


def test_service_schema_validation():
    cid = uuid.uuid4()
    with pytest.raises(ValidationError):
        ServiceCreate(category_id=cid, name="X1", price=-1, duration_minutes=30, service_type="ONLINE")
    with pytest.raises(ValidationError):
        ServiceCreate(category_id=cid, name="X1", price=10, duration_minutes=0, service_type="ONLINE")
    with pytest.raises(ValidationError):
        ServiceFilters(min_price=10, max_price=5)


def test_availability_schema_validation():
    with pytest.raises(ValidationError):
        AvailabilityCreate(day_of_week=7, start_time="09:00", end_time="17:00")
    with pytest.raises(ValidationError):
        AvailabilityCreate(day_of_week=1, start_time="17:00", end_time="09:00")
    with pytest.raises(ValidationError):
        AvailabilityExceptionCreate(exception_date="2026-12-25", is_day_off=True, start_time="10:00", end_time="12:00")
    with pytest.raises(ValidationError):
        AvailabilityExceptionCreate(exception_date="2026-12-25", is_day_off=False)
    ok = AvailabilityExceptionCreate(exception_date="2026-12-25")
    assert ok.is_day_off is True


# ---------------- providers ----------------
@pytest.mark.asyncio
async def test_provider_create_defaults_and_duplicate(session):
    p = await ps.create_provider(session, session.user_ids[0], provider_data())
    assert p.status == ProviderStatus.PENDING and p.is_active is True
    assert p.created_at is not None and p.buffer_minutes == 0
    with pytest.raises(HTTPException) as e:
        await ps.create_provider(session, session.user_ids[0], provider_data())
    assert e.value.status_code == 409


@pytest.mark.asyncio
async def test_provider_unknown_user_rejected(session):
    with pytest.raises(HTTPException) as e:
        await ps.create_provider(session, uuid.uuid4(), provider_data())
    assert e.value.status_code == 409


@pytest.mark.asyncio
async def test_public_visibility_and_status_workflow(session):
    p = await ps.create_provider(session, session.user_ids[0], provider_data())
    items, total = await ps.list_providers(session, ProviderFilters())
    assert total == 0
    with pytest.raises(HTTPException) as e:
        await ps.get_public_provider(session, p.id)
    assert e.value.status_code == 404

    await ps.set_provider_status(session, p.id, ProviderStatus.APPROVED)
    items, total = await ps.list_providers(session, ProviderFilters())
    assert total == 1 and items[0].id == p.id

    await ps.set_provider_status(session, p.id, is_active=False)
    assert (await ps.list_providers(session, ProviderFilters()))[1] == 0
    admin_items, admin_total = await ps.list_providers(
        session, ProviderFilters(status=ProviderStatus.APPROVED), public_only=False
    )
    assert admin_total == 1

    with pytest.raises(HTTPException) as e:
        await ps.set_provider_status(session, p.id)
    assert e.value.status_code == 422


@pytest.mark.asyncio
async def test_provider_update_and_filters(session):
    await approved_provider(session, 0)
    await approved_provider(session, 1, business_name="Lahore Spa", city="Lahore", location="Gulberg, Lahore")
    updated = await ps.update_provider(
        session, session.user_ids[0], ProviderUpdate(description="Best salon", buffer_minutes=10)
    )
    assert updated.description == "Best salon" and updated.buffer_minutes == 10
    assert updated.business_name == "Glow Salon"  # untouched
    with pytest.raises(HTTPException):
        await ps.update_provider(session, session.user_ids[0], ProviderUpdate.model_validate({"business_name": None}))

    by_city, total = await ps.list_providers(session, ProviderFilters(city="lahore"))
    assert total == 1 and by_city[0].business_name == "Lahore Spa"
    by_q, total = await ps.list_providers(session, ProviderFilters(q="glow"))
    assert total == 1
    _, total = await ps.list_providers(session, ProviderFilters(), page=2, page_size=1)
    assert total == 2


@pytest.mark.asyncio
async def test_provider_by_category_filter(session):
    a = await approved_provider(session, 0)
    await approved_provider(session, 1, business_name="Other Place")
    await ss.create_service(session, session.user_ids[0], service_data(session))
    items, total = await ps.list_providers(session, ProviderFilters(category_id=session.category_ids[0]))
    assert total == 1 and items[0].id == a.id
    _, total = await ps.list_providers(session, ProviderFilters(category_id=session.category_ids[1]))
    assert total == 0


# ---------------- services ----------------
@pytest.mark.asyncio
async def test_service_create_requires_provider_profile(session):
    with pytest.raises(HTTPException) as e:
        await ss.create_service(session, session.user_ids[0], service_data(session))
    assert e.value.status_code == 404


@pytest.mark.asyncio
async def test_service_invalid_category(session):
    await approved_provider(session, 0)
    with pytest.raises(HTTPException) as e:
        await ss.create_service(session, session.user_ids[0], service_data(session, category_id=uuid.uuid4()))
    assert e.value.status_code == 400
    # session still usable after the failed insert
    s = await ss.create_service(session, session.user_ids[0], service_data(session))
    assert s.is_active is True and s.price == Decimal("1500.00")


@pytest.mark.asyncio
async def test_service_ownership_and_update(session):
    await approved_provider(session, 0)
    await approved_provider(session, 1, business_name="Other Place")
    s = await ss.create_service(session, session.user_ids[0], service_data(session))
    upd = await ss.update_service(session, session.user_ids[0], s.id, ServiceUpdate(price=Decimal("2000")))
    assert upd.price == Decimal("2000") and upd.name == "Haircut"
    with pytest.raises(HTTPException) as e:
        await ss.update_service(session, session.user_ids[1], s.id, ServiceUpdate(name="Hacked"))
    assert e.value.status_code == 404
    with pytest.raises(HTTPException) as e:
        await ss.set_service_active(session, session.user_ids[1], s.id, False)
    assert e.value.status_code == 404


@pytest.mark.asyncio
async def test_service_soft_delete_and_public_search(session):
    p = await approved_provider(session, 0)
    s1 = await ss.create_service(session, session.user_ids[0], service_data(session, name="Haircut", price=Decimal("1500")))
    s2 = await ss.create_service(session, session.user_ids[0], service_data(session, name="Facial", price=Decimal("4000"), service_type="ON_SITE", category_id=session.category_ids[1]))

    items, total = await ss.search_services(session, ServiceFilters())
    assert total == 2 and items[0].provider.business_name == "Glow Salon"
    assert (await ss.search_services(session, ServiceFilters(max_price=Decimal("2000"))))[1] == 1
    assert (await ss.search_services(session, ServiceFilters(service_type="ON_SITE")))[1] == 1
    assert (await ss.search_services(session, ServiceFilters(category_id=session.category_ids[1])))[1] == 1
    assert (await ss.search_services(session, ServiceFilters(q="faci")))[1] == 1
    assert (await ss.search_services(session, ServiceFilters(location="karachi")))[1] == 2
    assert (await ss.search_services(session, ServiceFilters(location="lahore")))[1] == 0

    await ss.set_service_active(session, session.user_ids[0], s1.id, False)
    assert (await ss.search_services(session, ServiceFilters()))[1] == 1
    assert len(await ss.list_my_services(session, session.user_ids[0])) == 2
    assert len(await ss.list_provider_services(session, p.id)) == 1
    with pytest.raises(HTTPException):
        await ss.get_public_service(session, s1.id)
    got = await ss.get_public_service(session, s2.id)
    assert got.provider.id == p.id

    await ss.admin_set_service_active(session, s1.id, True)
    assert (await ss.search_services(session, ServiceFilters()))[1] == 2

    # provider suspended: services disappear from public search
    await ps.set_provider_status(session, p.id, ProviderStatus.SUSPENDED)
    assert (await ss.search_services(session, ServiceFilters()))[1] == 0
    assert (await ss.search_services(session, ServiceFilters(), public_only=False))[1] == 2


@pytest.mark.asyncio
async def test_ensure_service_bookable(session):
    p = await approved_provider(session, 0)
    other = await approved_provider(session, 1, business_name="Other Place")
    s = await ss.create_service(session, session.user_ids[0], service_data(session))

    assert (await ss.ensure_service_bookable(session, s.id, p.id)).id == s.id
    with pytest.raises(HTTPException) as e:
        await ss.ensure_service_bookable(session, s.id, other.id)
    assert e.value.status_code == 400
    await ss.set_service_active(session, session.user_ids[0], s.id, False)
    with pytest.raises(HTTPException) as e:
        await ss.ensure_service_bookable(session, s.id, p.id)
    assert "not active" in e.value.detail
    await ss.set_service_active(session, session.user_ids[0], s.id, True)
    await ps.set_provider_status(session, p.id, ProviderStatus.SUSPENDED)
    with pytest.raises(HTTPException):
        await ss.ensure_service_bookable(session, s.id, p.id)
    with pytest.raises(HTTPException) as e:
        await ps.ensure_provider_bookable(session, uuid.uuid4())
    assert e.value.status_code == 404


# ---------------- availability ----------------
def slot(day=0, start="09:00", end="17:00", is_break=False):
    return AvailabilityCreate(day_of_week=day, start_time=start, end_time=end, is_break=is_break)


@pytest.mark.asyncio
async def test_weekly_availability_and_overlap(session):
    p = await approved_provider(session, 0)
    u = session.user_ids[0]
    work = await av.add_availability(session, u, slot())
    lunch = await av.add_availability(session, u, slot(start="13:00", end="14:00", is_break=True))
    await av.add_availability(session, u, slot(day=1))  # other day is fine
    assert lunch.is_break is True

    with pytest.raises(HTTPException) as e:
        await av.add_availability(session, u, slot(start="16:00", end="18:00"))
    assert e.value.status_code == 409
    # touching windows do not overlap
    await av.add_availability(session, u, slot(start="17:00", end="19:00"))
    # a break may sit inside working hours (different kind)
    with pytest.raises(HTTPException):
        await av.add_availability(session, u, slot(start="13:30", end="14:30", is_break=True))

    upd = await av.update_availability(session, u, work.id, AvailabilityUpdate(end_time=time(16, 0)))
    assert upd.end_time == time(16, 0)
    with pytest.raises(HTTPException) as e:
        await av.update_availability(session, u, work.id, AvailabilityUpdate(start_time=time(18, 0)))
    assert e.value.status_code == 422
    with pytest.raises(HTTPException) as e:
        await av.update_availability(session, u, work.id, AvailabilityUpdate.model_validate({"day_of_week": None}))
    assert e.value.status_code == 422

    full = await av.get_provider_availability(session, p.id)
    assert full.timezone == "Asia/Karachi" and full.slot_interval_minutes == 30
    assert [w.day_of_week for w in full.weekly] == [0, 0, 0, 1]

    await av.delete_availability(session, u, lunch.id)
    assert len((await av.list_my_availability(session, u)).weekly) == 3
    with pytest.raises(HTTPException) as e:
        await av.delete_availability(session, u, lunch.id)
    assert e.value.status_code == 404


@pytest.mark.asyncio
async def test_availability_ownership(session):
    await approved_provider(session, 0)
    await approved_provider(session, 1, business_name="Other Place")
    row = await av.add_availability(session, session.user_ids[0], slot())
    with pytest.raises(HTTPException) as e:
        await av.update_availability(session, session.user_ids[1], row.id, AvailabilityUpdate(is_break=True))
    assert e.value.status_code == 404
    with pytest.raises(HTTPException):
        await av.delete_availability(session, session.user_ids[1], row.id)


@pytest.mark.asyncio
async def test_exceptions(session):
    p = await approved_provider(session, 0)
    u = session.user_ids[0]
    off = await av.add_exception(session, u, AvailabilityExceptionCreate(exception_date=date(2026, 12, 25), reason="Holiday"))
    custom = await av.add_exception(
        session, u,
        AvailabilityExceptionCreate(exception_date=date(2026, 12, 31), is_day_off=False, start_time="10:00", end_time="14:00"),
    )
    with pytest.raises(HTTPException) as e:
        await av.add_exception(session, u, AvailabilityExceptionCreate(exception_date=date(2026, 12, 25)))
    assert e.value.status_code == 409

    upd = await av.update_exception(session, u, custom.id, AvailabilityExceptionUpdate(end_time=time(15, 0)))
    assert upd.end_time == time(15, 0)
    # switching custom hours to a day off clears the times
    flipped = await av.update_exception(session, u, custom.id, AvailabilityExceptionUpdate(is_day_off=True))
    assert flipped.start_time is None and flipped.end_time is None
    # switching a day off to custom hours needs times
    with pytest.raises(HTTPException):
        await av.update_exception(session, u, off.id, AvailabilityExceptionUpdate(is_day_off=False))
    with pytest.raises(HTTPException) as e:
        await av.update_exception(session, u, custom.id, AvailabilityExceptionUpdate(exception_date=date(2026, 12, 25)))
    assert e.value.status_code == 409

    ranged = await av.get_provider_availability(session, p.id, from_date=date(2026, 12, 30), to_date=date(2026, 12, 31))
    assert [x.exception_date for x in ranged.exceptions] == [date(2026, 12, 31)]
    assert len((await av.get_provider_availability(session, p.id)).exceptions) == 2

    await av.delete_exception(session, u, off.id)
    assert len((await av.get_provider_availability(session, p.id)).exceptions) == 1
