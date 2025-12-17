from pydantic import BaseModel
from typing import List, Optional

class ExpandRequest(BaseModel):
    node: str
    context: str
    model: str
    temperature: float
    recent_nodes: List[str] = []


class AnalysisRequest(BaseModel):
    node: str
    context: str
    model: str
    mode: str
    difficulty: Optional[str] = "medium"
    num_questions: Optional[int] = 3


class RandomTopicRequest(BaseModel):
    model: str
