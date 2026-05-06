# 정부24 클론

한국 정부 포털(정부24)을 클론한 풀스택 앱으로, 비밀번호 게이트, 모바일 신분증, 성인 인증, AI 챗봇, 게이트/접근 제어, 방문자 로그, 관리자/개발자 인증을 포함합니다.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — API 서버 실행 (port 8080)
- `pnpm --filter @workspace/gov24 run dev` — 프론트엔드 실행 (port 25406)
- `pnpm run typecheck` — 전체 타입 체크

Required env: `SESSION_SECRET`

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React 18 + Vite, Tailwind CSS v4, framer-motion, wouter, lucide-react, qrcode.react
- Backend: Express 5 (in-memory state)
- Build: esbuild (CJS bundle)

## Where things live

```
artifacts/gov24/src/
  App.tsx                        — 라우터 + GateScreen 래퍼
  components/
    GateScreen.tsx               — 게이트 진입/대기/거절/강퇴 화면 (앱 전체 래핑)
    BottomNav.tsx                — 하단 탭바
    AiChat.tsx                   — AI 챗봇 슬라이드업 패널
    tabs/
      HomeTab.tsx                — 홈탭
      CivilServiceTab.tsx        — 민원서비스 탭
      BenefitsTab.tsx            — 혜택알리미 탭
      MyGovTab.tsx               — MY정부24 (로그인, 관리자/개발자 인증, 게이트/방문자 로그 패널)
  pages/
    Home.tsx                     — 메인 4탭 레이아웃
    MobileId.tsx                 — 모바일 신분증 (PIN → 신분증 뷰 → QR 모달)
    AdultVerify.tsx              — 성인 인증 페이지

artifacts/api-server/src/routes/
  chat.ts                        — POST /api/chat (AI 챗봇)
  gate.ts                        — /api/gate/* (게이트, 방문자 로그, 화이트리스트, 세션)
```

## Architecture decisions

- **In-memory store**: 게이트 시스템, 세션, 공지는 서버 메모리에 저장 (서버 재시작시 초기화)
- **localStorage**: 신분증 데이터(`gov24_user`, `gov24_dl`, `*_photo`)는 클라이언트에 저장
- **GateScreen**: App.tsx 최상위에서 게이트 상태를 폴링, 상태에 따라 진입/대기/거절/강퇴 화면
- **관리자 인증**: 비밀번호로 sessionRoles Map에 역할 부여 (admin/developer)
- **이미지 압축**: 신분증 사진은 업로드 시 canvas로 400×500 압축 후 base64 저장

## Product

- **비밀번호 게이트**: 이름 + 비번(yunu)으로 입장, 관리자 승인 모드 선택 가능
- **게이트 상태**: none → pending(승인대기) → approved/rejected/kicked
- **방문자 로그**: 관리자/개발자 전용 - 모든 방문자 목록, 실시간 상태 표시
- **승인 관리**: 승인/거절 (관리자+개발자), 강퇴 (관리자+개발자)
- **개발자 전용**: 경고(2회→영구퇴장), 화이트리스트, 비밀번호 변경, 프로필 상세보기
- **모바일 신분증**: PIN(30초 타이머, 셔플 숫자판) → 카드뷰(사진, 토글, 타이머바, QR 모달)
- **홈탭**: 공지사항 팝업, 배너 슬라이더, 빠른 서비스 8개, 혜택 카드, 생활가이드
- **AI 챗봇**: 슬라이드업 패널, 키워드 매칭 응답

## Passwords (default — dev can change)

- 접속 비번: `yunu`
- 관리자 비번: `관리자123`
- 개발자 비번: `roqkfwk!!`

## Gotchas

- 게이트/세션/공지는 서버 재시작 시 초기화됨 (in-memory)
- 게이트 기본값: 꺼짐 (gateEnabled: false) — MY정부24에서 관리자/개발자가 켤 수 있음
- 경고 2회 누적 시 status가 "kicked"로 변경 (kickedBy: "경고 누적")
- 화이트리스트 이름은 입장 시 자동 승인 (pending 없이 approved)
- 모바일 신분증 PIN은 아무 6자리나 입력하면 통과됨
