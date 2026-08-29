import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AssessHubClient } from "@/components/AssessHubClient";

export default async function AssessHubPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch all user concepts across all materials to pass to the selector
  const { data: concepts } = await supabase
    .from("concepts")
    .select(`
      *,
      materials(title)
    `)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  // Fetch recent reports to find recommended concepts (weak/uncertain)
  const { data: reports } = await supabase
    .from("reports")
    .select("weak_concept_ids, uncertain_concept_ids")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  // Extract recommended concept IDs from recent reports
  const recommendedIds = new Set<string>();
  if (reports && reports.length > 0) {
    // Look at top 5 recent reports
    for (const report of reports.slice(0, 5)) {
      report.weak_concept_ids?.forEach((id: string) => recommendedIds.add(id));
      report.uncertain_concept_ids?.forEach((id: string) => recommendedIds.add(id));
    }
  }

  return (
    <main className="flex-1 p-8 lg:p-12">
      <div className="max-w-6xl mx-auto space-y-10">
        
        {/* Header */}
        <div>
          <h1 className="text-4xl font-bold tracking-tight font-mono text-[#2D2A26]">
            Assessment Hub
          </h1>
          <p className="mt-2 text-base text-[#6B6358] max-w-2xl">
            Choose how you want to test your knowledge. The system tracks your performance and adapts to your weaknesses.
          </p>
        </div>

        {/* Client component for mode selection and concept picker */}
        <AssessHubClient 
          concepts={concepts || []} 
          recommendedConceptIds={Array.from(recommendedIds)} 
        />
        
      </div>
    </main>
  );
}
