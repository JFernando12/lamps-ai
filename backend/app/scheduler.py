"""APScheduler wrapper — fires the abandoned cart email job every 15 minutes."""
import logging

from apscheduler.schedulers.background import BackgroundScheduler

logger = logging.getLogger(__name__)

_scheduler = BackgroundScheduler(timezone="UTC")


def _run_cart_job() -> None:
    from .services.carts_service import process_abandoned_carts  # lazy import avoids circular deps

    try:
        process_abandoned_carts()
    except Exception as exc:
        logger.error("Abandoned-cart scheduler job failed: %s", exc)


def start_scheduler() -> None:
    _scheduler.add_job(_run_cart_job, "interval", minutes=15, id="abandoned_carts")
    _scheduler.start()
    logger.info("Scheduler started — abandoned-cart job runs every 15 min")


def stop_scheduler() -> None:
    if _scheduler.running:
        _scheduler.shutdown(wait=False)
