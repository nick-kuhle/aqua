export const NAV = [
  { to: "/", label: "Overview", hint: "Is Aqua alive" },
  { to: "/mouths", label: "Mouths", hint: "CoW · UniswapX · 7683" },
  { to: "/sidecar", label: "Sidecar", hint: "Morpho · Aave · oracle" },
  { to: "/optimizer", label: "Optimizer", hint: "v1 vs naive tape" },
  { to: "/funnel", label: "Funnel", hint: "Per-row counters" },
  { to: "/risk", label: "Risk", hint: "Runtime envelope" },
  { to: "/qualification", label: "Qualification", hint: "Evidence gate" },
  { to: "/tape", label: "Tape", hint: "Live feed" },
  { to: "/contracts", label: "Contracts", hint: "Executor · allowlist" },
  { to: "/go-live", label: "Go-live", hint: "Cannot skip gates" },
  { to: "/settings", label: "Settings", hint: "Theme · URLs" },
] as const;
