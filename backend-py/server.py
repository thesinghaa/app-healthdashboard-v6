"""
FastAPI server — POST /api/report/{division_id}
SSE stream: { type:'step', idx:N } ... { type:'done', html:'...' }

Steps:
  0 — Computing KD data        (JS-side computation, instant)
  1 — DataCollector agent done (briefing ready)
  2 — Analyst agent done       (root causes ready)
  3 — ReportWriter agent done  (HTML draft ready)
  4 — QualityChecker done      (final HTML, triggers 'done' event)
"""
import asyncio, json, os, traceback
from concurrent.futures import ThreadPoolExecutor

from dotenv import load_dotenv
load_dotenv()

import litellm
litellm.num_retries = 6                    # retry up to 6x on rate limit
litellm.request_timeout = 120              # 2-min timeout per call
os.environ.setdefault("GROQ_API_KEY",      # ensure litellm picks it up
    os.getenv("GROQ_API_KEY", ""))

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

from tools.kd_loader    import get_division_summary, get_raw_division
from tools.hmis_fetcher import fetch_hmis_summary
from tools.chart_gen    import generate_all_charts
from crew_report        import run_report

app = FastAPI(title="PIF Health Report API — CrewAI", version="2.0.0")

ALLOWED = [o.strip() for o in os.getenv(
    "ALLOWED_ORIGINS",
    "http://localhost:5173,http://localhost:5174,https://v6appdashboard.vercel.app",
).split(",")]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED,
    allow_credentials=False,
    allow_methods=["POST", "GET", "OPTIONS"],
    allow_headers=["*"],
)

VALID_DIVISIONS = {"rch", "ndcp", "ncd", "hss", "hrh"}
_executor = ThreadPoolExecutor(max_workers=4)


@app.get("/health")
def health():
    return {"status": "ok", "version": "crewai-4-agent"}


@app.post("/api/report/{division_id}")
async def generate_report(division_id: str):
    if division_id not in VALID_DIVISIONS:
        raise HTTPException(404, detail=f"Unknown division: {division_id}")

    loop = asyncio.get_event_loop()
    queue: asyncio.Queue = asyncio.Queue()

    # ── Step callback — called from crew thread, must be thread-safe ──
    def on_step(idx: int):
        loop.call_soon_threadsafe(queue.put_nowait, {"type": "step", "idx": idx})

    # ── Crew runs in thread pool so it doesn't block the event loop ───
    async def run_in_thread():
        try:
            # Step 0 — load KD data (instant)
            queue.put_nowait({"type": "step", "idx": 0})

            div_raw     = get_raw_division(division_id)
            div_summary = get_division_summary(division_id)
            div_name    = div_raw.get("fullName", division_id.upper())
            hmis_summary = fetch_hmis_summary(division_id)
            charts       = generate_all_charts(div_raw)

            # Steps 1-3 are emitted by task callbacks inside run_report
            html_raw = await loop.run_in_executor(
                _executor,
                lambda: run_report(
                    div_summary, hmis_summary, div_name, charts,
                    step_callback=on_step,
                ),
            )

            # Inject base64 chart images
            html = html_raw
            for key, b64 in charts.items():
                if not b64:
                    continue
                placeholder = f"<!--CHART:{key}-->"
                img_tag = (
                    f'<img src="data:image/png;base64,{b64}" '
                    f'alt="{key}" style="width:100%;max-width:680px;'
                    f'border-radius:8px;margin:16px 0;display:block;" />'
                )
                html = html.replace(placeholder, img_tag)

            queue.put_nowait({"type": "done", "html": html, "division": div_name})

        except Exception as exc:
            traceback.print_exc()
            queue.put_nowait({"type": "error", "message": str(exc)})

    asyncio.create_task(run_in_thread())

    # ── SSE generator ──────────────────────────────────────────────────
    async def event_stream():
        yield ": connected\n\n"           # keep-alive comment
        while True:
            event = await asyncio.wait_for(queue.get(), timeout=120)
            yield f"data: {json.dumps(event)}\n\n"
            if event["type"] in ("done", "error"):
                break

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",   # disable Nginx buffering if proxied
        },
    )
