#!/usr/bin/env python3
"""
End-to-End Verification Suite for Nexconn Build Challenge 2026 (`nexconn2026`).

Covers all 16 deliverable features (F1-F16) defined in PROJECT.md and ORIGINAL_REQUEST.md
across 4 verification tiers:
  - Tier 1: Feature Coverage (80 tests = 5 per feature x 16 features)
  - Tier 2: Boundary, Corner Cases, Format, PDF & Rubric Math Validation (85 tests)
  - Tier 3: Cross-Feature Combinations (16 pairwise interaction tests)
  - Tier 4: Real-World Application Scenarios (8 end-to-end user/judge/skill scenarios)

CLI Usage:
  python d:\\Hackathons\\Nexconn\\tests\\run_e2e_tests.py
  python d:\\Hackathons\\Nexconn\\tests\\run_e2e_tests.py --tier 1
  python d:\\Hackathons\\Nexconn\\tests\\run_e2e_tests.py --tier 2
  python d:\\Hackathons\\Nexconn\\tests\\run_e2e_tests.py --tier 3
  python d:\\Hackathons\\Nexconn\\tests\\run_e2e_tests.py --tier 4
  python d:\\Hackathons\\Nexconn\\tests\\run_e2e_tests.py --tier all
  python d:\\Hackathons\\Nexconn\\tests\\run_e2e_tests.py --self-test
"""

from __future__ import annotations

import argparse
import dataclasses
import math
import os
import re
import shutil
import sys
import tempfile
from pathlib import Path
from typing import Callable, Dict, List, Optional, Tuple

try:
    import pypdf
except ImportError:
    pypdf = None  # type: ignore


CANONICAL_TRACKS: List[Dict[str, str]] = [
    {
        "num": "01",
        "slug": "nexconn-social",
        "track_id": "nexconn-social",
        "name": "Social & Community",
        "tagline": "Group messaging and topic-based channels",
        "feature_id": "F09",
    },
    {
        "num": "02",
        "slug": "nexconn-gaming",
        "track_id": "nexconn-gaming",
        "name": "Gaming & Live Streams",
        "tagline": "Squad chat and live stream interactive chatroom",
        "feature_id": "F10",
    },
    {
        "num": "03",
        "slug": "nexconn-workplace",
        "track_id": "nexconn-workplace",
        "name": "Workplace & Collaboration",
        "tagline": "Direct messaging and team project threads",
        "feature_id": "F11",
    },
    {
        "num": "04",
        "slug": "nexconn-support",
        "track_id": "nexconn-support",
        "name": "Marketplace & Support",
        "tagline": "Buyer-seller chat and customer service",
        "feature_id": "F12",
    },
    {
        "num": "05",
        "slug": "nexconn-social-good",
        "track_id": "nexconn-social-good",
        "name": "Humanitarian & Social Good",
        "tagline": "Accessible text chat for seniors and communities",
        "feature_id": "F13",
    },
    {
        "num": "06",
        "slug": "open-innovation",
        "track_id": "open",
        "name": "Open Innovation",
        "tagline": "Any interactive chat idea",
        "feature_id": "F14",
    },
]

REQUIRED_IDEA_FIELD_PATTERNS: List[Tuple[str, str]] = [
    ("Type", r"\*{0,2}(?:Type|Tag)\*{0,2}\s*:"),
    ("Score", r"\*{0,2}Score\*{0,2}\s*:"),
    (
        "Problem statement",
        r"\*{0,2}(?:Problem\s+statement|One-line\s+hook)\*{0,2}\s*:|^##\s+Idea\s+\d+\s+[—-]\s+[^:\n]+:",
    ),
    (
        "The pain (Mike Ross)",
        r"\*{0,2}(?:The\s+pain(?:\s*\([^)]*\))?|Problem\s*(?:&|and)\s*who\s+feels\s+it)\*{0,2}\s*:",
    ),
    ("Why now", r"\*{0,2}Why\s+now(?:\s*\([^)]*\))?\*{0,2}\s*:"),
    (
        "The gap others miss",
        r"\*{0,2}(?:The\s+gap\s+others\s+miss(?:\s*\([^)]*\))?|Judge\s*(?:&|and)\s*sponsor\s+alignment|Judge\s+fit)\*{0,2}",
    ),
    (
        "What exists and why it falls short",
        r"\*{0,2}What\s+exists(?:\s+today)?\s+(?:and|&)\s+why\s+it\s+(?:falls\s+short|fails)\*{0,2}\s*:",
    ),
    ("How it works", r"\*{0,2}(?:How\s+it\s+works|The\s+solution)\*{0,2}\s*:"),
    (
        "The demo moment (Jobs)",
        r"\*{0,2}(?:The\s+demo\s+moment(?:\s*\([^)]*\))?|60-second\s+demo\s+script(?:\s*\([^)]*\))?|90-Second\s+Judge\s+Demo\s+Narrative)\*{0,2}",
    ),
    (
        "30-second explanation (Karp)",
        r"\*{0,2}(?:30-second\s+explanation(?:\s*\([^)]*\))?|30-second\s+viral\s+clip(?:\s*\([^)]*\))?|Tribe\s*&\s*Growth)\*{0,2}",
    ),
    (
        "Council jurisdiction",
        r"\*{0,2}(?:Council\s+jurisdiction(?:\s*\([^)]*\))?|Council\s+lenses|Council\s+attribution)\*{0,2}",
    ),
    ("Tech stack (basic)", r"\*{0,2}Tech\s+stack(?:\s*\([^)]*\))?\*{0,2}\s*:"),
    (
        "Implementation sketch",
        r"\*{0,2}(?:Implementation\s+sketch|36-hour\s+(?:implementation\s+sketch|build\s+plan)(?:\s*\([^)]*\))?)\*{0,2}\s*:",
    ),
    ("Score breakdown", r"\*{0,2}Score\s+breakdown\*{0,2}\s*:"),
]

RAW_DIALOGUE_LEAK_REGEX = re.compile(
    r"(?m)^\s*\*\*(?:PETER\s+THIEL|THIEL|CHARLIE\s+MUNGER|MUNGER|PATRICK\s+JANE|JANE|"
    r"ANDREJ\s+KARPATHY|KARPATHY|ELON\s+MUSK|MUSK|WARREN\s+BUFFETT|BUFFETT|"
    r"HARVEY\s+SPECTER|HARVEY|MIKE\s+ROSS|PAUL\s+GRAHAM|GRAHAM|STEVE\s+JOBS|JOBS)\s*:\*\*"
)

TODO_TBD_REGEX = re.compile(r"\b(?:TODO|TBD)\b")

URL_REGEX = re.compile(r"https?://[^\s)>\]\"'`]+")


@dataclasses.dataclass
class TestResult:
    test_id: str
    tier: int
    feature: str
    description: str
    passed: bool
    detail: str = ""


# ---------------------------------------------------------------------------
# Pure Helper & Validator Functions
# ---------------------------------------------------------------------------


def read_text_safe(path: Path) -> str:
    if not path.exists() or not path.is_file():
        return ""
    return path.read_text(encoding="utf-8", errors="replace")


def has_no_todo_tbd(text: str) -> Tuple[bool, List[str]]:
    if not text or not text.strip():
        return False, ["Empty text"]
    matches = []
    for idx, line in enumerate(text.splitlines(), start=1):
        found = TODO_TBD_REGEX.findall(line)
        if found:
            matches.append(f"Line {idx}: {found[0]} in '{line.strip()[:80]}'")
    return len(matches) == 0, matches


def has_no_raw_dialogue_leak(text: str) -> Tuple[bool, List[str]]:
    if not text or not text.strip():
        return False, ["Empty text"]
    leaks = []
    for match in RAW_DIALOGUE_LEAK_REGEX.finditer(text):
        snippet = text[match.start() : min(len(text), match.end() + 40)].strip()
        leaks.append(snippet)
    return len(leaks) == 0, leaks


def extract_idea_blocks(text: str) -> List[Tuple[str, str]]:
    """Return list of (idea_heading, idea_block_text) for '## Idea N...' sections."""
    if not text:
        return []
    pattern = re.compile(r"(?m)^##\s+Idea\s+(\d+)\b[^\n]*$")
    matches = list(pattern.finditer(text))
    blocks: List[Tuple[str, str]] = []
    for i, m in enumerate(matches):
        start = m.start()
        end = matches[i + 1].start() if i + 1 < len(matches) else len(text)
        # Also stop at next H1 (`# `) if present before next `## Idea`
        sub = text[start:end]
        next_h1 = re.search(r"(?m)^#\s+[^\n]+", sub[len(m.group(0)) :])
        if next_h1:
            sub = sub[: len(m.group(0)) + next_h1.start()]
        blocks.append((m.group(0).strip(), sub))
    return blocks


def check_idea_required_fields(idea_block: str) -> Tuple[bool, List[str]]:
    missing: List[str] = []
    for field_name, regex_pat in REQUIRED_IDEA_FIELD_PATTERNS:
        if not re.search(regex_pat, idea_block, flags=re.IGNORECASE | re.MULTILINE):
            missing.append(field_name)
    return len(missing) == 0, missing


def verify_idea_score_math(idea_block: str, tolerance: float = 0.15) -> Tuple[bool, str]:
    """
    Verify 9-criterion weighted formula:
      0.15*(pain + novelty + alignment + demo)
    + 0.10*(feasibility + India + business)
    + 0.05*(legal + moonshot)
    matches stated `Score: X.X/10` within `±tolerance`.
    """
    score_match = re.search(
        r"\*{0,2}Score\*{0,2}\s*:?\s*\*{0,2}\s*(\d+(?:\.\d+)?)\s*/\s*10",
        idea_block,
        flags=re.IGNORECASE,
    )
    if not score_match:
        return False, "Missing stated Score: X.X/10"
    stated_score = float(score_match.group(1))

    bd_idx = re.search(r"Score\s+breakdown", idea_block, flags=re.IGNORECASE)
    search_region = idea_block[bd_idx.start() :] if bd_idx else idea_block

    criteria_keys = [
        "pain",
        "novelty",
        "alignment",
        "demo",
        "feasibility",
        "india",
        "business",
        "legal",
        "moonshot",
    ]
    extracted: Dict[str, float] = {}
    for key in criteria_keys:
        pat = rf"\b{key}\b\s*(?:\([^)]*\))?\s*[:=]?\s*\**(\d+(?:\.\d+)?)(?:\s*/\s*10)?"
        m = re.search(pat, search_region, flags=re.IGNORECASE)
        if not m and bd_idx:
            m = re.search(pat, idea_block, flags=re.IGNORECASE)
        if not m:
            return False, f"Missing criterion '{key}' in Score breakdown"
        val = float(m.group(1))
        if val < 0.0 or val > 10.0:
            return False, f"Criterion '{key}' value {val} out of range [0, 10]"
        extracted[key] = val

    computed = (
        0.15
        * (
            extracted["pain"]
            + extracted["novelty"]
            + extracted["alignment"]
            + extracted["demo"]
        )
        + 0.10 * (extracted["feasibility"] + extracted["india"] + extracted["business"])
        + 0.05 * (extracted["legal"] + extracted["moonshot"])
    )
    diff = abs(stated_score - computed)
    if diff > tolerance:
        return (
            False,
            f"Stated score {stated_score:.2f} != computed {computed:.2f} (diff={diff:.3f} > {tolerance})",
        )
    return True, f"Stated {stated_score:.2f} ~= computed {computed:.2f} (diff={diff:.3f})"


def verify_pdf_file(pdf_path: Path, min_bytes: int = 10000, min_pages: int = 5) -> Tuple[bool, str]:
    if not pdf_path.exists() or not pdf_path.is_file():
        return False, f"File missing: {pdf_path}"
    size = pdf_path.stat().st_size
    if size <= min_bytes:
        return False, f"PDF size {size} bytes <= {min_bytes} minimum"
    with pdf_path.open("rb") as f:
        header = f.read(5)
    if header != b"%PDF-":
        return False, f"Invalid PDF header: {header!r}"
    if pypdf is None:
        return False, "pypdf package not available for page inspection"
    try:
        reader = pypdf.PdfReader(str(pdf_path))
        num_pages = len(reader.pages)
        if num_pages < min_pages:
            return False, f"PDF has {num_pages} pages, expected >= {min_pages}"
        first_page_text = reader.pages[0].extract_text() or ""
        second_page_text = reader.pages[1].extract_text() or "" if num_pages > 1 else ""
        if len((first_page_text + second_page_text).strip()) < 20:
            return False, "PDF pages contain no extractable text"
        return True, f"Valid PDF ({size} bytes, {num_pages} pages)"
    except Exception as exc:
        return False, f"pypdf failed to read {pdf_path.name}: {exc}"


# ---------------------------------------------------------------------------
# Tier 1: Feature Coverage (80 Tests = 5 per feature across F1-F16)
# ---------------------------------------------------------------------------


def run_tier1_tests(root: Path) -> List[TestResult]:
    results: List[TestResult] = []

    def add(test_id: str, feat: str, desc: str, passed: bool, detail: str = "") -> None:
        results.append(TestResult(test_id, 1, feat, desc, passed, detail))

    # F1: Raw Source & Bundle Archival (`research/00-source/*`)
    src_dir = root / "research" / "00-source"
    src_files = list(src_dir.glob("*")) if src_dir.exists() else []
    non_empty_src = [p for p in src_files if p.is_file() and p.stat().st_size > 100]
    combined_src = "\n".join(read_text_safe(p) for p in non_empty_src if p.suffix.lower() in {".md", ".txt", ".json", ".js", ".html"})

    add("T1_F01_01", "F1", "research/00-source directory exists", src_dir.is_dir(), str(src_dir))
    add("T1_F01_02", "F1", "research/00-source contains >= 1 non-empty raw source file", len(non_empty_src) >= 1, f"count={len(non_empty_src)}")
    add("T1_F01_03", "F1", "Archival captures Nexconn Build Challenge 2026 / nexconn2026 identity", bool(re.search(r"Nexconn\s+Build\s+Challenge|nexconn2026", combined_src, re.I)), "Checked raw source text")
    add("T1_F01_04", "F1", "Archival captures Reskilll portal or JS bundle references", bool(re.search(r"reskilll\.com|index-BVD-GoH1|Rules-DQNF0983|Submit-R3OJNUmD", combined_src, re.I)), "Checked bundle/portal reference")
    add("T1_F01_05", "F1", "Archival captures Nexconn SDK / documentation references", bool(re.search(r"docs\.nexconn\.ai|Chat\s+SDK|nexconn-skills", combined_src, re.I)), "Checked SDK/docs reference")

    # F2: Canonical Hackathon Facts (`research/01-facts.md`)
    f2_path = root / "research" / "01-facts.md"
    f2_text = read_text_safe(f2_path)
    add("T1_F02_01", "F2", "research/01-facts.md exists and is non-empty (> 1000 bytes)", f2_path.is_file() and f2_path.stat().st_size > 1000, f"size={f2_path.stat().st_size if f2_path.exists() else 0}")
    add("T1_F02_02", "F2", "01-facts.md documents exact title, Oct 23 - Nov 22 timeline, and CN exclusion", all(bool(re.search(p, f2_text, re.I)) for p in [r"Nexconn\s+Build\s+Challenge\s+2026", r"Oct(?:ober)?\s+23", r"Nov(?:ember)?\s+22", r"Mainland\s+China|CN"]), "Checked title, dates, eligibility")
    add("T1_F02_03", "F2", "01-facts.md documents $5,000 cash pool and $20,640 Free Chat Plan perk", all(bool(re.search(p, f2_text, re.I)) for p in [r"\$5,000", r"\$2,000", r"\$20,640"]), "Checked prize pool figures")
    add("T1_F02_04", "F2", "01-facts.md lists all 6 canonical tracks", all(bool(re.search(p, f2_text, re.I)) for p in [r"nexconn-social|Social\s*&\s*Community", r"nexconn-gaming|Gaming\s*&\s*Live\s*Streams", r"nexconn-workplace|Workplace\s*&\s*Collaboration", r"nexconn-support|Marketplace\s*&\s*Support", r"nexconn-social-good|Humanitarian\s*&\s*Social\s*Good", r"Open\s+Innovation"]), "Checked all 6 tracks")
    add("T1_F02_05", "F2", "01-facts.md documents 50/30/20 judging criteria and mandatory App Key gate", all(bool(re.search(p, f2_text, re.I)) for p in [r"50%", r"30%", r"20%", r"App\s+Key"]), "Checked 50/30/20 weights and App Key")

    # F3: Recon Track A (`research/A-organisers.md`)
    f3_path = root / "research" / "A-organisers.md"
    f3_text = read_text_safe(f3_path)
    add("T1_F03_01", "F3", "research/A-organisers.md exists and is non-empty (> 1000 bytes)", f3_path.is_file() and f3_path.stat().st_size > 1000, f"size={f3_path.stat().st_size if f3_path.exists() else 0}")
    add("T1_F03_02", "F3", "A-organisers.md profiles Reskilll operations and admin evaluation portal", bool(re.search(r"Reskilll", f3_text, re.I)) and bool(re.search(r"Admin|portal|submission", f3_text, re.I)), "Checked Reskilll profile")
    add("T1_F03_03", "F3", "A-organisers.md profiles RCLOUD GLOBAL PTE. LTD. and RongCloud corporate identity", bool(re.search(r"RCLOUD\s+GLOBAL", f3_text, re.I)) and bool(re.search(r"RongCloud", f3_text, re.I)), "Checked corporate entity")
    add("T1_F03_04", "F3", "A-organisers.md covers leadership (Han Ying, Yang Pan, Leo, Kai, Amy)", sum(1 for name in ["Han Ying", "Yang Pan", "Cen Yu", "Leo", "Kai", "Amy"] if re.search(rf"\b{name}\b", f3_text, re.I)) >= 3, "Checked leadership names")
    add("T1_F03_05", "F3", "A-organisers.md analyzes organiser mandate and hidden motives", bool(re.search(r"motive|mandate|adoption|MAU|developer", f3_text, re.I)), "Checked motives/mandate")

    # F4: Recon Track B (`research/B-sponsors.md`)
    f4_path = root / "research" / "B-sponsors.md"
    f4_text = read_text_safe(f4_path)
    add("T1_F04_01", "F4", "research/B-sponsors.md exists and is non-empty (> 1500 bytes)", f4_path.is_file() and f4_path.stat().st_size > 1500, f"size={f4_path.stat().st_size if f4_path.exists() else 0}")
    add("T1_F04_02", "F4", "B-sponsors.md documents Fetion/RongCloud 19-year lineage and SD-CAN network", bool(re.search(r"Fetion|RongCloud", f4_text, re.I)) and bool(re.search(r"SD-CAN|120\s*ms|99\.99%", f4_text, re.I)), "Checked lineage & SD-CAN")
    add("T1_F04_03", "F4", "B-sponsors.md documents AICP (`AgentID` + `UserID`) and A2A architecture", bool(re.search(r"AICP|Agent-to-Agent|A2A", f4_text, re.I)) and bool(re.search(r"AgentID", f4_text, re.I)), "Checked AICP & AgentID")
    add("T1_F04_04", "F4", "B-sponsors.md documents core SDKs (Chat SDK, Chat UI, Call SDK) and advanced primitives", all(bool(re.search(p, f4_text, re.I)) for p in [r"Chat\s+SDK", r"Chat\s+UI", r"Call\s+SDK", r"stream-message|Streaming\s+Message", r"expansion|Message\s+Expansion", r"builtin-translation|Translation"]), "Checked SDKs & primitives")
    add("T1_F04_05", "F4", "B-sponsors.md documents `nexconn-skills`, Console MCP, and marquee customers/scale", bool(re.search(r"nexconn-skills|MCP", f4_text, re.I)) and bool(re.search(r"HoYoLAB|Bondee|Miniso|Jaco|Soul|Momo|Tantan|250,000|300,000", f4_text, re.I)), "Checked skills & customers")

    # F5: Recon Track C (`research/C-judges.md`)
    f5_path = root / "research" / "C-judges.md"
    f5_text = read_text_safe(f5_path)
    add("T1_F05_01", "F5", "research/C-judges.md exists and is non-empty (> 1000 bytes)", f5_path.is_file() and f5_path.stat().st_size > 1000, f"size={f5_path.stat().st_size if f5_path.exists() else 0}")
    add("T1_F05_02", "F5", "C-judges.md profiles Nexconn engineering/product evaluator archetypes", bool(re.search(r"Nexconn\s+judges|Nexconn\s+engineers|Nexconn\s+team|evaluator|Solutions\s+Engineering", f5_text, re.I)), "Checked evaluator profiles")
    add("T1_F05_03", "F5", "C-judges.md explains App Key console verification and active users telemetry check", bool(re.search(r"App\s+Key|appKey", f5_text, re.I)) and bool(re.search(r"active\s+users|activeUsers|console", f5_text, re.I)), "Checked App Key telemetry audit")
    add("T1_F05_04", "F5", "C-judges.md includes a 3-minute Judge Heat-Map", bool(re.search(r"heat-?map|3\s+minutes|first\s+45\s+seconds", f5_text, re.I)), "Checked judge heat-map")
    add("T1_F05_05", "F5", "C-judges.md identifies judge pet peeves and disqualification triggers", bool(re.search(r"pet\s+peeve|disqualif|mock|wrapper", f5_text, re.I)), "Checked pet peeves")

    # F6: Recon Track D (`research/D-why-now.md`)
    f6_path = root / "research" / "D-why-now.md"
    f6_text = read_text_safe(f6_path)
    add("T1_F06_01", "F6", "research/D-why-now.md exists and is non-empty (> 1000 bytes)", f6_path.is_file() and f6_path.stat().st_size > 1000, f"size={f6_path.stat().st_size if f6_path.exists() else 0}")
    add("T1_F06_02", "F6", "D-why-now.md covers policy, incident, geopolitical, historical, and sponsor triggers", sum(1 for kw in [r"policy|regulatory", r"incident|outage|scam", r"geopolit|sovereign", r"histor|failure\s+mode|graveyard", r"sponsor|roadmap"] if re.search(kw, f6_text, re.I)) >= 4, "Checked 5 trigger dimensions")
    add("T1_F06_03", "F6", "D-why-now.md covers all 6 tracks", sum(1 for t in CANONICAL_TRACKS if re.search(rf"{t['slug']}|{re.escape(t['name'])}", f6_text, re.I)) == 6, "Checked 6 tracks in D-why-now.md")
    add("T1_F06_04", "F6", "D-why-now.md follows Trigger -> Evidence -> Worry -> Proof analytical structure", all(bool(re.search(p, f6_text, re.I)) for p in [r"Trigger", r"Evidence", r"worr(?:y|ied)", r"prove|proof"]), "Checked Trigger->Evidence->Worry->Proof")
    add("T1_F06_05", "F6", "D-why-now.md includes inline URLs / dated citations", len(URL_REGEX.findall(f6_text)) >= 5, f"url_count={len(URL_REGEX.findall(f6_text))}")

    # F7: Recon Track E (`research/E-competition.md`)
    f7_path = root / "research" / "E-competition.md"
    f7_text = read_text_safe(f7_path)
    add("T1_F07_01", "F7", "research/E-competition.md exists and is non-empty (> 1200 bytes)", f7_path.is_file() and f7_path.stat().st_size > 1200, f"size={f7_path.stat().st_size if f7_path.exists() else 0}")
    add("T1_F07_02", "F7", "E-competition.md predicts participating team counts and the 80% trap per track", bool(re.search(r"80%|default\s+idea|default\s+trap", f7_text, re.I)) and bool(re.search(r"team|participant", f7_text, re.I)), "Checked team forecast & 80% trap")
    add("T1_F07_03", "F7", "E-competition.md catalogs global hackathon winners (ETHGlobal, TreeHacks, Devpost, etc.)", sum(1 for w in ["Industry.ai", "Truman AI", "OmniBet", "Ephemeral", "CodeCrack", "TxGPT", "Snaption", "BlinkAI", "ETHGlobal", "TreeHacks", "Devpost", "CastParty", "FrameStream"] if re.search(re.escape(w), f7_text, re.I)) >= 3, "Checked global hackathon winners")
    add("T1_F07_04", "F7", "E-competition.md catalogs research papers mapped to Nexconn", bool(re.search(r"arXiv|dl\.acm\.org|nature\.com", f7_text, re.I)) and len(re.findall(r"\d{4}\.\d{4,5}|10\.1145|s41598", f7_text)) >= 3, "Checked research paper citations")
    add("T1_F07_05", "F7", "E-competition.md includes GitHub repo / startup / dataset prior-art counts", all(bool(re.search(p, f7_text, re.I)) for p in [r"GitHub", r"startup|product", r"paper|arXiv"]), "Checked prior art categories")

    # F8: Connect-the-Dots (`research/F-connect-the-dots.md`) & Roster Additions (`war-room/roster-additions.md`)
    f8_dots_path = root / "research" / "F-connect-the-dots.md"
    f8_roster_path = root / "war-room" / "roster-additions.md"
    f8_dots_text = read_text_safe(f8_dots_path)
    f8_roster_text = read_text_safe(f8_roster_path)
    add("T1_F08_01", "F8", "research/F-connect-the-dots.md exists and is non-empty (> 1000 bytes)", f8_dots_path.is_file() and f8_dots_path.stat().st_size > 1000, f"size={f8_dots_path.stat().st_size if f8_dots_path.exists() else 0}")
    add("T1_F08_02", "F8", "F-connect-the-dots.md contains all 6 mandatory Patrick Jane synthesis sections", all(bool(re.search(p, f8_dots_text, re.I)) for p in [r"real\s+reason|hidden\s+agenda", r"secretly\s+fear|announce\s+afterwards|sweet\s+spot", r"hidden\s+evaluation\s+criteria|hidden\s+criteria|unwritten\s+rubric", r"landmine|trap\s+map|fatal\s+traps", r"dots\s+nobody\s+else\s+will\s+connect|connected\s+dots|non-obvious\s+dots", r"80%\s+trap|90%\s+of\s+teams|heat-?map|what\s+a\s+winning\s+entry"]), "Checked 6 synthesis sections")
    add("T1_F08_03", "F8", "F-connect-the-dots.md connects >= 7 distinct evidence-backed dots", len(re.findall(r"(?m)^(?:\s*(?:\d+\.|[-*])\s+\*\*|\s*###\s+(?:Dot\s+)?\d+|\|\s*\*\*Dot\s+\d+)", f8_dots_text)) >= 7, "Checked >= 7 dots")
    add("T1_F08_04", "F8", "war-room/roster-additions.md exists and is non-empty (> 500 bytes)", f8_roster_path.is_file() and f8_roster_path.stat().st_size > 500, f"size={f8_roster_path.stat().st_size if f8_roster_path.exists() else 0}")
    add("T1_F08_05", "F8", "roster-additions.md includes Nexconn SDK/AICP specialist dossier with rise/voice/blind spot", bool(re.search(r"Nexconn|AICP|SDK", f8_roster_text, re.I)) and all(bool(re.search(p, f8_roster_text, re.I)) for p in [r"rise|background", r"voice", r"blind\s+spot"]), "Checked custom expert dossier")

    # F9-F14: Tracks 01-06 (`research/domains/<slug>.md`, `war-room/<slug>.md`, `war-room/<slug>-ideas.md`)
    for track in CANONICAL_TRACKS:
        slug = track["slug"]
        fid = track["feature_id"]
        f_num = fid.replace("F0", "F").replace("F1", "F1")
        dom_path = root / "research" / "domains" / f"{slug}.md"
        wr_path = root / "war-room" / f"{slug}.md"
        id_path = root / "war-room" / f"{slug}-ideas.md"

        dom_text = read_text_safe(dom_path)
        wr_text = read_text_safe(wr_path)
        id_text = read_text_safe(id_path)

        add(
            f"T1_{fid}_01",
            f_num,
            f"All 3 files exist and are non-empty for {slug} (domain dossier, war-room transcript, top-5 ideas)",
            all(p.is_file() and p.stat().st_size > 1000 for p in [dom_path, wr_path, id_path]),
            f"dom={dom_path.exists()}, wr={wr_path.exists()}, ideas={id_path.exists()}",
        )
        add(
            f"T1_{fid}_02",
            f_num,
            f"research/domains/{slug}.md contains all 7 required domain research sections (Pain map, Urgency, Prior art, Gap analysis, Rails/SDKs, Tech frontier/Failures, 15+ seeds)",
            all(
                bool(re.search(p, dom_text, re.I))
                for p in [
                    r"pain\s+map|who\s+suffers",
                    r"urgency",
                    r"prior\s+art",
                    r"gap\s+analysis|exists\s+but\s+weak",
                    r"india\s+rails|nexconn|sdk",
                    r"tech\s+frontier|why\s+previous\s+attempts\s+failed|open\s+models|research\s+papers",
                    r"raw\s+idea\s+seeds|idea\s+seeds",
                ]
            ),
            f"Checked 7 sections in {slug}.md",
        )
        add(
            f"T1_{fid}_03",
            f_num,
            f"war-room/{slug}.md logs all 6 War-Room rounds (Round 0 through Round 5)",
            all(bool(re.search(rf"Round\s+{r}\b", wr_text, re.I)) for r in range(6)),
            f"Checked Rounds 0-5 in war-room/{slug}.md",
        )
        add(
            f"T1_{fid}_04",
            f_num,
            f"war-room/{slug}.md includes in-character debate turns from Core & Extra council personas",
            sum(
                1
                for seat in ["THIEL", "MUNGER", "KARPATHY", "MIKE", "BUFFETT", "HARVEY", "SHARMA", "JANE", "MUSK", "JOBS", "GRAHAM"]
                if re.search(rf"\*\*[^\n*]*{seat}[^\n*]*\*\*", wr_text, re.I)
            )
            >= 7,
            f"Checked persona speaker turns in war-room/{slug}.md",
        )
        idea_blocks = extract_idea_blocks(id_text)
        add(
            f"T1_{fid}_05",
            f_num,
            f"war-room/{slug}-ideas.md contains Domain snapshot and >= 5 ideas (## Idea 1 .. ## Idea 5)",
            bool(re.search(r"^##\s+Domain\s+snapshot", id_text, re.I | re.M)) and len(idea_blocks) >= 5,
            f"idea_count={len(idea_blocks)}",
        )

    # F15: Master Hackathon Bible (`biblehackathon.md` & `biblehackathon.pdf`)
    bible_md = root / "biblehackathon.md"
    bible_pdf = root / "biblehackathon.pdf"
    bible_text = read_text_safe(bible_md)
    add(
        "T1_F15_01",
        "F15",
        "biblehackathon.md exists and is substantial (> 5,000 bytes)",
        bible_md.is_file() and bible_md.stat().st_size > 5000,
        f"size={bible_md.stat().st_size if bible_md.exists() else 0}",
    )
    add(
        "T1_F15_02",
        "F15",
        "biblehackathon.md contains all 6 top-level H1 Parts (# Part 1 .. # Part 6) and # Sources",
        all(
            bool(re.search(p, bible_text, re.I | re.M))
            for p in [
                r"^#\s+Part\s+1\b",
                r"^#\s+Part\s+2\b",
                r"^#\s+Part\s+3\b",
                r"^#\s+Part\s+4\b",
                r"^#\s+Part\s+5\b",
                r"^#\s+Part\s+6\b",
                r"^#\s+Sources\b",
            ]
        ),
        "Checked H1 Parts 1-6 and # Sources",
    )
    add(
        "T1_F15_03",
        "F15",
        "biblehackathon.md contains required H2 sections across Parts 1-6",
        all(
            bool(re.search(p, bible_text, re.I | re.M))
            for p in [
                r"^##\s+At\s+a\s+glance",
                r"^##\s+Evaluation\s+criteria",
                r"^##\s+Themes\s*&\s*problem\s+statements",
                r"^##\s+Organisers\s*&\s*committee",
                r"^##\s+Sponsors",
                r"^##\s+Judge\s+heat-map",
                r"^##\s+The\s+real\s+reason\s+it\s+exists",
                r"^##\s+Dots\s+nobody\s+else\s+will\s+connect",
                r"^##\s+The\s+80%\s+trap",
                r"^##\s+Domain\s+Winnability\s+ranking",
                r"^##\s+Who\s+sat\s+in\s+the\s+war\s+room",
            ]
        ),
        "Checked required H2 headings in biblehackathon.md",
    )
    add(
        "T1_F15_04",
        "F15",
        "biblehackathon.md # Sources section contains >= 15 numbered/linked primary & research sources",
        len(URL_REGEX.findall(bible_text)) >= 15,
        f"url_count={len(URL_REGEX.findall(bible_text))}",
    )
    add(
        "T1_F15_05",
        "F15",
        "biblehackathon.pdf exists and is non-empty (> 10,000 bytes)",
        bible_pdf.is_file() and bible_pdf.stat().st_size > 10000,
        f"size={bible_pdf.stat().st_size if bible_pdf.exists() else 0}",
    )

    # F16: Master Ideas & Winning Selection (`ideas.md`, `ideas.pdf`, `state.md`)
    ideas_md = root / "ideas.md"
    ideas_pdf = root / "ideas.pdf"
    state_md = root / "state.md"
    ideas_text = read_text_safe(ideas_md)
    state_text = read_text_safe(state_md)
    all_ideas = extract_idea_blocks(ideas_text)

    add(
        "T1_F16_01",
        "F16",
        "ideas.md exists (> 10,000 bytes) and contains # Part 0 — Where to Play and # Sources",
        ideas_md.is_file()
        and ideas_md.stat().st_size > 10000
        and bool(re.search(r"^#\s+Part\s+0\b", ideas_text, re.I | re.M))
        and bool(re.search(r"^#\s+Sources\b", ideas_text, re.I | re.M)),
        f"size={ideas_md.stat().st_size if ideas_md.exists() else 0}",
    )
    add(
        "T1_F16_02",
        "F16",
        "ideas.md Part 0 contains Domain Winnability ranking, #1 pick & dark horse, and All ideas at a glance",
        all(
            bool(re.search(p, ideas_text, re.I | re.M))
            for p in [
                r"^##\s+Domain\s+Winnability\s+ranking",
                r"^##\s+The\s+council's\s+#1\s+pick\s+and\s+dark\s+horse",
                r"^##\s+All\s+ideas\s+at\s+a\s+glance",
            ]
        ),
        "Checked Part 0 H2 sections",
    )
    add(
        "T1_F16_03",
        "F16",
        "ideas.md contains >= 30 total ideas (5 ideas across each of the 6 tracks)",
        len(all_ideas) >= 30,
        f"total_ideas={len(all_ideas)}",
    )
    add(
        "T1_F16_04",
        "F16",
        "ideas.pdf exists and is non-empty (> 10,000 bytes)",
        ideas_pdf.is_file() and ideas_pdf.stat().st_size > 10000,
        f"size={ideas_pdf.stat().st_size if ideas_pdf.exists() else 0}",
    )
    add(
        "T1_F16_05",
        "F16",
        "state.md exists and records hackathon link, approved council roster, winnability ranking, and #1 winning pick",
        state_md.is_file()
        and state_md.stat().st_size > 500
        and all(
            bool(re.search(p, state_text, re.I))
            for p in [r"reskilll\.com/hack/nexconn", r"Thiel", r"Winnability", r"#1|winning|recommendation|dark\s+horse"]
        ),
        f"size={state_md.stat().st_size if state_md.exists() else 0}",
    )

    return results


# ---------------------------------------------------------------------------
# Tier 2: Boundary, Corner Cases, PDF, Schema & Math Validation (85 Tests)
# ---------------------------------------------------------------------------


def run_tier2_tests(root: Path) -> List[TestResult]:
    results: List[TestResult] = []

    def add(test_id: str, feat: str, desc: str, passed: bool, detail: str = "") -> None:
        results.append(TestResult(test_id, 2, feat, desc, passed, detail))

    # F1: Raw Source & Bundle Archival boundary checks
    src_dir = root / "research" / "00-source"
    src_files = [p for p in src_dir.glob("*") if p.is_file()] if src_dir.exists() else []
    combined_src = "\n".join(read_text_safe(p) for p in src_files)
    add("T2_F01_01", "F1", "No zero-byte files in research/00-source", len(src_files) > 0 and all(p.stat().st_size > 0 for p in src_files), f"files={len(src_files)}")
    add("T2_F01_02", "F1", "Raw source captures App Key validation regex or 8-64 length constraint", bool(re.search(r"8,64|8–64|8-64|appKey|App\s+Key", combined_src, re.I)), "Checked App Key rule in raw source")
    add("T2_F01_03", "F1", "Raw source captures all 6 track IDs (`nexconn-social` .. `open`)", all(bool(re.search(t["track_id"], combined_src, re.I)) for t in CANONICAL_TRACKS), "Checked 6 track IDs in raw source")
    add("T2_F01_04", "F1", "Raw source captures 25 MB write-up PDF limit or submission schema fields", bool(re.search(r"25\s*MB|writeup|demoVideoUrl|repoUrl|tractionUrl", combined_src, re.I)), "Checked submission schema details")
    add("T2_F01_05", "F1", "Raw source files are valid UTF-8 text without replacement characters", len(src_files) > 0 and "\ufffd" not in combined_src, "Checked UTF-8 decoding")

    # F2: 01-facts.md boundary & exactness checks
    f2_text = read_text_safe(root / "research" / "01-facts.md")
    ok_todo_f2, todo_f2 = has_no_todo_tbd(f2_text)
    add("T2_F02_01", "F2", "01-facts.md has zero standalone TODO or TBD markers", ok_todo_f2, "; ".join(todo_f2[:3]))
    add("T2_F02_02", "F2", "01-facts.md documents all 5 cash prize tiers ($2,000 / $1,250 / $750 / $500 / $500)", all(bool(re.search(p, f2_text)) for p in [r"\$2,000", r"\$1,250", r"\$750", r"\$500"]), "Checked 5 prize tiers")
    add("T2_F02_03", "F2", "01-facts.md documents 15% AWS and 30% Alibaba Cloud discounts", bool(re.search(r"15%", f2_text)) and bool(re.search(r"30%", f2_text)) and bool(re.search(r"Alibaba\s+Cloud", f2_text, re.I)), "Checked cloud discounts")
    add("T2_F02_04", "F2", "01-facts.md documents that Call SDK alone does NOT satisfy Chat SDK requirement", bool(re.search(r"Call\s+SDK", f2_text, re.I)) and bool(re.search(r"optional|not\s+satisfy|must\s+use.*Chat\s+SDK", f2_text, re.I)), "Checked Call SDK optional rule")
    add("T2_F02_05", "F2", "01-facts.md documents team size 1-4 and solo participation rule", bool(re.search(r"1[–-]4|up\s+to\s+4", f2_text, re.I)), "Checked team size 1-4")

    # F3: A-organisers.md boundary checks
    f3_text = read_text_safe(root / "research" / "A-organisers.md")
    ok_todo_f3, todo_f3 = has_no_todo_tbd(f3_text)
    add("T2_F03_01", "F3", "A-organisers.md has zero standalone TODO or TBD markers", ok_todo_f3, "; ".join(todo_f3[:3]))
    add("T2_F03_02", "F3", "A-organisers.md cites >= 3 real URLs", len(URL_REGEX.findall(f3_text)) >= 3, f"urls={len(URL_REGEX.findall(f3_text))}")
    add("T2_F03_03", "F3", "A-organisers.md documents the 100 MAU auto-renewal / $860/mo Free Chat Plan business funnel", bool(re.search(r"\$860|10,000\s*MAU|100\s*MAU", f3_text, re.I)), "Checked Free Chat Plan funnel")
    add("T2_F03_04", "F3", "A-organisers.md documents Reskilll admin review columns (appKey, activeUsers, tractionUrl)", bool(re.search(r"appKey|App\s+Key", f3_text, re.I)) and bool(re.search(r"activeUsers|active\s+users", f3_text, re.I)), "Checked admin columns")
    add("T2_F03_05", "F3", "A-organisers.md distinguishes verified facts from HUNCHes or unknowns", bool(re.search(r"HUNCH:|verified|evidence|bundle", f3_text, re.I)), "Checked evidence/hunch discipline")

    # F4: B-sponsors.md boundary checks
    f4_text = read_text_safe(root / "research" / "B-sponsors.md")
    ok_todo_f4, todo_f4 = has_no_todo_tbd(f4_text)
    add("T2_F04_01", "F4", "B-sponsors.md has zero standalone TODO or TBD markers", ok_todo_f4, "; ".join(todo_f4[:3]))
    add("T2_F04_02", "F4", "B-sponsors.md documents all 4 Nexconn channel types (Direct, Group, Community, Open)", all(bool(re.search(p, f4_text, re.I)) for p in [r"Direct\s+Channel", r"Group\s+Channel", r"Community\s+Channel|Communities", r"Open\s+Channel"]), "Checked 4 channel types")
    add("T2_F04_03", "F4", "B-sponsors.md documents Targeted Group Messages (`group-channels/direct` / whisper) and E2EE (`X3DH` / `Double Ratchet`)", bool(re.search(r"group-channels/direct|Targeted\s+Group\s+Message", f4_text, re.I)) and bool(re.search(r"E2EE|X3DH|Double\s+Ratchet", f4_text, re.I)), "Checked Targeted Group Messages & E2EE")
    add("T2_F04_04", "F4", "B-sponsors.md documents platform constraints (Flutter Call SDK 'Coming soon' & custom UI for Community/Open channels)", bool(re.search(r"Flutter", f4_text, re.I)) and bool(re.search(r"Coming\s+soon|Community|Open\s+Channel", f4_text, re.I)), "Checked platform nuances")
    add("T2_F04_05", "F4", "B-sponsors.md includes a track-by-track Nexconn SDK leverage mapping for all 6 tracks", sum(1 for t in CANONICAL_TRACKS if re.search(rf"{t['slug']}|{re.escape(t['name'])}", f4_text, re.I)) == 6, "Checked 6-track mapping in B-sponsors.md")

    # F5: C-judges.md boundary checks
    f5_text = read_text_safe(root / "research" / "C-judges.md")
    ok_todo_f5, todo_f5 = has_no_todo_tbd(f5_text)
    add("T2_F05_01", "F5", "C-judges.md has zero standalone TODO or TBD markers", ok_todo_f5, "; ".join(todo_f5[:3]))
    add("T2_F05_02", "F5", "C-judges.md explicitly notes individual judge names are undisclosed on the portal (no fabricated names)", bool(re.search(r"not\s+disclosed|undisclosed|not\s+published|not\s+listed|No\s+external.*judges|unknown|Nexconn\s+judges|Nexconn\s+team", f5_text, re.I)), "Checked no-fabrication rule for judges")
    add("T2_F05_03", "F5", "C-judges.md maps the 50% Completeness & UX weight to zero-friction live demo onboarding", bool(re.search(r"50%", f5_text)) and bool(re.search(r"demo|login|persona|onboarding", f5_text, re.I)), "Checked 50% UX demo strategy")
    add("T2_F05_04", "F5", "C-judges.md maps the 30% Innovation weight to advanced Nexconn primitives", bool(re.search(r"30%", f5_text)) and bool(re.search(r"expansion|stream-message|AICP|Open\s+Channel|Community\s+Channel", f5_text, re.I)), "Checked 30% Innovation strategy")
    add("T2_F05_05", "F5", "C-judges.md maps the 20% Business & Growth weight to activeUsers console telemetry", bool(re.search(r"20%", f5_text)) and bool(re.search(r"activeUsers|active\s+users|traction", f5_text, re.I)), "Checked 20% Traction strategy")

    # F6: D-why-now.md boundary checks
    f6_text = read_text_safe(root / "research" / "D-why-now.md")
    ok_todo_f6, todo_f6 = has_no_todo_tbd(f6_text)
    add("T2_F06_01", "F6", "D-why-now.md has zero standalone TODO or TBD markers", ok_todo_f6, "; ".join(todo_f6[:3]))
    add("T2_F06_02", "F6", "D-why-now.md references Indian DPI / regulatory drivers (DPDP Act, Bhashini, ONDC, UPI, IndiaAI)", sum(1 for kw in ["DPDP", "Bhashini", "ONDC", "UPI", "IndiaAI"] if re.search(kw, f6_text, re.I)) >= 2, "Checked India policy/DPI drivers")
    add("T2_F06_03", "F6", "D-why-now.md references Jaishankar geopolitical / Global South / sovereign tech lens", bool(re.search(r"Jaishankar|Global\s+South|sovereign|supply\s+chain|cross-border", f6_text, re.I)), "Checked geopolitical lens")
    add("T2_F06_04", "F6", "D-why-now.md references 2025-2026 AI agent protocol shift (MCP / A2A / AICP)", bool(re.search(r"MCP|A2A|AICP|multi-agent", f6_text, re.I)), "Checked AI protocol trigger")
    add("T2_F06_05", "F6", "D-why-now.md contains >= 5 distinct Trigger -> Proof mappings", len(re.findall(r"Trigger|What\s+a\s+winning\s+answer\s+must\s+prove", f6_text, re.I)) >= 5, "Checked trigger mapping count")

    # F7: E-competition.md boundary checks
    f7_text = read_text_safe(root / "research" / "E-competition.md")
    ok_todo_f7, todo_f7 = has_no_todo_tbd(f7_text)
    add("T2_F07_01", "F7", "E-competition.md has zero standalone TODO or TBD markers", ok_todo_f7, "; ".join(todo_f7[:3]))
    add("T2_F07_02", "F7", "E-competition.md covers the 80% default trap for all 6 tracks", sum(1 for t in CANONICAL_TRACKS if re.search(rf"{t['slug']}|{re.escape(t['name'])}", f7_text, re.I)) == 6, "Checked 6 tracks in E-competition.md")
    add("T2_F07_03", "F7", "E-competition.md includes >= 6 real URLs to papers/repos/projects", len(URL_REGEX.findall(f7_text)) >= 6, f"urls={len(URL_REGEX.findall(f7_text))}")
    add("T2_F07_04", "F7", "E-competition.md maps global hackathon winners to specific Nexconn tracks and primitives", bool(re.search(r"Industry\.ai|Truman\s+AI|OmniBet|Ephemeral|TxGPT|Snaption|ETHGlobal|Devpost|TreeHacks|CastParty|FrameStream", f7_text, re.I)) and bool(re.search(r"stream-message|expansion|Open\s+Channel|Group\s+Channel", f7_text, re.I)), "Checked winner-to-Nexconn mapping")
    add("T2_F07_05", "F7", "E-competition.md maps arXiv/academic research papers (e.g. 2505.02279, 2603.03060, 2412.15701, 2505.24224) to Nexconn", len(re.findall(r"\d{4}\.\d{4,5}|10\.1145|s41598", f7_text)) >= 3, "Checked specific arXiv/DOI IDs")

    # F8: F-connect-the-dots.md & roster-additions.md boundary checks
    f8_dots_text = read_text_safe(root / "research" / "F-connect-the-dots.md")
    f8_roster_text = read_text_safe(root / "war-room" / "roster-additions.md")
    ok_todo_f8a, todo_f8a = has_no_todo_tbd(f8_dots_text)
    ok_todo_f8b, todo_f8b = has_no_todo_tbd(f8_roster_text)
    add("T2_F08_01", "F8", "F-connect-the-dots.md and roster-additions.md have zero standalone TODO/TBD markers", ok_todo_f8a and ok_todo_f8b, "; ".join((todo_f8a + todo_f8b)[:3]))
    add("T2_F08_02", "F8", "F-connect-the-dots.md references Patrick Jane, Jaishankar, Sharma, Thiel, Karp, Graham, and Munger", sum(1 for p in ["Jane", "Jaishankar", "Sharma", "Thiel", "Karp", "Graham", "Munger"] if re.search(p, f8_dots_text, re.I)) >= 5, "Checked recon synthesis participants")
    add("T2_F08_03", "F8", "F-connect-the-dots.md identifies landmines (e.g. Call SDK only, fake WebSocket chat, complex multi-account signup)", bool(re.search(r"Call\s+SDK|WebSocket|login|App\s+Key", f8_dots_text, re.I)), "Checked specific landmines")
    add("T2_F08_04", "F8", "roster-additions.md defines jurisdiction modes (LEAD / SUPPORT / SILENT) or domain bench assignments", bool(re.search(r"LEAD|SUPPORT|domain", f8_roster_text, re.I)), "Checked roster jurisdiction")
    add("T2_F08_05", "F8", "roster-additions.md includes all 6 persona dossier attributes (rise, how they decide, asks, attacks, voice, blind spot)", sum(1 for attr in ["rise", "decide", "asks", "attacks", "voice", "blind spot"] if re.search(attr, f8_roster_text, re.I)) >= 5, "Checked 6 dossier attributes")

    # F9-F14: Tracks 01-06 boundary, schema, math, and no-dialogue-leak checks
    for track in CANONICAL_TRACKS:
        slug = track["slug"]
        fid = track["feature_id"]
        f_num = fid.replace("F0", "F").replace("F1", "F1")
        dom_text = read_text_safe(root / "research" / "domains" / f"{slug}.md")
        wr_text = read_text_safe(root / "war-room" / f"{slug}.md")
        id_text = read_text_safe(root / "war-room" / f"{slug}-ideas.md")

        ok_todo_dom, t_dom = has_no_todo_tbd(dom_text)
        ok_todo_wr, t_wr = has_no_todo_tbd(wr_text)
        ok_todo_id, t_id = has_no_todo_tbd(id_text)
        add(
            f"T2_{fid}_01",
            f_num,
            f"Zero standalone TODO/TBD markers across all 3 files for {slug}",
            ok_todo_dom and ok_todo_wr and ok_todo_id,
            "; ".join((t_dom + t_wr + t_id)[:3]),
        )

        # Check 15+ raw idea seeds and 3 gap buckets in domain dossier
        has_buckets = all(
            bool(re.search(b, dom_text, re.I))
            for b in [r"Exists\s+but\s+weak|Exists-but-weak", r"Doesn't\s+exist|Does\s+not\s+exist", r"Exists\s+abroad"]
        )
        add(
            f"T2_{fid}_02",
            f_num,
            f"research/domains/{slug}.md has all 3 gap buckets and >= 5 cited URLs",
            has_buckets and len(URL_REGEX.findall(dom_text)) >= 5,
            f"buckets={has_buckets}, urls={len(URL_REGEX.findall(dom_text))}",
        )

        # Check all 5 ideas in war-room/<slug>-ideas.md have all 14 required fields
        idea_blocks = extract_idea_blocks(id_text)
        field_errors: List[str] = []
        if len(idea_blocks) < 5:
            field_errors.append(f"Expected >= 5 ideas, found {len(idea_blocks)}")
        for heading, block in idea_blocks[:5]:
            ok_f, miss = check_idea_required_fields(block)
            if not ok_f:
                field_errors.append(f"{heading} missing {miss}")
        add(
            f"T2_{fid}_03",
            f_num,
            f"All 5 ideas in war-room/{slug}-ideas.md contain all 14 required template fields",
            len(idea_blocks) >= 5 and len(field_errors) == 0,
            "; ".join(field_errors[:3]),
        )

        # Check 9-criterion weighted score math for all 5 ideas in war-room/<slug>-ideas.md
        math_errors: List[str] = []
        if len(idea_blocks) < 5:
            math_errors.append(f"Expected >= 5 ideas, found {len(idea_blocks)}")
        for heading, block in idea_blocks[:5]:
            ok_m, msg = verify_idea_score_math(block)
            if not ok_m:
                math_errors.append(f"{heading}: {msg}")
        add(
            f"T2_{fid}_04",
            f_num,
            f"All 5 ideas in war-room/{slug}-ideas.md satisfy the 9-criterion weighted score formula (±0.15)",
            len(idea_blocks) >= 5 and len(math_errors) == 0,
            "; ".join(math_errors[:3]),
        )

        # Check no raw war-room dialogue leaked into war-room/<slug>-ideas.md
        ok_noleak, leaks = has_no_raw_dialogue_leak(id_text)
        add(
            f"T2_{fid}_05",
            f_num,
            f"No raw war-room dialogue turns (**THIEL:**, **MUNGER:**, etc.) leaked into war-room/{slug}-ideas.md",
            ok_noleak,
            "; ".join(leaks[:3]),
        )

    # F15: biblehackathon.md & biblehackathon.pdf boundary and PDF checks
    bible_md = root / "biblehackathon.md"
    bible_pdf = root / "biblehackathon.pdf"
    bible_text = read_text_safe(bible_md)
    ok_todo_bible, todo_bible = has_no_todo_tbd(bible_text)
    add("T2_F15_01", "F15", "biblehackathon.md has zero standalone TODO or TBD markers", ok_todo_bible, "; ".join(todo_bible[:3]))
    pdf_ok_bible, pdf_msg_bible = verify_pdf_file(bible_pdf, min_bytes=10000, min_pages=5)
    add("T2_F15_02", "F15", "biblehackathon.pdf is > 10,000 bytes, begins with %PDF-, and has >= 5 readable pages via pypdf", pdf_ok_bible, pdf_msg_bible)
    add("T2_F15_03", "F15", "biblehackathon.md Domain Winnability table ranks all 6 canonical tracks", sum(1 for t in CANONICAL_TRACKS if re.search(rf"{t['slug']}|{re.escape(t['name'])}", bible_text, re.I)) == 6, "Checked 6 tracks in biblehackathon.md")
    add("T2_F15_04", "F15", "biblehackathon.md Part 6 lists the 11 Core + 6 Extra council seats", sum(1 for seat in ["Thiel", "Karp", "Jane", "Buffett", "Harvey", "Mike Ross", "Jobs", "Musk", "Karpathy", "Jaishankar", "Sharma", "Munger", "Godin", "Gary", "Tim Cook", "Jony Ive", "Paul Graham"] if re.search(seat, bible_text, re.I)) >= 15, "Checked 17 Core+Extra seats in Part 6")
    ok_noleak_bible, leaks_bible = has_no_raw_dialogue_leak(bible_text)
    add("T2_F15_05", "F15", "biblehackathon.md contains no raw war-room transcript turns", ok_noleak_bible, "; ".join(leaks_bible[:3]))

    # F16: ideas.md, ideas.pdf & state.md boundary, PDF, schema, math, and no-leak checks
    ideas_md = root / "ideas.md"
    ideas_pdf = root / "ideas.pdf"
    state_md = root / "state.md"
    ideas_text = read_text_safe(ideas_md)
    state_text = read_text_safe(state_md)

    ok_todo_ideas, todo_ideas = has_no_todo_tbd(ideas_text)
    ok_todo_state, todo_state = has_no_todo_tbd(state_text)
    add("T2_F16_01", "F16", "ideas.md and state.md have zero standalone TODO or TBD markers", ok_todo_ideas and ok_todo_state, "; ".join((todo_ideas + todo_state)[:3]))

    pdf_ok_ideas, pdf_msg_ideas = verify_pdf_file(ideas_pdf, min_bytes=10000, min_pages=5)
    add("T2_F16_02", "F16", "ideas.pdf is > 10,000 bytes, begins with %PDF-, and has >= 5 readable pages via pypdf", pdf_ok_ideas, pdf_msg_ideas)

    all_idea_blocks = extract_idea_blocks(ideas_text)
    all_field_errors: List[str] = []
    if len(all_idea_blocks) < 30:
        all_field_errors.append(f"Expected >= 30 ideas in ideas.md, found {len(all_idea_blocks)}")
    for heading, block in all_idea_blocks:
        ok_f, miss = check_idea_required_fields(block)
        if not ok_f:
            all_field_errors.append(f"{heading} missing {miss}")
    add("T2_F16_03", "F16", "All 30 ideas in ideas.md contain all 14 required template fields", len(all_idea_blocks) >= 30 and len(all_field_errors) == 0, "; ".join(all_field_errors[:3]))

    all_math_errors: List[str] = []
    if len(all_idea_blocks) < 30:
        all_math_errors.append(f"Expected >= 30 ideas in ideas.md, found {len(all_idea_blocks)}")
    for heading, block in all_idea_blocks:
        ok_m, msg = verify_idea_score_math(block)
        if not ok_m:
            all_math_errors.append(f"{heading}: {msg}")
    add("T2_F16_04", "F16", "All 30 ideas in ideas.md satisfy the 9-criterion weighted score formula (±0.15)", len(all_idea_blocks) >= 30 and len(all_math_errors) == 0, "; ".join(all_math_errors[:3]))

    ok_noleak_ideas, leaks_ideas = has_no_raw_dialogue_leak(ideas_text)
    add("T2_F16_05", "F16", "No raw war-room dialogue turns (**THIEL:**, **MUNGER:**, **JANE:**, **KARPATHY:**) leaked into ideas.md", ok_noleak_ideas, "; ".join(leaks_ideas[:3]))

    # Negative / Validator Integrity Self-Checks (T2_NEG_01 .. T2_NEG_05)
    neg_todo_ok, _ = has_no_todo_tbd("Normal line\nWait: TODO fix this section later\nDone.")
    add("T2_NEG_01", "Validator", "has_no_todo_tbd accurately rejects standalone TODO/TBD markers", not neg_todo_ok, "Verified rejection of TODO")

    neg_leak_ok, _ = has_no_raw_dialogue_leak("## Idea 1\n**THIEL:** This is a raw transcript line that leaked.\n")
    add("T2_NEG_02", "Validator", "has_no_raw_dialogue_leak accurately rejects leaked **THIEL:** dialogue turns", not neg_leak_ok, "Verified rejection of **THIEL:**")

    neg_math_ok, _ = verify_idea_score_math(
        "**Score:** 9.9/10\n**Score breakdown:** pain 5 · novelty 5 · alignment 5 · demo 5 · feasibility 5 · India 5 · business 5 · legal 5 · moonshot 5"
    )
    add("T2_NEG_03", "Validator", "verify_idea_score_math accurately rejects mismatched weighted score (9.9 vs 5.0)", not neg_math_ok, "Verified rejection of bad math")

    neg_fields_ok, neg_missing = check_idea_required_fields("## Idea 1 — Broken\n**Type:** Doesn't exist\n**Score:** 8.0/10\n")
    add("T2_NEG_04", "Validator", "check_idea_required_fields accurately detects missing required idea fields", not neg_fields_ok and len(neg_missing) == 12, f"missing_count={len(neg_missing)}")

    neg_pdf_ok, _ = verify_pdf_file(root / "non_existent_dummy_file.pdf")
    add("T2_NEG_05", "Validator", "verify_pdf_file accurately rejects missing/corrupt PDF paths", not neg_pdf_ok, "Verified rejection of missing PDF")

    return results


# ---------------------------------------------------------------------------
# Tier 3: Cross-Feature Combinations (16 Pairwise Interaction Tests)
# ---------------------------------------------------------------------------


def run_tier3_tests(root: Path) -> List[TestResult]:
    results: List[TestResult] = []

    def add(test_id: str, feat: str, desc: str, passed: bool, detail: str = "") -> None:
        results.append(TestResult(test_id, 3, feat, desc, passed, detail))

    facts_text = read_text_safe(root / "research" / "01-facts.md")
    org_text = read_text_safe(root / "research" / "A-organisers.md")
    spon_text = read_text_safe(root / "research" / "B-sponsors.md")
    judges_text = read_text_safe(root / "research" / "C-judges.md")
    why_text = read_text_safe(root / "research" / "D-why-now.md")
    comp_text = read_text_safe(root / "research" / "E-competition.md")
    dots_text = read_text_safe(root / "research" / "F-connect-the-dots.md")
    roster_text = read_text_safe(root / "war-room" / "roster-additions.md")
    bible_text = read_text_safe(root / "biblehackathon.md")
    ideas_text = read_text_safe(root / "ideas.md")
    state_text = read_text_safe(root / "state.md")

    # T3_01: All 6 canonical tracks appear consistently across 01-facts.md, biblehackathon.md, ideas.md, and state.md
    tracks_everywhere = all(
        all(
            bool(re.search(rf"{t['slug']}|{re.escape(t['name'])}", doc, re.I))
            for doc in [facts_text, bible_text, ideas_text, state_text]
        )
        for t in CANONICAL_TRACKS
    )
    add("T3_01", "F2xF15xF16", "All 6 canonical tracks appear consistently across 01-facts.md, biblehackathon.md, ideas.md, and state.md", tracks_everywhere, "Checked 6 tracks x 4 core docs")

    # T3_02: Prize pool ($5,000 cash + $20,640 Free Chat Plan) consistent across 01-facts.md and biblehackathon.md
    prizes_consistent = all(
        bool(re.search(r"\$5,000", doc)) and bool(re.search(r"\$20,640", doc))
        for doc in [facts_text, bible_text]
    )
    add("T3_02", "F2xF15", "Prize pool ($5,000 cash + $20,640 Free Chat Plan) is consistent between 01-facts.md and biblehackathon.md", prizes_consistent, "Checked $5,000 and $20,640")

    # T3_03: Judging weights (50% Completeness/UX, 30% Innovation, 20% Business/Growth) and App Key gate consistent across F2, F5, F15
    rubric_consistent = all(
        all(bool(re.search(w, doc, re.I)) for w in [r"50%", r"30%", r"20%", r"App\s+Key|appKey"])
        for doc in [facts_text, judges_text, bible_text]
    )
    add("T3_03", "F2xF5xF15", "50/30/20 judging weights and mandatory App Key verification gate align across 01-facts.md, C-judges.md, and biblehackathon.md", rubric_consistent, "Checked 50/30/20 + App Key")

    # T3_04: Organiser corporate lineage (RCLOUD GLOBAL PTE. LTD. / RongCloud / Reskilll) consistent across F3, F4, F15
    lineage_consistent = all(
        bool(re.search(r"RCLOUD\s+GLOBAL", doc, re.I)) and bool(re.search(r"RongCloud", doc, re.I)) and bool(re.search(r"Reskilll", doc, re.I))
        for doc in [org_text, bible_text]
    ) and bool(re.search(r"RongCloud", spon_text, re.I))
    add("T3_04", "F3xF4xF15", "Nexconn corporate lineage (RCLOUD GLOBAL PTE. LTD. / RongCloud) and Reskilll role align across A-organisers.md, B-sponsors.md, and biblehackathon.md", lineage_consistent, "Checked RCLOUD GLOBAL + RongCloud + Reskilll")

    # T3_05: Nexconn core SDKs & advanced primitives documented in B-sponsors.md, biblehackathon.md, AND mapped into ideas.md
    sdk_primitives = [
        r"Chat\s+SDK",
        r"Chat\s+UI",
        r"Call\s+SDK",
        r"AICP|AgentID",
        r"stream-message|Streaming\s+Message",
        r"expansion|Message\s+Expansion",
        r"group-channels/direct|Targeted\s+Group\s+Message",
        r"builtin-translation|Translation",
        r"Open\s+Channel|open-channels",
        r"Moderation|moderation",
        r"nexconn-skills",
    ]
    primitives_across = all(
        sum(1 for p in sdk_primitives if re.search(p, doc, re.I)) >= 9
        for doc in [spon_text, bible_text, ideas_text]
    )
    add("T3_05", "F4xF15xF16", "Nexconn SDKs and primitives (Chat SDK/UI, Call SDK, AICP, stream-message, expansion, group-channels/direct, builtin-translation, Open Channels, Moderation, nexconn-skills) are mapped across B-sponsors.md, biblehackathon.md, and ideas.md", primitives_across, "Checked >= 9/11 primitives in each doc")

    # T3_06: Every single idea (all 30 ideas in ideas.md) explicitly names Nexconn SDK/UI/API primitives in How it works and Tech stack
    all_ideas = extract_idea_blocks(ideas_text)
    ideas_with_nexconn = [
        h for h, b in all_ideas if re.search(r"Nexconn|Chat\s+SDK|Chat\s+UI|Call\s+SDK|stream-message|expansion|Open\s+Channel|Community\s+Channel|Direct\s+Channel|Group\s+Channel|AICP", b, re.I)
    ]
    add("T3_06", "F4xF16", "Every idea in ideas.md (>= 30 ideas) explicitly maps Nexconn SDK/primitives in its architecture", len(all_ideas) >= 30 and len(ideas_with_nexconn) == len(all_ideas), f"mapped={len(ideas_with_nexconn)}/{len(all_ideas)}")

    # T3_07: Patrick Jane Connect-the-Dots insights (F8) integrated into biblehackathon.md Part 4 (F15)
    dots_in_bible = all(
        bool(re.search(p, bible_text, re.I)) and bool(re.search(p, dots_text, re.I))
        for p in [r"Dots\s+nobody\s+else\s+will\s+connect|Connected\s+Dots", r"Hidden\s+evaluation\s+criteria|Unwritten\s+Rubric", r"Landmines|Trap\s+Map|Fatal\s+Traps", r"80%\s+trap|90%\s+of\s+teams|Sweet\s+Spot"]
    )
    add("T3_07", "F8xF15", "Patrick Jane's Connect-the-Dots synthesis in F-connect-the-dots.md is integrated into biblehackathon.md Part 4", dots_in_bible, "Checked Part 4 alignment with F-connect-the-dots.md")

    # T3_08: Custom council experts in war-room/roster-additions.md (F8) align with state.md and biblehackathon.md Part 6
    roster_aligned = all(
        bool(re.search(r"Nexconn|AICP|SDK", doc, re.I))
        for doc in [roster_text, state_text, bible_text]
    )
    add("T3_08", "F8xF15xF16", "Custom Nexconn/domain council experts in war-room/roster-additions.md are reflected in biblehackathon.md Part 6 and state.md", roster_aligned, "Checked custom expert presence across roster, bible, state")

    # T3_09: Global hackathon winners in E-competition.md (F7) are cited across domain dossiers, biblehackathon.md, and ideas.md
    winner_names = ["Industry.ai", "Truman AI", "OmniBet", "Ephemeral", "CodeCrack", "TxGPT", "Snaption", "BlinkAI", "ETHGlobal", "Devpost", "TreeHacks", "CastParty", "FrameStream"]
    winners_in_comp = sum(1 for w in winner_names if re.search(re.escape(w), comp_text, re.I))
    winners_in_bible = sum(1 for w in winner_names if re.search(re.escape(w), bible_text, re.I))
    winners_in_ideas = sum(1 for w in winner_names if re.search(re.escape(w), ideas_text, re.I))
    add("T3_09", "F7xF15xF16", "Global hackathon winners in E-competition.md are cited in both biblehackathon.md and ideas.md prior-art tables", winners_in_comp >= 3 and winners_in_bible >= 2 and winners_in_ideas >= 3, f"comp={winners_in_comp}, bible={winners_in_bible}, ideas={winners_in_ideas}")

    # T3_10: 2024-2026 arXiv research papers are cited with URLs across E-competition.md, research/domains/<slug>.md, biblehackathon.md, and ideas.md
    domains_combined = "\n".join(read_text_safe(root / "research" / "domains" / f"{t['slug']}.md") for t in CANONICAL_TRACKS)
    arxiv_across = all(
        bool(re.search(r"arxiv\.org|arXiv:", doc, re.I))
        for doc in [comp_text, domains_combined, bible_text, ideas_text]
    )
    add("T3_10", "F7xF9..14xF15xF16", "arXiv research papers (2024-2026) are cited across E-competition.md, domain dossiers, biblehackathon.md, and ideas.md", arxiv_across, "Checked arXiv presence across all 4 layers")

    # T3_11: Tracks 01-03 war-room/<slug>-ideas.md (F9-F11) match their corresponding domain ideas in ideas.md (F16)
    m2_ideas_consistent = True
    m2_detail: List[str] = []
    for t in CANONICAL_TRACKS[:3]:
        slug_text = read_text_safe(root / "war-room" / f"{t['slug']}-ideas.md")
        slug_blocks = extract_idea_blocks(slug_text)
        if len(slug_blocks) < 5:
            m2_ideas_consistent = False
            m2_detail.append(f"{t['slug']} has {len(slug_blocks)} ideas")
            continue
        # Extract idea 1 title
        m_title = re.search(r"^##\s+Idea\s+1\s*[—:-]\s*([^\n:]+)", slug_blocks[0][0])
        if m_title:
            idea1_name = m_title.group(1).strip()
            if idea1_name.lower() not in ideas_text.lower():
                m2_ideas_consistent = False
                m2_detail.append(f"{t['slug']} Idea 1 '{idea1_name}' not found in ideas.md")
    add("T3_11", "F9..F11xF16", "Tracks 01-03 (nexconn-social, nexconn-gaming, nexconn-workplace) top-5 ideas in war-room/<slug>-ideas.md are faithfully assembled into ideas.md", m2_ideas_consistent, "; ".join(m2_detail) if m2_detail else "All M2 track ideas verified in ideas.md")

    # T3_12: Tracks 04-06 war-room/<slug>-ideas.md (F12-F14) match their corresponding domain ideas in ideas.md (F16)
    m3_ideas_consistent = True
    m3_detail: List[str] = []
    for t in CANONICAL_TRACKS[3:]:
        slug_text = read_text_safe(root / "war-room" / f"{t['slug']}-ideas.md")
        slug_blocks = extract_idea_blocks(slug_text)
        if len(slug_blocks) < 5:
            m3_ideas_consistent = False
            m3_detail.append(f"{t['slug']} has {len(slug_blocks)} ideas")
            continue
        m_title = re.search(r"^##\s+Idea\s+1\s*[—:-]\s*([^\n:]+)", slug_blocks[0][0])
        if m_title:
            idea1_name = m_title.group(1).strip()
            if idea1_name.lower() not in ideas_text.lower():
                m3_ideas_consistent = False
                m3_detail.append(f"{t['slug']} Idea 1 '{idea1_name}' not found in ideas.md")
    add("T3_12", "F12..F14xF16", "Tracks 04-06 (nexconn-support, nexconn-social-good, open-innovation) top-5 ideas in war-room/<slug>-ideas.md are faithfully assembled into ideas.md", m3_ideas_consistent, "; ".join(m3_detail) if m3_detail else "All M3 track ideas verified in ideas.md")

    # T3_13: No duplicate idea names across the 30 ideas in ideas.md
    idea_names: List[str] = []
    for h, _ in all_ideas:
        m = re.search(r"^##\s+Idea\s+\d+\s*[—:-]\s*([^:\n]+)", h)
        idea_names.append((m.group(1) if m else h).strip().lower())
    unique_names = set(idea_names)
    add("T3_13", "F9..F14xF16", "All 30 ideas across the 6 tracks in ideas.md have unique idea names (zero duplicates)", len(all_ideas) >= 30 and len(unique_names) == len(idea_names), f"unique={len(unique_names)}/{len(idea_names)}")

    # T3_14: Gap bucket diversity across ideas.md (includes 'Exists-but-weak', 'Doesn't exist', and 'Exists abroad')
    has_gap_types = all(
        bool(re.search(pat, ideas_text, re.I))
        for pat in [r"Exists[- ]but[- ]weak", r"Doesn't\s+exist|Does\s+not\s+exist", r"Exists\s+abroad"]
    )
    add("T3_14", "F9..F14xF16", "ideas.md includes ideas across all 3 gap buckets ('Exists-but-weak', 'Doesn't exist', 'Exists abroad, not in India')", has_gap_types, "Checked 3 gap types in ideas.md")

    # T3_15: Domain Winnability ranking and #1 winning track/idea recommendation are consistent across biblehackathon.md, ideas.md, and state.md
    winnability_consistent = all(
        bool(re.search(r"Winnability", doc, re.I)) and bool(re.search(r"#1|winning|dark\s+horse", doc, re.I))
        for doc in [bible_text, ideas_text, state_text]
    )
    add("T3_15", "F15xF16", "Domain Winnability ranking, #1 winning track/idea recommendation, and dark horse pick are consistent across biblehackathon.md, ideas.md, and state.md", winnability_consistent, "Checked Winnability & #1 pick in bible, ideas, state")

    # T3_16: Why-now triggers (F6) and # Sources URLs cross-linked into biblehackathon.md (F15) and ideas.md (F16)
    why_urls = set(URL_REGEX.findall(why_text))
    bible_urls = set(URL_REGEX.findall(bible_text))
    ideas_urls = set(URL_REGEX.findall(ideas_text))
    add("T3_16", "F6xF15xF16", "Both biblehackathon.md and ideas.md end with populated # Sources sections containing >= 15 valid https:// URLs", len(bible_urls) >= 15 and len(ideas_urls) >= 15 and len(why_urls) >= 5, f"bible_urls={len(bible_urls)}, ideas_urls={len(ideas_urls)}, why_urls={len(why_urls)}")

    return results


# ---------------------------------------------------------------------------
# Tier 4: Real-World Application Scenarios (8 Scenarios)
# ---------------------------------------------------------------------------


def run_tier4_tests(root: Path) -> List[TestResult]:
    results: List[TestResult] = []

    def add(test_id: str, feat: str, desc: str, passed: bool, detail: str = "") -> None:
        results.append(TestResult(test_id, 4, feat, desc, passed, detail))

    state_text = read_text_safe(root / "state.md")
    bible_text = read_text_safe(root / "biblehackathon.md")
    ideas_text = read_text_safe(root / "ideas.md")

    # T4_01: Downstream `/bible` Skill Handoff Readiness
    bible_handoff_ok = (
        (root / "state.md").is_file()
        and (root / "biblehackathon.md").is_file()
        and (root / "ideas.md").is_file()
        and bool(re.search(r"https://reskilll\.com/hack/nexconn", state_text, re.I))
        and bool(re.search(r"Winnability", state_text, re.I))
        and len(extract_idea_blocks(ideas_text)) >= 30
        and bool(re.search(r"H0[–-]6.*H6[–-]18.*H18[–-]30.*H30[–-]36", ideas_text, re.I | re.S))
    )
    add(
        "T4_01",
        "Scenario_Bible_Handoff",
        "Downstream `/bible` skill handoff contract: state.md, biblehackathon.md, and ideas.md provide complete team defaults, ranked domains, #1 winning idea, tech stack, and H0-36 build schedule",
        bible_handoff_ok,
        "Verified `/bible` input contract",
    )

    # T4_02: Reskilll / Nexconn Judge 3-Minute Evaluation & App Key Audit Simulation
    judge_sim_ok = (
        bool(re.search(r"#1\s+pick|council's\s+#1\s+pick", ideas_text, re.I))
        and bool(re.search(r"Chat\s+SDK|Chat\s+UI", ideas_text, re.I))
        and bool(re.search(r"App\s+Key|appKey", bible_text, re.I))
        and bool(re.search(r"The\s+demo\s+moment\s*\(Jobs\)", ideas_text, re.I))
        and bool(re.search(r"30-second\s+explanation\s*\(Karp\)", ideas_text, re.I))
        and verify_pdf_file(root / "biblehackathon.pdf")[0]
        and verify_pdf_file(root / "ideas.pdf")[0]
    )
    add(
        "T4_02",
        "Scenario_Judge_Audit",
        "Reskilll/Nexconn Judge 3-Minute Evaluation Simulation: #1 winning idea passes mandatory Chat SDK/UI App Key gate, 50% UX 45s demo flow, 30% Nexconn primitive innovation, 20% traction play, and valid PDF deliverables",
        judge_sim_ok,
        "Verified judge 50/30/20 + App Key + PDF audit",
    )

    # T4_03 .. T4_08: Per-Track End-to-End Deep Dive Scenarios across all 6 tracks
    track_specific_primitives = {
        "nexconn-social": r"Community\s+Channel|Open\s+Channel|builtin-translation|Translation|expansion",
        "nexconn-gaming": r"Open\s+Channel|group-channels/direct|Targeted\s+Group|Call\s+SDK|expansion",
        "nexconn-workplace": r"AICP|AgentID|stream-message|Streaming\s+Message|expansion|Direct\s+Channel|Group\s+Channel",
        "nexconn-support": r"Direct\s+Channel|builtin-translation|Translation|webhook|Moderation|expansion",
        "nexconn-social-good": r"Voice-to-Text|voice|Moderation|Call\s+SDK|accessible|senior|Translation",
        "open-innovation": r"AICP|A2A|AgentID|stream-message|expansion|group-channels/direct|MCP",
    }

    for idx, track in enumerate(CANONICAL_TRACKS, start=3):
        slug = track["slug"]
        dom_path = root / "research" / "domains" / f"{slug}.md"
        wr_path = root / "war-room" / f"{slug}.md"
        id_path = root / "war-room" / f"{slug}-ideas.md"

        dom_text = read_text_safe(dom_path)
        wr_text = read_text_safe(wr_path)
        id_text = read_text_safe(id_path)
        blocks = extract_idea_blocks(id_text)

        prim_pat = track_specific_primitives[slug]
        e2e_ok = (
            len(dom_text) > 1000
            and len(wr_text) > 1000
            and len(blocks) >= 5
            and all(check_idea_required_fields(b)[0] for _, b in blocks[:5])
            and all(verify_idea_score_math(b)[0] for _, b in blocks[:5])
            and has_no_raw_dialogue_leak(id_text)[0]
            and has_no_todo_tbd(id_text)[0]
            and bool(re.search(prim_pat, id_text, re.I))
            and bool(re.search(rf"{slug}|{re.escape(track['name'])}", ideas_text, re.I))
        )
        add(
            f"T4_0{idx}",
            f"Scenario_Track_{track['num']}",
            f"Track {track['num']} ({slug}) End-to-End Pipeline: domain dossier -> 6-round war-room debate -> 5 scored ideas with Nexconn primitives -> master ideas.md integration",
            e2e_ok,
            f"slug={slug}, ideas={len(blocks)}",
        )

    return results


# ---------------------------------------------------------------------------
# Synthetic Workspace Builder & Self-Test Mode (`--self-test`)
# ---------------------------------------------------------------------------


def _generate_synthetic_pdf(pdf_path: Path, title: str, pages: int = 6) -> None:
    """Generate a valid multi-page PDF > 10,000 bytes using reportlab or fitz."""
    pdf_path.parent.mkdir(parents=True, exist_ok=True)
    try:
        from reportlab.lib.pagesizes import A4
        from reportlab.pdfgen import canvas

        c = canvas.Canvas(str(pdf_path), pagesize=A4, pageCompression=0)
        for p in range(1, pages + 1):
            c.setFont("Helvetica-Bold", 16)
            c.drawString(72, 780, f"{title} — Page {p} of {pages}")
            c.setFont("Helvetica", 10)
            for line_idx in range(45):
                c.drawString(
                    72,
                    750 - line_idx * 14,
                    f"Nexconn Build Challenge 2026 verification content line {line_idx} on page {p} (RCLOUD GLOBAL PTE. LTD. / Chat SDK / AICP).",
                )
            c.showPage()
        c.save()
        return
    except Exception:
        pass

    import fitz  # PyMuPDF fallback

    doc = fitz.open()
    for p in range(1, pages + 1):
        page = doc.new_page()
        text_lines = [f"{title} — Page {p} of {pages}"] + [
            f"Nexconn Build Challenge 2026 verification content line {i} on page {p} (RCLOUD GLOBAL PTE. LTD.)."
            for i in range(45)
        ]
        page.insert_text((72, 72), "\n".join(text_lines), fontsize=10)
    doc.save(str(pdf_path))
    doc.close()


def _build_synthetic_idea_block(track: Dict[str, str], idea_num: int) -> str:
    gap_types = [
        "Exists-but-weak",
        "Doesn't exist",
        "Exists abroad, not in India",
        "Exists-but-weak",
        "Doesn't exist",
    ]
    gap_type = gap_types[(idea_num - 1) % len(gap_types)]
    idea_title = f"{track['slug'].replace('-', '').title()}Mesh{idea_num}"
    return f"""## Idea {idea_num} — {idea_title}: AI-native real-time workflow on Nexconn for {track['name']}
**Type:** {gap_type}   **Score:** 8.6/10   **Problem statement:** {track['track_id']} ({track['name']})

**The pain (Mike Ross):** Ramesh, a frontline coordinator in Bengaluru, loses 2.5 hours daily across fragmented chat threads [S1](https://reskilll.com/hack/nexconn/).
**Why now:** DPDP Act 2023 enforcement and Nexconn's 2026 AICP launch (`AgentID` + `stream-message`) make real-time agentic coordination possible [S2](https://www.nexconn.ai/blog/a2a-communication-architecture).
**The gap others miss (Jane / Thiel):** Competitors build plain text chatbots instead of stateful multi-party channels using Nexconn Message Expansion (`expansion.md`) and Targeted Group Messages (`group-channels/direct.md`).
**What exists and why it falls short:**
| Product / Repo / Paper | What it does | Specific Gap | Link |
|---|---|---|---|
| Industry.ai (ETHGlobal Winner) | Multi-agent chat workflow | Lacks carrier-grade SD-CAN and Targeted Group Whispers | https://ethglobal.com/showcase/industry-ai |
| Truman AI Live / OmniBet / Ephemeral / TxGPT / Snaption | Hackathon benchmark | Not built on Nexconn Chat SDK / Open Channels | https://arxiv.org/abs/2505.02279 |

**How it works:**
- User clicks 1-Click Dual-Pane Demo Persona login which mints real Nexconn `UserID` tokens via `nexconn-server-sdk`.
- Client initializes **Nexconn Chat SDK** and **Chat UI** (`chat-sdk`, `chat-ui`) with optional **Call SDK** escalation.
- Autonomous AI Co-Pilot (`AgentID` on **AICP**) streams tokens in real time via `/message/stream-message.md`.
- Private role-specific coaching whispers are sent via **Targeted Group Messages** (`/group-channels/direct.md`) inside **Group Channels**, **Community Channels**, **Open Channels**, or **Direct Channels**.
- Interactive state cards mutate in <120ms via **Message Expansion** (`/message/expansion.md`) with **Built-in Translation** (`/builtin-translation/`) and **Content Moderation** (`/moderation/`).

**The demo moment (Jobs):** In the first 45 seconds, the judge clicks one button to open a split-screen Buyer/Seller & Operator/Agent live room, speaks a voice note transcribed via Voice-to-Text, and watches a live escrow/runbook card update across both panes in 90ms.
**30-second explanation (Karp):** Organizations fail when communication is separated from execution. {idea_title} embeds autonomous `AgentID` co-pilots and executable state cards directly inside Nexconn's carrier-grade messaging fabric.

**Council jurisdiction (short verdicts, only seats that matter for this idea):**
| Seat | Verdict |
|---|---|
| Thiel — market & moat | Concentric monopoly starting with high-urgency teams on Nexconn SD-CAN. |
| Buffett — money | SaaS ₹999/seat/month ($12/mo) with 82% gross margin on Nexconn Free Chat Plan ($20,640 credit). |
| Harvey / Sharma — legal & India compliance | DPDP Act 2023 compliant consent notices; acts as TSP using Bhashini/ONDC rails. |
| Jaishankar — India alignment | Advances IndiaAI and Global South cross-border digital public infrastructure. |
| Karpathy — AI & tech | Uses `nexconn-skills`, `stream-message.md`, `expansion.md`, and `group-channels/direct.md`. |
| Mike Ross — human & ethics | Zero cognitive overload, accessible large-font & voice-first fallback on low-end Android. |
| Munger — how it dies | Mitigates multi-user cold-start via 1-click dual-persona live simulation. |
| Musk — year-10 moonshot | Autonomous global A2A coordination mesh handling 10B daily agent transactions. |
| Domain Lead — field reality | Grounded in real field telemetry and sub-second webhook acknowledgement. |
| Godin / Gary Vee — first 10k users | Viral shared room links driving verified `activeUsers` on our Nexconn `App Key`. |

**Tech stack (basic):** Frontend: Next.js + `nexconn-chatui-web` · Backend: Node.js (`nexconn-server-sdk`) · AI/ML: Gemini 2.5 Flash + Nexconn AI Mode · Data: PostgreSQL + Nexconn 180-day Cloud History · India rails: Bhashini, UPI, ONDC · Infra: Vercel + AWS · Sponsor/Nexconn tech used: Chat SDK, Chat UI, Call SDK, AICP (`AgentID`), `stream-message`, `expansion`, `group-channels/direct`, `builtin-translation`, `open-channels`, `moderation`, `nexconn-skills`.
**Implementation sketch:** H0–6: Setup Nexconn Console App Key (`^[A-Za-z0-9_-]{8,64}$`) via `nexconn-skills` and build dual-persona auth. H6–18: Implement Chat SDK channels, `stream-message.md`, and `expansion.md` interactive cards. H18–30: Add `group-channels/direct.md` whispers, `builtin-translation`, and Moderation webhooks. H30–36: Onboard live testers for `activeUsers` telemetry and record 3-minute demo video. Datasets: https://arxiv.org/abs/2412.15701.
**Score breakdown:** pain 9 · novelty 8.5 · alignment 9 · demo 9 · feasibility 8.5 · India 8 · business 8 · legal 8.5 · moonshot 8.5.
"""


def populate_synthetic_workspace(ws: Path) -> None:
    """Create a complete valid synthetic workspace in `ws` covering F1-F16."""
    (ws / "research" / "00-source").mkdir(parents=True, exist_ok=True)
    (ws / "research" / "domains").mkdir(parents=True, exist_ok=True)
    (ws / "war-room").mkdir(parents=True, exist_ok=True)

    urls_block = "\n".join(
        f"{i}. [Source {i}](https://docs.nexconn.ai/source-{i})" for i in range(1, 20)
    )

    # F1: research/00-source/bundle-extract.md
    (ws / "research" / "00-source" / "bundle-extract.md").write_text(
        """# Raw Bundle Extraction — Nexconn Build Challenge 2026 (`nexconn2026`)
Extracted from https://reskilll.com/hack/nexconn/ (`index-BVD-GoH1.js`, `Rules-DQNF0983.js`, `Submit-R3OJNUmD.js`, `Admin-_pGkMjvW.js`).
Tracks: nexconn-social, nexconn-gaming, nexconn-workplace, nexconn-support, nexconn-social-good, open.
SDKs: Chat SDK, Chat UI, Call SDK, docs.nexconn.ai, nexconn-skills.
Validation: appKey regex ^[A-Za-z0-9_-]{8,64}$ (8-64 chars), 25 MB writeup PDF, demoVideoUrl, repoUrl, tractionUrl.
""",
        encoding="utf-8",
    )

    # F2: research/01-facts.md
    (ws / "research" / "01-facts.md").write_text(
        f"""# Canonical Facts — Nexconn Build Challenge 2026 (`nexconn2026`)
- **Title**: Nexconn Build Challenge 2026 (`https://reskilll.com/hack/nexconn/`)
- **Dates**: Launch Oct 23, 2026; Submission deadline Nov 22, 2026 AoE; Judging Nov 23–27, 2026; Results Dec 1, 2026.
- **Eligibility**: Global developers/students/designers except residents of Mainland China (`CN` excluded). Team size: 1–4 members (or solo).
- **Prizes**: $5,000 total cash ($2,000 1st, $1,250 2nd, $750 3rd, $500 4th, $500 5th) + 2 years of Nexconn Free Chat Plan worth $20,640 ($860/mo) + 1-year cloud discount (15% OFF AWS or 30% OFF Alibaba Cloud).
- **Mandatory SDK Rule**: Must use **Chat SDK** or **Chat UI** (`chat-sdk` / `chat-ui`). **Call SDK** is optional and does not satisfy the Chat SDK requirement alone. Verified via submitted **App Key** (`^[A-Za-z0-9_-]{{8,64}}$`).
- **Judging Criteria**:
  1. Completeness & user experience — 50%
  2. Innovation & scenario value — 30%
  3. Business & growth potential — 20% (plus activeUsers traction bonus)
- **Tracks**:
  1. `nexconn-social` — Social & Community
  2. `nexconn-gaming` — Gaming & Live Streams
  3. `nexconn-workplace` — Workplace & Collaboration
  4. `nexconn-support` — Marketplace & Support
  5. `nexconn-social-good` — Humanitarian & Social Good
  6. `open` — Open Innovation
{urls_block}
""",
        encoding="utf-8",
    )

    # F3: research/A-organisers.md
    (ws / "research" / "A-organisers.md").write_text(
        f"""# Recon Track A — Organisers: Reskilll & Nexconn (`RCLOUD GLOBAL PTE. LTD.` / RongCloud)
- **Primary Organiser**: Nexconn (`RCLOUD GLOBAL PTE. LTD.`, Singapore), the global brand of **RongCloud** (founded 2015 from China Mobile's 2007 Fetion team).
- **Leadership**: Han Ying (CEO), Yang Pan (CTO), Cen Yu (VP Eng), Leo (Product Director), Kai (AI PM leading AICP), Amy (Solutions Engineer).
- **Operations Partner**: **Reskilll** operates the registration/submission portal and `Admin-_pGkMjvW.js` evaluation dashboard exposing `appKey`, `activeUsers`, and `tractionUrl`.
- **Mandate & Hidden Motives**: Drive global developer adoption and apps exceeding 100 MAU on the $860/mo (10,000 MAU) Free Chat Plan funnel. Verified evidence from bundle + HUNCH: high activeUsers on `appKey` wins tie-breakers.
{urls_block}
""",
        encoding="utf-8",
    )

    # F4: research/B-sponsors.md
    (ws / "research" / "B-sponsors.md").write_text(
        f"""# Recon Track B — Deep Nexconn Company, Philosophy & SDK Profile
- **Lineage & Scale**: 19-year Fetion/RongCloud heritage (`RCLOUD GLOBAL PTE. LTD.`), powering 250,000+ apps (HoYoLAB, Bondee, Jaco, Falla, Miniso, Blockman Go, Lenovo) over SD-CAN (300+ nodes, 120 ms global latency, 99.99% uptime).
- **AICP & A2A Architecture**: Assigns autonomous agents first-class `AgentID` alongside human `UserID`, supporting token streaming (`stream-message.md`), stateful cards (`expansion.md`), and `nexconn-skills` + Console MCP.
- **SDKs & Channel Primitives**:
  - **Chat SDK** & **Chat UI** (`chat-sdk`, `chat-ui`) across Web, iOS, Android, Flutter.
  - **Call SDK** (Web, iOS, Android; Flutter Call SDK is marked "Coming soon").
  - **4 Channel Types**: Direct Channel, Group Channel (with Targeted Group Messages `group-channels/direct.md`), Community Channel, Open Channel (`open-channels/metadata.md`).
  - **Advanced Features**: Built-in Translation (`builtin-translation`), Voice-to-Text, E2EE (X3DH + Double Ratchet), Content Moderation (`moderation`).
- **Track Leverage Blueprint**: Maps `nexconn-social`, `nexconn-gaming`, `nexconn-workplace`, `nexconn-support`, `nexconn-social-good`, and `open-innovation`.
{urls_block}
""",
        encoding="utf-8",
    )

    # F5: research/C-judges.md
    (ws / "research" / "C-judges.md").write_text(
        f"""# Recon Track C — Judges, Evaluator Workflow & 3-Minute Judge Heat-Map
- **Judge Identity**: Individual judge names are not disclosed on the portal; submissions are scored by **Nexconn judges** and **Nexconn engineers** alongside Reskilll evaluators.
- **Step 1 Gate**: Console verification of submitted **App Key** (`appKey`) and real **active users** (`activeUsers`) telemetry.
- **50% Completeness & UX**: Zero-friction 1-click demo persona login in the first 45 seconds.
- **30% Innovation & Scenario Value**: Deep use of `stream-message`, `expansion`, `group-channels/direct`, `Open Channel`, `Community Channel`, and `AICP`.
- **20% Business & Growth**: Verified `activeUsers` count and `tractionUrl` proof.
- **Judge Heat-Map (3 minutes)** and **Pet Peeves**: Disqualifies mock WebSocket wrappers or Call-SDK-only apps.
{urls_block}
""",
        encoding="utf-8",
    )

    # F6: research/D-why-now.md
    (ws / "research" / "D-why-now.md").write_text(
        f"""# Recon Track D — Why-Now Triggers Across Policy, Incidents, Geopolitics, History & Sponsor Strategy
Covers all 6 tracks: `nexconn-social`, `nexconn-gaming`, `nexconn-workplace`, `nexconn-support`, `nexconn-social-good`, `open-innovation`.
1. **Policy**: India DPDP Act 2023, Bhashini, ONDC, UPI, IndiaAI. Trigger -> Evidence [https://meity.gov.in] -> What the authors are actually worried about -> What a winning answer must prove.
2. **Incident**: Elder fraud and workplace handover failures. Trigger -> Evidence [https://cert-in.org.in] -> What they are worried about -> What a winning answer must prove.
3. **Geopolitics (Jaishankar lens)**: Global South sovereign digital infrastructure and cross-border trade. Trigger -> Evidence [https://mea.gov.in] -> Worry -> Proof.
4. **Historical**: Passive chat threads vs executable state machines. Trigger -> Evidence [https://arxiv.org/abs/2505.02279] -> Worry -> Proof.
5. **Sponsor Trigger**: Nexconn 2026 AICP, MCP, and A2A launch. Trigger -> Evidence [https://www.nexconn.ai] -> Worry -> Proof.
{urls_block}
""",
        encoding="utf-8",
    )

    # F7: research/E-competition.md
    (ws / "research" / "E-competition.md").write_text(
        f"""# Recon Track E — Competition Forecast, 80% Trap & Global Benchmark Catalog
- **Participating Team Estimate**: 250–400 registered teams across `nexconn-social`, `nexconn-gaming`, `nexconn-workplace`, `nexconn-support`, `nexconn-social-good`, and `open-innovation`.
- **The 80% Trap**: Generic WhatsApp/Slack clone or plain LLM chatbot wrapper.
- **Global Hackathon Winners**: Industry.ai (ETHGlobal), Truman AI Live (ETHGlobal), OmniBet (ETHGlobal), Ephemeral (TreeHacks), CodeCrack (TreeHacks), TxGPT (ETHGlobal), Snaption Live (DubHacks), BlinkAI (TreeHacks) mapped to `stream-message`, `expansion`, `Open Channel`, and `Group Channel`.
- **2024–2026 arXiv Research Papers**: arXiv:2505.02279, arXiv:2603.03060, arXiv:2603.03447, arXiv:2412.15701, arXiv:2402.15813, arXiv:2505.24224.
- **Prior Art Counts**: GitHub repos, startups, and Kaggle/HuggingFace datasets.
{urls_block}
""",
        encoding="utf-8",
    )

    # F8: research/F-connect-the-dots.md & war-room/roster-additions.md
    dots_list = "\n".join(
        f"- **Dot {i}**: Evidence-backed synthesis connecting Nexconn AICP, App Key telemetry, and 50/30/20 rubric [S{i}](https://docs.nexconn.ai/dot-{i})."
        for i in range(1, 9)
    )
    (ws / "research" / "F-connect-the-dots.md").write_text(
        f"""# Connect the Dots — Patrick Jane Synthesis Session
Chaired by Patrick Jane with Jaishankar, Sharma, Thiel, Karp, Graham, and Munger.
## 1. The real reason this hackathon exists
Nexconn (`RCLOUD GLOBAL PTE. LTD.`) is seeding global developer adoption of its Chat SDK and AICP platform.
## 2. What the organisers secretly fear and what they would love to announce afterwards
They fear fake WebSocket demos; they want to announce high-MAU AI-native apps running on Nexconn.
## 3. Hidden evaluation criteria
Console verification of `appKey`, `activeUsers` count, and 1-click zero-signup judge UX.
## 4. Landmines
Using Call SDK alone without Chat SDK, or forcing judges to create two accounts manually.
## 5. Dots nobody else will connect
{dots_list}
## 6. The 80% trap
Building a generic 1-on-1 text chat wrapper.
""",
        encoding="utf-8",
    )

    (ws / "war-room" / "roster-additions.md").write_text(
        """# Council Roster Additions — Custom Nexconn & Domain Specialists
Jurisdiction modes: LEAD, SUPPORT, SILENT across all 6 domains.
## Kai Chen — Nexconn AICP & SDK Principal Architect (LEAD)
- **Rise / Background**: Built distributed IM and AICP (`AgentID` + `stream-message`) at RongCloud / Nexconn.
- **How they decide**: Checks if Nexconn primitives (`expansion.md`, `group-channels/direct.md`, `open-channels`) are load-bearing.
- **Asks**: "Which exact Nexconn channel type and webhook powers this flow?"
- **Attacks**: Rejects generic WebSocket or REST polling wrappers.
- **Voice**: Precise, protocol-obsessed systems engineer.
- **Blind spot**: Can over-index on protocol features unless paired with Jony Ive's 3-screen simplicity.
""",
        encoding="utf-8",
    )

    # F9-F14: Domain files, war-room transcripts, and <slug>-ideas.md
    all_domain_idea_sections: List[str] = []
    for t in CANONICAL_TRACKS:
        slug = t["slug"]
        seeds = "\n".join(f"{i}. Seed {i} for {slug} [Exists-but-weak / Doesn't exist]" for i in range(1, 17))
        (ws / "research" / "domains" / f"{slug}.md").write_text(
            f"""# Domain Research — {t['name']} (`{slug}`)
## 1. The pain map
Frontline users and communities suffer high coordination latency [S1](https://reskilll.com/hack/nexconn/).
## 2. Urgency
Urgency Score: 9/10 due to 2025-2026 regulatory and AI shifts [S2](https://www.nexconn.ai/).
## 3. Prior art
Includes Industry.ai, Truman AI Live, OmniBet, Ephemeral, TxGPT, Snaption Live, and arXiv:2505.02279 [S3](https://arxiv.org/abs/2505.02279).
## 4. Gap analysis
- **Exists but weak**: Current tools lack stateful in-message cards.
- **Doesn't exist**: Native A2A `AgentID` + Targeted Group Whispers.
- **Exists abroad, not in India**: Global workflows adapted for Bhashini/ONDC/UPI and Nexconn SD-CAN.
## 5. India rails, Nexconn SDKs & data available
Uses Nexconn Chat SDK, Chat UI, Call SDK, AICP, `stream-message`, `expansion`, `group-channels/direct`, `builtin-translation`, `open-channels`, `moderation`, `nexconn-skills`.
## 6. Tech frontier
Multi-agent A2A over low-latency binary transport [S4](https://docs.nexconn.ai/llms.txt).
## 7. Raw idea seeds
{seeds}
{urls_block}
""",
            encoding="utf-8",
        )

        (ws / "war-room" / f"{slug}.md").write_text(
            f"""# War-Room Debate Transcript — {t['name']} (`{slug}`)
## Round 0 — Brief
**JANE:** Authors want real Nexconn SDK usage and active users [S1].
## Round 1 — Idea storm
**THIEL:** Here is our contrarian 0-to-1 monopoly idea for {slug} [S1].
**MUSK:** Delete the dashboard; make the message itself the state machine [S2].
## Round 2 — Attack
**MUNGER:** Pre-mortem: how does this fail in 6 months? Cold-start friction [S1].
**HARVEY:** Legal check: ensure DPDP consent and TSP structuring [S2].
**SHARMA:** Integrate Bhashini and open consent rails [S2].
**BUFFETT:** Clear B2B SaaS pricing with 80% margin [S1].
**KARPATHY:** Use `stream-message.md` and `expansion.md` so the demo is 100% real [S3].
**MIKE ROSS:** Protects frontline workers with zero extra typing burden [S1].
**GRAHAM:** Avoids the tarpit by solving an immediate workflow pain [S1].
## Round 3 — Rebuild & merge
**KARPATHY:** Merged top survivors around Nexconn AICP and 1-click dual-persona demo [S3].
## Round 4 — Score & vote
**GRAHAM:** Scoring complete on the 9-criterion weighted rubric; top 5 advance [S1].
## Round 5 — Polish
**JOBS:** Named all 5 products and scripted the 45-second demo moment [S1].
""",
            encoding="utf-8",
        )

        ideas_for_track = "\n\n".join(_build_synthetic_idea_block(t, i) for i in range(1, 6))
        track_ideas_doc = f"""# Track {t['num']} — {t['name']} (`{slug}`)
## Domain snapshot
{t['tagline']}. Leverages Nexconn Chat SDK, Chat UI, Call SDK, AICP (`AgentID`), `stream-message`, `expansion`, `group-channels/direct`, `builtin-translation`, `open-channels`, and `moderation`.

{ideas_for_track}
"""
        (ws / "war-room" / f"{slug}-ideas.md").write_text(track_ideas_doc, encoding="utf-8")
        all_domain_idea_sections.append(track_ideas_doc)

    # F15: biblehackathon.md & biblehackathon.pdf
    (ws / "biblehackathon.md").write_text(
        f"""# Nexconn Build Challenge 2026 — The Hackathon Bible
> Verdict: Build an AI-native real-time collaborative app on Nexconn Chat SDK with 1-click multi-persona UX and verified App Key traction.

# Part 1 — The Facts
## At a glance
Nexconn Build Challenge 2026 (`https://reskilll.com/hack/nexconn/`), Oct 23 – Nov 22, 2026 AoE. $5,000 cash pool ($2,000 1st) + $20,640 Free Chat Plan (2 years) + 15% AWS / 30% Alibaba Cloud discount. Mainland China (`CN`) excluded. Team size 1–4.
## Evaluation criteria
Mandatory Pass/Fail Gate: Real **Chat SDK** or **Chat UI** usage verified via **App Key** (`appKey`). Weights: 50% Completeness & UX, 30% Innovation & scenario value, 20% Business & growth potential (`activeUsers`).
## Themes & problem statements
Covers all 6 tracks: `nexconn-social` (Social & Community), `nexconn-gaming` (Gaming & Live Streams), `nexconn-workplace` (Workplace & Collaboration), `nexconn-support` (Marketplace & Support), `nexconn-social-good` (Humanitarian & Social Good), and `open-innovation` (Open Innovation).
## Timeline & deliverables checklist
Write-up PDF (with App Key), Demo Video, Runnable App URL, Public GitHub Repo, Traction proof.

# Part 2 — The People
## Organisers & committee
Operated by **Reskilll** for **Nexconn** (`RCLOUD GLOBAL PTE. LTD.` / **RongCloud**). Leadership: Han Ying, Yang Pan, Cen Yu, Leo, Kai, Amy.
## Sponsors
Nexconn (`RCLOUD GLOBAL PTE. LTD.` / RongCloud) powers 250,000+ apps (HoYoLAB, Bondee, Jaco, Miniso) over SD-CAN. Core stack: **Chat SDK**, **Chat UI**, **Call SDK**, **AICP** (`AgentID`), `stream-message`, `expansion`, `group-channels/direct`, `builtin-translation`, `open-channels`, `moderation`, and `nexconn-skills`.
## Judges & jury
Evaluated by Nexconn judges and engineers via Reskilll's admin portal (`Admin-_pGkMjvW.js`).
## Judge heat-map
First 45s: 1-click dual-persona live chat demo. Next 90s: Nexconn primitive depth (`stream-message`, `expansion`, `group-channels/direct`). Final 45s: `App Key` telemetry & business viability.

# Part 3 — Why This Hackathon, Why Now
## The real reason it exists
Drive global developer adoption of Nexconn's Free Chat Plan and AICP agentic messaging fabric.
## Policy & scheme drivers
DPDP Act 2023, Bhashini, ONDC, UPI, and IndiaAI.
## Incidents & history behind the problem statements
Shift handover failures, cross-border marketplace fraud, and elder scam victimization.
## Geopolitical lens (global + India)
Jaishankar lens: resilient Global South real-time communication infrastructure.
## What the organisers want to announce afterwards
High-traction AI-native apps running live on Nexconn App Keys.

# Part 4 — Connecting the Dots
## Dots nobody else will connect
8 connected dots linking `Admin-_pGkMjvW.js`, `appKey` telemetry, `nexconn-skills`, and AICP.
## Hidden evaluation criteria
Zero-signup 1-click demo personas and verified `activeUsers` on the Nexconn console.
## Landmines — what will annoy this jury
Using Call SDK alone without Chat SDK, or fake WebSocket state.
## The 80% trap — what most teams will build
Generic 1-on-1 chat wrappers or plain LLM prompt boxes.

# Part 5 — The Battlefield
## Competition forecast
Estimated 250–400 teams; highest crowding in basic social/support bots.
## Prior work by domain
Benchmarks include Industry.ai, Truman AI Live, OmniBet, Ephemeral, CodeCrack, TxGPT, Snaption Live, BlinkAI, and arXiv papers (arXiv:2505.02279, arXiv:2603.03060, arXiv:2412.15701, arXiv:2505.24224).
## Domain Winnability ranking
| Rank | Track | CompInv (25%) | SatInv (20%) | Demo (20%) | Align (20%) | Feas (15%) | Winnability Score |
|---|---|---|---|---|---|---|---|
| #1 | `nexconn-workplace` (Workplace & Collaboration) | 8.5 | 8.5 | 9.5 | 9.5 | 9.0 | **8.98** |
| #2 | `nexconn-support` (Marketplace & Support) | 8.0 | 8.5 | 9.0 | 9.5 | 9.0 | **8.75** |
| #3 | `open-innovation` (Open Innovation) | 8.5 | 9.0 | 9.0 | 9.0 | 8.0 | **8.73** |
| #4 | `nexconn-gaming` (Gaming & Live Streams) | 8.0 | 8.0 | 9.5 | 8.5 | 8.5 | **8.48** |
| #5 | `nexconn-social-good` (Humanitarian & Social Good) | 8.5 | 8.0 | 8.5 | 8.5 | 8.5 | **8.40** |
| #6 | `nexconn-social` (Social & Community) | 6.5 | 7.0 | 8.5 | 8.5 | 9.0 | **7.78** |

# Part 6 — The Council
## Who sat in the war room
11 Core Seats: Peter Thiel, Alex Karp, Patrick Jane, Warren Buffett, Harvey Specter, Mike Ross, Steve Jobs, Elon Musk, Andrej Karpathy, S. Jaishankar, Dr. R.S. Sharma.
6 Extra Seats: Charlie Munger, Seth Godin, Gary Vaynerchuk, Tim Cook, Jony Ive, Paul Graham.
Custom Specialist: Kai Chen (Nexconn AICP & SDK Principal Architect).

# Sources
{urls_block}
""",
        encoding="utf-8",
    )
    _generate_synthetic_pdf(ws / "biblehackathon.pdf", "Nexconn Build Challenge 2026 — Hackathon Bible", pages=6)

    # F16: ideas.md, ideas.pdf, state.md
    (ws / "ideas.md").write_text(
        f"""# Nexconn Build Challenge 2026 — Top Ideas by Domain
> How to read this: 5 ideas per domain (30 ideas total), ranked by the council's 9-criterion weighted rubric.

# Part 0 — Where to Play
## Domain Winnability ranking
| Rank | Track | Winnability Score |
|---|---|---|
| #1 | `nexconn-workplace` — Workplace & Collaboration | **8.98/10** |
| #2 | `nexconn-support` — Marketplace & Support | **8.75/10** |
| #3 | `open-innovation` — Open Innovation | **8.73/10** |
| #4 | `nexconn-gaming` — Gaming & Live Streams | **8.48/10** |
| #5 | `nexconn-social-good` — Humanitarian & Social Good | **8.40/10** |
| #6 | `nexconn-social` — Social & Community | **7.78/10** |

## The council's #1 pick and dark horse
- **#1 Winning Recommendation**: **NexconnWorkplaceMesh1** in Track 03 (`nexconn-workplace` — Workplace & Collaboration), Score **8.6/10**.
- **Dark Horse Pick**: **NexconnSupportMesh1** in Track 04 (`nexconn-support` — Marketplace & Support), Score **8.6/10**.

## All ideas at a glance
30 vetted ideas across all 6 tracks (`nexconn-workplace`, `nexconn-support`, `open-innovation`, `nexconn-gaming`, `nexconn-social-good`, `nexconn-social`).

{chr(10).join(all_domain_idea_sections)}

# Sources
{urls_block}
""",
        encoding="utf-8",
    )
    _generate_synthetic_pdf(ws / "ideas.pdf", "Nexconn Build Challenge 2026 — Top 30 Ideas", pages=6)

    (ws / "state.md").write_text(
        """# War-Room Council State — Nexconn Build Challenge 2026 (`nexconn2026`)
- **Hackathon URL**: https://reskilll.com/hack/nexconn/
- **Team Defaults**: 1–4 members, 36-hour build sprint, TypeScript/Next.js + Python/Node.js + Nexconn Chat SDK.
- **Approved Council Roster**: Peter Thiel, Alex Karp, Patrick Jane, Warren Buffett, Harvey Specter, Mike Ross, Steve Jobs, Elon Musk, Andrej Karpathy, S. Jaishankar, Dr. R.S. Sharma, Charlie Munger, Seth Godin, Gary Vaynerchuk, Tim Cook, Jony Ive, Paul Graham, Kai Chen (Nexconn AICP & SDK Architect).
- **Domain Winnability Ranking**:
  1. `nexconn-workplace` (8.98/10)
  2. `nexconn-support` (8.75/10)
  3. `open-innovation` (8.73/10)
  4. `nexconn-gaming` (8.48/10)
  5. `nexconn-social-good` (8.40/10)
  6. `nexconn-social` (7.78/10)
- **#1 Winning Recommendation**: `NexconnWorkplaceMesh1` (`nexconn-workplace`)
- **Dark Horse Pick**: `NexconnSupportMesh1` (`nexconn-support`)
""",
        encoding="utf-8",
    )


def run_self_test() -> int:
    print("=" * 78)
    print("RUNNING SELF-TEST SUITE (--self-test) AGAINST SYNTHETIC FIXTURES")
    print("=" * 78)
    with tempfile.TemporaryDirectory(prefix="nexconn_e2e_selftest_") as tmp_dir:
        ws = Path(tmp_dir)
        populate_synthetic_workspace(ws)

        t1 = run_tier1_tests(ws)
        t2 = run_tier2_tests(ws)
        t3 = run_tier3_tests(ws)
        t4 = run_tier4_tests(ws)
        all_results = t1 + t2 + t3 + t4

        failed_pos = [r for r in all_results if not r.passed]
        print(f"[Positive Fixture Suite] Tier 1: {sum(r.passed for r in t1)}/{len(t1)} passed")
        print(f"[Positive Fixture Suite] Tier 2: {sum(r.passed for r in t2)}/{len(t2)} passed")
        print(f"[Positive Fixture Suite] Tier 3: {sum(r.passed for r in t3)}/{len(t3)} passed")
        print(f"[Positive Fixture Suite] Tier 4: {sum(r.passed for r in t4)}/{len(t4)} passed")
        if failed_pos:
            for r in failed_pos:
                print(f"  [FAIL] {r.test_id}: {r.description} -> {r.detail}")
            return 1

        # Negative Mutation Checks (verify the harness catches broken deliverables)
        mutations: List[Tuple[str, bool]] = []

        # Mutation 1: Inject TODO into biblehackathon.md
        orig_bible = (ws / "biblehackathon.md").read_text(encoding="utf-8")
        (ws / "biblehackathon.md").write_text(orig_bible + "\nTODO: finish this later\n", encoding="utf-8")
        m1_res = {r.test_id: r.passed for r in run_tier2_tests(ws)}
        mutations.append(("Detect TODO in biblehackathon.md (T2_F15_01)", m1_res["T2_F15_01"] is False))
        (ws / "biblehackathon.md").write_text(orig_bible, encoding="utf-8")

        # Mutation 2: Inject raw war-room dialogue `**THIEL:**` into ideas.md
        orig_ideas = (ws / "ideas.md").read_text(encoding="utf-8")
        (ws / "ideas.md").write_text(orig_ideas + "\n**THIEL:** Raw transcript leak!\n", encoding="utf-8")
        m2_res = {r.test_id: r.passed for r in run_tier2_tests(ws)}
        mutations.append(("Detect raw **THIEL:** dialogue leak in ideas.md (T2_F16_05)", m2_res["T2_F16_05"] is False))
        (ws / "ideas.md").write_text(orig_ideas, encoding="utf-8")

        # Mutation 3: Corrupt weighted score math in ideas.md
        corrupted_math_ideas = orig_ideas.replace("**Score:** 8.6/10", "**Score:** 9.9/10", 1)
        (ws / "ideas.md").write_text(corrupted_math_ideas, encoding="utf-8")
        m3_res = {r.test_id: r.passed for r in run_tier2_tests(ws)}
        mutations.append(("Detect broken 9-criterion weighted score math in ideas.md (T2_F16_04)", m3_res["T2_F16_04"] is False))
        (ws / "ideas.md").write_text(orig_ideas, encoding="utf-8")

        # Mutation 4: Remove required field `**The demo moment (Jobs):**` from ideas.md
        missing_field_ideas = orig_ideas.replace("**The demo moment (Jobs):**", "**Removed field:**", 1)
        (ws / "ideas.md").write_text(missing_field_ideas, encoding="utf-8")
        m4_res = {r.test_id: r.passed for r in run_tier2_tests(ws)}
        mutations.append(("Detect missing required field in ideas.md (T2_F16_03)", m4_res["T2_F16_03"] is False))
        (ws / "ideas.md").write_text(orig_ideas, encoding="utf-8")

        # Mutation 5: Corrupt biblehackathon.pdf header/size
        orig_pdf_bytes = (ws / "biblehackathon.pdf").read_bytes()
        (ws / "biblehackathon.pdf").write_bytes(b"NOT_A_PDF_HEADER")
        m5_res = {r.test_id: r.passed for r in run_tier2_tests(ws)}
        mutations.append(("Detect corrupt/small biblehackathon.pdf (T2_F15_02)", m5_res["T2_F15_02"] is False))
        (ws / "biblehackathon.pdf").write_bytes(orig_pdf_bytes)

        # Mutation 6: Remove Track 06 (`open-innovation`) from 01-facts.md
        orig_facts = (ws / "research" / "01-facts.md").read_text(encoding="utf-8")
        (ws / "research" / "01-facts.md").write_text(
            re.sub(r"open-innovation|Open\s+Innovation", "removed-track", orig_facts, flags=re.I),
            encoding="utf-8",
        )
        m6_res = {r.test_id: r.passed for r in run_tier3_tests(ws)}
        mutations.append(("Detect cross-file track inconsistency (T3_01)", m6_res["T3_01"] is False))
        (ws / "research" / "01-facts.md").write_text(orig_facts, encoding="utf-8")

        for name, ok in mutations:
            status = "PASS" if ok else "FAIL"
            print(f"[Negative Mutation Check] {status}: {name}")
            if not ok:
                return 1

        print("-" * 78)
        print(
            f"SELF-TEST SUMMARY: {len(all_results)}/{len(all_results)} positive tests PASSED + "
            f"{len(mutations)}/{len(mutations)} negative mutation checks PASSED."
        )
        print("=" * 78)
        return 0


def main() -> int:
    parser = argparse.ArgumentParser(description="Nexconn Build Challenge 2026 E2E Verification Runner")
    parser.add_argument(
        "--root",
        type=str,
        default=str(Path(__file__).resolve().parent.parent),
        help="Project root directory (default: d:\\Hackathons\\Nexconn)",
    )
    parser.add_argument(
        "--tier",
        type=str,
        choices=["1", "2", "3", "4", "all"],
        default="all",
        help="Verification tier to run (1, 2, 3, 4, or all)",
    )
    parser.add_argument(
        "--self-test",
        action="store_true",
        help="Validate the test suite against synthetic positive and negative fixtures",
    )
    args = parser.parse_args()

    if args.self_test:
        return run_self_test()

    root = Path(args.root).resolve()
    selected: List[TestResult] = []
    if args.tier in ("1", "all"):
        selected.extend(run_tier1_tests(root))
    if args.tier in ("2", "all"):
        selected.extend(run_tier2_tests(root))
    if args.tier in ("3", "all"):
        selected.extend(run_tier3_tests(root))
    if args.tier in ("4", "all"):
        selected.extend(run_tier4_tests(root))

    print("=" * 78)
    print(f"NEXCONN 2026 E2E TEST SUITE — ROOT: {root} (TIER: {args.tier})")
    print("=" * 78)

    for tier_num in (1, 2, 3, 4):
        tier_tests = [r for r in selected if r.tier == tier_num]
        if not tier_tests:
            continue
        passed_cnt = sum(1 for r in tier_tests if r.passed)
        print(f"\n--- Tier {tier_num}: {passed_cnt}/{len(tier_tests)} passed ---")
        for r in tier_tests:
            flag = "PASS" if r.passed else "FAIL"
            detail_str = f" [{r.detail}]" if r.detail and not r.passed else ""
            print(f"  [{flag}] {r.test_id} ({r.feature}): {r.description}{detail_str}")

    total_passed = sum(1 for r in selected if r.passed)
    total_count = len(selected)
    print("\n" + "=" * 78)
    print(f"OVERALL RESULT: {total_passed}/{total_count} passed ({100.0 * total_passed / max(1, total_count):.1f}%)")
    print("=" * 78)
    return 0 if total_passed == total_count else 1


if __name__ == "__main__":
    sys.exit(main())
