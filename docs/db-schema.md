# Schema cơ sở dữ liệu (bản nháp MVP)

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
| allergens_verified | boolean | NOT NULL DEFAULT false (danh sách đủ để lọc) |
| plant_based | boolean | NULL = chưa biết (không bao giờ suy ra nhãn "thuần thực vật"); V8 |
| is_liquid | boolean | NOT NULL DEFAULT false; đồ uống dùng ngưỡng claim theo 100 ml (V8) |
| allergens_reviewed_at | timestamptz | NULL; admin xác nhận allergen lúc nào (V7). Dữ liệu mẫu luôn NULL |
| created_at / updated_at | timestamptz | NOT NULL |

Index: `(category_id)`, `(active)`, tìm kiếm trên `name` bằng `unaccent(lower(...))` (extension `unaccent`, V7; catalog nhỏ nên chưa cần index trigram).

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
| code | text | NOT NULL, UNIQUE: 'peanut', 'milk', 'egg', 'soy', 'gluten', 'shellfish' (V1), 'tree_nut', 'sesame' (V6), 'fish' (V8) |
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
| s3_key | text | NOT NULL UNIQUE; khóa do server sinh: `products/{product_id}/{uuid}.{jpg|png|webp}` |
| content_type | text | NOT NULL, CHECK (`image/jpeg`, `image/png`, `image/webp`) |
| sort_order | integer | NOT NULL DEFAULT 0, CHECK (>= 0); 0 là ảnh đại diện |
| created_at | timestamptz | NOT NULL DEFAULT now() |

Tối đa 5 ảnh mỗi sản phẩm (kiểm tra trong service, khóa dòng `products`). Migration V5 (D21).

### carts / cart_items
`carts(id, user_id UNIQUE → app_users, updated_at)`
`cart_items(cart_id → carts, product_id → products, quantity CHECK (quantity > 0), PK (cart_id, product_id))`

### orders
| Cột | Kiểu | Ràng buộc |
| --- | --- | --- |
| id | bigint | PK |
| user_id | uuid | FK → app_users, NOT NULL |
| status | text | NOT NULL, CHECK (status IN ('AWAITING_PAYMENT','PLACED','CONFIRMED','SHIPPED','DELIVERED','CANCELLED')) (AWAITING_PAYMENT từ V9) |
| payment_method | text | NOT NULL DEFAULT 'COD', CHECK IN ('COD','VNPAY') (V9) |
| payment_status | text | NOT NULL DEFAULT 'UNPAID', CHECK IN ('UNPAID','PAID','REFUND_NEEDED') (V9) |
| payment_expires_at | timestamptz | Hạn giữ hàng của đơn VNPAY (V9) |
| total | numeric(12,2) | NOT NULL, CHECK (total >= 0) |
| shipping_name / phone / address | text | NOT NULL |
| created_at / updated_at | timestamptz | NOT NULL |

### nutrition_profiles (V11, D32)

Một dòng cho mỗi người dùng (`user_id` = `sub`, xóa theo `app_users`): `birth_year`, `sex`, `height_cm`, `weight_kg`, `activity`, `goal`, `excluded_allergens text[]`, `pregnant_or_breastfeeding`, `medical_condition`, `consent_at`, `updated_at`. Không log, không gửi cho model; người dùng tự xóa qua `DELETE /api/me/profile`.

### payment_events (V10, D30)

Mỗi IPN của VNPAY một dòng: `received_at`, `txn_ref` (≤ 64 ký tự chữ / số), `order_id` (null nếu không xác định; `ON DELETE SET NULL`), `signature_valid`, `gateway_code` (chỉ lưu khi chữ ký hợp lệ), `rsp_code` (mã cửa hàng trả cho VNPAY), `outcome`. Không lưu chữ ký, khóa bí mật hay thông tin khách.

### payments (V9, D27)
Mỗi lần thanh toán một dòng; không nhận và không lưu dữ liệu thẻ.

| Cột | Kiểu | Ràng buộc |
| --- | --- | --- |
| id | bigint | PK |
| order_id | bigint | FK → orders |
| provider | text | 'VNPAY' |
| txn_ref | text | UNIQUE (`vnp_TxnRef`) |
| amount | numeric(12,2) | Số tiền lúc tạo, so với `vnp_Amount / 100` |
| status | text | 'PENDING' / 'SUCCEEDED' / 'FAILED' |
| response_code / transaction_no / bank_code | text | Từ IPN |
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
