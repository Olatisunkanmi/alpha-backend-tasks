from datetime import datetime
from pathlib import Path
from typing import Any, Dict

from jinja2 import Environment, FileSystemLoader, select_autoescape
from app.models.briefing import Briefing


class ReportFormatter:
    """Formatter utility for transforming database records into a report-friendly view model."""

    def __init__(self) -> None:
        template_dir = Path(__file__).resolve().parents[1] / "templates"
        self._env = Environment(
            loader=FileSystemLoader(str(template_dir)),
            autoescape=select_autoescape(enabled_extensions=("html", "xml"), default_for_string=True),
        )

    @staticmethod
    def format_briefing_for_report(briefing: Briefing) -> Dict[str, Any]:
        """
        Transforms a Briefing database record into a dictionary suitable for template rendering.
        Includes sorting and grouping as required.
        """
        return {
            "title": f"Internal Briefing: {briefing.company_name} ({briefing.ticker})",
            "companyName": briefing.company_name,
            "ticker": briefing.ticker,
            "sector": briefing.sector,
            "analystName": briefing.analyst_name,
            "summary": briefing.summary,
            "recommendation": briefing.recommendation,
            "keyPoints": [p.content for p in sorted(briefing.key_points, key=lambda x: x.display_order)],
            "risks": [r.content for r in sorted(briefing.risks, key=lambda x: x.display_order)],
            "metrics": [{"name": m.name, "value": m.value} for m in briefing.metrics],
            "generatedAt": briefing.generated_at.strftime("%B %d, %Y at %H:%M %Z") if briefing.generated_at else "Not yet generated"
        }

    def render_report(self, view_model: Dict[str, Any]) -> str:
        """Renders the briefing report HTML using the Jinja2 template."""
        template = self._env.get_template("report.html")
        return template.render(**view_model)
