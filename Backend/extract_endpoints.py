import os
import ast
from collections import defaultdict

apis_dir = "d:/Dev/projects/active/TechSentinals_Optical_Store/Backend/apis"
output_file = "d:/Dev/projects/active/TechSentinals_Optical_Store/Backend/endpoints_report.md"

modules = defaultdict(list)

for root, _, files in os.walk(apis_dir):
    for file in files:
        if file.endswith(".py") and not file.startswith("__"):
            filepath = os.path.join(root, file)
            module_name = os.path.basename(root)
            with open(filepath, "r", encoding="utf-8") as f:
                content = f.read()
            try:
                tree = ast.parse(content)
            except SyntaxError:
                continue
            for node in ast.walk(tree):
                if isinstance(node, (ast.AsyncFunctionDef, ast.FunctionDef)):
                    endpoints = []
                    for decorator in node.decorator_list:
                        if isinstance(decorator, ast.Call) and isinstance(decorator.func, ast.Attribute):
                            val = decorator.func.value
                            if getattr(val, "id", "") in ("router", "app"):
                                method = decorator.func.attr.upper()
                                if method in ["GET", "POST", "PUT", "DELETE", "PATCH"]:
                                    path = ""
                                    if decorator.args and isinstance(decorator.args[0], ast.Constant):
                                        path = decorator.args[0].value
                                    endpoints.append((method, path))
                    if not endpoints:
                        continue
                    auth_reqs = []
                    all_defaults = list(node.args.defaults) + [d for d in node.args.kw_defaults if d]
                    for default in all_defaults:
                        if default and isinstance(default, ast.Call):
                            func = default.func
                            fname = getattr(func, "id", "")
                            if fname == "Depends" and default.args:
                                arg0 = default.args[0]
                                if isinstance(arg0, ast.Name):
                                    auth_reqs.append(arg0.id)
                                elif isinstance(arg0, ast.Call):
                                    fn = getattr(arg0.func, "id", "")
                                    if fn == "require_permission":
                                        perms = [a.value for a in arg0.args if isinstance(a, ast.Constant)]
                                        auth_reqs.append("require_permission(" + ", ".join(map(str, perms)) + ")")
                                    else:
                                        auth_reqs.append(fn + "(...)")
                    desc = ast.get_docstring(node) or "No description"
                    desc = desc.split("\n")[0].strip()
                    for method, path in endpoints:
                        modules[module_name].append({
                            "method": method,
                            "path": path,
                            "auth": ", ".join(auth_reqs) if auth_reqs else "None",
                            "desc": desc,
                            "file": file,
                            "func": node.name,
                        })

with open(output_file, "w", encoding="utf-8") as f:
    f.write("# Backend API Endpoints Report\n\n")
    total = 0
    for mod, eps in sorted(modules.items()):
        f.write("## {} ({} endpoints)\n\n".format(mod.upper(), len(eps)))
        for ep in eps:
            total += 1
            f.write("- **{}** `{}` — `{}()`\n".format(ep["method"], ep["path"], ep["func"]))
            f.write("  - Auth: `{}`\n".format(ep["auth"]))
            f.write("  - File: `{}`\n".format(ep["file"]))
            f.write("  - {}\n\n".format(ep["desc"]))
    f.write("\n---\nTotal endpoints: {}\n".format(total))

print("Generated report with {} endpoints across {} modules".format(total, len(modules)))
