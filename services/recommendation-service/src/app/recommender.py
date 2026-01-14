from datetime import datetime
import os
import time
from typing import Dict, List

from sqlalchemy.orm import Session
from sqlalchemy import func

from .models import UserEvent


EVENT_WEIGHTS: Dict[str, float] = {
    "product.viewed": 1.0,
    "product.scrolled": 1.4,
    "cart.added": 2.0,
    "order.completed": 3.0,
}

HALF_LIFE_HOURS = float(os.getenv("RECOMMENDER_HALF_LIFE_HOURS", "72"))
MAX_EVENTS = int(os.getenv("RECOMMENDER_MAX_EVENTS", "1000"))
GLOBAL_CACHE_TTL_SECONDS = float(os.getenv("RECOMMENDER_GLOBAL_CACHE_TTL_SECONDS", "5"))
USER_CACHE_TTL_SECONDS = float(os.getenv("RECOMMENDER_USER_CACHE_TTL_SECONDS", "1"))

_global_cache_expires_at: float = 0.0
_global_cache_product_ids: List[str] = []

_user_cache_expires_at: Dict[str, float] = {}
_user_cache_product_ids: Dict[str, List[str]] = {}


def _normalize_event_value(event_type: str, value: float) -> float:
    if value is None:
        return 0.0
    if event_type == "product.scrolled":
        return min(max(value, 0.0), 1.0)
    if event_type == "product.viewed":
        return min(max(value / 3000.0, 0.0), 1.0)
    return 0.0


def _recency_decay(created_at: datetime) -> float:
    if HALF_LIFE_HOURS <= 0:
        return 1.0
    age_seconds = max(0.0, (datetime.utcnow() - created_at).total_seconds())
    return 0.5 ** (age_seconds / 3600.0 / HALF_LIFE_HOURS)


def _event_score(event_type: str, event_value: float, created_at: datetime) -> float:
    base_weight = EVENT_WEIGHTS.get(event_type, 0.5)
    engagement_boost = 1.0 + _normalize_event_value(event_type, event_value or 0.0)
    return base_weight * engagement_boost * _recency_decay(created_at)

def _get_global_top_products(db: Session, limit: int) -> List[str]:
    global _global_cache_expires_at
    global _global_cache_product_ids

    now = time.monotonic()
    if GLOBAL_CACHE_TTL_SECONDS > 0 and now < _global_cache_expires_at and len(_global_cache_product_ids) >= limit:
        return _global_cache_product_ids[:limit]

    rows = (
        db.query(UserEvent.product_id, func.count(UserEvent.id).label("cnt"))
        .group_by(UserEvent.product_id)
        .order_by(func.count(UserEvent.id).desc())
        .limit(max(limit, 50))
        .all()
    )
    product_ids = [r[0] for r in rows if r[0]]

    _global_cache_product_ids = product_ids
    _global_cache_expires_at = now + max(0.0, GLOBAL_CACHE_TTL_SECONDS)
    return product_ids[:limit]

def _get_cached_user_recommendations(user_id: str, limit: int) -> List[str] | None:
    if USER_CACHE_TTL_SECONDS <= 0:
        return None
    now = time.monotonic()
    expires_at = _user_cache_expires_at.get(user_id, 0.0)
    if now >= expires_at:
        return None
    cached = _user_cache_product_ids.get(user_id) or []
    if len(cached) < limit:
        return None
    return cached[:limit]

def _set_cached_user_recommendations(user_id: str, product_ids: List[str]) -> None:
    if USER_CACHE_TTL_SECONDS <= 0:
        return
    _user_cache_product_ids[user_id] = product_ids
    _user_cache_expires_at[user_id] = time.monotonic() + max(0.0, USER_CACHE_TTL_SECONDS)


def get_recommendations_for_user(db: Session, user_id: str, limit: int = 10) -> List[str]:
    """
    Very simple heuristic recommender:
    - For the user, count product interactions (views + orders).
    - Recommend the top-N most interacted products.
    - If the user has no history, fall back to global top-N.
    """
    cached = _get_cached_user_recommendations(user_id, limit)
    if cached is not None:
        return cached

    # Fetch only the columns we need and release the DB connection early by closing the session
    # before doing CPU-bound scoring.
    user_event_rows = (
        db.query(UserEvent.product_id, UserEvent.event_type, UserEvent.event_value, UserEvent.created_at)
        .filter(UserEvent.user_id == user_id)
        .order_by(UserEvent.created_at.desc())
        .limit(MAX_EVENTS)
        .all()
    )

    if user_event_rows:
        try:
            db.close()
        except Exception:
            pass

        scores: Dict[str, float] = {}
        for product_id, event_type, event_value, created_at in user_event_rows:
            if not product_id:
                continue
            scores[product_id] = scores.get(product_id, 0.0) + _event_score(event_type, event_value, created_at)
        if scores:
            ranked = sorted(scores.items(), key=lambda item: item[1], reverse=True)
            product_ids = [product_id for product_id, _ in ranked[: max(limit, 50)]]
            _set_cached_user_recommendations(user_id, product_ids)
            return product_ids[:limit]

    # Cold start: global top products (cached).
    product_ids = _get_global_top_products(db, limit)
    try:
        db.close()
    except Exception:
        pass
    return product_ids
