"""Minimal local SMTP sink for e2e runs. Accepts any AUTH, stores each message as a file in ./mail/.
Binds to 127.0.0.1 only. Never relays anything. Never prints message contents."""
import asyncio
import os
import sys
import time

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 2525
import tempfile
OUT = os.environ.get("E2E_MAIL_DIR") or os.path.join(tempfile.gettempdir(), "gleamlearn-e2e-mail")
os.makedirs(OUT, exist_ok=True)


async def handle(reader, writer):
    def send(line):
        writer.write((line + "\r\n").encode())

    send("220 e2e-sink ESMTP")
    await writer.drain()
    rcpt = []
    while True:
        raw = await reader.readline()
        if not raw:
            break
        line = raw.decode(errors="replace").rstrip("\r\n")
        cmd = line[:4].upper()
        if cmd in ("EHLO", "HELO"):
            send("250-e2e-sink")
            send("250-AUTH PLAIN LOGIN")
            send("250 8BITMIME")
        elif line.upper().startswith("AUTH LOGIN"):
            send("334 VXNlcm5hbWU6")
            await writer.drain()
            await reader.readline()
            send("334 UGFzc3dvcmQ6")
            await writer.drain()
            await reader.readline()
            send("235 ok")
        elif line.upper().startswith("AUTH"):
            send("235 ok")
        elif cmd == "MAIL":
            rcpt = []
            send("250 ok")
        elif cmd == "RCPT":
            rcpt.append(line.split(":", 1)[1].strip().strip("<>"))
            send("250 ok")
        elif cmd == "DATA":
            send("354 end with .")
            await writer.drain()
            chunks = []
            while True:
                l = await reader.readline()
                if l in (b".\r\n", b".\n", b""):
                    break
                chunks.append(l[1:] if l.startswith(b"..") else l)
            name = f"{time.time_ns()}_{(rcpt[0] if rcpt else 'unknown').replace('@', '_at_')}.eml"
            with open(os.path.join(OUT, name), "wb") as f:
                f.write(b"".join(chunks))
            send("250 queued")
        elif cmd == "QUIT":
            send("221 bye")
            await writer.drain()
            break
        else:
            send("250 ok")
        await writer.drain()
    writer.close()


async def main():
    server = await asyncio.start_server(handle, "127.0.0.1", PORT)
    print(f"smtp sink listening on 127.0.0.1:{PORT}", flush=True)
    async with server:
        await server.serve_forever()


asyncio.run(main())
