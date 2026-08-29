import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { LogOut } from "lucide-react";
import { ActivityHeatmap } from "@/components/profile/ActivityHeatmap";
import { SkillRadar } from "@/components/profile/SkillRadar";
import { MasteryList } from "@/components/profile/MasteryList";

export default async function ProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: materials } = await supabase
    .from('materials')
    .select('id, study_sessions(started_at)')
    .eq('user_id', user.id);

  const sessions = materials?.flatMap(m => m.study_sessions || []) || [];

  const { data: attempts } = await supabase
    .from('assessment_attempts')
    .select('created_at, format, status, ai_grading, concept_id, concepts(id, name)')
    .eq('user_id', user.id)
    .eq('status', 'completed');

  // 2. Activity Dates
  const activityDates: Date[] = [];
  sessions?.forEach(s => { if (s.started_at) activityDates.push(new Date(s.started_at)); });
  attempts?.forEach(a => { if (a.created_at) activityDates.push(new Date(a.created_at)); });

  // 3. Concept Mastery & Global Skills
  const conceptMap = new Map<string, { name: string, scores: number[] }>();
  let recallScores: number[] = [];
  let compScores: number[] = [];
  let critScores: number[] = [];

  attempts?.forEach(a => {
    const grading = a.ai_grading as any;
    if (!grading) return;
    const cName = (a.concepts as any)?.name || "Unknown Concept";
    if (!conceptMap.has(a.concept_id)) {
      conceptMap.set(a.concept_id, { name: cName, scores: [] });
    }
    
    let attemptScore = 0;

    if (a.format === 'teach-back') {
      const acc = grading.accuracy_score || 0;
      const comp = grading.completeness_score || 0;
      const reason = grading.reasoning_score || 0;
      attemptScore = (acc + comp + reason) / 3;
      
      compScores.push((acc + comp) / 2);
      critScores.push(reason);
    } else if (a.format === 'hallucination') {
      const recall = grading.picked_correctly ? 100 : 0;
      const quality = grading.explanation_quality || 0;
      attemptScore = (recall + quality) / 2;
      
      recallScores.push(recall);
      critScores.push(quality);
    }

    conceptMap.get(a.concept_id)!.scores.push(attemptScore);
  });

  const conceptAverages = Array.from(conceptMap.entries()).map(([id, data]) => {
    const avg = data.scores.length > 0 ? data.scores.reduce((sum, s) => sum + s, 0) / data.scores.length : 0;
    return { id, name: data.name, score: avg };
  });

  // Sort by score
  conceptAverages.sort((a, b) => b.score - a.score);
  
  // Only consider concepts they have actually attempted
  const activeConcepts = conceptAverages.filter(c => c.score > 0);
  const strengths = activeConcepts.slice(0, 3);
  const focusAreas = activeConcepts.slice(-3).reverse().filter(c => !strengths.find(s => s.id === c.id)); // prevent overlap

  // Global radar averages
  const avg = (arr: number[]) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
  
  // If no data, provide dummy data to show how it looks
  const hasData = recallScores.length > 0 || compScores.length > 0 || critScores.length > 0;
  
  const radarData = hasData ? [
    { subject: 'Recall', A: avg(recallScores), fullMark: 100 },
    { subject: 'Comprehension', A: avg(compScores), fullMark: 100 },
    { subject: 'Analysis', A: avg(critScores), fullMark: 100 },
  ] : [
    { subject: 'Recall', A: 0, fullMark: 100 },
    { subject: 'Comprehension', A: 0, fullMark: 100 },
    { subject: 'Analysis', A: 0, fullMark: 100 },
  ];

  const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.email || 'U')}&background=2D2A26&color=F8F4EC&size=128`;

  return (
    <main className="flex-1 p-8 lg:p-12">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* Header Profile Info */}
        <div className="flex flex-col md:flex-row items-center md:items-start gap-8 bg-[#FFFDF8] p-8 rounded-3xl border border-[#E8E2D8] shadow-sm">
          <img src={avatarUrl} alt="Avatar" className="w-24 h-24 rounded-full border-4 border-[#F8F4EC] shadow-md" />
          <div className="text-center md:text-left flex-1">
            <h1 className="text-3xl font-bold font-mono text-[#2D2A26] tracking-tight">{user.email?.split('@')[0]}</h1>
            <p className="text-[#6B6358] mt-1">{user.email}</p>
            <p className="text-[#8A7D6B] text-xs mt-3 font-mono uppercase tracking-wider">
              Member since {new Date(user.created_at).toLocaleDateString()}
            </p>
          </div>
          <form action="/auth/signout" method="post">
            <button className="hidden md:flex items-center gap-2 px-6 py-3 rounded-xl bg-[#EDE8DE] hover:bg-red-50 text-red-600 font-bold transition-colors">
              <LogOut className="w-4 h-4" /> Sign Out
            </button>
          </form>
        </div>

        {/* Analytics Top Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="flex flex-col gap-6">
            <div className="h-full">
              <MasteryList strengths={strengths} focusAreas={focusAreas} />
            </div>
          </div>
          <div className="h-full">
            <SkillRadar data={radarData} />
          </div>
        </div>

        {/* Analytics Bottom Row */}
        <div className="w-full">
          <ActivityHeatmap activityDates={activityDates} />
        </div>

      </div>
    </main>
  );
}
