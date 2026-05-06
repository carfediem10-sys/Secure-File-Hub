import { useState } from "react";
import { Search, FileText, ChevronRight, Users, Home, Car, Coins } from "lucide-react";
import { motion } from "framer-motion";

const CATS = [
  { id: "전체", Icon: FileText },
  { id: "주민·가족", Icon: Users },
  { id: "부동산·건축", Icon: Home },
  { id: "자동차·이전", Icon: Car },
  { id: "세금·금융", Icon: Coins },
];

const SERVICES = [
  { id: 1, title: "주민등록표등본(초본)교부", category: "주민·가족", desc: "주민등록표 등본 및 초본을 발급받는 민원", type: "발급", time: "즉시" },
  { id: 2, title: "건강보험료 납부확인서", category: "세금·금융", desc: "건강보험료 납부내역을 확인하는 서류 발급", type: "발급", time: "즉시" },
  { id: 3, title: "이전면허증 지원사부 조회", category: "자동차·이전", desc: "이전면허증의 지원사부를 조회하는 서비스", type: "조회", time: "즉시" },
  { id: 4, title: "사업자등록증명", category: "세금·금융", desc: "사업자등록 내역을 증명하는 서류 발급", type: "발급", time: "즉시" },
  { id: 5, title: "지방세 납세증명서", category: "세금·금융", desc: "지방세를 체납한 사실이 없음을 증명", type: "발급", time: "즉시" },
  { id: 6, title: "건축물대장 발급", category: "부동산·건축", desc: "건축물대장 현황 및 소유내역 발급", type: "발급", time: "즉시" },
];

export default function CivilServiceTab() {
  const [cat, setCat] = useState("전체");
  const [search, setSearch] = useState("");
  const filtered = SERVICES.filter(
    (s) => (cat === "전체" || s.category === cat) && s.title.includes(search)
  );

  return (
    <div className="w-full h-full flex flex-col overflow-hidden bg-gray-50">
      <header className="bg-white px-5 py-4 sticky top-0 z-40 border-b border-gray-100 shadow-sm shrink-0">
        <h1 className="text-xl font-bold text-gray-900 mb-4">민원서비스</h1>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 h-12 bg-gray-100 border-transparent rounded-xl outline-none text-[14px] focus:bg-white focus:ring-2 focus:ring-[#003764]/30 transition-colors"
            placeholder="찾으시는 민원서비스를 입력하세요"
          />
        </div>
      </header>

      <div className="bg-white border-b border-gray-100 shrink-0">
        <div className="flex overflow-x-auto no-scrollbar p-3 px-5 gap-2">
          {CATS.map(({ id, Icon }) => {
            const active = cat === id;
            return (
              <button
                key={id}
                onClick={() => setCat(id)}
                className={`flex items-center px-4 py-2 rounded-full text-sm font-medium transition-colors border shrink-0 ${
                  active
                    ? "bg-[#003764] text-white border-[#003764] shadow-sm"
                    : "bg-white text-gray-600 border-gray-200"
                }`}
              >
                <Icon className="w-4 h-4 mr-1.5" />
                {id}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar p-5 space-y-3">
        <p className="text-sm text-gray-500 font-medium mb-2">
          총 <span className="text-[#003764] font-bold">{filtered.length}</span>건의 서비스
        </p>
        {filtered.map((s, i) => (
          <motion.div
            key={s.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 cursor-pointer group hover:border-[#003764]/30 transition-colors">
              <div className="flex items-start justify-between">
                <div className="flex-1 pr-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="bg-gray-100 text-gray-600 text-[10px] font-medium px-2 py-0.5 rounded-md">{s.category}</span>
                    <span className="border border-[#003764]/20 text-[#003764] text-[10px] font-medium px-2 py-0.5 rounded-md">{s.type}</span>
                  </div>
                  <h3 className="font-bold text-gray-900 text-base mb-1 group-hover:text-[#003764] transition-colors">{s.title}</h3>
                  <p className="text-xs text-gray-500 mb-4 leading-relaxed">{s.desc}</p>
                  <div className="flex items-center text-[11px] text-gray-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 mr-1.5" />
                    처리: {s.time}
                  </div>
                </div>
                <div className="w-12 h-12 rounded-full bg-[#003764]/5 flex items-center justify-center group-hover:bg-[#003764] text-[#003764] group-hover:text-white transition-colors shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-gray-50 flex gap-2">
                <button className="flex-1 h-10 rounded-xl border border-gray-200 text-gray-700 font-medium text-sm">상세안내</button>
                <button className="flex-1 h-10 rounded-xl bg-[#003764] hover:bg-[#002a4e] text-white font-medium text-sm shadow-sm transition-colors">신청하기</button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
