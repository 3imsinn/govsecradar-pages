"""Build the public read-only JSON feed from the publishers' RSS endpoints."""
import datetime as dt
import email.utils
import itertools
import json
import os
import sys
import urllib.request
import xml.etree.ElementTree as ET
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "web/api/feed.json"


class PlainText(HTMLParser):
    def __init__(self):
        super().__init__()
        self.parts = []

    def handle_data(self, data):
        self.parts.append(data)


def excerpt(raw):
    parser = PlainText()
    parser.feed(raw)
    parser.close()
    text = " ".join(" ".join(parser.parts).split())
    return text if len(text) <= 220 else text[:220].rsplit(" ", 1)[0] + " …"


def publication_date(value):
    if not value:
        return None
    try:
        value = value.replace(" CEST", " +0200").replace(" CET", " +0100")
        date = email.utils.parsedate_to_datetime(value)
        return date.astimezone(dt.timezone.utc).isoformat() if date.tzinfo else None
    except (ValueError, TypeError, OverflowError):
        return None


def collect(source):
    request = urllib.request.Request(source["url"], headers={"User-Agent": "GovSecRadar/1.0 (+https://3imsinn.de/)"})
    with urllib.request.urlopen(request, timeout=25) as response:
        raw = response.read(3_000_001)
    if len(raw) > 3_000_000:
        raise ValueError("Feed exceeds size limit")
    entries = ET.fromstring(raw).findall("./channel/item")
    rows = []
    seen = set()
    for entry in entries:
        url = (entry.findtext("link") or "").strip()
        title = (entry.findtext("title") or "").strip()
        parsed = urlsplit(url)
        if not title or parsed.scheme != "https" or not parsed.hostname or url in seen:
            continue
        seen.add(url)
        rows.append(dict(title=title, url=url, source=source["name"], category=source["category"],
                         date=publication_date(entry.findtext("pubDate")),
                         summary=excerpt(entry.findtext("description") or "")))
        if len(rows) == 60:
            break
    if not rows:
        raise ValueError("No usable RSS items")
    return rows


def main():
    previous = json.loads(OUTPUT.read_text()) if OUTPUT.exists() else {"items": []}
    sources = json.loads((ROOT / "tools/sources.json").read_text())
    groups = []
    for source in sources:
        try:
            group = collect(source)
            source["stale"] = False
        except (OSError, ValueError, ET.ParseError) as error:
            print(f'{source["name"]}: {error}', file=sys.stderr)
            group = [r for r in previous["items"] if r["source"] == source["name"]]
            source["stale"] = True
        groups.append(group)
    if all(s["stale"] for s in sources):
        raise SystemExit("No source refreshed. Keeping the published briefing.")
    items = [row for batch in itertools.zip_longest(*groups) for row in batch if row]
    payload = dict(updated=dt.datetime.now(dt.timezone.utc).isoformat(), sources=sources, items=items,
                   androidTestUrl=os.getenv("ANDROID_TEST_URL", ""))
    OUTPUT.parent.mkdir(exist_ok=True)
    OUTPUT.write_text(json.dumps(payload, ensure_ascii=False), encoding="utf-8")
    print("Published items by source:", [len(group) for group in groups])


if __name__ == "__main__":
    main()
