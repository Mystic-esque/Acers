"use client";

import { Document, Page, pdfjs } from "react-pdf";

// Setup worker from CDN to ensure thumbnails render properly
pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`;

interface PDFThumbnailSidebarProps {
  url: string;
  numPages: number;
  currentPage: number;
  onSelectPage: (pageNum: number) => void;
}

export default function PDFThumbnailSidebar({
  url,
  numPages,
  currentPage,
  onSelectPage,
}: PDFThumbnailSidebarProps) {
  if (numPages === 0) return null;

  return (
    <div
      className="w-48 flex-shrink-0 h-full overflow-y-auto border-r border-gray-200 bg-[#F5F1E8] p-3 space-y-4 custom-scrollbar hidden md:block"
    >
      <Document file={url} loading={null}>
        {Array.from(new Array(numPages), (el, index) => {
          const page = index + 1;
          const isActive = currentPage === page;
          return (
            <div
              key={`thumb_${page}`}
              onClick={() => onSelectPage(page)}
              className={`cursor-pointer rounded border-2 overflow-hidden transition-all duration-200 ${
                isActive
                  ? "border-[#2D2A26] shadow-md"
                  : "border-transparent hover:border-gray-300 opacity-80 hover:opacity-100"
              }`}
            >
              <div className="bg-white pointer-events-none select-none">
                <Page
                  pageNumber={page}
                  width={160}
                  renderTextLayer={false}
                  renderAnnotationLayer={false}
                  loading={<div className="h-[200px] bg-white w-full" />}
                />
              </div>
              <p className="text-center text-xs font-bold py-1.5 bg-[#EDE8DE] text-[#8A7D6B] font-mono">
                {page}
              </p>
            </div>
          );
        })}
      </Document>
    </div>
  );
}
