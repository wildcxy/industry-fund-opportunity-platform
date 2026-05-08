import { scoreTone } from "@/lib/format";

export function ScorePill({ score, label }: { score: number; label: string }) {
  return (
    <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-semibold ${scoreTone(score)}`}>
      <span>{label}</span>
      <span>{score}</span>
    </div>
  );
}
