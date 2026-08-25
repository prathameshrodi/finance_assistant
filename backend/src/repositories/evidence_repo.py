import hashlib
import json
from datetime import datetime

from src.models import EvidenceQuery
from src.repositories.base import BaseRepository
from src.utils.log_functions import logtime


class EvidenceRepository(BaseRepository):

    @logtime
    def create_evidence(
        self,
        query_template: str,
        query_params: dict,
        result_snapshot: dict,
        session_id: str | None = None,
    ) -> EvidenceQuery:
        """Stores a deterministic evidence snapshot for an AI claim."""
        canonical = json.dumps(result_snapshot, sort_keys=True, default=str)
        result_hash = hashlib.sha256(canonical.encode()).hexdigest()

        evidence = EvidenceQuery(
            user_id=self.user_id,
            session_id=session_id,
            query_template=query_template,
            query_params=query_params,
            result_hash=result_hash,
            result_snapshot=result_snapshot,
            created_at=datetime.utcnow(),
        )
        self._create(evidence)
        self.db.commit()
        self.db.refresh(evidence)
        return evidence

    @logtime
    def get_evidence_by_id(self, evidence_id: str) -> EvidenceQuery | None:
        """Retrieves an evidence record for independent verification."""
        return self._scoped_query(EvidenceQuery).filter(EvidenceQuery.id == evidence_id).first()
