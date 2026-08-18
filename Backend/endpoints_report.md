# Backend API Endpoints Report

## AUTH (4 endpoints)

- **POST** `/login/{role}` — `login()`
  - Auth: `get_db`
  - File: `login.py`
  - No description

- **POST** `/logout` — `logout()`
  - Auth: `get_db, get_current_user`
  - File: `logout.py`
  - No description

- **GET** `/me` — `me()`
  - Auth: `get_current_user`
  - File: `me.py`
  - Return the authenticated user's profile serialized with the correct Pydantic schema

- **POST** `/refresh` — `refresh()`
  - Auth: `get_db`
  - File: `refresh.py`
  - No description

## BILL_SETTINGS (4 endpoints)

- **GET** `/admin/store/{store_id}` — `get_bill_settings_admin()`
  - Auth: `get_current_admin, get_db`
  - File: `operations.py`
  - No description

- **PUT** `/admin/store/{store_id}` — `update_bill_settings_admin()`
  - Auth: `get_current_admin, get_db`
  - File: `operations.py`
  - No description

- **GET** `/shopkeeper` — `get_bill_settings_shopkeeper()`
  - Auth: `require_permission(stores:read, sales:read, sales:create, sales:update), get_db`
  - File: `operations.py`
  - No description

- **PUT** `/shopkeeper` — `update_bill_settings_shopkeeper()`
  - Auth: `require_permission(stores:update), get_db`
  - File: `operations.py`
  - No description

## BRAND (5 endpoints)

- **POST** `/` — `create_brand_endpoint()`
  - Auth: `get_db, require_permission(brands, create)`
  - File: `create.py`
  - No description

- **DELETE** `/{brand_id}` — `delete_brand_endpoint()`
  - Auth: `get_db, require_permission(brands, delete)`
  - File: `delete.py`
  - No description

- **GET** `/` — `list_brands()`
  - Auth: `get_db, require_permission(brands, read)`
  - File: `read.py`
  - No description

- **GET** `/{brand_id}` — `get_brand_endpoint()`
  - Auth: `get_db, require_permission(brands, read)`
  - File: `read.py`
  - No description

- **PUT** `/{brand_id}` — `update_brand_endpoint()`
  - Auth: `get_db, require_permission(brands, update)`
  - File: `update.py`
  - No description

## CATEGORY (9 endpoints)

- **POST** `/` — `create_category_endpoint()`
  - Auth: `get_db, require_permission(categories, create)`
  - File: `create.py`
  - No description

- **POST** `/{category_id}/subcategories` — `create_subcategory_endpoint()`
  - Auth: `get_db, require_permission(categories, create)`
  - File: `create.py`
  - No description

- **DELETE** `/{category_id}` — `delete_category_endpoint()`
  - Auth: `get_db, require_permission(categories, delete)`
  - File: `delete.py`
  - No description

- **DELETE** `/subcategories/{subcategory_id}` — `delete_subcategory_endpoint()`
  - Auth: `get_db, require_permission(categories, delete)`
  - File: `delete.py`
  - No description

- **GET** `/` — `list_categories()`
  - Auth: `get_db, require_permission(categories, read)`
  - File: `read.py`
  - No description

- **GET** `/{category_id}` — `get_category_endpoint()`
  - Auth: `get_db, require_permission(categories, read)`
  - File: `read.py`
  - No description

- **GET** `/{category_id}/subcategories` — `list_subcategories()`
  - Auth: `get_db, require_permission(categories, read)`
  - File: `read.py`
  - No description

- **PUT** `/{category_id}` — `update_category_endpoint()`
  - Auth: `get_db, require_permission(categories, update)`
  - File: `update.py`
  - No description

- **PUT** `/subcategories/{subcategory_id}` — `update_subcategory_endpoint()`
  - Auth: `get_db, require_permission(categories, update)`
  - File: `update.py`
  - No description

## CUSTOMER (11 endpoints)

- **POST** `/` — `create_customer_endpoint()`
  - Auth: `get_db, require_permission(customers:create, sales:create)`
  - File: `create.py`
  - No description

- **POST** `/quick-create` — `quick_create_customer()`
  - Auth: `get_db, require_permission(sales:create)`
  - File: `create.py`
  - No description

- **GET** `/{customer_id}/links` — `list_links()`
  - Auth: `get_db, require_permission(customers:read, sales:create)`
  - File: `links.py`
  - No description

- **POST** `/{customer_id}/links` — `create_link()`
  - Auth: `get_db, require_permission(customers:update, sales:create)`
  - File: `links.py`
  - No description

- **DELETE** `/{customer_id}/links/{linked_id}` — `delete_link()`
  - Auth: `get_db, require_permission(customers:update, sales:create)`
  - File: `links.py`
  - No description

- **GET** `/` — `list_customers_endpoint()`
  - Auth: `get_db, require_permission(customers, read)`
  - File: `read.py`
  - No description

- **GET** `/phone/{phone}` — `get_by_phone_endpoint()`
  - Auth: `get_db, require_permission(customers, read)`
  - File: `read.py`
  - No description

- **GET** `/{customer_id}` — `get_customer_endpoint()`
  - Auth: `get_db, require_permission(customers, read)`
  - File: `read.py`
  - No description

- **POST** `/{customer_id}/orders` — `create_manual_order()`
  - Auth: `get_db, require_permission(sales, create)`
  - File: `read.py`
  - No description

- **PUT** `/{customer_id}` — `update_customer_endpoint()`
  - Auth: `get_db, require_permission(customers, update)`
  - File: `update.py`
  - No description

- **DELETE** `/{customer_id}` — `delete_customer_endpoint()`
  - Auth: `get_db, require_permission(customers, delete)`
  - File: `update.py`
  - No description

## DEADSTOCK (5 endpoints)

- **GET** `/` — `list_deadstock_endpoint()`
  - Auth: `get_db, require_permission(deadstock, read)`
  - File: `read.py`
  - No description

- **GET** `/pos-available` — `list_pos_available_deadstock_endpoint()`
  - Auth: `get_db, require_permission(sales, create)`
  - File: `read.py`
  - No description

- **GET** `/{item_id}` — `get_deadstock_item_endpoint()`
  - Auth: `get_db, require_permission(deadstock, read)`
  - File: `read.py`
  - No description

- **POST** `/{item_id}/reuse` — `reuse_deadstock_endpoint()`
  - Auth: `get_db, require_permission(deadstock, update)`
  - File: `update.py`
  - No description

- **POST** `/batch-reuse` — `batch_reuse_deadstock_endpoint()`
  - Auth: `get_db, require_permission(deadstock, update)`
  - File: `update.py`
  - No description

## EXCHANGE (5 endpoints)

- **POST** `/` — `create_exchange_endpoint()`
  - Auth: `get_db, require_permission(exchanges, create)`
  - File: `create.py`
  - No description

- **GET** `/` — `list_exchanges_endpoint()`
  - Auth: `get_db, require_permission(exchanges, read)`
  - File: `read.py`
  - No description

- **GET** `/{exchange_id}` — `get_exchange_endpoint()`
  - Auth: `get_db, require_permission(exchanges, read)`
  - File: `read.py`
  - No description

- **GET** `/{exchange_id}/receipt` — `get_exchange_receipt_endpoint()`
  - Auth: `get_db, require_permission(exchanges, read)`
  - File: `read.py`
  - No description

- **POST** `/{exchange_id}/cancel` — `cancel_exchange_endpoint()`
  - Auth: `get_db, require_permission(exchanges, delete)`
  - File: `update.py`
  - No description

## EXPENSE (14 endpoints)

- **POST** `/` — `create_category_endpoint()`
  - Auth: `get_db, get_current_admin`
  - File: `categories.py`
  - No description

- **GET** `/` — `list_categories_endpoint()`
  - Auth: `get_db, require_permission(expenses, read)`
  - File: `categories.py`
  - No description

- **GET** `/{category_id}` — `get_category_endpoint()`
  - Auth: `get_db, require_permission(expenses, read)`
  - File: `categories.py`
  - No description

- **PUT** `/{category_id}` — `update_category_endpoint()`
  - Auth: `get_db, get_current_admin`
  - File: `categories.py`
  - No description

- **DELETE** `/{category_id}` — `delete_category_endpoint()`
  - Auth: `get_db, get_current_admin`
  - File: `categories.py`
  - No description

- **POST** `/` — `create_expense_endpoint()`
  - Auth: `get_db, require_permission(expenses, create)`
  - File: `operations.py`
  - No description

- **GET** `/` — `list_expenses_endpoint()`
  - Auth: `get_db, require_permission(expenses, read)`
  - File: `operations.py`
  - No description

- **GET** `/{expense_id}` — `get_expense_endpoint()`
  - Auth: `get_db, require_permission(expenses, read)`
  - File: `operations.py`
  - No description

- **PUT** `/{expense_id}` — `update_expense_endpoint()`
  - Auth: `get_db, require_permission(expenses, update)`
  - File: `operations.py`
  - No description

- **PATCH** `/{expense_id}/approve` — `approve_expense_endpoint()`
  - Auth: `get_db, get_current_admin`
  - File: `operations.py`
  - No description

- **PUT** `/{expense_id}/approve` — `approve_expense_endpoint()`
  - Auth: `get_db, get_current_admin`
  - File: `operations.py`
  - No description

- **PATCH** `/{expense_id}/reject` — `reject_expense_endpoint()`
  - Auth: `get_db, get_current_admin`
  - File: `operations.py`
  - No description

- **PUT** `/{expense_id}/reject` — `reject_expense_endpoint()`
  - Auth: `get_db, get_current_admin`
  - File: `operations.py`
  - No description

- **DELETE** `/{expense_id}` — `delete_expense_endpoint()`
  - Auth: `get_db, require_permission(expenses, delete)`
  - File: `operations.py`
  - No description

## INVENTORY (11 endpoints)

- **POST** `/barcode-pdf` — `download_barcode_pdf()`
  - Auth: `get_db, require_permission(inventory, read)`
  - File: `barcode_download.py`
  - Generate a PDF with 1D Code 128 barcode labels for product units.

- **POST** `/` — `create_inventory_endpoint()`
  - Auth: `get_db, require_permission(inventory, create)`
  - File: `create.py`
  - Create an inventory record.

- **GET** `/` — `list_product_units()`
  - Auth: `get_db, require_permission(inventory, read)`
  - File: `product_units.py`
  - List product units, filtered by various criteria.

- **GET** `/lookup/{unit_sku}` — `lookup_product_unit()`
  - Auth: `get_db, require_permission(inventory, read)`
  - File: `product_units.py`
  - Lookup a specific product unit by its SKU.

- **GET** `/` — `list_inventories()`
  - Auth: `get_db, require_permission(inventory, read)`
  - File: `read.py`
  - No description

- **GET** `/warehouse` — `list_warehouse_inventories()`
  - Auth: `get_db, require_permission(inventory, read)`
  - File: `read.py`
  - No description

- **GET** `/low-stock` — `low_stock_items()`
  - Auth: `get_db, require_permission(inventory, read)`
  - File: `read.py`
  - No description

- **GET** `/universal` — `universal_search_inventories()`
  - Auth: `get_db, require_permission(inventory, read)`
  - File: `read.py`
  - No description

- **GET** `/{inventory_id}` — `get_inventory_endpoint()`
  - Auth: `get_db, require_permission(inventory, read)`
  - File: `read.py`
  - No description

- **GET** `/{inventory_id}/batches` — `get_inventory_batches_endpoint()`
  - Auth: `get_db, require_permission(inventory, read)`
  - File: `read.py`
  - No description

- **PUT** `/{inventory_id}` — `update_inventory_endpoint()`
  - Auth: `get_db, require_permission(inventory, update)`
  - File: `update.py`
  - No description

## LAB (6 endpoints)

- **POST** `/` — `create_lab_endpoint()`
  - Auth: `get_db, require_permission(labs, create)`
  - File: `create.py`
  - No description

- **DELETE** `/{lab_id}` — `delete_lab_endpoint()`
  - Auth: `get_db, require_permission(labs, delete)`
  - File: `delete.py`
  - No description

- **GET** `/` — `list_labs()`
  - Auth: `get_db, require_permission(labs, read)`
  - File: `read.py`
  - No description

- **GET** `/{lab_id}` — `get_lab_endpoint()`
  - Auth: `get_db, require_permission(labs, read)`
  - File: `read.py`
  - No description

- **GET** `/{lab_id}/orders` — `get_lab_orders_endpoint()`
  - Auth: `get_db, require_permission(labs, read)`
  - File: `read.py`
  - No description

- **PUT** `/{lab_id}` — `update_lab_endpoint()`
  - Auth: `get_db, require_permission(labs, update)`
  - File: `update.py`
  - No description

## LOYALTY (27 endpoints)

- **POST** `/admin/store/{store_id}/loyalty/adjust` — `adjust_loyalty_points_admin()`
  - Auth: `get_db, require_permission(loyalty, read)`
  - File: `adjust.py`
  - No description

- **POST** `/shopkeeper/loyalty/adjust` — `adjust_loyalty_points_shopkeeper()`
  - Auth: `get_db, require_permission(loyalty, update)`
  - File: `adjust.py`
  - No description

- **GET** `/admin/store/{store_id}/loyalty/categories` — `get_loyalty_categories_admin()`
  - Auth: `get_db, require_permission(loyalty, read)`
  - File: `categories.py`
  - No description

- **PUT** `/admin/store/{store_id}/loyalty/categories/{category_id}` — `update_loyalty_category_admin()`
  - Auth: `get_db, require_permission(loyalty, read)`
  - File: `categories.py`
  - No description

- **GET** `/shopkeeper/loyalty/categories` — `get_loyalty_categories_shopkeeper()`
  - Auth: `get_db, require_permission(loyalty, read)`
  - File: `categories.py`
  - No description

- **PUT** `/shopkeeper/loyalty/categories/{category_id}` — `update_loyalty_category_shopkeeper()`
  - Auth: `get_db, require_permission(loyalty, manage)`
  - File: `categories.py`
  - No description

- **GET** `/admin/loyalty/configs` — `get_loyalty_configs_all_admin()`
  - Auth: `get_db, require_permission(loyalty, read)`
  - File: `config.py`
  - No description

- **GET** `/admin/store/{store_id}/loyalty/config` — `get_loyalty_config_admin()`
  - Auth: `get_db, require_permission(loyalty, read)`
  - File: `config.py`
  - No description

- **PUT** `/admin/store/{store_id}/loyalty/config` — `update_loyalty_config_admin()`
  - Auth: `get_db, require_permission(loyalty, read)`
  - File: `config.py`
  - No description

- **GET** `/shopkeeper/loyalty/config` — `get_loyalty_config_shopkeeper()`
  - Auth: `get_db, require_permission(loyalty, read)`
  - File: `config.py`
  - No description

- **PUT** `/shopkeeper/loyalty/config` — `update_loyalty_config_shopkeeper()`
  - Auth: `get_db, require_permission(loyalty, manage)`
  - File: `config.py`
  - No description

- **GET** `/admin/loyalty/customers` — `get_loyalty_customers_all_admin()`
  - Auth: `get_db, require_permission(loyalty, read)`
  - File: `customers.py`
  - No description

- **GET** `/admin/loyalty/customers/{customer_id}` — `get_loyalty_customer_detail_all_admin()`
  - Auth: `get_db, require_permission(loyalty, read)`
  - File: `customers.py`
  - No description

- **GET** `/admin/store/{store_id}/loyalty/customers` — `get_loyalty_customers_admin()`
  - Auth: `get_db, require_permission(loyalty, read)`
  - File: `customers.py`
  - No description

- **GET** `/admin/store/{store_id}/loyalty/customers/{customer_id}` — `get_loyalty_customer_detail_admin()`
  - Auth: `get_db, require_permission(loyalty, read)`
  - File: `customers.py`
  - No description

- **GET** `/shopkeeper/loyalty/customers` — `get_loyalty_customers_shopkeeper()`
  - Auth: `get_db, require_permission(loyalty, read)`
  - File: `customers.py`
  - No description

- **GET** `/shopkeeper/loyalty/customers/{customer_id}` — `get_loyalty_customer_detail_shopkeeper()`
  - Auth: `get_db, require_permission(loyalty, read)`
  - File: `customers.py`
  - No description

- **POST** `/shopkeeper/loyalty/calculate-preview` — `calculate_loyalty_preview()`
  - Auth: `get_db, require_permission(loyalty, read)`
  - File: `preview.py`
  - No description

- **GET** `/admin/loyalty/stats` — `get_loyalty_stats_all_admin()`
  - Auth: `get_db, require_permission(loyalty, read)`
  - File: `stats.py`
  - No description

- **GET** `/admin/loyalty/trends` — `get_loyalty_trends_all_admin()`
  - Auth: `get_db, require_permission(loyalty, read)`
  - File: `stats.py`
  - No description

- **GET** `/admin/loyalty/tier-distribution` — `get_loyalty_tier_distribution_all_admin()`
  - Auth: `get_db, require_permission(loyalty, read)`
  - File: `stats.py`
  - No description

- **GET** `/admin/store/{store_id}/loyalty/stats` — `get_loyalty_stats_admin()`
  - Auth: `get_db, require_permission(loyalty, read)`
  - File: `stats.py`
  - No description

- **GET** `/admin/store/{store_id}/loyalty/trends` — `get_loyalty_trends_admin()`
  - Auth: `get_db, require_permission(loyalty, read)`
  - File: `stats.py`
  - No description

- **GET** `/admin/store/{store_id}/loyalty/tier-distribution` — `get_loyalty_tier_distribution_admin()`
  - Auth: `get_db, require_permission(loyalty, read)`
  - File: `stats.py`
  - No description

- **GET** `/shopkeeper/loyalty/stats` — `get_loyalty_stats_shopkeeper()`
  - Auth: `get_db, require_permission(loyalty, read)`
  - File: `stats.py`
  - No description

- **GET** `/shopkeeper/loyalty/trends` — `get_loyalty_trends_shopkeeper()`
  - Auth: `get_db, require_permission(loyalty, read)`
  - File: `stats.py`
  - No description

- **GET** `/shopkeeper/loyalty/tier-distribution` — `get_loyalty_tier_distribution_shopkeeper()`
  - Auth: `get_db, require_permission(loyalty, read)`
  - File: `stats.py`
  - No description

## MANAGER (5 endpoints)

- **POST** `/{store_id}/managers` — `create_manager_endpoint()`
  - Auth: `get_db, require_permission(managers, create)`
  - File: `create.py`
  - No description

- **DELETE** `/managers/{manager_id}` — `delete_manager_endpoint()`
  - Auth: `get_db, require_permission(managers, delete)`
  - File: `delete.py`
  - No description

- **GET** `/{store_id}/managers` — `list_managers()`
  - Auth: `get_db, require_permission(managers, read)`
  - File: `read.py`
  - No description

- **GET** `/managers/{manager_id}` — `get_manager_endpoint()`
  - Auth: `get_db, require_permission(managers, read)`
  - File: `read.py`
  - No description

- **PUT** `/managers/{manager_id}` — `update_manager_endpoint()`
  - Auth: `get_db, require_permission(managers, update)`
  - File: `update.py`
  - No description

## OPTICIAN (5 endpoints)

- **POST** `/{store_id}/opticians` — `create_optician_endpoint()`
  - Auth: `get_db, require_permission(opticians, create)`
  - File: `create.py`
  - No description

- **DELETE** `/opticians/{optician_id}` — `delete_optician_endpoint()`
  - Auth: `get_db, require_permission(opticians, delete)`
  - File: `delete.py`
  - No description

- **GET** `/{store_id}/opticians` — `list_opticians()`
  - Auth: `get_db, require_permission(opticians, read)`
  - File: `read.py`
  - No description

- **GET** `/opticians/{optician_id}` — `get_optician_endpoint()`
  - Auth: `get_db, require_permission(opticians, read)`
  - File: `read.py`
  - No description

- **PUT** `/opticians/{optician_id}` — `update_optician_endpoint()`
  - Auth: `get_db, require_permission(opticians, update)`
  - File: `update.py`
  - No description

## PERMISSION (8 endpoints)

- **GET** `/permissions/me` — `get_my_permissions()`
  - Auth: `get_db, get_current_user`
  - File: `me.py`
  - Returns full effective permission map for current user.

- **GET** `/admin/permissions/staff` — `get_staff_list()`
  - Auth: `get_db, get_current_admin`
  - File: `staff_list.py`
  - No description

- **GET** `/admin/permissions/role-defaults` — `get_role_defaults()`
  - Auth: `get_db, get_current_admin`
  - File: `tier2.py`
  - No description

- **PUT** `/admin/permissions/role-defaults/{role_type}/{permission_key}` — `update_role_default()`
  - Auth: `get_db, get_current_admin`
  - File: `tier2.py`
  - No description

- **DELETE** `/admin/permissions/role-defaults/{role_type}/{permission_key}` — `clear_role_default()`
  - Auth: `get_db, get_current_admin`
  - File: `tier2.py`
  - No description

- **GET** `/admin/permissions/staff/{user_type}/{user_id}` — `get_staff_permissions()`
  - Auth: `get_db, get_current_admin`
  - File: `tier3.py`
  - No description

- **PUT** `/admin/permissions/staff/{user_type}/{user_id}/{permission_key}` — `update_staff_permission()`
  - Auth: `get_db, get_current_admin`
  - File: `tier3.py`
  - No description

- **DELETE** `/admin/permissions/staff/{user_type}/{user_id}/{permission_key}` — `clear_staff_permission()`
  - Auth: `get_db, get_current_admin`
  - File: `tier3.py`
  - No description

## PRESCRIPTION (6 endpoints)

- **POST** `/` — `create_prescription_endpoint()`
  - Auth: `get_db, require_permission(prescriptions:create, sales:create)`
  - File: `create.py`
  - No description

- **GET** `/customer/{customer_id}` — `list_prescriptions_endpoint()`
  - Auth: `get_db, require_permission(prescriptions, read)`
  - File: `read.py`
  - No description

- **GET** `/customer/{customer_id}/active` — `get_active_prescription_endpoint()`
  - Auth: `get_db, require_permission(prescriptions, read)`
  - File: `read.py`
  - No description

- **GET** `/{prescription_id}` — `get_prescription_endpoint()`
  - Auth: `get_db, require_permission(prescriptions, read)`
  - File: `read.py`
  - No description

- **PUT** `/{prescription_id}` — `update_prescription_endpoint()`
  - Auth: `get_db, require_permission(prescriptions, update)`
  - File: `update.py`
  - No description

- **DELETE** `/{prescription_id}` — `delete_prescription_endpoint()`
  - Auth: `get_db, require_permission(prescriptions, update)`
  - File: `update.py`
  - No description

## PRODUCT (5 endpoints)

- **POST** `/` — `create_product_endpoint()`
  - Auth: `get_db, require_permission(products, create)`
  - File: `create.py`
  - No description

- **DELETE** `/{product_id}` — `delete_product_endpoint()`
  - Auth: `get_db, require_permission(products, delete)`
  - File: `delete.py`
  - No description

- **GET** `/` — `list_products()`
  - Auth: `get_db, require_permission(products, read)`
  - File: `read.py`
  - No description

- **GET** `/{product_id}` — `get_product_endpoint()`
  - Auth: `get_db, require_permission(products, read)`
  - File: `read.py`
  - No description

- **PUT** `/{product_id}` — `update_product_endpoint()`
  - Auth: `get_db, require_permission(products, update)`
  - File: `update.py`
  - No description

## PURCHASE_ORDER (8 endpoints)

- **POST** `/` — `create_po_endpoint()`
  - Auth: `get_db, require_permission(purchase_orders, create)`
  - File: `create.py`
  - No description

- **POST** `/{po_id}/payments` — `record_payment_endpoint()`
  - Auth: `get_db, require_permission(purchase_orders, read)`
  - File: `payments.py`
  - No description

- **GET** `/{po_id}/payments` — `list_payments_endpoint()`
  - Auth: `get_db, require_permission(purchase_orders, read)`
  - File: `payments.py`
  - No description

- **GET** `/` — `list_po_endpoint()`
  - Auth: `get_db, require_permission(purchase_orders, read)`
  - File: `read.py`
  - No description

- **GET** `/{po_id}` — `get_po_endpoint()`
  - Auth: `get_db, require_permission(purchase_orders, read)`
  - File: `read.py`
  - No description

- **POST** `/{po_id}/receive` — `receive_goods_endpoint()`
  - Auth: `get_db, require_permission(purchase_orders, read)`
  - File: `receive.py`
  - No description

- **PUT** `/{po_id}` — `update_po_endpoint()`
  - Auth: `get_db, require_permission(purchase_orders, update)`
  - File: `update.py`
  - No description

- **POST** `/{po_id}/cancel` — `cancel_po_endpoint()`
  - Auth: `get_db, require_permission(purchase_orders, update)`
  - File: `update.py`
  - No description

## REPAIR (6 endpoints)

- **POST** `/` — `create_repair_endpoint()`
  - Auth: `get_db, require_permission(repairs, create)`
  - File: `create.py`
  - No description

- **DELETE** `/{repair_id}` — `delete_repair_endpoint()`
  - Auth: `get_db, require_permission(repairs, delete)`
  - File: `delete.py`
  - No description

- **GET** `/` — `list_repairs_endpoint()`
  - Auth: `get_db, require_permission(repairs, read)`
  - File: `read.py`
  - No description

- **GET** `/{repair_id}` — `get_repair_endpoint()`
  - Auth: `get_db, require_permission(repairs, read)`
  - File: `read.py`
  - No description

- **PATCH** `/{repair_id}` — `update_repair_endpoint()`
  - Auth: `get_db, require_permission(repairs, update)`
  - File: `update.py`
  - No description

- **PATCH** `/{repair_id}/status` — `update_repair_status_endpoint()`
  - Auth: `get_db, require_permission(repairs, update)`
  - File: `update.py`
  - No description

## REPORT (5 endpoints)

- **GET** `/analyses` — `get_analyses_report_endpoint()`
  - Auth: `get_db, require_permission(reports, read)`
  - File: `analyses.py`
  - No description

- **GET** `/dashboard` — `get_dashboard_report_endpoint()`
  - Auth: `get_db, require_permission(reports, read)`
  - File: `dashboard.py`
  - No description

- **GET** `/staff/{staff_type}/{staff_id}` — `get_staff_report_endpoint()`
  - Auth: `get_db, require_permission(reports, read)`
  - File: `staff.py`
  - No description

- **GET** `/staff/{staff_type}/{staff_id}/details` — `get_staff_detailed_report_endpoint()`
  - Auth: `get_db, require_permission(reports, read)`
  - File: `staff.py`
  - No description

- **GET** `/stores/{store_id}` — `get_store_report_endpoint()`
  - Auth: `get_db, require_permission(reports, read)`
  - File: `store.py`
  - No description

## SALE (9 endpoints)

- **POST** `/` — `create_sale_endpoint()`
  - Auth: `get_db, require_permission(sales, create)`
  - File: `create.py`
  - No description

- **POST** `/{sale_id}/payments` — `add_payment_endpoint()`
  - Auth: `get_db, require_permission(sales, update)`
  - File: `payments.py`
  - No description

- **GET** `/` — `list_sales_endpoint()`
  - Auth: `get_db, require_permission(sales, read)`
  - File: `read.py`
  - No description

- **GET** `/{sale_id}` — `get_sale_endpoint()`
  - Auth: `get_db, require_permission(sales, read)`
  - File: `read.py`
  - No description

- **GET** `/{sale_id}/bill` — `get_sale_bill_endpoint()`
  - Auth: `get_db, require_permission(sales, read)`
  - File: `read.py`
  - No description

- **PUT** `/{sale_id}` — `update_sale_endpoint()`
  - Auth: `get_db, require_permission(sales, update)`
  - File: `update.py`
  - No description

- **POST** `/{sale_id}/cancel` — `cancel_sale_endpoint()`
  - Auth: `get_db, require_permission(sales, delete)`
  - File: `update.py`
  - No description

- **POST** `/{sale_id}/partial-return` — `partial_return_sale()`
  - Auth: `get_db, require_permission(sales, delete)`
  - File: `update.py`
  - No description

- **DELETE** `/{sale_id}` — `delete_sale_endpoint()`
  - Auth: `get_db, require_permission(sales, delete)`
  - File: `update.py`
  - No description

## STORE (7 endpoints)

- **POST** `/` — `create_store_endpoint()`
  - Auth: `get_db, require_permission(stores, create)`
  - File: `create.py`
  - No description

- **DELETE** `/{store_id}` — `delete_store_endpoint()`
  - Auth: `get_db, require_permission(stores, delete)`
  - File: `delete.py`
  - No description

- **GET** `/{store_id}/overview` — `get_store_overview_endpoint()`
  - Auth: `get_db, require_permission(stores, read)`
  - File: `overview.py`
  - No description

- **GET** `/` — `list_stores()`
  - Auth: `get_db, get_current_user`
  - File: `read.py`
  - No description

- **GET** `/{store_id}` — `get_store_endpoint()`
  - Auth: `get_db, get_current_user`
  - File: `read.py`
  - No description

- **GET** `/{store_id}/staff` — `list_store_staff()`
  - Auth: `get_db, get_current_user`
  - File: `staff.py`
  - No description

- **PUT** `/{store_id}` — `update_store_endpoint()`
  - Auth: `get_db, require_permission(stores, update)`
  - File: `update.py`
  - No description

## SUPERADMIN (1 endpoints)

- **POST** `` — `create_admin()`
  - Auth: `get_current_user, get_db`
  - File: `admins.py`
  - No description

## SUPPLIER (11 endpoints)

- **POST** `/` — `create_supplier_endpoint()`
  - Auth: `get_db, require_permission(suppliers, create)`
  - File: `create.py`
  - No description

- **POST** `/{supplier_id}/products` — `add_product_endpoint()`
  - Auth: `get_db, require_permission(suppliers, read)`
  - File: `products.py`
  - No description

- **GET** `/{supplier_id}/products` — `list_products_endpoint()`
  - Auth: `get_db, require_permission(suppliers, read)`
  - File: `products.py`
  - No description

- **PUT** `/{supplier_id}/products/{sp_id}` — `update_product_endpoint()`
  - Auth: `get_db, require_permission(suppliers, read)`
  - File: `products.py`
  - No description

- **GET** `/` — `list_suppliers_endpoint()`
  - Auth: `get_db, require_permission(suppliers, read)`
  - File: `read.py`
  - No description

- **GET** `/{supplier_id}` — `get_supplier_endpoint()`
  - Auth: `get_db, require_permission(suppliers, read)`
  - File: `read.py`
  - No description

- **POST** `/{supplier_id}/stores` — `link_to_store_endpoint()`
  - Auth: `get_db, require_permission(suppliers, read)`
  - File: `store_links.py`
  - No description

- **GET** `/{supplier_id}/stores` — `list_store_links_endpoint()`
  - Auth: `get_db, require_permission(suppliers, read)`
  - File: `store_links.py`
  - No description

- **DELETE** `/{supplier_id}/stores/{link_id}` — `unlink_from_store_endpoint()`
  - Auth: `get_db, require_permission(suppliers, read)`
  - File: `store_links.py`
  - No description

- **PUT** `/{supplier_id}` — `update_supplier_endpoint()`
  - Auth: `get_db, require_permission(suppliers, update)`
  - File: `update.py`
  - No description

- **DELETE** `/{supplier_id}` — `delete_supplier_endpoint()`
  - Auth: `get_db, require_permission(suppliers, update)`
  - File: `update.py`
  - No description

## TRANSFER (7 endpoints)

- **GET** `/history` — `transaction_history_endpoint()`
  - Auth: `get_db, require_permission(inventory, read)`
  - File: `history.py`
  - No description

- **POST** `/purchase` — `purchase_endpoint()`
  - Auth: `get_db, require_permission(inventory, create)`
  - File: `operations.py`
  - No description

- **POST** `/transfer` — `transfer_endpoint()`
  - Auth: `get_db, require_permission(inventory, transfer)`
  - File: `operations.py`
  - No description

- **POST** `/damage` — `damage_endpoint()`
  - Auth: `get_db, require_permission(inventory, update)`
  - File: `operations.py`
  - No description

- **POST** `/loss` — `loss_endpoint()`
  - Auth: `get_db, require_permission(inventory, update)`
  - File: `operations.py`
  - No description

- **POST** `/sale` — `sale_endpoint()`
  - Auth: `get_db, require_permission(inventory, update)`
  - File: `operations.py`
  - No description

- **POST** `/return` — `return_endpoint()`
  - Auth: `get_db, require_permission(inventory, update)`
  - File: `operations.py`
  - No description

## WORKER (5 endpoints)

- **POST** `/{store_id}/workers` — `create_worker_endpoint()`
  - Auth: `get_db, require_permission(workers, create)`
  - File: `create.py`
  - No description

- **DELETE** `/workers/{worker_id}` — `delete_worker_endpoint()`
  - Auth: `get_db, require_permission(workers, delete)`
  - File: `delete.py`
  - No description

- **GET** `/{store_id}/workers` — `list_workers()`
  - Auth: `get_db, require_permission(workers, read)`
  - File: `read.py`
  - No description

- **GET** `/workers/{worker_id}` — `get_worker_endpoint()`
  - Auth: `get_db, require_permission(workers, read)`
  - File: `read.py`
  - No description

- **PUT** `/workers/{worker_id}` — `update_worker_endpoint()`
  - Auth: `get_db, require_permission(workers, update)`
  - File: `update.py`
  - No description


---
Total endpoints: 189
