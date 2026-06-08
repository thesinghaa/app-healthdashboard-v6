"""
4-agent CrewAI pipeline — NHM Arunachal Pradesh division report.

Agent 1  DataCollector   (fast)    — structures KD + HMIS data into a briefing
Agent 2  Analyst         (strong)  — root causes, priorities, patterns
Agent 3  ReportWriter    (strong)  — full HTML report with PIF styling
Agent 4  QualityChecker  (fast)    — tone / language / accuracy review

Wording rules taken from live JS report (PIF style guide):
  - Never: "failing", "failure", "struggling", "poor performance"
  - Always: "has scope for improvement", "requires focused attention",
             "presents an opportunity to..."
  - No em-dashes (—) or en-dashes (–). Use commas or full stops instead.
  - Exact indicator names and numbers in every claim.
  - Audience: senior NHM Arunachal Pradesh officers (DHS / Mission Director level).
"""

import time
import threading
from crewai import Agent, Task, Crew, Process

FAST_MODEL   = "groq/llama-3.1-8b-instant"
STRONG_MODEL = "groq/llama-3.3-70b-versatile"

# ── Tone constants (shared across all agent backstories / tasks) ────────────
TONE_RULES = """
LANGUAGE RULES (strictly mandatory for all output):
- NEVER use: failing, failure, is failing, struggling, poor performance,
  inadequate, weak, disappointing, alarming, or any attacking/negative framing.
- Frame every gap as an opportunity: "has significant scope for improvement",
  "requires focused attention", "presents a clear opportunity to accelerate".
- NEVER use em-dashes (the character: —) or en-dashes (–). Use commas or
  full stops instead.
- Always reference exact indicator names and numbers from the data.
- Audience: senior NHM Arunachal Pradesh officers who need to act on this.
- Organisation: Pahlé India Foundation (PIF). Spell it exactly this way.
"""


# ── Helper: build all agents ───────────────────────────────────────────────
def _make_agents():
    collector = Agent(
        role="NHM Data Aggregator",
        goal=(
            "Compile a concise, structured performance briefing for the division "
            "so analysts can immediately understand the current programme situation."
        ),
        backstory=(
            "You are a data analyst at Pahlé India Foundation (PIF), embedded "
            "with the NHM Arunachal Pradesh team. You excel at reading HMIS data, "
            "interpreting KD achievement ratios, and flagging issues with precision. "
            "You present facts neutrally, always citing exact indicator codes and numbers."
        ),
        llm=FAST_MODEL,
        verbose=False,
        allow_delegation=False,
        max_iter=1,
    )

    analyst = Agent(
        role="Senior Public Health Programme Analyst",
        goal=(
            "Identify the most important performance patterns, root causes, and "
            "actionable priorities for the division, framed for a senior health "
            "officer who must decide where to focus resources next quarter."
        ),
        backstory=(
            "You are a senior programme analyst with 12 years of experience in "
            "public health monitoring across Northeast India. You understand NHM "
            "structures, district-level constraints in remote tribal states, and "
            "how to translate data into strategic priorities. Arunachal Pradesh "
            "context you always keep in mind: 27 districts, significant terrain "
            "challenges, sparse populations in remote areas, limited transport "
            "during monsoon, and ongoing capacity-building needs at block level. "
            "You frame challenges constructively, as opportunities for improvement."
        ),
        llm=STRONG_MODEL,
        verbose=False,
        allow_delegation=False,
        max_iter=1,
    )

    writer = Agent(
        role="Senior Health Report Writer",
        goal=(
            "Produce a polished, authoritative HTML report on division performance, "
            "suitable for a senior NHM officer to read, present, and share with "
            "state and district health teams."
        ),
        backstory=(
            "You write executive health reports for government health departments "
            "in India on behalf of Pahlé India Foundation. Your reports are clear, "
            "data-driven, and structured so a busy district officer can act on them "
            "in under 10 minutes. You produce clean, self-contained HTML with inline "
            "CSS. Your tone is always constructive and professional. You never frame "
            "gaps as failures. You use exact indicator names and numbers in every claim. "
            "You never use em-dashes. The style guide says: gap = "
            "'has scope for improvement', not 'is failing'."
        ),
        llm=STRONG_MODEL,
        verbose=False,
        allow_delegation=False,
        max_iter=1,
    )

    checker = Agent(
        role="Editorial Quality Reviewer",
        goal=(
            "Ensure the HTML report meets PIF tone standards, contains no prohibited "
            "language, and that every factual claim is backed by data from the briefing."
        ),
        backstory=(
            "You are the editorial lead at Pahlé India Foundation. You review every "
            "report before it goes to government officers. You catch: (1) prohibited "
            "negative words — failing, failure, struggling, poor, weak, inadequate, "
            "alarming; (2) em-dashes or en-dashes anywhere in the text; (3) "
            "recommendations without a responsible party or timeline; (4) claims "
            "that cite no specific numbers. You output the corrected final HTML "
            "and nothing else."
        ),
        llm=STRONG_MODEL,   # strong model — higher TPM limit on Groq free tier
        verbose=False,
        allow_delegation=False,
        max_iter=1,
    )

    return collector, analyst, writer, checker


# ── Helper: build all tasks ────────────────────────────────────────────────
def _make_tasks(collector, analyst, writer, checker,
                division_summary, hmis_summary, div_full_name, chart_context):

    task_collect = Task(
        description=(
            f"You have been given raw KD performance data and HMIS trends for the "
            f"{div_full_name} division, NHM Arunachal Pradesh FY 2025-26.\n\n"
            f"=== KD DATA ===\n{division_summary}\n\n"
            f"=== HMIS LIVE DATA ===\n{hmis_summary}\n\n"
            "Produce a structured data briefing with ALL of the following sections:\n"
            "1. DIVISION SNAPSHOT: total programmes, KD counts by status "
            "(achieved / caution / gap), overall achievement rate.\n"
            "2. PROGRAMME TABLE: for each programme — name, status "
            "(On Track / Caution / Critical), KDs achieved/caution/gap, "
            "the single most important metric.\n"
            "3. TOP 5 CRITICAL GAPS: indicator name, current value, target, "
            "percentage gap. Sort by largest gap first.\n"
            "4. TOP 3 ACHIEVEMENTS: indicator name, value, target, "
            "why it matters.\n"
            "5. HMIS TREND OBSERVATIONS: monthly data patterns, improving or "
            "declining indicators, seasonality.\n"
            "Be precise with numbers. Do not add commentary or recommendations yet."
        ),
        expected_output=(
            "A structured text briefing with sections: Division Snapshot, "
            "Programme Table, Top 5 Critical Gaps, Top 3 Achievements, "
            "HMIS Trend Observations."
        ),
        agent=collector,
    )

    task_analyse = Task(
        description=(
            f"Using the data briefing, produce a deep analytical assessment for "
            f"{div_full_name} division.\n\n"
            "REQUIRED SECTIONS:\n"
            "1. TOP 3 CRITICAL PRIORITIES: for each — programme name, the specific "
            "   KD indicators of concern with exact numbers, and 2 to 3 likely "
            "   contributing factors drawn from: supply chain, HR availability, "
            "   training needs, geographic access, community awareness, "
            "   infrastructure gaps, seasonal constraints.\n"
            "2. POSITIVE FINDINGS: 3 genuine bright spots with specific numbers. "
            "   Explain why each achievement is significant for beneficiary health.\n"
            "3. SYSTEMIC PATTERNS: cross-programme issues affecting multiple "
            "   programmes (e.g., last-mile supply chain, frontline worker gaps, "
            "   digital reporting lags).\n"
            "4. STRATEGIC RECOMMENDATIONS: 6 specific, actionable recommendations. "
            "   Each must have: the action, responsible party (e.g., District CMO, "
            "   Block PHC, State NHM), and a realistic timeline (weeks or months).\n\n"
            f"{TONE_RULES}\n"
            "Write in clear, officer-facing language. Be specific, not generic."
        ),
        expected_output=(
            "A structured analysis with: Top 3 Critical Priorities (with contributing "
            "factors), Positive Findings, Systemic Patterns, Strategic Recommendations "
            "(6 items, each with responsible party and timeline)."
        ),
        agent=analyst,
        context=[task_collect],
    )

    task_write = Task(
        description=(
            f"Write a complete HTML report for {div_full_name} division, "
            f"NHM Arunachal Pradesh, FY 2025-26.\n\n"
            "Use ALL data from the briefing and analysis in the context.\n\n"
            f"Charts available (use placeholder comments exactly as shown):\n"
            f"{chart_context}\n\n"
            "REQUIRED SECTIONS (all 8 are mandatory):\n"
            "1. COVER / HEADER: division name in large type, 'NHM Arunachal Pradesh', "
            "   'Pahlé India Foundation', today's date, 'FY 2025-26 Performance Report'.\n"
            "2. EXECUTIVE SUMMARY: 2 to 3 sentences. Overall division health, "
            "   headline finding, top priority area. Use exact numbers.\n"
            "3. DIVISION SCORECARD: HTML table with columns — Programme | Status badge "
            "   | KDs Achieved/Total | Key Metric | Trend arrow.\n"
            "4. CRITICAL PRIORITIES: one styled card per critical programme. "
            "   Each card: programme name, what the data shows (exact numbers), "
            "   contributing factors, what focused attention is required.\n"
            "5. WHAT IS WORKING: 3 bright spots in a grid. Each: indicator name, "
            "   achievement value vs target, why it matters.\n"
            "6. HMIS TREND OBSERVATIONS: bullet list of monthly data patterns, "
            "   recent trajectory, seasonal notes.\n"
            "7. STRATEGIC RECOMMENDATIONS: numbered list, 6 items. "
            "   Each: action | Responsible: [party] | Timeline: [X weeks/months].\n"
            "8. DATA APPENDIX: full KD table — Programme | Indicator | Target | "
            "   Achievement | Status badge.\n\n"
            "STYLING (strict):\n"
            "- Self-contained HTML, all CSS in a <style> block.\n"
            "- Background #f0f2f5, card background #ffffff, "
            "  PIF orange #FF5500 for accents and headings.\n"
            "- Status badges: Critical = bg #fee2e2 text #991b1b, "
            "  Caution = bg #fef3c7 text #92400e, "
            "  On Track = bg #d1fae5 text #065f46.\n"
            "- Font: Inter (load from Google Fonts). Max width 900px centered.\n"
            "- Section headings: bold, #FF5500 left border accent.\n"
            "- For chart placeholders output exactly: <!--CHART:status_donut--> etc.\n"
            "- Valid HTML only. No markdown. No external images except Google Fonts.\n\n"
            f"{TONE_RULES}"
        ),
        expected_output=(
            "A complete, valid HTML document (starting with <!DOCTYPE html>) "
            "with all 8 sections, inline CSS, PIF styling, and chart placeholders."
        ),
        agent=writer,
        context=[task_collect, task_analyse],
    )

    task_check = Task(
        description=(
            "Review the HTML report produced by the ReportWriter and fix any issues.\n\n"
            "CHECK FOR AND FIX:\n"
            "1. Prohibited words: failing, failure, is failing, struggling, "
            "   poor performance, inadequate, weak, disappointing, alarming. "
            "   Replace with: 'has scope for improvement', 'requires focused attention', "
            "   'presents an opportunity to accelerate'.\n"
            "2. Em-dashes (—) or en-dashes (–): replace every one with a comma "
            "   or full stop.\n"
            "3. Recommendations missing a responsible party or timeline: add them.\n"
            "4. Any claim with no number or indicator name: add the data reference.\n"
            "5. Ensure all 8 report sections are present and complete.\n\n"
            "OUTPUT: the complete corrected HTML document and nothing else. "
            "Do not add any commentary, explanation, or markdown around the HTML."
        ),
        expected_output=(
            "The corrected, final HTML document starting with <!DOCTYPE html>. "
            "No additional text. No markdown fences."
        ),
        agent=checker,
        context=[task_collect, task_write],
    )

    return task_collect, task_analyse, task_write, task_check


# ── Public API ─────────────────────────────────────────────────────────────
def build_crew(division_summary: str, hmis_summary: str,
               div_full_name: str, charts: dict,
               step_callback=None) -> Crew:
    """
    Returns a configured Crew ready to kickoff().
    step_callback(step_idx: int) is called after each task completes (0-based).
    """
    chart_context = "\n".join(
        f"  <!--CHART:{k}--> is available as a base64 PNG chart."
        for k, v in charts.items() if v
    ) or "  No charts available."

    collector, analyst, writer, checker = _make_agents()
    t1, t2, t3, t4 = _make_tasks(
        collector, analyst, writer, checker,
        division_summary, hmis_summary, div_full_name, chart_context,
    )

    # Track task completion for SSE progress + pace calls to stay under Groq TPM
    # 15-second gap between tasks spreads ~10k total tokens over ~60s → under 12k TPM
    PACE_SECONDS = 15
    _step = [0]
    _lock = threading.Lock()

    def _on_task_end(task_output):
        with _lock:
            _step[0] += 1
            if step_callback:
                step_callback(_step[0])
            # Pace: sleep before next LLM call to avoid exceeding Groq TPM
            if _step[0] < 3:          # pause after tasks 1 and 2 (not after 3 — QC follows immediately)
                time.sleep(PACE_SECONDS)

    t1.callback = _on_task_end
    t2.callback = _on_task_end
    t3.callback = _on_task_end

    return Crew(
        agents=[collector, analyst, writer, checker],
        tasks=[t1, t2, t3, t4],
        process=Process.sequential,
        verbose=False,
    )


def run_report(division_summary: str, hmis_summary: str,
               div_full_name: str, charts: dict,
               step_callback=None) -> str:
    crew = build_crew(division_summary, hmis_summary, div_full_name,
                      charts, step_callback)
    result = crew.kickoff()
    return str(result)
