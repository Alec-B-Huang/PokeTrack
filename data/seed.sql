DELETE FROM ebay_active_listings;
DELETE FROM external_price_snapshots;
DELETE FROM price_entries;
DELETE FROM cards;
DELETE FROM sqlite_sequence WHERE name IN ('cards', 'price_entries', 'external_price_snapshots', 'ebay_active_listings');

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

INSERT INTO external_price_snapshots (
  card_id,
  source,
  snapshot_date,
  search_query,
  listing_count,
  lowest_price,
  median_price,
  notes
)
VALUES
  (
    1,
    'eBay',
    '2026-05-04',
    'Charizard Base Set 4/102 Pokemon card near mint',
    8,
    229.99,
    247.50,
    'Sample snapshot for local testing. Intended for USD fixed-price listing summary data.'
  ),
  (
    2,
    'eBay',
    '2026-05-04',
    'Pikachu Jungle 60/64 Pokemon card lightly played',
    6,
    8.49,
    9.10,
    'Sample snapshot for local testing. Intended for USD fixed-price listing summary data.'
  );

INSERT INTO ebay_active_listings (
  snapshot_id,
  external_item_id,
  title,
  price,
  currency,
  listing_condition,
  listing_url,
  seller_username
)
VALUES
  (1, 'v1|100000000001|0', 'Charizard Base Set 4/102 Near Mint Holo', 229.99, 'USD', 'Used', 'https://www.ebay.com/itm/100000000001', 'cardvault01'),
  (1, 'v1|100000000002|0', 'Pokemon Charizard Base Set 4/102 LP-NM', 232.50, 'USD', 'Used', 'https://www.ebay.com/itm/100000000002', 'pokeshopwest'),
  (1, 'v1|100000000003|0', 'Charizard 4/102 Base Set Unlimited', 239.99, 'USD', 'Ungraded', 'https://www.ebay.com/itm/100000000003', 'rarecardfinder'),
  (1, 'v1|100000000004|0', 'Base Set Charizard Holofoil 4/102', 245.00, 'USD', 'Used', 'https://www.ebay.com/itm/100000000004', 'holohunter'),
  (1, 'v1|100000000005|0', 'Charizard Pokemon Base Set Holo Card', 249.95, 'USD', 'Ungraded', 'https://www.ebay.com/itm/100000000005', 'kanto_collectibles'),
  (1, 'v1|100000000006|0', 'Charizard 4/102 Classic Collection', 255.00, 'USD', 'Used', 'https://www.ebay.com/itm/100000000006', 'trainertrade'),
  (1, 'v1|100000000007|0', 'Vintage Charizard Base Set Holo', 259.99, 'USD', 'Used', 'https://www.ebay.com/itm/100000000007', 'pokemartdaily'),
  (1, 'v1|100000000008|0', 'Base Set Charizard 4/102 Pokemon Card', 264.50, 'USD', 'Ungraded', 'https://www.ebay.com/itm/100000000008', 'hobbyden');
