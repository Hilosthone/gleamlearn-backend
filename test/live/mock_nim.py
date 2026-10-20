"""Local stand-in for NVIDIA NIM (OpenAI-compatible POST /v1/chat/completions) for contract tests.

It is NOT proof that real NVIDIA calls work: it only lets the real FastAPI service and the real NestJS backend
be exercised end to end without paid inference. Binds to 127.0.0.1 only. Never sees real keys (the AI service
is started with a dummy NVIDIA_API_KEY).

Modes (POST /__mode?m=<mode>): ok (default) | error (HTTP 500) | empty (empty content) | slow (sleeps 5 s)
Every completion request is counted; GET /__stats returns {"requests": n, "lastModel": ..., "lastHadAuth": bool}.
"""
import json
import sys
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlparse

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8799
STATE = {"mode": "ok", "requests": 0, "lastModel": None, "lastHadAuth": False}


class Handler(BaseHTTPRequestHandler):
    def log_message(self, *args):  # keep the console quiet
        pass

    def _json(self, code, body):
        data = json.dumps(body).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def do_GET(self):
        if urlparse(self.path).path == "/__stats":
            return self._json(200, STATE)
        return self._json(404, {"error": "not found"})

    def do_POST(self):
        url = urlparse(self.path)
        length = int(self.headers.get("Content-Length") or 0)
        raw = self.rfile.read(length) if length else b"{}"
        if url.path == "/__mode":
            STATE["mode"] = parse_qs(url.query).get("m", ["ok"])[0]
            return self._json(200, {"mode": STATE["mode"]})
        if url.path.endswith("/chat/completions"):
            STATE["requests"] += 1
            STATE["lastHadAuth"] = (self.headers.get("Authorization") or "").startswith("Bearer ")
            try:
                body = json.loads(raw or b"{}")
            except ValueError:
                body = {}
            STATE["lastModel"] = body.get("model")
            mode = STATE["mode"]
            if mode == "error":
                return self._json(500, {"error": {"message": "mock provider failure"}})
            if mode == "slow":
                time.sleep(5)
            content = "" if mode == "empty" else "MOCK-NIM: photosynthesis converts light energy into chemical energy."
            return self._json(200, {
                "id": "mock-1", "object": "chat.completion", "created": int(time.time()), "model": body.get("model"),
                "choices": [{"index": 0, "finish_reason": "stop", "message": {"role": "assistant", "content": content}}],
                "usage": {"prompt_tokens": 1, "completion_tokens": 1, "total_tokens": 2},
            })
        return self._json(404, {"error": "not found"})


ThreadingHTTPServer(("127.0.0.1", PORT), Handler).serve_forever()
