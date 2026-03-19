import json
import os
import re
from http.server import SimpleHTTPRequestHandler, HTTPServer

PORT = 8010
DATA_FILE = "mission_data.json"
APP_JS = "app.js"

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
                with open(DATA_FILE, 'r', encoding='utf-8') as f:
                    self.wfile.write(f.read().encode('utf-8'))
            else:
                self.wfile.write(b'[]')
        else:
            return super().do_GET()

    def do_POST(self):
        if self.path == '/api/mission':
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length).decode('utf-8')
            
            # 1. Save to JSON backup
            with open(DATA_FILE, 'w', encoding='utf-8') as f:
                f.write(post_data)
                
            # 2. Update app.js (The original code)
            try:
                if os.path.exists(APP_JS):
                    with open(APP_JS, 'r', encoding='utf-8') as f:
                        content = f.read()
                    
                    # Regex to find BAKED_DATA and replace its content
                    pattern = r'(const BAKED_DATA\s*=\s*).*?(\s*;)'
                    new_baked = f'const BAKED_DATA = {post_data};'
                    new_content = re.sub(pattern, new_baked, content, flags=re.DOTALL)
                    
                    with open(APP_JS, 'w', encoding='utf-8') as f:
                        f.write(new_content)
                    print(f"[✓] app.js updated with new BAKED_DATA")
            except Exception as e:
                print(f"[!] Error updating app.js: {e}")

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
