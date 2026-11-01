CREATE TABLE chat_usage (
    user_id uuid NOT NULL,
    day date NOT NULL,
    request_count integer NOT NULL CHECK (request_count > 0),
    PRIMARY KEY(user_id,day)
);
