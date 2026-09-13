"""五术排盘 · 桌面应用

把纯前端的排盘页面装进一个原生窗口里，双击即可运行。
内置本地静态服务器（因为页面用 ES 模块，file:// 直接打开会被浏览器拦），
不联网、不依赖手动开浏览器。
"""

import os
import sys
import socket
import threading
import webbrowser
import http.server
import socketserver

APP_NAME = "五术排盘"


def resource_root():
    """冻结成 exe 时资源解包在 sys._MEIPASS，否则用脚本所在目录。"""
    base = getattr(sys, "_MEIPASS", None)
    return base if base else os.path.dirname(os.path.abspath(__file__))


ROOT = resource_root()

MIME = {
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".ico": "image/x-icon",
    ".webmanifest": "application/manifest+json",
    ".json": "application/json; charset=utf-8",
    ".md": "text/markdown; charset=utf-8",
}


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def guess_type(self, path):
        ext = os.path.splitext(str(path))[1].lower()
        return MIME.get(ext, super().guess_type(path))

    def log_message(self, *args):
        pass  # 静默运行


def free_port():
    with socket.socket() as s:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]


def serve(port, ready):
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("127.0.0.1", port), Handler) as httpd:
        ready.set()
        httpd.serve_forever()


def start_server():
    port = free_port()
    ready = threading.Event()
    threading.Thread(target=serve, args=(port, ready), daemon=True).start()
    ready.wait(5)
    return f"http://127.0.0.1:{port}/index.html"


def main():
    url = start_server()

    try:
        import webview
    except Exception:
        webbrowser.open(url)
        return

    try:
        webview.create_window(
            APP_NAME + " · 传统文化娱乐",
            url,
            width=1240,
            height=880,
            min_size=(880, 620),
            background_color="#faf8f4",
            text_select=True,
        )
        webview.start()
    except Exception:
        # WebView2 不可用时退回系统浏览器，保证一定能用
        webbrowser.open(url)
        try:
            threading.Event().wait()
        except KeyboardInterrupt:
            pass


if __name__ == "__main__":
    main()