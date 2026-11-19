import { Download } from 'lucide-react';

interface TopBarProps {
  canDownload: boolean;
  onDownloadWallpaper: () => void;
}

export function TopBar({ canDownload, onDownloadWallpaper }: TopBarProps) {
  return (
    <header className="sticky top-0 z-30 bg-[#F4F2ED]/92 backdrop-blur-md border-b border-[#141518]/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 h-16 flex items-center justify-between gap-8">
        <a
          href="#top"
          className="font-display text-lg font-semibold tracking-tight text-[#141518] whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#141518]"
        >
          Route to Done
        </a>

        <nav
          aria-label="Creation steps"
          className="hidden md:flex items-center gap-7 text-sm font-medium text-[#5A5D66]"
        >
          <a
            href="#step-deadline"
            className="hover:text-[#141518] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            01. Deadline
          </a>
          <a
            href="#step-syllabus"
            className="hover:text-[#141518] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            02. Syllabus
          </a>
          <a
            href="#step-route"
            className="hover:text-[#141518] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            03. Route
          </a>
        </nav>

        <div className="flex items-center shrink-0">
          <button
            type="button"
            disabled={!canDownload}
            onClick={onDownloadWallpaper}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-[#FAF9F6] bg-[#141518] rounded-lg hover:bg-[#272930] disabled:bg-[#E2DFD7] disabled:text-[#888B92] disabled:cursor-not-allowed transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#141518]"
          >
            <Download className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Download Wallpaper</span>
          </button>
        </div>
      </div>
    </header>
  );
}
