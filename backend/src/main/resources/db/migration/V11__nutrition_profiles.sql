-- Nutrition profile (D32): the few body facts needed to estimate daily targets for one signed-in
-- user. Keyed by the JWT subject only (invariant 1); never logged (invariant 4). The user can
-- delete it at any time. Estimates are for healthy adults only: the two flags below, an age
-- outside 18-65 or an extreme BMI turn personal targets off (no medical advice).
CREATE TABLE nutrition_profiles (
    user_id uuid PRIMARY KEY REFERENCES app_users(id) ON DELETE CASCADE,
    birth_year int NOT NULL CHECK (birth_year BETWEEN 1900 AND 2100),
    sex text NOT NULL CHECK (sex IN ('MALE','FEMALE')),
    height_cm numeric(5,1) NOT NULL CHECK (height_cm BETWEEN 100 AND 250),
    weight_kg numeric(5,1) NOT NULL CHECK (weight_kg BETWEEN 30 AND 300),
    activity text NOT NULL CHECK (activity IN ('SEDENTARY','LIGHT','MODERATE','ACTIVE')),
    goal text NOT NULL CHECK (goal IN ('LOSE','MAINTAIN','GAIN_MUSCLE')),
    excluded_allergens text[] NOT NULL DEFAULT '{}',
    pregnant_or_breastfeeding boolean NOT NULL DEFAULT false,
    medical_condition boolean NOT NULL DEFAULT false,
    consent_at timestamptz NOT NULL,
    updated_at timestamptz NOT NULL DEFAULT now()
);
