from datetime import datetime
from pydantic import BaseModel, Field, field_validator
from typing import List, Optional


class MetricBase(BaseModel):
    name: str
    value: str


class MetricCreate(MetricBase):
    pass


class MetricRead(MetricBase):
    id: int
    briefing_id: int

    class Config:
        from_attributes = True


class KeyPointBase(BaseModel):
    content: str


class KeyPointCreate(KeyPointBase):
    pass


class KeyPointRead(KeyPointBase):
    id: int
    briefing_id: int
    display_order: int

    class Config:
        from_attributes = True


class RiskBase(BaseModel):
    content: str


class RiskCreate(RiskBase):
    pass


class RiskRead(RiskBase):
    id: int
    briefing_id: int
    display_order: int

    class Config:
        from_attributes = True


class BriefingBase(BaseModel):
    companyName: str = Field(..., alias="companyName")
    ticker: str
    sector: str
    analystName: str = Field(..., alias="analystName")
    summary: str
    recommendation: str

    @field_validator("ticker")
    @classmethod
    def normalize_ticker(cls, v: str) -> str:
        return v.upper()


class BriefingCreate(BriefingBase):
    keyPoints: List[str] = Field(..., alias="keyPoints", min_length=2)
    risks: List[str] = Field(..., alias="risks", min_length=1)
    metrics: Optional[List[MetricBase]] = Field(default_factory=list)

    @field_validator("metrics")
    @classmethod
    def validate_metric_names_unique(cls, v: Optional[List[MetricBase]]) -> Optional[List[MetricBase]]:
        if v:
            names = [m.name for m in v]
            if len(names) != len(set(names)):
                raise ValueError("Metric names must be unique within the same briefing")
        return v


class BriefingRead(BaseModel):
    id: int
    company_name: str
    ticker: str
    sector: str
    analyst_name: str
    summary: str
    recommendation: str
    is_generated: bool
    generated_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    
    key_points: List[KeyPointRead]
    risks: List[RiskRead]
    metrics: List[MetricRead]

    class Config:
        from_attributes = True
        populate_by_name = True


class BriefingSummary(BaseModel):
    id: int
    company_name: str
    ticker: str
    is_generated: bool
    
    class Config:
        from_attributes = True
