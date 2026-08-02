"""Deterministic local QA receipt for the additive candidate.

Run once after build_candidate.py. Refuses to overwrite qa_report.json.
"""

from __future__ import annotations

import csv
import json
import re
from html.parser import HTMLParser
from pathlib import Path


SITE = Path(__file__).resolve().parent
ROOT = SITE.parents[1]
PROGRAM = ROOT / "archive" / "program_attempt_02"
RECORDINGS = ROOT / "archive" / "recordings_attempt_02"
RECHECK = ROOT / "archive" / "recordings_recheck_20260802T222822Z"


class HTMLShape(HTMLParser):
    def __init__(self):
        super().__init__()
        self.tags = []
        self.ids = []
        self.external_assets = []

    def handle_starttag(self, tag, attrs):
        self.tags.append(tag)
        attrs = dict(attrs)
        if attrs.get("id"):
            self.ids.append(attrs["id"])
        for key in ("src", "href"):
            value = attrs.get(key, "")
            if value.startswith("http") and (tag in {"script", "link"} or key == "src"):
                self.external_assets.append(value)


def load(name):
    return json.loads((SITE / name).read_text(encoding="utf-8"))


def main():
    required = ["analysis.json", "sources.json", "index.html", "worker_report.md", "build_candidate.py", "qa_check.py"]
    assert all((SITE / name).exists() for name in required), "required candidate file missing"
    assert (SITE / "BRIEF.md").exists(), "BRIEF.md missing or not preserved"
    assert not (SITE / "qa_report.json").exists(), "refusing to overwrite existing qa_report.json"

    analysis = load("analysis.json")
    sources = load("sources.json")
    program = json.loads((PROGRAM / "program.json").read_text(encoding="utf-8"))
    recordings = json.loads((RECORDINGS / "recordings.json").read_text(encoding="utf-8"))
    tx = json.loads((RECORDINGS / "transcript_index.json").read_text(encoding="utf-8"))
    manifest = json.loads((RECORDINGS / "final_recording_manifest_ended_11.json").read_text(encoding="utf-8"))
    playlist = json.loads((RECHECK / "official_playlist.info.json").read_text(encoding="utf-8"))
    joins = list(csv.DictReader((PROGRAM / "session_speakers.csv").open(encoding="utf-8")))

    totals = analysis["totals"]
    available_aug1 = [e for e in tx["entries"] if e["day"] == "2026-08-01" and e["status"] == "available"]
    ended = [r for r in recordings["recordings"] if r["publish_live_status"]["recording_status"] == "ended_archive"]
    expected = {
        "program_blocks": len(program["sessions"]), "speakers": len(program["speakers"]),
        "session_speaker_joins": len(joins), "organizations": len(program["organization_index"]),
        "recordings_in_snapshot": len(recordings["recordings"]), "ended_recordings": len(ended),
        "aug1_transcript_files": len(available_aug1), "aug1_normalized_cues": sum(e["normalized_cue_count"] for e in available_aug1),
        "final_manifest_media": manifest["final_media_count"], "final_manifest_bytes": manifest["total_bytes"],
        "fresh_playlist_entries": len(playlist.get("entries", [])),
    }
    count_checks = {k: totals.get(k) == v for k, v in expected.items()}
    assert all(count_checks.values()), count_checks

    expected_speaker_sessions = {}
    for row in joins:
        expected_speaker_sessions.setdefault(row["speaker_name"], set()).add(row["session_id"])
    speaker_rows = analysis["speakers"]
    mapped_rows = [s for s in speaker_rows if s["status"] == "mapped_to_program"]
    featured_rows = [s for s in speaker_rows if s["status"] == "featured_only_unmapped"]
    speaker_mapping_checks = {
        "all_178_people_present": len(speaker_rows) == len(program["speakers"]) == 178,
        "mapped_169": len(mapped_rows) == totals.get("program_mapped_people") == 169,
        "featured_only_9": len(featured_rows) == totals.get("featured_only_people") == 9,
        "mapped_nonzero": all(s["sessions"] > 0 for s in mapped_rows),
        "featured_zero": all(s["sessions"] == 0 for s in featured_rows),
        "distinct_block_counts_exact": all(s["sessions"] == len(expected_speaker_sessions.get(s["name"], set())) for s in speaker_rows),
        "mapping_labels_exact": all(s["mapping_label"] == ("program-mapped" if s["status"] == "mapped_to_program" else "featured-only / not program-mapped") for s in speaker_rows),
    }
    assert all(speaker_mapping_checks.values()), speaker_mapping_checks
    assert len(analysis["claims"]) >= 10, "representative claim set too small"
    assert all(c.get("fact_vs_interpretation", c.get("label")) for c in analysis["claims"])

    html_text = (SITE / "index.html").read_text(encoding="utf-8")
    parser = HTMLShape()
    parser.feed(html_text)
    assert "html" in parser.tags and "body" in parser.tags and "script" in parser.tags
    assert 'name="viewport"' in html_text
    assert "overflow-x:hidden" in html_text
    assert "align-items:start" in html_text
    assert "169 program-mapped + 9 featured-only" in html_text
    assert "Scroll horizontally to inspect the full evidence table" in html_text
    assert "@media(max-width:560px)" in html_text
    assert not parser.external_assets, f"external CSS/JS/font dependency found: {parser.external_assets}"
    assert len(parser.ids) == len(set(parser.ids)), "duplicate HTML ids can break search/filter behavior"

    public_text = "\n".join((SITE / name).read_text(encoding="utf-8") for name in ["analysis.json", "sources.json", "index.html", "worker_report.md"])
    privacy_patterns = {
        "absolute macOS path": r"(?:^|[\"'\s])/Users/",
        "absolute home path": r"(?:^|[\"'\s])/home/",
        "email address": r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}",
        "bearer credential": r"(?i)bearer\s+[A-Za-z0-9._-]{12,}",
        "secret-key prefix": r"(?:sk|rk)-[A-Za-z0-9_-]{12,}",
    }
    privacy_checks = {name: not re.search(pattern, public_text) for name, pattern in privacy_patterns.items()}
    assert all(privacy_checks.values()), privacy_checks

    allowed_domains = {
        "rdi.berkeley.edu", "youtube.com", "www.youtube.com", "river.ai", "docs.river.ai",
        "jobs.ashbyhq.com", "api.ashbyhq.com", "pypi.org", "www.forbes.com", "app.dealroom.co",
        "babuschk.in", "job-boards.greenhouse.io", "console.river.ai",
    }
    urls = re.findall(r"https?://([^/\"'<> ]+)", public_text)
    domain_checks = {domain: domain.split(":")[0] in allowed_domains for domain in urls}
    assert all(domain_checks.values()), domain_checks

    source_paths = [s["path"] for s in sources["sources"]]
    source_path_checks = {p: not p.startswith("/") and ".." not in Path(p).parts for p in source_paths}
    assert all(source_path_checks.values()), source_path_checks
    assert all(c["evidence"].get("source_path") and not c["evidence"]["source_path"].startswith("/") for c in analysis["claims"])

    report = {
        "schema_version": 1,
        "status": "pass",
        "checks": {
            "json_parse": True,
            "html_parse": True,
            "privacy": privacy_checks,
            "source_paths": True,
            "approved_public_domains": True,
            "counts": count_checks,
            "speaker_mapping": speaker_mapping_checks,
            "responsive_overflow_static": {"viewport": True, "responsive_breakpoint": True, "overflow_x_hidden": True, "no_external_assets": True, "unique_ids": True, "explorer_top_aligned": "align-items:start" in html_text, "mobile_claim_search_full_row": "claim-controls #claimSearch" in html_text, "mobile_coverage_scroll_cue": "Scroll horizontally to inspect the full evidence table" in html_text},
            "brief_preserved": True,
        },
        "claim_count": len(analysis["claims"]),
        "source_count": len(sources["sources"]),
        "output_files": sorted(p.name for p in SITE.iterdir() if p.is_file()),
        "notes": [
            "Static overflow checks cover CSS/markup invariants; no browser binary was required or invoked.",
            "URLs are limited to official/public domains already present in accepted evidence notes or official event/recording links.",
        ],
    }
    (SITE / "qa_report.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8", newline="\n")
    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
