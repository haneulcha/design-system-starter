import type { MoodArchetype } from "../hooks/useGenerator";
export function StepFont({ value, mood, onChange }: { value: string; mood: MoodArchetype; onChange: (v: string) => void }) {
  return <div className="text-neutral-500">StepFont: {value}</div>;
}
