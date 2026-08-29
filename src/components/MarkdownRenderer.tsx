import React from 'react';

interface MarkdownRendererProps {
  content: string;
}

export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  if (!content) {
    return <p className="italic text-slate-400">No content available.</p>;
  }

  // Handle both literal string '\n' and actual newline bytes
  let normalizedContent = content.replace(/\\n/g, '\n');
  
  // Aggressively format inline markdown headings that lack newlines
  normalizedContent = normalizedContent.replace(/([^\n])\s*(#{1,3}\s)/g, '$1\n\n$2');
  
  // Split by newlines
  const lines = normalizedContent.split('\n');
  
  return (
    <div className="space-y-4">
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) return null;

        // Render Headings
        if (trimmed.startsWith('### ')) {
          return <h3 key={idx} className="text-xl font-bold text-[#2D2A26] mt-8 mb-3" style={{ fontFamily: "var(--font-space-mono)" }}>{trimmed.replace('### ', '')}</h3>;
        } else if (trimmed.startsWith('## ')) {
          return <h2 key={idx} className="text-2xl font-bold text-[#2D2A26] mt-10 mb-4 pb-2 border-b border-[#E8E2D8]" style={{ fontFamily: "var(--font-space-mono)" }}>{trimmed.replace('## ', '')}</h2>;
        } else if (trimmed.startsWith('# ')) {
          return <h1 key={idx} className="text-3xl font-bold text-[#2D2A26] mt-12 mb-6" style={{ fontFamily: "var(--font-space-mono)" }}>{trimmed.replace('# ', '')}</h1>;
        } 
        
        // Render List Items
        else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
          const listItemContent = trimmed.replace(/^[-*]\s/, '');
          return (
            <div key={idx} className="flex gap-3 pl-2 my-2">
              <span className="text-[#8A7D6B] font-bold">•</span>
              <span className="text-[15px] leading-relaxed text-[#3D3A36]">
                {parseBoldText(listItemContent)}
              </span>
            </div>
          );
        } 
        
        // Render standard Paragraphs
        else {
          return (
            <p key={idx} className="text-[15px] leading-[1.85] text-[#3D3A36] mb-4">
              {parseBoldText(trimmed)}
            </p>
          );
        }
      })}
    </div>
  );
}

// Helper to parse basic **bold** tags inline
function parseBoldText(text: string) {
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={i} className="font-bold text-[#2D2A26]">{part.slice(2, -2)}</strong>;
        }
        return part;
      })}
    </>
  );
}
