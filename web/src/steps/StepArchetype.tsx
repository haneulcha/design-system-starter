import type { MoodArchetype } from "../hooks/useGenerator";
export function StepArchetype({ value, primaryColor, onChange }: { value: MoodArchetype; primaryColor: string; onChange: (v: MoodArchetype) => void }) {
  return <div className="text-neutral-500">StepArchetype: {value}</div>;
}
