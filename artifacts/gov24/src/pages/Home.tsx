import { useState } from "react";
import BottomNav from "@/components/BottomNav";
import HomeTab from "@/components/tabs/HomeTab";
import CivilServiceTab from "@/components/tabs/CivilServiceTab";
import BenefitsTab from "@/components/tabs/BenefitsTab";
import MyGovTab from "@/components/tabs/MyGovTab";
import AiChat from "@/components/AiChat";

export type Tab = "home" | "civil" | "benefits" | "my";

export default function HomePage() {
  const [tab, setTab] = useState<Tab>("home");
  const [aiOpen, setAiOpen] = useState(false);

  return (
    <div className="fixed inset-0 flex flex-col bg-[#F2F4F8] overflow-hidden">
      <div className="flex-1 overflow-hidden relative">
        {tab === "home" && <HomeTab onOpenAi={() => setAiOpen(true)} />}
        {tab === "civil" && <CivilServiceTab />}
        {tab === "benefits" && <BenefitsTab />}
        {tab === "my" && <MyGovTab />}
      </div>
      <BottomNav tab={tab} setTab={setTab} />
      <AiChat open={aiOpen} onClose={() => setAiOpen(false)} />
    </div>
  );
}
