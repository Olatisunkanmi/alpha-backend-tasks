CREATE TABLE briefings
(
    id SERIAL PRIMARY KEY,
    company_name VARCHAR(255) NOT NULL,
    ticker VARCHAR(20) NOT NULL,
    sector VARCHAR(100) NOT NULL,
    analyst_name VARCHAR(100) NOT NULL,
    summary TEXT NOT NULL,
    recommendation TEXT NOT NULL,
    is_generated BOOLEAN NOT NULL DEFAULT FALSE,
    generated_at TIMESTAMPTZ,
    html_content TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE briefing_points
(
    id SERIAL PRIMARY KEY,
    briefing_id INTEGER NOT NULL,
    content TEXT NOT NULL,
    display_order INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (briefing_id) REFERENCES briefings(id) ON DELETE CASCADE
);

CREATE TABLE briefing_risks
(
    id SERIAL PRIMARY KEY,
    briefing_id INTEGER NOT NULL,
    content TEXT NOT NULL,
    display_order INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (briefing_id) REFERENCES briefings(id) ON DELETE CASCADE
);

CREATE TABLE briefing_metrics
(
    id SERIAL PRIMARY KEY,
    briefing_id INTEGER NOT NULL,
    name VARCHAR(100) NOT NULL,
    value VARCHAR(100) NOT NULL,
    FOREIGN KEY (briefing_id) REFERENCES briefings(id) ON DELETE CASCADE
);

CREATE INDEX idx_briefing_ticker ON briefings(ticker);
CREATE INDEX idx_briefing_points_briefing_id ON briefing_points(briefing_id);
CREATE INDEX idx_briefing_risks_briefing_id ON briefing_risks(briefing_id);
CREATE INDEX idx_briefing_metrics_briefing_id ON briefing_metrics(briefing_id);
