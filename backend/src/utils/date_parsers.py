from datetime import date, datetime

import dateparser

from src.utils.log_functions import logtime

formats = [
    "%Y-%m-%d",
    "%d/%m/%Y",
    "%m-%d-%Y",
    "%B %d, %Y",
    "%b %d, %Y",
    "%d %B %Y",
    "%d %b %Y",
    "%Y%m%d",
    "%d.%m.%Y",
    "%d-%m-%Y",
    "%d/%m/%y",
]


@logtime
def parse_date(date_string):
    if isinstance(date_string, datetime):
        return date_string
    if isinstance(date_string, date):
        return datetime(date_string.year, date_string.month, date_string.day)

    if not date_string or not str(date_string).strip():
        raise ValueError("Empty date string provided")

    cleaned = str(date_string).strip()

    for fmt in formats:
        try:
            return datetime.strptime(cleaned, fmt)
        except ValueError:
            pass

    # Fallback to dateparser
    parsed = dateparser.parse(cleaned)
    if parsed:
        return parsed

    raise ValueError(f"No valid format found for: {date_string}")
