-- Online payment with VNPAY sandbox (D27). Cash on delivery stays the default.
-- A VNPAY order waits in AWAITING_PAYMENT with its stock held until payment_expires_at; it becomes
-- PLACED only when a signed IPN confirms the payment, or CANCELLED (stock returned) when it expires.
ALTER TABLE orders DROP CONSTRAINT orders_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_status_check
    CHECK (status IN ('AWAITING_PAYMENT','PLACED','CONFIRMED','SHIPPED','DELIVERED','CANCELLED'));
ALTER TABLE orders ADD COLUMN payment_method text NOT NULL DEFAULT 'COD'
    CHECK (payment_method IN ('COD','VNPAY'));
-- UNPAID: nothing received yet (or cash on delivery). PAID: confirmed by IPN.
-- REFUND_NEEDED: money was received but the order was cancelled; an admin refunds it by hand.
ALTER TABLE orders ADD COLUMN payment_status text NOT NULL DEFAULT 'UNPAID'
    CHECK (payment_status IN ('UNPAID','PAID','REFUND_NEEDED'));
ALTER TABLE orders ADD COLUMN payment_expires_at timestamptz;
CREATE INDEX orders_awaiting_payment_idx ON orders(payment_expires_at) WHERE status = 'AWAITING_PAYMENT';

-- One row per payment attempt. No card data is ever received or stored.
CREATE TABLE payments (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    order_id bigint NOT NULL REFERENCES orders(id),
    provider text NOT NULL CHECK (provider IN ('VNPAY')),
    txn_ref text NOT NULL UNIQUE,
    amount numeric(12,2) NOT NULL CHECK (amount >= 0),
    status text NOT NULL CHECK (status IN ('PENDING','SUCCEEDED','FAILED')),
    response_code text,
    transaction_no text,
    bank_code text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX payments_order_idx ON payments(order_id);
