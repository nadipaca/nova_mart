from fastapi import Depends, FastAPI, HTTPException, Query
from sqlalchemy.orm import Session

from .database import Base, engine, get_db
from .recommender import get_recommendations_for_user

Base.metadata.create_all(bind=engine)

app = FastAPI(title="NovaMart Recommendation Service")


@app.get("/health", tags=["health"])
def health() -> dict:
    return {"status": "ok"}


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
    return {"userId": userId, "productIds": product_ids}

