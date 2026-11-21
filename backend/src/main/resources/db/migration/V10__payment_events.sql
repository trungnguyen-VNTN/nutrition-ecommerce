-- Admin payment log (D30): one row per VNPAY IPN received, whatever the outcome, so an admin can see
-- what the gateway sent and how the shop answered. Never stores the secure hash, card data or
-- customer details. The txn_ref of an IPN with a bad signature is untrusted: it is kept only as a
-- short alphanumeric value, flagged by signature_valid = false.
CREATE TABLE payment_events (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    received_at timestamptz NOT NULL DEFAULT now(),
    provider text NOT NULL DEFAULT 'VNPAY' CHECK (provider IN ('VNPAY')),
    txn_ref text CHECK (char_length(txn_ref) <= 64),
    order_id bigint REFERENCES orders(id) ON DELETE SET NULL,
    signature_valid boolean NOT NULL,
    gateway_code text CHECK (char_length(gateway_code) <= 8),
    rsp_code text NOT NULL CHECK (char_length(rsp_code) <= 4),
    outcome text NOT NULL CHECK (outcome IN (
        'PAID','PAYMENT_FAILED','REFUND_NEEDED','DUPLICATE',
        'INVALID_SIGNATURE','UNKNOWN_ORDER','INVALID_AMOUNT','DISABLED'))
);
CREATE INDEX payment_events_received_idx ON payment_events(received_at DESC);
