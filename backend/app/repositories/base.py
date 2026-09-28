"""
backend/app/repositories/base.py
Generic Base Repository providing standardized CRUD and query operations via SQLAlchemy.
"""

from typing import Generic, TypeVar, Type, Optional, List, Any
from sqlalchemy.orm import Session
from backend.app.database import Base

ModelType = TypeVar("ModelType", bound=Base)


class BaseRepository(Generic[ModelType]):
    def __init__(self, model: Type[ModelType], db: Session):
        self.model = model
        self.db = db

    def get_by_id(self, id_val: Any) -> Optional[ModelType]:
        return self.db.query(self.model).filter(self.model.id == id_val).first()

    def list_all(self, skip: int = 0, limit: int = 100) -> List[ModelType]:
        return self.db.query(self.model).offset(skip).limit(limit).all()

    def add(self, entity: ModelType) -> ModelType:
        self.db.add(entity)
        self.db.commit()
        self.db.refresh(entity)
        return entity

    def add_many(self, entities: List[ModelType]) -> List[ModelType]:
        self.db.add_all(entities)
        self.db.commit()
        return entities

    def update(self, entity: ModelType) -> ModelType:
        self.db.commit()
        self.db.refresh(entity)
        return entity

    def delete(self, entity: ModelType) -> None:
        self.db.delete(entity)
        self.db.commit()
