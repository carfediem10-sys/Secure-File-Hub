import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { ChevronLeft, Menu, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { QRCodeSVG } from "qrcode.react";

const PIN_COUNT = 30;

function getResidentData() {
  try {
    const d = localStorage.getItem("gov24_user");
    const photo = localStorage.getItem("gov24_user_photo") ?? "";
    return { ...(d ? JSON.parse(d) : {}), photo };
  } catch { return { photo: "" }; }
}

function getDLData() {
  try {
    const d = localStorage.getItem("gov24_dl");
    const photo = localStorage.getItem("gov24_dl_photo") ?? "";
    return { ...(d ? JSON.parse(d) : {}), photo };
  } catch { return { photo: "" }; }
}

function saveResidentData(data: Record<string, string>) {
  try {
    const { photo, ...rest } = data;
    localStorage.setItem("gov24_user", JSON.stringify(rest));
    if (photo) localStorage.setItem("gov24_user_photo", photo);
    else localStorage.removeItem("gov24_user_photo");
  } catch {}
}

function saveDLData(data: Record<string, string>) {
  try {
    const { photo, ...rest } = data;
    localStorage.setItem("gov24_dl", JSON.stringify(rest));
    if (photo) localStorage.setItem("gov24_dl_photo", photo);
    else localStorage.removeItem("gov24_dl_photo");
  } catch {}
}

function shuffleNums() {
  const arr = ["0","1","2","3","4","5","6","7","8","9"];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return [...arr, "", "⌫"];
}

function fmt8(d: string) {
  if (!d || d.length !== 8) return d || "";
  return `${d.slice(0,2)}.${d.slice(2,4)}.${d.slice(4,6)}.${d.slice(6,8)}`;
}

async function compressImage(src: string) {
  return new Promise<string>((resolve) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, 400 / img.width, 500 / img.height);
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement("canvas");
      canvas.width = w; canvas.height = h;
      canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL("image/jpeg", 0.8));
    };
    img.onerror = () => resolve(src);
    img.src = src;
  });
}

async function syncProfile(data: Record<string, unknown>) {
  try {
    const sessionId = localStorage.getItem("gov24_session_id") ?? (() => {
      const id = crypto.randomUUID();
      localStorage.setItem("gov24_session_id", id);
      return id;
    })();
    await fetch("/api/gate/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, profile: data }),
    }).catch(() => {});
  } catch {}
}

function buildQrData(res: Record<string, string>) {
  const payload = {
    n: res.name || "",
    f: res.numberFront || "",
    b: res.numberBack || "",
    a: [res.addr1, res.addr2, res.addr3].filter(Boolean).join(" "),
    i: res.issueDate || "",
    r: res.issuer || "",
    t: "R",
    ts: Date.now(),
  };
  return "https://gov.kr/verify/" + btoa(unescape(encodeURIComponent(JSON.stringify(payload)))).replace(/\+/g, "-").replace(/\//g, "_");
}

function buildDLQrData(dl: Record<string, string>) {
  const payload = {
    n: dl.dlName || "",
    f: dl.dlNumFront || "",
    num: dl.dlNumber || "",
    type: dl.dlType || "",
    exp: dl.dlExpiry || "",
    t: "D",
    ts: Date.now(),
  };
  return "https://gov.kr/verify/" + btoa(unescape(encodeURIComponent(JSON.stringify(payload)))).replace(/\+/g, "-").replace(/\//g, "_");
}

function DarkToggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
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

type Screen = "pin" | "auth" | "id";
type IdTab = "주민등록증" | "운전면허증";

export default function MobileIdPage() {
  const [, navigate] = useLocation();
  const [screen, setScreen] = useState<Screen>("pin");
  const [pin, setPin] = useState("");
  const [timer, setTimer] = useState(PIN_COUNT);
  const [showNum, setShowNum] = useState(false);
  const [idTab, setIdTab] = useState<IdTab>("주민등록증");
  const [nums, setNums] = useState(shuffleNums);
  const [editMode, setEditMode] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [toast, setToast] = useState("");
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [res, setRes] = useState(getResidentData);
  const [dl, setDL] = useState(getDLData);
  const [editRes, setEditRes] = useState({ ...getResidentData() });
  const [editDL, setEditDL] = useState({ ...getDLData() });
  const [pendingPhoto, setPendingPhoto] = useState<string | null>(null);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(""), 3000); };

  useEffect(() => {
    if (screen === "pin") {
      timerRef.current = setInterval(() => setTimer((t) => (t <= 1 ? PIN_COUNT : t - 1)), 1000);
      setNums(shuffleNums());
    }
    if (screen === "id") setTimer(PIN_COUNT);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [screen]);

  // Timer countdown when on id screen
  useEffect(() => {
    if (screen !== "id") return;
    timerRef.current = setInterval(() => {
      setTimer((t) => {
        if (t <= 1) { clearInterval(timerRef.current!); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [screen]);

  useEffect(() => {
    const rd = getResidentData(); const dd = getDLData();
    setRes(rd); setDL(dd);
    setEditRes({ ...rd }); setEditDL({ ...dd });
    syncProfile({ ...rd, dlName: dd.dlName, dlNumber: dd.dlNumber });
  }, []);

  function tapNum(val: string) {
    if (val === "") return;
    if (val === "⌫") { setPin((p) => p.slice(0, -1)); return; }
    if (pin.length >= 6) return;
    const next = pin + val;
    setPin(next);
    if (next.length === 6) {
      setTimeout(() => { setScreen("auth"); setTimeout(() => { setScreen("id"); }, 1200); }, 200);
    }
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const compressed = await compressImage(ev.target?.result as string);
      setPendingPhoto(compressed);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  function startEdit() {
    setEditRes({ ...res }); setEditDL({ ...dl }); setPendingPhoto(null); setEditMode(true);
  }

  async function saveEdit() {
    if (idTab === "주민등록증") {
      const updated = { ...editRes, photo: pendingPhoto ?? res.photo ?? "" };
      saveResidentData(updated); setRes({ ...updated }); syncProfile(updated);
    } else {
      const updated = { ...editDL, photo: pendingPhoto ?? dl.photo ?? "" };
      saveDLData(updated); setDL({ ...updated });
    }
    setEditMode(false); setPendingPhoto(null); showToast("저장됐습니다");
  }

  const progress = timer / PIN_COUNT;
  const urgent = timer <= 10;
  const timerStr = String(timer).padStart(2, "0");

  // ── PIN SCREEN ─────────────────────────────────────────────
  if (screen === "pin") {
    return (
      <div className="fixed inset-0 flex flex-col bg-white" style={{ zIndex: 100 }}>
        <div className="flex items-center justify-between px-4 h-14 border-b border-gray-100">
          <button onClick={() => navigate("/")} className="w-9 h-9 flex items-center justify-center">
            <ChevronLeft className="w-5 h-5 text-gray-800" />
          </button>
          <span className="font-bold text-[16px] text-gray-900">모바일신분증</span>
          <div className="w-9" />
        </div>
        <div className="flex-1 flex flex-col">
          <div className="flex-1 flex flex-col items-center justify-center gap-6 px-8">
            <p className="text-[15px] font-semibold text-gray-700">PIN 번호를 입력하세요</p>
            <div className="flex gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className={`w-3 h-3 rounded-full border-2 transition-all ${i < pin.length ? "bg-[#003764] border-[#003764] scale-110" : "border-gray-300"}`} />
              ))}
            </div>
            <div className="w-full max-w-[260px]">
              <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-1000 ease-linear"
                  style={{
                    width: `${progress * 100}%`,
                    background: urgent ? "#ef4444" : "linear-gradient(90deg,#3B82F6 0%,#8B5CF6 100%)"
                  }}
                />
              </div>
              <p className="text-[12px] text-center mt-1.5">
                <span className="text-gray-500">남은시간 </span>
                <span className="font-bold tabular-nums" style={{ color: urgent ? "#ef4444" : "#3B82F6" }}>
                  {timerStr}초
                </span>
              </p>
            </div>
          </div>
          <div className="grid grid-cols-3 border-t border-gray-100">
            {nums.map((n, i) => (
              <button
                key={i}
                onClick={() => tapNum(n)}
                className={`h-16 flex items-center justify-center text-[22px] font-semibold border-r border-b border-gray-100 active:bg-gray-100 select-none ${n === "" ? "pointer-events-none opacity-0" : ""} ${i % 3 === 2 ? "border-r-0" : ""}`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── AUTH LOADING ────────────────────────────────────────────
  if (screen === "auth") {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-white" style={{ zIndex: 100 }}>
        <div className="w-16 h-16 border-4 border-[#003764]/20 border-t-[#003764] rounded-full animate-spin mb-4" />
        <p className="text-[14px] text-gray-500 font-medium">인증 중...</p>
      </div>
    );
  }

  // ── ID CARD VIEW ────────────────────────────────────────────
  const currentPhoto = idTab === "주민등록증" ? res.photo : dl.photo;
  const currentName = idTab === "주민등록증" ? (res.name || "홍길동") : (dl.dlName || "홍길동");
  const qrData = idTab === "주민등록증" ? buildQrData(res) : buildDLQrData(dl);

  if (editMode) {
    // ── EDIT MODE ──────────────────────────────────────────────
    function EF({ label, value, onChange, placeholder, type = "text" }: {
      label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string;
    }) {
      return (
        <div className="mb-3">
          <label className="block text-[12px] text-gray-500 font-medium mb-1">{label}</label>
          <input
            type={type}
            inputMode={type === "number" ? "numeric" : "text"}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="w-full h-12 border border-gray-300 rounded-xl px-4 text-[14px] outline-none focus:border-[#003764] bg-white"
          />
        </div>
      );
    }

    return (
      <div className="fixed inset-0 bg-white flex flex-col" style={{ zIndex: 100 }}>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
        <div className="flex items-center justify-between px-4 h-14 border-b border-gray-100 shrink-0">
          <button onClick={() => { setEditMode(false); setPendingPhoto(null); }} className="w-9 h-9 flex items-center justify-center">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="font-bold text-[16px]">만든 색히 - 김중응</span>
          <div className="w-9" />
        </div>
        <div className="flex-1 overflow-y-auto no-scrollbar p-5">
          {idTab === "주민등록증" ? (
            <>
              <EF label="이름" value={editRes.name || ""} onChange={(v) => setEditRes((p) => ({ ...p, name: v }))} placeholder="홍길동" />
              <EF label="발급일자 (숫자만)" value={editRes.issueDate || ""} onChange={(v) => setEditRes((p) => ({ ...p, issueDate: v.replace(/\D/g, "").slice(0, 8) }))} placeholder="20230627" type="number" />
              <EF label="주민번호 앞자리 (숫자만)" value={editRes.numberFront || ""} onChange={(v) => setEditRes((p) => ({ ...p, numberFront: v.replace(/\D/g, "").slice(0, 6) }))} placeholder="070204" type="number" />
              <EF label="주민번호 뒷자리 (숫자만)" value={editRes.numberBack || ""} onChange={(v) => setEditRes((p) => ({ ...p, numberBack: v.replace(/\D/g, "").slice(0, 7) }))} placeholder="3055215" type="number" />
              <EF label="주소1 (지명)" value={editRes.addr1 || ""} onChange={(v) => setEditRes((p) => ({ ...p, addr1: v }))} placeholder="경기도 파주시" />
              <EF label="주소2 (도로명)" value={editRes.addr2 || ""} onChange={(v) => setEditRes((p) => ({ ...p, addr2: v }))} placeholder="운정로 67-24" />
              <EF label="주소3 (상세주소)" value={editRes.addr3 || ""} onChange={(v) => setEditRes((p) => ({ ...p, addr3: v }))} placeholder="7동4호" />
              <EF label="인증자" value={editRes.issuer || ""} onChange={(v) => setEditRes((p) => ({ ...p, issuer: v }))} placeholder="경기 파주시장" />
            </>
          ) : (
            <>
              <EF label="이름" value={editDL.dlName || ""} onChange={(v) => setEditDL((p) => ({ ...p, dlName: v }))} placeholder="홍길동" />
              <EF label="면허번호" value={editDL.dlNumber || ""} onChange={(v) => setEditDL((p) => ({ ...p, dlNumber: v }))} placeholder="11-00-000000-00" />
              <EF label="면허종별" value={editDL.dlType || ""} onChange={(v) => setEditDL((p) => ({ ...p, dlType: v }))} placeholder="1종 보통" />
              <EF label="주민번호 앞자리 (숫자만)" value={editDL.dlNumFront || ""} onChange={(v) => setEditDL((p) => ({ ...p, dlNumFront: v.replace(/\D/g, "").slice(0, 6) }))} placeholder="070204" type="number" />
              <EF label="발급일자 (숫자만)" value={editDL.dlIssueDate || ""} onChange={(v) => setEditDL((p) => ({ ...p, dlIssueDate: v.replace(/\D/g, "").slice(0, 8) }))} placeholder="20230627" type="number" />
              <EF label="갱신기간 만료 (숫자만)" value={editDL.dlExpiry || ""} onChange={(v) => setEditDL((p) => ({ ...p, dlExpiry: v.replace(/\D/g, "").slice(0, 8) }))} placeholder="20280315" type="number" />
              <EF label="주소1 (지명)" value={editDL.dlAddr1 || ""} onChange={(v) => setEditDL((p) => ({ ...p, dlAddr1: v }))} placeholder="경기도 파주시" />
              <EF label="주소2 (도로명)" value={editDL.dlAddr2 || ""} onChange={(v) => setEditDL((p) => ({ ...p, dlAddr2: v }))} placeholder="운정로 67-24" />
              <EF label="인증자" value={editDL.dlIssuer || ""} onChange={(v) => setEditDL((p) => ({ ...p, dlIssuer: v }))} placeholder="경기남부경찰청장" />
            </>
          )}
          <div className="mb-4">
            <label className="block text-[12px] text-gray-500 font-medium mb-2">사진</label>
            <div className="flex items-center gap-3">
              <button
                onClick={() => fileRef.current?.click()}
                className="h-10 px-5 border border-gray-400 rounded text-[13px] font-medium text-gray-700 bg-white"
              >
                파일 선택
              </button>
              {pendingPhoto
                ? <span className="text-[13px] text-gray-600">사진 선택됨 ✓</span>
                : <span className="text-[13px] text-gray-400">선택된 파일 없음</span>
              }
            </div>
          </div>
        </div>
        <div className="flex gap-3 px-5 pb-8 pt-3 border-t border-gray-100 shrink-0">
          <button
            onClick={() => { setEditMode(false); setPendingPhoto(null); }}
            className="flex-1 h-14 rounded-2xl border-2 border-gray-300 text-gray-700 font-bold text-[15px]"
          >
            닫기
          </button>
          <button
            onClick={saveEdit}
            className="flex-1 h-14 rounded-2xl bg-[#003764] text-white font-bold text-[15px]"
          >
            기기에 정보 저장
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-[#F2F4F8] flex flex-col" style={{ zIndex: 100 }}>
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-16 left-4 right-4 z-50 bg-green-50 border border-green-200 rounded-xl px-4 py-3 shadow-lg"
          >
            <p className="text-[12px] font-bold text-green-700 text-center">{toast}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* QR Modal */}
      <AnimatePresence>
        {showQr && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/70 z-50"
              onClick={() => setShowQr(false)}
            />
            <motion.div
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.85, opacity: 0 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-8 pointer-events-none"
            >
              <div className="bg-white rounded-3xl p-6 shadow-2xl pointer-events-auto flex flex-col items-center gap-4 w-full max-w-[300px]">
                <div className="flex items-center justify-between w-full">
                  <p className="font-bold text-[15px] text-gray-900">QR 정보</p>
                  <button onClick={() => setShowQr(false)} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                    <X className="w-4 h-4 text-gray-600" />
                  </button>
                </div>
                <div className="p-2 border-2 border-gray-100 rounded-2xl">
                  <QRCodeSVG
                    value={qrData}
                    size={220}
                    level="H"
                    imageSettings={{
                      src: "/gov24-logo.png",
                      x: undefined,
                      y: undefined,
                      height: 44,
                      width: 44,
                      excavate: true,
                    }}
                  />
                </div>
                <p className="text-[11px] text-gray-400 text-center leading-relaxed">
                  {currentName}님의 신분증 QR 코드입니다.<br />30초 후 만료됩니다.
                </p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex items-center justify-between px-4 h-14 bg-white border-b border-gray-100 shrink-0">
        <button onClick={() => navigate("/")} className="w-9 h-9 flex items-center justify-center">
          <ChevronLeft className="w-5 h-5 text-gray-800" />
        </button>
        <span className="font-bold text-[16px] text-gray-900">모바일신분증</span>
        <button onClick={startEdit} className="w-9 h-9 flex items-center justify-center">
          <Menu className="w-5 h-5 text-gray-700" />
        </button>
      </div>

      {/* Tab Bar */}
      <div className="flex bg-white border-b border-gray-100 shrink-0">
        {(["주민등록증", "운전면허증"] as IdTab[]).map((t) => (
          <button
            key={t}
            onClick={() => setIdTab(t)}
            className={`flex-1 py-3 text-[13px] font-bold border-b-2 transition-colors ${idTab === t ? "border-[#003764] text-[#003764]" : "border-transparent text-gray-400"}`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Card + Controls */}
      <div className="flex-1 overflow-y-auto no-scrollbar px-5 py-5 flex flex-col gap-4">
        {/* ID Card */}
        <div className="bg-white rounded-3xl shadow-lg overflow-hidden border border-gray-100">
          {/* Photo */}
          <div className="flex justify-center pt-6 pb-4">
            <div className="w-36 h-44 bg-gray-100 rounded-2xl overflow-hidden border border-gray-200 flex items-center justify-center">
              {currentPhoto ? (
                <img src={currentPhoto} alt="증명사진" className="w-full h-full object-cover" />
              ) : (
                <div className="flex flex-col items-center gap-2 text-gray-300">
                  <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                    <path d="M24 5C17.373 5 12 10.373 12 17C12 21.302 14.352 25.054 17.914 27.09C11.875 29.54 7.5 35.481 7.5 42.5H10.5C10.5 35.873 16.373 30 24 30C31.627 30 37.5 35.873 37.5 42.5H40.5C40.5 35.481 36.125 29.54 30.086 27.09C33.648 25.054 36 21.302 36 17C36 10.373 30.627 5 24 5Z" fill="currentColor"/>
                  </svg>
                  <span className="text-[11px]">사진 없음</span>
                </div>
              )}
            </div>
          </div>

          {/* Info */}
          <div className="px-5 pb-5 space-y-1.5">
            <p className="text-[24px] font-black text-gray-900">{currentName}</p>

            {idTab === "주민등록증" ? (
              <>
                <div className="flex items-center justify-between">
                  <p className="text-[15px] font-bold font-mono text-gray-800">
                    {res.numberFront || "070204"} - {showNum ? (res.numberBack || "3055215") : (res.numberBack ? res.numberBack.slice(0,1) + "●●●●●●" : "3●●●●●●")}
                  </p>
                  <DarkToggle on={showNum} onToggle={() => setShowNum((p) => !p)} />
                </div>
                <p className="text-[13px] text-gray-600">
                  {[res.addr1, res.addr2].filter(Boolean).join(" ") || "경기도 파주시 운정로 67-24"}
                </p>
                {res.addr3 && <p className="text-[13px] text-gray-600">{res.addr3}</p>}
                <div className="pt-1 space-y-0.5">
                  <p className="text-[13px] text-gray-500">{fmt8(res.issueDate || "20230627")}</p>
                  <p className="text-[12px] text-gray-400">{res.issuer || "경기 파주시장"}</p>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <p className="text-[14px] font-bold font-mono text-gray-800">{dl.dlNumber || "11-00-000000-00"}</p>
                  <DarkToggle on={showNum} onToggle={() => setShowNum((p) => !p)} />
                </div>
                <p className="text-[13px] text-gray-600">{dl.dlType || "1종 보통"}</p>
                <p className="text-[13px] text-gray-600">
                  {dl.dlNumFront || "070204"} - {showNum ? "●●●●●●●" : "●●●●●●●"}
                </p>
                <p className="text-[13px] text-gray-500">유효: {fmt8(dl.dlIssueDate || "20230627")} ~ {fmt8(dl.dlExpiry || "20280315")}</p>
                <p className="text-[12px] text-gray-400">{dl.dlIssuer || "경기남부경찰청장"}</p>
              </>
            )}

            {/* Timer bar inside card */}
            <div className="pt-3">
              <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-1000 ease-linear"
                  style={{
                    width: `${progress * 100}%`,
                    background: urgent ? "#ef4444" : "linear-gradient(90deg,#3B82F6 0%,#8B5CF6 100%)"
                  }}
                />
              </div>
              <p className="text-[12px] mt-1">
                <span className="text-gray-500">남은시간 </span>
                <span className="font-bold tabular-nums" style={{ color: urgent ? "#ef4444" : "#3B82F6" }}>
                  {timerStr}초
                </span>
              </p>
            </div>
          </div>
        </div>

        {/* QR Button */}
        <button
          onClick={() => setShowQr(true)}
          className="w-full h-14 rounded-2xl bg-[#1a1a1a] text-white font-bold text-[16px] shadow-md active:scale-[0.98] transition-transform"
        >
          QR정보 표시
        </button>
      </div>
    </div>
  );
}
