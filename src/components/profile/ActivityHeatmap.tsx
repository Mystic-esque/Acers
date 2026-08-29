"use client";

import { useMemo } from "react";
import { format, subDays, isSameDay } from "date-fns";

interface ActivityHeatmapProps {
  activityDates: Date[];
}

export function ActivityHeatmap({ activityDates }: ActivityHeatmapProps) {
  // Generate the last 308 days (~44 weeks)
  const days = useMemo(() => {
    const result = [];
    const today = new Date();
    for (let i = 307; i >= 0; i--) {
      result.push(subDays(today, i));
    }
    return result;
  }, []);

  const getActivityLevel = (date: Date) => {
    const count = activityDates.filter(d => isSameDay(d, date)).length;
    if (count === 0) return "bg-[#EDE8DE]"; // empty
    if (count === 1) return "bg-[#D0C9BC]"; // light
    if (count <= 3) return "bg-[#8A7D6B]"; // medium
    return "bg-[#2D2A26]"; // high
  };

  return (
    <div className="bg-[#FFFDF8] border border-[#E8E2D8] p-6 rounded-3xl shadow-sm h-full flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-mono text-sm font-bold uppercase tracking-wider text-[#8A7D6B]">Study Activity</h3>
          <span className="text-sm font-medium text-[#2D2A26]">{activityDates.length} total sessions</span>
        </div>
        
        <div className="grid grid-rows-7 grid-flow-col gap-1.5 overflow-x-auto justify-start pb-2">
          {days.map((day, i) => (
            <div
              key={i}
              title={`${format(day, 'MMM d, yyyy')}: ${activityDates.filter(d => isSameDay(d, day)).length} sessions`}
              className={`w-3.5 h-3.5 rounded-sm ${getActivityLevel(day)} transition-colors hover:ring-2 hover:ring-[#2D2A26] hover:ring-offset-1`}
            />
          ))}
        </div>
      </div>
      
      <div className="flex items-center justify-end gap-2 mt-4 text-xs font-mono text-[#8A7D6B]">
        <span>Less</span>
        <div className="w-3 h-3 rounded-sm bg-[#EDE8DE]"></div>
        <div className="w-3 h-3 rounded-sm bg-[#D0C9BC]"></div>
        <div className="w-3 h-3 rounded-sm bg-[#8A7D6B]"></div>
        <div className="w-3 h-3 rounded-sm bg-[#2D2A26]"></div>
        <span>More</span>
      </div>
    </div>
  );
}
