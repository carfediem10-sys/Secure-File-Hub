import type { Tab } from "@/pages/Home";
import { Home, FileText, Gift, User } from "lucide-react";

interface Props {
  tab: Tab;
  setTab: (t: Tab) => void;
}

const items = [
  { id: "home" as Tab, label: "홈", Icon: Home },
  { id: "civil" as Tab, label: "민원서비스", Icon: FileText },
  { id: "benefits" as Tab, label: "혜택알리미", Icon: Gift },
  { id: "my" as Tab, label: "MY정부24", Icon: User },
];

export default function BottomNav({ tab, setTab }: Props) {
  return (
    <nav className="shrink-0 bg-white border-t border-gray-100 flex safe-bottom">
      {items.map(({ id, label, Icon }) => {
        const active = tab === id;
        return (
          <button
            key={id}
            onClick={() => setTab(id)}
            className="flex-1 flex flex-col items-center justify-center py-2 gap-0.5"
          >
            <Icon
              className="w-5 h-5"
              style={{ color: active ? "#003764" : "#9CA3AF" }}
              strokeWidth={active ? 2.5 : 1.8}
            />
            <span
              className="text-[10px] font-medium"
              style={{ color: active ? "#003764" : "#9CA3AF" }}
            >
              {label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
