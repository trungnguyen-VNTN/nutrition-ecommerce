# Schema cơ sở dữ liệu (bản nháp MVP)

> Đây là bản nháp để Codex dùng làm điểm xuất phát cho migration Flyway. Codex cập nhật file này khi schema thay đổi. Không tạo bảng chưa dùng.
> Danh tính người dùng nằm ở Cognito; `app_users.id` là claim `sub`.

## Bảng

### app_users
| Cột | Kiểu | Ràng buộc |
| --- | --- | --- |
| id | uuid | PK (= Cognito `sub`) |
| email | text | NOT NULL |
| display_name | text | |
| created_at | timestamptz | NOT NULL DEFAULT now() |

### categories
| Cột | Kiểu | Ràng buộc |
| --- | --- | --- |
| id | bigint | PK, identity |
| name | text | NOT NULL, UNIQUE |
| slug | text | NOT NULL, UNIQUE |

### products
| Cột | Kiểu | Ràng buộc |
| --- | --- | --- |
| id | bigint | PK, identity |
| category_id | bigint | FK → categories |
| name | text | NOT NULL |
| description | text | |
| price | numeric(12,2) | NOT NULL, CHECK (price >= 0) |
| currency | char(3) | NOT NULL DEFAULT 'VND' |
| stock | integer | NOT NULL, CHECK (stock >= 0) |
| active | boolean | NOT NULL DEFAULT true |
| serving_size | numeric(10,2) | |
| serving_unit | text | vd. 'g', 'ml' |
| nutrition_complete | boolean | NOT NULL DEFAULT false |
| allergens_verified | boolean | NOT NULL DEFAULT false |
| created_at / updated_at | timestamptz | NOT NULL |

Index: `(category_id)`, `(active)`, tìm kiếm văn bản trên `name` (🔎 chọn `pg_trgm` hoặc full-text khi làm giai đoạn 4).

### product_nutrition
Tính theo **một khẩu phần** (`serving_size`/`serving_unit` của sản phẩm).

| Cột | Kiểu | Ràng buộc |
| --- | --- | --- |
| product_id | bigint | PK, FK → products ON DELETE CASCADE |
| calories | numeric(8,2) | CHECK (calories >= 0) |
| protein_g | numeric(8,2) | CHECK (>= 0) |
| carbs_g | numeric(8,2) | CHECK (>= 0) |
| fat_g | numeric(8,2) | CHECK (>= 0) |
| sugar_g | numeric(8,2) | CHECK (>= 0) |
| fiber_g | numeric(8,2) | CHECK (>= 0) |
| sodium_mg | numeric(10,2) | CHECK (>= 0) |
| source | text | NOT NULL DEFAULT 'manual' |

Quy tắc: `products.nutrition_complete = true` chỉ khi các trường bắt buộc (calories, protein_g, carbs_g, fat_g, serving_size) đều có giá trị.

### allergens
| Cột | Kiểu | Ràng buộc |
| --- | --- | --- |
| id | smallint | PK |
| code | text | NOT NULL, UNIQUE (vd. 'peanut', 'milk', 'egg', 'soy', 'gluten', 'shellfish') |
| name | text | NOT NULL |

### product_allergens
| Cột | Kiểu | Ràng buộc |
| --- | --- | --- |
| product_id | bigint | FK → products ON DELETE CASCADE |
| allergen_id | smallint | FK → allergens |
| kind | text | NOT NULL, CHECK (kind IN ('contains','may_contain')) |
| | | PK (product_id, allergen_id) |

### diet_tags / product_diet_tags
`diet_tags(id, code UNIQUE)` (vd. 'vegan', 'vegetarian', 'gluten_free'); `product_diet_tags(product_id, diet_tag_id)` PK kép.

### product_images
| Cột | Kiểu | Ràng buộc |
| --- | --- | --- |
| id | bigint | PK |
| product_id | bigint | FK → products ON DELETE CASCADE |
| s3_key | text | NOT NULL |
| sort_order | integer | NOT NULL DEFAULT 0 |

### carts / cart_items
`carts(id, user_id UNIQUE → app_users, updated_at)`
`cart_items(cart_id → carts, product_id → products, quantity CHECK (quantity > 0), PK (cart_id, product_id))`

### orders
| Cột | Kiểu | Ràng buộc |
| --- | --- | --- |
| id | bigint | PK |
| user_id | uuid | FK → app_users, NOT NULL |
| status | text | NOT NULL, CHECK (status IN ('PLACED','CONFIRMED','SHIPPED','DELIVERED','CANCELLED')) |
| total | numeric(12,2) | NOT NULL, CHECK (total >= 0) |
| shipping_name / phone / address | text | NOT NULL |
| created_at / updated_at | timestamptz | NOT NULL |

### order_items
| Cột | Kiểu | Ràng buộc |
| --- | --- | --- |
| id | bigint | PK |
| order_id | bigint | FK → orders ON DELETE CASCADE |
| product_id | bigint | FK → products |
| name_snapshot | text | NOT NULL (tên tại thời điểm đặt) |
| unit_price | numeric(12,2) | NOT NULL |
| quantity | integer | NOT NULL, CHECK (quantity > 0) |

### chat_usage (quota AI)
`chat_usage(user_id, day date, request_count integer, PK (user_id, day))`

## Câu lệnh quan trọng

Trừ kho có điều kiện (trong cùng transaction với tạo đơn). Nếu số dòng bị ảnh hưởng = 0 → hết hàng → rollback:

```sql
UPDATE products
SET stock = stock - :qty, updated_at = now()
WHERE id = :productId AND active AND stock >= :qty;
```

Hủy đơn hoàn kho: cộng lại `stock` cho từng `order_items` trong cùng transaction với đổi trạng thái.

## Máy trạng thái đơn

```text
PLACED ─► CONFIRMED ─► SHIPPED ─► DELIVERED
  │           │
  └───────────┴──► CANCELLED   (hoàn kho)
```

- User: xem đơn của mình; hủy khi `PLACED`.
- Admin: xem mọi đơn; chuyển trạng thái hợp lệ; hủy khi `PLACED` hoặc `CONFIRMED`.

## Mở rộng sau MVP (chưa tạo)

`nutrition_profiles`, `diet_preferences`, `recommendations`, `recommendation_items`, `meal_plans`, `meal_plan_items`, `user_events`.
