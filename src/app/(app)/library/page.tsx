import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { LibraryClient } from "@/components/LibraryClient";

export default async function LibraryPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch materials with related concept counts and study sessions
  const { data: materials } = await supabase
    .from("materials")
    .select(`
      *,
      concepts(count),
      study_sessions(started_at)
    `)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  // study_sessions needs to be ordered by started_at desc to get the most recent one.
  // Supabase postgrest lets us order related tables, but it's simpler to just map it.
  // We can just rely on the API returning them (usually chronological or we can sort in JS)
  const processedMaterials = materials?.map(m => {
    // Sort study sessions to put latest first
    const sortedSessions = [...(m.study_sessions || [])].sort(
      (a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime()
    );
    return { ...m, study_sessions: sortedSessions };
  }) || [];

  return (
    <main className="flex-1 p-8 lg:p-12">
      <div className="max-w-6xl mx-auto space-y-10">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="text-4xl font-bold tracking-tight font-mono text-[#2D2A26]">
              Your Library
            </h1>
            <p className="mt-2 text-base text-[#6B6358]">
              Select a material to resume studying or add a new one.
            </p>
          </div>
          <Link
            href="/materials/new"
            className="inline-flex items-center justify-center rounded-xl px-6 py-3 text-sm font-bold transition-all hover:bg-[#1A1816] bg-[#2D2A26] text-[#F8F4EC] font-mono shadow-sm"
          >
            + Add Material
          </Link>
        </div>

        {/* Client Component for Grid/List, Search, and Display */}
        <LibraryClient materials={processedMaterials} />
        
      </div>
    </main>
  );
}
