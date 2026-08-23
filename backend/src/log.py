import logging
import datetime

logger = logging.getLogger(__name__)
logging.basicConfig(filename=f'{datetime.date.strftime("%Y-%m-%d")}_Audit_log.log', level=logging.INFO)
