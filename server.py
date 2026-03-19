import json
import os
import sys
from http.server import SimpleHTTPRequestHandler, HTTPServer

PORT = 8010
DATA_FILE = "mission_data.json"

class MissionHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

    def do_GET(self):
        if self.path == '/api/mission':
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            if os.path.exists(DATA_FILE):
                with open(DATA_FILE, 'r') as f:
                    self.wfile.write(f.read().encode('utf-8'))
            else:
                self.wfile.write(b'[]')
        else:
            return super().do_GET()

    def do_POST(self):
        if self.path == '/api/mission':
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            
            with open(DATA_FILE, 'w') as f:
                f.write(post_data.decode('utf-8'))
                
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(b'{"status":"success"}')
        else:
            self.send_response(404)
            self.end_headers()

if __name__ == '__main__':
    server = HTTPServer(('', PORT), MissionHandler)
    print(f"Starting auto-save server on http://localhost:{PORT}")
    try:
         server.serve_forever()
    except KeyboardInterrupt:
         pass
    server.server_close()
