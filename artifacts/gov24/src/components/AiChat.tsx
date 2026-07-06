import { useState, useRef, useEffect } from "react";
import { api } from "../api";
import { X, Send, Bot } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

interface Message {
  type: "user" | "bot";
  text: string;
  image?: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
}

const COMMANDS: Record<string, () => Partial<Message>> = {
  "!도움말": () => ({
    text: "📋 사용 가능한 명령어\n\n!야짤 — 야짤 전송\n!도움말 — 명령어 목록",
  }),
};

export default function AiChat({ open, onClose }: Props) {
  const [messages, setMessages] = useState<Message[]>([
    { type: "bot", text: "안녕하세요! 정부24 AI입니다. 무엇이든 물어보세요 😊" },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function send(text?: string) {
    const msg = (text ?? input).trim();
    if (!msg || loading) return;
    setInput("");

    if (COMMANDS[msg]) {
      setMessages((p) => [...p, { type: "user", text: msg }, { type: "bot", ...COMMANDS[msg]() }]);
      return;
    }

    setMessages((p) => [...p, { type: "user", text: msg }]);
    setLoading(true);
    try {
      const history = messages.map((m) => ({
        role: m.type === "user" ? "user" : "assistant",
        content: m.text,
      }));
      const res = await fetch(api("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: msg, history }),
      });
      const data = await res.json();
      setMessages((p) => [...p, { type: "bot", text: data.reply ?? "오류가 발생했습니다." }]);
    } catch {
      setMessages((p) => [...p, { type: "bot", text: "네트워크 오류가 발생했습니다. 다시 시도해주세요." }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-40"
            onClick={onClose}
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl flex flex-col"
            style={{ maxHeight: "80dvh" }}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-[#4DD9AC] rounded-full flex items-center justify-center">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="font-bold text-[15px] text-gray-900">정부24 AI</p>
                  <p className="text-[10px] text-green-500 font-medium">● 온라인</p>
                </div>
              </div>
              <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                <X className="w-4 h-4 text-gray-600" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 no-scrollbar">
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.type === "user" ? "justify-end" : "justify-start"}`}>
                  {m.type === "bot" && (
                    <div className="w-6 h-6 bg-[#4DD9AC] rounded-full flex items-center justify-center mr-2 shrink-0 mt-0.5">
                      <Bot className="w-3 h-3 text-white" />
                    </div>
                  )}
                  <div
                    className={`max-w-[75%] rounded-2xl px-3 py-2 text-[13px] leading-relaxed whitespace-pre-wrap ${
                      m.type === "user"
                        ? "bg-[#003764] text-white rounded-br-sm"
                        : "bg-gray-100 text-gray-800 rounded-bl-sm"
                    }`}
                  >
                    {m.image ? (
                      <img src={m.image} alt="" className="rounded-lg max-w-full" />
                    ) : (
                      m.text
                    )}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="w-6 h-6 bg-[#4DD9AC] rounded-full flex items-center justify-center mr-2 shrink-0 mt-0.5">
                    <Bot className="w-3 h-3 text-white" />
                  </div>
                  <div className="bg-gray-100 rounded-2xl rounded-bl-sm px-4 py-3">
                    <div className="flex gap-1">
                      {[0, 1, 2].map((i) => (
                        <div
                          key={i}
                          className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"
                          style={{ animationDelay: `${i * 0.15}s` }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            <div className="px-4 py-3 border-t border-gray-100 shrink-0 safe-bottom">
              <div className="flex items-center gap-2 mb-2">
                {["정부 지원금", "민원 신청", "!도움말"].map((q) => (
                  <button
                    key={q}
                    onClick={() => send(q)}
                    className="text-[11px] px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full font-medium"
                  >
                    {q}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && send()}
                  placeholder="메시지를 입력하세요..."
                  className="flex-1 h-11 bg-gray-100 rounded-xl px-4 text-[14px] outline-none"
                />
                <button
                  onClick={() => send()}
                  disabled={!input.trim() || loading}
                  className="w-11 h-11 bg-[#003764] text-white rounded-xl flex items-center justify-center disabled:opacity-40"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
