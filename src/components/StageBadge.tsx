import { STAGE_COLOR, STAGE_LABEL, type Stage } from "@/lib/leads";

export function StageBadge({ stage }: { stage: Stage }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-medium ${STAGE_COLOR[stage]}`}
    >
      {STAGE_LABEL[stage]}
    </span>
  );
}
