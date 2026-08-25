from sqlalchemy.orm import Session

from src.utils.log_functions import logtime


class BaseRepository:
    def __init__(self, db: Session, user_id: str) -> None:
        self.db = db
        self.user_id = user_id

    @logtime
    def _scoped_query(self, model_class):
        """

        :param model_class:
        :return:
        """
        return self.db.query(model_class).filter(model_class.user_id == self.user_id)

    @logtime
    def _create(self, instance):
        """

        :param instance:
        :return:
        """
        instance.user_id = self.user_id
        self.db.add(instance)
        self.db.flush()
        return instance
