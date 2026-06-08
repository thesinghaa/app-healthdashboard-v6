import json
from pathlib import Path

_DATA_PATH = Path(__file__).parent.parent / "kd_data.json"
_cache: dict | None = None


def _load() -> dict:
    global _cache
    if _cache is None:
        with open(_DATA_PATH) as f:
            _cache = json.load(f)
    return _cache


def _kd_status(kd: dict) -> str:
    t, a = kd.get("target"), kd.get("achievement")
    if not t or a is None:
        return "neutral"
    ratio = a / t
    li = kd.get("lowerIsBetter", False)
    if (li and ratio <= 1.00) or (not li and ratio >= 1.00):
        return "achieved"
    if (li and ratio <= 1.33) or (not li and ratio >= 0.75):
        return "close"
    return "gap"


def _deficit(kd: dict) -> float:
    t, a = kd.get("target"), kd.get("achievement")
    if not t or a is None:
        return 0.0
    ratio = a / t
    return (ratio - 1) if kd.get("lowerIsBetter") else (1 - ratio)


def get_division_summary(division_id: str) -> str:
    """
    Compact summary — target ~700 tokens to stay under Groq TPM limits.
    Contains: division snapshot, per-programme status, top-5 gaps, top-3 achievements.
    """
    data = _load()
    div  = data.get(division_id)
    if not div:
        return f"Division '{division_id}' not found."

    all_gap, all_ach = [], []
    prog_rows = []

    for prog_id, prog in div["programmes"].items():
        kds = prog.get("kds", [])
        achieved = close = gap = 0
        for kd in kds:
            st = _kd_status(kd)
            if st == "achieved":
                achieved += 1
                all_ach.append((_deficit(kd), prog["name"], kd))
            elif st == "close":
                close += 1
            elif st == "gap":
                gap += 1
                all_gap.append((_deficit(kd), prog["name"], kd))

        status = "CRITICAL" if gap else ("CAUTION" if close else "ON TRACK")
        prog_rows.append(
            f"  {prog['name']}: {status} | {achieved} ok / {close} caution / {gap} gap"
        )

    all_gap.sort(key=lambda x: -x[0])
    all_ach.sort(key=lambda x:  x[0])   # closest-to-target first for achievements

    lines = [
        f"DIVISION: {div['fullName']} | FY 2025-26 | NHM Arunachal Pradesh",
        "",
        "PROGRAMME STATUS:",
    ] + prog_rows

    lines += ["", "TOP 5 CRITICAL GAPS (largest deficit first):"]
    for deficit, prog_name, kd in all_gap[:5]:
        lines.append(
            f"  [{prog_name}] {kd['indicator']}: "
            f"target {kd.get('targetLabel', kd.get('target'))}, "
            f"achieved {kd.get('achievedLabel', kd.get('achievement'))} "
            f"({round(deficit*100)}% shortfall)"
        )

    lines += ["", "TOP 3 ACHIEVEMENTS:"]
    for _, prog_name, kd in all_ach[:3]:
        lines.append(
            f"  [{prog_name}] {kd['indicator']}: "
            f"{kd.get('achievedLabel', kd.get('achievement'))} "
            f"(target {kd.get('targetLabel', kd.get('target'))})"
        )

    return "\n".join(lines)


def get_raw_division(division_id: str) -> dict:
    return _load().get(division_id, {})
