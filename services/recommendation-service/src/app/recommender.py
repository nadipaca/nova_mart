from collections import Counter
from datetime import datetime
import os
from typing import Dict, List

from sqlalchemy.orm import Session

from .models import UserEvent


EVENT_WEIGHTS: Dict[str, float] = {
    "product.viewed": 1.0,
    "product.scrolled": 1.4,
    "cart.added": 2.0,
    "order.completed": 3.0,
}

HALF_LIFE_HOURS = float(os.getenv("RECOMMENDER_HALF_LIFE_HOURS", "72"))
MAX_EVENTS = int(os.getenv("RECOMMENDER_MAX_EVENTS", "1000"))


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


def _event_score(event: UserEvent) -> float:
    base_weight = EVENT_WEIGHTS.get(event.event_type, 0.5)
    engagement_boost = 1.0 + _normalize_event_value(event.event_type, event.event_value or 0.0)
    return base_weight * engagement_boost * _recency_decay(event.created_at)


def get_recommendations_for_user(db: Session, user_id: str, limit: int = 10) -> List[str]:
    """
    Very simple heuristic recommender:
    - For the user, count product interactions (views + orders).
    - Recommend the top-N most interacted products.
    - If the user has no history, fall back to global top-N.
    """
    user_events = (
        db.query(UserEvent)
        .filter(UserEvent.user_id == user_id)
        .order_by(UserEvent.created_at.desc())
        .limit(MAX_EVENTS)
        .all()
    )

    if user_events:
        scores: Dict[str, float] = {}
        for event in user_events:
            if not event.product_id:
                continue
            scores[event.product_id] = scores.get(event.product_id, 0.0) + _event_score(event)
        if scores:
            ranked = sorted(scores.items(), key=lambda item: item[1], reverse=True)
            return [product_id for product_id, _ in ranked[:limit]]

    # Cold start: global top products
    global_events = (
        db.query(UserEvent)
        .order_by(UserEvent.created_at.desc())
        .limit(MAX_EVENTS)
        .all()
    )
    counts = Counter(e.product_id for e in global_events)
    return [product_id for product_id, _ in counts.most_common(limit)]

