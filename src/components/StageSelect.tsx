"use client";

import { useState, useTransition } from "react";
import { setStage } from "@/app/actions";
import { STAGES, type Stage } from "@/lib/leads";

export function StageSelect({
  id,
  stage,
  className = "input",
}: {
  id: string;
  stage: Stage;
  className?: string;
}) {
  const [value, setValue] = useState(stage);
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  return (
    <div>
      <select
        aria-label="Etap"
        value={value}
        disabled={pending}
        className={className}
        onChange={(e) => {
          const next = e.target.value as Stage;
          const prev = value;
          setValue(next);
          setError(undefined);
          startTransition(async () => {
            const res = await setStage(id, next);
            if (res.error) {
              setValue(prev);
              setError(res.error);
            }
          });
        }}
      >
        {STAGES.map((s) => (
          <option key={s.key} value={s.key}>
            {s.label}
          </option>
        ))}
      </select>
      {error && <p className="mt-1 text-xs text-rose-700">{error}</p>}
    </div>
  );
}
