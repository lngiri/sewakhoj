"use client";

import { useState, useCallback, useRef, useEffect } from "react";

// ─── Beep patterns (exact replica from useBookingRealtime.ts) ───

function playTone(frequency: number, durationMs: number, gainPeak = 0.2) {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(frequency, ctx.currentTime);
    g.gain.setValueAtTime(0.0001, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(gainPeak, ctx.currentTime + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + durationMs / 1000 - 0.05);
    o.connect(g);
    g.connect(ctx.destination);
    o.start();
    setTimeout(() => { o.stop(); ctx.close(); }, durationMs);
  } catch (_e) { /* ignore */ }
}

function beepSent() {
  playTone(1047, 200, 0.12); // C6, short, quiet
}

function beepAccepted() {
  playTone(659, 180, 0.18);  // E5
  setTimeout(() => playTone(880, 350, 0.22), 150); // A5
}

function beepDeclined() {
  playTone(392, 200, 0.2);   // G4
  setTimeout(() => playTone(262, 400, 0.18), 160); // C4
}

function beepUrgent() {
  playTone(880, 160, 0.22);
  setTimeout(() => playTone(1175, 280, 0.25), 130); // D6
}

// ─── Pattern metadata for display ───

interface BeepPattern {
  id: string;
  label: string;
  icon: string;
  description: string;
  trigger: () => void;
  frequencies: { note: string; hz: number; ms: number; gain: number }[];
  event: string;
  tone: "positive" | "negative" | "neutral" | "urgent";
}

const PATTERNS: BeepPattern[] = [
  {
    id: "sent",
    label: "Booking Sent",
    icon: "📤",
    description: "Customer sends a booking request — light informational ping",
    trigger: beepSent,
    frequencies: [{ note: "C6", hz: 1047, ms: 200, gain: 0.12 }],
    event: "handleBookingInsert → pending_acceptance",
    tone: "neutral",
  },
  {
    id: "accepted",
    label: "Booking Accepted",
    icon: "✅",
    description: "Tasker accepts — positive rising two-tone celebration",
    trigger: beepAccepted,
    frequencies: [
      { note: "E5", hz: 659, ms: 180, gain: 0.18 },
      { note: "A5", hz: 880, ms: 350, gain: 0.22 },
    ],
    event: "handleBookingUpdate → accepted (from pending_acceptance)",
    tone: "positive",
  },
  {
    id: "declined",
    label: "Booking Declined / Cancelled",
    icon: "❌",
    description: "Booking declined or cancelled — low descending sad tone",
    trigger: beepDeclined,
    frequencies: [
      { note: "G4", hz: 392, ms: 200, gain: 0.2 },
      { note: "C4", hz: 262, ms: 400, gain: 0.18 },
    ],
    event: "handleBookingUpdate → declined || handleTaskerBookingUpdate → cancelled",
    tone: "negative",
  },
  {
    id: "urgent",
    label: "New Request (Tasker)",
    icon: "⚡",
    description: "New booking request for tasker — fast urgent double-beep",
    trigger: beepUrgent,
    frequencies: [
      { note: "A5", hz: 880, ms: 160, gain: 0.22 },
      { note: "D6", hz: 1175, ms: 280, gain: 0.25 },
    ],
    event: "handleTaskerBookingInsert → pending_acceptance",
    tone: "urgent",
  },
];

// ─── Component ───

export default function BeepDebugPage() {
  const [lastBeep, setLastBeep] = useState<string | null>(null);
  const [beepLog, setBeepLog] = useState<string[]>([]);
  const [forceHidden, setForceHidden] = useState(false);
  const [lastPlayedAt, setLastPlayedAt] = useState<number | null>(null);
  const [isPageFocused, setIsPageFocused] = useState(true);
  const logEndRef = useRef<HTMLDivElement>(null);

  // Track page visibility/focus state (avoids SSR document access)
  useEffect(() => {
    if (typeof document !== "undefined") {
      setIsPageFocused(document.hasFocus() && !document.hidden);
      const update = () => setIsPageFocused(document.hasFocus() && !document.hidden);
      window.addEventListener("focus", update);
      window.addEventListener("blur", update);
      document.addEventListener("visibilitychange", update);
      return () => {
        window.removeEventListener("focus", update);
        window.removeEventListener("blur", update);
        document.removeEventListener("visibilitychange", update);
      };
    }
  }, []);

  const play = useCallback((pattern: BeepPattern) => {
    setLastBeep(pattern.id);
    setLastPlayedAt(Date.now());
    setBeepLog((prev) =>
      [`${new Date().toLocaleTimeString()} — ${pattern.icon} ${pattern.label}`, ...prev].slice(0, 50)
    );

    if (forceHidden) {
      // Mock "hidden" state — force-play regardless of focus
      pattern.trigger();
    } else {
      // Respect the original logic: only play if page is hidden/unfocused
      if (document.hidden || !document.hasFocus()) {
        pattern.trigger();
      } else {
        // Show a warning that beep is suppressed
        const warning = `${new Date().toLocaleTimeString()} — ⚠️ ${pattern.label} SUPPRESSED (page is focused). Toggle \"Force play\" to override.`;
        setBeepLog((prev) => [warning, ...prev].slice(0, 50));
      }
    }
  }, [forceHidden]);

  const playCustom = useCallback(() => {
    const freq = Math.round(Math.random() * 800 + 200);
    playTone(freq, 300, 0.15);
    setLastBeep("custom");
    setLastPlayedAt(Date.now());
    setBeepLog((prev) =>
      [`${new Date().toLocaleTimeString()} — 🎵 Custom tone ${freq}Hz`, ...prev].slice(0, 50)
    );
  }, []);



  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-3 px-4 py-2 bg-white/5 rounded-full text-xs font-mono text-white/40 mb-6 border border-white/5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            src/app/debug/beeps/page.tsx
          </div>
          <h1 className="text-5xl font-black tracking-tight mb-4">
            Beep Pattern <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-rose-500">Debug Console</span>
          </h1>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto leading-relaxed">
            Manual QA triggers for all booking event beep sounds. Click any button to play the corresponding notification tone.
            Beeps are <em className="text-amber-300 not-italic">suppressed</em> when the page is focused —
            toggle &ldquo;Force play&rdquo; to override.
          </p>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center justify-center gap-4 mb-10">
          <label className="flex items-center gap-3 px-5 py-3 bg-white/5 rounded-2xl border border-white/10 cursor-pointer hover:bg-white/10 transition-colors select-none">
            <input
              type="checkbox"
              checked={forceHidden}
              onChange={(e) => setForceHidden(e.target.checked)}
              className="w-5 h-5 rounded-lg accent-amber-500"
            />
            <span className="text-sm font-bold text-white/80">
              {forceHidden ? "🔊 Force play" : "🔇 Respect focus"}
            </span>
          </label>

          <button
            onClick={playCustom}
            className="flex items-center gap-2 px-5 py-3 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/10 text-sm font-bold text-white/60 hover:text-white/80 transition-all"
          >
            🎲 Random tone
          </button>

          <button
            onClick={() => { setBeepLog([]); setLastBeep(null); setLastPlayedAt(null); }}
            className="flex items-center gap-2 px-5 py-3 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/10 text-sm font-bold text-white/60 hover:text-white/80 transition-all"
          >
            🗑️ Clear log
          </button>

          {/* Focus status indicator */}
          {!forceHidden && (
            <div className="flex items-center gap-2 px-4 py-2 rounded-full text-xs font-mono bg-white/5 border border-white/10">
              <span className={`w-2 h-2 rounded-full ${isPageFocused ? 'bg-emerald-400' : 'bg-amber-400'}`} />
              {isPageFocused ? "focused" : "hidden"}
            </div>
          )}
        </div>

        {/* Beep pattern buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
          {PATTERNS.map((pattern) => {
            const isActive = lastBeep === pattern.id;
            const toneColors = {
              positive: "from-emerald-500/20 to-emerald-600/5 border-emerald-500/30 hover:border-emerald-400/50",
              negative: "from-red-500/20 to-red-600/5 border-red-500/30 hover:border-red-400/50",
              neutral: "from-blue-500/20 to-blue-600/5 border-blue-500/30 hover:border-blue-400/50",
              urgent: "from-amber-500/20 to-amber-600/5 border-amber-500/30 hover:border-amber-400/50",
            };

            return (
              <button
                key={pattern.id}
                onClick={() => play(pattern)}
                className={`relative group text-left p-6 rounded-3xl bg-gradient-to-br ${toneColors[pattern.tone]} border backdrop-blur-sm transition-all duration-300 ${
                  isActive ? "scale-[1.02] shadow-2xl ring-2 ring-white/20" : "hover:scale-[1.01]"
                }`}
              >
                {/* Active indicator */}
                {isActive && (
                  <span className="absolute top-3 right-3 flex items-center gap-1.5 text-[10px] font-mono text-white/40">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    PLAYING
                  </span>
                )}

                {/* Icon + Label */}
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-2xl">{pattern.icon}</span>
                  <span className="font-black text-lg">{pattern.label}</span>
                </div>

                {/* Description */}
                <p className="text-sm text-white/60 mb-4 leading-relaxed">{pattern.description}</p>

                {/* Frequency details */}
                <div className="space-y-1.5">
                  {pattern.frequencies.map((f, i) => (
                    <div key={i} className="flex items-center gap-3 text-xs font-mono">
                      <span className="w-20 text-white/40">{f.note}</span>
                      <div className="flex-1 h-5 bg-white/5 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-150"
                          style={{
                            width: `${(f.hz / 1200) * 100}%`,
                            background: isActive
                              ? `linear-gradient(90deg, rgba(251,191,36,0.6), rgba(251,191,36,0.3))`
                              : `linear-gradient(90deg, rgba(255,255,255,0.15), rgba(255,255,255,0.05))`,
                          }}
                        />
                      </div>
                      <span className="w-32 text-right text-white/40">
                        {f.hz}Hz · {f.ms}ms · g{f.gain}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Event label */}
                <div className="mt-4 pt-3 border-t border-white/5">
                  <span className="text-[10px] font-mono text-white/20 leading-tight block">
                    {pattern.event}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Waveform visualizer area */}
        {lastPlayedAt && (
          <div className="mb-10 p-6 rounded-3xl bg-white/[0.02] border border-white/5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-white/40 uppercase tracking-widest">
                Last triggered <span className="text-white/80">{new Date(lastPlayedAt).toLocaleTimeString()}</span>
              </h3>
            </div>
            <div className="relative h-24 rounded-2xl bg-white/[0.02] overflow-hidden">
              {/* Animated waveform bars */}
              <div className="absolute inset-0 flex items-center justify-center gap-[3px] px-8">
                {Array.from({ length: 80 }).map((_, i) => {
                  const height = Math.random() * 60 + 10;
                  const isRecent = i < (lastBeep === "accepted" || lastBeep === "urgent" ? 60 : 30);
                  return (
                    <div
                      key={i}
                      className="w-[3px] rounded-full transition-all duration-700"
                      style={{
                        height: `${isRecent ? height : 4}px`,
                        background: isRecent
                          ? `linear-gradient(to top, rgba(251,191,36,${0.1 + (i / 80) * 0.4}), rgba(251,191,36,0.05))`
                          : "rgba(255,255,255,0.03)",
                        animation: isRecent ? `waveform 1.2s ease-in-out ${i * 15}ms` : "none",
                      }}
                    />
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Beep log */}
        <div className="rounded-3xl bg-white/[0.02] border border-white/5 overflow-hidden">
          <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
            <h3 className="text-xs font-bold text-white/40 uppercase tracking-widest">
              Event log <span className="text-white/20">({beepLog.length})</span>
            </h3>
            <span className="text-[10px] font-mono text-white/20">most recent first</span>
          </div>
          <div className="p-4 max-h-64 overflow-y-auto space-y-1">
            {beepLog.length === 0 ? (
              <p className="text-sm text-white/20 text-center py-8 font-mono">
                No beeps triggered yet. Click a button above.
              </p>
            ) : (
              beepLog.map((entry, i) => (
                <div
                  key={i}
                  className={`text-xs font-mono px-3 py-2 rounded-xl ${
                    entry.includes("SUPPRESSED")
                      ? "bg-amber-500/10 text-amber-300/80"
                      : entry.includes("custom")
                        ? "bg-white/5 text-white/60"
                        : "bg-white/5 text-white/70"
                  }`}
                >
                  {entry}
                </div>
              ))
            )}
            <div ref={logEndRef} />
          </div>
        </div>

        {/* Footer */}
        <div className="mt-10 text-center">
          <p className="text-xs font-mono text-white/20">
            Frequencies: C6=1047Hz · E5=659Hz · A5=880Hz · G4=392Hz · C4=262Hz · D6=1175Hz
          </p>
        </div>
      </div>

      {/* Keyframes for waveform animation */}
      <style jsx>{`
        @keyframes waveform {
          0%, 100% { opacity: 0.3; transform: scaleY(0.6); }
          50% { opacity: 1; transform: scaleY(1); }
        }
      `}</style>
    </main>
  );
}
