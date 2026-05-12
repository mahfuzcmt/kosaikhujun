-- Add butcher availability schedule
CREATE TABLE butcher_availability (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    butcher_id UUID NOT NULL REFERENCES butchers(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'AVAILABLE',  -- AVAILABLE, BOOKED, UNAVAILABLE
    note VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(butcher_id, date)
);

CREATE INDEX idx_butcher_availability_butcher ON butcher_availability(butcher_id);
CREATE INDEX idx_butcher_availability_date ON butcher_availability(date);
