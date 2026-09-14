"""Serve only the bundled preview on a random loopback port; no backend access."""
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path
import webbrowser

page = Path(__file__).with_name('TOSH_Preview.html').read_bytes()
class PreviewHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path.split('?', 1)[0] not in ('/', '/TOSH_Preview.html'):
            self.send_error(404)
            return
        self.send_response(200)
        self.send_header('Content-Type', 'text/html; charset=utf-8')
        self.send_header('Content-Length', str(len(page)))
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.end_headers()
        self.wfile.write(page)
    def log_message(self, *args):
        pass

if __name__ == '__main__':
    server = HTTPServer(('127.0.0.1', 0), PreviewHandler)
    url = f'http://127.0.0.1:{server.server_port}/TOSH_Preview.html#/gis'
    print('TOSH map preview. Keep this window open. Ctrl+C stops the preview.', flush=True)
    print(url, flush=True)
    webbrowser.open(url)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
