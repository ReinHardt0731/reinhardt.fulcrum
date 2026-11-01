#!/usr/bin/env python3
"""Register an existing chapter JSON file under a subject and invalidate app caches.

Example:
  python add_chapter.py --subject acrm --input chapters/preboards-mock-exam.json
  python add_chapter.py --subject "AIRCRAFT STRUCTURE AND DESIGN" --input .tmp/chapter.json --title "Preboard Mock"

The input JSON can be a chapter object with a `questions` list or a bare list of
question objects. Conversion from source documents should happen before running
this utility; it only installs and registers the converted chapter.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parent
SUBJECTS_FILE = ROOT / "subjects.json"
SHARED_FILE = ROOT / "shared.js"
CHAPTERS_DIR = ROOT / "chapters"
CACHE_VERSION_RE = re.compile(
    r'(?m)^(const SUBJECTS_CACHE_VERSION = ")[^"]+(";)$'
)


def fail(message: str) -> None:
    raise SystemExit(f"add_chapter.py: error: {message}")


def load_json(path: Path) -> Any:
    try:
        return json.loads(path.read_text(encoding="utf-8-sig"))
    except OSError as exc:
        fail(f"cannot read {path}: {exc}")
    except json.JSONDecodeError as exc:
        fail(f"invalid JSON in {path} at line {exc.lineno}, column {exc.colno}: {exc.msg}")


def write_json(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_name(path.name + ".tmp")
    temporary.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    temporary.replace(path)


def slugify(value: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
    return slug or "imported-chapter"


def resolve_subject(subjects: list[dict[str, Any]], identifier: str) -> dict[str, Any]:
    needle = identifier.strip().casefold()
    matches = [
        subject
        for subject in subjects
        if str(subject.get("id", "")).casefold() == needle
        or str(subject.get("name", "")).casefold() == needle
    ]
    if len(matches) != 1:
        available = ", ".join(
            f"{subject.get('id')} ({subject.get('name')})" for subject in subjects
        )
        fail(f"subject {identifier!r} was not found. Available subjects: {available}")
    return matches[0]


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Add a converted chapter JSON file to a subject and refresh the app cache."
    )
    parser.add_argument(
        "--subject", required=True, help="subject id or exact subject name from subjects.json"
    )
    parser.add_argument(
        "--input", required=True, type=Path, help="converted chapter JSON file"
    )
    parser.add_argument(
        "--title", help="chapter title; defaults to the title stored in the input JSON"
    )
    parser.add_argument(
        "--replace",
        action="store_true",
        help="replace the chapter JSON if a chapter with this title is already registered",
    )
    args = parser.parse_args()

    if not SUBJECTS_FILE.is_file() or not SHARED_FILE.is_file():
        fail("run this script from inside the project; subjects.json or shared.js is missing")

    subjects_payload = load_json(SUBJECTS_FILE)
    if not isinstance(subjects_payload, dict) or not isinstance(
        subjects_payload.get("subjects"), list
    ):
        fail("subjects.json must contain a top-level 'subjects' array")
    subject = resolve_subject(subjects_payload["subjects"], args.subject)

    input_path = args.input if args.input.is_absolute() else (Path.cwd() / args.input)
    chapter_payload = load_json(input_path.resolve())
    if isinstance(chapter_payload, list):
        chapter_payload = {"questions": chapter_payload}
    if not isinstance(chapter_payload, dict):
        fail("the input must be a chapter object or a list of question objects")
    questions = chapter_payload.get("questions")
    if not isinstance(questions, list) or not questions:
        fail("the input chapter must contain a non-empty 'questions' array")
    if not all(isinstance(question, dict) for question in questions):
        fail("every item in 'questions' must be a JSON object")

    title = (args.title or chapter_payload.get("title") or "").strip()
    if not title:
        fail("provide --title or include a non-empty 'title' in the input JSON")
    chapter_payload["title"] = title

    chapters = subject.setdefault("chapters", [])
    if not isinstance(chapters, list):
        fail(f"subject {subject.get('id')!r} has an invalid chapters list")
    existing = next(
        (chapter for chapter in chapters if str(chapter.get("title", "")).casefold() == title.casefold()),
        None,
    )
    if existing and not args.replace:
        fail(f"chapter {title!r} is already registered; use --replace to update it")

    if existing and args.replace:
        relative_path = str(existing.get("file", "")).replace("\\", "/")
        if not relative_path:
            fail("the existing chapter has no file path and cannot be replaced safely")
    else:
        relative_path = f"chapters/{slugify(title)}.json"
        destination = (ROOT / relative_path).resolve()
        if destination.exists():
            fail(f"{relative_path} already exists; choose another title or use --replace")

    destination = (ROOT / relative_path).resolve()
    if ROOT not in destination.parents:
        fail("chapter path must stay inside the project")

    shared_text = SHARED_FILE.read_text(encoding="utf-8")
    if not CACHE_VERSION_RE.search(shared_text):
        fail("could not find SUBJECTS_CACHE_VERSION in shared.js; no files were changed")
    cache_version = "aircraft-materials-reference-" + datetime.now(timezone.utc).strftime(
        "%Y%m%d%H%M%S%f"
    )

    chapter_payload.setdefault("sourceFiles", [str(input_path.resolve())])
    chapter_payload.setdefault("questions", questions)
    write_json(destination, chapter_payload)

    if existing:
        existing["file"] = relative_path
    else:
        chapters.append({"title": title, "file": relative_path})
    subject["updatedAt"] = datetime.now(timezone.utc).isoformat(timespec="milliseconds").replace(
        "+00:00", "Z"
    )
    write_json(SUBJECTS_FILE, subjects_payload)

    shared_text = CACHE_VERSION_RE.sub(
        lambda match: match.group(1) + cache_version + match.group(2), shared_text, count=1
    )
    SHARED_FILE.write_text(shared_text, encoding="utf-8", newline="\n")

    print(f"Added {title!r} to {subject.get('name', subject.get('id'))}.")
    print(f"Chapter file: {relative_path} ({len(questions)} questions)")
    print(f"Cache version: {cache_version}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
