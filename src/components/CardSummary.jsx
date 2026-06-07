import { useMemo, useEffect, useRef, useState } from 'react';
import Plot from 'react-plotly.js';
import { gsap } from 'gsap';
import { KD_TREE } from '../data/kdData';

/* ── helpers ────────────────────────────────────────────────────── */
function kdStatus(kd) {
  if (kd.achievement == null || kd.target == null || kd.target === 0) return 'neutral';
  const ratio = kd.achievement / kd.target;
  if (kd.lowerIsBetter) {
    if (ratio <= 1.00) return 'achieved';
    if (ratio <= 1.33) return 'close';
    return 'gap';
  }
  if (ratio >= 1.00) return 'achieved';
  if (ratio >= 0.75) return 'close';
  return 'gap';
}

function kdDeficit(kd) {
  if (kd.achievement == null || kd.target == null || kd.target === 0) return null;
  const ratio = kd.achievement / kd.target;
  return kd.lowerIsBetter ? ratio - 1.0 : 1.0 - ratio;
}

function computeProgStatus(divisionId, progId) {
  const div = KD_TREE[divisionId];
  if (!div) return 'yellow';
  const prog = (div.programmes || {})[progId];
  if (!prog || !(prog.kds || []).length) return 'yellow';
  let achieved = 0, close = 0, gap = 0;
  prog.kds.forEach(kd => {
    const st = kdStatus(kd);
    if (st === 'neutral') return;
    if (st === 'achieved') achieved++;
    else if (st === 'close') close++;
    else gap++;
  });
  if (gap > 0) return 'red';
  if (close > 0) return 'yellow';
  if (achieved > 0) return 'green';
  return 'yellow';
}

function getDivKDBreakdown(divisionId) {
  const div = KD_TREE[divisionId];
  if (!div) return { achieved: 0, close: 0, gap: 0, total: 0 };
  let achieved = 0, close = 0, gap = 0, total = 0;
  Object.values(div.programmes || {}).forEach(prog => {
    (prog.kds || []).forEach(kd => {
      const st = kdStatus(kd);
      if (st === 'neutral') return;
      total++;
      if (st === 'achieved') achieved++;
      else if (st === 'close') close++;
      else gap++;
    });
  });
  return { achieved, close, gap, total };
}

function getTopKDsByStatus(divisionId, status, n = 3) {
  const div = KD_TREE[divisionId];
  if (!div) return [];
  const results = [];
  Object.entries(div.programmes || {}).forEach(([progId, prog]) => {
    (prog.kds || []).forEach(kd => {
      const st = kdStatus(kd);
      if (st !== status) return;
      const deficit = kdDeficit(kd);
      results.push({ ...kd, programmeId: progId, _deficit: deficit ?? 0 });
    });
  });
  results.sort((a, b) => {
    if (status === 'gap')   return b._deficit - a._deficit;
    if (status === 'close') return a._deficit - b._deficit;
    return a._deficit - b._deficit;
  });
  return results.slice(0, n);
}

function getProgKDBrk(divisionId, progId) {
  const div = KD_TREE[divisionId];
  if (!div) return { achieved: 0, close: 0, gap: 0 };
  const prog = (div.programmes || {})[progId];
  if (!prog) return { achieved: 0, close: 0, gap: 0 };
  let achieved = 0, close = 0, gap = 0;
  (prog.kds || []).forEach(kd => {
    const st = kdStatus(kd);
    if (st === 'neutral') return;
    if (st === 'achieved') achieved++;
    else if (st === 'close') close++;
    else gap++;
  });
  return { achieved, close, gap };
}

/* Returns KDs for a programme filtered by status */
function getProgKDsByStatus(divisionId, progId, status) {
  const div = KD_TREE[divisionId];
  if (!div) return [];
  const prog = (div.programmes || {})[progId];
  if (!prog) return [];
  return (prog.kds || []).filter(kd => kdStatus(kd) === status);
}

/* Returns the single worst KD for a programme (gap > close > achieved, then by deficit) */
function getWorstKD(divisionId, progId) {
  const div = KD_TREE[divisionId];
  if (!div) return null;
  const prog = (div.programmes || {})[progId];
  if (!prog) return null;
  const kds = (prog.kds || []).filter(kd => kdStatus(kd) !== 'neutral');
  if (!kds.length) return null;
  const priority = { gap: 0, close: 1, achieved: 2 };
  return [...kds].sort((a, b) => {
    const pa = priority[kdStatus(a)] ?? 3;
    const pb = priority[kdStatus(b)] ?? 3;
    if (pa !== pb) return pa - pb;
    return (kdDeficit(b) ?? 0) - (kdDeficit(a) ?? 0);
  })[0];
}

const SEG_COLORS = {
  gap:      '#EF4444',
  close:    '#EAB308',
  achieved: '#22C55E',
};

const SEG_GLOW = {
  gap:      'rgba(239,68,68,',
  close:    'rgba(234,179,8,',
  achieved: 'rgba(34,197,94,',
};

/* ── SVG arc geometry helpers (for custom indicator donut) ──── */
function _polar(cx, cy, r, deg) {
  const rad = (deg - 90) * Math.PI / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}
function _arc(cx, cy, r, s, e) {
  const large = (e - s) > 180 ? 1 : 0;
  const p1 = _polar(cx, cy, r, s), p2 = _polar(cx, cy, r, e);
  return `M ${p1.x} ${p1.y} A ${r} ${r} 0 ${large} 1 ${p2.x} ${p2.y}`;
}
/* Half-circle arc (left→top→right, clockwise sweep=1 in SVG coords).
   sFrac/eFrac = fractions 0..1 over the 180° arc.
   gapDeg     = angular padding to leave at each end of the segment.
   Angles: sFrac=0 → 9-o-clock (left), sFrac=1 → 3-o-clock (right), through 12-o-clock (top). */
function _halfSeg(cx, cy, r, sFrac, eFrac, gapDeg) {
  const toRad = d => d * Math.PI / 180;
  // Map fraction → standard-math angle (0°=right, 90°=up, 180°=left).
  // sFrac=0 → 180°, sFrac=1 → 0°, going counterclockwise in math = clockwise on screen.
  const a1 = toRad(180 - sFrac * 180 - gapDeg);
  const a2 = toRad(180 - eFrac * 180 + gapDeg);
  // SVG: y increases downward, so y = cy - r*sin(angle) places top of circle at smaller y.
  const x1 = cx + r * Math.cos(a1), y1 = cy - r * Math.sin(a1);
  const x2 = cx + r * Math.cos(a2), y2 = cy - r * Math.sin(a2);
  const span = (eFrac - sFrac) * 180 - 2 * gapDeg;
  // sweep=1 draws the clockwise arc (left→top→right on screen).
  return `M ${x1} ${y1} A ${r} ${r} 0 ${span > 180 ? 1 : 0} 1 ${x2} ${y2}`;
}

const SEG_LABELS = {
  gap:      'Critical',
  close:    'Caution',
  achieved: 'On Track',
};

const LAYOUT_BASE = {
  paper_bgcolor: 'rgba(0,0,0,0)',
  plot_bgcolor:  'rgba(0,0,0,0)',
  margin: { t: 0, b: 0, l: 0, r: 0, pad: 0 },
  showlegend: false,
  hoverlabel: {
    bgcolor: 'rgba(5,7,18,0.96)',
    bordercolor: 'rgba(0,181,204,0.40)',
    font: { color: '#ffffff', size: 11, family: 'JetBrains Mono' },
  },
};

/* ── Programme speedometer gauge ────────────────────────────────────
   Visual: CSS conic-gradient (original clean look).
   Interaction: click-angle math to detect which segment was clicked.
   No new libraries needed.
   ────────────────────────────────────────────────────────────────── */
function ProgGauge({ gap, close, achieved, activeSeg, onSegClick }) {
  const total  = Math.max(1, gap + close + achieved);
  const W = 160, RO = 80, RI = 54;

  const gFrac = gap      / total;
  const cFrac = close    / total;
  const gA    = gFrac * 180;
  const cA    = cFrac * 180;

  /* All segments always full colour */
  const stops = [
    gap      > 0 ? `${SEG_COLORS.gap} 0deg ${gA}deg`              : null,
    close    > 0 ? `${SEG_COLORS.close} ${gA}deg ${gA + cA}deg`   : null,
    achieved > 0 ? `${SEG_COLORS.achieved} ${gA + cA}deg 180deg`  : null,
  ].filter(Boolean);
  if (!stops.length) stops.push('rgba(148,163,184,0.20) 0deg 180deg');
  stops.push('transparent 180deg');

  const grad = `conic-gradient(from 270deg at 50% 100%, ${stops.join(', ')})`;
  const mask = `radial-gradient(circle at 50% 100%, transparent ${RI}px, black ${RI + 1}px)`;

  /* Glow gradient — conic of ONLY the active segment, blurred behind the arc */
  const glowGrad = activeSeg ? (() => {
    const c = SEG_COLORS[activeSeg];
    const from270 = 'from 270deg at 50% 100%';
    if (activeSeg === 'gap')
      return `conic-gradient(${from270}, ${c} 0deg ${gA}deg, transparent ${gA}deg 360deg)`;
    if (activeSeg === 'close')
      return `conic-gradient(${from270}, transparent 0deg ${gA}deg, ${c} ${gA}deg ${gA + cA}deg, transparent ${gA + cA}deg 360deg)`;
    return `conic-gradient(${from270}, transparent 0deg ${gA + cA}deg, ${c} ${gA + cA}deg 180deg, transparent 180deg 360deg)`;
  })() : null;

  /* Click-angle detection — maps pointer position → segment key */
  function handleArcClick(ev) {
    ev.stopPropagation();
    if (!onSegClick) return;
    const rect = ev.currentTarget.getBoundingClientRect();
    // Arc centre is at horizontal-centre, BOTTOM of the RO-height div
    const acx = rect.left + rect.width  / 2;
    const acy = rect.bottom;
    const dx  = ev.clientX - acx;
    const dy  = acy - ev.clientY;          // positive = above centre (in the arc)

    // Only process clicks in the upper half (on the arc)
    if (dy < -4) return;

    // Reject clicks outside the ring band
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < RI - 6 || dist > RO + 6) return;

    // angle: 180° = left end, 90° = top, 0° = right end
    const angleDeg = Math.atan2(dy, dx) * 180 / Math.PI;
    const frac     = (180 - angleDeg) / 180;  // 0 = left, 1 = right
    if (frac < 0 || frac > 1) return;

    if      (frac <= gFrac)          onSegClick('gap');
    else if (frac <= gFrac + cFrac)  onSegClick('close');
    else                             onSegClick('achieved');
  }

  const displayCount = activeSeg
    ? (activeSeg === 'gap' ? gap : activeSeg === 'close' ? close : achieved)
    : total;
  const lblColor = activeSeg ? SEG_COLORS[activeSeg] : 'var(--ink, #1e293b)';

  return (
    <div style={{ position: 'relative', width: W, height: RO + 14, flexShrink: 0 }}>
      {/* Glow layer — blurred copy of active segment only, sits behind arc */}
      {glowGrad && (
        <div style={{
          position: 'absolute', top: -6, left: -6, right: -6,
          height: RO + 12,
          borderRadius: `${RO}px ${RO}px 0 0`,
          background: glowGrad,
          maskImage: mask, WebkitMaskImage: mask,
          filter: 'blur(10px)',
          opacity: 0.55,
          pointerEvents: 'none',
          transition: 'opacity 0.2s',
        }} />
      )}
      {/* Grey track */}
      <div style={{
        position: 'absolute', top: 0,
        width: W, height: RO,
        borderRadius: `${RO}px ${RO}px 0 0`,
        overflow: 'hidden',
        background: `conic-gradient(from 270deg at 50% 100%, rgba(148,163,184,0.25) 0deg 180deg, transparent 180deg)`,
        maskImage: mask, WebkitMaskImage: mask,
      }} />
      {/* Coloured arc — click detection via angle math */}
      <div
        style={{
          position: 'absolute', top: 0,
          width: W, height: RO,
          borderRadius: `${RO}px ${RO}px 0 0`,
          overflow: 'hidden',
          background: grad,
          maskImage: mask, WebkitMaskImage: mask,
          cursor: 'pointer',
        }}
        onClick={handleArcClick}
      />
      {/* Count + label */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0,
                    textAlign: 'center', lineHeight: 1.25, pointerEvents: 'none' }}>
        <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 15,
                      fontWeight: 700, color: lblColor, transition: 'color 0.2s' }}>
          {displayCount}
        </div>
        <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10,
                      fontWeight: 700, color: lblColor, letterSpacing: '0.10em',
                      textTransform: 'uppercase', transition: 'color 0.2s' }}>
          {activeSeg ? SEG_LABELS[activeSeg] : 'Indicators'}
        </div>
      </div>
    </div>
  );
}

/* ── component ──────────────────────────────────────────────────── */
export default function CardSummary({ divisionId, programmes = [], activeFilter, isActive, onKDClick, onExploreDivision }) {
  const [selectedSeg, setSelectedSeg] = useState(null);
  const [progActiveSegs, setProgActiveSegs] = useState({});
  const top3Ref = useRef(null);
  const indDonutRef = useRef(null);
  const totalNumRef = useRef(null);
  const legNumRefs = useRef([null, null, null]);
  const progDonutRefs = useRef([]);

  /* ── division-level KD breakdown ───────────────────────────── */
  const brk = useMemo(() => getDivKDBreakdown(divisionId), [divisionId]);

  /* ── resolved filter + filtered progs — must be before effects ── */
  const resolvedFilter = useMemo(() => {
    if (activeFilter) return activeFilter;
    if (programmes.some(p => computeProgStatus(divisionId, p.id) === 'red'))    return 'red';
    if (programmes.some(p => computeProgStatus(divisionId, p.id) === 'yellow')) return 'yellow';
    return 'green';
  }, [activeFilter, programmes, divisionId]);

  const filteredProgs = useMemo(
    () => programmes.filter(p => computeProgStatus(divisionId, p.id) === resolvedFilter),
    [programmes, resolvedFilter, divisionId],
  );

  const n = filteredProgs.length;
  const progCardStyle = n > 0 && n <= 4 ? { flex: 1, minWidth: 0 } : { width: '220px', flexShrink: 0 };

  const sectionLabel =
    resolvedFilter === 'red'    ? 'CRITICAL PROGRAMMES' :
    resolvedFilter === 'yellow' ? 'CAUTION PROGRAMMES'  :
    'ON TRACK PROGRAMMES';

  /* Auto-select most critical segment when card becomes active; clear when inactive */
  useEffect(() => {
    if (!isActive) {
      setSelectedSeg(null);
      setProgActiveSegs({});
    } else {
      if (brk.gap > 0)        setSelectedSeg('gap');
      else if (brk.close > 0) setSelectedSeg('close');
      else                    setSelectedSeg('achieved');
      // Initialise each prog card to its dominant segment
      const init = {};
      programmes.forEach(prog => {
        const pb = getProgKDBrk(divisionId, prog.id);
        init[prog.id] = pb.gap > 0 ? 'gap' : pb.close > 0 ? 'close' : 'achieved';
      });
      setProgActiveSegs(init);
    }
  }, [isActive, brk.gap, brk.close, brk.achieved]);

  /* GSAP: animate top-3 panel in when selectedSeg becomes non-null */
  useEffect(() => {
    if (!selectedSeg || !top3Ref.current) return;
    gsap.fromTo(
      top3Ref.current,
      { opacity: 0, y: -8 },
      { opacity: 1, y: 0, duration: 0.28, ease: 'power2.out' },
    );
  }, [selectedSeg]);

  /* GSAP: entrance animations on card activate */
  useEffect(() => {
    if (!isActive) {
      // Clean up mask if card deactivates mid-animation
      if (indDonutRef.current) {
        indDonutRef.current.style.maskImage = '';
        indDonutRef.current.style.webkitMaskImage = '';
      }
      return;
    }

    // Indicator donut — speedometer sweep (conic-gradient mask, 0→360° clockwise)
    if (indDonutRef.current) {
      const el = indDonutRef.current;
      const obj = { a: 0 };
      el.style.maskImage = 'conic-gradient(from -90deg, #000 0deg 0deg, transparent 0deg 360deg)';
      el.style.webkitMaskImage = 'conic-gradient(from -90deg, #000 0deg 0deg, transparent 0deg 360deg)';
      gsap.to(obj, {
        a: 360, duration: 1.0, ease: 'power2.inOut', delay: 0.05,
        onUpdate() {
          const m = `conic-gradient(from -90deg, #000 0deg ${obj.a}deg, transparent ${obj.a}deg 360deg)`;
          el.style.maskImage = m;
          el.style.webkitMaskImage = m;
        },
        onComplete() { el.style.maskImage = ''; el.style.webkitMaskImage = ''; },
      });
    }

    // Total KD counter
    if (totalNumRef.current) {
      const obj = { val: 0 };
      gsap.to(obj, {
        val: brk.total, duration: 0.9, ease: 'power3.out', delay: 0.12,
        onUpdate() { if (totalNumRef.current) totalNumRef.current.textContent = Math.round(obj.val); },
      });
    }

    // Legend number counters — staggered
    const segs = ['gap', 'close', 'achieved'];
    segs.forEach((seg, i) => {
      const el = legNumRefs.current[i];
      if (!el) return;
      const obj = { val: 0 };
      gsap.to(obj, {
        val: brk[seg], duration: 0.75, ease: 'power2.out', delay: 0.22 + i * 0.07,
        onUpdate() { if (el) el.textContent = Math.round(obj.val); },
      });
    });
  }, [isActive]);

  /* GSAP: prog donut entrances — staggered speedometer sweep */
  useEffect(() => {
    if (!isActive) {
      progDonutRefs.current.forEach(el => {
        if (!el) return;
        el.style.maskImage = '';
        el.style.webkitMaskImage = '';
      });
      return;
    }
    progDonutRefs.current.forEach((el, i) => {
      if (!el) return;
      const obj = { a: 0 };
      el.style.maskImage = 'conic-gradient(from -90deg, #000 0deg 0deg, transparent 0deg 360deg)';
      el.style.webkitMaskImage = 'conic-gradient(from -90deg, #000 0deg 0deg, transparent 0deg 360deg)';
      gsap.to(obj, {
        a: 360, duration: 0.75, ease: 'power2.inOut', delay: 0.1 + i * 0.08,
        onUpdate() {
          const m = `conic-gradient(from -90deg, #000 0deg ${obj.a}deg, transparent ${obj.a}deg 360deg)`;
          el.style.maskImage = m;
          el.style.webkitMaskImage = m;
        },
        onComplete() { el.style.maskImage = ''; el.style.webkitMaskImage = ''; },
      });
    });
  }, [isActive, filteredProgs]);

  /* ── dominant segment glow for indicator donut ─────────────── */
  const indGlow = useMemo(() => {
    if (brk.gap >= brk.close && brk.gap >= brk.achieved) return 'gap';
    if (brk.close >= brk.achieved) return 'close';
    return 'achieved';
  }, [brk]);

  /* ── custom SVG indicator donut (glow + rounded caps) ──────── */
  const indSegments = useMemo(() => {
    const CX = 100, CY = 100, R = 72, SW = 19;
    const tot = Math.max(1, brk.gap + brk.close + brk.achieved);
    let deg = 0;
    return ['gap', 'close', 'achieved'].map(k => {
      const sweep = (Math.max(0.8, brk[k]) / tot) * 360;
      const d = _arc(CX, CY, R, deg + 2.5, deg + sweep - 2.5);
      deg += sweep;
      return { k, d, CX, CY, R, SW };
    });
  }, [brk]);

  /* ── top-3 KDs for selected segment ────────────────────────── */
  const top3 = useMemo(() => {
    if (!selectedSeg) return [];
    return getTopKDsByStatus(divisionId, selectedSeg);
  }, [divisionId, selectedSeg]);

  /* ── SVG segment click handler ─────────────────────────────── */
  function handleSegClick(seg) {
    if (!isActive) return;
    setSelectedSeg(prev => prev === seg ? null : seg);
  }

  /* ── status display per KD ──────────────────────────────────── */
  function gapColor(kd) {
    const st = kdStatus(kd);
    if (st === 'neutral') return 'rgba(255,255,255,0.40)';
    return SEG_COLORS[st];
  }

  /* ── top-3 header label ─────────────────────────────────────── */
  const top3HeaderColor =
    selectedSeg === 'gap'      ? SEG_COLORS.gap :
    selectedSeg === 'close'    ? SEG_COLORS.close :
    selectedSeg === 'achieved' ? SEG_COLORS.achieved :
    'rgba(255,255,255,0.45)';

  const top3HeaderText =
    selectedSeg === 'gap'      ? 'TOP CRITICAL' :
    selectedSeg === 'close'    ? 'TOP CAUTION'  :
    'TOP ON TRACK';

  return (
    <>
      {/* ── INDICATOR STATUS CARD ──────────────────────────────── */}
      <div className="lnd-ind-card">
        <div className="lnd-ind-header">
          <span className="lnd-ind-title">INDICATOR STATUS</span>
        </div>

        {/* Donut — custom SVG, glow + rounded caps */}
        <div ref={indDonutRef} style={{ position: 'relative', width: 200, height: 200, margin: '0 auto' }}>
          <svg width="200" height="200" viewBox="0 0 200 200" style={{ display: 'block', overflow: 'visible' }}>
            <defs>
              <filter id="ind-glow-gap"      x="-60%" y="-60%" width="220%" height="220%"><feDropShadow dx="0" dy="0" stdDeviation="5" floodColor="var(--seg-gap)"      floodOpacity="0.75"/></filter>
              <filter id="ind-glow-close"    x="-60%" y="-60%" width="220%" height="220%"><feDropShadow dx="0" dy="0" stdDeviation="5" floodColor="var(--seg-close)"    floodOpacity="0.65"/></filter>
              <filter id="ind-glow-achieved" x="-60%" y="-60%" width="220%" height="220%"><feDropShadow dx="0" dy="0" stdDeviation="5" floodColor="var(--seg-achieved)" floodOpacity="0.65"/></filter>
            </defs>
            {/* track ring */}
            <circle cx="100" cy="100" r="72" fill="none" stroke="var(--seg-track)" strokeWidth="19"/>
            {/* segments */}
            {indSegments.map(({ k, d, SW }) => (
              <path
                key={k}
                d={d}
                stroke={`var(--seg-${k})`}
                strokeWidth={SW}
                fill="none"
                strokeLinecap="round"
                filter={`url(#ind-glow-${k})`}
                style={{ cursor: isActive ? 'pointer' : 'default' }}
                onClick={() => handleSegClick(k)}
              />
            ))}
          </svg>
          <div className="lnd-ind-center">
            <span ref={totalNumRef} className="lnd-ind-total-num">{brk.total}</span>
            <span className="lnd-ind-total-lbl">Indicators</span>
          </div>
        </div>

        {/* Legend rows */}
        <div className="lnd-ind-legend">
          {(['gap', 'close', 'achieved']).map(seg => {
            const count = brk[seg];
            const isRowActive = selectedSeg === seg;
            return (
              <div
                key={seg}
                className={`lnd-ind-leg-row${isRowActive ? ' lnd-ind-leg-row--active' : ''}${isActive ? '' : ''}`}
                style={{ cursor: isActive ? 'pointer' : 'default' }}
                onClick={(e) => {
                  if (!isActive) return;
                  e.stopPropagation();
                  setSelectedSeg(prev => prev === seg ? null : seg);
                }}
              >
                <span className="lnd-ind-leg-dot" style={{ background: SEG_COLORS[seg] }} />
                <span ref={el => { legNumRefs.current[['gap','close','achieved'].indexOf(seg)] = el; }} className="lnd-ind-leg-num">{count}</span>
                <span className="lnd-ind-leg-lbl">{SEG_LABELS[seg]}</span>
              </div>
            );
          })}
        </div>

        {/* Top-3 panel */}
        {selectedSeg && (
          <div ref={top3Ref} className="lnd-ind-top3" style={{ opacity: 0 }}>
            <div
              className="lnd-ind-top3-header"
              style={{ color: top3HeaderColor }}
            >
              {top3HeaderText}
            </div>
            {top3.map((kd, i) => (
              <div
                key={i}
                className="lnd-ind-kd-row"
                onClick={(e) => {
                  e.stopPropagation();
                  if (onKDClick) onKDClick(kd, kd.programmeId);
                }}
              >
                <span className="lnd-ind-kd-name">{kd.indicator}</span>
              </div>
            ))}
          </div>
        )}

        {/* Explore Division CTA — bottom of panel */}
        {onExploreDivision && (
          <button
            className="lnd-ind-cta"
            onClick={(e) => { e.stopPropagation(); onExploreDivision(); }}
          >
            <span>Explore Division</span>
            <span>→</span>
          </button>
        )}
      </div>

      {/* ── PROGRAMME GRID ─────────────────────────────────────── */}
      <div className="lnd-prog-section">
        <p className="lnd-prog-section-label">{sectionLabel}</p>
        <div className="lnd-prog-scroll">
          {filteredProgs.length === 0 && (
            <p className="lnd-prog-empty">No programmes</p>
          )}
          {filteredProgs.map((prog, i) => {
            const pb         = getProgKDBrk(divisionId, prog.id);
            const worstKD    = getWorstKD(divisionId, prog.id);
            const progStatus = computeProgStatus(divisionId, prog.id);
            const sc         = SEG_COLORS[progStatus === 'red' ? 'gap' : progStatus === 'yellow' ? 'close' : 'achieved'];
            const glowSeg    = pb.gap > 0 ? 'gap' : pb.close > 0 ? 'close' : 'achieved';

            const totalKDs = pb.gap + pb.close + pb.achieved;

            const gaps   = getProgKDsByStatus(divisionId, prog.id, 'gap');
            const closes = getProgKDsByStatus(divisionId, prog.id, 'close');
            const achs   = getProgKDsByStatus(divisionId, prog.id, 'achieved');
            const domSeg = gaps.length > 0 ? 'gap' : closes.length > 0 ? 'close' : 'achieved';
            const activePSeg = progActiveSegs[prog.id] ?? domSeg;
            const headerText =
              activePSeg === 'gap'      ? 'TOP CRITICAL' :
              activePSeg === 'close'    ? 'TOP CAUTION'  : 'TOP ON TRACK';
            const segPool = activePSeg === 'gap' ? gaps : activePSeg === 'close' ? closes : achs;
            const pool = segPool.slice(0, 2).map(kd => ({ kd, seg: activePSeg }));

            return (
              <div
                key={prog.id}
                className={`lnd-prog-card lnd-prog-card--${progStatus}`}
                style={{ ...progCardStyle, '--pc-clr': sc }}
                onClick={(e) => {
                  e.stopPropagation();
                  if (worstKD && onKDClick) onKDClick(worstKD, prog.id);
                }}
              >
                {/* Programme name — top of card */}
                <p className="lnd-pc-name">{prog.label || prog.name}</p>

                {/* Speedometer gauge */}
                <div
                  ref={el => { progDonutRefs.current[i] = el; }}
                  style={{ flexShrink: 0, alignSelf: 'center', marginTop: 10 }}
                >
                  <ProgGauge
                    gap={pb.gap}
                    close={pb.close}
                    achieved={pb.achieved}
                    activeSeg={activePSeg}
                    onSegClick={seg => setProgActiveSegs(prev => ({ ...prev, [prog.id]: seg }))}
                  />
                </div>

                {/* Top indicators */}
                {pool.length > 0 && (
                  <div className="lnd-pc-ind-list">
                    <div className="lnd-pc-ind-header" style={{ color: SEG_COLORS[activePSeg] }}>
                      {headerText}
                    </div>
                    {pool.map(({ kd }, j) => (
                      <div
                        key={j}
                        className="lnd-pc-ind-row"
                        onClick={(e) => { e.stopPropagation(); if (onKDClick) onKDClick(kd, prog.id); }}
                      >
                        <span className="lnd-pc-ind-name">{kd.indicator}</span>
                      </div>
                    ))}
                  </div>
                )}

              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
