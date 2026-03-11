from typing import List, Optional
from sqlalchemy.orm import Session
from datetime import datetime

from app.models.briefing import Briefing, BriefingKeyPoint, BriefingRisk, BriefingMetric
from app.schemas.briefing import BriefingCreate


class BriefingService:
    @staticmethod
    def create_briefing(db: Session, briefing_in: BriefingCreate) -> Briefing:
        # Create the main briefing record
        db_briefing = Briefing(
            company_name=briefing_in.companyName,
            ticker=briefing_in.ticker,
            sector=briefing_in.sector,
            analyst_name=briefing_in.analystName,
            summary=briefing_in.summary,
            recommendation=briefing_in.recommendation
        )
        db.add(db_briefing)
        db.flush()  # To get the ID

        # Add key points
        for i, point_content in enumerate(briefing_in.keyPoints):
            db_point = BriefingKeyPoint(
                briefing_id=db_briefing.id,
                content=point_content,
                display_order=i
            )
            db.add(db_point)

        # Add risks
        for i, risk_content in enumerate(briefing_in.risks):
            db_risk = BriefingRisk(
                briefing_id=db_briefing.id,
                content=risk_content,
                display_order=i
            )
            db.add(db_risk)

        # Add metrics
        if briefing_in.metrics:
            for metric_in in briefing_in.metrics:
                db_metric = BriefingMetric(
                    briefing_id=db_briefing.id,
                    name=metric_in.name,
                    value=metric_in.value
                )
                db.add(db_metric)

        db.commit()
        db.refresh(db_briefing)
        return db_briefing

    @staticmethod
    def get_briefing(db: Session, briefing_id: int) -> Optional[Briefing]:
        return db.query(Briefing).filter(Briefing.id == briefing_id).first()

    @staticmethod
    def list_briefings(db: Session, skip: int = 0, limit: int = 100) -> List[Briefing]:
        return db.query(Briefing).offset(skip).limit(limit).all()

    @staticmethod
    def generate_report_metadata(db: Session, briefing_id: int) -> Optional[Briefing]:
        db_briefing = db.query(Briefing).filter(Briefing.id == briefing_id).first()
        if not db_briefing:
            return None
        
        db_briefing.is_generated = True
        db_briefing.generated_at = datetime.now()
        
        db.commit()
        db.refresh(db_briefing)
        return db_briefing
    
    @staticmethod
    def update_html_content(db: Session, briefing_id: int, html_content: str) -> Optional[Briefing]:
        db_briefing = db.query(Briefing).filter(Briefing.id == briefing_id).first()
        if not db_briefing:
            return None
        
        db_briefing.html_content = html_content
        db.commit()
        db.refresh(db_briefing)
        return db_briefing
