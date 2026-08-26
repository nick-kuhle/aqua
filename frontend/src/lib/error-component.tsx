import { Link, type ErrorComponentProps } from "@tanstack/react-router";
import { TriangleAlert } from "lucide-react";

export function AppErrorComponent({ error }: ErrorComponentProps) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-bg px-6 text-center text-fg">
      <span className="text-danger" aria-hidden="true">
        <TriangleAlert className="size-10" strokeWidth={2} />
      </span>
      <h1 className="text-lg font-medium">Something went wrong</h1>
      <p className="max-w-md text-sm break-words text-muted">
        {error.message || "An unexpected error occurred. Try reloading the page."}
      </p>
    </main>
  );
}

export function AppNotFound() {
  return (
    <main className="mx-auto max-w-lg px-4 py-16 text-center">
      <p className="text-[11px] font-medium tracking-wide text-subtle uppercase">404</p>
      <h1 className="mt-2 text-xl font-medium tracking-tight">No such console page</h1>
      <p className="mt-2 text-sm text-muted">
        That path is not a cell surface. Overview, mouths, sidecar, optimizer, funnel, risk,
        qualification, tape, contracts, go-live and settings are the operator pages.
      </p>
      <Link
        to="/"
        className="mt-6 inline-flex h-10 items-center rounded-sm bg-accent px-4 text-sm font-medium text-accent-fg"
      >
        Back to overview
      </Link>
    </main>
  );
}
