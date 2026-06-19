import { BarChart3, Home, ListChecks, Settings2, Star } from "lucide-react";

export type ViewKey = "list" | "form" | "score" | "results" | "settings";

interface ShellProps {
  activeView: ViewKey;
  onViewChange: (view: ViewKey) => void;
  children: React.ReactNode;
}

const items: Array<{ key: ViewKey; label: string; icon: React.ReactNode }> = [
  { key: "list", label: "房源", icon: <Home size={18} /> },
  { key: "form", label: "录入", icon: <ListChecks size={18} /> },
  { key: "score", label: "打分", icon: <Star size={18} /> },
  { key: "results", label: "结果", icon: <BarChart3 size={18} /> },
  { key: "settings", label: "指标", icon: <Settings2 size={18} /> }
];

export function Shell({ activeView, onViewChange, children }: ShellProps) {
  return (
    <div className="layout">
      <aside className="sidebar">
        <div>
          <p className="eyebrow">FCE Scorer</p>
          <h1>二手房评分器</h1>
        </div>
        <nav className="nav">
          {items.map((item) => (
            <button
              key={item.key}
              className={activeView === item.key ? "nav-item active" : "nav-item"}
              type="button"
              onClick={() => onViewChange(item.key)}
              title={item.label}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
      </aside>
      <section className="workspace">{children}</section>
    </div>
  );
}
