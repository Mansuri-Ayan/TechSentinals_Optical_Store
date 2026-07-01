import os
import re
from collections import defaultdict

perms = set()
pattern = re.compile(r"require_permission\(\s*['\"]([^'\"]+)['\"]\s*,\s*['\"]([^'\"]+)['\"]\s*\)")

for root, _, files in os.walk(r"D:\Dev\projects\active\TechSentinals_Optical_Store\Backend\apis"):
    for file in files:
        if file.endswith(".py"):
            with open(os.path.join(root, file), 'r', encoding='utf-8') as f:
                content = f.read()
                matches = pattern.findall(content)
                for match in matches:
                    perms.add(match)

for p in sorted(list(perms)):
    print(p)
