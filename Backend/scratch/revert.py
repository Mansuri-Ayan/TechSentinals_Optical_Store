import subprocess
import os
import shutil

repo_dir = r"d:\Tech_sentinals\Active\TechSentinals_Optical_Store"
log_file = r"d:\Tech_sentinals\Active\TechSentinals_Optical_Store\Backend\scratch\revert_log.txt"

def write_log(msg):
    with open(log_file, "a") as f:
        f.write(msg + "\n")

if os.path.exists(log_file):
    try:
        os.remove(log_file)
    except Exception:
        pass

write_log("Starting revert script...")

git_path = shutil.which("git")
write_log(f"shutil.which('git'): {git_path}")

if not git_path:
    git_path = "git"

write_log(f"Using git path: {git_path}")

try:
    write_log("Running git checkout -- . ...")
    res = subprocess.run([git_path, "checkout", "--", "."], cwd=repo_dir, stdin=subprocess.DEVNULL, capture_output=True, text=True, timeout=10)
    write_log(f"Checkout exit code: {res.returncode}")
    write_log(f"Checkout stdout: {res.stdout}")
    write_log(f"Checkout stderr: {res.stderr}")
except Exception as e:
    write_log(f"Checkout exception: {e}")

try:
    write_log("Running git clean -fd ...")
    res = subprocess.run([git_path, "clean", "-fd"], cwd=repo_dir, stdin=subprocess.DEVNULL, capture_output=True, text=True, timeout=10)
    write_log(f"Clean exit code: {res.returncode}")
    write_log(f"Clean stdout: {res.stdout}")
    write_log(f"Clean stderr: {res.stderr}")
except Exception as e:
    write_log(f"Clean exception: {e}")

write_log("Finished!")
