import logging
import time
from functools import wraps

logger = logging.getLogger(__name__)


def logtime(f):
    @wraps(f)
    def timed(*args, **kw):
        st = time.time()
        try:
            return f(*args, **kw)
        except Exception as e:
            logger.exception("Error in function %s: %s", f.__name__, e)
            raise
        finally:
            et = time.time()
            total = et - st
            logger.debug("Function %s took %5.2f sec", f.__name__, total)

    return timed
