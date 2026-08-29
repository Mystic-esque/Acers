"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Sparkles, Brain, CheckCircle2, ChevronLeft, ArrowRight, ShieldAlert } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";

interface AssessHubClientProps {
  concepts: any[];
  recommendedConceptIds: string[];
}

type Mode = "none" | "hallucination" | "teach_back" | "enigma";

export function AssessHubClient({ concepts, recommendedConceptIds }: AssessHubClientProps) {
  const [mode, setMode] = useState<Mode>("none");
  const [searchQuery, setSearchQuery] = useState("");
  const [modalState, setModalState] = useState<{isOpen: boolean, title: string, desc: string}>({isOpen: false, title: '', desc: ''});
  const router = useRouter();

  // Sort concepts: recommended first
  const sortedConcepts = [...concepts].sort((a, b) => {
    const aRec = recommendedConceptIds.includes(a.id);
    const bRec = recommendedConceptIds.includes(b.id);
    if (aRec && !bRec) return -1;
    if (!aRec && bRec) return 1;
    return 0;
  });

  const filteredConcepts = sortedConcepts.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (c.materials?.title || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  const startEnigma = () => {
    // Pick a random recommended concept if possible, otherwise any random concept
    if (concepts.length === 0) {
      setModalState({
        isOpen: true,
        title: "No Concepts Found",
        desc: "You need to add materials and extract concepts first before playing Concept Enigma."
      });
      return;
    }
    
    let pool = concepts.filter(c => recommendedConceptIds.includes(c.id));
    if (pool.length === 0) pool = concepts;
    
    const randomConcept = pool[Math.floor(Math.random() * pool.length)];
    router.push(`/concepts/${randomConcept.id}/assess/enigma`);
  };

  if (mode === "enigma") {
    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        <button onClick={() => setMode("none")} className="flex items-center text-[#6B6358] hover:text-[#2D2A26] transition-colors">
          <ChevronLeft className="w-4 h-4 mr-1" /> Back to Modes
        </button>

        <div className="rounded-3xl p-8 lg:p-12 border border-[#2D2A26]/20 bg-[#111111] text-[#F3F4F6] relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 p-8 opacity-5">
            <Brain className="w-64 h-64" />
          </div>
          
          <div className="relative z-10 max-w-3xl">
            <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-400 ring-1 ring-inset ring-emerald-500/20 mb-6 font-mono tracking-widest uppercase">
              The Diagnostic Puzzle
            </span>
            <h2 className="text-4xl font-bold font-mono tracking-tight mb-4">Concept Enigma</h2>
            <p className="text-lg text-gray-400 leading-relaxed mb-8">
              The system will silently select a concept from your library and challenge you to identify it through a series of increasingly specific clues.
            </p>

            <div className="grid gap-4 mb-10">
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-[#1F2937] flex items-center justify-center flex-shrink-0 border border-gray-800">
                  <span className="font-mono text-emerald-400 text-sm">1</span>
                </div>
                <div>
                  <h4 className="font-bold text-gray-200">5 Stages of Deduction</h4>
                  <p className="text-gray-500 text-sm">Progress through The Shadow, Constraint, Behavior, Lens, and Keystone.</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-[#1F2937] flex items-center justify-center flex-shrink-0 border border-gray-800">
                  <span className="font-mono text-emerald-400 text-sm">2</span>
                </div>
                <div>
                  <h4 className="font-bold text-gray-200">5 Strikes & Timer</h4>
                  <p className="text-gray-500 text-sm">You have 5 hearts. Wrong guesses lose a heart and cost you 5 seconds on the 60s clock.</p>
                </div>
              </div>
            </div>

            <button
              onClick={startEnigma}
              className="px-8 py-4 bg-emerald-500 hover:bg-emerald-400 text-[#111111] rounded-xl font-bold font-mono transition-colors flex items-center gap-2"
            >
              Start Session <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (mode === "hallucination" || mode === "teach_back") {
    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        <button onClick={() => setMode("none")} className="flex items-center text-[#6B6358] hover:text-[#2D2A26] transition-colors">
          <ChevronLeft className="w-4 h-4 mr-1" /> Back to Modes
        </button>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <h2 className="text-2xl font-bold font-mono text-[#2D2A26]">
            Select a Concept to Assess
          </h2>
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8A7D6B]" />
            <input
              type="text"
              placeholder="Search concepts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-[#E8E2D8] bg-[#FFFDF8] text-[#2D2A26] focus:outline-none focus:ring-2 focus:ring-[#D0C9BC]"
            />
          </div>
        </div>

        {filteredConcepts.length === 0 ? (
          <div className="p-12 text-center text-[#6B6358]">No concepts found. Go to a material and extract some!</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredConcepts.map(concept => {
              const isRecommended = recommendedConceptIds.includes(concept.id);
              return (
                <button
                  key={concept.id}
                  onClick={() => router.push(`/concepts/${concept.id}/assess/${mode === "hallucination" ? "hallucination" : "teach-back"}`)}
                  className="flex flex-col text-left p-5 rounded-2xl bg-[#FFFDF8] border border-[#E8E2D8] hover:border-[#D0C9BC] hover:shadow-md transition-all group"
                >
                  <div className="flex justify-between items-start mb-2 w-full">
                    <span className="text-xs font-mono font-bold text-[#8A7D6B] uppercase tracking-wider truncate mr-2">
                      {concept.materials?.title || "Unknown Material"}
                    </span>
                    {isRecommended && (
                      <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700 ring-1 ring-inset ring-amber-600/20 flex-shrink-0">
                        <ShieldAlert className="w-3 h-3" /> Recommended
                      </span>
                    )}
                  </div>
                  <h3 className="text-lg font-bold font-mono text-[#2D2A26] mb-2">{concept.name}</h3>
                  <p className="text-sm text-[#6B6358] line-clamp-2">{concept.description}</p>
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // Mode Selection (none)
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Spot AI Hallucination */}
      <button onClick={() => setMode("hallucination")} className="group text-left h-full">
        <Card className="h-full rounded-3xl transition-all hover:shadow-xl hover:-translate-y-1 bg-[#FFFDF8] border-[#E8E2D8] flex flex-col">
          <CardHeader>
            <div className="w-12 h-12 rounded-2xl bg-amber-100 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <ShieldAlert className="w-6 h-6 text-amber-700" />
            </div>
            <CardTitle className="text-xl font-mono text-[#2D2A26]">Spot AI Hallucination</CardTitle>
            <CardDescription className="font-mono text-amber-700 font-medium">Discrimination Test</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col justify-between">
            <p className="text-[#6B6358] text-sm leading-relaxed mb-6">
              The AI will generate three statements about a concept. Two are undeniably true, but one contains a subtle, insidious hallucination.
            </p>
            <div className="flex gap-2">
              <span className="text-xs bg-[#EDE8DE] text-[#6B6358] px-2 py-1 rounded-md">Analysis</span>
              <span className="text-xs bg-[#EDE8DE] text-[#6B6358] px-2 py-1 rounded-md">Critical Thinking</span>
            </div>
          </CardContent>
        </Card>
      </button>

      {/* Teach It Back */}
      <button onClick={() => setMode("teach_back")} className="group text-left h-full">
        <Card className="h-full rounded-3xl transition-all hover:shadow-xl hover:-translate-y-1 bg-[#FFFDF8] border-[#E8E2D8] flex flex-col">
          <CardHeader>
            <div className="w-12 h-12 rounded-2xl bg-blue-100 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <CheckCircle2 className="w-6 h-6 text-blue-700" />
            </div>
            <CardTitle className="text-xl font-mono text-[#2D2A26]">Teach It Back</CardTitle>
            <CardDescription className="font-mono text-blue-700 font-medium">Feynman Technique</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col justify-between">
            <p className="text-[#6B6358] text-sm leading-relaxed mb-6">
              Explain the concept out loud (or type it) as if you were teaching a beginner. The AI Tutor evaluates your accuracy and reasoning.
            </p>
            <div className="flex gap-2">
              <span className="text-xs bg-[#EDE8DE] text-[#6B6358] px-2 py-1 rounded-md">Recall</span>
              <span className="text-xs bg-[#EDE8DE] text-[#6B6358] px-2 py-1 rounded-md">Mastery</span>
            </div>
          </CardContent>
        </Card>
      </button>

      {/* Concept Enigma */}
      <button onClick={() => setMode("enigma")} className="group text-left h-full">
        <Card className="h-full rounded-3xl transition-all hover:shadow-xl hover:-translate-y-1 bg-[#111111] border-[#2D2A26] flex flex-col overflow-hidden relative">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
             <Brain className="w-24 h-24 text-emerald-500" />
          </div>
          <CardHeader className="relative z-10">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 flex items-center justify-center mb-4 border border-emerald-500/30 group-hover:scale-110 transition-transform">
              <Sparkles className="w-6 h-6 text-emerald-400" />
            </div>
            <CardTitle className="text-xl font-mono text-white">Concept Enigma</CardTitle>
            <CardDescription className="font-mono text-emerald-400 font-medium">Diagnostic Puzzle</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col justify-between relative z-10">
            <p className="text-gray-400 text-sm leading-relaxed mb-6">
              A high-stakes deduction game. The system selects a mystery concept and feeds you 5 progressive clues. Guess it before the timer runs out.
            </p>
            <div className="flex gap-2">
              <span className="text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-1 rounded-md">Deduction</span>
              <span className="text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-1 rounded-md">Synthesis</span>
            </div>
          </CardContent>
        </Card>
      </button>

      <Modal 
        isOpen={modalState.isOpen}
        onClose={() => setModalState({ ...modalState, isOpen: false })}
        title={modalState.title}
        description={modalState.desc}
        confirmText="OK"
      />
    </div>
  );
}
