import Link from "next/link";

const navItems = [
  { href: "/", label: "机会首页" },
  { href: "/funds", label: "基金发现" },
  { href: "/compare", label: "基金对比" },
  { href: "/portfolio", label: "我的持仓" },
  { href: "/watchlist", label: "我的观察" }
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-20 border-b border-white/70 bg-white/80 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 lg:px-8">
        <div>
          <p className="eyebrow">Industry Fund Opportunity Radar</p>
          <Link href="/" className="mt-1 block text-xl font-semibold text-ink">
            行业基金机会捕捉平台
          </Link>
        </div>
        <nav className="flex flex-wrap items-center gap-2 text-sm font-medium text-ink/70">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-full px-4 py-2 transition hover:bg-mist hover:text-ink"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
