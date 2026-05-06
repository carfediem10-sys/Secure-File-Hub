# 정부24 클론

한국 정부 포털(정부24)을 클론한 풀스택 앱으로, 모바일 신분증, 성인 인증, AI 챗봇, 접근 제어 시스템, 관리자/개발자 인증을 포함합니다.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — API 서버 실행 (port 8080)
- `pnpm --filter @workspace/gov24 run dev` — 프론트엔드 실행 (port 25406)
- `pnpm run typecheck` — 전체 타입 체크
- `pnpm run build` — 전체 빌드

Required env: `SESSION_SECRET` (세션 보안), `DATABASE_URL` (미사용 — in-memory store 사용)

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React 18 + Vite, Tailwind CSS v4, framer-motion, wouter, lucide-react
- Backend: Express 5 (in-memory state — no DB needed for gate/chat)
- Build: esbuild (CJS bundle)

## Where things live

```
artifacts/gov24/src/
  App.tsx                        — 라우터 (/, /mobile-id, /adult-verify)
  pages/
    Home.tsx                     — 메인 4탭 레이아웃
    MobileId.tsx                 — 모바일 신분증 (PIN → 신분증 뷰/편집)
    AdultVerify.tsx              — 성인 인증 페이지
  components/
    BottomNav.tsx                — 하단 탭바
    AiChat.tsx                   — AI 챗봇 슬라이드업 패널
    tabs/
      HomeTab.tsx                — 홈탭 (공지, 빠른서비스, 혜택, 생활가이드)
      CivilServiceTab.tsx        — 민원서비스 탭
      BenefitsTab.tsx            — 혜택알리미 탭
      MyGovTab.tsx               — MY정부24 (로그인, 관리자 인증, 게이트 제어)

artifacts/api-server/src/routes/
  chat.ts                        — POST /api/chat (AI 챗봇)
  gate.ts                        — /api/gate/* (게이트, 공지, 화이트리스트, 세션)
```

## Architecture decisions

- **In-memory store**: 게이트 시스템, 세션, 공지는 서버 메모리에 저장 (DB 불필요)
- **localStorage**: 신분증 데이터(`gov24_user`, `gov24_dl`, `*_photo`)는 클라이언트에 저장
- **AI 챗봇**: 외부 LLM 없이 키워드 매칭으로 한국 정부 서비스 정보 응답
- **관리자 인증**: 비밀번호(`admin1234` / `dev9999`)로 세션별 역할 부여 (sessionRoles Map)
- **이미지 압축**: 신분증 사진은 업로드 시 canvas로 400×500 압축 후 base64 저장

## Product

- **홈탭**: 공지사항 팝업, 배너 슬라이더, 빠른 서비스 8개, 혜택 카드, 생활가이드 5카테고리
- **민원서비스**: 카테고리 필터 + 검색, 서비스 목록 카드
- **혜택알리미**: 혜택 카드 목록, 카테고리 필터
- **MY정부24**: 로그인, 사용자 정보 표시, 관리자/개발자 비밀번호 인증, 게이트 ON/OFF, 화이트리스트, 공지 등록
- **모바일 신분증**: PIN 번호 입력 (30초 타이머), 주민등록증·운전면허증 뷰/편집
- **성인 인증**: URL 파라미터로 신분증 정보 받아 성인 여부 표시
- **AI 챗봇**: 슬라이드업 패널, 빠른질문 버튼, 정부 서비스 키워드 응답

## User preferences

- 원본 정부24 번들을 역공학하여 최대한 동일하게 구현

## Gotchas

- 게이트 설정은 서버 재시작 시 초기화됨 (in-memory)
- 관리자 비밀번호: `admin1234`, 개발자 비밀번호: `dev9999`
- 공지 삭제는 개발자(developer) 권한만 가능, 게이트 설정은 admin/developer 모두 가능
- 모바일 신분증 PIN은 아무 6자리나 입력하면 통과됨

## Pointers

- See the `pnpm-workspace` skill for workspace structure
- See the `react-vite` skill for frontend conventions
