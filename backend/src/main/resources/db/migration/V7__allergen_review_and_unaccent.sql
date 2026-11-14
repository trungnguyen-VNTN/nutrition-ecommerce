-- Phase 7 review.
-- allergens_verified keeps its meaning for filtering: the allergen list is complete enough to filter on
-- (fail-closed, invariant 3). Whether a person actually confirmed it is recorded separately, so the UI
-- never calls seed or demo data "verified". Only the admin allergen endpoint sets this column.
ALTER TABLE products ADD COLUMN allergens_reviewed_at timestamptz;

-- Accent-insensitive product search ("yen mach" finds "Yến mạch"; unaccent maps đ to d).
CREATE EXTENSION IF NOT EXISTS unaccent;
