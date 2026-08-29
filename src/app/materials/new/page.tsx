"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { createClient } from "@/lib/supabase/client";

export default function NewMaterialPage() {
  const [topic, setTopic] = useState("");
  const [loading, setLoading] = useState(false);
  const [statusText, setStatusText] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [modalState, setModalState] = useState<{isOpen: boolean, title: string, desc: string}>({isOpen: false, title: '', desc: ''});
  const router = useRouter();
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCreateTopic = async () => {
    if (!topic) return;
    setLoading(true);
    setStatusText("Creating material...");

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setModalState({ isOpen: true, title: "Auth Required", desc: "Please log in first." });
      setLoading(false);
      return;
    }

    // 1. Create the material row
    const { data, error } = await supabase
      .from("materials")
      .insert({
        user_id: user.id,
        title: topic,
        source_type: "bare_topic",
        raw_content: "Generating content...",
      })
      .select()
      .single();

    if (error || !data) {
      setModalState({ isOpen: true, title: "Error", desc: "Failed to create topic: " + error?.message });
      setLoading(false);
      return;
    }

    try {
      setStatusText("Generating study content with AI...");
      await fetch('/api/ai/topic-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ materialId: data.id, topic }),
        credentials: 'include',
      });

      setStatusText("Extracting key concepts...");
      try {
        await fetch('/api/ai/concept-extract', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ materialId: data.id }),
          credentials: 'include',
        });
      } catch (extractErr) {
        console.warn("Concept extraction warning:", extractErr);
      }

      router.push(`/materials/${data.id}/study`);
    } catch (e) {
      console.error(e);
      setModalState({ isOpen: true, title: "Warning", desc: "Failed to generate content or concepts, but material was created." });
      router.push(`/materials/${data.id}/study`);
    }
  };

  const processFile = async (file: File) => {
    setLoading(true);
    setStatusText("Uploading document and extracting text...");

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch('/api/materials/upload', {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Upload failed");
      }

      const { materialId } = await res.json();

      setStatusText("Extracting key concepts...");
      try {
        const extractRes = await fetch('/api/ai/concept-extract', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ materialId }),
          credentials: 'include',
        });
        if (!extractRes.ok) {
          console.warn("Concept extraction returned non-ok status:", extractRes.status);
        }
      } catch (extractError) {
        console.warn("Concept extraction error, proceeding to study workspace:", extractError);
      }

      router.push(`/materials/${materialId}/study`);
    } catch (error: any) {
      console.error(error);
      setModalState({ isOpen: true, title: "Upload Error", desc: error.message });
      setLoading(false);
    }
  };

  return (
    <main 
      className="min-h-screen p-8 flex flex-col items-center pt-24"
      style={{ backgroundColor: "#F8F4EC" }}
    >
      <div className="max-w-xl w-full space-y-8">
        
        <div className="text-center space-y-4">
          <span 
            className="inline-block rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-widest"
            style={{ backgroundColor: "#EDE8DE", color: "#8A7D6B", fontFamily: "var(--font-space-mono)" }}
          >
            New Material
          </span>
          <h1 className="text-3xl font-bold" style={{ color: "#2D2A26", fontFamily: "var(--font-space-mono)" }}>
            What are we studying?
          </h1>
        </div>

        <div 
          className={`w-full rounded-3xl p-8 md:p-10 shadow-xl space-y-8 transition-all ${loading ? 'opacity-70 pointer-events-none' : ''}`}
          style={{ backgroundColor: "#FFFDF8", border: "1px solid #E8E2D8" }}
        >
          {loading && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/80 rounded-3xl backdrop-blur-sm">
              <div className="w-8 h-8 border-4 border-[#2D2A26] border-t-transparent rounded-full animate-spin mb-4"></div>
              <p className="font-bold text-[#2D2A26] font-mono">{statusText}</p>
            </div>
          )}

          {/* Upload Document Section */}
          <div className="space-y-4 relative">
            <h3 className="text-sm font-bold uppercase tracking-wider" style={{ color: "#8A7D6B", fontFamily: "var(--font-space-mono)" }}>
              Upload Document
            </h3>
            <div 
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                if (e.dataTransfer.files?.[0]) {
                  processFile(e.dataTransfer.files[0]);
                }
              }}
              className={`border-2 border-dashed rounded-2xl p-8 text-center flex flex-col items-center gap-3 cursor-pointer transition-colors ${isDragging ? 'bg-[#EDE8DE] border-[#8A7D6B]' : 'hover:bg-gray-50'}`}
              style={{ borderColor: isDragging ? '#8A7D6B' : '#E8E2D8' }}
            >
              <input 
                type="file" 
                className="hidden" 
                ref={fileInputRef} 
                accept=".pdf" 
                onChange={(e) => {
                  if (e.target.files?.[0]) processFile(e.target.files[0]);
                }} 
              />
              <div className="w-12 h-12 rounded-xl flex items-center justify-center transition-colors" style={{ backgroundColor: isDragging ? "#2D2A26" : "#EDE8DE", color: isDragging ? "#FFFDF8" : "#8A7D6B" }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
              </div>
              <p className="text-sm font-medium" style={{ color: isDragging ? "#2D2A26" : "#6B6358" }}>
                {isDragging ? "Drop PDF here" : "Click to browse or drag and drop a PDF"}
              </p>
            </div>
          </div>

          <div className="relative py-4">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" style={{ borderColor: "#E8E2D8" }} />
            </div>
            <div className="relative flex justify-center text-xs uppercase font-bold tracking-widest" style={{ fontFamily: "var(--font-space-mono)" }}>
              <span className="px-4" style={{ backgroundColor: "#FFFDF8", color: "#8A7D6B" }}>Or</span>
            </div>
          </div>

          {/* Bare Topic Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider" style={{ color: "#8A7D6B", fontFamily: "var(--font-space-mono)" }}>
              Bare Topic
            </h3>
            <Input 
              type="text" 
              placeholder="e.g. The Mitochondria, World War II, Photosynthesis" 
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="h-14 rounded-2xl bg-white text-lg px-4"
              style={{ borderColor: "#E8E2D8" }}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateTopic()}
            />
          </div>

          <div className="pt-4 flex justify-between items-center gap-4">
            <Button 
              variant="outline" 
              onClick={() => router.push('/library')}
              className="h-12 rounded-xl px-8 font-bold transition-transform hover:scale-[1.02] active:scale-[0.98]"
              style={{ borderColor: "#2D2A26", color: "#2D2A26", fontFamily: "var(--font-space-mono)" }}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleCreateTopic} 
              disabled={!topic || loading}
              className="h-12 rounded-xl px-8 font-bold transition-transform hover:scale-[1.02] active:scale-[0.98]"
              style={{ backgroundColor: "#2D2A26", color: "#F8F4EC", fontFamily: "var(--font-space-mono)" }}
            >
              Start Studying
            </Button>
          </div>

        </div>
      </div>
      <Modal 
        isOpen={modalState.isOpen}
        onClose={() => setModalState({ ...modalState, isOpen: false })}
        title={modalState.title}
        description={modalState.desc}
        confirmText="OK"
      />
    </main>
  );
}
