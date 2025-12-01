from collections import Counter
from typing import List

from sqlalchemy.orm import Session

from .models import UserEvent


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
        .all()
    )

    if user_events:
        counts = Counter(e.product_id for e in user_events)
        return [product_id for product_id, _ in counts.most_common(limit)]

    # Cold start: global top products
    global_events = db.query(UserEvent).all()
    counts = Counter(e.product_id for e in global_events)
    return [product_id for product_id, _ in counts.most_common(limit)]

