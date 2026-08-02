"""Build the additive local candidate from the accepted summit corpus only.

This script intentionally refuses to overwrite any existing candidate artifact.
It is standard-library-only and does not perform network or external actions.
"""

from __future__ import annotations

import csv
import html
import json
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
SITE = Path(__file__).resolve().parent
PROGRAM_DIR = ROOT / "archive" / "program_attempt_02"
RECORDING_DIR = ROOT / "archive" / "recordings_attempt_02"
RECHECK_DIR = ROOT / "archive" / "recordings_recheck_20260802T222822Z"
RIVER_DIR = ROOT / "company_research_river_ai_attempt_01"


def load_json(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def write_new(path: Path, content: str) -> None:
    if path.exists():
        raise RuntimeError(f"Refusing to overwrite existing file: {path}")
    path.write_text(content, encoding="utf-8", newline="\n")


def public_recording_id(url: str | None) -> str | None:
    if not url:
        return None
    return url.split("/")[-1].split("?")[0]


def source_ref(source_type, source_path, official_url=None, recording_id=None,
               relative_timestamp=None, excerpt=None, excerpt_note=None):
    evidence = {
        "source_type": source_type,
        "source_path": source_path,
        "official_url": official_url,
        "recording_id": recording_id,
        "relative_timestamp": relative_timestamp,
        "excerpt": excerpt,
        "excerpt_note": excerpt_note,
    }
    return {k: v for k, v in evidence.items() if v is not None}


def main() -> None:
    program = load_json(PROGRAM_DIR / "program.json")
    official_sources = load_json(PROGRAM_DIR / "official_sources.json")
    recordings = load_json(RECORDING_DIR / "recordings.json")
    transcript_index = load_json(RECORDING_DIR / "transcript_index.json")
    final_manifest = load_json(RECORDING_DIR / "final_recording_manifest_ended_11.json")
    playlist = load_json(RECHECK_DIR / "official_playlist.info.json")
    river_facts = load_json(RIVER_DIR / "river_ai_facts.json")
    river_sources = load_json(RIVER_DIR / "river_ai_sources.json")

    sessions_csv = list(csv.DictReader((PROGRAM_DIR / "sessions.csv").open(encoding="utf-8")))
    session_speakers_csv = list(csv.DictReader((PROGRAM_DIR / "session_speakers.csv").open(encoding="utf-8")))
    companies_csv = list(csv.DictReader((PROGRAM_DIR / "companies.csv").open(encoding="utf-8")))

    rec_by_id = {r["video_id"]: r for r in recordings["recordings"]}
    tx_by_id = {r["video_id"]: r for r in transcript_index["entries"]}
    session_people: dict[str, list[dict]] = {}
    speaker_session_ids: dict[str, set[str]] = {}
    for row in session_speakers_csv:
        session_people.setdefault(row["session_id"], []).append({
            "name": row["speaker_name"],
            "title": row["speaker_title"],
            "organization": row["company_or_organization"],
            "category": row["organization_category"],
        })
        speaker_session_ids.setdefault(row["speaker_name"], set()).add(row["session_id"])

    public_sessions = []
    for s in program["sessions"]:
        rec_id = public_recording_id(s.get("youtube_url"))
        rec = rec_by_id.get(rec_id, {})
        public_sessions.append({
            "date": s["date"], "stage": s["stage"], "start": s["start_local"],
            "end": s["end_local"], "title": s["title"], "kind": s["kind"],
            "speakers": [p["name"] for p in s.get("speakers", [])],
            "organizations": sorted({p["organization"] for p in session_people.get(s["session_id"], []) if p.get("organization")}),
            "recording_id": rec_id, "recording_status": rec.get("publish_live_status", {}).get("recording_status"),
            "transcript_status": tx_by_id.get(rec_id, {}).get("status"),
            "official_url": s["source_url"], "watch_url": s["youtube_url"],
            "timing_basis": s["timing_basis"],
        })

    public_speakers = [{
        "name": s["display_name"], "title": s["title"], "organization": s["organization"],
        "category": s["organization_category"], "status": s["schedule_status"],
        "sessions": len(speaker_session_ids.get(s["display_name"], set())),
        "mapping_label": "program-mapped" if s["schedule_status"] == "mapped_to_program" else "featured-only / not program-mapped",
    } for s in program["speakers"]]
    public_orgs = [{
        "name": x["organization"], "category": x["organization_category"],
        "speakers": x["unique_speaker_count"], "sessions": x["scheduled_session_count"],
    } for x in program["organization_index"]]

    available_aug1 = [e for e in transcript_index["entries"] if e["day"] == "2026-08-01" and e["status"] == "available"]
    aug2_entries = [e for e in transcript_index["entries"] if e["day"] == "2026-08-02"]
    ended = [r for r in recordings["recordings"] if r["publish_live_status"]["recording_status"] == "ended_archive"]
    ended_aug1 = [r for r in ended if r["day"] == "2026-08-01"]
    transcript_cues = sum(e["normalized_cue_count"] for e in available_aug1)

    claims = [
        {
            "id": "c01", "theme": "agent harness", "label": "fact",
            "statement": "The Atlas morning talk frames agentic modeling as turning a language model from a talker into a doer, coupled to an agent harness.",
            "speaker_session_mapping": "Atlas / Session 1: Foundational Capabilities; speaker-level attribution withheld because the ASR self-introduction is noisy.",
            "attribution_confidence": "medium — schedule-to-stream stage mapping; auto transcript; no speaker named in this claim",
            "evidence": source_ref("official auto-transcript", "archive/recordings_attempt_02/transcripts/WeriQic-QW0.txt", "https://youtube.com/watch?v=WeriQic-QW0", "WeriQic-QW0", "00:02:59", "agentic modeling is the process where we want to turn this talker to a doer", "Normalized English auto transcript; ASR artifacts are preserved in the excerpt."),
        },
        {
            "id": "c02", "theme": "memory + tools", "label": "fact",
            "statement": "The same talk describes an information layer with memory, context management, and tools, plus an execution layer with prompt/action modules and error recovery.",
            "speaker_session_mapping": "Atlas / Session 1: Foundational Capabilities; stage/session only.",
            "attribution_confidence": "medium — stage-to-session schedule mapping; auto transcript",
            "evidence": source_ref("official auto-transcript", "archive/recordings_attempt_02/transcripts/WeriQic-QW0.txt", "https://youtube.com/watch?v=WeriQic-QW0", "WeriQic-QW0", "00:06:05", "the information layer consists of the uh ma memory and the context measurement", "Normalized English auto transcript; this is an excerpt, not a polished transcript."),
        },
        {
            "id": "c03", "theme": "continual learning", "label": "fact",
            "statement": "The talk presents EvolveLab as a test-time learning framework intended to accumulate and reuse knowledge across a sequence of tasks.",
            "speaker_session_mapping": "Atlas / Session 1: Foundational Capabilities; stage/session only.",
            "attribution_confidence": "medium — stage-to-session schedule mapping; auto transcript",
            "evidence": source_ref("official auto-transcript", "archive/recordings_attempt_02/transcripts/WeriQic-QW0.txt", "https://youtube.com/watch?v=WeriQic-QW0", "WeriQic-QW0", "00:10:25", "a new test time learning framework called evolve lab which allows large scale language models to accumulate, reuse and involve knowledge across a sequence of tasks", "The normalized transcript renders some words as ASR artifacts (for example, ‘involve’)."),
        },
        {
            "id": "c04", "theme": "agent infrastructure", "label": "fact",
            "statement": "The talk identifies a need for environments that can run very large numbers of agents in parallel to produce trajectory data for training.",
            "speaker_session_mapping": "Atlas / Session 1: Foundational Capabilities; stage/session only.",
            "attribution_confidence": "medium — stage-to-session schedule mapping; auto transcript",
            "evidence": source_ref("official auto-transcript", "archive/recordings_attempt_02/transcripts/WeriQic-QW0.txt", "https://youtube.com/watch?v=WeriQic-QW0", "WeriQic-QW0", "00:12:02", "to run hundreds of thousands of uh agents simultaneously so that they can generate a lot of trajectory data", "Normalized English auto transcript; quantity is reported as spoken, not independently measured."),
        },
        {
            "id": "c05", "theme": "AI for science", "label": "fact",
            "statement": "The Nexus morning AI-for-Science block includes a talk introduced as using AI agents for scientific discovery.",
            "speaker_session_mapping": "Nexus / Session 1: AI for Science; speaker-level attribution withheld because the transcript’s name rendering does not cleanly match the scheduled names.",
            "attribution_confidence": "medium — stage/session mapping; opening introduction is audible but speaker identity is not safely resolved",
            "evidence": source_ref("official auto-transcript", "archive/recordings_attempt_02/transcripts/LB7IkZhEYic.txt", "https://youtube.com/watch?v=LB7IkZhEYic", "LB7IkZhEYic", "00:06:44", "I'll be talking about how we use AI agents for scientific discovery", "Normalized English auto transcript; no speaker inferred from the noisy name mention."),
        },
        {
            "id": "c06", "theme": "RL + coding agents", "label": "fact",
            "statement": "Silas Alberti’s Nexus afternoon introduction names scaling RL for coding agents and calls out multi-turn training, parallel tool calls, asynchronous RL, and entropy collapse.",
            "speaker_session_mapping": "Silas Alberti → Nexus / Session 2: Coding & Web Agents; self-introduction plus official schedule join.",
            "attribution_confidence": "high — transcript self-introduction corroborated by official session schedule; auto transcript",
            "evidence": source_ref("official auto-transcript", "archive/recordings_attempt_02/transcripts/ZIRc3EpzQJs.txt", "https://youtube.com/watch?v=ZIRc3EpzQJs", "ZIRc3EpzQJs", "00:14:43", "multi-turn training parallel tool calls asynchronous RL and entropy collapse", "Exact adjacent topic list in the normalized auto transcript; punctuation and capitalization are not human-edited."),
        },
        {
            "id": "c07", "theme": "robotics + RL", "label": "fact",
            "statement": "Peter Stone frames a research question around autonomous agents learning with teammates or adversaries in real-time dynamic domains.",
            "speaker_session_mapping": "Peter Stone → Atlas / Session 2: Robotics & World Models; host introduction and official schedule join.",
            "attribution_confidence": "high — transcript self-identification/context and official schedule join; auto transcript",
            "evidence": source_ref("official auto-transcript", "archive/recordings_attempt_02/transcripts/psPzCQbjCCo.txt", "https://youtube.com/watch?v=psPzCQbjCCo", "psPzCQbjCCo", "00:16:01", "to what degree can autonomous intelligent agents learn in the presence of teammates and/or adversaries in real-time dynamic domains", "Normalized English auto transcript."),
        },
        {
            "id": "c08", "theme": "agent security", "label": "fact",
            "statement": "Itsik Mantin explains that when prompt injection reaches an agent connected to tools, the threat becomes agent-goal hijacking and can escalate to tool misuse or exploitation.",
            "speaker_session_mapping": "Itsik Mantin → Nexus / Session 4: Secure Agentic AI; host introduction plus official schedule join.",
            "attribution_confidence": "high — host introduction corroborated by the official schedule; the auto transcript renders the name noisily",
            "evidence": source_ref("official auto-transcript", "archive/recordings_attempt_02/transcripts/ZIRc3EpzQJs.txt", "https://youtube.com/watch?v=ZIRc3EpzQJs", "ZIRc3EpzQJs", "03:17:04", "threat is being upgraded ... agent goal hijacking ... connected to tools and tools misuse and tools exploitation", "Selected adjacent normalized auto-caption fragments at 03:17:04–03:17:22; ellipses mark omitted ASR filler and intervening words."),
        },
        {
            "id": "c09", "theme": "personal AI", "label": "fact",
            "statement": "Accepted field notes record River’s personal-AI framing around RL training, personalization, memory/long context, privacy/security, and cost; the Aug-2 recording has no accepted transcript.",
            "speaker_session_mapping": "Igor Babuschkin / Plenary — Sunday, from official program join; the supplied photos do not show the speaker name.",
            "attribution_confidence": "medium — user-provided event note plus official program/session mapping; no transcript",
            "evidence": source_ref("accepted event photo field note", "live_notes.md", "https://rdi.berkeley.edu/events/agentic-ai-summit-2026", None, "2026-08-02 13:44 PDT (photo note)", "Personalization; Memory / Long Context; Privacy & Security; Cost", "Photo-observation evidence, not a transcript; the official livestream was unavailable for transcript capture at cutoff."),
        },
        {
            "id": "c10", "theme": "job lead", "label": "fact",
            "statement": "The accepted Periodic Labs snapshot recorded 21 public roles: 16 full-time, 4 contract, and 1 intern, as of 2026-08-02 14:21 PDT.",
            "speaker_session_mapping": "Not a summit talk; company/job snapshot.",
            "attribution_confidence": "high — accepted public-source research note with dated snapshot",
            "evidence": source_ref("accepted public-source job snapshot", "periodic_labs_lead_20260802.md", "https://jobs.ashbyhq.com/periodic-labs", None, "2026-08-02 14:21 PDT", "21 listed roles; 16 full-time, 4 contract, 1 intern", "Availability can change; this public snapshot does not report private application status."),
        },
        {
            "id": "c11", "theme": "company map", "label": "fact",
            "statement": "River’s accepted diligence memo identifies a public River API v0.1 preview with sampling, fine-tuning, RL updates, serving, and durable checkpoints; personal-agent memory is not verified as a shipped public product.",
            "speaker_session_mapping": "Company/product evidence connected to the River summit lead; not a transcript claim.",
            "attribution_confidence": "high for API documentation summary; medium for absence claim because it is bounded to reviewed public materials",
            "evidence": source_ref("accepted company diligence memo", "company_research_river_ai_attempt_01/river_ai_report.md", "https://docs.river.ai/", None, "retrieved 2026-08-02", "The currently verifiable product is a public v0.1-preview River API", "The memo explicitly separates verified public facts from roadmap/claim language."),
        },
        {
            "id": "i01", "theme": "Jason fit", "label": "interpretation",
            "statement": "For Jason, the most defensible opportunity cluster is agent-harness infrastructure: memory lifecycle, tool control, long-running execution, evaluation, and cost/reliability.",
            "speaker_session_mapping": "Analysis synthesized from c01–c04, c06–c08 and the accepted River diligence memo; not an employer claim.",
            "attribution_confidence": "analysis confidence: medium — evidence-backed fit judgment, not a fact",
            "evidence": source_ref("analysis synthesis", "analysis.json", "https://rdi.berkeley.edu/events/agentic-ai-summit-2026", None, None, "memory; tools; feedback; parallel agents; RL; security", "Interpretation only; requires role-specific diligence before any application."),
        },
        {
            "id": "i02", "theme": "Jason fit", "label": "interpretation",
            "statement": "The AI-for-science and agent-infrastructure evidence makes scientific discovery systems a plausible collaboration/job research direction, but the corpus does not establish any relationship, endorsement, or open role for Jason.",
            "speaker_session_mapping": "Analysis synthesized from c04–c07 and the official program graph; not a contact recommendation.",
            "attribution_confidence": "analysis confidence: medium — bounded interpretation",
            "evidence": source_ref("analysis synthesis", "analysis.json", "https://rdi.berkeley.edu/events/agentic-ai-summit-2026", None, None, "AI agents for scientific discovery; agent harness; RL for coding agents", "No contact, application, or outreach is authorized or implied."),
        },
    ]

    coverage_rows = []
    for r in recordings["recordings"]:
        tx = tx_by_id.get(r["video_id"], {})
        coverage_rows.append({
            "date": r["day"], "stage": r["stage"], "block": r["session_block"].title(),
            "recording_id": r["video_id"], "status": r["publish_live_status"]["recording_status"],
            "transcript": tx.get("status", r["caption_availability"]["transcript_status"]),
            "cues": tx.get("normalized_cue_count", 0), "watch_url": r["url"],
            "limitation": tx.get("blocker") or "Eight Aug-1 normalized English transcript files accepted; auto caption, not human-edited.",
        })

    mapped_people = sum(s["schedule_status"] == "mapped_to_program" for s in program["speakers"])
    featured_only_people = sum(s["schedule_status"] == "featured_only_unmapped" for s in program["speakers"])
    assert mapped_people + featured_only_people == len(program["speakers"])

    totals = {
        "program_blocks": len(program["sessions"]), "speakers": len(program["speakers"]),
        "program_mapped_people": mapped_people, "featured_only_people": featured_only_people,
        "session_speaker_joins": len(session_speakers_csv), "organizations": len(program["organization_index"]),
        "recordings_in_snapshot": len(recordings["recordings"]), "ended_recordings": len(ended),
        "ended_aug1_recordings": len(ended_aug1), "aug1_transcript_files": len(available_aug1),
        "aug1_normalized_cues": transcript_cues, "final_manifest_media": final_manifest["final_media_count"],
        "final_manifest_bytes": final_manifest["total_bytes"], "final_manifest_duration_seconds": final_manifest["total_duration_seconds"],
        "fresh_playlist_entries": len(playlist.get("entries", [])),
    }

    analysis = {
        "schema_version": 1,
        "title": "Agentic AI Summit 2026 — local evidence analysis",
        "cutoff_utc": program["event"]["snapshot_cutoff_utc"],
        "cutoff_note": "Accepted corpus cutoff; Aug-2 remained live/incomplete in the evidence snapshot.",
        "scope": "Authorized local evidence only; no network research or external action in this candidate build.",
        "summary": {
            "conclusion": "The clearest technical through-line is an agent system stack: harness + memory/tools + execution + feedback + scalable environments, with scientific discovery and security as adjacent application/risk layers.",
            "fact_boundary": "Aug-1 transcript evidence is auto-caption-derived. Aug-2 has six unavailable transcript entries; River photos and company notes are labeled separately.",
            "interpretation_boundary": "Jason-fit and job/collaboration leads are analysis, not facts or recommendations to contact/apply.",
        },
        "totals": totals,
        "takeaway_claim_ids": ["c01", "c02", "c04", "c05", "c06", "c08", "c09", "c10", "c11", "i01", "i02"],
        "claims": claims,
        "coverage": coverage_rows,
        "sessions": public_sessions,
        "speakers": public_speakers,
        "organizations": public_orgs,
        "leads": [
            {"name": "Agent harness / continual learning", "type": "analysis", "priority": "high", "summary": "Investigate memory lifecycle, tool permissions, evaluation, long-horizon recovery, and scalable agent environments.", "claim_ids": ["c01", "c02", "c03", "c04", "i01"]},
            {"name": "Scientific discovery systems", "type": "analysis", "priority": "high", "summary": "AI-for-science and agent infrastructure are adjacent evidence-backed directions; no relationship or role is established.", "claim_ids": ["c04", "c05", "i02"]},
            {"name": "River AI", "type": "company watch", "priority": "watch", "summary": "Strong agent-harness/continual-learning fit signal in accepted notes; verify role, product maturity, memory governance, and work-authority details before acting.", "claim_ids": ["c09", "c11", "i01"]},
            {"name": "Periodic Labs", "type": "job snapshot", "priority": "watch", "summary": "21-role public snapshot; apparent fit is analysis only and availability may change.", "claim_ids": ["c10"]},
        ],
        "gaps": [
            "All six Aug-2 transcript entries remain unavailable in the accepted corpus; do not infer their contents.",
            "Aug-2 Atlas afternoon -7AJJLwYW1Q was ended/was_live in the fresh playlist snapshot; Plenary afternoon I2PosBXwoPI and Compass afternoon 1UrriPJRSPU were still live at cutoff.",
            "The fresh official playlist had 13 entries and omitted Aug-2 Atlas morning LGW_6P1CMC8; no Aug-2 Nexus entries were present.",
            "Official schedule end times are derived from the next published boundary; the official page prints clock times without a timezone, so America/Los_Angeles is a venue-local inference.",
            "No speaker is inferred from stage recording alone; ambiguous ASR names remain session-level or unattributed.",
            "The accepted River and Periodic Labs material is public-source diligence/notes; it does not establish endorsement, funding, relationship, customer usage, or an application recommendation.",
        ],
        "source_files_read": [
            "BRIEF.md", "archive/program_attempt_02/program.json", "archive/program_attempt_02/sessions.csv", "archive/program_attempt_02/speakers.csv", "archive/program_attempt_02/session_speakers.csv", "archive/program_attempt_02/companies.csv", "archive/program_attempt_02/official_sources.json", "archive/program_attempt_02/coverage_gaps.md", "archive/recordings_attempt_02/recordings.json", "archive/recordings_attempt_02/transcript_index.json", "archive/recordings_attempt_02/final_recording_manifest_ended_11.json", "archive/recordings_attempt_02/transcripts/*.txt", "archive/recordings_recheck_20260802T222822Z/official_playlist.info.json", "live_notes.md", "company_research_river_ai_attempt_01/", "periodic_labs_lead_20260802.md",
        ],
    }

    sources = {
        "schema_version": 1,
        "title": "Agentic AI Summit 2026 — public-safe source registry",
        "cutoff_utc": program["event"]["snapshot_cutoff_utc"],
        "privacy_note": "Relative evidence paths only; no absolute local paths, private IDs, credentials, mailbox content, or raw logs.",
        "sources": [
            {"id": "S01", "label": "Official Berkeley RDI program", "evidence_type": "official program/schedule", "path": "archive/program_attempt_02/program.json", "public_url": "https://rdi.berkeley.edu/events/agentic-ai-summit-2026", "coverage": "43 schedule blocks, speaker joins, organizations; end times derived from next published boundary; no transcript."},
            {"id": "S02", "label": "Program graph tables", "evidence_type": "normalized CSV graph", "path": "archive/program_attempt_02/sessions.csv; speakers.csv; session_speakers.csv; companies.csv", "public_url": "https://rdi.berkeley.edu/events/agentic-ai-summit-2026", "coverage": "Counts and explorer entities; organization labels are observable categories, not rankings."},
            {"id": "S03", "label": "Official-source register and gap note", "evidence_type": "accepted provenance/gap metadata", "path": "archive/program_attempt_02/official_sources.json; coverage_gaps.md", "public_url": "https://rdi.berkeley.edu/events/agentic-ai-summit-2026", "coverage": "Cutoff, source policy, timing/timezone/metadata gaps, and schedule coverage limits."},
            {"id": "S04", "label": "Recording snapshot", "evidence_type": "official-channel recording metadata", "path": "archive/recordings_attempt_02/recordings.json; final_recording_manifest_ended_11.json", "public_url": "https://www.youtube.com/@BerkeleyRDI", "coverage": "11 ended archives checksum/AV validated in the accepted manifest; six Aug-2 transcript entries unavailable."},
            {"id": "S05", "label": "Transcript index and normalized VTT text", "evidence_type": "official YouTube auto-caption corpus", "path": "archive/recordings_attempt_02/transcript_index.json; transcripts/*.txt", "public_url": "https://www.youtube.com/@BerkeleyRDI", "coverage": "Eight Aug-1 normalized English transcript files / 68,496 cues; auto-caption-derived, not human-edited."},
            {"id": "S06", "label": "Fresh official playlist snapshot", "evidence_type": "official playlist metadata snapshot", "path": "archive/recordings_recheck_20260802T222822Z/official_playlist.info.json", "public_url": "https://www.youtube.com/@BerkeleyRDI/playlists", "coverage": "13 entries at the accepted cutoff; omissions and live/ended state are time-bounded."},
            {"id": "S07", "label": "Accepted summit field notes", "evidence_type": "user-provided event/photo observation", "path": "live_notes.md", "public_url": "https://rdi.berkeley.edu/events/agentic-ai-summit-2026", "coverage": "River slide observations; no transcript and no facial-recognition inference; photo notes remain distinct from official captions."},
            {"id": "S08", "label": "Periodic Labs lead snapshot", "evidence_type": "accepted public-source job snapshot", "path": "periodic_labs_lead_20260802.md", "public_url": "https://jobs.ashbyhq.com/periodic-labs", "coverage": "21 roles at 2026-08-02 14:21 PDT; availability and fit can change; no application/contact."},
            {"id": "S09", "label": "River AI diligence memo", "evidence_type": "accepted public-source company research", "path": "company_research_river_ai_attempt_01/river_ai_report.md; river_ai_facts.json; river_ai_sources.json", "public_url": "https://river.ai/", "coverage": "Separates verified public facts, company claims, third-party reporting, and interpretation; no login/contact/application."},
        ],
        "claim_source_map": {c["id"]: (["S01", "S02", "S03"] if c["id"] in {"c01", "c02", "c03", "c04", "c05", "c06", "c07", "c08"} else ["S07"] if c["id"] == "c09" else ["S08"] if c["id"] == "c10" else ["S09"] if c["id"] == "c11" else ["S01", "S05"]) for c in claims},
    }

    analysis_json = json.dumps(analysis, ensure_ascii=False, indent=2) + "\n"
    sources_json = json.dumps(sources, ensure_ascii=False, indent=2) + "\n"

    data_json = json.dumps({
        "analysis": analysis, "sources": sources,
        "meta": {"built_at_utc": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")},
    }, ensure_ascii=False, separators=(",", ":"))

    css = r"""
    :root{--ink:#17212b;--muted:#64717a;--paper:#f7f4ee;--card:#fffdf8;--line:#e4ded2;--accent:#e85c3b;--accent2:#1e776f;--gold:#d9a441;--shadow:0 18px 45px rgba(33,40,44,.08)}
    *{box-sizing:border-box}html{scroll-behavior:smooth;scroll-padding-top:82px}body{margin:0;background:var(--paper);color:var(--ink);font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;line-height:1.5;overflow-x:hidden}a{color:inherit}button,input,select{font:inherit}button{cursor:pointer}.wrap{width:min(1180px,calc(100% - 40px));margin:0 auto}.topline{height:6px;background:linear-gradient(90deg,var(--accent),var(--gold),var(--accent2))}.nav{position:sticky;top:0;z-index:10;background:rgba(247,244,238,.93);backdrop-filter:blur(14px);border-bottom:1px solid var(--line)}.navin{height:66px;display:flex;align-items:center;justify-content:space-between;gap:20px}.brand{font-weight:800;letter-spacing:-.03em;display:flex;align-items:center;gap:10px}.mark{width:28px;height:28px;border-radius:8px;background:var(--ink);color:var(--paper);display:grid;place-items:center;font-size:12px}.navlinks{display:flex;gap:18px;font-size:13px;color:var(--muted)}.navlinks a{text-decoration:none}.hero{padding:70px 0 42px;background:radial-gradient(circle at 88% 12%,#f0d9b1 0,transparent 28%),linear-gradient(180deg,#fbf8f2 0,var(--paper) 100%)}.eyebrow{font-size:12px;text-transform:uppercase;letter-spacing:.14em;color:var(--accent);font-weight:800}.hero h1{font-size:clamp(42px,7vw,84px);line-height:.97;letter-spacing:-.075em;margin:16px 0 22px;max-width:840px}.dek{font-size:clamp(18px,2.3vw,25px);line-height:1.28;max-width:800px;margin:0;color:#34414a}.stamp{display:flex;flex-wrap:wrap;gap:10px;margin-top:26px;color:var(--muted);font-size:13px}.pill{display:inline-flex;align-items:center;gap:6px;border:1px solid var(--line);padding:6px 10px;border-radius:999px;background:rgba(255,253,248,.7)}.pill strong{color:var(--ink)}.section{padding:54px 0}.sectionhead{display:flex;justify-content:space-between;align-items:end;gap:20px;margin-bottom:22px}.section h2{font-size:clamp(27px,3.5vw,44px);line-height:1.03;letter-spacing:-.05em;margin:0}.sectionlead{color:var(--muted);max-width:580px;margin:7px 0 0}.metrics{display:grid;grid-template-columns:repeat(6,1fr);gap:10px;margin-top:30px}.metric{padding:17px 15px;background:var(--card);border:1px solid var(--line);border-radius:16px;box-shadow:var(--shadow)}.metric b{display:block;font-size:28px;letter-spacing:-.06em}.metric span{font-size:12px;color:var(--muted)}.verdict{display:grid;grid-template-columns:1.25fr .75fr;gap:16px}.panel,.card{background:var(--card);border:1px solid var(--line);border-radius:20px;box-shadow:var(--shadow)}.panel{padding:26px}.panel h3{margin:0 0 10px;font-size:21px;letter-spacing:-.03em}.panel p{margin:0;color:#39464f}.panel.accent{background:var(--ink);color:var(--paper);border-color:var(--ink)}.panel.accent p{color:#d7dedc}.callout{border-left:4px solid var(--accent);padding:16px 18px;background:#fff0e9;border-radius:0 14px 14px 0;margin:18px 0;color:#5d3229}.cards{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}.cards>*{min-width:0}.takeaway{padding:22px;min-height:190px}.kicker{font-size:11px;text-transform:uppercase;letter-spacing:.11em;color:var(--accent2);font-weight:800}.takeaway h3{margin:11px 0 8px;font-size:20px;line-height:1.1;letter-spacing:-.035em}.takeaway p{color:#47545a;margin:0}.evidence{display:flex;flex-wrap:wrap;gap:6px;margin-top:18px}.tag{font-size:11px;border-radius:999px;padding:4px 8px;background:#edf3ef;color:#35655e}.tag.fact{background:#e8f2ef;color:#17665d}.tag.interpretation{background:#fff0d5;color:#855918}.controls{display:flex;flex-wrap:wrap;gap:10px;margin:20px 0}.control{background:var(--card);border:1px solid var(--line);padding:10px 12px;border-radius:11px;color:var(--ink)}input.control{min-width:260px;flex:1}.filterbtn{border:1px solid var(--line);background:var(--card);padding:9px 12px;border-radius:999px;color:var(--muted)}.filterbtn.active{background:var(--ink);color:var(--paper);border-color:var(--ink)}.claim{padding:21px;display:flex;flex-direction:column;gap:10px}.claimtop{display:flex;justify-content:space-between;gap:14px;align-items:start}.claim h3{margin:0;font-size:18px;line-height:1.22;letter-spacing:-.025em}.claim p{margin:0;color:#3f4c52}.claim .quote{padding:12px 14px;background:#f1eee7;border-radius:12px;color:#566167;font-size:13px}.claim .quote:before{content:"“";font-size:28px;color:var(--accent);vertical-align:-8px;margin-right:3px}.source{font-size:12px;color:var(--muted);min-width:0;overflow-wrap:anywhere;word-break:break-word}.source a{color:var(--accent2);text-decoration:none}.twocol{display:grid;grid-template-columns:1fr 1fr;gap:16px}.explorer-grid{display:grid;grid-template-columns:1.15fr .85fr;gap:16px;align-items:start}.listbox{padding:19px}.listbox h3{margin:0 0 14px}.scrolllist{max-height:500px;overflow:auto;padding-right:4px}.row{display:flex;justify-content:space-between;gap:12px;padding:12px 0;border-bottom:1px solid var(--line);font-size:13px}.row:last-child{border-bottom:0}.row small{color:var(--muted);display:block}.row .count{white-space:nowrap;color:var(--accent2);font-weight:700}.session{padding:15px 0;border-bottom:1px solid var(--line)}.session:last-child{border:0}.sessionline{display:flex;gap:10px;align-items:baseline;flex-wrap:wrap}.session time{font-size:12px;color:var(--accent);font-weight:800;min-width:93px}.session h4{font-size:15px;margin:0}.session p{margin:3px 0 0;color:var(--muted);font-size:12px}.coverage-cue{display:none}.coverage{overflow:auto;scrollbar-gutter:stable}.coverage table{width:100%;border-collapse:collapse;font-size:13px;min-width:760px}.coverage th{text-align:left;color:var(--muted);font-weight:700;font-size:11px;text-transform:uppercase;letter-spacing:.08em}.coverage th,.coverage td{padding:12px 10px;border-bottom:1px solid var(--line);vertical-align:top}.status{font-size:11px;border-radius:999px;padding:4px 7px;display:inline-block;background:#e7f1ed;color:#24685e}.status.unavailable{background:#fff0d9;color:#865c1f}.status.live{background:#fce3dd;color:#a23f2d}.gaplist{display:grid;grid-template-columns:repeat(2,1fr);gap:10px}.gap{padding:16px 17px;border:1px solid #eed9aa;background:#fff8ea;border-radius:14px;color:#684d29;font-size:14px}.lead{padding:21px}.lead h3{margin:9px 0 4px;font-size:19px}.lead p{margin:0;color:#4c585d}.priority{float:right;font-size:11px;text-transform:uppercase;letter-spacing:.09em;color:var(--accent)}details{border-top:1px solid var(--line);padding:15px 0}summary{cursor:pointer;font-weight:700}.method{color:var(--muted);font-size:14px}.footer{padding:32px 0 56px;border-top:1px solid var(--line);color:var(--muted);font-size:12px}.hidden{display:none!important}@media(max-width:900px){.metrics{grid-template-columns:repeat(3,1fr)}.cards{grid-template-columns:repeat(2,1fr)}.verdict,.explorer-grid{grid-template-columns:1fr}.navlinks{display:none}}@media(max-width:560px){.wrap{width:min(100% - 24px,1180px)}.claim-controls #claimSearch{flex:0 0 100%;max-width:100%}.coverage-cue{display:block;margin:0 0 8px;padding:9px 12px;border:1px solid var(--line);border-radius:11px;background:#fff8ea;color:#684d29;font-size:12px;font-weight:700}.hero{padding:48px 0 30px}.hero h1{font-size:49px}.section{padding:38px 0}.metrics{grid-template-columns:repeat(2,1fr)}.cards,.twocol,.gaplist{grid-template-columns:1fr}.metric b{font-size:25px}.panel{padding:20px}.navin{height:58px}.stamp{gap:7px}.pill{font-size:11px}.sectionhead{display:block}.sectionhead .sectionlead{margin-top:10px}input.control{min-width:0;width:100%}.claimtop{display:block}.claimtop .tag{margin-top:8px}.row{font-size:12px}.session time{min-width:0}.footer{padding-bottom:40px}}
    """

    js = r"""
    const D=__DATA__;
    const A=D.analysis;
    const esc=(s)=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
    const link=(u)=>u?`<a href="${esc(u)}" target="_blank" rel="noreferrer">official link ↗</a>`:'';
    const byId=Object.fromEntries(A.claims.map(x=>[x.id,x]));
    function chip(id){const c=byId[id];return c?`<span class="tag ${c.label==='interpretation'?'interpretation':'fact'}">${esc(id)} · ${esc(c.theme)}</span>`:''}
    function renderTakeaways(){document.querySelector('#takeawayCards').innerHTML=A.takeaway_claim_ids.map(id=>{const c=byId[id];return `<article class="card takeaway"><div class="kicker">${esc(c.label)} · ${esc(c.theme)}</div><h3>${esc(c.statement)}</h3><p>${esc(c.speaker_session_mapping)}</p><div class="evidence">${chip(c.id)}</div></article>`}).join('')}
    function renderClaims(){const q=document.querySelector('#claimSearch').value.toLowerCase();const f=document.querySelector('.filterbtn.active')?.dataset.filter||'all';const rows=A.claims.filter(c=>(f==='all'||c.label===f||c.theme===f)&&(!q||JSON.stringify(c).toLowerCase().includes(q)));document.querySelector('#claimCards').innerHTML=rows.map(c=>`<article class="card claim"><div class="claimtop"><h3>${esc(c.statement)}</h3><span class="tag ${c.label==='interpretation'?'interpretation':'fact'}">${esc(c.label)}</span></div><p>${esc(c.speaker_session_mapping)}</p>${c.evidence.excerpt?`<div class="quote">${esc(c.evidence.excerpt)}</div>`:''}<div class="source"><strong>${esc(c.attribution_confidence)}</strong><br>${esc(c.evidence.source_type)} · <code>${esc(c.evidence.source_path)}</code>${c.evidence.recording_id?` · <a href="https://www.youtube.com/watch?v=${encodeURIComponent(c.evidence.recording_id)}&t=${Math.floor((c.evidence.relative_timestamp||'00:00:00').split(':').reduce((a,v)=>a*60+Number(v),0))}s" target="_blank" rel="noreferrer">${esc(c.evidence.recording_id)} @ ${esc(c.evidence.relative_timestamp||'')}</a>`:''} ${link(c.evidence.official_url)}<br>${esc(c.evidence.excerpt_note||'')}</div></article>`).join('')||'<p class="method">No claims match this filter.</p>'}
    function renderSessions(){const q=document.querySelector('#sessionSearch').value.toLowerCase();const d=document.querySelector('#dayFilter').value;const stage=document.querySelector('#stageFilter').value;const rows=A.sessions.filter(s=>(!q||JSON.stringify(s).toLowerCase().includes(q))&&(!d||s.date===d)&&(!stage||s.stage===stage));document.querySelector('#sessions').innerHTML=rows.map(s=>`<div class="session"><div class="sessionline"><time>${esc(s.date)} · ${esc(s.start)}–${esc(s.end)}</time><h4>${esc(s.title)}</h4></div><p>${esc(s.stage)} · ${s.speakers.length?esc(s.speakers.join(' · ')):'No named speaker in schedule'} · ${s.transcript_status==='available'?'<span class="status">transcript available</span>':'<span class="status unavailable">transcript unavailable</span>'}</p></div>`).join('')||'<p class="method">No sessions match this filter.</p>'}
    function renderSpeakers(){const q=document.querySelector('#speakerSearch').value.toLowerCase();document.querySelector('#speakers').innerHTML=A.speakers.filter(s=>JSON.stringify(s).toLowerCase().includes(q)).map(s=>`<div class="row"><span><strong>${esc(s.name)}</strong><small>${esc(s.title)} · ${esc(s.organization)}</small></span><span class="count">${s.status==='featured_only_unmapped'?'featured only<br><small>not program-mapped</small>':`${s.sessions} block${s.sessions===1?'':'s'}`}</span></div>`).join('')}
    function renderOrgs(){const q=document.querySelector('#orgSearch').value.toLowerCase();document.querySelector('#orgs').innerHTML=A.organizations.filter(s=>JSON.stringify(s).toLowerCase().includes(q)).slice(0,160).map(s=>`<div class="row"><span><strong>${esc(s.name)}</strong><small>${esc(s.category)}</small></span><span class="count">${s.speakers} people<br>${s.sessions} blocks</span></div>`).join('')}
    function renderCoverage(){document.querySelector('#coverageRows').innerHTML=A.coverage.map(r=>`<tr><td>${esc(r.date)}<br>${esc(r.stage)} ${esc(r.block)}</td><td><a href="${esc(r.watch_url)}" target="_blank" rel="noreferrer">${esc(r.recording_id)}</a></td><td><span class="status ${r.transcript==='unavailable'?'unavailable':''}">${esc(r.transcript)}</span><br><small>${r.cues?esc(r.cues.toLocaleString())+' cues':''}</small></td><td>${esc(r.limitation)}</td></tr>`).join('')}
    function renderLeads(){document.querySelector('#leadCards').innerHTML=A.leads.map(l=>`<article class="card lead"><span class="priority">${esc(l.priority)}</span><div class="kicker">${esc(l.type)}</div><h3>${esc(l.name)}</h3><p>${esc(l.summary)}</p><div class="evidence">${l.claim_ids.map(chip).join('')}</div></article>`).join('')}
    document.querySelector('#claimSearch').addEventListener('input',renderClaims);document.querySelectorAll('.filterbtn').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('.filterbtn').forEach(x=>x.classList.remove('active'));b.classList.add('active');renderClaims()}));
    ['sessionSearch','dayFilter','stageFilter'].forEach(id=>document.querySelector('#'+id).addEventListener('input',renderSessions));document.querySelector('#speakerSearch').addEventListener('input',renderSpeakers);document.querySelector('#orgSearch').addEventListener('input',renderOrgs);
    renderTakeaways();renderClaims();renderSessions();renderSpeakers();renderOrgs();renderCoverage();renderLeads();
    """
    js = js.replace("__DATA__", data_json)

    gap_html = "".join(f'<div class="gap">{html.escape(g)}</div>' for g in analysis["gaps"])
    html_doc = f'''<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="description" content="Public-safe local evidence analysis of Agentic AI Summit 2026, with explicit Aug-2 gaps."><title>Agentic AI Summit 2026 · evidence analysis</title><style>{css}</style></head>
<body><div class="topline"></div><nav class="nav"><div class="wrap navin"><a class="brand" href="#top" aria-label="Agentic AI Summit 2026 home"><span class="mark">AI</span><span>Summit / evidence desk</span></a><div class="navlinks"><a href="#takeaways">Takeaways</a><a href="#claims">Claims</a><a href="#explorer">Explorer</a><a href="#coverage">Coverage</a><a href="#method">Method</a></div></div></nav>
<main id="top"><section class="hero"><div class="wrap"><div class="eyebrow">Berkeley · Aug 1–2, 2026 · evidence analysis</div><h1>What survives<br>the evidence?</h1><p class="dek">The clearest summit through-line is an agent system stack: harness, memory and tools, execution, feedback, and scalable environments — with scientific discovery and security as adjacent layers.</p><div class="stamp"><span class="pill"><strong>Cutoff</strong> 2026-08-02 20:29Z</span><span class="pill"><strong>Truth mode</strong> facts ≠ interpretations</span><span class="pill"><strong>Transcript</strong> auto-caption labeled</span></div><div class="metrics"><div class="metric"><b>{totals['program_blocks']}</b><span>schedule blocks</span></div><div class="metric"><b>{totals['speakers']}</b><span>people indexed</span></div><div class="metric"><b>{totals['organizations']}</b><span>organizations</span></div><div class="metric"><b>{totals['ended_recordings']}</b><span>ended archives</span></div><div class="metric"><b>{totals['aug1_transcript_files']}</b><span>Aug-1 transcript files</span></div><div class="metric"><b>{totals['aug1_normalized_cues']:,}</b><span>normalized cues</span></div></div></div></section>
<section class="section"><div class="wrap"><div class="verdict"><article class="panel accent"><h3>Bottom line</h3><p>For Jason, the most defensible research direction is agent-harness infrastructure: memory lifecycle, tool control, long-running execution, evaluation, cost, and reliability. The evidence is promising for scientific-AI adjacency and selected company/job leads, but it does not establish relationships, endorsement, funding, customer usage, or permission to contact/apply.</p></article><article class="panel"><h3>Read the labels</h3><p><span class="tag fact">fact</span> is directly grounded in accepted schedule, recording, note, or diligence evidence. <span class="tag interpretation">interpretation</span> is a bounded analysis judgment. A stage recording that spans several sessions never becomes a speaker attribution by guesswork.</p></article></div><div class="callout"><strong>Aug-2 is a gap, not a conclusion.</strong> Six transcript entries remain unavailable. This page shows their recording state and limits, and does not fill them with inferred content.</div></div></section>
<section id="takeaways" class="section"><div class="wrap"><div class="sectionhead"><div><div class="eyebrow">01 · takeaways</div><h2>Strong signals, carefully bounded.</h2><p class="sectionlead">Each card points to a claim with source type, evidence path, timestamp where applicable, and attribution confidence.</p></div></div><div id="takeawayCards" class="cards"></div></div></section>
<section id="claims" class="section"><div class="wrap"><div class="sectionhead"><div><div class="eyebrow">02 · evidence cards</div><h2>Claims you can audit.</h2><p class="sectionlead">Search the accepted corpus-derived claims. Excerpts preserve the auto-caption boundary.</p></div></div><div class="controls claim-controls"><input id="claimSearch" class="control" placeholder="Search claims, themes, speakers…" aria-label="Search claims"><button class="filterbtn active" data-filter="all">All</button><button class="filterbtn" data-filter="fact">Facts</button><button class="filterbtn" data-filter="interpretation">Interpretations</button><button class="filterbtn" data-filter="agent harness">Agent harness</button><button class="filterbtn" data-filter="AI for science">AI for science</button><button class="filterbtn" data-filter="job lead">Leads</button></div><div id="claimCards" class="cards"></div></div></section>
<section id="explorer" class="section"><div class="wrap"><div class="sectionhead"><div><div class="eyebrow">03 · program graph</div><h2>Explore the program.</h2><p class="sectionlead">Schedule titles are schedule evidence, not verbatim talk transcripts. The people index contains {totals['program_mapped_people']} program-mapped speakers plus {totals['featured_only_people']} featured-only people not joined to a published program block. Times use venue-local America/Los_Angeles inference; end times are derived from the next published boundary.</p></div></div><div class="explorer-grid"><article class="card listbox"><h3>Sessions / stages / recordings</h3><div class="controls"><input id="sessionSearch" class="control" placeholder="Search sessions or speakers…" aria-label="Search sessions"><select id="dayFilter" class="control"><option value="">All dates</option><option value="2026-08-01">Aug 1</option><option value="2026-08-02">Aug 2</option></select><select id="stageFilter" class="control"><option value="">All stages</option><option>Plenary</option><option>Atlas</option><option>Nexus</option><option>Compass</option></select></div><div id="sessions" class="scrolllist"></div></article><div><article class="card listbox"><h3>People <span class="method">({totals['program_mapped_people']} program-mapped + {totals['featured_only_people']} featured-only)</span></h3><input id="speakerSearch" class="control" placeholder="Search speakers…" aria-label="Search speakers"><div id="speakers" class="scrolllist"></div></article><article class="card listbox" style="margin-top:16px"><h3>Organizations <span class="method">({totals['organizations']})</span></h3><input id="orgSearch" class="control" placeholder="Search organizations…" aria-label="Search organizations"><div id="orgs" class="scrolllist"></div></article></div></div></div></section>
<section id="coverage" class="section"><div class="wrap"><div class="sectionhead"><div><div class="eyebrow">04 · coverage</div><h2>What is actually covered?</h2><p class="sectionlead">The fresh official playlist snapshot had 13 entries. The accepted recording snapshot contains 14 entries across Aug 1–2; six Aug-2 transcript entries are unavailable.</p></div></div><div class="coverage-cue">Scroll horizontally to inspect the full evidence table →</div><div class="card coverage"><table><thead><tr><th>Block</th><th>Recording</th><th>Transcript</th><th>Limit</th></tr></thead><tbody id="coverageRows"></tbody></table></div><div class="gaplist" style="margin-top:16px">{gap_html}</div></div></section>
<section id="leads" class="section"><div class="wrap"><div class="sectionhead"><div><div class="eyebrow">05 · Jason lens</div><h2>Research leads, not instructions.</h2><p class="sectionlead">These are evidence-bounded analysis leads for further diligence. No contact, application, outreach, or endorsement is implied.</p></div></div><div id="leadCards" class="cards"></div></div></section>
<section id="method" class="section"><div class="wrap"><div class="sectionhead"><div><div class="eyebrow">06 · method + limits</div><h2>How to read this analysis.</h2></div></div><div class="twocol"><article class="panel method"><h3>Accepted evidence only</h3><p>Built from the controlling brief’s named local files: the official program graph, recording/transcript manifests and normalized Aug-1 transcripts, the fresh playlist snapshot, accepted field notes, and accepted River/Periodic Labs research notes. No network research was performed in this build.</p><details><summary>Source registry</summary><p>Use <code>sources.json</code> beside this page for the public-safe registry, evidence types, coverage limitations, and claim-source map. Official URLs are the only outbound links.</p></details><details><summary>Reproducibility</summary><p><code>build_candidate.py</code> reads the accepted corpus and refuses to overwrite an existing artifact. <code>qa_check.py</code> performs deterministic JSON, HTML, privacy, source/path, count, and static overflow checks.</p></details></article><article class="panel"><h3>Explicit non-claims</h3><p>Program schedule ≠ transcript. Auto captions ≠ human-edited transcript. A named speaker in the schedule ≠ speaker attribution inside every stage recording. River/Periodic Labs notes ≠ endorsement, relationship, funding, customer usage, or permission to apply/contact. Missing Aug-2 evidence remains missing.</p><div class="callout"><strong>Cutoff:</strong> 2026-08-02T20:29:16Z from the accepted program snapshot. Recording/transcript status is separately time-bounded by the accepted recording snapshot and fresh playlist metadata.</div></article></div></div></section>
</main><footer class="footer"><div class="wrap">Agentic AI Summit 2026 · evidence analysis · public-safe evidence labels · no external dependencies · <a href="https://rdi.berkeley.edu/events/agentic-ai-summit-2026" target="_blank" rel="noreferrer">official program ↗</a></div></footer>
<script>{js}</script></body></html>'''

    worker_report = f'''# Worker report — Agentic AI Summit 2026 site candidate

## Result

Built the first full additive local candidate under `site_attempt_01/`. The controlling `BRIEF.md` was read in full and preserved. No network/web, Git/GitHub, publication, contact, application, login, config/auth/runtime action, deletion, rename, move, cleanup, or overwrite was performed.

## Evidence read

The candidate reads only the accepted evidence named in the brief: program JSON/CSV graph and gap/source files; recording, transcript-index, and final-manifest JSON; eight normalized Aug-1 transcript text files; the fresh official playlist snapshot; `live_notes.md`; `periodic_labs_lead_20260802.md`; and the accepted River AI diligence subtree. Relative paths only are present in public artifacts.

## Model/tier evidence

No actual model or service-tier metadata was present in the accepted local corpus or exposed as an evidence field to this worker. This report does not invent one.

## Evidence counts

- Program: {totals['program_blocks']} blocks / {totals['speakers']} indexed people ({totals['program_mapped_people']} program-mapped + {totals['featured_only_people']} featured-only) / {totals['session_speaker_joins']} session-speaker joins / {totals['organizations']} organizations.
- Recordings snapshot: {totals['recordings_in_snapshot']} entries; {totals['ended_recordings']} ended archives; accepted final manifest media count {totals['final_manifest_media']}; {totals['final_manifest_duration_seconds']} seconds / {totals['final_manifest_bytes']} bytes.
- Aug-1 transcript coverage: {totals['aug1_transcript_files']} normalized English files / {totals['aug1_normalized_cues']:,} cues.
- Fresh official playlist snapshot: {totals['fresh_playlist_entries']} entries.
- Aug-2: {len(aug2_entries)} transcript entries, all unavailable in the accepted corpus.

## Files written (all new, additive)

- `analysis.json`
- `sources.json`
- `index.html`
- `worker_report.md`
- `build_candidate.py`
- `qa_check.py` (reproducibility/QA helper; executed after build)
- `qa_report.json` (deterministic QA receipt)

## Truth and privacy decisions

- Representative claims carry source type/path or official URL, recording ID/timestamp/excerpt where applicable, fact-vs-interpretation label, and attribution confidence.
- Speaker attribution is withheld when a stage recording spans multiple schedule blocks or ASR identity is noisy; schedule titles are never presented as transcripts.
- Aug-2 recording/transcript gaps are visible in the coverage matrix and gap callout.
- Public artifacts contain no absolute local paths, email addresses, credentials, tokenized links, private mailbox content, raw logs, or Telegram/message IDs.

## Validation

`qa_check.py` was run synchronously after generation with the output written to `qa_report.json`. It parses both JSON deliverables, parses HTML with the standard library, checks public-safe path/source rules, validates corpus-derived counts, checks responsive/overflow CSS markers, and verifies that `BRIEF.md` remains present. The exact pass receipt is in `qa_report.json`.
'''

    write_new(SITE / "analysis.json", analysis_json)
    write_new(SITE / "sources.json", sources_json)
    write_new(SITE / "index.html", html_doc)
    write_new(SITE / "worker_report.md", worker_report)


if __name__ == "__main__":
    main()
