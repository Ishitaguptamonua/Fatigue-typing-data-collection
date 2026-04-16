"use client";

import { useState, useEffect, useRef } from "react";
import { v4 as uuidv4 } from "uuid";
import { Play, Activity, Clock, CheckCircle, Keyboard, ChevronRight, UserCircle, User } from "lucide-react";
import { getRandomSentences, calculateAccuracy } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

type GameState = "MENU" | "TYPING" | "FATIGUE" | "RESULTS";

interface Keystroke {
  key: string;
  pressTime: number;
  releaseTime: number;
}

// Keys to filter out for ML processing (done server-side, but tracked for reference)
const VALID_KEY_REGEX = /^[\w\s.,!?'"-]$/;

export default function Home() {
  const [gameState, setGameState] = useState<GameState>("MENU");
  // SSR-safe initial state
  const [participantName, setParticipantName] = useState("");
  const [nameError, setNameError] = useState("");
  const [testSectionId, setTestSectionId] = useState<string>("");
  // Only load from localStorage on client
  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedName = localStorage.getItem("participantName");
      if (storedName) setParticipantName(storedName);
    }
  }, []);

  const [sentences, setSentences] = useState<string[]>([]);
  const [currentSentenceIdx, setCurrentSentenceIdx] = useState(0);
  const [typedChars, setTypedChars] = useState("");
  const [keystrokes, setKeystrokes] = useState<Keystroke[]>([]);

  // Timings
  const [startTime, setStartTime] = useState<number | null>(null);

  // Performance Stats
  const [wpm, setWpm] = useState(0);
  const [errorRate, setErrorRate] = useState(0);

  const [mentalFatigue, setMentalFatigue] = useState(3);
  const [focusLevel, setFocusLevel] = useState(3);
  const [physicalFatigue, setPhysicalFatigue] = useState(3);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Press Tracking
  const activeKeys = useRef<{ [key: string]: number }>({});
  const inputRef = useRef<HTMLInputElement>(null);

  const [realTimeWpm, setRealTimeWpm] = useState(0);
  const [realTimeAccuracy, setRealTimeAccuracy] = useState(100);

  useEffect(() => {
    if (gameState === "TYPING" && startTime) {
      const interval = setInterval(() => {
        const now = Date.now();
        const elapsedMinutes = (now - startTime) / 60000;
        const words = typedChars.length / 5;
        const currentWpm = elapsedMinutes > 0 ? (words / elapsedMinutes) : 0;
        setRealTimeWpm(currentWpm);

        const targetSoFar = sentences.slice(0, currentSentenceIdx).join(" ") + (currentSentenceIdx > 0 ? " " : "") + sentences[currentSentenceIdx].substring(0, Math.min(sentences[currentSentenceIdx].length, typedChars.length - (sentences.slice(0, currentSentenceIdx).join(" ").length + (currentSentenceIdx > 0 ? 1 : 0))));

        if (typedChars.length > 0) {
          const accuracy = calculateAccuracy(targetSoFar, typedChars);
          setRealTimeAccuracy(accuracy);
        }
      }, 500);
      return () => clearInterval(interval);
    }
  }, [gameState, startTime, typedChars, sentences, currentSentenceIdx]);

  const startGame = () => {
    if (!participantName.trim()) {
      setNameError("Please enter your name to begin.");
      return;
    }
    setNameError("");
    // Store participant name in localStorage (client only)
    if (typeof window !== "undefined") {
      localStorage.setItem("participantName", participantName.trim());
    }
    setSentences(getRandomSentences(5));
    setCurrentSentenceIdx(0);
    setTypedChars("");
    setKeystrokes([]);
    // Generate a new TestSectionId and set start time in a client effect
    setGameState("TYPING");
  };

  // Set TestSectionId and startTime only when entering TYPING state (client only)
  useEffect(() => {
    if (gameState === "TYPING") {
      setTestSectionId(uuidv4());
      setStartTime(Date.now());
      setRealTimeWpm(0);
      setRealTimeAccuracy(100);
    }
  }, [gameState]);

  useEffect(() => {
    if (gameState === "TYPING" && inputRef.current) {
      inputRef.current.focus();
    }
  }, [gameState, currentSentenceIdx]);

  const trackKeyPress = (key: string) => {
    if (!activeKeys.current[key]) {
      activeKeys.current[key] = Date.now();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      const currentSentence = sentences[currentSentenceIdx];
      const typedForCurrent = typedChars.substring(sentences.slice(0, currentSentenceIdx).join(" ").length + (currentSentenceIdx > 0 ? 1 : 0));

      if (typedForCurrent.length < currentSentence.length * 0.5) {
        return;
      }

      finishSentence();
      return;
    }

    trackKeyPress(e.key);
  };

  const handleKeyUp = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const pressTime = activeKeys.current[e.key];
    const releaseTime = Date.now();

    if (pressTime && pressTime !== releaseTime) {
      // Only log valid character keys — filter modifier keys
      if (VALID_KEY_REGEX.test(e.key) || e.key === "Backspace") {
        setKeystrokes(prev => [...prev, {
          key: e.key,
          pressTime,
          releaseTime,
          participantId: participantName.trim(),
          testSectionId: testSectionId || ""
        }]);
      }
      delete activeKeys.current[e.key];
    }
  };

  const finishSentence = () => {
    if (currentSentenceIdx < sentences.length - 1) {
      setCurrentSentenceIdx(prev => prev + 1);
      setTypedChars(prev => prev + " ");
    } else {
      finishGame();
    }
  };

  const finishGame = () => {
    const end = Date.now();

    const minutes = (end - (startTime || end)) / 60000;
    const targetText = sentences.join(" ");

    const words = typedChars.length / 5;
    const computedWpm = minutes > 0 ? (words / minutes) : 0;
    setWpm(computedWpm);

    const accuracy = calculateAccuracy(targetText, typedChars.trim());
    setErrorRate(100 - accuracy);

    setGameState("FATIGUE");
  };

  const submitResults = async () => {
    setIsSubmitting(true);
    try {
      await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          participantName: participantName.trim(),
          testSectionId: testSectionId,
          mentalFatigue,
          focusLevel,
          physicalFatigue,
          targetText: sentences.join(" "),
          typedText: typedChars,
          wpm,
          errorRate,
          keystrokes
        })
      });
      setGameState("RESULTS");
    } catch (error) {
      console.error(error);
      alert("Failed to submit results. Please try again.");
    }
    setIsSubmitting(false);
  };

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-slate-100 font-sans selection:bg-indigo-500/30 overflow-hidden relative">
      {/* Background gradients */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-indigo-900/20 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-blue-900/10 blur-[120px] rounded-full" />
      </div>

      <div className="max-w-4xl mx-auto px-6 py-20 min-h-screen flex flex-col justify-center">
        <AnimatePresence mode="wait">
          {/* MENU STATE */}
          {gameState === "MENU" && (
            <motion.div
              key="menu"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="text-center space-y-8"
            >
              <div className="inline-flex items-center justify-center p-4 bg-indigo-500/10 rounded-2xl mb-4 border border-indigo-500/20">
                <Keyboard className="w-12 h-12 text-indigo-400" />
              </div>
              <h1 className="text-5xl font-extrabold tracking-tight bg-gradient-to-br from-white to-slate-400 bg-clip-text text-transparent">
                TypeSense
              </h1>
              <p className="text-xl text-slate-400 max-w-lg mx-auto">
                Help us map keystroke dynamics for cognitive fatigue tracking.
              </p>

              {/* Name Input */}
              <div className="max-w-sm mx-auto pt-4">
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                  <input
                    id="participant-name"
                    type="text"
                    placeholder="Enter your name"
                    value={participantName}
                    onChange={(e) => {
                      setParticipantName(e.target.value);
                      if (e.target.value.trim()) setNameError("");
                    }}
                    onKeyDown={(e) => e.key === "Enter" && startGame()}
                    className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 focus:border-indigo-500/60 rounded-2xl text-white placeholder:text-slate-600 focus:outline-none transition-colors text-lg"
                    autoComplete="off"
                  />
                </div>
                {nameError && (
                  <motion.p
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-2 text-sm text-rose-400 text-left"
                  >
                    {nameError}
                  </motion.p>
                )}
              </div>

              <div className="pt-2">
                <button
                  id="begin-session-btn"
                  onClick={startGame}
                  className="group relative px-8 py-4 bg-indigo-600 hover:bg-indigo-500 transition-all rounded-full font-semibold text-white shadow-[0_0_40px_-10px_rgba(79,70,229,0.5)] hover:shadow-[0_0_60px_-15px_rgba(79,70,229,0.7)] flex items-center gap-3 mx-auto"
                >
                  <Play className="w-5 h-5 fill-current" />
                  Begin Session
                  <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </motion.div>
          )}

          {/* TYPING STATE */}
          {gameState === "TYPING" && (
            <motion.div
              key="typing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="w-full max-w-3xl mx-auto"
            >
              <div className="flex justify-between items-end mb-8">
                <div className="flex flex-col">
                  <div className="text-indigo-400 font-mono text-sm uppercase tracking-widest font-semibold">
                    Sequence {currentSentenceIdx + 1} / {sentences.length}
                  </div>
                  <div className="flex items-center gap-4 mt-2">
                    <div className="flex items-center gap-1.5 px-3 py-1 bg-white/5 rounded-full border border-white/10">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span className="text-xs font-mono font-bold">{Math.round(realTimeWpm)} <span className="text-slate-500 text-[10px]">WPM</span></span>
                    </div>
                    <div className="flex items-center gap-1.5 px-3 py-1 bg-white/5 rounded-full border border-white/10">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                      <span className="text-xs font-mono font-bold text-emerald-400">{Math.round(realTimeAccuracy)}<span className="text-[10px]">%</span></span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-slate-500 font-mono">{participantName}</span>
                  <div className="flex gap-2 items-center">
                    <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                    <span className="text-xs text-slate-500 uppercase tracking-wider font-mono">Recording</span>
                  </div>
                </div>
              </div>

              <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 lg:p-12 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-white/5">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${((currentSentenceIdx) / sentences.length) * 100}%` }}
                    className="h-full bg-indigo-500"
                  />
                </div>

                <h2 className="text-2xl leading-relaxed text-slate-300 font-medium mb-12 select-none">
                  {sentences[currentSentenceIdx]}
                </h2>

                <input
                  ref={inputRef}
                  id="typing-input"
                  type="text"
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck="false"
                  value={typedChars.substring(sentences.slice(0, currentSentenceIdx).join(" ").length + (currentSentenceIdx > 0 ? 1 : 0))}
                  onChange={(e) => {
                    const prevText = sentences.slice(0, currentSentenceIdx).join(" ") + (currentSentenceIdx > 0 ? " " : "");
                    setTypedChars(prevText + e.target.value);
                  }}
                  onKeyDown={handleKeyDown}
                  onKeyUp={handleKeyUp}
                  className="w-full bg-transparent border-b-2 border-indigo-500/30 focus:border-indigo-400 focus:outline-none text-2xl font-mono pb-4 transition-colors placeholder:text-slate-700"
                  placeholder="Type the sequence and hit Enter..."
                />
              </div>
            </motion.div>
          )}

          {/* FATIGUE ASSESSMENT */}
          {gameState === "FATIGUE" && (
            <motion.div
              key="fatigue"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="max-w-xl mx-auto w-full"
            >
              <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-10 shadow-2xl">
                <h2 className="text-3xl font-bold mb-2 flex items-center gap-3">
                  <Activity className="text-indigo-400" />
                  Cognitive State
                </h2>
                <p className="text-slate-400 mb-10">Rate your current state — this labels your data.</p>

                <div className="space-y-10">
                  <div>
                    <label className="block text-lg font-medium text-slate-200 mb-1">
                      1. How mentally exhausted do you feel?
                    </label>
                    <div className="flex justify-between text-xs text-slate-500 mb-3">
                      <span>Sharp / Rested</span><span>Extremely Exhausted</span>
                    </div>
                    <input
                      type="range" min="1" max="5"
                      value={mentalFatigue} onChange={(e) => setMentalFatigue(parseInt(e.target.value))}
                      className="w-full accent-indigo-500"
                    />
                    <div className="text-center text-indigo-400 font-mono font-bold mt-1">{mentalFatigue}/5</div>
                  </div>

                  <div>
                    <label className="block text-lg font-medium text-slate-200 mb-1">
                      2. How difficult was it to concentrate?
                    </label>
                    <div className="flex justify-between text-xs text-slate-500 mb-3">
                      <span>Very Easy</span><span>Impossible</span>
                    </div>
                    <input
                      type="range" min="1" max="5"
                      value={focusLevel} onChange={(e) => setFocusLevel(parseInt(e.target.value))}
                      className="w-full accent-indigo-500"
                    />
                    <div className="text-center text-indigo-400 font-mono font-bold mt-1">{focusLevel}/5</div>
                  </div>

                  <div>
                    <label className="block text-lg font-medium text-slate-200 mb-1">
                      3. How physically fatigued do you feel?
                    </label>
                    <div className="flex justify-between text-xs text-slate-500 mb-3">
                      <span>Rested</span><span>Physically Drained</span>
                    </div>
                    <input
                      type="range" min="1" max="5"
                      value={physicalFatigue} onChange={(e) => setPhysicalFatigue(parseInt(e.target.value))}
                      className="w-full accent-indigo-500"
                    />
                    <div className="text-center text-indigo-400 font-mono font-bold mt-1">{physicalFatigue}/5</div>
                  </div>
                </div>

                <button
                  id="submit-results-btn"
                  onClick={submitResults}
                  disabled={isSubmitting}
                  className="w-full mt-12 py-4 bg-white text-black font-semibold rounded-xl hover:bg-slate-200 transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? "Syncing..." : "Submit & View Results"}
                </button>
              </div>
            </motion.div>
          )}

          {/* RESULTS STATE */}
          {gameState === "RESULTS" && (
            <motion.div
              key="results"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="max-w-2xl mx-auto w-full"
            >
              <div className="bg-gradient-to-b from-indigo-500/10 to-transparent border border-indigo-500/20 rounded-3xl p-12 text-center relative overflow-hidden">
                <CheckCircle className="w-16 h-16 text-emerald-400 mx-auto mb-6" />
                <h2 className="text-4xl font-bold mb-2">Session Complete</h2>
                <p className="text-slate-400 mb-2">
                  Telemetry synced for <span className="text-indigo-400 font-semibold">{participantName}</span>.
                </p>
                <p className="text-slate-600 text-sm mb-12">Keystroke data processed into ML-ready segments.</p>

                <div className="grid grid-cols-2 gap-6 mb-12">
                  <div className="bg-black/40 backdrop-blur-md rounded-2xl p-6 border border-white/5">
                    <div className="text-slate-400 text-sm font-medium mb-1 uppercase tracking-wider">Speed</div>
                    <div className="text-5xl font-mono font-light text-white">{Math.round(wpm)} <span className="text-xl text-slate-500">WPM</span></div>
                  </div>
                  <div className="bg-black/40 backdrop-blur-md rounded-2xl p-6 border border-white/5">
                    <div className="text-slate-400 text-sm font-medium mb-1 uppercase tracking-wider">Accuracy</div>
                    <div className="text-5xl font-mono font-light text-emerald-400">{Math.max(0, 100 - errorRate).toFixed(1)}<span className="text-xl">%</span></div>
                  </div>
                </div>

                <div className="flex flex-col items-center gap-4">
                  <button
                    id="new-session-btn"
                    onClick={() => setGameState("MENU")}
                    className="px-8 py-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors font-medium"
                  >
                    New Session
                  </button>

                  <a href="/admin" className="text-sm text-indigo-400/50 hover:text-indigo-400 transition-colors flex items-center gap-2">
                    <UserCircle className="w-4 h-4" /> Admin Access
                  </a>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}
