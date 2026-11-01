CREATE TABLE app_users (
    id uuid PRIMARY KEY,
    created_at timestamptz NOT NULL DEFAULT now()
);
-- Cognito access tokens identify users but do not contain their email addresses.
CREATE TABLE carts (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id uuid NOT NULL UNIQUE REFERENCES app_users(id),
    updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE cart_items (
    cart_id bigint NOT NULL REFERENCES carts(id),
    product_id bigint NOT NULL REFERENCES products(id),
    quantity integer NOT NULL CHECK (quantity BETWEEN 1 AND 99),
    PRIMARY KEY (cart_id, product_id)
);
CREATE TABLE orders (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES app_users(id),
    status text NOT NULL CHECK (status IN ('PLACED','CONFIRMED','SHIPPED','DELIVERED','CANCELLED')),
    total numeric(12,2) NOT NULL CHECK (total >= 0),
    currency char(3) NOT NULL,
    shipping_name text NOT NULL,
    phone text NOT NULL,
    address text NOT NULL,
    request_key uuid NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(user_id, request_key)
);
CREATE INDEX orders_user_created_idx ON orders(user_id, created_at DESC);
CREATE TABLE order_items (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    order_id bigint NOT NULL REFERENCES orders(id),
    product_id bigint NOT NULL REFERENCES products(id),
    name_snapshot text NOT NULL,
    unit_price numeric(12,2) NOT NULL CHECK (unit_price >= 0),
    quantity integer NOT NULL CHECK (quantity BETWEEN 1 AND 99)
);
