"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useChat } from "@ai-sdk/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";
import {
  MessageSquare,
  HelpCircle,
  Lightbulb,
  BrainCircuit,
  Clock,
  CheckCircle2,
  AlertCircle,
  Maximize2,
  Minimize2,
  ChevronDown,
  Send,
  X,
  ArrowLeft,
  PanelRightClose,
  PanelRightOpen,
  Headphones,
} from "lucide-react";
import dynamic from "next/dynamic";
import type { PDFViewerHandle } from "@/components/PDFViewer";

const PDFThumbnailSidebar = dynamic(() => import("@/components/PDFThumbnailSidebar"), {
  ssr: false,
});
const PDFViewer = dynamic(() => import("@/components/PDFViewer"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[500px] w-full items-center justify-center font-mono text-gray-500">
      Initializing document viewer...
    </div>
  ),
});

// ─── Smooth Streaming Text ─────────────────────────────────────────
function SmoothMessageText({ text, isStreaming }: { text: string; isStreaming: boolean }) {
  const [displayedLength, setDisplayedLength] = useState(isStreaming ? 0 : text.length);

  useEffect(() => {
    if (!isStreaming) {
      setDisplayedLength(text.length);
      return;
    }
    if (displayedLength < text.length) {
      const remaining = text.length - displayedLength;
      const step = Math.max(1, Math.min(remaining, Math.ceil(remaining / 3)));
      const timer = setTimeout(() => {
        setDisplayedLength((prev) => Math.min(text.length, prev + step));
      }, 20);
      return () => clearTimeout(timer);
    }
  }, [text, displayedLength, isStreaming]);

  const visibleText = isStreaming ? text.slice(0, displayedLength) : text;

  return (
    <span>
      {visibleText}
      {isStreaming && (
        <span
          className="inline-block w-1.5 h-3.5 ml-0.5 align-middle animate-pulse rounded-xs"
          style={{ backgroundColor: "#2D2A26" }}
        />
      )}
    </span>
  );
}

// ─── Main Component ─────────────────────────────────────────────────
interface StudyWorkspaceProps {
  material: any;
  sessionId: string;
  concepts?: any[];
  pdfUrl?: string | null;
  initialAudioUrl?: string | null;
}

export function StudyWorkspace({
  material,
  sessionId,
  concepts = [],
  pdfUrl,
  initialAudioUrl,
}: StudyWorkspaceProps) {
  const router = useRouter();

  // ── Core state ──
  const [selectedText, setSelectedText] = useState("");
  const [input, setInput] = useState("");
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(true);
  const [modalState, setModalState] = useState<{isOpen: boolean, title: string, desc: string}>({isOpen: false, title: '', desc: ''});

  // ── Quick-action dropdown ──
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // ── Page & Reading Depth tracking ──
  const isPdf = material.source_type === 'uploaded_doc' && !!pdfUrl;
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [maxScrollProgress, setMaxScrollProgress] = useState(0.2); // Start with initial 20% visible
  const [activeDwellSeconds, setActiveDwellSeconds] = useState(0);
  const [testedConceptIds, setTestedConceptIds] = useState<string[]>([]);
  const lastActiveRef = useRef<number>(Date.now());
  const readerRef = useRef<HTMLDivElement>(null);
  const pdfViewerRef = useRef<PDFViewerHandle>(null);

  // ── Audio Overview State ──
  const [isAudioLoading, setIsAudioLoading] = useState(false);
  const [audioOverviewUrl, setAudioOverviewUrl] = useState<string | null>(null);

  // ── Checkpoint state ──
  const [checkpointActive, setCheckpointActive] = useState(false);
  const [checkpointConcept, setCheckpointConcept] = useState<any>(null);
  const [checkpointStatus, setCheckpointStatus] = useState<
    "idle" | "generating" | "answering" | "grading" | "feedback"
  >("idle");
  const [checkpointQuestion, setCheckpointQuestion] = useState("");
  const [checkpointAnswer, setCheckpointAnswer] = useState("");
  const [checkpointFeedback, setCheckpointFeedback] = useState<any>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const { messages, sendMessage, status } = useChat();

  // ── Activity Tracker (detects active reading vs idle) ──
  useEffect(() => {
    const markActive = () => {
      lastActiveRef.current = Date.now();
    };
    window.addEventListener("mousemove", markActive);
    window.addEventListener("scroll", markActive);
    window.addEventListener("keydown", markActive);
    return () => {
      window.removeEventListener("mousemove", markActive);
      window.removeEventListener("scroll", markActive);
      window.removeEventListener("keydown", markActive);
    };
  }, []);

  // ── Active Dwell & Auto-Trigger Timer ──
  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedTime((p) => p + 1);
      // Accumulate active dwell time only if active within last 45s
      const isRecentlyActive = Date.now() - lastActiveRef.current < 45000;
      if (isRecentlyActive && !checkpointActive) {
        setActiveDwellSeconds((prev) => prev + 1);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [checkpointActive]);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60)
      .toString()
      .padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return h > 0 ? `${h}:${m}:${s}` : `${m}:${s}`;
  };

  // ── Page tracking & Reading Depth ──
  const paragraphs = material.raw_content
    ? material.raw_content.split("\\n").filter((p: string) => p.trim())
    : [];
  const PARAGRAPHS_PER_PAGE = 8;

  useEffect(() => {
    if (!isPdf) {
      setTotalPages(Math.max(1, Math.ceil(paragraphs.length / PARAGRAPHS_PER_PAGE)));
    }
  }, [paragraphs.length, isPdf]);

  const handleReaderScroll = useCallback(() => {
    if (isPdf) return; // Managed by PDFViewer IntersectionObserver
    const el = readerRef.current;
    if (!el) return;
    lastActiveRef.current = Date.now();
    const scrollRatio = el.scrollTop / Math.max(1, el.scrollHeight - el.clientHeight);
    const page = Math.min(totalPages, Math.max(1, Math.ceil(scrollRatio * totalPages) || 1));
    setCurrentPage(page);
    setMaxScrollProgress((prev) => Math.max(prev, scrollRatio));
  }, [totalPages, isPdf]);

  const handlePdfPageVisible = useCallback((page: number) => {
    lastActiveRef.current = Date.now();
    setCurrentPage(page);
    setMaxScrollProgress((prev) => Math.max(prev, page / Math.max(1, totalPages)));
  }, [totalPages]);

  // ── Fullscreen toggle ──
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  // ── Text selection → smart dropdown ──
  useEffect(() => {
    const handleSelection = () => {
      const selection = window.getSelection();
      const text = selection?.toString().trim();
      if (text && text.length > 0) {
        setSelectedText(text);
        setDropdownOpen(true); // auto-open quick actions on highlight
      }
    };
    document.addEventListener("mouseup", handleSelection);
    return () => document.removeEventListener("mouseup", handleSelection);
  }, []);

  // ── Close dropdown on outside click ──
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ── Auto-scroll chat ──
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, status]);

  useEffect(() => {
    if (status === "streaming") {
      const interval = setInterval(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
      return () => clearInterval(interval);
    }
  }, [status]);

  // ── Handlers ──
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    const content = input;
    setInput("");
    await sendMessage(
      { role: "user", parts: [{ type: "text", text: content }] },
      { body: { sessionId, materialId: material.id, selectedContext: selectedText } }
    );
  };

  const handleQuickAction = (action: string) => {
    const prompts: Record<string, string> = {
      explain: "Explain this concept simply.",
      example: "Give me a real-world example of this.",
      hint: "Give me a hint to help me understand this.",
      quiz: "Quiz me on this to see if I understand it.",
    };
    setDropdownOpen(false);
    sendMessage(
      { role: "user", parts: [{ type: "text", text: prompts[action] }] },
      { body: { sessionId, materialId: material.id, selectedContext: selectedText } }
    );
  };

  const handleEndSession = () => router.push(`/materials/${material.id}/report/${sessionId}`);

  // ── Smart Concept Selector (based on Reading Depth) ──
  const getSmartEligibleConcept = useCallback(() => {
    if (!concepts || concepts.length === 0) return null;

    const raw = material.raw_content || "";
    // Calculate approximate position of each concept in the text (0.0 to 1.0)
    const conceptsWithPos = concepts.map((c: any, index: number) => {
      let pos = (index + 0.5) / concepts.length;
      if (c.location_marker && raw.includes(c.location_marker)) {
        pos = raw.indexOf(c.location_marker) / Math.max(1, raw.length);
      }
      return { ...c, pos };
    });

    // Eligible concepts are those at or before the user's max scroll depth (+ 15% buffer for visible screen)
    const reachedThreshold = Math.min(1.0, maxScrollProgress + 0.15);
    const eligible = conceptsWithPos.filter((c: any) => c.pos <= reachedThreshold);

    // Prioritize eligible concepts that haven't been tested yet
    const untestedEligible = eligible.filter((c: any) => !testedConceptIds.includes(c.id));
    if (untestedEligible.length > 0) {
      return untestedEligible[Math.floor(Math.random() * untestedEligible.length)];
    }

    // If all eligible tested, pick from all eligible
    if (eligible.length > 0) {
      return eligible[Math.floor(Math.random() * eligible.length)];
    }

    // Fallback to first concept
    return concepts[0];
  }, [concepts, material.raw_content, maxScrollProgress, testedConceptIds]);

  // ── Checkpoint Triggering ──
  const triggerCheckpoint = async (forcedConcept?: any) => {
    let concept = forcedConcept || getSmartEligibleConcept();
      
    if (!concept) {
      concept = {
        id: "mock-concept-id",
        name: "Introduction & Overview",
        location_marker: "Section 1",
        description: "Core overview of the document concepts."
      };
    }

    setCheckpointConcept(concept);
    setCheckpointActive(true);
    setCheckpointStatus("generating");
    setCheckpointQuestion("");
    setCheckpointAnswer("");
    setCheckpointFeedback(null);
    setActiveDwellSeconds(0); // Reset active dwell timer
    
    if (concept.id === "mock-concept-id") {
      setTimeout(() => {
        setCheckpointQuestion(`What is the main purpose of ${concept.name}? Explain in your own words.`);
        setCheckpointStatus("answering");
      }, 1000);
      return;
    }

    try {
      const res = await fetch("/api/ai/recall-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conceptId: concept.id }),
      });
      const data = await res.json();
      setCheckpointQuestion(data.question);
      setCheckpointStatus("answering");
      setTestedConceptIds((prev) => Array.from(new Set([...prev, concept.id])));
    } catch {
      setCheckpointActive(false);
    }
  };

  // ── Auto-trigger after 2.5 minutes of active reading ──
  useEffect(() => {
    if (activeDwellSeconds >= 150 && !checkpointActive && concepts && concepts.length > 0) {
      triggerCheckpoint();
    }
  }, [activeDwellSeconds, checkpointActive, concepts]);

  const submitCheckpoint = async (customAnswer?: string) => {
    const answerToSubmit = customAnswer || checkpointAnswer;
    if (!answerToSubmit.trim()) return;
    setCheckpointStatus("grading");
    
    if (checkpointConcept.id === "mock-concept-id") {
      setTimeout(() => {
        setCheckpointFeedback({
          accuracy: 90,
          completeness: 85,
          feedback_text: "Good recall of the introductory concepts.",
          misconceptions: []
        });
        setCheckpointStatus("feedback");
      }, 1500);
      return;
    }

    try {
      const res = await fetch("/api/ai/recall-grade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conceptId: checkpointConcept.id,
          question: checkpointQuestion,
          userAnswer: answerToSubmit,
          sessionId,
        }),
      });
      const data = await res.json();
      setCheckpointFeedback(data);
      setCheckpointStatus("feedback");
    } catch {
      setCheckpointStatus("answering");
    }
  };

  // ── Two-Tier Skip Handlers ──
  // 1. "Haven't read yet" -> Closes without penalty
  const handleSkipNotRead = () => {
    setCheckpointActive(false);
    setCheckpointStatus("idle");
    setActiveDwellSeconds(0);
  };

  // 2. "I don't remember" -> Logs 0% recall failure to capture knowledge gap
  const handleSkipForgot = () => {
    submitCheckpoint("I do not remember this concept or how it works.");
  };

  const closeCheckpoint = () => {
    setCheckpointActive(false);
    setCheckpointStatus("idle");
    setActiveDwellSeconds(0);
  };

  // ── Keyboard shortcut: Enter to send (Shift+Enter for newline) ──
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as any);
    }
  };

  const handleCreateAudioOverview = async () => {
    setIsAudioLoading(true);
    try {
      const res = await fetch('/api/ai/audio-overview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ materialId: material.id }),
      });
      if (!res.ok) throw new Error("Audio generation failed");
      const data = await res.json();
      setAudioOverviewUrl(data.audioUrl);
    } catch (err) {
      console.error(err);
      setModalState({ isOpen: true, title: "Audio Error", desc: "Failed to generate audio overview." });
    } finally {
      setIsAudioLoading(false);
    }
  };

  // ── Render ──
  return (
    <>
      {/* ═══════════════════ TOP BAR ═══════════════════ */}
      <div
        className="fixed top-0 left-0 right-0 h-12 flex items-center justify-between px-4 z-50 border-b"
        style={{ backgroundColor: "#FFFDF8", borderColor: "#E8E2D8" }}
      >
        {/* Left: back + title */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => router.push("/library")}
            className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wider opacity-60 hover:opacity-100 transition-opacity shrink-0"
            style={{ color: "#2D2A26", fontFamily: "var(--font-space-mono)" }}
          >
            <ArrowLeft className="w-3.5 h-3.5" />
          </button>
          <span
            className="text-sm font-bold truncate"
            style={{ color: "#2D2A26", fontFamily: "var(--font-space-mono)" }}
          >
            {material.title || "Untitled"}
          </span>
        </div>

        {/* Center: page indicator */}
        <div className="absolute left-1/2 -translate-x-1/2 flex items-center">
          <div
            className="flex items-center gap-1 text-xs font-bold px-3 py-1 rounded-full"
            style={{
              backgroundColor: "#F0ECE2",
              color: "#2D2A26",
              fontFamily: "var(--font-space-mono)",
            }}
          >
            <span className="opacity-100">{String(currentPage).padStart(2, "0")}</span>
            <span className="opacity-40">/</span>
            <span className="opacity-40">{String(totalPages).padStart(2, "0")}</span>
          </div>
        </div>

        {/* Right: timer + actions */}
        <div className="flex items-center gap-2 shrink-0">
          {audioOverviewUrl ? (
            <audio controls src={audioOverviewUrl} className="h-8 w-48 mr-2" />
          ) : (
            <button
              onClick={handleCreateAudioOverview}
              disabled={isAudioLoading}
              className="text-xs font-bold px-2.5 py-1 rounded-full border transition-colors hover:bg-blue-50 border-blue-200 text-blue-600 flex items-center gap-1.5 mr-2 disabled:opacity-50"
            >
              {isAudioLoading ? (
                <div className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              ) : (
                <Headphones className="w-3 h-3" />
              )}
              {isAudioLoading ? "Generating..." : "Audio Overview"}
            </button>
          )}

          <div
            className="flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full"
            style={{
              backgroundColor: "#F0ECE2",
              color: "#2D2A26",
              fontFamily: "var(--font-space-mono)",
            }}
          >
            <Clock className="w-3 h-3 opacity-50" />
            {formatTime(elapsedTime)}
          </div>

          <button
            onClick={triggerCheckpoint}
            className="text-xs font-bold px-2.5 py-1 rounded-full border border-dashed transition-colors hover:bg-[#F0ECE2]"
            style={{
              borderColor: "#D0C9BC",
              color: "#8A7D6B",
              fontFamily: "var(--font-space-mono)",
            }}
          >
            Checkpoint
          </button>

          <button
            onClick={() => setIsChatOpen(!isChatOpen)}
            className="p-1.5 rounded-lg hover:bg-[#F0ECE2] transition-colors ml-1"
            style={{ color: "#8A7D6B" }}
            title="Toggle Chat Panel"
          >
            {isChatOpen ? <PanelRightClose className="w-4 h-4" /> : <PanelRightOpen className="w-4 h-4" />}
          </button>

          <button
            onClick={toggleFullscreen}
            className="p-1.5 rounded-lg hover:bg-[#F0ECE2] transition-colors"
            style={{ color: "#8A7D6B" }}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          <button
            onClick={handleEndSession}
            className="text-xs font-bold px-3 py-1.5 rounded-full transition-all hover:scale-[1.02] active:scale-[0.98]"
            style={{
              backgroundColor: "#2D2A26",
              color: "#F8F4EC",
              fontFamily: "var(--font-space-mono)",
            }}
          >
            End Session
          </button>
        </div>
      </div>

      {/* ═══════════════════ WORKSPACE ═══════════════════ */}
      <div
        className={`flex h-screen pt-12 transition-all duration-300 ${checkpointActive ? "blur-sm pointer-events-none" : ""}`}
        style={{ backgroundColor: "#F5F1E8" }}
      >
        {isPdf && (
          <PDFThumbnailSidebar
            url={pdfUrl!}
            numPages={totalPages}
            currentPage={currentPage}
            onSelectPage={(p) => pdfViewerRef.current?.scrollToPage(p)}
          />
        )}
        
        {/* ─── LEFT PANE: Document Reader ─── */}
        <div
          ref={readerRef}
          onScroll={handleReaderScroll}
          className={`h-full overflow-y-auto border-r transition-all duration-300 ${isChatOpen ? "w-[55%]" : "w-full"}`}
          style={{ backgroundColor: "#FFFDF8", borderColor: "#E8E2D8" }}
        >
          {isPdf ? (
            <PDFViewer 
              ref={pdfViewerRef}
              url={pdfUrl!}
              onPageVisible={handlePdfPageVisible}
              onDocumentLoadSuccess={setTotalPages}
            />
          ) : (
            <div className="max-w-[680px] mx-auto px-12 py-14">
              {material.source_type === 'uploaded_doc' && !pdfUrl && (
                <div className="mb-6 p-4 rounded-md bg-yellow-50 border border-yellow-200 text-yellow-800 text-sm flex flex-col gap-2">
                  <strong className="font-bold">Original PDF missing</strong>
                  <p>
                    We couldn't load the original PDF file from storage, so we are displaying the extracted text version instead.
                    Please re-upload this document to view the native PDF.
                  </p>
                </div>
              )}
              <h1
                className="text-3xl font-bold mb-8 tracking-tight leading-tight"
                style={{ color: "#2D2A26", fontFamily: "var(--font-space-mono)" }}
              >
                {material.title || "Untitled Document"}
              </h1>

              <div className="prose max-w-none leading-[1.85] space-y-5" style={{ color: "#2D2A26" }}>
                <MarkdownRenderer content={material.raw_content || ""} />
              </div>
            </div>
          )}
        </div>

        {/* ─── RIGHT PANE: Chat Panel ─── */}
        <div 
          className={`h-full flex flex-col transition-all duration-300 ${isChatOpen ? "w-[45%]" : "w-0 overflow-hidden border-none"}`} 
          style={{ backgroundColor: "#F5F1E8" }}
        >
          {/* Panel header with smart dropdown */}
          <div className="px-4 py-2.5 border-b flex items-center justify-between" style={{ borderColor: "#E8E2D8" }}>
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen((p) => !p)}
                className="flex items-center gap-1.5 text-sm font-bold px-3 py-1.5 rounded-lg transition-colors hover:bg-[#EDE8DE]"
                style={{ color: "#2D2A26", fontFamily: "var(--font-space-mono)" }}
              >
                Chat
                <ChevronDown
                  className={`w-3.5 h-3.5 transition-transform ${dropdownOpen ? "rotate-180" : ""}`}
                />
              </button>

              {/* Dropdown menu */}
              {dropdownOpen && (
                <div
                  className="absolute top-full left-0 mt-1 w-48 rounded-xl shadow-lg border overflow-hidden z-50 animate-in fade-in slide-in-from-top-1 duration-150"
                  style={{ backgroundColor: "#FFFDF8", borderColor: "#E8E2D8" }}
                >
                  {selectedText && (
                    <div className="px-3 py-2 border-b" style={{ borderColor: "#E8E2D8" }}>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-[#8A7D6B] mb-1" style={{ fontFamily: "var(--font-space-mono)" }}>
                        Quick Actions
                      </p>
                      <p className="text-xs text-[#8A7D6B] truncate italic">
                        &ldquo;{selectedText.length > 40 ? selectedText.substring(0, 40) + "..." : selectedText}&rdquo;
                      </p>
                    </div>
                  )}
                  <div className="py-1">
                    <button
                      onClick={() => handleQuickAction("explain")}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm hover:bg-[#F0ECE2] transition-colors text-left"
                      style={{ color: "#2D2A26" }}
                    >
                      <MessageSquare className="w-4 h-4 opacity-50" />
                      Explain
                    </button>
                    <button
                      onClick={() => handleQuickAction("example")}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm hover:bg-[#F0ECE2] transition-colors text-left"
                      style={{ color: "#2D2A26" }}
                    >
                      <Lightbulb className="w-4 h-4 opacity-50" />
                      Example
                    </button>
                    <button
                      onClick={() => handleQuickAction("hint")}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm hover:bg-[#F0ECE2] transition-colors text-left"
                      style={{ color: "#2D2A26" }}
                    >
                      <HelpCircle className="w-4 h-4 opacity-50" />
                      Hint
                    </button>
                    <button
                      onClick={() => handleQuickAction("quiz")}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm hover:bg-[#F0ECE2] transition-colors text-left"
                      style={{ color: "#2D2A26" }}
                    >
                      <BrainCircuit className="w-4 h-4 opacity-50" />
                      Quiz me
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Selection indicator pill */}
            {selectedText && !dropdownOpen && (
              <div className="flex items-center gap-1.5">
                <span
                  className="inline-block px-2.5 py-1 rounded-full text-[10px] font-bold truncate max-w-[180px]"
                  style={{
                    backgroundColor: "#EDE8DE",
                    color: "#2D2A26",
                    fontFamily: "var(--font-space-mono)",
                  }}
                >
                  &ldquo;{selectedText.length > 25 ? selectedText.substring(0, 25) + "..." : selectedText}&rdquo;
                </span>
                <button
                  onClick={() => setSelectedText("")}
                  className="p-0.5 rounded hover:bg-[#EDE8DE] transition-colors"
                  style={{ color: "#8A7D6B" }}
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>

          {/* Chat messages */}
          <div ref={chatContainerRef} className="flex-1 overflow-y-auto px-4 py-5 space-y-4 scroll-smooth">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center space-y-3" style={{ color: "#8A7D6B" }}>
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center"
                  style={{ backgroundColor: "#EDE8DE" }}
                >
                  <BrainCircuit className="w-7 h-7" />
                </div>
                <p
                  className="text-xs font-bold uppercase tracking-wider text-center leading-relaxed"
                  style={{ fontFamily: "var(--font-space-mono)" }}
                >
                  Highlight text on the left
                  <br />
                  then ask a question
                </p>
              </div>
            ) : (
              messages.map((m, idx) => {
                const isLastAssistant = m.role === "assistant" && idx === messages.length - 1;
                const textContent =
                  m.parts
                    ?.filter((p: any) => p.type === "text")
                    .map((p: any) => p.text)
                    .join("\n") || "";

                return (
                  <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[88%] rounded-2xl px-4 py-3 shadow-xs ${m.role === "user" ? "" : "border"}`}
                      style={
                        m.role === "user"
                          ? { backgroundColor: "#2D2A26", color: "#F8F4EC" }
                          : { backgroundColor: "#FFFDF8", borderColor: "#E8E2D8", color: "#2D2A26" }
                      }
                    >
                      <div className="whitespace-pre-wrap text-[13px] leading-relaxed">
                        {m.role === "assistant" ? (
                          <SmoothMessageText
                            text={textContent}
                            isStreaming={isLastAssistant && status === "streaming"}
                          />
                        ) : (
                          textContent
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            {status === "submitted" && (
              <div className="flex justify-start">
                <div
                  className="rounded-2xl px-4 py-3 shadow-xs border animate-pulse flex items-center gap-2"
                  style={{ backgroundColor: "#FFFDF8", borderColor: "#E8E2D8", color: "#8A7D6B" }}
                >
                  <BrainCircuit className="w-3.5 h-3.5 animate-spin" />
                  <p
                    className="text-[10px] font-bold uppercase tracking-widest"
                    style={{ fontFamily: "var(--font-space-mono)" }}
                  >
                    Thinking...
                  </p>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* ─── Input bar ─── */}
          <div className="px-4 pb-4 pt-2">
            <form
              onSubmit={handleSubmit}
              className="relative flex items-end gap-2 rounded-2xl border px-3 py-2"
              style={{ backgroundColor: "#FFFDF8", borderColor: "#E8E2D8" }}
            >
              <Textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask anything about this document..."
                className="flex-1 resize-none border-0 bg-transparent text-sm p-1 min-h-[36px] max-h-[120px] focus-visible:ring-0 focus-visible:outline-none placeholder:text-[#B5AD9E]"
                style={{ color: "#2D2A26" }}
                rows={1}
              />
              <button
                type="submit"
                disabled={status === "submitted" || status === "streaming" || !input.trim()}
                className="shrink-0 p-2 rounded-xl transition-all hover:scale-105 active:scale-95 disabled:opacity-30"
                style={{ backgroundColor: "#2D2A26", color: "#F8F4EC" }}
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* ═══════════════════ CHECKPOINT MODAL ═══════════════════ */}
      {checkpointActive && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/20 backdrop-blur-sm p-4">
          <Card className="w-full max-w-2xl bg-[#FFFDF8] border-[#E8E2D8] shadow-2xl p-8 rounded-3xl animate-in fade-in zoom-in duration-300">
            <div className="mb-6 flex items-start justify-between">
              <div>
                <h2
                  className="text-2xl font-bold tracking-tight mb-2"
                  style={{ color: "#2D2A26", fontFamily: "var(--font-space-mono)" }}
                >
                  Recall Checkpoint
                </h2>
                <p className="text-[#8A7D6B] text-sm">
                  Testing your active recall on:{" "}
                  <strong className="text-[#2D2A26]">{checkpointConcept?.name}</strong>
                </p>
              </div>
              {checkpointConcept?.location_marker && (
                <span 
                  className="text-xs font-bold font-mono px-3 py-1.5 rounded-full bg-[#EDE8DE] text-[#8A7D6B] shrink-0"
                >
                  📍 {checkpointConcept.location_marker}
                </span>
              )}
            </div>

            {checkpointStatus === "generating" && (
              <div className="py-12 flex flex-col items-center justify-center gap-4 text-[#8A7D6B]">
                <BrainCircuit className="w-8 h-8 animate-spin" />
                <p
                  className="text-sm font-bold uppercase tracking-wider"
                  style={{ fontFamily: "var(--font-space-mono)" }}
                >
                  Generating question...
                </p>
              </div>
            )}

            {checkpointStatus === "answering" && (
              <div className="space-y-6">
                <div className="bg-[#F8F4EC] p-5 rounded-2xl border border-[#E8E2D8]">
                  <p className="text-lg font-medium text-[#2D2A26]">{checkpointQuestion}</p>
                </div>
                <Textarea
                  value={checkpointAnswer}
                  onChange={(e) => setCheckpointAnswer(e.target.value)}
                  placeholder="Type your answer here..."
                  className="min-h-[120px] resize-none text-base p-4 rounded-2xl bg-white border-[#E8E2D8] focus-visible:ring-[#2D2A26]"
                />
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                  <button 
                    onClick={handleSkipNotRead}
                    className="text-xs font-mono text-[#8A7D6B] hover:text-[#2D2A26] underline underline-offset-4 transition-colors"
                  >
                    Haven&apos;t reached this section yet (Skip)
                  </button>
                  <div className="flex items-center gap-3">
                    <Button 
                      variant="outline" 
                      onClick={handleSkipForgot}
                      className="rounded-xl px-4 border-[#E8E2D8] text-[#8A7D6B] hover:bg-[#F0ECE2] font-mono text-xs font-bold"
                    >
                      I forgot / Don&apos;t know
                    </Button>
                    <Button
                      onClick={() => submitCheckpoint()}
                      disabled={!checkpointAnswer.trim()}
                      className="rounded-xl px-6 bg-[#2D2A26] text-white hover:bg-black font-bold"
                      style={{ fontFamily: "var(--font-space-mono)" }}
                    >
                      Submit
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {checkpointStatus === "grading" && (
              <div className="py-12 flex flex-col items-center justify-center gap-4 text-[#8A7D6B]">
                <BrainCircuit className="w-8 h-8 animate-spin" />
                <p
                  className="text-sm font-bold uppercase tracking-wider"
                  style={{ fontFamily: "var(--font-space-mono)" }}
                >
                  Grading your answer...
                </p>
              </div>
            )}

            {checkpointStatus === "feedback" && checkpointFeedback && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-[#F8F4EC] p-4 rounded-2xl border border-[#E8E2D8] text-center">
                    <p
                      className="text-[10px] text-[#8A7D6B] uppercase font-bold tracking-widest mb-1"
                      style={{ fontFamily: "var(--font-space-mono)" }}
                    >
                      Accuracy
                    </p>
                    <p className="text-3xl font-black text-[#2D2A26]">{checkpointFeedback.accuracy}%</p>
                  </div>
                  <div className="bg-[#F8F4EC] p-4 rounded-2xl border border-[#E8E2D8] text-center">
                    <p
                      className="text-[10px] text-[#8A7D6B] uppercase font-bold tracking-widest mb-1"
                      style={{ fontFamily: "var(--font-space-mono)" }}
                    >
                      Completeness
                    </p>
                    <p className="text-3xl font-black text-[#2D2A26]">{checkpointFeedback.completeness}%</p>
                  </div>
                </div>

                <div className="bg-[#FFFDF8] p-5 rounded-2xl border border-[#E8E2D8]">
                  <h4 className="font-bold text-[#2D2A26] mb-2 flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                    Feedback
                  </h4>
                  <p className="text-[#2D2A26] leading-relaxed text-sm">{checkpointFeedback.feedback_text}</p>
                </div>

                {checkpointFeedback.misconceptions?.length > 0 && (
                  <div className="bg-red-50/50 p-5 rounded-2xl border border-red-100">
                    <h4 className="font-bold text-red-800 mb-2 flex items-center gap-2">
                      <AlertCircle className="w-5 h-5" />
                      Misconceptions
                    </h4>
                    <ul className="list-disc pl-5 text-red-700 space-y-1 text-sm">
                      {checkpointFeedback.misconceptions.map((m: string, i: number) => (
                        <li key={i}>{m}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="flex justify-end pt-2">
                  <Button
                    onClick={closeCheckpoint}
                    className="rounded-xl px-6 bg-[#2D2A26] text-white hover:bg-black font-bold"
                    style={{ fontFamily: "var(--font-space-mono)" }}
                  >
                    Continue Studying
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </div>
      )}
      <Modal 
        isOpen={modalState.isOpen}
        onClose={() => setModalState({ ...modalState, isOpen: false })}
        title={modalState.title}
        description={modalState.desc}
        confirmText="OK"
      />
    </>
  );
}
