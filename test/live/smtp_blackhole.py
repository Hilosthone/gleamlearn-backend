"""SMTP 'black hole' for e2e runs: accepts TCP connections on 127.0.0.1 and never answers, which is how a
blocked or misconfigured SMTP route behaves. Used to prove that sign-up/login never wait on email."""
import asyncio
import sys

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 2526


async def handle(reader, writer):
    try:
        await reader.read()  # hold the connection open, send nothing
    finally:
        writer.close()


async def main():
    server = await asyncio.start_server(handle, "127.0.0.1", PORT)
    print(f"smtp black hole on 127.0.0.1:{PORT}", flush=True)
    async with server:
        await server.serve_forever()


asyncio.run(main())
