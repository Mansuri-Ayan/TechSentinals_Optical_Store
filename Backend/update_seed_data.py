import re

pairs = [
    ('brands', 'create'), ('brands', 'delete'), ('brands', 'read'), ('brands', 'update'),
    ('categories', 'create'), ('categories', 'delete'), ('categories', 'read'), ('categories', 'update'),
    ('customers', 'create'), ('customers', 'delete'), ('customers', 'read'), ('customers', 'update'),
    ('expenses', 'create'), ('expenses', 'delete'), ('expenses', 'read'), ('expenses', 'update'),
    ('inventory', 'create'), ('inventory', 'read'), ('inventory', 'transfer'), ('inventory', 'update'),
    ('loyalty', 'configure'), ('loyalty', 'read'), ('loyalty', 'write'),
    ('managers', 'create'), ('managers', 'delete'), ('managers', 'read'), ('managers', 'update'),
    ('opticians', 'create'), ('opticians', 'delete'), ('opticians', 'read'), ('opticians', 'update'),
    ('prescriptions', 'create'), ('prescriptions', 'read'), ('prescriptions', 'update'),
    ('products', 'create'), ('products', 'delete'), ('products', 'read'), ('products', 'update'),
    ('purchase_orders', 'create'), ('purchase_orders', 'read'), ('purchase_orders', 'update'),
    ('repairs', 'create'), ('repairs', 'delete'), ('repairs', 'read'), ('repairs', 'update'),
    ('reports', 'read'),
    ('sales', 'create'), ('sales', 'delete'), ('sales', 'read'), ('sales', 'update'),
    ('stores', 'create'), ('stores', 'delete'), ('stores', 'read'), ('stores', 'update'),
    ('suppliers', 'create'), ('suppliers', 'read'), ('suppliers', 'update'),
    ('workers', 'create'), ('workers', 'delete'), ('workers', 'read'), ('workers', 'update')
]

seed_list = []
for module, action in pairs:
    display_name = f"{action.capitalize()} {module.capitalize()}"
    is_dangerous = action in ['delete']
    seed_list.append(f'            ("{module}", "{action}", "{display_name}", {is_dangerous}),')

seed_str = "\n".join(seed_list)

new_seed_block = f"""        PERMISSIONS_SEED = [
{seed_str}
        ]
"""

with open(r"D:\Dev\projects\active\TechSentinals_Optical_Store\Backend\db\seed_data.py", 'r', encoding='utf-8') as f:
    content = f.read()

# Replace PERMISSIONS_SEED
content = re.sub(r'        PERMISSIONS_SEED = \[.*?\]', new_seed_block, content, flags=re.DOTALL)

# Replace role_defaults block
new_role_defaults_block = """            # Global Roles
            role_defaults = {
                "ADMIN": True,
                "MANAGER": p[0] in ["inventory", "sales", "customers", "loyalty", "products", "brands", "categories", "prescriptions", "repairs", "reports", "expenses", "suppliers", "purchase_orders"] or (p[0] in ["workers", "opticians"] and p[1] in ["read", "create", "update"]),
                "WORKER": p[0] in ["sales", "customers", "loyalty", "prescriptions", "products", "brands", "categories"] and p[1] in ["read", "create", "update", "write", "configure"],
                "OPTICIAN": p[0] in ["customers", "prescriptions", "products", "brands", "categories", "loyalty"] and p[1] in ["read", "create", "update", "write", "configure"],
                "ACCOUNTANT": p[0] in ["sales", "reports", "expenses"] and p[1] == "read"
            }"""

content = re.sub(r'            # Global Roles.*?            }', new_role_defaults_block, content, flags=re.DOTALL)

with open(r"D:\Dev\projects\active\TechSentinals_Optical_Store\Backend\db\seed_data.py", 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated seed_data.py")
