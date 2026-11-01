import json
import os
import subprocess
import threading
import webbrowser
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parent


class LibraryHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        parsed = urlparse(self.path)
        if parsed.path == "/api/health":
            self.send_json({"ok": True})
            return

        if parsed.path == "/api/updates":
            self.send_json({"entries": self.get_update_log()})
            return

        path = parsed.path
        if path in {"/", ""}:
            path = "/index.html"
        target = (ROOT / path.lstrip("/")).resolve()

        if not str(target).startswith(str(ROOT)):
            self.send_error(HTTPStatus.FORBIDDEN, "Forbidden")
            return

        if target.is_dir():
            target = target / "index.html"

        if not target.exists():
            self.send_error(HTTPStatus.NOT_FOUND, "Not Found")
            return

        self.send_response(HTTPStatus.OK)
        content_type = self._content_type_for(target)
        self.send_header("Content-Type", content_type)
        self.end_headers()
        with target.open("rb") as handle:
            self.wfile.write(handle.read())

    def do_POST(self):
        parsed = urlparse(self.path)
        if parsed.path != "/api/save-library":
            self.send_error(HTTPStatus.NOT_FOUND, "Not Found")
            return

        content_length = int(self.headers.get("Content-Length", "0"))
        raw_body = self.rfile.read(content_length) if content_length else b"{}"

        try:
            body = json.loads(raw_body.decode("utf-8") or "{}")
        except json.JSONDecodeError as exc:
            self.send_json({"saved": False, "error": f"Invalid JSON: {exc}"}, status=HTTPStatus.BAD_REQUEST)
            return

        payload_text = body.get("payload")
        if isinstance(payload_text, str) and payload_text.strip():
            subjects_json_path = ROOT / "subjects.json"
            subjects_json_path.write_text(payload_text, encoding="utf-8")
        else:
            subjects_json_path = ROOT / "subjects.json"
            subjects_json_path.write_text(json.dumps(body.get("subjects") or {}, indent=2) + "\n", encoding="utf-8")

        subjects = body.get("subjects")
        if isinstance(subjects, list):
            for subject in subjects:
                if not isinstance(subject, dict):
                    continue
                chapters = subject.get("chapters") or []
                for chapter in chapters:
                    if not isinstance(chapter, dict):
                        continue
                    file_path = chapter.get("file") or chapter.get("path")
                    if not isinstance(file_path, str) or not file_path.strip():
                        continue
                    chapter_file = (ROOT / file_path.lstrip("/")).resolve()
                    if not str(chapter_file).startswith(str(ROOT)):
                        continue
                    chapter_file.parent.mkdir(parents=True, exist_ok=True)
                    # Preserve all chapter properties, with fallbacks for required fields
                    chapter_payload = dict(chapter)  # Copy all chapter data
                    if "title" not in chapter_payload or not chapter_payload["title"]:
                        chapter_payload["title"] = "Imported"
                    if "questions" not in chapter_payload:
                        chapter_payload["questions"] = []
                    chapter_file.write_text(json.dumps(chapter_payload, indent=2) + "\n", encoding="utf-8")

        # Accept optional markdown notes per subject: { notes: { '<subject-id>': '<markdown content>' } }
        notes = body.get("notes")
        if isinstance(notes, dict):
            notes_dir = ROOT / "markdowns"
            notes_dir.mkdir(parents=True, exist_ok=True)
            for subj_id, md_text in notes.items():
                try:
                    if not isinstance(md_text, str) or not md_text.strip():
                        continue
                    subject = next((s for s in subjects if s.get("id") == subj_id), None)
                    if subject and isinstance(subject.get("notesPath"), str) and subject.get("notesPath").strip():
                        target_path = subject.get("notesPath").strip()
                        if not target_path.lower().endswith(".md"):
                            target_path += ".md"
                        note_file = (ROOT / target_path.lstrip("/")).resolve()
                    else:
                        safe_name = f"{subj_id}.md"
                        note_file = (notes_dir / safe_name).resolve()
                    if not str(note_file).startswith(str(ROOT)):
                        continue
                    note_file.parent.mkdir(parents=True, exist_ok=True)
                    note_file.write_text(md_text, encoding="utf-8")
                except Exception:
                    continue

        self.send_json({"saved": True, "path": "subjects.json"})

    def get_update_log(self):
        try:
            result = subprocess.run(
                ["git", "log", "--pretty=format:%ad|%h|%s", "--date=short", "-n", "10"],
                cwd=ROOT,
                capture_output=True,
                text=True,
                check=True
            )
            entries = []
            for line in result.stdout.splitlines():
                parts = line.split("|", 2)
                if len(parts) == 3:
                    entries.append({
                        "date": parts[0],
                        "hash": parts[1],
                        "message": parts[2]
                    })
            return entries
        except (subprocess.CalledProcessError, FileNotFoundError):
            return []

    def send_json(self, payload, status=HTTPStatus.OK):
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _content_type_for(self, path: Path) -> str:
        suffix = path.suffix.lower()
        mapping = {
            ".html": "text/html; charset=utf-8",
            ".js": "application/javascript; charset=utf-8",
            ".css": "text/css; charset=utf-8",
            ".json": "application/json; charset=utf-8",
            ".png": "image/png",
            ".jpg": "image/jpeg",
            ".jpeg": "image/jpeg",
            ".svg": "image/svg+xml",
            ".txt": "text/plain; charset=utf-8",
            ".ico": "image/x-icon",
        }
        return mapping.get(suffix, "application/octet-stream")

    def log_message(self, format, *args):
        return


def main() -> None:
    host = "0.0.0.0"
    port = 8000
    server = ThreadingHTTPServer((host, port), LibraryHandler)
    browser_url = f"http://localhost:{port}/"
    print(f"Serving HTTP on {host}:{port}")
    print(f"Opening {browser_url}")
    threading.Timer(0.5, webbrowser.open, args=(browser_url,)).start()
    server.serve_forever()


if __name__ == "__main__":
    main()
