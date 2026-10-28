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
            content = "" if mode == "empty" else mock_reply(body.get("messages") or [])
            return self._json(200, {
                "id": "mock-1", "object": "chat.completion", "created": int(time.time()), "model": body.get("model"),
                "choices": [{"index": 0, "finish_reason": "stop", "message": {"role": "assistant", "content": content}}],
                "usage": {"prompt_tokens": 1, "completion_tokens": 1, "total_tokens": 2},
            })
        return self._json(404, {"error": "not found"})


def mock_reply(messages):
    """Deterministic stand-in replies (TEST DOUBLE, not a real model). Structured when JSON is requested."""
    import re
    system = next((m.get("content", "") for m in messages if m.get("role") == "system"), "")
    user = next((m.get("content", "") for m in reversed(messages) if m.get("role") == "user"), "")
    n = int((re.search(r"exactly (\d+)", user) or re.search(r"about (\d+)", user) or [None, "3"])[1])
    if '"keyTakeaways"' in system:  # visual lesson: one step per supported visual family
        return json.dumps({
            "title": "MOCK visual lesson",
            "summary": "MOCK summary of the topic.",
            "steps": [
                {"title": "MOCK molecule", "explanation": "MOCK: two hydrogens bonded to one oxygen.", "visual": {"type": "molecule", "name": "Water", "atoms": [{"id": "o", "element": "O"}, {"id": "h1", "element": "H"}, {"id": "h2", "element": "H"}], "bonds": [{"a": "o", "b": "h1"}, {"a": "o", "b": "h2"}], "caption": "H2O"}},
                {"title": "MOCK graph", "explanation": "MOCK: a parabola.", "visual": {"type": "graph2d", "family": "quadratic", "a": 1, "xMin": -5, "xMax": 5, "points": [{"x": 0, "y": 0, "label": "vertex"}]}},
                {"title": "MOCK forces", "explanation": "MOCK: two forces and their resultant.", "visual": {"type": "vectors", "vectors": [{"x": 3, "y": 0, "label": "F1"}, {"x": 0, "y": 2, "label": "F2"}], "showResultant": True}},
                {"title": "MOCK cycle", "explanation": "MOCK: a three-stage cycle.", "visual": {"type": "flow", "cycle": True, "nodes": [{"id": "a", "label": "Stage A"}, {"id": "b", "label": "Stage B"}, {"id": "c", "label": "Stage C"}], "edges": [{"from": "a", "to": "b"}, {"from": "b", "to": "c"}, {"from": "c", "to": "a"}]}},
                {"title": "MOCK parts", "explanation": "MOCK: labelled parts.", "visual": {"type": "labeled", "subject": "Cell", "parts": [{"label": "Nucleus", "description": "Holds DNA"}, {"label": "Membrane", "description": "Controls entry"}]}},
                {"title": "MOCK shape", "explanation": "MOCK: a cylinder.", "visual": {"type": "shape3d", "shape": "cylinder", "dimensions": {"radius": 1, "height": 2}, "labels": ["r", "h"]}},
            ],
            "keyTakeaways": ["MOCK takeaway"],
        })
    if '"questions"' in system:
        return json.dumps({"questions": [
            {"question": f"MOCK question {i + 1}: what does the source say about topic {i + 1}?",
             "options": [f"Answer {i + 1}", f"Wrong {i + 1}a", f"Wrong {i + 1}b", f"Wrong {i + 1}c"],
             "answer": f"Answer {i + 1}", "explanation": f"MOCK explanation {i + 1}.", "topic": "Topic A" if i % 2 == 0 else "Topic B"}
            for i in range(n)]})
    if '"cards"' in system:
        return json.dumps({"cards": [{"question": f"MOCK card {i + 1}?", "answer": f"MOCK answer {i + 1}"} for i in range(n)]})
    if '"modules"' in system:
        return json.dumps({"modules": [{"title": f"MOCK module {i + 1}", "objective": f"Understand part {i + 1}"} for i in range(n)]})
    stamp = re.search(r"\[(\d{1,2}:\d{2}(?::\d{2})?)\]", user)
    if "QUESTION:" in user and stamp:
        return f"MOCK-NIM: the source explains this at [{stamp.group(1)}] and also at [99:59]."
    return "MOCK-NIM: photosynthesis converts light energy into chemical energy."


ThreadingHTTPServer(("127.0.0.1", PORT), Handler).serve_forever()
