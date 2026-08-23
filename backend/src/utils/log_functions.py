import time
from functools import wraps
import logging

logger = logging.getLogger(__name__)

def logtime(f):
    @wraps(f)
    def timed(*args, **kw):
        st = time.time()
        try:
            result = f(*args, **kw)
            return result
        except Exception as e:
            import traceback
            traceback.print_exc()
            logger.info(str(e))
        finally:
            et = time.time()
            total = et-st
            logger.info(f"Function {f.__name__} took {total:5.2f} sec")
    return timed
