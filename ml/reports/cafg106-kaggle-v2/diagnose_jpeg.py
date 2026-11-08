"""Diagnóstico aislado de Roya 752.jpg. No ejecuta inferencia ni modifica inputs."""

import csv
import hashlib
import importlib.util
import itertools
import json
import os
from pathlib import Path
import platform
import subprocess
import sys
import tempfile

EXPECTED = "4134a59cdff7584c8ce4a80f40ca4e410988599c11d30a9474b4034caab93ff1"
MANIFEST_HASH = "b108a954018011e4d4705342970f27921ca90d29d79d5099e988c2c0cf147cde"


def digest(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def jpeg_structure(data):
    """Recorre segmentos y marcadores; no es una prueba completa de entropía JPEG."""
    result = {"soi": data[:2].hex(), "size_bytes": len(data), "segments": [],
              "issues": [], "eoi_offsets": []}
    pos = 2
    while pos < len(data):
        start = data.find(b"\xff", pos)
        if start < 0:
            break
        if start != pos:
            result["issues"].append({"unparsed_bytes": start - pos, "offset": pos})
        pos = start + 1
        while pos < len(data) and data[pos] == 255:
            pos += 1
        if pos >= len(data):
            break
        marker = data[pos]
        pos += 1
        segment = {"marker": f"FF{marker:02X}", "offset": start}
        result["segments"].append(segment)
        if marker == 0xD9:
            result["eoi_offsets"].append(start)
            result["trailing_bytes_after_eoi"] = len(data) - pos
            break
        if marker in [0xD8, 0x01] or 0xD0 <= marker <= 0xD7:
            continue
        if marker == 0:
            result["issues"].append({"stuffed_byte_outside_scan": start})
            continue
        if pos + 2 > len(data):
            result["issues"].append({"missing_length": start})
            break
        length = int.from_bytes(data[pos:pos + 2], "big")
        segment["length"] = length
        if length < 2 or pos + length > len(data):
            result["issues"].append({"segment_exceeds_file_or_invalid_length": start})
            break
        payload = data[pos + 2:pos + length]
        pos += length
        if marker in [0xC0, 0xC1, 0xC2] and len(payload) >= 6:
            segment.update(precision=payload[0], height=int.from_bytes(payload[1:3], "big"),
                           width=int.from_bytes(payload[3:5], "big"), components=payload[5],
                           component_parameters=list(payload[6:]))
        if 0xE0 <= marker <= 0xEF or marker == 0xFE:
            segment["identifier_hex"] = payload[:24].hex()
        if marker == 0xC4:
            tables, offset = [], 0
            while offset + 17 <= len(payload):
                selector = payload[offset]
                counts = list(payload[offset + 1:offset + 17])
                symbols = sum(counts)
                available, oversubscribed = 1, False
                for count in counts:
                    available = available * 2 - count
                    oversubscribed |= available < 0
                tables.append({"selector": selector, "code_counts": counts,
                               "symbol_count": symbols, "oversubscribed": oversubscribed,
                               "symbols_truncated": offset + 17 + symbols > len(payload)})
                offset += 17 + symbols
            segment["huffman_tables"] = tables
            segment["unparsed_table_bytes"] = len(payload) - offset
        if marker == 0xDA:
            segment["scan_header_hex"] = payload.hex()
            scan_start = pos
            stuffed = restarts = 0
            while pos < len(data):
                candidate = data.find(b"\xff", pos)
                if candidate < 0 or candidate + 1 >= len(data):
                    pos = len(data)
                    break
                next_byte = data[candidate + 1]
                if next_byte == 0:
                    stuffed += 1
                    pos = candidate + 2
                elif 0xD0 <= next_byte <= 0xD7:
                    restarts += 1
                    pos = candidate + 2
                elif next_byte == 255:
                    pos = candidate + 1
                else:
                    pos = candidate
                    break
            segment.update(entropy_bytes=pos - scan_start, stuffed_bytes=stuffed,
                           restart_markers=restarts)
    if not result["eoi_offsets"]:
        result["issues"].append("No EOI found")
    return result


WORKER = r'''
import json, sys, traceback
import numpy as np
path, method, output = sys.argv[1:]
result = {'method': method, 'stage': 'import'}
try:
    if method.startswith('pillow'):
        import PIL
        from PIL import Image, ImageFile, features
        result.update(version=PIL.__version__, module=PIL.__file__,
                      jpeg_codec=features.version_codec('jpg'),
                      libjpeg_turbo=features.check_feature('libjpeg_turbo'))
        ImageFile.LOAD_TRUNCATED_IMAGES = method == 'pillow_tolerant'
        result['stage'] = 'open_headers'
        with Image.open(path) as image:
            exif = image.getexif()
            result.update(format=image.format, mode=image.mode, dimensions=list(image.size),
                          info={k: repr(v)[:300] for k,v in image.info.items()},
                          exif={str(k): repr(v)[:300] for k,v in exif.items()},
                          quantization_tables=sorted(getattr(image, 'quantization', {})))
            if method == 'pillow_verify':
                result['stage'] = 'verify'
                image.verify()
                result['success'] = True
            else:
                result['stage'] = 'load_entropy'
                image.load()
                result['stage'] = 'convert_RGB'
                array = np.asarray(image.convert('RGB'))
    elif method == 'opencv':
        import cv2
        result.update(version=cv2.__version__, jpeg_build=[line.strip() for line in cv2.getBuildInformation().splitlines() if 'JPEG' in line])
        result['stage'] = 'imdecode'
        decoded = cv2.imdecode(np.fromfile(path, dtype=np.uint8), cv2.IMREAD_COLOR | cv2.IMREAD_IGNORE_ORIENTATION)
        if decoded is None:
            raise RuntimeError('cv2.imdecode returned None')
        array = cv2.cvtColor(decoded, cv2.COLOR_BGR2RGB)
    elif method == 'torchvision':
        import torchvision
        from torchvision.io import read_file, decode_jpeg, ImageReadMode
        result['version'] = torchvision.__version__
        result['stage'] = 'decode_jpeg'
        tensor = decode_jpeg(read_file(path), mode=ImageReadMode.RGB, apply_exif_orientation=False)
        array = tensor.permute(1,2,0).numpy()
    if method != 'pillow_verify':
        if array.ndim != 3 or array.shape[2] != 3:
            raise RuntimeError(f'Unexpected array shape {array.shape}')
        np.save(output, array)
        result.update(success=True, dimensions=[int(array.shape[1]), int(array.shape[0])], dtype=str(array.dtype))
    result['stage'] = 'completed'
except Exception as error:
    result.update(success=False, error_type=type(error).__name__, error=str(error), traceback=traceback.format_exc())
print(json.dumps(result))
'''


def run(image_path, manifest_path, output_dir):
    import numpy as np
    from PIL import Image

    image_path, manifest_path, output = map(Path, (image_path, manifest_path, output_dir))
    output.mkdir(parents=True, exist_ok=False)
    original = digest(image_path)
    assert original == EXPECTED, original
    assert digest(manifest_path) == MANIFEST_HASH
    with manifest_path.open(encoding="utf-8-sig", newline="") as stream:
        rows = [r for r in csv.DictReader(stream) if r["ruta"].endswith("/Roya/Roya 752.jpg")]
    assert len(rows) == 1 and rows[0]["split"] == "test" and rows[0]["sha256"] == original
    report = {"original_sha256_before": original, "manifest_sha256": digest(manifest_path),
              "manifest_row": rows[0], "python": platform.python_version(),
              "structure": jpeg_structure(image_path.read_bytes()), "methods": [],
              "isolated_installs": [], "comparisons": []}
    arrays = {}
    with tempfile.TemporaryDirectory(prefix="cafg106-jpeg-") as temp:
        temp = Path(temp)

        def attempt(label, method, pillow_dir=None):
            target = temp / f"{label}.npy"
            env = os.environ.copy()
            if pillow_dir:
                env["PYTHONPATH"] = str(pillow_dir)
            process = subprocess.run([sys.executable, "-c", WORKER, str(image_path), method, str(target)],
                                     capture_output=True, text=True, env=env, timeout=120)
            result = {"label": label, "stderr": process.stderr, "exit_code": process.returncode}
            try:
                result.update(json.loads(process.stdout.strip().splitlines()[-1]))
            except Exception:
                result.update(success=False, stdout=process.stdout)
            report["methods"].append(result)
            if target.is_file():
                array = np.load(target)
                arrays[label] = array
                row_std = array.astype(np.float32).std(axis=1).mean(axis=1)
                result["nearly_uniform_rows_std_lt_1"] = np.flatnonzero(row_std < 1).tolist()
                result["bottom_32_rows_mean_rgb"] = array[-32:].mean(axis=(0, 1)).tolist()
                result["last_row_std"] = float(row_std[-1])
                result["decoded_rgb_sha256"] = hashlib.sha256(array.tobytes()).hexdigest()
                preview = Image.fromarray(array)
                preview.thumbnail((1200, 1200))
                preview.save(output / f"preview_{label}.png")
            print(label, json.dumps(result, ensure_ascii=False), flush=True)

        for i in range(3):
            attempt(f"pillow13_strict_repeat{i + 1}", "pillow_strict")
        attempt("pillow13_verify", "pillow_verify")
        attempt("pillow13_tolerant", "pillow_tolerant")
        if importlib.util.find_spec("cv2"):
            attempt("opencv", "opencv")
        if importlib.util.find_spec("torchvision"):
            attempt("torchvision", "torchvision")
        for version in ["12.0.0", "11.3.0"]:
            target = temp / f"pillow-{version}"
            process = subprocess.run([sys.executable, "-m", "pip", "install", "--disable-pip-version-check",
                                      "--no-deps", "--only-binary=:all:", "--target", str(target),
                                      f"Pillow=={version}"], capture_output=True, text=True, timeout=180)
            report["isolated_installs"].append({"version": version, "exit_code": process.returncode,
                                                "stdout": process.stdout, "stderr": process.stderr})
            if process.returncode == 0:
                attempt(f"pillow{version}_strict", "pillow_strict", target)
                attempt(f"pillow{version}_tolerant", "pillow_tolerant", target)
        for (name_a, a), (name_b, b) in itertools.combinations(arrays.items(), 2):
            comparison = {"a": name_a, "b": name_b, "same_shape": a.shape == b.shape}
            if a.shape == b.shape:
                difference = np.abs(a.astype(np.int16) - b.astype(np.int16))
                comparison.update(mae=float(difference.mean()), max_difference=int(difference.max()),
                                  fraction_pixels_different=float(np.any(difference != 0, axis=2).mean()),
                                  rmse=float(np.sqrt(np.mean(difference.astype(np.float64) ** 2))))
            report["comparisons"].append(comparison)
        if "pillow13_tolerant" in arrays and "opencv" in arrays:
            a, b = arrays["pillow13_tolerant"], arrays["opencv"]
            if a.shape == b.shape:
                diff = np.abs(a.astype(np.int16) - b.astype(np.int16)).max(axis=2)
                visual = Image.fromarray(np.repeat(np.minimum(diff * 8, 255).astype(np.uint8)[:, :, None], 3, axis=2))
                visual.thumbnail((1200, 1200))
                visual.save(output / "difference_pillow_opencv_x8.png")
    report["original_sha256_after"] = digest(image_path)
    report["original_unchanged"] = report["original_sha256_after"] == original
    (output / "jpeg_diagnostic.json").write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print("DIAGNOSTIC_COMPLETE", report["original_unchanged"], flush=True)
    return report
