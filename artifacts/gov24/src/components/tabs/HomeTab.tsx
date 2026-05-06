import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { ChevronRight, Bell, Menu, User, ChevronLeft } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const QUICK_SERVICES = [
  { title: "모바일 신분증", href: "/mobile-id", color: "#003764" },
  { title: "토지(임야)대장", color: "#F97316" },
  { title: "주민등록등본(초본)", color: "#3B82F6" },
  { title: "자동차등록원부", color: "#22C55E" },
  { title: "건축물대장", color: "#06B6D4" },
  { title: "가족관계증명서", color: "#8B5CF6" },
  { title: "여권 재발급", color: "#14B8A6" },
  { title: "납세증명", color: "#EC4899" },
];

const BANNERS = ["주소 영문 변환 서비스", "주가 환율 조회", "전자증명서 바로발급"];

const BENEFIT_CARDS = [
  { tag: "긴급지원", tagBg: "#EF4444", title: "급한 생활비, 대출 연체라면?", desc: "위기극복 맞춤형 금융지원" },
  { tag: "창업·취업", tagBg: "#2563EB", title: "창업 준비 중이라면 꼭 확인하세요", desc: "청년창업지원금 및 컨설팅" },
  { tag: "1인 가구", tagBg: "#7C3AED", title: "혼자 살아도 든든하게", desc: "주거·생활 지원 서비스" },
];

const LIFE_CATS = [
  { emoji: "🍼", label: "육아", bg: "#FFF0F5" },
  { emoji: "🚚", label: "이사", bg: "#EFF6FF" },
  { emoji: "💐", label: "결혼", bg: "#FFF7ED" },
  { emoji: "👵", label: "사망", bg: "#F5F3FF" },
  { emoji: "🎓", label: "취업·교육", bg: "#F0FDF4" },
];

const LIFE_ITEMS: Record<string, string[]> = {
  "육아": ["아이를 갖고자 할 때", "임신에 어려움을 겪을 때", "아이가 태어났을 때"],
  "이사": ["전입신고 방법", "임대차 계약 관련", "이사 지원 서비스"],
  "결혼": ["혼인신고 방법", "신혼부부 지원 혜택", "결혼 준비 서비스"],
  "사망": ["사망신고 방법", "상속 절차 안내", "장례 관련 서비스"],
  "취업·교육": ["취업 지원 서비스", "직업훈련 프로그램", "교육급여 신청"],
};

function getUserName() {
  try {
    const d = localStorage.getItem("gov24_user");
    if (d) return JSON.parse(d).name || "홍길동";
  } catch {}
  return "홍길동";
}

interface Props {
  onOpenAi: () => void;
}

export default function HomeTab({ onOpenAi }: Props) {
  const [, navigate] = useLocation();
  const [userName, setUserName] = useState(getUserName);
  const [bannerIdx, setBannerIdx] = useState(0);
  const [lifeCat, setLifeCat] = useState("육아");
  const [notice, setNotice] = useState<{ text: string; author?: string; time?: string } | null>(null);
  const [noticeDismissed, setNoticeDismissed] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setInterval(() => setBannerIdx((i) => (i + 1) % BANNERS.length), 3000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const onStorage = () => setUserName(getUserName());
    window.addEventListener("storage", onStorage);
    const t = setInterval(() => setUserName(getUserName()), 1000);
    return () => { window.removeEventListener("storage", onStorage); clearInterval(t); };
  }, []);

  useEffect(() => {
    fetch("/api/gate/notice").then((r) => r.json()).then((d) => { if (d.notice) setNotice(d.notice); }).catch(() => {});
  }, []);

  const displayName = userName.replace(/\s/g, "");

  return (
    <div className="w-full h-full flex flex-col overflow-hidden">
      <div className="bg-[#EEF2F7] border-b border-gray-200 px-4 py-1 flex items-center gap-2 shrink-0">
        <span className="text-[10px]">🇰🇷</span>
        <p className="text-[10px] text-gray-500">이 누리집은 대한민국 공식 전자정부 누리집입니다.</p>
      </div>

      <header className="bg-white border-b border-gray-100 shadow-sm shrink-0">
        <div className="flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-1.5">
            <div className="w-8 h-8 bg-[#003764] rounded flex items-center justify-center text-white font-black text-[10px]">정부</div>
            <span className="text-[15px] font-black text-[#003764] tracking-tight">24</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={onOpenAi}
              className="flex flex-col items-center px-2 py-1 gap-0.5"
            >
              <div className="w-6 h-6 bg-[#4DD9AC] rounded-full flex items-center justify-center text-[10px]">🤖</div>
              <span className="text-[9px] text-gray-600 font-medium whitespace-nowrap">정부24 AI</span>
            </button>
            <button className="flex flex-col items-center px-2 py-1 gap-0.5">
              <User className="w-5 h-5 text-gray-600" />
              <span className="text-[9px] text-gray-600 font-medium">{displayName}</span>
            </button>
            <button className="flex flex-col items-center px-2 py-1 gap-0.5">
              <Menu className="w-5 h-5 text-gray-600" />
              <span className="text-[9px] text-gray-600 font-medium">전체메뉴</span>
            </button>
          </div>
        </div>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto no-scrollbar overscroll-none pb-4">
        <AnimatePresence>
          {notice && !noticeDismissed && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mx-4 mt-3 bg-white rounded-2xl shadow-md border border-yellow-200 overflow-hidden"
              style={{ boxShadow: "0 4px 20px rgba(0,0,0,0.12)" }}
            >
              <div className="flex items-center gap-2 px-4 py-2 bg-yellow-50 border-b border-yellow-100">
                <Bell className="w-4 h-4 text-yellow-600" />
                <p className="text-[12px] font-bold text-yellow-800">공지사항</p>
              </div>
              <div className="px-4 py-3">
                <p className="text-[13px] font-semibold text-gray-900 break-words whitespace-pre-wrap">{notice.text}</p>
                {(notice.author || notice.time) && (
                  <p className="text-[10px] text-gray-400 mt-1">{notice.author ? `${notice.author} · ` : ""}{notice.time}</p>
                )}
                <button
                  onClick={() => setNoticeDismissed(true)}
                  className="mt-3 w-full h-9 bg-[#003764] text-white text-[12px] font-bold rounded-xl"
                >
                  확인했습니다
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="bg-white mx-4 mt-3 rounded-2xl overflow-hidden shadow-sm border border-gray-100 flex items-center gap-2 px-4 py-2.5">
          <div className="w-4 h-4 rounded-full bg-[#003764] flex items-center justify-center shrink-0">
            <span className="text-white text-[8px] font-black">N</span>
          </div>
          <AnimatePresence mode="wait">
            <motion.span
              key={bannerIdx}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="text-[12px] text-gray-700 font-medium flex-1"
            >
              {BANNERS[bannerIdx]}
            </motion.span>
          </AnimatePresence>
          <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />
        </div>

        <div className="mt-4 px-4">
          <p className="text-[12px] font-bold text-gray-500 mb-2">자주 찾는 서비스</p>
          <div className="grid grid-cols-4 gap-2">
            {QUICK_SERVICES.map((s) => (
              <button
                key={s.title}
                onClick={() => s.href && navigate(s.href)}
                className="flex flex-col items-center gap-1"
              >
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-sm"
                  style={{ background: s.color }}
                >
                  <span className="text-white text-[10px] font-bold text-center leading-tight px-1">
                    {s.title.slice(0, 4)}
                  </span>
                </div>
                <span className="text-[10px] text-gray-600 text-center leading-tight px-0.5">{s.title}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5 px-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[13px] font-bold text-gray-900">혜택알리미</p>
            <button className="flex items-center gap-0.5 text-[11px] text-gray-500">
              더보기 <ChevronRight className="w-3 h-3" />
            </button>
          </div>
          <div className="space-y-2">
            {BENEFIT_CARDS.map((c) => (
              <div key={c.title} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                <span
                  className="text-[10px] font-bold text-white px-2 py-0.5 rounded-full"
                  style={{ background: c.tagBg }}
                >
                  {c.tag}
                </span>
                <p className="font-bold text-[13px] text-gray-900 mt-2">{c.title}</p>
                <p className="text-[11px] text-gray-500 mt-0.5">{c.desc}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-5 px-4 pb-2">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[13px] font-bold text-gray-900">생활가이드</p>
            <button className="flex items-center gap-0.5 text-[11px] text-gray-500">
              더보기 <ChevronRight className="w-3 h-3" />
            </button>
          </div>
          <div className="flex gap-2 mb-3 overflow-x-auto no-scrollbar">
            {LIFE_CATS.map((c) => (
              <button
                key={c.label}
                onClick={() => setLifeCat(c.label)}
                className={`flex flex-col items-center gap-1 px-3 py-2 rounded-2xl shrink-0 transition-all ${
                  lifeCat === c.label ? "border-2 border-[#003764] bg-blue-50" : "bg-white border border-gray-100"
                }`}
              >
                <span className="text-lg">{c.emoji}</span>
                <span className={`text-[11px] font-bold ${lifeCat === c.label ? "text-[#003764]" : "text-gray-600"}`}>
                  {c.label}
                </span>
              </button>
            ))}
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            {(LIFE_ITEMS[lifeCat] ?? []).map((item, i) => (
              <div
                key={item}
                className={`flex items-center justify-between px-4 py-3.5 ${i < 2 ? "border-b border-gray-50" : ""}`}
              >
                <span className="text-[13px] text-gray-800">{item}</span>
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
