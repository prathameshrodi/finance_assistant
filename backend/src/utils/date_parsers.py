from datetime import datetime

from src.utils.log_functions import logtime

formats = [
    "%Y-%m-%d",
    "%d/%m/%Y",
    "%m-%d-%Y",
    "%B %d, %Y",
    "%Y%m%d",
    "%d.%m.%Y",
    "%d-%m-%Y"
    "%d/%m/%y"
]

@logtime
def parse_date(date_string):

    for fmt in formats:
        try:
            return datetime.strptime(date_string, fmt)
        except ValueError:
            pass  # Try the next format if this one fails

    raise ValueError(f"No valid format found for: {date_string}")