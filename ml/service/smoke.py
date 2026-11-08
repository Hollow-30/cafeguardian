"""Prueba HTTP local de toda la cadena; sesión Next simulada, inferencia real."""

import base64
import argparse
from io import BytesIO
import os
from pathlib import Path
import secrets
import socket
import subprocess
import sys
import time

import httpx
from PIL import Image


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--container", action="store_true", help="Usar la imagen Docker ya construida")
    options = parser.parse_args()
    root = Path(__file__).resolve().parents[2]
    with socket.socket() as sock:
        sock.bind(("127.0.0.1", 0))
        port = sock.getsockname()[1]
    env = dict(os.environ)
    env["INFERENCE_SERVICE_TOKEN"] = secrets.token_urlsafe(32)
    env["INFERENCE_SERVICE_URL"] = f"http://127.0.0.1:{port}/predict"
    env["CAFG107_SMOKE"] = "1"
    with Image.new("RGB", (48, 32), (30, 120, 55)) as image:
        output = BytesIO()
        image.save(output, "PNG")
        env["CAFG107_SMOKE_PHOTO"] = base64.b64encode(output.getvalue()).decode("ascii")
    container_name = f"cafg107-smoke-{secrets.token_hex(4)}" if options.container else None
    command = (["docker", "run", "--rm", "--name", container_name,
                "--env", "INFERENCE_SERVICE_TOKEN", "--publish", f"127.0.0.1:{port}:8000",
                "cafeguardian-inference:cafg-107"] if container_name else
               [sys.executable, "-m", "uvicorn", "ml.service.app:app",
                "--host", "127.0.0.1", "--port", str(port), "--no-access-log"])
    server = subprocess.Popen(command, cwd=root, env=env, stdout=subprocess.DEVNULL)
    try:
        with httpx.Client(trust_env=False) as client:
            deadline = time.monotonic() + 20
            while True:
                if server.poll() is not None:
                    raise RuntimeError("El servicio no pudo iniciar")
                try:
                    if client.get(f"http://127.0.0.1:{port}/healthz", timeout=1).is_success:
                        break
                except httpx.TransportError:
                    pass
                if time.monotonic() > deadline:
                    raise RuntimeError("El servicio no quedó listo en 20 segundos")
                time.sleep(0.1)
        cli = root / "node_modules/vitest/vitest.mjs"
        return subprocess.run(["node", str(cli), "run", "lib/diagnosis/live.test.ts"],
                              cwd=root, env=env, timeout=60, check=False).returncode
    finally:
        if container_name:
            subprocess.run(["docker", "stop", "--time", "2", container_name],
                           stdout=subprocess.DEVNULL, timeout=15, check=False)
        if server.poll() is None:
            server.terminate()
        try:
            server.wait(timeout=5)
        except subprocess.TimeoutExpired:
            server.kill()
            server.wait(timeout=5)


if __name__ == "__main__":
    sys.exit(main())
