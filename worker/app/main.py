from fastapi import FastAPI
from app.api.compose import router as compose_router
from app.tracing import init_tracing

init_tracing()

app = FastAPI(
    title="VidCraft Worker",
    description="FFmpeg video composition service",
    version="0.1.0",
)
app.include_router(compose_router, prefix="/api/compose", tags=["compose"])


@app.get("/health")
async def health():
    return {"status": "ok"}
