"use client";

import { useState } from "react";
import Link from "next/link";
import { Grid, List, Search, FileText, Lightbulb, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

function formatDistanceToNow(date: Date) {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffInSeconds < 60) return "just now";
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''}`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? 's' : ''}`;
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 30) return `${diffInDays} day${diffInDays > 1 ? 's' : ''}`;
  const diffInMonths = Math.floor(diffInDays / 30);
  if (diffInMonths < 12) return `${diffInMonths} month${diffInMonths > 1 ? 's' : ''}`;
  const diffInYears = Math.floor(diffInMonths / 12);
  return `${diffInYears} year${diffInYears > 1 ? 's' : ''}`;
}
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";

export function LibraryClient({ materials: initialMaterials }: { materials: any[] }) {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [materials, setMaterials] = useState(initialMaterials);
  const [modalState, setModalState] = useState<{isOpen: boolean, type: 'confirm'|'alert', title: string, desc: string, action?: () => void}>({isOpen: false, type: 'alert', title: '', desc: ''});
  const supabase = createClient();
  const router = useRouter();

  const filteredMaterials = materials.filter(m => 
    m.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const executeDelete = async (id: string) => {
    setMaterials(materials.filter(m => m.id !== id));
    const { error } = await supabase.from("materials").delete().eq("id", id);
    if (error) {
      setModalState({
        isOpen: true,
        type: 'alert',
        title: "Error",
        desc: "Failed to delete material."
      });
      router.refresh();
    }
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    setModalState({
      isOpen: true,
      type: 'confirm',
      title: "Delete Material?",
      desc: "Are you sure you want to delete this material? This will also delete all associated concepts, sessions, and assessments.",
      action: () => executeDelete(id)
    });
  };

  const EmptyState = () => (
    <div className="p-12 border-2 border-dashed rounded-3xl text-center flex flex-col items-center justify-center bg-[#FFFDF8] border-[#E8E2D8]">
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4 bg-[#EDE8DE]">
        <FileText className="w-8 h-8 text-[#8A7D6B]" />
      </div>
      <h3 className="text-lg font-bold font-mono text-[#2D2A26]">No materials found</h3>
      <p className="mt-2 text-sm max-w-sm mx-auto text-[#6B6358]">
        {searchQuery ? "Try a different search term." : "Upload a document or enter a study topic to begin your active recall journey."}
      </p>
      {!searchQuery && (
        <Link
          href="/materials/new"
          className="mt-6 inline-flex items-center justify-center rounded-xl px-6 py-3 text-sm font-bold transition-all hover:bg-[#1A1816] bg-[#2D2A26] text-[#F8F4EC] font-mono"
        >
          + Add Material
        </Link>
      )}
    </div>
  );

  return (
    <div className="space-y-8">
      {/* Controls Bar */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8A7D6B]" />
          <input
            type="text"
            placeholder="Search materials..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-[#E8E2D8] bg-[#FFFDF8] text-[#2D2A26] focus:outline-none focus:ring-2 focus:ring-[#D0C9BC]"
          />
        </div>
        
        <div className="flex items-center gap-2 bg-[#FFFDF8] p-1 rounded-xl border border-[#E8E2D8]">
          <button
            onClick={() => setViewMode("grid")}
            className={`p-2 rounded-lg transition-colors ${viewMode === "grid" ? "bg-[#EDE8DE] text-[#2D2A26]" : "text-[#8A7D6B] hover:text-[#2D2A26]"}`}
          >
            <Grid className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={`p-2 rounded-lg transition-colors ${viewMode === "list" ? "bg-[#EDE8DE] text-[#2D2A26]" : "text-[#8A7D6B] hover:text-[#2D2A26]"}`}
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {filteredMaterials.length === 0 ? (
        <EmptyState />
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMaterials.map((material) => (
            <Link key={material.id} href={`/materials/${material.id}/study`} className="group block h-full">
              <Card className="rounded-3xl transition-all hover:shadow-lg hover:-translate-y-1 h-full flex flex-col bg-[#FFFDF8] border-[#E8E2D8]">
                <CardHeader className="pb-4 relative">
                  <button 
                    onClick={(e) => handleDelete(e, material.id)}
                    className="absolute top-4 right-4 p-2 rounded-full text-[#8A7D6B] hover:bg-red-50 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-all z-10"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <div className="flex items-center gap-2 mb-2">
                    {material.source_type === "bare_topic" ? (
                      <Lightbulb className="w-4 h-4 text-[#8A7D6B]" />
                    ) : (
                      <FileText className="w-4 h-4 text-[#8A7D6B]" />
                    )}
                    <CardDescription className="uppercase tracking-wider text-xs font-bold font-mono text-[#8A7D6B]">
                      {material.source_type === "bare_topic" ? "Topic" : "Document"}
                    </CardDescription>
                  </div>
                  <CardTitle className="text-xl line-clamp-2 leading-tight font-mono text-[#2D2A26] pr-8">
                    {material.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col justify-between">
                  <p className="text-sm line-clamp-3 text-[#6B6358] mb-6">
                    {material.raw_content ? material.raw_content.substring(0, 120) + "..." : "No content preview available."}
                  </p>
                  
                  <div className="flex items-center justify-between mt-auto pt-4 border-t border-[#E8E2D8] text-xs text-[#8A7D6B] font-mono">
                    <span className="bg-[#EDE8DE] px-2 py-1 rounded-md">
                      {material.concepts?.[0]?.count || 0} Concepts
                    </span>
                    <span>
                      {material.study_sessions?.length > 0 
                        ? `Studied ${formatDistanceToNow(new Date(material.study_sessions[0].started_at))} ago` 
                        : "Never studied"}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filteredMaterials.map((material) => (
            <Link key={material.id} href={`/materials/${material.id}/study`} className="group">
              <div className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-2xl bg-[#FFFDF8] border border-[#E8E2D8] hover:shadow-md transition-all hover:border-[#D0C9BC]">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-[#EDE8DE] flex items-center justify-center flex-shrink-0">
                  {material.source_type === "bare_topic" ? (
                    <Lightbulb className="w-4 h-4 sm:w-5 sm:h-5 text-[#8A7D6B]" />
                  ) : (
                    <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-[#8A7D6B]" />
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <h3 className="font-mono font-bold text-[#2D2A26] truncate text-sm sm:text-base">{material.title}</h3>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1 text-[10px] sm:text-xs text-[#8A7D6B]">
                    <span>{material.source_type === "bare_topic" ? "Topic" : "Doc"}</span>
                    <span className="hidden sm:inline">•</span>
                    <span>{material.concepts?.[0]?.count || 0} Concepts</span>
                    <span className="hidden sm:inline">•</span>
                    <span className="w-full sm:w-auto mt-0.5 sm:mt-0">
                      {material.study_sessions?.length > 0 
                        ? `Studied ${formatDistanceToNow(new Date(material.study_sessions[0].started_at))} ago` 
                        : "Never studied"}
                    </span>
                  </div>
                </div>
                
                <button 
                  onClick={(e) => handleDelete(e, material.id)}
                  className="p-2 sm:p-3 rounded-xl text-[#8A7D6B] hover:bg-red-50 hover:text-red-600 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-all flex-shrink-0"
                >
                  <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              </div>
            </Link>
          ))}
        </div>
      )}

      <Modal 
        isOpen={modalState.isOpen}
        onClose={() => setModalState({ ...modalState, isOpen: false })}
        title={modalState.title}
        description={modalState.desc}
        onConfirm={modalState.type === 'confirm' ? modalState.action : undefined}
        confirmText={modalState.type === 'confirm' ? "Delete" : "OK"}
        isDestructive={modalState.type === 'confirm'}
      />
    </div>
  );
}
