from typing import Any, Dict
from app.services.report_formatter import ReportFormatter

def render_briefing_report(view_model: Dict[str, Any]) -> str:
    """
    Utility function to render a briefing report.
    """
    formatter = ReportFormatter()
    return formatter.render_report(view_model)
