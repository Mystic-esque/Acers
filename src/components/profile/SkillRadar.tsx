"use client";

import { Target } from "lucide-react";

interface SkillRadarProps {
  data: {
    subject: string;
    A: number;
    fullMark: number;
  }[];
}

export function SkillRadar({ data }: SkillRadarProps) {
  return (
    <div className="bg-[#FFFDF8] border border-[#E8E2D8] p-6 rounded-3xl shadow-sm h-full flex flex-col">
      <div className="flex items-center gap-2 mb-6">
        <Target className="w-5 h-5 text-[#8A7D6B]" />
        <h3 className="font-mono text-sm font-bold uppercase tracking-wider text-[#8A7D6B]">Cognitive Skills</h3>
      </div>
      
      <div className="flex-1 w-full flex flex-col justify-center space-y-6">
        {data.map((item) => (
          <div key={item.subject} className="w-full">
            <div className="flex justify-between items-end mb-2">
              <span className="font-bold text-[#2D2A26]">{item.subject}</span>
              <span className="font-mono text-[#8A7D6B] text-sm">{Math.round(item.A)} / {item.fullMark}</span>
            </div>
            
            <div className="w-full h-3 bg-[#EDE8DE] rounded-full overflow-hidden">
              <div 
                className="h-full bg-[#2D2A26] rounded-full transition-all duration-1000 ease-out"
                style={{ width: `${Math.max(0, Math.min(100, (item.A / item.fullMark) * 100))}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
