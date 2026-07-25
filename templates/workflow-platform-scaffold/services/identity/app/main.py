from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from {{platform_slug}}_shared.health import router as health_router
from {{platform_slug}}_shared.middleware import RequestIDMiddleware
from {{platform_slug}}_shared import logging_config
from {{platform_slug}}_shared.database import Base
from .config import get_settings
from .database import engine, SessionFactory
from .router import router
from .dependencies import set_adapter
from . import models  # noqa: F401

settings = get_settings()
logging_config.configure(settings.service_name)


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # Wire auth adapter
    if settings.auth_adapter == "stub":
        from .auth.stub import StubAuthAdapter
        from passlib.context import CryptContext
        ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")
        adapter = StubAuthAdapter(SessionFactory, settings.jwt_secret, settings.jwt_algorithm, settings.jwt_expire_minutes)
    else:
        from .auth.azure_ad import AzureADAdapter
        adapter = AzureADAdapter(settings.azure_tenant_id, settings.azure_client_id, settings.azure_client_secret)

    set_adapter(adapter)

    # Seed users on startup (idempotent)
    from passlib.context import CryptContext
    ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")
    from . import service
    async with SessionFactory() as db:
        await service.seed_users(db, settings, ctx.hash)
        await db.commit()

    yield
    await engine.dispose()


app = FastAPI(title="{{PLATFORM_SLUG_UPPER}} Identity", version="1.0.0", lifespan=lifespan)
app.add_middleware(RequestIDMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(health_router)
app.include_router(router)
