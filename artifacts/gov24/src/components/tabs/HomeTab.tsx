import { useState, useEffect, useRef } from "react";
import { api } from "../../api";
import { useLocation } from "wouter";
import { ChevronRight, ChevronLeft, Plus, Menu, User, Download, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// ── 데이터 ────────────────────────────────────────────────────

const QUICK_SERVICES = [
  { title: "모바일 신분증", href: "/mobile-id", iconBg: "#1B5EA4", iconType: "id" },
  { title: "토지(임야)대장", href: undefined, iconBg: "#E53935", iconType: "pdf" },
  { title: "주민등록등·초본", href: undefined, iconBg: "#E53935", iconType: "pdf" },
  { title: "자동차등록원부", href: undefined, iconBg: "#E53935", iconType: "pdf" },
  { title: "건축물대장", href: undefined, iconBg: "#E53935", iconType: "pdf" },
  { title: "가족관계증명서", href: undefined, iconBg: "#43A047", iconType: "link" },
  { title: "여권 재발급", href: undefined, iconBg: "#1E88E5", iconType: "edit" },
];

const SLIDE_CARDS = [
  { icon: "✉️", iconBg: "#DBEAFE", label: "주소 영문 변환" },
  { icon: "💱", iconBg: "#FCE7F3", label: "주간 환율" },
  { icon: "📋", iconBg: "#D1FAE5", label: "나의 민원" },
  { icon: "🏠", iconBg: "#FEF3C7", label: "부동산 정보" },
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

// ── 서비스 아이콘 (PDF / 링크 / 편집 스타일) ──────────────────
function ServiceIcon({ type, bg }: { type: string; bg: string }) {
  if (type === "id") {
    return (
      <div className="w-8 h-8 rounded-md flex items-center justify-center shrink-0" style={{ background: bg }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
          <rect x="2" y="5" width="20" height="14" rx="2" stroke="white" strokeWidth="1.8"/>
          <circle cx="8" cy="12" r="2.5" fill="white"/>
          <path d="M13 10h5M13 14h3" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      </div>
    );
  }
  if (type === "pdf") {
    return (
      <div className="w-8 h-8 rounded-md flex items-center justify-center shrink-0" style={{ background: bg }}>
        <svg width="16" height="18" viewBox="0 0 16 18" fill="none">
          <rect width="16" height="18" rx="2" fill={bg} />
          <rect x="2" y="2" width="12" height="14" rx="1.5" fill="white" />
          <path d="M4 6h5M4 9h8M4 12h6" stroke={bg} strokeWidth="1.4" strokeLinecap="round" />
          <rect x="9" y="1" width="4" height="4" rx="0.5" fill={bg} />
          <path d="M9 1l4 4" stroke="white" strokeWidth="1" />
        </svg>
      </div>
    );
  }
  if (type === "link") {
    return (
      <div className="w-8 h-8 rounded-md flex items-center justify-center shrink-0" style={{ background: bg }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
          <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
    );
  }
  return (
    <div className="w-8 h-8 rounded-md flex items-center justify-center shrink-0" style={{ background: bg }}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
        <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </div>
  );
}

// ── 토끼 AI 캐릭터 SVG ─────────────────────────────────────────
function RabbitAI({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
      <circle cx="20" cy="20" r="20" fill="#3DD9AC" />
      {/* 귀 */}
      <ellipse cx="13" cy="10" rx="3.5" ry="6" fill="#2CB890" />
      <ellipse cx="27" cy="10" rx="3.5" ry="6" fill="#2CB890" />
      <ellipse cx="13" cy="10" rx="2" ry="4" fill="#FF9BAE" />
      <ellipse cx="27" cy="10" rx="2" ry="4" fill="#FF9BAE" />
      {/* 얼굴 */}
      <circle cx="20" cy="23" r="11" fill="white" />
      {/* 눈 */}
      <circle cx="16" cy="21" r="2" fill="#333" />
      <circle cx="24" cy="21" r="2" fill="#333" />
      <circle cx="16.8" cy="20.2" r="0.8" fill="white" />
      <circle cx="24.8" cy="20.2" r="0.8" fill="white" />
      {/* 볼 */}
      <circle cx="13" cy="23.5" r="2" fill="#FFB3C1" opacity="0.6" />
      <circle cx="27" cy="23.5" r="2" fill="#FFB3C1" opacity="0.6" />
      {/* 입 */}
      <path d="M17.5 25.5 Q20 27.5 22.5 25.5" stroke="#666" strokeWidth="1.2" strokeLinecap="round" fill="none" />
      <circle cx="20" cy="25" r="0.8" fill="#FFB3C1" />
    </svg>
  );
}

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
  const [lifeCat, setLifeCat] = useState("육아");
  const [notice, setNotice] = useState<{ text: string; author?: string; time?: string } | null>(null);
  const [noticeDismissed, setNoticeDismissed] = useState(false);
  const [slideIdx, setSlideIdx] = useState(0);
  const [aiInput, setAiInput] = useState("");
  const slideRef = useRef<HTMLDivElement>(null);

  // PWA install prompt
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const installDismissed = localStorage.getItem("gov24_install_dismissed") === "1";

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
      if (!installDismissed) setShowInstallBanner(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  useEffect(() => {
    const onStorage = () => setUserName(getUserName());
    window.addEventListener("storage", onStorage);
    const t = setInterval(() => setUserName(getUserName()), 2000);
    return () => { window.removeEventListener("storage", onStorage); clearInterval(t); };
  }, []);

  useEffect(() => {
    fetch(api("/api/gate/notice")
      .then((r) => r.json())
      .then((d) => { if (d.notice) setNotice(d.notice); })
      .catch(() => {});
  }, []);

  // 슬라이더 자동 전환
  useEffect(() => {
    const t = setInterval(() => setSlideIdx((i) => (i + 1) % SLIDE_CARDS.length), 4000);
    return () => clearInterval(t);
  }, []);

  const displayName = (userName || "").replace(/\s/g, "");

  return (
    <div className="w-full h-full flex flex-col overflow-hidden" style={{ background: "#F1F4FB" }}>

      {/* ── 공식 배너 ── */}
      <div className="bg-[#EEF2F7] border-b border-gray-200 px-4 py-1 flex items-center gap-2 shrink-0">
        <span className="text-[10px]">🇰🇷</span>
        <p className="text-[10px] text-gray-500">이 누리집은 대한민국 공식 전자정부 누리집입니다.</p>
      </div>

      {/* ── 헤더 ── */}
      <header className="bg-white shrink-0 px-4 h-14 flex items-center justify-between">
        {/* 로고 */}
        <div className="flex items-center gap-2">
          <img src="/gov24-logo.png" alt="" className="h-8 w-auto object-contain" />
          <span className="text-[18px] font-black text-gray-900" style={{ letterSpacing: "-0.3px" }}>정부24</span>
        </div>

        {/* 우측 아이콘들 */}
        <div className="flex items-center gap-1">
          {/* 정부24 AI */}
          <button
            onClick={onOpenAi}
            className="flex flex-col items-center gap-0.5 px-2 py-1 active:opacity-70"
          >
            <RabbitAI size={26} />
            <span className="text-[9px] text-gray-500 font-medium whitespace-nowrap">정부24 AI</span>
          </button>

          {/* 로그인 */}
          <button className="flex flex-col items-center gap-0.5 px-2 py-1">
            <User className="w-5 h-5 text-gray-600" strokeWidth={1.8} />
            <span className="text-[9px] text-gray-500 font-medium">{displayName || "로그인"}</span>
          </button>

          {/* 전체메뉴 */}
          <button className="flex flex-col items-center gap-0.5 px-2 py-1">
            <Menu className="w-5 h-5 text-gray-600" strokeWidth={1.8} />
            <span className="text-[9px] text-gray-500 font-medium">전체메뉴</span>
          </button>
        </div>
      </header>

      {/* ── PWA 설치 배너 ── */}
      <AnimatePresence>
        {showInstallBanner && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="mx-4 mt-3 bg-[#003764] rounded-2xl shadow-lg overflow-hidden"
          >
            <div className="flex items-center gap-3 px-4 py-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                <Download className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-[13px] font-bold text-white">정부24 설치하기</p>
                <p className="text-[11px] text-white/70">홈화면 추가하면 더 빠르게 이용할 수 있어요</p>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={async () => {
                    if (installPrompt) {
                      await installPrompt.prompt();
                      const result = await installPrompt.userChoice;
                      if (result.outcome === "accepted") {
                        setShowInstallBanner(false);
                        localStorage.setItem("gov24_install_dismissed", "1");
                      }
                    }
                  }}
                  className="px-3 h-8 bg-white text-[#003764] rounded-lg font-bold text-[12px]"
                >
                  설치
                </button>
                <button
                  onClick={() => { setShowInstallBanner(false); localStorage.setItem("gov24_install_dismissed", "1"); }}
                  className="w-7 h-7 flex items-center justify-center text-white/60"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── 스크롤 영역 ── */}
      <div className="flex-1 overflow-y-auto no-scrollbar">

        {/* 공지 팝업 (관리자 등록 공지) */}
        <AnimatePresence>
          {notice && !noticeDismissed && (
            <motion.div
              initial={{ opacity: 0, scaleY: 0.95 }}
              animate={{ opacity: 1, scaleY: 1 }}
              exit={{ opacity: 0, scaleY: 0.95 }}
              className="mx-4 mt-3 bg-white rounded-2xl shadow border border-amber-200 overflow-hidden"
            >
              <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-50 border-b border-amber-100">
                <span className="text-amber-500 text-sm">🔔</span>
                <p className="text-[12px] font-bold text-amber-800 flex-1">공지사항</p>
                <button onClick={() => setNoticeDismissed(true)} className="text-gray-400 text-[14px]">✕</button>
              </div>
              <div className="px-4 py-3">
                <p className="text-[13px] font-semibold text-gray-900 break-words whitespace-pre-wrap">{notice.text}</p>
                {(notice.author || notice.time) && (
                  <p className="text-[10px] text-gray-400 mt-1">{notice.author ? `${notice.author} · ` : ""}{notice.time}</p>
                )}
                <button onClick={() => setNoticeDismissed(true)} className="mt-3 w-full h-9 bg-[#003764] text-white text-[12px] font-bold rounded-xl">
                  확인했습니다
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 공지사항 확인하기 */}
        <button className="w-full flex items-center gap-2 px-5 py-3 bg-white border-b border-gray-100 active:bg-gray-50">
          <span className="text-[14px]">🔔</span>
          <span className="text-[13px] font-medium text-gray-700 flex-1 text-left">공지사항 확인하기</span>
          <ChevronRight className="w-4 h-4 text-gray-400" />
        </button>

        {/* ── AI 검색바 ── */}
        <div className="px-4 py-3">
          <button
            onClick={onOpenAi}
            className="w-full flex items-center gap-3 rounded-full px-3 py-2.5 bg-white active:bg-gray-50 transition-colors"
            style={{
              border: "2px dashed #3DD9AC",
              boxShadow: "0 1px 8px rgba(61,217,172,0.15)",
            }}
          >
            <RabbitAI size={34} />
            <span className="flex-1 text-left text-[14px] text-gray-400 font-medium">AI 정부 24에 물어보세요</span>
            <div className="flex items-center gap-1.5 shrink-0">
              <div className="w-7 h-7 bg-[#3DD9AC] rounded-full flex items-center justify-center">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path d="M22 2L11 13" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M22 2L15 22l-4-9-9-4 20-7z" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <span className="text-[13px]">🇰🇷</span>
            </div>
          </button>
        </div>

        {/* ── 자주 찾는 서비스 ── */}
        <div className="mx-4 mb-3">
          <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100">
            {/* 헤더 */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50">
              <span className="text-[14px] font-bold text-gray-900">자주 찾는 서비스</span>
              <button className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center active:bg-gray-200">
                <Plus className="w-4 h-4 text-gray-600" />
              </button>
            </div>

            {/* 2열 그리드 */}
            <div className="grid grid-cols-2 divide-x divide-y divide-gray-50">
              {QUICK_SERVICES.map((s, i) => (
                <button
                  key={s.title}
                  onClick={() => s.href && navigate(s.href)}
                  className={`flex items-center justify-between px-4 py-3.5 bg-white active:bg-gray-50 ${
                    i >= QUICK_SERVICES.length - 2 ? "" : ""
                  }`}
                >
                  <span className="text-[13px] font-medium text-gray-800 leading-snug text-left">
                    {s.title.length > 8 ? s.title.slice(0, 8) + "…" : s.title}
                  </span>
                  <ServiceIcon type={s.iconType} bg={s.iconBg} />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── 슬라이더 (좌우 화살표) ── */}
        <div className="mx-4 mb-3 flex items-center gap-2">
          <button
            onClick={() => setSlideIdx((i) => (i - 1 + SLIDE_CARDS.length) % SLIDE_CARDS.length)}
            className="w-8 h-8 rounded-full bg-white shadow border border-gray-100 flex items-center justify-center shrink-0 active:bg-gray-50"
          >
            <ChevronLeft className="w-4 h-4 text-gray-500" />
          </button>

          <div className="flex-1 overflow-hidden rounded-xl">
            <AnimatePresence mode="wait">
              <motion.div
                key={slideIdx}
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
                transition={{ duration: 0.2 }}
                className="flex gap-3"
              >
                {/* 현재 + 다음 카드 2개 표시 */}
                {[0, 1].map((offset) => {
                  const card = SLIDE_CARDS[(slideIdx + offset) % SLIDE_CARDS.length];
                  return (
                    <button
                      key={card.label}
                      className="flex-1 flex items-center gap-2.5 bg-white rounded-xl px-3.5 py-3 shadow-sm border border-gray-100 active:bg-gray-50"
                    >
                      <div
                        className="w-9 h-9 rounded-full flex items-center justify-center text-[18px] shrink-0"
                        style={{ background: card.iconBg }}
                      >
                        {card.icon}
                      </div>
                      <span className="text-[12px] font-bold text-gray-800 whitespace-nowrap text-left">{card.label}</span>
                    </button>
                  );
                })}
              </motion.div>
            </AnimatePresence>
          </div>

          <button
            onClick={() => setSlideIdx((i) => (i + 1) % SLIDE_CARDS.length)}
            className="w-8 h-8 rounded-full bg-white shadow border border-gray-100 flex items-center justify-center shrink-0 active:bg-gray-50"
          >
            <ChevronRight className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {/* ── 혜택알리미 ── */}
        <div className="px-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <button className="flex items-center gap-1 text-[14px] font-bold text-gray-900">
              혜택알리미 <ChevronRight className="w-4 h-4 text-gray-500" />
            </button>
          </div>
          <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
            {BENEFIT_CARDS.map((c) => (
              <div
                key={c.title}
                className="shrink-0 w-[200px] rounded-2xl p-4 border border-gray-100 shadow-sm"
                style={{ background: c.bg }}
              >
                <span className="text-[10px] font-bold text-white px-2 py-0.5 rounded-full" style={{ background: c.tagColor }}>
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

        {/* ── 생활가이드 ── */}
        <div className="px-4 pb-6">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[14px] font-bold text-gray-900">생활가이드</p>
            <button className="text-[12px] text-[#003764] font-medium flex items-center gap-0.5">
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
              initial={{ opacity: 0, y: 4 }}
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
