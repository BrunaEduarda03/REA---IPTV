import { Button } from "@/components/ui/Button";
import { ConnectionStatus } from "@/features/health/components/ConnectionStatus";
import { useUiStore } from "@/app/store/uiStore";

export function TopBar() {
  const toggleSidebar = useUiStore((state) => state.toggleSidebar);

  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-surface-raised px-gutter">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          onClick={toggleSidebar}
          aria-label="Alternar navegação"
          className="px-2.5"
        >
          ☰
        </Button>
        <span className="text-sm font-semibold tracking-wide text-text-primary">SaimoTV Lab</span>
      </div>

      {import.meta.env.DEV && <ConnectionStatus />}
    </header>
  );
}
