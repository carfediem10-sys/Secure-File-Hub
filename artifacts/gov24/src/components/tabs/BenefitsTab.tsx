import { useState } from "react";
import { Search, Baby, Briefcase, Home, Heart } from "lucide-react";
import { motion } from "framer-motion";

const CATS = [
  { id: "전체", Icon: Search },
  { id: "출산·양육", Icon: Baby },
  { id: "취업·창업", Icon: Briefcase },
  { id: "주거", Icon: Home },
  { id: "복지·금융", Icon: Heart },
];

const BENEFITS = [
  { id: 1, title: "아동수당 지급", category: "출산·양육", target: "만 8세 미만 아동", content: "매월 10만원 현금 지급", dday: "상시신청", tags: ["현금지원", "보건복지부"] },
  { id: 2, title: "청년 전세 특별지원", category: "주거", target: "만 19~34세 무주택 청년", content: "최대 20만원 월세 지원 (최대 12개월)", dday: "D-15", tags: ["주거지원", "국토교통부"] },
  { id: 3, title: "기초연금", category: "복지·금융", target: "만 65세 이상 소득하위 70%", content: "매월 최대 32만원 연금 지급", dday: "상시신청", tags: ["현금지원", "보건복지부"] },
  { id: 4, title: "청년창업지원금", category: "취업·창업", target: "만 39세 이하 예비창업자", content: "최대 1억원 바우처 및 멘토링 지원", dday: "D-5", tags: ["창업지원", "중소벤처기업부"] },
  { id: 5, title: "육아휴직급여", category: "출산·양육", target: "만 8세 이하 자녀를 둔 근로자", content: "통상임금의 80% (상한액 150만원)", dday: "상시신청", tags: ["현금지원", "고용노동부"] },
];

export default function BenefitsTab() {
  const [cat, setCat] = useState("전체");
  const filtered = BENEFITS.filter((b) => cat === "전체" || b.category === cat);

  return (
    <div className="w-full h-full flex flex-col overflow-hidden bg-gray-50">
      <section className="bg-gradient-to-r from-rose-500 to-[#C60C30] pt-12 pb-16 px-5 relative overflow-hidden rounded-b-[2.5rem] shadow-md shrink-0">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10" />
        <div className="relative z-10 flex flex-col items-center text-center">
          <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center mb-4 backdrop-blur-sm border border-white/20">
            <Heart className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2 leading-tight">
            나에게 맞는 혜택을<br />찾아드립니다
          </h1>
          <p className="text-white/80 text-sm">조건만 입력하면 맞춤 혜택을 알려드려요</p>
          <button className="mt-6 bg-white text-[#C60C30] hover:bg-gray-100 rounded-xl px-6 py-3.5 font-bold shadow-lg w-full max-w-[280px] flex items-center justify-center gap-2">
            <Search className="w-4 h-4" /> 맞춤 혜택 찾기 시작
          </button>
        </div>
      </section>

      <div className="px-2 mt-[-1.5rem] relative z-20 shrink-0">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-2 mx-3 flex overflow-x-auto no-scrollbar gap-1">
          {CATS.map(({ id }) => {
            const active = cat === id;
            return (
              <button
                key={id}
                onClick={() => setCat(id)}
                className={`flex-1 min-w-[70px] flex flex-col items-center justify-center py-3 px-1 rounded-xl transition-all ${active ? "bg-red-50" : ""}`}
              >
                <span className={`text-sm font-bold transition-colors ${active ? "text-[#C60C30]" : "text-gray-500"}`}>
                  {id}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-gray-900 text-lg">
            추천 혜택 <span className="text-[#C60C30]">{filtered.length}</span>
          </h2>
          <button className="text-xs text-gray-500 h-8 px-2">최신순</button>
        </div>
        <div className="space-y-3">
          {filtered.map((b, i) => (
            <motion.div
              key={b.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
            >
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 cursor-pointer group hover:shadow-md transition-all">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex gap-1.5 flex-wrap">
                    {b.tags.map((t) => (
                      <span key={t} className="bg-gray-100 text-gray-600 text-[10px] font-medium px-2 py-0.5 rounded-md">{t}</span>
                    ))}
                  </div>
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${b.dday === "상시신청" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"}`}>
                    {b.dday}
                  </span>
                </div>
                <h3 className="font-bold text-gray-900 text-base mb-1 group-hover:text-[#C60C30] transition-colors">{b.title}</h3>
                <p className="text-xs text-gray-500 mb-1">대상: {b.target}</p>
                <p className="text-sm text-gray-700 font-medium mb-4">{b.content}</p>
                <div className="flex gap-2 pt-3 border-t border-gray-50">
                  <button className="flex-1 h-10 rounded-xl border border-gray-200 text-gray-700 text-sm font-medium">상세보기</button>
                  <button className="flex-1 h-10 rounded-xl bg-[#C60C30] hover:bg-[#a50a28] text-white text-sm font-medium transition-colors">신청하기</button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
