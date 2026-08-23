import json
import os

from src.config import settings
from src.utils.log_functions import logtime

FILE_PATH = settings.TEMP_DIR
os.makedirs(FILE_PATH, exist_ok=True)


@logtime
def write_to_file(data, file_name):
    file_path = os.path.join(FILE_PATH, file_name)
    with open(file_path, "w", encoding="utf-8") as file:
        json.dump(data, file, indent=4)


@logtime
def check_for_old_record(file_name):
    file_path = os.path.join(FILE_PATH, file_name)
    return os.path.exists(file_path)


@logtime
def delete_file(file_name):
    file_path = os.path.join(FILE_PATH, file_name)
    if os.path.exists(file_path):
        os.remove(file_path)


@logtime
def read_from_file(file_name):
    file_path = os.path.join(FILE_PATH, file_name)
    if os.path.exists(file_path):
        with open(file_path, "r", encoding="utf-8") as file:
            return json.load(file)
    return None


@logtime
def get_file_name(file_path: str) -> str:
    return os.path.splitext(os.path.basename(file_path))[0]
