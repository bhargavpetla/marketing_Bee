import Link from "next/link";

export default function Header() {
  return (
    <header className="w-full border-b border-border bg-white/70 backdrop-blur sticky top-0 z-50">
      <div className="max-w-[1280px] mx-auto px-6 h-[64px] flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-pill bg-gradient-accent shadow-sm" />
          <div className="leading-none">
            <div className="text-[15px] font-semibold tracking-tight text-ink-900">Pink Foundry Radar</div>
            <div className="text-[11px] tracking-[0.12em] uppercase text-fg-muted mt-1">
              Competitive ad intelligence · NSOffice.AI
            </div>
          </div>
        </Link>
        <nav className="hidden md:flex items-center gap-7 text-[14px] text-fg-muted">
          <a className="hover:text-ink-900 transition" href="#how">How it works</a>
          <a className="hover:text-ink-900 transition" href="#channels">Channels</a>
          <a className="hover:text-ink-900 transition" href="#brief">Action brief</a>
        </nav>
        <a
          href="#start"
          className="px-4 h-9 inline-flex items-center rounded-pill bg-ink-900 text-white text-sm font-medium hover:bg-black transition"
        >
          New analysis →
        </a>
      </div>
    </header>
  );
}
