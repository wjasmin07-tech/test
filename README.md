# 드라마 사주 궁합

드라마 캐릭터와 사주 궁합을 보고, 캐릭터와 채팅할 수 있는 웹 서비스입니다.

## 구조

```
drama-saju-vercel/
├─ public/index.html     # 화면 전체 (사주 계산·궁합·간단 모드 채팅은 브라우저에서 동작)
├─ api/chat.js           # Vercel 서버 함수: Claude API 호출 (키는 서버에만 보관)
├─ lib/saju.js           # 서버용 사주 계산
├─ lib/characters.js     # 서버용 캐릭터 설정·페르소나
├─ package.json
└─ vercel.json
```

- `GET /api/chat`: AI 사용 가능 여부(`{ "ai": true | false }`)
- `POST /api/chat`: 캐릭터 응답을 텍스트 스트림으로 반환. 시스템 프롬프트는 서버가 만들고, 입력값(캐릭터 ID, 생년월일, 궁합 결과, 메시지 길이·개수)을 검증합니다.

`ANTHROPIC_API_KEY`가 없으면 채팅은 자동으로 **간단 모드**(정해진 문장으로 답변)로 동작합니다.

## 배포 방법

### A. GitHub + Vercel 대시보드
1. 이 폴더를 GitHub 저장소로 올립니다.
2. https://vercel.com/new 에서 저장소를 Import 합니다. (Framework Preset: **Other**, 나머지는 기본값)
3. **Settings → Environment Variables** 에 `ANTHROPIC_API_KEY` 를 추가합니다. (키 발급: https://console.anthropic.com)
4. Deploy (환경변수를 나중에 추가했다면 Redeploy 한 번 더)

### B. Vercel CLI
```bash
npm i -g vercel
cd drama-saju-vercel
vercel                      # 첫 배포 (프로젝트 연결)
vercel env add ANTHROPIC_API_KEY
vercel --prod
```

### 로컬 실행
```bash
npm install
echo ANTHROPIC_API_KEY=sk-ant-... > .env.local
vercel dev                  # http://localhost:3000
```

## 운영 시 참고

- **비용**: 채팅 메시지마다 Anthropic API 요금이 발생합니다 (모델 `claude-opus-5-5`, effort `low`). 공개 서비스로 운영한다면 Anthropic Console에서 월 사용 한도(spend limit)를 꼭 설정하세요.
- **남용 방지**: 서버가 입력을 검증하고 캐릭터 대화만 하도록 지시하지만, 요청 횟수 제한은 없습니다. 트래픽이 많아지면 Vercel Firewall의 Rate Limiting 규칙을 `/api/chat`에 걸어 두는 것을 권장합니다.
- **안전장치 대응**: 서버 측 fallback(`fallbacks: "default"`)을 켜 두었습니다. 그래도 답변이 거절되면 화면은 간단 모드 답변으로 대신합니다.
- **캐릭터 수정**: 캐릭터를 추가하거나 바꿀 때는 `public/index.html`의 `CHARS`·`EXTRA`와 `lib/characters.js`를 함께 수정하세요 (ID·생년월일·시가 같아야 합니다).

## 고지

- 재미로 보는 사주입니다. 캐릭터 생년월일·시간은 서비스에서 임의로 정한 설정이며, 명대사는 각 캐릭터 사주에 맞춰 새로 지은 창작 대사입니다.
- 드라마 캐릭터 이름·설정은 각 저작권자에게 있습니다. 상업적으로 운영할 경우 권리 문제를 따로 확인하세요.
