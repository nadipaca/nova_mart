from datetime import datetime

from fastapi import Depends, FastAPI, HTTPException, Query
from sqlalchemy.orm import Session

from .database import Base, engine, ensure_sqlite_schema, get_db
from .models import UserEvent
from .recommender import get_recommendations_for_user
from .schemas import UserEventIn

Base.metadata.create_all(bind=engine)
ensure_sqlite_schema()

app = FastAPI(title="NovaMart Recommendation Service")


@app.get("/health", tags=["health"])
def health() -> dict:
    return {"status": "ok"}


@app.post("/events", tags=["events"], status_code=202)
def ingest_event(payload: UserEventIn, db: Session = Depends(get_db)) -> dict:
    """
    Ingest user behavior events to power recommendations.
    """
    if payload.eventId:
        existing = db.query(UserEvent).filter(UserEvent.event_id == payload.eventId).first()
        if existing:
            return {"status": "duplicate", "eventId": payload.eventId}

    event = UserEvent(
        event_id=payload.eventId,
        user_id=payload.userId,
        product_id=payload.productId,
        event_type=payload.eventType,
        event_value=payload.eventValue,
        session_id=payload.sessionId,
        source=payload.source,
        created_at=payload.createdAt or datetime.utcnow(),
    )
    db.add(event)
    db.commit()
    return {"status": "stored", "eventId": payload.eventId}


@app.get("/recommendations", tags=["recommendations"])
def get_recommendations(
    userId: str = Query(..., description="User identifier"),
    limit: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db),
) -> dict:
    """
    Returns a list of productIds recommended for the given userId.
    """
    if not userId:
        raise HTTPException(status_code=400, detail="userId is required")

    product_ids = get_recommendations_for_user(db, user_id=userId, limit=limit)
    return {"userId": userId, "productIds": product_ids, "strategy": "behavioral-v1"}

