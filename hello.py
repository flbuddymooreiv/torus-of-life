
import http.server
import socketserver
import threading
import sys
import math
import signal


PORT = 8899

httpd = None # Global variable for the server instance



class MyHttpRequestHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path == '/torus':
            self.send_response(200)
            self.send_header("Content-type", "text/html")
            self.end_headers()
            with open('index.html', 'rb') as f:
                self.wfile.write(f.read())
        elif self.path == '/game_of_life.js':
            try:
                with open('game_of_life.js', 'rb') as f:
                    self.send_response(200)
                    self.send_header("Content-type", "application/javascript")
                    self.end_headers()
                    self.wfile.write(f.read())
            except FileNotFoundError:
                self.send_error(404, "File Not Found: game_of_life.js")

        else:
            self.send_response(200)
            self.send_header("Content-type", "text/html")
            self.end_headers()
            self.wfile.write(b"<html><head><title>Hello</title></head>")
            self.wfile.write(b"<body><h1>Hello, World!</h1>")
            self.wfile.write(b"<p>This is a simple Python web server.</p>")
            self.wfile.write(b"</body></html>")

def signal_handler(signum, frame):
    print(f"\nReceived signal {signum}. Shutting down gracefully...")
    global httpd
    if httpd:
        httpd.shutdown()
        httpd.server_close()
    sys.exit(0)

def run_server():
    global httpd # Declare httpd as global
    socketserver.TCPServer.allow_reuse_address = True
    httpd = socketserver.TCPServer(("", PORT), MyHttpRequestHandler)

    # Register signal handlers
    signal.signal(signal.SIGTERM, signal_handler)
    signal.signal(signal.SIGINT, signal_handler) # Also handle Ctrl+C
    print(f"Serving on port {PORT}")
    print("Press Ctrl+D to shut down the server.")
    
    server_thread = threading.Thread(target=httpd.serve_forever)
    server_thread.daemon = True
    server_thread.start()
    
    # Wait for Ctrl+D
    sys.stdin.read()
    
    print("\nShutting down the server...")
    httpd.shutdown()
    httpd.server_close()
    print("Server shut down.")

if __name__ == "__main__":
    run_server()
