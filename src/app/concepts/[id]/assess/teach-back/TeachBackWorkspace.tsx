"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Mic, Square, ArrowLeft, Loader2, Play, Pause } from "lucide-react";
import { Card } from "@/components/ui/card";

type State = "idle" | "recording" | "transcribing" | "editing" | "grading" | "reviewing";

interface TeachBackWorkspaceProps {
  concept: {
    id: string;
    name: string;
    description: string;
    material_id: string;
  };
}

export function TeachBackWorkspace({ concept }: TeachBackWorkspaceProps) {
  const router = useRouter();

  const [state, setState] = useState<State>("idle");
  
  // Audio Recording
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const [recordingTime, setRecordingTime] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Transcript & Grading
  const [transcript, setTranscript] = useState("");
  const [grading, setGrading] = useState<any>(null);
  const [audioFeedbackBase64, setAudioFeedbackBase64] = useState<string | null>(null);
  const audioFeedbackRef = useRef<HTMLAudioElement | null>(null);
  const [isPlayingFeedback, setIsPlayingFeedback] = useState(false);

  // Error Handling (Toasts)
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const showError = (msg: string) => {
    setErrorMessage(msg);
    setTimeout(() => setErrorMessage(null), 5000);
  };

  const recognitionRef = useRef<any>(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // 1. Setup MediaRecorder for the High-Quality AI Backend
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await processAudio(audioBlob);
      };

      // 2. Setup Native Web Speech API for Live Preview (Illusion of Live AI)
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        
        recognition.onresult = (event: any) => {
          let currentTranscript = "";
          for (let i = 0; i < event.results.length; i++) {
            currentTranscript += event.results[i][0].transcript;
          }
          setTranscript(currentTranscript);
        };
        
        // Ignore native errors, we rely on MediaRecorder anyway
        recognition.onerror = () => {};
        
        recognition.start();
        recognitionRef.current = recognition;
      }

      mediaRecorder.start();
      setState("recording");
      setRecordingTime(0);
      setTranscript("");
      timerRef.current = setInterval(() => setRecordingTime(t => t + 1), 1000);
    } catch (err: any) {
      console.error("Error accessing microphone", err);
      showError("Could not access microphone. Please ensure permissions are granted.");
      setState("editing");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && state === "recording") {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        recognitionRef.current = null;
      }
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      if (timerRef.current) clearInterval(timerRef.current);
      setState("transcribing");
    }
  };

  const processAudio = async (audioBlob: Blob) => {
    const formData = new FormData();
    formData.append("audio", audioBlob, "recording.webm");
    formData.append("conceptName", concept.name);

    try {
      const res = await fetch("/api/ai/teach-back-transcribe", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || "Failed to transcribe");
      }
      
      setTranscript(data.transcript);
      setState("editing");
    } catch (err: any) {
      console.error("Transcription error:", err);
      showError(err.message || "Failed to transcribe audio.");
      setState("editing");
    }
  };

  const submitTranscript = async () => {
    setState("grading");
    try {
      const gradeRes = await fetch('/api/ai/teach-back-grade', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conceptId: concept.id, transcript })
      });
      
      const gradeData = await gradeRes.json();
      
      if (!gradeRes.ok) {
        if (gradeRes.status === 429 || gradeData.code === 'RATE_LIMIT_EXHAUSTED') {
          throw new Error("Your free plan is exhausted or rate limit hit. Please upgrade.");
        }
        throw new Error(gradeData.error || "Failed to grade explanation");
      }
      
      setGrading(gradeData.grading);

      // Now fetch audio feedback
      try {
        const audioRes = await fetch('/api/ai/teach-back-audio', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            conceptName: concept.name, 
            transcript, 
            grading: gradeData.grading 
          })
        });
        const audioData = await audioRes.json();
        if (audioData.audioBase64) {
          setAudioFeedbackBase64(audioData.audioBase64);
          const mimeType = audioData.mimeType || 'audio/wav';
          const audio = new Audio(`data:${mimeType};base64,${audioData.audioBase64}`);
          audioFeedbackRef.current = audio;
          audio.onended = () => setIsPlayingFeedback(false);
        }
      } catch (audioErr) {
        console.warn("Audio feedback generation skipped:", audioErr);
      }

      setState("reviewing");
    } catch (err: any) {
      console.error(err);
      showError(err.message || "Failed to grade.");
      setState("editing");
    }
  };

  const togglePlayback = () => {
    if (!audioFeedbackRef.current) return;
    if (isPlayingFeedback) {
      audioFeedbackRef.current.pause();
      setIsPlayingFeedback(false);
    } else {
      audioFeedbackRef.current.play();
      setIsPlayingFeedback(true);
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // Render highlighted transcript
  const renderHighlightedText = () => {
    if (!grading || !grading.weak_spots || grading.weak_spots.length === 0) {
      return <p className="leading-relaxed text-lg text-[#2D2A26]">{transcript}</p>;
    }
    
    let highlightedHTML = transcript;
    grading.weak_spots.forEach((spot: any) => {
      const safeQuote = spot.quote.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`(${safeQuote})`, 'gi');
      highlightedHTML = highlightedHTML.replace(regex, `<span class="bg-red-100 border-b-2 border-red-300 relative group cursor-pointer inline-block">$1<span class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block w-64 p-3 bg-[#2D2A26] text-[#F8F4EC] text-sm rounded-xl shadow-xl z-10 font-sans normal-case leading-snug">${spot.correction}</span></span>`);
    });

    return <div dangerouslySetInnerHTML={{ __html: highlightedHTML }} className="leading-relaxed text-lg text-[#2D2A26]" />;
  };

  return (
    <main className="min-h-screen p-8 flex flex-col items-center pt-24 relative" style={{ backgroundColor: "#F8F4EC" }}>
      {/* Toast Notification */}
      {errorMessage && (
        <div className="fixed top-8 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-top-4 fade-in duration-300">
          <div className="bg-red-50 border border-red-200 text-red-800 px-6 py-4 rounded-2xl shadow-xl flex items-center gap-3">
            <span className="font-bold text-sm">{errorMessage}</span>
          </div>
        </div>
      )}
      <div className="max-w-3xl w-full space-y-12">
        
        {/* Header */}
        <div className="flex items-center gap-4 relative">
          <button 
            onClick={() => router.push('/assess')} 
            className="p-2 rounded-full hover:bg-[#EDE8DE] transition-colors absolute -left-16 hidden md:block"
          >
            <ArrowLeft className="w-5 h-5 text-[#2D2A26]" />
          </button>
          <div className="text-center w-full">
            <span className="text-xs font-bold uppercase tracking-widest text-[#8A7D6B] font-mono">Teach It Back</span>
            <h1 className="text-3xl font-bold mt-2 text-[#2D2A26] font-mono">{concept.name}</h1>
          </div>
        </div>

        {/* Listen / Edit Modes */}
        {(state === "idle" || state === "recording" || state === "transcribing" || state === "editing" || state === "grading") && (
          <div className="flex flex-col items-center space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
            
            {state !== "editing" && state !== "grading" && (
              <p className="text-xl text-[#6B6358] text-center max-w-lg leading-relaxed">
                Explain everything you know about this concept in your own words. Tap the microphone when you&apos;re ready.
              </p>
            )}

            {/* The Voice Orb */}
            <div className={`relative flex items-center justify-center transition-all duration-700 ${state === "editing" || state === "grading" ? "scale-50 opacity-50 -my-8" : "scale-100 my-6"}`}>
              {state === "recording" && (
                <div className="absolute inset-0 bg-red-500 rounded-full animate-ping opacity-20" style={{ transform: 'scale(1.5)' }} />
              )}
              
              <button
                onClick={state === "recording" ? stopRecording : startRecording}
                disabled={state === "transcribing" || state === "editing" || state === "grading"}
                className={`w-32 h-32 rounded-full flex flex-col items-center justify-center shadow-2xl transition-all duration-300 z-10
                  ${state === "idle" ? "bg-[#2D2A26] hover:scale-105 text-[#F8F4EC] cursor-pointer" : ""}
                  ${state === "recording" ? "bg-red-500 text-white scale-110 cursor-pointer" : ""}
                  ${state === "transcribing" || state === "grading" ? "bg-[#D0C9BC] text-[#8A7D6B] animate-pulse cursor-wait" : ""}
                  ${state === "editing" ? "bg-[#2D2A26] text-[#F8F4EC] cursor-default" : ""}
                `}
              >
                {state === "idle" && <Mic className="w-10 h-10" />}
                {state === "recording" && <Square className="w-8 h-8 mb-1" />}
                {(state === "transcribing" || state === "grading") && <Loader2 className="w-10 h-10 animate-spin" />}
                {state === "editing" && <Mic className="w-10 h-10" />}

                {state === "recording" && <span className="font-mono text-sm font-bold mt-1">{formatTime(recordingTime)}</span>}
              </button>
            </div>

            {state === "idle" && (
              <button 
                onClick={() => setState("editing")}
                className="text-xs font-mono font-bold text-[#8A7D6B] hover:text-[#2D2A26] underline underline-offset-4"
              >
                Prefer to type instead?
              </button>
            )}

            {state === "transcribing" && (
              <p className="text-[#8A7D6B] font-mono animate-pulse">Polishing your transcript...</p>
            )}

            {/* The Edit Panel */}
            {(state === "editing" || state === "grading") && (
              <div className="w-full space-y-6 animate-in zoom-in-95 duration-500">
                <div className="flex justify-between items-end">
                  <label className="text-sm font-bold uppercase tracking-wider text-[#8A7D6B] font-mono">
                    Your Explanation
                  </label>
                  <span className="text-xs text-[#8A7D6B]">Feel free to edit before submitting</span>
                </div>
                
                <Textarea 
                  value={transcript}
                  onChange={e => setTranscript(e.target.value)}
                  disabled={state === "grading"}
                  placeholder="Type or edit your explanation of this concept here..."
                  className="min-h-[200px] text-lg leading-relaxed p-6 rounded-3xl bg-[#FFFDF8] border-2 border-[#E8E2D8] focus-visible:border-[#2D2A26] focus-visible:ring-0 shadow-sm"
                />
                
                <div className="flex justify-end pt-2">
                  <Button 
                    onClick={submitTranscript}
                    disabled={state === "grading" || !transcript.trim()}
                    className="h-14 rounded-2xl px-10 font-bold font-mono text-lg transition-transform hover:scale-[1.02] active:scale-[0.98] bg-[#2D2A26] text-[#F8F4EC]"
                  >
                    {state === "grading" ? "Tutor is reviewing..." : "Submit for Feedback"}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Feedback Phase */}
        {state === "reviewing" && grading && (
          <div className="space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
            
            {/* AI Audio Feedback Orb */}
            {audioFeedbackBase64 && (
              <div className="flex flex-col items-center justify-center space-y-4 mb-8">
                <button
                  onClick={togglePlayback}
                  className={`w-24 h-24 rounded-full flex items-center justify-center shadow-xl transition-all duration-300 relative
                    ${isPlayingFeedback ? 'bg-indigo-600 text-white scale-110 shadow-indigo-200' : 'bg-[#2D2A26] text-[#F8F4EC] hover:scale-105'}
                  `}
                >
                  {isPlayingFeedback && (
                    <div className="absolute inset-0 bg-indigo-400 rounded-full animate-ping opacity-30" style={{ transform: 'scale(1.4)' }} />
                  )}
                  {isPlayingFeedback ? <Pause className="w-8 h-8 z-10" /> : <Play className="w-8 h-8 z-10" />}
                </button>
                <p className="font-mono text-sm font-bold uppercase tracking-wider text-[#8A7D6B]">
                  {isPlayingFeedback ? "Tutor Speaking..." : "Play Spoken Feedback"}
                </p>
              </div>
            )}

            {/* Metrics Dashboard */}
            <div className="grid grid-cols-3 gap-6">
              {[
                { label: "Accuracy", score: grading.accuracy_score },
                { label: "Completeness", score: grading.completeness_score },
                { label: "Reasoning", score: grading.reasoning_score }
              ].map((m, i) => (
                <Card key={i} className="bg-[#FFFDF8] border-[#E8E2D8] p-6 rounded-3xl flex flex-col items-center text-center shadow-sm">
                  <div className="relative w-20 h-20 mb-4 flex items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                      <circle cx="50" cy="50" r="45" fill="none" stroke="#F0ECE2" strokeWidth="8" />
                      <circle cx="50" cy="50" r="45" fill="none" stroke="#2D2A26" strokeWidth="8" strokeDasharray={`${(m.score / 100) * 283} 283`} className="transition-all duration-1000 ease-out" />
                    </svg>
                    <span className="absolute font-mono font-bold text-xl text-[#2D2A26]">{m.score}</span>
                  </div>
                  <span className="text-xs font-bold uppercase tracking-wider text-[#8A7D6B] font-mono">{m.label}</span>
                </Card>
              ))}
            </div>

            {/* General Feedback */}
            <Card className="bg-[#FFFDF8] border-[#E8E2D8] p-8 rounded-3xl shadow-sm">
              <h3 className="font-mono text-sm font-bold uppercase tracking-wider text-[#8A7D6B] mb-4">Summary</h3>
              <p className="text-lg leading-relaxed text-[#2D2A26]">{grading.general_feedback}</p>
            </Card>

            {/* Highlighted Transcript */}
            <Card className="bg-[#FFFDF8] border-[#E8E2D8] p-8 rounded-3xl shadow-sm">
              <div className="flex justify-between items-end mb-6">
                <h3 className="font-mono text-sm font-bold uppercase tracking-wider text-[#8A7D6B]">Your Transcript</h3>
                {grading.weak_spots?.length > 0 && (
                  <span className="text-xs font-medium bg-red-50 text-red-600 px-3 py-1 rounded-full border border-red-100">Hover highlights for corrections</span>
                )}
              </div>
              {renderHighlightedText()}
            </Card>

            <div className="flex justify-center pb-12">
              <Button 
                onClick={() => router.push('/assess')}
                className="h-14 rounded-2xl px-10 font-bold font-mono text-lg transition-transform hover:scale-[1.02] active:scale-[0.98] bg-transparent border-2 border-[#2D2A26] text-[#2D2A26] hover:bg-[#2D2A26] hover:text-[#F8F4EC]"
              >
                Back to Assessment Hub
              </Button>
            </div>
          </div>
        )}

      </div>
    </main>
  );
}
