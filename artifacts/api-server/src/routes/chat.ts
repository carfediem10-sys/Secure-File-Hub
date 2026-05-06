import { Router } from "express";

const chatRouter = Router();

const GOV_KNOWLEDGE: Record<string, string> = {
  "주민등록": "주민등록 관련 민원은 정부24(gov.kr)에서 온라인으로 신청하거나, 가까운 주민센터를 방문하시면 됩니다. 주민등록등본은 온라인 즉시 발급이 가능합니다.",
  "건강보험": "건강보험료 관련 사항은 국민건강보험공단(nhis.or.kr)에서 확인하시거나, 1577-1000으로 문의하세요. 납부확인서는 정부24에서 무료로 발급 가능합니다.",
  "연금": "국민연금 관련 문의는 국민연금공단(nps.or.kr) 또는 1355로 연락하세요. 예상 수령액은 내 연금 알아보기 서비스에서 확인 가능합니다.",
  "일자리": "청년 취업 지원은 고용24(work24.go.kr)에서 확인하세요. 국민취업지원제도, 청년도약계좌, 청년일자리도약장려금 등 다양한 지원이 있습니다.",
  "창업": "창업 지원은 중소벤처기업부(mss.go.kr)에서 다양한 프로그램을 운영 중입니다. 창업진흥원의 K-Startup을 통해 지원금 및 멘토링을 받을 수 있습니다.",
  "아동수당": "아동수당은 만 8세 미만(0~95개월) 모든 아동에게 월 10만원이 지급됩니다. 복지로(bokjiro.go.kr) 또는 가까운 주민센터에서 신청하세요.",
  "기초연금": "기초연금은 만 65세 이상 소득 하위 70% 어르신에게 매월 최대 32만원이 지급됩니다. 국민연금공단이나 주민센터에서 신청 가능합니다.",
  "여권": "여권 발급은 외교부 여권안내 홈페이지(passport.go.kr)에서 신청할 수 있습니다. 일반 여권은 접수 후 약 3~5 영업일 내 발급됩니다.",
  "자동차": "자동차 등록 관련 민원은 자동차민원 대국민포털(ecar.go.kr)에서 처리하세요. 이전등록, 변경등록 등 다양한 서비스를 온라인으로 신청할 수 있습니다.",
  "세금": "국세 관련 문의는 국세청(nts.go.kr) 또는 국세상담센터(126)에 연락하세요. 종합소득세 신고는 홈택스(hometax.go.kr)에서 할 수 있습니다.",
};

function generateReply(message: string): string {
  const lower = message.toLowerCase();
  for (const [keyword, answer] of Object.entries(GOV_KNOWLEDGE)) {
    if (message.includes(keyword)) return answer;
  }
  if (lower.includes("안녕") || lower.includes("hello") || lower.includes("hi")) {
    return "안녕하세요! 정부24 AI입니다 😊 정부 서비스, 민원 신청, 혜택 조회 등 무엇이든 도와드리겠습니다!";
  }
  if (lower.includes("감사") || lower.includes("고마")) {
    return "도움이 되셨다니 기쁩니다! 더 궁금하신 사항이 있으시면 언제든지 물어보세요 😊";
  }
  if (message.includes("어디") || message.includes("어떻게") || message.includes("방법")) {
    return `"${message}" 에 대해 좀 더 구체적으로 설명해 주시면 더 정확한 안내를 드릴 수 있습니다. 예를 들어 어떤 서비스나 지원을 찾고 계신지 알려주세요!`;
  }
  const responses = [
    `"${message}"에 대한 정보를 확인해드리겠습니다. 관련 부서나 기관에 직접 문의하시거나 정부24(gov.kr)를 방문해 보세요.`,
    `해당 사항은 관련 기관에 문의하시는 것이 가장 정확합니다. 정부24 콜센터(1588-2188)로 연락하시면 상세한 안내를 받으실 수 있습니다.`,
    `좋은 질문이에요! 정부24 포털에서 관련 서비스를 검색하시거나, 가까운 주민센터를 방문하시면 자세한 안내를 받으실 수 있습니다.`,
  ];
  return responses[Math.floor(Math.random() * responses.length)];
}

chatRouter.post("/chat", async (req, res) => {
  try {
    const { message } = req.body as { message: string; history?: unknown[] };
    if (!message) {
      res.status(400).json({ error: "message required" });
      return;
    }
    await new Promise((r) => setTimeout(r, 300 + Math.random() * 400));
    const reply = generateReply(message);
    res.json({ reply });
  } catch {
    res.status(500).json({ error: "Internal server error" });
  }
});

export default chatRouter;
