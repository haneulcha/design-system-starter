export type InspectorCategory = "color" | "typography" | "spacing" | "radius" | "elevation" | "component";

const TABS: { key: InspectorCategory; label: string; enabled: boolean }[] = [
  { key: "color",      label: "Color",      enabled: false },
  { key: "typography", label: "Type",       enabled: false },
  { key: "spacing",    label: "Spacing",    enabled: false },
  { key: "radius",     label: "Radius",     enabled: true  },
  { key: "elevation",  label: "Elevation",  enabled: false },
  { key: "component",  label: "Component",  enabled: false },
];

export function CategoryTabs({
  active,
  onChange,
}: {
  active: InspectorCategory;
  onChange: (cat: InspectorCategory) => void;
}) {
  return (
    <div className="grid grid-cols-3 gap-1 p-1 bg-neutral-100 rounded-md">
      {TABS.map((t) => {
        const isActive = active === t.key;
        return (
          <button
            key={t.key}
            type="button"
            disabled={!t.enabled}
            onClick={() => t.enabled && onChange(t.key)}
            className={[
              "px-2 py-1.5 text-[11px] rounded transition-all",
              !t.enabled       ? "text-neutral-300 cursor-not-allowed" :
              isActive         ? "bg-white text-neutral-900 shadow-sm font-medium" :
                                 "text-neutral-600 hover:text-neutral-900",
            ].join(" ")}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
