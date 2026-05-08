import Link from "next/link";

export function EmptyState({
  title,
  description,
  primaryHref,
  primaryLabel,
  secondaryHref,
  secondaryLabel
}: {
  title: string;
  description: string;
  primaryHref: string;
  primaryLabel: string;
  secondaryHref?: string;
  secondaryLabel?: string;
}) {
  return (
    <div className="panel p-10 text-center">
      <p className="text-lg font-semibold">{title}</p>
      <p className="mt-3 text-sm leading-7 text-ink/65">{description}</p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Link href={primaryHref} className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white">
          {primaryLabel}
        </Link>
        {secondaryHref && secondaryLabel ? (
          <Link href={secondaryHref} className="rounded-full border border-ink/15 bg-white px-4 py-2 text-sm font-semibold">
            {secondaryLabel}
          </Link>
        ) : null}
      </div>
    </div>
  );
}
