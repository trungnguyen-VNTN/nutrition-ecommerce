CREATE TABLE categories (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name text NOT NULL UNIQUE,
    slug text NOT NULL UNIQUE
);
CREATE TABLE products (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    category_id bigint REFERENCES categories(id),
    name text NOT NULL,
    description text,
    price numeric(12,2) NOT NULL CHECK (price >= 0),
    currency char(3) NOT NULL DEFAULT 'VND',
    stock integer NOT NULL CHECK (stock >= 0),
    active boolean NOT NULL DEFAULT true,
    serving_size numeric(10,2),
    serving_unit text,
    nutrition_complete boolean NOT NULL DEFAULT false,
    allergens_verified boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX products_category_idx ON products(category_id);
CREATE INDEX products_active_idx ON products(active);
CREATE TABLE product_nutrition (
    product_id bigint PRIMARY KEY REFERENCES products(id) ON DELETE CASCADE,
    calories numeric(8,2) CHECK (calories >= 0),
    protein_g numeric(8,2) CHECK (protein_g >= 0),
    carbs_g numeric(8,2) CHECK (carbs_g >= 0),
    fat_g numeric(8,2) CHECK (fat_g >= 0),
    sugar_g numeric(8,2) CHECK (sugar_g >= 0),
    fiber_g numeric(8,2) CHECK (fiber_g >= 0),
    sodium_mg numeric(10,2) CHECK (sodium_mg >= 0),
    source text NOT NULL DEFAULT 'manual'
);
CREATE TABLE allergens (
    id smallint PRIMARY KEY,
    code text NOT NULL UNIQUE,
    name text NOT NULL
);
CREATE TABLE product_allergens (
    product_id bigint REFERENCES products(id) ON DELETE CASCADE,
    allergen_id smallint REFERENCES allergens(id),
    kind text NOT NULL CHECK (kind IN ('contains', 'may_contain')),
    PRIMARY KEY (product_id, allergen_id)
);
INSERT INTO allergens VALUES (1,'peanut','Đậu phộng'),(2,'milk','Sữa'),(3,'egg','Trứng'),(4,'soy','Đậu nành'),(5,'gluten','Gluten'),(6,'shellfish','Hải sản có vỏ');
