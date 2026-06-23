import subprocess
import os

def run():
    # Run git status in the repository root
    repo_dir = r"d:\Tech_sentinals\Active\TechSentinals_Optical_Store"
    
    out_lines = []
    
    try:
        # Run git status
        res = subprocess.run(["git", "status"], cwd=repo_dir, capture_output=True, text=True, check=True)
        out_lines.append("GIT STATUS:")
        out_lines.append(res.stdout)
    except Exception as e:
        out_lines.append(f"Error running git status: {e}")
        if hasattr(e, 'stderr') and e.stderr:
            out_lines.append("Stderr:")
            out_lines.append(e.stderr)
            
    status_file = os.path.join(os.path.dirname(__file__), "git_status.txt")
    with open(status_file, "w") as f:
        f.write("\n".join(out_lines))
    print("Git status run complete.")

run()
