import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { synthesizeStudyReport } from "@/lib/ai/report-synthesize";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BrainCircuit, CheckCircle2, AlertCircle, ArrowRight } from "lucide-react";
import Link from "next/link";

interface PageProps {
  params: Promise<{ id: string; sessionId: string }>;
}

export default async function StudyReportPage({ params }: PageProps) {
  const { id: materialId, sessionId } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return <div className="p-8">Please log in.</div>;
  }

  // 1. Mark session as ended if not already
  await supabase
    .from("study_sessions")
    .update({ ended_at: new Date().toISOString() })
    .eq("id", sessionId)
    .is("ended_at", null);

  // 2. Fetch session and concepts
  const { data: session } = await supabase
    .from("study_sessions")
    .select("*")
    .eq("id", sessionId)
    .single();

  if (!session) {
    notFound();
  }

  const { data: concepts } = await supabase
    .from("concepts")
    .select("*")
    .eq("material_id", materialId);

  // 3. Check if report already exists
  let { data: report } = await supabase
    .from("reports")
    .select("*")
    .eq("session_id", sessionId)
    .single();

  // 4. Generate report if it doesn't exist
  if (!report && concepts && concepts.length > 0) {
    const { data: recallAttempts } = await supabase
      .from("recall_attempts")
      .select("*")
      .eq("session_id", sessionId);

    const synthesized = await synthesizeStudyReport(
      recallAttempts || [],
      session.ai_dependence_count || 0,
      concepts
    );

    const { data: newReport } = await supabase
      .from("reports")
      .insert({
        session_id: sessionId,
        user_id: user.id,
        strong_concept_ids: synthesized.strong_concept_ids,
        uncertain_concept_ids: synthesized.uncertain_concept_ids,
        weak_concept_ids: synthesized.weak_concept_ids,
        retrieval_score: Math.round(synthesized.retrieval_score),
        recommended_next_step: synthesized.recommended_next_step,
        // The MVP schema doesn't have recommended_concept_id/format in the DB, 
        // we can either add them or just append them to recommended_next_step
        // Actually, the spec says "returns { ..., recommended_concept_id, recommended_format }"
        // but DB schema only has "recommended_next_step text". 
        // We'll store it all in recommended_next_step as JSON for MVP, or just skip it if it fails DB check.
        // Wait, I will just format the string.
      })
      .select()
      .single();

    // Since DB only has `recommended_next_step`, I will just update the insert to only pass valid columns.
    if (newReport) {
      report = newReport;
    }
  }

  const getConceptName = (conceptId: string) => {
    return concepts?.find(c => c.id === conceptId)?.name || "Unknown Concept";
  };

  return (
    <div className="min-h-screen bg-[#F8F4EC] pt-24 pb-12 px-6">
      <div className="max-w-4xl mx-auto space-y-8">
        
        <div className="flex items-center gap-4 mb-8">
          <Link href={`/library`}>
            <Button variant="outline" size="sm" style={{ borderColor: "#E8E2D8", color: "#2D2A26" }}>
              ← Back to Library
            </Button>
          </Link>
          <h1 className="text-3xl font-bold tracking-tight" style={{ color: "#2D2A26", fontFamily: "var(--font-space-mono)" }}>
            Study Session Report
          </h1>
        </div>

        {!report ? (
          <Card className="bg-[#FFFDF8] border-[#E8E2D8] p-12 text-center shadow-sm rounded-3xl">
            <p className="text-[#8A7D6B] font-bold uppercase tracking-wider" style={{ fontFamily: "var(--font-space-mono)" }}>
              No data to generate report.
            </p>
          </Card>
        ) : (
          <div className="space-y-8">
            {/* Top Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="bg-[#FFFDF8] border-[#E8E2D8] p-8 shadow-sm rounded-3xl flex flex-col items-center justify-center text-center">
                <p className="text-sm text-[#8A7D6B] uppercase font-bold tracking-wider mb-2" style={{ fontFamily: "var(--font-space-mono)" }}>Overall Retrieval Score</p>
                <div className="text-6xl font-black text-[#2D2A26]">
                  {report.retrieval_score !== null ? report.retrieval_score : "--"}%
                </div>
              </Card>

              <Card className="bg-[#2D2A26] border-none p-8 shadow-sm rounded-3xl text-[#F8F4EC] flex flex-col justify-center">
                <p className="text-sm text-gray-400 uppercase font-bold tracking-wider mb-2" style={{ fontFamily: "var(--font-space-mono)" }}>Recommended Next Step</p>
                <p className="text-xl font-medium leading-relaxed">
                  {report.recommended_next_step}
                </p>
                {/* For MVP, we link to the Assessment Hub for the most pressing concept */}
                {(() => {
                  const targetConceptId = report.weak_concept_ids?.[0] 
                    || report.uncertain_concept_ids?.[0] 
                    || report.strong_concept_ids?.[0];
                  
                  if (!targetConceptId) return null;

                  return (
                    <div className="flex gap-4">
                      <Link
                        href="/assess"
                        className="flex-1 bg-[#F8F4EC] hover:bg-white text-[#2D2A26] text-center py-4 rounded-xl font-bold font-mono transition-colors shadow-md mt-6"
                      >
                        Start Assessment Hub
                      </Link>
                    </div>
                  );
                })()}
              </Card>
            </div>

            {/* Concept Breakdown */}
            <Card className="bg-[#FFFDF8] border-[#E8E2D8] p-8 shadow-sm rounded-3xl">
              <h2 className="text-xl font-bold tracking-tight mb-6" style={{ color: "#2D2A26", fontFamily: "var(--font-space-mono)" }}>
                Concept Mastery Breakdown
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Strong */}
                <div className="space-y-4">
                  <h3 className="flex items-center gap-2 font-bold text-green-700">
                    <CheckCircle2 className="w-5 h-5" /> Strong
                  </h3>
                  <div className="space-y-2">
                    {report.strong_concept_ids?.length > 0 ? (
                      report.strong_concept_ids.map((id: string) => (
                        <div key={id} className="bg-green-50 text-green-900 px-4 py-3 rounded-xl text-sm font-medium border border-green-100">
                          {getConceptName(id)}
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-gray-400 italic">None yet</p>
                    )}
                  </div>
                </div>

                {/* Uncertain */}
                <div className="space-y-4">
                  <h3 className="flex items-center gap-2 font-bold text-amber-700">
                    <BrainCircuit className="w-5 h-5" /> Uncertain
                  </h3>
                  <div className="space-y-2">
                    {report.uncertain_concept_ids?.length > 0 ? (
                      report.uncertain_concept_ids.map((id: string) => (
                        <div key={id} className="bg-amber-50 text-amber-900 px-4 py-3 rounded-xl text-sm font-medium border border-amber-100">
                          {getConceptName(id)}
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-gray-400 italic">None yet</p>
                    )}
                  </div>
                </div>

                {/* Weak */}
                <div className="space-y-4">
                  <h3 className="flex items-center gap-2 font-bold text-red-700">
                    <AlertCircle className="w-5 h-5" /> Weak
                  </h3>
                  <div className="space-y-2">
                    {report.weak_concept_ids?.length > 0 ? (
                      report.weak_concept_ids.map((id: string) => (
                        <div key={id} className="bg-red-50 text-red-900 px-4 py-3 rounded-xl text-sm font-medium border border-red-100">
                          {getConceptName(id)}
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-gray-400 italic">None yet</p>
                    )}
                  </div>
                </div>

              </div>
            </Card>

          </div>
        )}
      </div>
    </div>
  );
}
