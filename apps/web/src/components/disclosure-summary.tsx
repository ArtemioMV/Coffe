import type { ReactNode } from "react";
import { ChevronDown, type LucideIcon } from "lucide-react";

export function DisclosureSummary({ children, icon: Icon }: { children: ReactNode; icon?: LucideIcon }) {
  return (
    <summary>
      <span className="disclosure-label">
        {Icon && <Icon className="disclosure-icon" aria-hidden />}
        <span>{children}</span>
      </span>
      <ChevronDown className="disclosure-chevron" aria-hidden />
    </summary>
  );
}
