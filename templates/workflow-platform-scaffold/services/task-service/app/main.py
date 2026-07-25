from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from {{platform_slug}}_shared.health import router as health_router
from {{platform_slug}}_shared.middleware import RequestIDMiddleware
from {{platform_slug}}_shared import logging_config
from {{platform_slug}}_shared.database import Base
from {{platform_slug}}_shared.audit_client import AuditClient
from .config import get_settings
from .database import engine, SessionFactory
from .router import router
from . import models  # noqa

settings = get_settings()
logging_config.configure(settings.service_name)
_audit = AuditClient(settings.audit_core_url)
scheduler = AsyncIOScheduler()


async def _escalation_job():
    from . import service
    async with SessionFactory() as db:
        n = await service.escalate_overdue(db, _audit)
        await db.commit()
        if n:
            import logging
            logging.getLogger(__name__).info("escalated_tasks", extra={"count": n})


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    scheduler.add_job(_escalation_job, "interval", minutes=15, id="escalation")
    scheduler.start()
    yield
    scheduler.shutdown()
    await engine.dispose()


app = FastAPI(title="{{PLATFORM_SLUG_UPPER}} Task Service", version="1.0.0", lifespan=lifespan)
app.add_middleware(RequestIDMiddleware)
app.add_middleware(CORSMiddleware, allow_origins=settings.cors_origins_list, allow_methods=["*"], allow_headers=["*"])
app.include_router(health_router)
app.include_router(router)
