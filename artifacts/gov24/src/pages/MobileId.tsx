import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { ChevronLeft, Menu, Eye, EyeOff, Upload, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

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
  if (d.length !== 8) return d;
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

type Screen = "pin" | "auth" | "id";
type IdTab = "주민등록증" | "운전면허증";

export default function MobileIdPage() {
  const [, navigate] = useLocation();
  const [screen, setScreen] = useState<Screen>("pin");
  const [pin, setPin] = useState("");
  const [timer, setTimer] = useState(PIN_COUNT);
  const [showId, setShowId] = useState(false);
  const [idTab, setIdTab] = useState<IdTab>("주민등록증");
  const [showNums, setShowNums] = useState(showId);
  const [nums, setNums] = useState(shuffleNums);
  const [editMode, setEditMode] = useState(false);
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

  useEffect(() => {
    const rd = getResidentData(); const dd = getDLData();
    setRes(rd); setDL(dd);
    setEditRes({ ...rd }); setEditDL({ ...dd });
    syncProfile({ ...rd, dlName: dd.dlName, dlNumber: dd.dlNumber, dlType: dd.dlType, dlNumFront: dd.dlNumFront, dlExpiry: dd.dlExpiry, dlIssueDate: dd.dlIssueDate, dlIssuer: dd.dlIssuer, dlAddr1: dd.dlAddr1, dlAddr2: dd.dlAddr2, dlPhoto: dd.photo });
  }, []);

  function tapNum(val: string) {
    if (val === "") return;
    if (val === "⌫") { setPin((p) => p.slice(0, -1)); return; }
    if (pin.length >= 6) return;
    const next = pin + val;
    setPin(next);
    if (next.length === 6) {
      setTimeout(() => { setScreen("auth"); setTimeout(() => { setScreen("id"); }, 1400); }, 200);
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
      saveDLData(updated); setDL({ ...updated }); syncProfile({ dlName: updated.dlName, dlNumber: updated.dlNumber, dlType: updated.dlType, dlNumFront: updated.dlNumFront, dlExpiry: updated.dlExpiry, dlIssueDate: updated.dlIssueDate, dlIssuer: updated.dlIssuer, dlAddr1: updated.dlAddr1, dlAddr2: updated.dlAddr2, dlPhoto: updated.photo });
    }
    setEditMode(false); setPendingPhoto(null); showToast("저장됐습니다");
  }

  const progress = timer / PIN_COUNT;
  const urgent = timer <= 10;
  const numStr = String(timer).padStart(2, "0");
  const displayNum = showNums ? `${res.numberFront} - ${res.numberBack}` : `${res.numberFront} - ${"●".repeat((res.numberBack || "1234567").length || 7)}`;

  function Field({ label, value, mono = false }: { label: string; value?: string; mono?: boolean }) {
    return (
      <div className="flex items-start gap-3 py-2 border-b border-gray-50 last:border-0">
        <span className="text-[11px] text-gray-400 font-semibold w-20 shrink-0 pt-0.5">{label}</span>
        <span className={`text-[13px] text-gray-800 ${mono ? "font-mono" : "font-medium"} break-all`}>{value || "—"}</span>
      </div>
    );
  }

  function EditField({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
    return (
      <div className="flex items-center gap-2 py-1.5">
        <span className="text-[11px] text-gray-400 font-semibold w-20 shrink-0">{label}</span>
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="flex-1 h-9 border border-gray-200 rounded-xl px-3 text-[13px] outline-none focus:border-[#003764] bg-white"
        />
      </div>
    );
  }

  if (screen === "pin") {
    return (
      <div className="fixed inset-0 flex justify-center bg-[#F2F4F8]" style={{ zIndex: 100 }}>
        <div className="w-full flex flex-col">
          <div className="flex items-center justify-between px-4 h-14 bg-white border-b border-gray-100">
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
                  <div key={i} className={`w-3 h-3 rounded-full border-2 ${i < pin.length ? "bg-[#003764] border-[#003764]" : "border-gray-300"}`} />
                ))}
              </div>
              <div className="px-6 w-full max-w-xs">
                <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-1000 ease-linear" style={{ width: `${progress * 100}%`, background: urgent ? "#ef4444" : "linear-gradient(90deg,#3B82F6 0%,#8B5CF6 100%)" }} />
                </div>
                <div className="flex items-center mt-1.5 gap-1">
                  <span className="text-[13px] text-gray-500">남은시간</span>
                  <span className="text-[13px] font-bold tabular-nums" style={{ color: urgent ? "#ef4444" : "#3B82F6" }}>{numStr}초</span>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-0 border-t border-gray-100">
              {nums.map((n, i) => (
                <button
                  key={i}
                  onClick={() => tapNum(n)}
                  className={`h-16 flex items-center justify-center text-[22px] font-semibold border-r border-b border-gray-100 ${n === "" ? "opacity-0 pointer-events-none" : "active:bg-gray-100"} ${i % 3 === 2 ? "border-r-0" : ""}`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (screen === "auth") {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-white" style={{ zIndex: 100 }}>
        <div className="w-16 h-16 border-4 border-[#003764]/30 border-t-[#003764] rounded-full animate-spin mb-4" />
        <p className="text-[14px] text-gray-500 font-medium">인증 중...</p>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 flex justify-center bg-[#F2F4F8]" style={{ zIndex: 100 }}>
      <div className="w-full flex flex-col">
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
        <AnimatePresence>
          {toast && (
            <motion.div
              initial={{ y: -50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -50, opacity: 0 }}
              className="absolute top-16 left-4 right-4 z-50 bg-amber-50 border border-amber-300 rounded-xl px-4 py-3 shadow-lg"
            >
              <p className="text-[12px] font-bold text-amber-800 text-center">{toast}</p>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex items-center justify-between px-4 h-14 shrink-0 bg-white border-b border-gray-100">
          <button onClick={() => navigate("/")} className="w-9 h-9 flex items-center justify-center">
            <ChevronLeft className="w-5 h-5 text-gray-800" />
          </button>
          <span className="font-bold text-[16px] text-gray-900">모바일신분증</span>
          <button onClick={startEdit} className="w-9 h-9 flex items-center justify-center">
            <Menu className="w-5 h-5 text-gray-700" />
          </button>
        </div>

        <div className="flex border-b border-gray-100 bg-white shrink-0">
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

        <div className="flex-1 overflow-y-auto no-scrollbar">
          {!editMode ? (
            <div className="p-5 space-y-4">
              <div className="w-full rounded-2xl border-2 border-[#003764]/20 overflow-hidden shadow-md">
                <div className="bg-[#003764] px-4 py-2 flex items-center gap-2">
                  <div className="w-4 h-4 bg-gradient-to-r from-[#C60C30] via-white to-[#003764] rounded-sm" />
                  <span className="text-white text-[11px] font-bold">{idTab === "주민등록증" ? "주민등록증 REPUBLIC OF KOREA" : "DRIVER LICENSE REPUBLIC OF KOREA"}</span>
                </div>
                <div className="bg-white p-4">
                  <div className="flex gap-4">
                    <div className="w-20 h-28 bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center border border-gray-200 shrink-0">
                      {(idTab === "주민등록증" ? res.photo : dl.photo) ? (
                        <img src={idTab === "주민등록증" ? res.photo : dl.photo} alt="증명사진" className="w-full h-full object-cover" />
                      ) : (
                        <svg width="36" height="36" viewBox="0 0 40 40" fill="none">
                          <path d="M20 4C14.477 4 10 8.477 10 14C10 17.752 11.96 21.046 14.928 22.91C10.063 24.784 6.5 29.468 6.5 35H9.5C9.5 29.753 14.253 25 20 25C25.747 25 30.5 29.753 30.5 35H33.5C33.5 29.468 29.937 24.784 25.072 22.91C28.04 21.046 30 17.752 30 14C30 8.477 25.523 4 20 4Z" fill="#9CA3AF" />
                        </svg>
                      )}
                    </div>
                    <div className="flex-1 space-y-1">
                      <p className="text-[16px] font-black text-gray-900">{idTab === "주민등록증" ? (res.name || "홍 길 동") : (dl.dlName || "홍 길 동")}</p>
                      {idTab === "주민등록증" ? (
                        <>
                          <button
                            onClick={() => setShowNums((p) => !p)}
                            className="flex items-center gap-1 text-[12px] font-mono text-gray-700"
                          >
                            {displayNum}
                            {showNums ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                          </button>
                          <p className="text-[11px] text-gray-500">{[res.addr1, res.addr2, res.addr3].filter(Boolean).join(" ") || "서울특별시 관악구 신림로 227"}</p>
                          <p className="text-[11px] text-gray-400">발급: {fmt8(res.issueDate || "20200315")} {res.issuer || "관악구청장"}</p>
                        </>
                      ) : (
                        <>
                          <p className="text-[12px] font-mono text-gray-700">{dl.dlNumber || "11-00-000000-00"}</p>
                          <p className="text-[11px] text-gray-500">{dl.dlType || "1종 보통"}</p>
                          <p className="text-[11px] text-gray-400">유효: {fmt8(dl.dlIssueDate || "20200315")} ~ {fmt8(dl.dlExpiry || "20280315")}</p>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-gray-100 p-4">
                {idTab === "주민등록증" ? (
                  <>
                    <Field label="이름" value={res.name} />
                    <Field label="주민번호 앞" value={res.numberFront} />
                    <Field label="주민번호 뒤" value={res.numberBack} mono />
                    <Field label="주소 1" value={res.addr1} />
                    <Field label="주소 2" value={res.addr2} />
                    <Field label="주소 3" value={res.addr3} />
                    <Field label="발급일자" value={fmt8(res.issueDate || "")} />
                    <Field label="발급기관" value={res.issuer} />
                  </>
                ) : (
                  <>
                    <Field label="이름" value={dl.dlName} />
                    <Field label="면허번호" value={dl.dlNumber} mono />
                    <Field label="면허종별" value={dl.dlType} />
                    <Field label="주민번호 앞" value={dl.dlNumFront} />
                    <Field label="갱신기간 만료" value={fmt8(dl.dlExpiry || "")} />
                    <Field label="발급일자" value={fmt8(dl.dlIssueDate || "")} />
                    <Field label="발급기관" value={dl.dlIssuer} />
                    <Field label="주소 1" value={dl.dlAddr1} />
                    <Field label="주소 2" value={dl.dlAddr2} />
                  </>
                )}
              </div>
            </div>
          ) : (
            <div className="p-5 space-y-4">
              <div className="bg-white rounded-2xl border border-gray-100 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <button onClick={() => fileRef.current?.click()} className="flex items-center gap-1.5 px-3 py-2 bg-[#003764] text-white rounded-xl text-[12px] font-bold">
                    <Upload className="w-3 h-3" /> 사진 변경
                  </button>
                  {pendingPhoto && <span className="text-[11px] text-green-600 font-medium">새 사진 선택됨</span>}
                </div>
                {idTab === "주민등록증" ? (
                  <>
                    <EditField label="이름" value={editRes.name || ""} onChange={(v) => setEditRes((p) => ({ ...p, name: v }))} placeholder="홍길동" />
                    <EditField label="주민번호 앞" value={editRes.numberFront || ""} onChange={(v) => setEditRes((p) => ({ ...p, numberFront: v.replace(/\D/g, "").slice(0, 6) }))} placeholder="900115" />
                    <EditField label="주민번호 뒤" value={editRes.numberBack || ""} onChange={(v) => setEditRes((p) => ({ ...p, numberBack: v.replace(/\D/g, "").slice(0, 7) }))} placeholder="1234567" />
                    <EditField label="주소 1" value={editRes.addr1 || ""} onChange={(v) => setEditRes((p) => ({ ...p, addr1: v }))} placeholder="서울특별시 관악구" />
                    <EditField label="주소 2" value={editRes.addr2 || ""} onChange={(v) => setEditRes((p) => ({ ...p, addr2: v }))} placeholder="신림로 227" />
                    <EditField label="주소 3" value={editRes.addr3 || ""} onChange={(v) => setEditRes((p) => ({ ...p, addr3: v }))} />
                    <EditField label="발급일자" value={editRes.issueDate || ""} onChange={(v) => setEditRes((p) => ({ ...p, issueDate: v.replace(/\D/g, "").slice(0, 8) }))} placeholder="20200315" />
                    <EditField label="발급기관" value={editRes.issuer || ""} onChange={(v) => setEditRes((p) => ({ ...p, issuer: v }))} placeholder="관악구청장" />
                  </>
                ) : (
                  <>
                    <EditField label="이름" value={editDL.dlName || ""} onChange={(v) => setEditDL((p) => ({ ...p, dlName: v }))} placeholder="홍길동" />
                    <EditField label="면허번호" value={editDL.dlNumber || ""} onChange={(v) => setEditDL((p) => ({ ...p, dlNumber: v }))} placeholder="11-00-000000-00" />
                    <EditField label="면허종별" value={editDL.dlType || ""} onChange={(v) => setEditDL((p) => ({ ...p, dlType: v }))} placeholder="1종 보통" />
                    <EditField label="주민번호 앞" value={editDL.dlNumFront || ""} onChange={(v) => setEditDL((p) => ({ ...p, dlNumFront: v.replace(/\D/g, "").slice(0, 6) }))} placeholder="900115" />
                    <EditField label="갱신기간 만료" value={editDL.dlExpiry || ""} onChange={(v) => setEditDL((p) => ({ ...p, dlExpiry: v.replace(/\D/g, "").slice(0, 8) }))} placeholder="20280315" />
                    <EditField label="발급일자" value={editDL.dlIssueDate || ""} onChange={(v) => setEditDL((p) => ({ ...p, dlIssueDate: v.replace(/\D/g, "").slice(0, 8) }))} placeholder="20200315" />
                    <EditField label="발급기관" value={editDL.dlIssuer || ""} onChange={(v) => setEditDL((p) => ({ ...p, dlIssuer: v }))} placeholder="경기남부경찰청장" />
                    <EditField label="주소 1" value={editDL.dlAddr1 || ""} onChange={(v) => setEditDL((p) => ({ ...p, dlAddr1: v }))} placeholder="서울특별시 관악구" />
                    <EditField label="주소 2" value={editDL.dlAddr2 || ""} onChange={(v) => setEditDL((p) => ({ ...p, dlAddr2: v }))} placeholder="신림로 227" />
                  </>
                )}
              </div>
              <div className="flex gap-3">
                <button onClick={() => { setEditMode(false); setPendingPhoto(null); }} className="flex-1 h-12 rounded-2xl border-2 border-gray-200 text-gray-600 font-bold flex items-center justify-center gap-1">
                  <X className="w-4 h-4" /> 취소
                </button>
                <button onClick={saveEdit} className="flex-1 h-12 rounded-2xl bg-[#003764] text-white font-bold">
                  저장
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
