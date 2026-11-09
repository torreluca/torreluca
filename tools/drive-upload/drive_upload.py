#!/usr/bin/env python3
"""Carica file su Google Drive tramite il ponte Apps Script (vedi Code.gs).

Uso:
  DRIVE_UPLOAD_KEY=... python3 drive_upload.py FILE [FILE ...] --folder FOLDER_ID
        [--subfolder NOME] [--overwrite] [--url URL]

L'URL del ponte si prende da --url, poi da $DRIVE_UPLOAD_URL, poi da config.json
accanto a questo script. La chiave NON va mai salvata nel repo: Claude la legge
dal file Drive "Claude Drive Upload - chiave" e la passa in $DRIVE_UPLOAD_KEY.
Verifica l'MD5 restituito da Drive con quello locale.
"""
import argparse, base64, hashlib, json, mimetypes, os, sys, time, urllib.parse, urllib.request
from pathlib import Path

HERE = Path(__file__).resolve().parent


def bridge_url(cli):
    if cli:
        return cli
    if os.environ.get("DRIVE_UPLOAD_URL"):
        return os.environ["DRIVE_UPLOAD_URL"]
    cfg = HERE / "config.json"
    if cfg.exists():
        return json.loads(cfg.read_text())["url"]
    sys.exit("URL del ponte mancante: usa --url, $DRIVE_UPLOAD_URL o config.json")


def upload(url, key, path, folder, subfolder, overwrite):
    data = path.read_bytes()
    params = {"key": key, "name": path.name,
              "mimeType": mimetypes.guess_type(path.name)[0] or "application/octet-stream"}
    if folder: params["folderId"] = folder
    if subfolder: params["subfolder"] = subfolder
    if overwrite: params["overwrite"] = "1"
    req = urllib.request.Request(url + "?" + urllib.parse.urlencode(params),
                                 data=base64.b64encode(data), method="POST",
                                 headers={"Content-Type": "text/plain"})
    for attempt in range(4):
        try:
            with urllib.request.urlopen(req, timeout=180) as r:  # segue il 302 di Apps Script
                res = json.loads(r.read().decode())
            break
        except Exception as e:  # errori di rete: ritenta
            if attempt == 3: raise
            time.sleep(2 ** (attempt + 1))
    if res.get("ok"):
        local = hashlib.md5(data).hexdigest()
        res["verified"] = res.get("md5") == local
        if not res["verified"]:
            res["ok"] = False; res["error"] = f"md5 diverso (locale {local})"
    return res


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("files", nargs="+", type=Path)
    ap.add_argument("--folder", help="ID cartella Drive (default: Il mio Drive)")
    ap.add_argument("--subfolder", help="sottocartella da usare/creare dentro --folder")
    ap.add_argument("--overwrite", action="store_true")
    ap.add_argument("--url")
    a = ap.parse_args()
    key = os.environ.get("DRIVE_UPLOAD_KEY") or sys.exit("$DRIVE_UPLOAD_KEY mancante")
    url = bridge_url(a.url)
    failed = 0
    for f in a.files:
        res = upload(url, key, f, a.folder, a.subfolder, a.overwrite)
        res.pop("md5", None)
        print(json.dumps({"file": str(f), **res}, ensure_ascii=False))
        failed += not res.get("ok")
    sys.exit(1 if failed else 0)


if __name__ == "__main__":
    main()
