import asyncio
import os
import threading

from fastapi import FastAPI

from .events_consumer import handle_metric_event, start_consumer
from .schemas import MetricEvent
from .state import metrics_store


app = FastAPI(title="NovaMart AI Ops Service")


@app.on_event("startup")
async def startup_event() -> None:
    if os.getenv("ENABLE_KAFKA_CONSUMER", "false").lower() != "true":
        return

    # Run Kafka consumer in a background thread with its own event loop.
    def _run_consumer() -> None:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        loop.run_until_complete(start_consumer())

    thread = threading.Thread(target=_run_consumer, daemon=True)
    thread.start()


@app.get("/health", tags=["health"])
def health() -> dict:
    return {"status": "ok"}


@app.post("/metrics", tags=["metrics"])
async def ingest_metric(payload: MetricEvent) -> dict:
    """
    Ingest a metric event without Kafka (useful for local simulations).
    """
    decision = await handle_metric_event(payload.model_dump(), producer=None)
    return {"accepted": True, "decision": decision}


@app.get("/anomalies", tags=["anomalies"])
def anomalies() -> dict:
    """
    Returns current moving averages and last recommendations per service,
    useful for debugging what the AI Ops service is seeing.
    """
    snapshot = metrics_store.get_snapshot()
    return {"services": snapshot}

