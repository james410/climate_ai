import subprocess
import time

def run_backend():
    print("啟動後端服務...")
    backend_process = subprocess.Popen(
        ["python", "backend/run.py"],
        shell=True
    )
    time.sleep(5)
    return backend_process

def run_frontend():
    print("啟動前端服務...")
    frontend_process = subprocess.Popen(
        ["python", "frontend/run.py"],
        shell=True
    )
    return frontend_process

if __name__ == "__main__":
    backend = run_backend()
    run_frontend()
    backend.wait()