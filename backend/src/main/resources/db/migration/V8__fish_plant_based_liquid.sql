-- Catalog expansion (D26).
-- Fish is a major allergen needed by the new fish products and fish sauce.
INSERT INTO allergens VALUES (9,'fish','Cá') ON CONFLICT (id) DO NOTHING;

-- Whether a product contains no animal ingredients. NULL = unknown, so no "plant-based" label
-- is ever derived from it (fail-closed).
ALTER TABLE products ADD COLUMN plant_based boolean;
-- Drinks and other liquids are judged against the stricter per-100 ml claim thresholds.
ALTER TABLE products ADD COLUMN is_liquid boolean NOT NULL DEFAULT false;
