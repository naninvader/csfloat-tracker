INSERT INTO users (email, password_hash)
VALUES ('demo@cs2suite.local', '$2a$12$Qw0lGrLFe5i43RyTqccPseZk7Aj3L1vS48XNvmn/0XAn9JqCkK4vK');

INSERT INTO items (user_id, market_hash_name, display_name)
VALUES (1, 'AK-47 | Redline (Field-Tested)', 'AK-47 | Redline (Field-Tested)');

INSERT INTO holdings (user_id, item_id, quantity, purchase_price_cents, purchase_date, notes, tags)
VALUES (1, 1, 2, 12000, '2024-01-15', 'Demo holding', '["rifle", "demo"]');

INSERT INTO portfolios (user_id, name)
VALUES (1, 'Main Portfolio');

INSERT INTO portfolio_holdings (portfolio_id, holding_id)
VALUES (1, 1);
