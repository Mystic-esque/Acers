"use client";

import { Trophy, TrendingUp, TrendingDown } from "lucide-react";
import Link from "next/link";

interface ConceptScore {
  id: string;
  name: string;
  score: number; // 0-100
}

interface MasteryListProps {
  strengths: ConceptScore[];
  focusAreas: ConceptScore[];
}

export function MasteryList({ strengths, focusAreas }: MasteryListProps) {
  const getMasteryLabel = (score: number) => {
    if (score >= 80) return { label: "Master", color: "text-emerald-700", bg: "bg-emerald-50" };
    if (score >= 50) return { label: "Competent", color: "text-amber-700", bg: "bg-amber-50" };
    return { label: "Novice", color: "text-red-700", bg: "bg-red-50" };
  };

  return (
    <div className="grid grid-cols-1 gap-6 h-full">
      {/* Strengths */}
      <div className="bg-[#FFFDF8] border border-[#E8E2D8] p-6 rounded-3xl shadow-sm h-full flex flex-col">
        <div className="flex items-center gap-2 mb-6">
          <Trophy className="w-5 h-5 text-emerald-600" />
          <h3 className="font-mono text-sm font-bold uppercase tracking-wider text-[#8A7D6B]">Top Strengths</h3>
        </div>
        
        {strengths.length === 0 ? (
          <p className="text-sm text-[#8A7D6B] italic">Complete assessments to see your strengths.</p>
        ) : (
          <div className="space-y-4">
            {strengths.map(c => {
              const style = getMasteryLabel(c.score);
              return (
                <div key={c.id} className="flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="font-bold text-[#2D2A26] truncate">{c.name}</p>
                    <span className={`text-xs font-bold uppercase tracking-wider ${style.color}`}>{style.label}</span>
                  </div>
                  <div className="text-right pl-4">
                    <span className="font-mono font-bold text-xl text-[#2D2A26]">{Math.round(c.score)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Focus Areas */}
      <div className="bg-[#FFFDF8] border border-[#E8E2D8] p-6 rounded-3xl shadow-sm h-full flex flex-col">
        <div className="flex items-center gap-2 mb-6">
          <TrendingDown className="w-5 h-5 text-red-600" />
          <h3 className="font-mono text-sm font-bold uppercase tracking-wider text-[#8A7D6B]">Focus Areas</h3>
        </div>
        
        {focusAreas.length === 0 ? (
          <p className="text-sm text-[#8A7D6B] italic">No weak areas identified yet.</p>
        ) : (
          <div className="space-y-4">
            {focusAreas.map(c => {
              const style = getMasteryLabel(c.score);
              return (
                <div key={c.id} className="flex items-center justify-between">
                  <div className="min-w-0">
                    <Link href={`/assess`} className="font-bold text-[#2D2A26] hover:underline truncate block">
                      {c.name}
                    </Link>
                    <span className={`text-xs font-bold uppercase tracking-wider ${style.color}`}>{style.label}</span>
                  </div>
                  <div className="text-right pl-4">
                    <span className="font-mono font-bold text-xl text-[#2D2A26]">{Math.round(c.score)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
