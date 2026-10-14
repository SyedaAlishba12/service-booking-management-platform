import asyncio
import sys
import uuid
import os
from datetime import datetime, timezone
from decimal import Decimal

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from database.base import Base
from models.user import User, UserRole
from models.customer import Customer
from models.provider import Provider, ProviderStatus
from models.category import Category
from models.service import Service, ServiceType
from models.availability import Availability, AvailabilityException
from models.notification import Notification
from schemas.admin import ProviderStatusUpdate, ServiceActiveUpdate
from fastapi import HTTPException
from pydantic import ValidationError

import services.admin_service as svc
from services.provider_service import list_providers as public_list_providers

ENGINE = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
SessionFactory = async_sessionmaker(bind=ENGINE, class_=AsyncSession, expire_on_commit=False)

passed = 0
total = 0

def check(condition, message):
    global passed, total
    total += 1
    if not condition:
        print(f"  FAIL  {message}")
        sys.exit(1)
    else:
        print(f"  PASS  {message}")
        passed += 1

async def create_tables():
    async with ENGINE.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

async def main():
    await create_tables()
    async with SessionFactory() as db:
        now = datetime.now(timezone.utc)
        
        # Admin User
        u_admin = User(id=uuid.uuid4(), full_name="A", email="a@a.com", password_hash="x", role=UserRole.ADMIN, created_at=now, updated_at=now)
        
        # 3 Providers
        u_prov1 = User(id=uuid.uuid4(), full_name="P1", email="p1@p.com", password_hash="x", role=UserRole.PROVIDER, created_at=now, updated_at=now)
        prov1 = Provider(id=uuid.uuid4(), user_id=u_prov1.id, business_name="P1", location="L", timezone="UTC", slot_interval_minutes=30, status=ProviderStatus.PENDING, is_active=True, created_at=now, updated_at=now)
        
        u_prov2 = User(id=uuid.uuid4(), full_name="P2", email="p2@p.com", password_hash="x", role=UserRole.PROVIDER, created_at=now, updated_at=now)
        prov2 = Provider(id=uuid.uuid4(), user_id=u_prov2.id, business_name="P2", location="L", timezone="UTC", slot_interval_minutes=30, status=ProviderStatus.SUSPENDED, is_active=True, created_at=now, updated_at=now)
        
        u_prov3 = User(id=uuid.uuid4(), full_name="P3", email="p3@p.com", password_hash="x", role=UserRole.PROVIDER, created_at=now, updated_at=now)
        prov3 = Provider(id=uuid.uuid4(), user_id=u_prov3.id, business_name="P3", location="L", timezone="UTC", slot_interval_minutes=30, status=ProviderStatus.APPROVED, is_active=False, created_at=now, updated_at=now)
        
        db.add_all([u_admin, u_prov1, u_prov2, u_prov3, prov1, prov2, prov3])
        
        cat = Category(id=uuid.uuid4(), name="Cat1", slug="cat1", is_active=True, created_at=now, updated_at=now)
        db.add(cat)
        
        srv1 = Service(id=uuid.uuid4(), provider_id=prov1.id, category_id=cat.id, name="S1", price=Decimal("10"), duration_minutes=30, service_type=ServiceType.ONLINE, is_active=False, created_at=now, updated_at=now)
        srv2 = Service(id=uuid.uuid4(), provider_id=prov2.id, category_id=cat.id, name="S2", price=Decimal("20"), duration_minutes=30, service_type=ServiceType.ONLINE, is_active=True, created_at=now, updated_at=now)
        db.add_all([srv1, srv2])
        
        await db.commit()

        # admin provider list includes PENDING, SUSPENDED and inactive providers that the public list excludes
        from schemas.provider import ProviderFilters
        admin_provs, admin_ptotal = await svc.list_providers_admin(db, status=None, is_active=None, q=None, page=1, page_size=10)
        check(admin_ptotal == 3, "admin provider list includes PENDING, SUSPENDED and inactive providers")
        
        pub_provs, pub_ptotal = await public_list_providers(db, ProviderFilters(), public_only=True)
        check(pub_ptotal == 0, "the public list excludes them")
        
        # filters by status and by is_active
        p_pending, _ = await svc.list_providers_admin(db, status=ProviderStatus.PENDING, is_active=None, q=None, page=1, page_size=10)
        check(len(p_pending) == 1 and p_pending[0].id == prov1.id, "filters by status")
        
        p_inactive, _ = await svc.list_providers_admin(db, status=None, is_active=False, q=None, page=1, page_size=10)
        check(len(p_inactive) == 1 and p_inactive[0].id == prov3.id, "filters by is_active")
        
        # approve a PENDING provider -> APPROVED and the public list now includes it
        await svc.update_provider_status(db, prov1.id, ProviderStatusUpdate(status=ProviderStatus.APPROVED))
        pub_provs2, pub_ptotal2 = await public_list_providers(db, ProviderFilters(), public_only=True)
        check(pub_ptotal2 == 1 and pub_provs2[0].id == prov1.id, "approve a PENDING provider -> APPROVED and the public list now includes it")
        
        from sqlalchemy import select
        notif_1 = await db.scalar(select(Notification).where(Notification.user_id == prov1.user_id).order_by(Notification.created_at.desc()))
        check(notif_1 is not None and "approved" in notif_1.message, "notification hook receives a message containing the word 'approved'")
        
        # suspend -> SUSPENDED
        p1_res = await svc.update_provider_status(db, prov1.id, ProviderStatusUpdate(status=ProviderStatus.SUSPENDED))
        check(p1_res.status == ProviderStatus.SUSPENDED, "suspend -> SUSPENDED")
        
        notifs_2 = await db.scalars(select(Notification).where(Notification.user_id == prov1.user_id).order_by(Notification.id.desc()))
        has_suspended = any("suspended" in n.message for n in notifs_2)
        check(has_suspended, "notification hook receives a message containing the word 'suspended'")
        
        # when the hook raises, the status change still persists and a subsequent query on the same session works
        import services.admin_service as svc_module
        original_notify = svc_module.notify
        
        async def failing_notify(*args, **kwargs):
            raise Exception("Mock notification failure")
        
        svc_module.notify = failing_notify
        
        try:
            p1_res = await svc.update_provider_status(db, prov1.id, ProviderStatusUpdate(is_active=False))
            check(p1_res.is_active is False, "when the hook raises, the status change still persists")
            
            test_query = await db.scalar(select(Provider).where(Provider.id == prov1.id))
            check(test_query is not None and test_query.is_active is False, "and a subsequent query on the same session works")
        finally:
            svc_module.notify = original_notify

        # reactivate
        p1_res = await svc.update_provider_status(db, prov1.id, ProviderStatusUpdate(is_active=True))
        check(p1_res.is_active is True, "reactivate")
        
        # payload with neither field is rejected
        try:
            ProviderStatusUpdate()
            check(False, "payload with neither field is rejected")
        except ValidationError:
            check(True, "payload with neither field is rejected")
            
        # invalid status value rejected
        try:
            ProviderStatusUpdate(status="INVALID")
            check(False, "invalid status value rejected")
        except ValidationError:
            check(True, "invalid status value rejected")
            
        # unknown provider id -> not found
        try:
            await svc.update_provider_status(db, uuid.uuid4(), ProviderStatusUpdate(is_active=False))
            check(False, "unknown provider id -> not found")
        except HTTPException as e:
            check(e.status_code == 404, "unknown provider id -> not found")
            
        # admin service list includes inactive services
        admin_srvs, admin_stotal = await svc.list_services_admin(db, category_id=None, provider_id=None, is_active=None, q=None, page=1, page_size=10)
        check(admin_stotal == 2, "admin service list includes inactive services")
        
        # deactivate and reactivate a service
        await svc.set_service_active(db, srv2.id, is_active=False)
        s_res = await svc.get_service_admin(db, srv2.id)
        check(s_res.is_active is False, "deactivate a service")
        
        await svc.set_service_active(db, srv2.id, is_active=True)
        s_res = await svc.get_service_admin(db, srv2.id)
        check(s_res.is_active is True, "reactivate a service")
        
        # unknown service id -> not found
        try:
            await svc.set_service_active(db, uuid.uuid4(), is_active=False)
            check(False, "unknown service id -> not found")
        except HTTPException as e:
            check(e.status_code == 404, "unknown service id -> not found")
            
        # pagination total/page slicing
        p_slice, _ = await svc.list_providers_admin(db, status=None, is_active=None, q=None, page=2, page_size=1)
        check(len(p_slice) == 1, "pagination slicing")
        
        print("=" * 50)
        print(f"Results: {passed}/{total} passed (all OK)")
        
        with open("services/admin_service.py", "r") as f:
            content = f.read()
            check(".add(" not in content, "no .add(")
            check("update(" not in content, "no update(")
            check("delete(" not in content, "no delete(")
            check("text(" not in content, "no text(")
            check(content.count("commit(") <= 1, "at most one commit( for notification")
            
        with open("routes/admin_routes.py", "r") as f:
            r_content = f.read()
            check("require_admin" in r_content, "routes/admin_routes.py contains require_admin")
            check("require_roles" not in r_content, "routes/admin_routes.py does not contain require_roles")

if __name__ == "__main__":
    asyncio.run(main())
