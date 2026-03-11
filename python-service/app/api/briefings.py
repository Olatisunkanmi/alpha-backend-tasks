from fastapi import APIRouter, Depends, HTTPException, status, Response
from sqlalchemy.orm import Session
from typing import List

from app.db.session import get_db
from app.schemas.briefing import BriefingCreate, BriefingRead, BriefingSummary
from app.services.briefing_service import BriefingService
from app.services.report_formatter import ReportFormatter
from app.config import get_settings

router = APIRouter(prefix="/briefings", tags=["briefings"])


@router.post("", response_model=BriefingRead, status_code=status.HTTP_201_CREATED)
def create_briefing(briefing_in: BriefingCreate, db: Session = Depends(get_db)):
    """
    Create a new briefing.
    """
    return BriefingService.create_briefing(db, briefing_in)


@router.get("/{id}", response_model=BriefingRead)
def get_briefing(id: int, db: Session = Depends(get_db)):
    """
    Retrieve a specific briefing by ID.
    """
    db_briefing = BriefingService.get_briefing(db, id)
    if not db_briefing:
        raise HTTPException(status_code=404, detail="Briefing not found")
    return db_briefing


@router.post("/{id}/generate", response_model=BriefingRead)
def generate_report(id: int, db: Session = Depends(get_db)):
    """
    Generate a report for the briefing.
    This marks the briefing as generated and renders the HTML.
    """
    db_briefing = BriefingService.get_briefing(db, id)
    if not db_briefing:
        raise HTTPException(status_code=404, detail="Briefing not found")
    
    # 1. Transform to view model
    view_model = ReportFormatter.format_briefing_for_report(db_briefing)
    
    # 2. Render HTML
    # We'll use a template engine here. For now, let's assume ReportFormatter 
    # might have a render method or we do it here.
    # To keep it clean, we'll implement template rendering in a dedicated utility or Jinja2 helper.
    from app.utils.templates import render_briefing_report
    html_content = render_briefing_report(view_model)
    
    # 3. Update DB
    BriefingService.generate_report_metadata(db, id)
    BriefingService.update_html_content(db, id, html_content)
    
    db.refresh(db_briefing)
    return db_briefing


@router.get("/{id}/html")
def get_briefing_html(id: int, db: Session = Depends(get_db)):
    """
    Return the rendered HTML for a briefing.
    """
    db_briefing = BriefingService.get_briefing(db, id)
    if not db_briefing:
        raise HTTPException(status_code=404, detail="Briefing not found")
    
    if not db_briefing.is_generated or not db_briefing.html_content:
        raise HTTPException(status_code=400, detail="Report has not been generated yet")
    
    return Response(content=db_briefing.html_content, media_type="text/html")


@router.get("", response_model=List[BriefingSummary])
def list_briefings(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """
    List briefings.
    """
    return BriefingService.list_briefings(db, skip, limit)
