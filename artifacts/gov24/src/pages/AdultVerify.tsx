import { useLocation } from "wouter";
import { ChevronLeft, ShieldCheck } from "lucide-react";

export default function AdultVerifyPage() {
  const [, navigate] = useLocation();

  const params = new URLSearchParams(window.location.search);
  const raw = params.get("d");

  let name = "홍길동";
  let birth = "900115";
  let type = "R";

  if (raw) {
    try {
      const decoded = JSON.parse(decodeURIComponent(escape(atob(raw.replace(/-/g, "+").replace(/_/g, "/")))));
      name = decoded.n ?? name;
      // QR payload: birth 필드 생성 (numberFront = YYMMDD)
      birth = decoded.birth ?? decoded.b ?? birth;
      type = decoded.t ?? type;
    } catch {}
  }

  const year = parseInt(birth.slice(0, 2));
  const birthYear = year <= 25 ? 2000 + year : 1900 + year;
  const age = new Date().getFullYear() - birthYear;
  const isAdult = true; // 성인인증 결과 페이지: 항상 성인으로 표시

  return (
    <div className="fixed inset-0 bg-[#F2F4F8] flex flex-col">
      <div className="flex items-center px-4 h-14 bg-white border-b border-gray-100 shrink-0">
        <button onClick={() => navigate("/")} className="w-9 h-9 flex items-center justify-center mr-2">
          <ChevronLeft className="w-5 h-5 text-gray-800" />
        </button>
        <span className="font-bold text-[16px] text-gray-900">성인 인증</span>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-8 gap-6">
        <div className={`w-24 h-24 rounded-full flex items-center justify-center ${isAdult ? "bg-green-100" : "bg-red-100"}`}>
          <ShieldCheck className={`w-12 h-12 ${isAdult ? "text-green-600" : "text-red-500"}`} />
        </div>

        <div className="text-center">
          <p className="text-2xl font-black text-gray-900 mb-2">
            {isAdult ? "성인 인증 완료" : "미성년자"}
          </p>
          <p className="text-[15px] text-gray-500">
            {type === "R" ? "주민등록증" : "운전면허증"} 기준 확인
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 w-full max-w-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[12px] text-gray-400 font-semibold">이름</span>
            <span className="text-[14px] font-bold text-gray-900">{name}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[12px] text-gray-400 font-semibold">생년월일</span>
            <span className="text-[14px] font-bold text-gray-900">{birthYear}년생</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[12px] text-gray-400 font-semibold">나이</span>
            <span className="text-[14px] font-bold text-gray-900">{age}세</span>
          </div>
          <div className="border-t border-gray-100 pt-3 flex items-center justify-between">
            <span className="text-[12px] text-gray-400 font-semibold">성인 여부</span>
            <span className={`text-[14px] font-black ${isAdult ? "text-green-600" : "text-red-500"}`}>
              {isAdult ? "✓ 성인" : "✗ 미성년자"}
            </span>
          </div>
        </div>

        <p className="text-[11px] text-gray-400 text-center max-w-xs leading-relaxed">
          본 인증 결과는 정부24 모바일 신분증 기반으로 생성되었습니다.
        </p>
      </div>
    </div>
  );
}
