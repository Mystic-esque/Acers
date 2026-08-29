"use client";

import { useState, useRef, useEffect, forwardRef, useImperativeHandle } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/TextLayer.css";
import "react-pdf/dist/Page/AnnotationLayer.css";

// Setup worker from CDN
pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`;

interface PDFViewerProps {
  url: string;
  onPageVisible?: (pageNum: number) => void;
  onDocumentLoadSuccess?: (numPages: number) => void;
}

export interface PDFViewerHandle {
  scrollToPage: (pageNum: number) => void;
}

function PageWrapper({
  pageNum,
  onVisible,
}: {
  pageNum: number;
  onVisible: (n: number) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          onVisible(pageNum);
        }
      },
      { threshold: 0.3 } // Trigger when 30% of page is visible
    );

    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [pageNum, onVisible]);

  return (
    <div
      ref={ref}
      data-page-number={pageNum}
      className="mb-6 shadow-sm border border-gray-200"
      style={{ backgroundColor: "white" }}
    >
      <Page
        pageNumber={pageNum}
        width={700} // Standard fixed width for reading
        renderTextLayer={true}
        renderAnnotationLayer={true}
        loading={
          <div className="flex items-center justify-center h-[800px] w-[700px] bg-white text-gray-400">
            Loading page {pageNum}...
          </div>
        }
      />
    </div>
  );
}

export const PDFViewer = forwardRef<PDFViewerHandle, PDFViewerProps>(
  ({ url, onPageVisible, onDocumentLoadSuccess }, ref) => {
    const [numPages, setNumPages] = useState<number>(0);
    const containerRef = useRef<HTMLDivElement>(null);

    useImperativeHandle(ref, () => ({
      scrollToPage(pageNum: number) {
        if (!containerRef.current) return;
        const pageEl = containerRef.current.querySelector(
          `[data-page-number="${pageNum}"]`
        );
        if (pageEl) {
          pageEl.scrollIntoView({ behavior: "smooth" });
        }
      },
    }));

    const onLoadSuccess = (pdf: any) => {
      setNumPages(pdf.numPages);
      if (onDocumentLoadSuccess) onDocumentLoadSuccess(pdf.numPages);
    };

    return (
      <div ref={containerRef} className="flex flex-col items-center py-8">
        <Document
          file={url}
          onLoadSuccess={onLoadSuccess}
          loading={
            <div className="flex items-center justify-center p-12 text-gray-500 font-mono">
              Loading document...
            </div>
          }
          error={
            <div className="text-red-500 p-8 border border-red-200 rounded bg-red-50">
              Failed to load PDF.
            </div>
          }
        >
          {Array.from(new Array(numPages), (el, index) => (
            <PageWrapper
              key={`page_${index + 1}`}
              pageNum={index + 1}
              onVisible={(p) => {
                if (onPageVisible) onPageVisible(p);
              }}
            />
          ))}
        </Document>
      </div>
    );
  }
);

PDFViewer.displayName = "PDFViewer";
export default PDFViewer;
