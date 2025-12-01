import asyncio
import threading

from fastapi import FastAPI

from .events_consumer import start_consumer
from .state import metrics_store


app = FastAPI(title="NovaMart AI Ops Service")


@app.on_event("startup")
async def startup_event() -> None:
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


@app.get("/anomalies", tags=["anomalies"])
def anomalies() -> dict:
    """
    Returns current moving averages and last recommendations per service,
    useful for debugging what the AI Ops service is seeing.
    """
    snapshot = metrics_store.get_snapshot()
    return {"services": snapshot}

