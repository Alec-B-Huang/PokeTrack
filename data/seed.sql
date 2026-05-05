DELETE FROM price_entries;
DELETE FROM cards;
DELETE FROM sqlite_sequence WHERE name IN ('cards', 'price_entries');

INSERT INTO cards (name, set_name, card_number, card_condition, owned_quantity, average_buy_price)
VALUES
  ('Charizard', 'Base Set', '4/102', 'Raw/Near Mint', 1, 180.00),
  ('Pikachu', 'Jungle', '60/64', 'Lightly Played', 3, 8.50),
  ('Umbreon', 'Neo Discovery', '13/75', 'Raw/Near Mint', 1, 95.00);

INSERT INTO price_entries (card_id, entry_date, raw_price, psa9_price, psa10_price, notes)
VALUES
  (1, '2026-04-27', 225.00, 1200.00, 6800.00, 'Local show estimate'),
  (1, '2026-05-04', 240.00, 1250.00, 7000.00, 'Recent sold listings looked stronger'),
  (2, '2026-04-27', 10.00, 55.00, 220.00, 'Steady demand'),
  (2, '2026-05-04', 9.25, 54.00, 215.00, 'Slight pullback this week'),
  (3, '2026-05-02', 118.00, 350.00, 1200.00, 'Only one fresh comp found');
