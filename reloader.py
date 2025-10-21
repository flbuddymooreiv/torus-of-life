import subprocess
import time
import os
import sys

# Files to watch for changes
WATCHED_FILES = [
    "/home/buddy/ddgaichat/hello.py",
    "/home/buddy/ddgaichat/game_of_life.js",
]

# Command to run the server
SERVER_COMMAND = [sys.executable, "/home/buddy/ddgaichat/hello.py"]

def get_mod_times(files):
    """Returns a dictionary of file paths to their last modification times."""
    mod_times = {}
    for f in files:
        if os.path.exists(f):
            mod_times[f] = os.path.getmtime(f)
    return mod_times

def main():
    print("Starting server reloader...")
    current_mod_times = get_mod_times(WATCHED_FILES)
    server_process = None

    while True:
        # If server is not running or has crashed, restart it
        if server_process is None or server_process.poll() is not None:
            if server_process:
                print("Server process stopped unexpectedly. Restarting...")
            else:
                print("Starting server...")
            server_process = subprocess.Popen(SERVER_COMMAND)
            print(f"Server started with PID: {server_process.pid}")

        new_mod_times = get_mod_times(WATCHED_FILES)
        if new_mod_times != current_mod_times:
            print("File change detected. Restarting server...")
            if server_process:
                server_process.terminate()
                server_process.wait() # Wait for the process to actually terminate
                time.sleep(0.5) # Add a small delay to allow port to be released
            current_mod_times = new_mod_times
            server_process = subprocess.Popen(SERVER_COMMAND)
            print(f"Server restarted with PID: {server_process.pid}")

        time.sleep(1) # Check for changes every second

if __name__ == "__main__":
    main()
