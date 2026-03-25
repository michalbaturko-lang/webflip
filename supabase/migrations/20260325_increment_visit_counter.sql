-- Atomic increment function for landing page visits
CREATE OR REPLACE FUNCTION increment_landing_page_visits(record_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE crm_records
  SET
    landing_page_visits = COALESCE(landing_page_visits, 0) + 1,
    last_visit_date = NOW()
  WHERE id = record_id;
END;
$$ LANGUAGE plpgsql;
