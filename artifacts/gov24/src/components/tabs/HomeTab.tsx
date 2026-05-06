import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { ChevronRight, Search, Bell, Menu, User } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const QUICK_SERVICES = [
  { title: "모바일\n신분증", href: "/mobile-id", icon: "🪪", color: "#1B5EA4" },
  { title: "주민등록\n등·초본", icon: "📄", color: "#2E7D32" },
  { title: "토지\n임야대장", icon: "🗺️", color: "#E65100" },
  { title: "자동차\n등록원부", icon: "🚗", color: "#6A1B9A" },
  { title: "건축물\n대장", icon: "🏢", color: "#00695C" },
  { title: "가족관계\n증명서", icon: "👨‍👩‍👧", color: "#AD1457" },
  { title: "여권\n재발급", icon: "📕", color: "#1565C0" },
  { title: "납세\n증명", icon: "🧾", color: "#4527A0" },
];

const BANNERS = [
  "🔔 주소 영문 변환 서비스 운영 안내",
  "📢 전자증명서 바로발급 서비스 개시",
  "💡 정부24 앱 최신 버전 업데이트",
];

const BENEFIT_CARDS = [
  { tag: "긴급지원", tagColor: "#C62828", bg: "#FFF5F5", title: "급한 생활비, 연체 고민이라면?", desc: "위기극복 맞춤형 금융지원 안내" },
  { tag: "창업·취업", tagColor: "#1565C0", bg: "#F0F6FF", title: "창업 준비 중이라면 꼭 확인하세요", desc: "청년창업지원금 및 컨설팅" },
  { tag: "1인 가구", tagColor: "#6A1B9A", bg: "#F6F0FF", title: "혼자 살아도 든든하게", desc: "주거·생활 지원 서비스" },
];

const LIFE_CATS = [
  { emoji: "🍼", label: "육아" },
  { emoji: "🚚", label: "이사" },
  { emoji: "💐", label: "결혼" },
  { emoji: "👵", label: "사망" },
  { emoji: "🎓", label: "취업·교육" },
];

const LIFE_ITEMS: Record<string, { text: string; sub: string }[]> = {
  "육아": [
    { text: "아이를 갖고자 할 때", sub: "임신·출산 지원금 신청" },
    { text: "임신에 어려움을 겪을 때", sub: "난임 시술비 지원" },
    { text: "아이가 태어났을 때", sub: "출생신고·아동수당 신청" },
  ],
  "이사": [
    { text: "전입신고 방법", sub: "온라인 전입신고 바로가기" },
    { text: "임대차 계약 관련", sub: "확정일자·전세보증금 보호" },
    { text: "이사 지원 서비스", sub: "청년·신혼 주택 특별공급" },
  ],
  "결혼": [
    { text: "혼인신고 방법", sub: "온라인 혼인신고 안내" },
    { text: "신혼부부 지원 혜택", sub: "주택 구입·전세 자금 대출" },
    { text: "결혼 준비 서비스", sub: "예식장·혼수 비용 지원" },
  ],
  "사망": [
    { text: "사망신고 방법", sub: "사망신고 서류 안내" },
    { text: "상속 절차 안내", sub: "상속재산조회 서비스" },
    { text: "장례 관련 서비스", sub: "장례비용 지원" },
  ],
  "취업·교육": [
    { text: "취업 지원 서비스", sub: "국민취업지원제도 신청" },
    { text: "직업훈련 프로그램", sub: "내일배움카드 발급" },
    { text: "교육급여 신청", sub: "저소득층 교육급여" },
  ],
};

function getUserName() {
  try {
    const d = localStorage.getItem("gov24_user");
    if (d) return JSON.parse(d).name || "";
  } catch {}
  return "";
}

interface Props { onOpenAi: () => void; }

export default function HomeTab({ onOpenAi }: Props) {
  const [, navigate] = useLocation();
  const [userName, setUserName] = useState(getUserName);
  const [bannerIdx, setBannerIdx] = useState(0);
  const [lifeCat, setLifeCat] = useState("육아");
  const [notice, setNotice] = useState<{ text: string; author?: string; time?: string } | null>(null);
  const [noticeDismissed, setNoticeDismissed] = useState(false);
  const [searchVal, setSearchVal] = useState("");

  useEffect(() => {
    const t = setInterval(() => setBannerIdx((i) => (i + 1) % BANNERS.length), 3500);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const onStorage = () => setUserName(getUserName());
    window.addEventListener("storage", onStorage);
    const t = setInterval(() => setUserName(getUserName()), 2000);
    return () => { window.removeEventListener("storage", onStorage); clearInterval(t); };
  }, []);

  useEffect(() => {
    fetch("/api/gate/notice")
      .then((r) => r.json())
      .then((d) => { if (d.notice) setNotice(d.notice); })
      .catch(() => {});
  }, []);

  const displayName = (userName || "").replace(/\s/g, "");

  return (
    <div className="w-full h-full flex flex-col overflow-hidden bg-[#F4F6FB]">
      {/* 공식 배너 */}
      <div className="bg-[#EEF2F7] border-b border-gray-200 px-4 py-1 flex items-center gap-2 shrink-0">
        <span className="text-[10px]">🇰🇷</span>
        <p className="text-[10px] text-gray-500">이 누리집은 대한민국 공식 전자정부 누리집입니다.</p>
      </div>

      {/* 헤더 */}
      <header className="bg-white border-b border-gray-100 shrink-0">
        <div className="flex items-center justify-between px-4 h-14">
          <img src="/gov24-logo.png" alt="정부24" className="h-9 w-auto object-contain" />
          <div className="flex items-center gap-0.5">
            <button onClick={onOpenAi} className="flex flex-col items-center px-2.5 py-1 gap-0.5 group">
              <div className="w-6 h-6 bg-[#4DD9AC] rounded-full flex items-center justify-center text-[10px] group-active:scale-90 transition-transform">🤖</div>
              <span className="text-[9px] text-gray-500 font-medium whitespace-nowrap">AI 도우미</span>
            </button>
            <button className="flex flex-col items-center px-2.5 py-1 gap-0.5">
              <Bell className="w-5 h-5 text-gray-600" />
              <span className="text-[9px] text-gray-500 font-medium">알림</span>
            </button>
            <button className="flex flex-col items-center px-2.5 py-1 gap-0.5">
              <User className="w-5 h-5 text-gray-600" />
              <span className="text-[9px] text-gray-500 font-medium">{displayName || "로그인"}</span>
            </button>
            <button className="flex flex-col items-center px-2.5 py-1 gap-0.5">
              <Menu className="w-5 h-5 text-gray-600" />
              <span className="text-[9px] text-gray-500 font-medium">전체메뉴</span>
            </button>
          </div>
        </div>

        {/* 검색창 */}
        <div className="px-4 pb-3">
          <div className="flex items-center gap-2 bg-[#F4F6FB] border border-gray-200 rounded-full h-11 px-4">
            <Search className="w-4 h-4 text-gray-400 shrink-0" />
            <input
              value={searchVal}
              onChange={(e) => setSearchVal(e.target.value)}
              placeholder="민원서비스, 혜택, 정책 검색"
              className="flex-1 bg-transparent text-[13px] text-gray-700 outline-none placeholder-gray-400"
            />
          </div>
        </div>
      </header>

      {/* 스크롤 영역 */}
      <div className="flex-1 overflow-y-auto no-scrollbar">
        {/* 공지 팝업 */}
        <AnimatePresence>
          {notice && !noticeDismissed && (
            <motion.div
              initial={{ opacity: 0, scaleY: 0.95 }}
              animate={{ opacity: 1, scaleY: 1 }}
              exit={{ opacity: 0, scaleY: 0.95 }}
              className="mx-4 mt-3 bg-white rounded-2xl shadow-lg border border-amber-200 overflow-hidden"
            >
              <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-50 border-b border-amber-100">
                <Bell className="w-4 h-4 text-amber-600" />
                <p className="text-[12px] font-bold text-amber-800 flex-1">공지사항</p>
                <button onClick={() => setNoticeDismissed(true)} className="text-gray-400">✕</button>
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

        {/* 롤링 배너 */}
        <div className="mx-4 mt-3 bg-white rounded-xl border border-gray-100 flex items-center gap-2 px-3.5 h-10 shadow-sm overflow-hidden">
          <span className="text-[10px] font-black text-[#003764] bg-[#E8F0FB] px-1.5 py-0.5 rounded shrink-0">공지</span>
          <AnimatePresence mode="wait">
            <motion.span
              key={bannerIdx}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
              className="text-[12px] text-gray-700 flex-1 truncate"
            >
              {BANNERS[bannerIdx]}
            </motion.span>
          </AnimatePresence>
          <ChevronRight className="w-3.5 h-3.5 text-gray-400 shrink-0" />
        </div>

        {/* 빠른서비스 */}
        <div className="mt-4 px-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[13px] font-bold text-gray-800">자주 찾는 서비스</p>
            <button className="text-[11px] text-[#003764] font-medium flex items-center gap-0.5">
              더보기 <ChevronRight className="w-3 h-3" />
            </button>
          </div>
          <div className="grid grid-cols-4 gap-x-2 gap-y-4">
            {QUICK_SERVICES.map((s) => (
              <button
                key={s.title}
                onClick={() => s.href && navigate(s.href)}
                className="flex flex-col items-center gap-2 active:scale-95 transition-transform"
              >
                <div
                  className="w-[58px] h-[58px] rounded-[18px] flex items-center justify-center shadow-sm"
                  style={{ background: `linear-gradient(135deg, ${s.color}ee, ${s.color})` }}
                >
                  <span className="text-2xl leading-none">{s.icon}</span>
                </div>
                <span className="text-[10px] text-gray-600 text-center leading-[1.3] whitespace-pre-line font-medium">{s.title}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 구분선 */}
        <div className="mx-4 my-4 border-t border-gray-100" />

        {/* 혜택알리미 */}
        <div className="px-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[13px] font-bold text-gray-800">혜택알리미</p>
            <button className="text-[11px] text-[#003764] font-medium flex items-center gap-0.5">
              더보기 <ChevronRight className="w-3 h-3" />
            </button>
          </div>
          <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
            {BENEFIT_CARDS.map((c) => (
              <div
                key={c.title}
                className="shrink-0 w-[200px] rounded-2xl p-4 border border-gray-100 shadow-sm"
                style={{ background: c.bg }}
              >
                <span
                  className="text-[10px] font-bold text-white px-2 py-0.5 rounded-full"
                  style={{ background: c.tagColor }}
                >
                  {c.tag}
                </span>
                <p className="font-bold text-[13px] text-gray-900 mt-2 leading-snug">{c.title}</p>
                <p className="text-[11px] text-gray-500 mt-1">{c.desc}</p>
                <button className="mt-3 text-[11px] font-bold flex items-center gap-0.5" style={{ color: c.tagColor }}>
                  신청하기 <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* 생활가이드 */}
        <div className="mt-4 px-4 pb-6">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[13px] font-bold text-gray-800">생활가이드</p>
            <button className="text-[11px] text-[#003764] font-medium flex items-center gap-0.5">
              더보기 <ChevronRight className="w-3 h-3" />
            </button>
          </div>

          {/* 카테고리 탭 */}
          <div className="flex gap-2 mb-3 overflow-x-auto no-scrollbar">
            {LIFE_CATS.map((c) => (
              <button
                key={c.label}
                onClick={() => setLifeCat(c.label)}
                className={`flex items-center gap-1.5 px-3.5 h-9 rounded-full text-[12px] font-bold shrink-0 border transition-all ${
                  lifeCat === c.label
                    ? "bg-[#003764] text-white border-[#003764]"
                    : "bg-white text-gray-600 border-gray-200"
                }`}
              >
                <span>{c.emoji}</span>
                <span>{c.label}</span>
              </button>
            ))}
          </div>

          {/* 가이드 목록 */}
          <AnimatePresence mode="wait">
            <motion.div
              key={lifeCat}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
            >
              {(LIFE_ITEMS[lifeCat] ?? []).map((item, i, arr) => (
                <button
                  key={item.text}
                  className={`w-full flex items-center justify-between px-4 py-3.5 text-left active:bg-gray-50 ${i < arr.length - 1 ? "border-b border-gray-50" : ""}`}
                >
                  <div>
                    <p className="text-[13px] text-gray-900 font-medium">{item.text}</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">{item.sub}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-300 shrink-0" />
                </button>
              ))}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
