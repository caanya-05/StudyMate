interface StudyHeaderProps {
  onJumpToSection: (section: 'upload' | 'chapters' | 'output' | 'export') => void;
  onResetWorkspace: () => void;
  hasDocument: boolean;
}

export function StudyHeader({
  onJumpToSection,
  onResetWorkspace,
  hasDocument,
}: StudyHeaderProps) {
  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-sm border-b border-[#DCEBFA]">
      <div className="max-w-[1380px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className="font-display text-lg font-bold tracking-tight text-[#0F2942] whitespace-nowrap shrink-0"
        >
          Smart Study Notes
        </a>

        <nav
          aria-label="Workspace Navigation"
          className="hidden md:flex items-center gap-7 text-sm font-medium text-[#4B647D]"
        >
          <button
            type="button"
            onClick={() => onJumpToSection('upload')}
            className="hover:text-[#0284C7] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Upload
          </button>
          <button
            type="button"
            onClick={() => onJumpToSection('chapters')}
            className="hover:text-[#0284C7] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Chapters
          </button>
          <button
            type="button"
            onClick={() => onJumpToSection('output')}
            className="hover:text-[#0284C7] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Study Pack
          </button>
          <button
            type="button"
            onClick={() => onJumpToSection('export')}
            className="hover:text-[#0284C7] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Export
          </button>
        </nav>

        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={onResetWorkspace}
            className="px-4 py-2 text-sm font-medium text-white bg-[#0284C7] hover:bg-[#0369A1] rounded-xl transition-colors whitespace-nowrap shrink-0 cursor-pointer shadow-xs"
          >
            {hasDocument ? 'New Document' : 'Start Studying'}
          </button>
        </div>
      </div>
    </header>
  );
}
