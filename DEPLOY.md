# Netlify / Firebase 배포 가이드

## 개요

정부24 클론은 **프론트엔드** + **API 서버** 2가지로 구성되어 있습니다.

| 구성 | 코드 | 배포 대상 |
|---|---|---|
| 프론트엔드 (React + Vite) | `artifacts/gov24/` | **Netlify Hosting** 또는 **Firebase Hosting** |
| API 서버 (Express) | `artifacts/api-server/` | **Firebase Functions** 또는 단독 서버 |

---

## 1. 프론트엔드 배포

### ▶ Netlify로 배포

1. GitHub에 코드를 푸시하세요
2. [Netlify](https://app.netlify.com/) 가입 → "Add new site" → "Import an existing project"
3. GitHub 레포지토리 연동
4. 빌드 설정:
   - **Build command**: `pnpm run build`
   - **Publish directory**: `artifacts/gov24/dist/public` (또는 `dist/public`)
   - **Base directory**: `artifacts/gov24`
5. 환경변수 설정 (Site settings → Environment variables):
   - `VITE_API_URL` = `배포된 API 서버 URL` (예: `https://your-api.com`)
   - 공백으로 두면 동일 도메인 가정
6. Deploy!

### ▶ Firebase Hosting으로 배포

1. [Firebase Console](https://console.firebase.google.com/) 에서 프로젝트 생성
2. 로컬에서 Firebase CLI 설치:
```bash
npm install -g firebase-tools
firebase login
```
3. `artifacts/gov24/` 디렉토리에서 초기화:
```bash
cd artifacts/gov24
firebase init hosting
```
4. `firebase.json`은 이미 있으며, `.firebaserc`에 프로젝트 ID를 입력:
```json
{
  "projects": {
    "default": "YOUR_FIREBASE_PROJECT_ID"
  }
}
```
5. 빌드 후 배포:
```bash
# VITE_API_URL 설정후 빌드
export VITE_API_URL="https://your-api-server.com"
pnpm run build
firebase deploy --only hosting
```

---

## 2. API 서버 배포 (Firebase Functions)

### ▶ Firebase Functions Gen 2로 배포

1. `artifacts/api-server/` 디렉토리에서 후다:
```bash
cd artifacts/api-server
```
2. `firebase.json` 확인 (이미 있음):
```json
{
  "functions": [
    {
      "source": ".",
      "codebase": "api"
    }
  ]
}
```
3. 빌드 (이미 포함된 esbuild 스크립트):
```bash
pnpm run build
# 생성된 출력:
# dist/index.mjs     (로컬 서버 용)
# dist/functions.mjs (Firebase Functions 용)
```
4. 배포:
```bash
firebase deploy --only functions
```
5. 배포 후 생성된 URL를 프론트엔드의 `VITE_API_URL`에 설정
   - 예: `https://api-abc123-asia-northeast3.cloudfunctions.net/api`

---

## 3. 전체 흐름

```
[프론트엔드]               [API 서버]
   ↓                       ↓
Netlify / Firebase Hosting  ← Firebase Functions
   ↓                       ↑
VITE_API_URL 지정 후 통신 →   엔드포인트
```

---

## 4. 주의 사항

- **게이트 설정 지속**: API 서버의 게이트 설정은 `.data/gate-config.json`에 저장됨. Firebase Functions에서는 임시 디스크를 사용하며, 서버 재시작 시 초기화되면 트리거 코드나 Firestore를 통해 지속화하는 것이 좋음.
- **CORS**: API 서버의 `app.ts`에 `app.use(cors())`가 이미 있으며, Firebase Functions에서는 추가 CORS 허용이 필요할 수 있음.
- **홈백**: API 서버가 Firebase Functions일 때 `functions.ts`의 `region`은 `asia-northeast3` (서울)로 설정됨.

---

## 5. 현재 배포 파일 상태

| 파일 | 위치 | 상태 |
|---|---|---|
| `netlify.toml` | `artifacts/gov24/` | ✓ 준비완료 |
| `firebase.json` (hosting) | `artifacts/gov24/` | ✓ 준비완료 |
| `.firebaserc` | `artifacts/gov24/` | ※ 프로젝트 ID 수정 필요 |
| `firebase.json` (functions) | `artifacts/api-server/` | ✓ 준비완료 |
| `src/api.ts` | `artifacts/gov24/src/` | ✓ 준비완료 (VITE_API_URL 지원) |
| `src/functions.ts` | `artifacts/api-server/src/` | ✓ 준비완료 (Firebase Functions 엔트리) |
