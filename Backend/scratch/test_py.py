import os
status_file = os.path.join(os.path.dirname(__file__), "test_out.txt")
with open(status_file, "w") as f:
    f.write("Hello from Python")
print("Done test!")
