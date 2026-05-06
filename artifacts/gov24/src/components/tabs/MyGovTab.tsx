import { useState, useEffect } from "react";
import { Bell, Settings, FileText, Shield, Gift, Star, ChevronRight, Eye, EyeOff, RefreshCw, Trash2, Plus, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

function getUserData() {
  try {
    const d = localStorage.getItem("gov24_user");
    const parsed = d ? JSON.parse(d) : {};
    const photo = localStorage.getItem("gov24_user_photo") ?? "";
    return { ...parsed, photo };
  } catch {
    return {};
  }
}

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className="relative w-12 h-7 rounded-full shrink-0 transition-colors duration-200"
      style={{ background: on ? "#1a1a1a" : "#D1D5DB" }}
    >
      <motion.div
        className="absolute top-[3px] w-[22px] h-[22px] bg-white rounded-full shadow"
        animate={{ left: on ? "calc(100% - 25px)" : "3px" }}
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
      />
    </button>
  );
}

export default function MyGovTab() {
  const [user, setUser] = useState(getUserData);
  const [loggedIn, setLoggedIn] = useState(false);
  const [loginInput, setLoginInput] = useState({ id: "", pw: "" });
  const [adminMode, setAdminMode] = useState(false);
  const [devMode, setDevMode] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [showCtrl, setShowCtrl] = useState(false);
  const [pwInput, setPwInput] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [gateEnabled, setGateEnabled] = useState(false);
  const [approvalMode, setApprovalMode] = useState(false);
  const [whitelist, setWhitelist] = useState<string[]>([]);
  const [wlInput, setWlInput] = useState("");
  const [notice, setNotice] = useState<{ text: string; author?: string; time?: string } | null>(null);
  const [noticeInput, setNoticeInput] = useState("");
  const [noticeLoading, setNoticeLoading] = useState(false);
  const [toast, setToast] = useState("");

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  };

  useEffect(() => {
    const d = getUserData();
    if (d.name) { setUser(d); setLoggedIn(true); }
  }, []);

  useEffect(() => {
    if (!loggedIn) return;
    fetch("/api/gate/config")
      .then((r) => r.json())
      .then((d) => {
        setGateEnabled(d.gateEnabled ?? false);
        setApprovalMode(d.approvalRequired ?? false);
        setWhitelist(d.whitelist ?? []);
        setAdminMode(d.role === "admin" || d.role === "developer");
        setDevMode(d.role === "developer");
      })
      .catch(() => {});
    fetch("/api/gate/notice")
      .then((r) => r.json())
      .then((d) => { if (d.notice) setNotice(d.notice); })
      .catch(() => {});
  }, [loggedIn]);

  async function handleAuth() {
    if (!pwInput.trim()) return;
    setAuthLoading(true);
    try {
      const res = await fetch("/api/gate/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: pwInput }),
      });
      const data = await res.json();
      if (data.role === "admin") { setAdminMode(true); showToast("관리자 인증 완료"); }
      else if (data.role === "developer") { setAdminMode(true); setDevMode(true); showToast("개발자 인증 완료"); }
      else showToast("비밀번호가 올바르지 않습니다");
    } catch { showToast("서버 오류가 발생했습니다"); }
    finally { setAuthLoading(false); setPwInput(""); }
  }

  async function toggleGate() {
    const next = !gateEnabled;
    const res = await fetch("/api/gate/config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ gateEnabled: next }),
    });
    const d = await res.json();
    if (d.error === "admin_only") { showToast("관리자만 설정할 수 있습니다"); return; }
    setGateEnabled(next);
    showToast(next ? "비밀번호 게이트가 켜졌습니다" : "비밀번호 게이트가 꺼졌습니다");
  }

  async function toggleApproval() {
    const next = !approvalMode;
    const res = await fetch("/api/gate/config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ approvalRequired: next }),
    });
    const d = await res.json();
    if (d.error === "admin_only") { showToast("관리자만 설정할 수 있습니다"); return; }
    setApprovalMode(next);
    showToast(next ? "승인 필요 모드가 켜졌습니다" : "승인 필요 모드가 꺼졌습니다");
  }

  async function addWhitelist() {
    if (!wlInput.trim()) return;
    const res = await fetch("/api/gate/whitelist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: wlInput.trim() }),
    });
    const d = await res.json();
    if (d.whitelist) setWhitelist(d.whitelist);
    setWlInput("");
  }

  async function removeWhitelist(name: string) {
    const res = await fetch(`/api/gate/whitelist/${encodeURIComponent(name)}`, { method: "DELETE" });
    const d = await res.json();
    if (d.whitelist) setWhitelist(d.whitelist);
  }

  async function postNotice() {
    if (!noticeInput.trim()) return;
    setNoticeLoading(true);
    const res = await fetch("/api/gate/notice", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: noticeInput.trim(), author: user.name || "관리자" }),
    });
    const d = await res.json();
    if (d.notice) setNotice(d.notice);
    setNoticeInput("");
    setNoticeLoading(false);
    showToast("공지가 등록됐습니다");
  }

  async function deleteNotice() {
    await fetch("/api/gate/notice", { method: "DELETE" });
    setNotice(null);
    showToast("공지가 삭제됐습니다");
  }

  function handleLogin() {
    const name = loginInput.id || "홍길동";
    const data = { name };
    localStorage.setItem("gov24_user", JSON.stringify(data));
    setUser({ name });
    setLoggedIn(true);
    window.dispatchEvent(new Event("storage"));
  }

  const displayName = (user.name || "홍길동").replace(/\s/g, "");
  const initial = displayName.charAt(0) || "홍";
  const numFront = user.numberFront || "900115";
  const numBack = user.numberBack ? user.numberBack.slice(0, 1) + "••••••" : "1••••••";
  const address = [user.addr1, user.addr2, user.addr3].filter(Boolean).join(" ") || "서울특별시 중구 세종대로 110";

  const MY_ITEMS = [
    { Icon: FileText, label: "민원신청내역", count: 2 },
    { Icon: Shield, label: "나의증명서", count: 5 },
    { Icon: Gift, label: "나의혜택", count: 3 },
    { Icon: Star, label: "관심서비스", count: 8 },
  ];

  if (!loggedIn) {
    return (
      <div className="w-full h-full flex flex-col bg-white overflow-y-auto">
        <header className="px-5 py-4 flex items-center justify-between sticky top-0 bg-white z-10 border-b border-gray-100 shrink-0">
          <h1 className="text-xl font-bold text-gray-900">로그인</h1>
        </header>
        <div className="flex-1 p-6 flex flex-col justify-center max-w-sm mx-auto w-full">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-[#003764]/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Shield className="w-8 h-8 text-[#003764]" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">정부24 로그인</h2>
            <p className="text-sm text-gray-500">안전하고 편리한 전자정부 서비스</p>
          </div>
          <div className="space-y-4 mb-8">
            <button onClick={handleLogin} className="w-full h-14 bg-gradient-to-r from-blue-600 to-[#003764] text-white rounded-xl font-bold text-base shadow-md">
              간편인증 (민간인증서)
            </button>
            <button onClick={handleLogin} className="w-full h-14 bg-white border-2 border-gray-200 text-gray-700 rounded-xl font-bold text-base">
              공동인증서 (구 공인인증서)
            </button>
          </div>
          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-gray-200" /></div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-3 text-gray-400 font-medium">다른 방법으로 로그인</span>
            </div>
          </div>
          <div className="space-y-3">
            <input
              value={loginInput.id}
              onChange={(e) => setLoginInput((p) => ({ ...p, id: e.target.value }))}
              placeholder="이름 (아이디)"
              className="w-full h-12 bg-gray-50 border border-gray-200 rounded-xl px-4 text-[14px] outline-none focus:border-[#003764]"
            />
            <input
              type="password"
              value={loginInput.pw}
              onChange={(e) => setLoginInput((p) => ({ ...p, pw: e.target.value }))}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              placeholder="비밀번호"
              className="w-full h-12 bg-gray-50 border border-gray-200 rounded-xl px-4 text-[14px] outline-none focus:border-[#003764]"
            />
            <button onClick={handleLogin} className="w-full h-12 bg-gray-800 text-white rounded-xl font-bold">
              아이디 로그인
            </button>
          </div>
          <div className="flex items-center justify-center gap-4 mt-6 text-sm text-gray-500 font-medium">
            <span>아이디 찾기</span>
            <div className="w-px h-3 bg-gray-300" />
            <span>비밀번호 찾기</span>
            <div className="w-px h-3 bg-gray-300" />
            <span className="text-[#003764]">회원가입</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col bg-gray-50 overflow-y-auto no-scrollbar">
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-4 left-4 right-4 z-50 bg-green-50 border border-green-200 rounded-xl px-4 py-3 shadow-lg"
          >
            <p className="text-[12px] font-bold text-green-700 text-center">{toast}</p>
          </motion.div>
        )}
      </AnimatePresence>

      <header className="px-5 py-4 flex items-center justify-between sticky top-0 bg-white z-10 border-b border-gray-100 shrink-0">
        <h1 className="text-xl font-bold text-gray-900">MY정부24</h1>
        <div className="flex items-center gap-3">
          <button className="p-2 text-gray-600 relative">
            <Bell className="w-5 h-5" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#C60C30] rounded-full border border-white" />
          </button>
          {adminMode && (
            <button className="p-2 text-gray-600" onClick={() => setShowCtrl((p) => !p)}>
              <Settings className="w-5 h-5" />
            </button>
          )}
        </div>
      </header>

      <section className="bg-white p-5 border-b border-gray-100">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-gradient-to-br from-[#003764] to-blue-500 rounded-full flex items-center justify-center shadow-inner relative">
            <span className="text-white font-bold text-xl">{initial}</span>
            <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-white rounded-full flex items-center justify-center shadow-sm">
              <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                <span className="text-white text-[8px] font-black">✓</span>
              </div>
            </div>
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-gray-900">{displayName}<span className="font-normal text-gray-600 text-base ml-1">님</span></h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="bg-blue-50 text-[#003764] font-medium text-xs px-2 py-0.5 rounded-md">일반회원</span>
              <span className="text-xs text-gray-500">최근접속: 2025.02.16</span>
            </div>
          </div>
          <button onClick={() => setLoggedIn(false)} className="text-gray-400">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="mt-4 bg-[#F4F7FC] rounded-2xl px-4 py-3 space-y-2">
          <div className="flex items-center gap-3">
            <span className="text-[11px] text-gray-400 font-semibold w-20 shrink-0">주민등록번호</span>
            <span className="text-[13px] font-mono font-bold text-gray-800 tracking-wide">{numFront} - {numBack}</span>
          </div>
          <div className="border-t border-gray-200/60" />
          <div className="flex items-start gap-3">
            <span className="text-[11px] text-gray-400 font-semibold w-20 shrink-0 pt-0.5">주소</span>
            <span className="text-[13px] font-medium text-gray-800 leading-snug">{address}</span>
          </div>
        </div>
        <div className="grid grid-cols-4 gap-3 mt-6">
          {MY_ITEMS.map(({ Icon, label, count }) => (
            <div key={label} className="flex flex-col items-center gap-2">
              <div className="w-14 h-14 bg-gray-50 rounded-2xl flex flex-col items-center justify-center relative hover:bg-gray-100 transition-colors cursor-pointer">
                <Icon className="w-6 h-6 text-gray-700" strokeWidth={1.5} />
                {count > 0 && (
                  <span className="absolute -top-1 -right-1 bg-[#C60C30] text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full border-2 border-white">{count}</span>
                )}
              </div>
              <span className="text-[11px] font-medium text-gray-700 text-center leading-tight">{label}</span>
            </div>
          ))}
        </div>
      </section>

      {!adminMode && (
        <section className="mx-4 mt-3 bg-white rounded-2xl border border-amber-200 overflow-hidden shadow-sm">
          <div className="flex items-center gap-2 px-4 py-3 border-b bg-amber-50 border-amber-100">
            <Shield className="w-4 h-4 text-amber-600" />
            <p className="font-bold text-[13px] text-amber-800">관리자 인증</p>
          </div>
          <div className="px-4 py-3 space-y-2">
            <p className="text-[12px] text-gray-500">관리자 또는 개발자 비밀번호를 입력하면 권한이 부여됩니다.</p>
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <input
                  type={showPw ? "text" : "password"}
                  value={pwInput}
                  onChange={(e) => setPwInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAuth()}
                  placeholder="관리자/개발자 비밀번호 입력"
                  className="w-full h-10 border border-amber-200 rounded-xl pl-3 pr-9 text-[14px] outline-none bg-white focus:border-amber-400"
                />
                <button onClick={() => setShowPw((p) => !p)} className="absolute right-2.5 top-2.5 text-gray-400">
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <button
                onClick={handleAuth}
                disabled={authLoading || !pwInput.trim()}
                className="px-4 h-10 text-white rounded-xl font-bold text-[13px] bg-amber-500 disabled:opacity-40"
              >
                {authLoading ? "인증 중..." : "인증"}
              </button>
            </div>
          </div>
        </section>
      )}

      {adminMode && showCtrl && (
        <section className="mx-4 mt-3 bg-white rounded-2xl border-2 border-[#003764] overflow-hidden shadow-md">
          <div className="flex items-center justify-between px-4 py-3 bg-[#003764]">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-white" />
              <p className="font-bold text-white text-[14px]">접근 제어 관리</p>
              {devMode && (
                <span className="flex items-center gap-1 px-2 py-0.5 bg-purple-500 rounded-full text-white text-[10px] font-bold">
                  개발자
                </span>
              )}
            </div>
            <button onClick={() => setShowCtrl(false)} className="text-white/70 hover:text-white">
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
          <div className="p-4 space-y-4">
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <div>
                <p className="font-bold text-gray-900 text-[14px]">비밀번호 게이트</p>
                <p className="text-[12px] text-gray-400 mt-0.5">{gateEnabled ? "켜짐 — 비밀번호 필요" : "꺼짐 — 누구나 입장"}</p>
              </div>
              <Toggle on={gateEnabled} onToggle={toggleGate} />
            </div>
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <div>
                <p className="font-bold text-gray-900 text-[14px]">관리자 승인 모드</p>
                <p className="text-[12px] text-gray-400 mt-0.5">{approvalMode ? "켜짐 — 승인한 사람만 입장" : "꺼짐 — 비밀번호만으로 입장"}</p>
              </div>
              <Toggle on={approvalMode} onToggle={toggleApproval} />
            </div>
            <div className="py-2 border-b border-gray-100">
              <div className="flex items-center gap-1.5 mb-2">
                <p className="text-[12px] text-gray-700 font-bold">화이트리스트</p>
                <span className="px-1.5 py-0.5 bg-green-100 text-green-700 rounded text-[9px] font-bold">승인 면제</span>
              </div>
              <div className="flex gap-2 mb-2">
                <input
                  value={wlInput}
                  onChange={(e) => setWlInput(e.target.value.slice(0, 40))}
                  onKeyDown={(e) => e.key === "Enter" && addWhitelist()}
                  placeholder="이름 입력 (예: 홍길동)"
                  className="flex-1 h-10 border border-gray-200 rounded-xl px-3 text-[14px] outline-none focus:border-green-500 bg-white"
                />
                <button onClick={addWhitelist} className="px-4 h-10 bg-green-500 text-white rounded-xl font-bold text-[12px]">
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              {whitelist.length === 0 ? (
                <p className="text-[11px] text-gray-400 text-center py-2">등록된 화이트리스트 없음</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {whitelist.map((name) => (
                    <div key={name} className="flex items-center gap-1 bg-green-50 border border-green-200 rounded-full pl-3 pr-1 py-1">
                      <span className="text-[12px] font-bold text-green-800">{name}</span>
                      <button onClick={() => removeWhitelist(name)} className="w-5 h-5 rounded-full bg-green-200 hover:bg-red-200 flex items-center justify-center">
                        <X className="w-3 h-3 text-green-700" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {devMode && (
              <div className="py-2">
                <div className="flex items-center gap-1.5 mb-2">
                  <p className="text-[12px] text-gray-700 font-bold">전체 공지</p>
                  <span className="px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded text-[9px] font-bold">개발자 전용</span>
                </div>
                {notice && (
                  <div className="mb-2 p-3 bg-blue-50 border border-blue-200 rounded-xl">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <p className="text-[13px] font-bold text-gray-900 break-words whitespace-pre-wrap">{notice.text}</p>
                        <p className="text-[10px] text-gray-500 mt-1">{notice.author ? `${notice.author} · ` : ""}{notice.time}</p>
                      </div>
                      <button onClick={deleteNotice} className="shrink-0 flex items-center gap-1 px-2 py-1 bg-red-100 text-red-600 rounded-lg text-[11px] font-bold">
                        <Trash2 className="w-3 h-3" /> 삭제
                      </button>
                    </div>
                  </div>
                )}
                <div className="flex gap-2">
                  <input
                    value={noticeInput}
                    onChange={(e) => setNoticeInput(e.target.value.slice(0, 500))}
                    onKeyDown={(e) => e.key === "Enter" && postNotice()}
                    placeholder="공지 내용 입력"
                    className="flex-1 h-10 border border-purple-200 rounded-xl px-3 text-[14px] outline-none focus:border-purple-400 bg-white"
                  />
                  <span className="text-[10px] text-gray-400 self-center">{noticeInput.length}/500</span>
                  <button
                    onClick={postNotice}
                    disabled={noticeLoading || !noticeInput.trim()}
                    className="px-3 h-10 bg-purple-500 text-white rounded-xl font-bold text-[12px] disabled:opacity-40"
                  >
                    {noticeLoading ? "등록 중..." : notice ? "공지 교체" : "공지 등록"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      <section className="px-5 mt-5 pb-5">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden divide-y divide-gray-50">
          {[
            { icon: FileText, label: "최근 본 서비스" },
            { icon: Settings, label: "회원정보 수정" },
          ].map(({ icon: Icon, label }) => (
            <button key={label} className="w-full p-4 flex items-center justify-between bg-white hover:bg-gray-50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center">
                  <Icon className="w-4 h-4 text-gray-500" />
                </div>
                <span className="font-medium text-gray-800 text-sm">{label}</span>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400" />
            </button>
          ))}
          {adminMode && (
            <button onClick={() => setShowCtrl((p) => !p)} className="w-full p-4 flex items-center justify-between bg-white hover:bg-gray-50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center">
                  <Shield className="w-4 h-4 text-[#003764]" />
                </div>
                <span className="font-bold text-[#003764] text-sm">접근 제어 관리</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${gateEnabled ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                  {gateEnabled ? "켜짐" : "꺼짐"}
                </span>
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </div>
            </button>
          )}
        </div>
      </section>

      <div className="py-8 flex flex-col items-center gap-1">
        <p className="text-[11px] text-gray-300 font-medium tracking-widest uppercase">대한민국 정부</p>
        <p className="text-[15px] text-gray-400 font-bold">정부24</p>
      </div>
    </div>
  );
}
