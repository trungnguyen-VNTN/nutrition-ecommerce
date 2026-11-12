-- Tree nuts and sesame are major allergens needed by the nut and seed products (D23).
INSERT INTO allergens VALUES (7,'tree_nut','Các loại hạt cây'),(8,'sesame','Mè (vừng)')
ON CONFLICT (id) DO NOTHING;
