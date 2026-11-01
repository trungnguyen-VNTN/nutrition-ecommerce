-- Synthetic development fixtures, never nutritional advice or production seed data.
INSERT INTO categories(name,slug) VALUES ('Ngũ cốc','ngu-coc'),('Các loại hạt','cac-loai-hat'),('Các loại đậu','cac-loai-dau'),('Thực phẩm khác','thuc-pham-khac');
INSERT INTO products(category_id,name,description,price,stock,serving_size,serving_unit,nutrition_complete,allergens_verified)
SELECT (i-1)%4+1, name,
       'Sản phẩm mẫu dành cho môi trường phát triển. Số liệu dinh dưỡng giả lập để kiểm thử, không dùng làm thông tin thực tế.',
       30000+i*5000, CASE WHEN i%6=0 THEN 0 ELSE 20+i END,
       CASE WHEN i%5<>0 THEN 100 END, CASE WHEN i%5<>0 THEN 'g' END, i%5<>0, i%4<>0
FROM unnest(ARRAY['Yến mạch nguyên hạt','Hạnh nhân rang mộc','Đậu lăng đỏ','Bột ca cao','Gạo lứt','Hạt chia','Đậu xanh','Sữa yến mạch','Ngũ cốc granola','Hạt bí','Đậu đỏ','Bơ đậu phộng','Hạt diêm mạch','Hạt điều','Đậu đen','Bánh gạo','Lúa mạch','Hạt hướng dương','Đậu gà','Mè rang']) WITH ORDINALITY AS seed(name,i);
INSERT INTO product_nutrition(product_id,calories,protein_g,carbs_g,fat_g,sugar_g,fiber_g,sodium_mg,source)
SELECT id,100+id*10,5+id,15+id,3+id%5,2,4,10,'synthetic-local-fixture'
FROM products WHERE nutrition_complete;
INSERT INTO product_allergens(product_id,allergen_id,kind)
SELECT id,1,'contains' FROM products WHERE id%3=0;
INSERT INTO product_allergens(product_id,allergen_id,kind)
SELECT id,2,'may_contain' FROM products WHERE id%7=0;
