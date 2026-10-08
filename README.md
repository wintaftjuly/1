# Character Archive

사진·이름·활동 커뮤니티·연도를 보여주는 정적 캐릭터 아카이브입니다. 현재 공개 자료는 디자인 확인용 가상 캐릭터 8명입니다. 요청에 따라 화면의 샘플 안내 문구는 제거했습니다. 최신 연도부터 묶어 표시하며 사진 확대와 카드 hover 효과를 유지합니다.

## 실행과 빌드

```sh
cd /workspace/1
node scripts/build.mjs
python3 -m http.server 8000 --bind 0.0.0.0 --directory dist
```

설치할 의존성이나 API 키는 없습니다. HTML은 `src/index.html`, 스타일은 `style.css`, 동작은 `app.js`에서 수정하고 빌드합니다. 빌드는 스타일·실행 코드·커서·공개 데이터가 포함된 `index.html`을 생성합니다. 공개 데이터 요청이 실패하면 빌드 시점 자료를 표시합니다. `index.html`과 `_headers`는 생성된 파일입니다.

## 캐릭터 관리

상단 `아카이브 관리`에서 등록·수정·삭제합니다. 사진은 PNG/JPEG/WebP, 최대 5MB이며 저장 전에 최대 1000px WebP로 변환합니다. 브라우저의 localStorage에 저장하며 다른 방문자의 원본을 수정하지 않습니다. `자료 내보내기`로 사진을 포함한 `archive.json`을 백업하고, `자료 가져오기`로 복원합니다.

Cloudflare 관리 페이지에서 상단 `공개 사이트에 게시`를 누르면 사진과 문구가 공개 페이지에 반영됩니다. 사이트 데이터 삭제나 브라우저 저장 공간 제한에 대비해 자료를 내보내 백업하세요. GitHub Pages에는 서버 게시 기능이 없으므로 이 기능은 Cloudflare에서 사용합니다.

이전 업데이트에서 제거된 샘플은 한 번만 복원합니다. 같은 ID로 직접 수정한 기록은 덮어쓰지 않으며 직접 등록한 캐릭터도 보존합니다. 복원 후에 사용자가 삭제한 캐릭터는 다시 추가하지 않습니다.

## 문구 편집

`문구 편집`을 누른 뒤 점선 제목을 수정합니다. `모든 문구`에서는 제목, 캐릭터 수 단위, 사진 hover 문구, 관리 화면 제목을 바꿀 수 있습니다. `저장`은 현재 브라우저에 적용하고 `취소`는 편집 이전으로 되돌립니다.

전체 공개: 문구를 저장한 뒤 상단의 `공개 사이트에 게시`를 누릅니다. `문구 백업 내보내기`는 settings.json 백업용입니다. 로컬 문구가 공개 문구보다 우선하므로 새 공개 문구를 확인하려면 시크릿 창을 사용하거나 `기본 문구로 되돌리기 → 저장`을 선택하세요. 문구 파일은 50KB, 각 문구는 600자 이하입니다.

## GitHub Pages

`.github/workflows/pages.yml`은 main 변경 또는 수동 실행 시 독립 실행 페이지를 빌드하고 `dist/`를 배포합니다. 저장소 Pages 설정의 Source는 GitHub Actions를 사용합니다. 공개 주소는 `https://wintaftjuly.github.io/1/`입니다. 업데이트 확인은 Actions에서 가장 최근 실행의 성공 상태를 확인한 뒤 수행합니다.

## Cloudflare Workers: 로그인하고 직접 게시하기

공개 주소: `https://autumn-glitter-ba0e.julyandwinter.workers.dev/`
관리 Worker 이름: `autumn-glitter-ba0e-admin`. 관리 주소는 이 Worker 생성 후 `https://autumn-glitter-ba0e-admin.julyandwinter.workers.dev/`입니다.

### 저장소 연결

Cloudflare Storage & Databases → KV에서 `character-archive` Namespace를 하나 만듭니다. Namespace ID를 두 Wrangler 파일의 같은 `kv_namespaces` 항목에 설정합니다. binding 이름은 `ARCHIVE_STORE`입니다. ID는 비밀키가 아닙니다. 설정 스크립트는 `node scripts/configure-kv.mjs <Namespace-ID>`입니다. **공개용과 관리용이 반드시 같은 Namespace를 사용해야 합니다.**

### 공개 Worker

기존 Worker의 main 브랜치, Build command `node scripts/build.mjs`, Deploy command `npx wrangler deploy`로 Git 연동 배포합니다. `wrangler.jsonc`는 공개용 `dist/`와 `worker/index.mjs`를 배포합니다. Worker는 KV에 게시된 자료가 있으면 사용하고, 최초 게시 전에는 저장소의 archive.json/settings.json을 표시합니다. 배포를 다시 해도 KV 게시 자료는 덮어쓰지 않습니다.

### 관리 Worker와 본인 로그인

1. 별도 Worker `autumn-glitter-ba0e-admin`을 생성합니다.
2. 해당 Worker의 Access에서 Protect this Worker behind Access → All traffic을 선택하고 **본인 이메일만** 허용합니다. 모든 도메인·경로·미리보기까지 보호합니다. Zero Trust 무료 플랜을 사용할 수 있습니다.
3. Access 애플리케이션에서 Application Audience (AUD)를 확인합니다. Zero Trust 팀 도메인(`팀이름.cloudflareaccess.com`)도 확인합니다.
4. 현재 관리용 wrangler.admin.jsonc에는 사용자가 제공한 팀 도메인과 Application Audience를 설정했습니다. Access 애플리케이션을 다시 만들면 이 설정도 갱신해야 합니다. 둘은 인증 비밀번호가 아닌 애플리케이션 식별값입니다. 개인 이메일은 코드에 넣지 않고 Access 정책에서 지정합니다.
5. 같은 저장소를 연결하고 Build command `node scripts/build.mjs`, Deploy command `npx wrangler deploy --config wrangler.admin.jsonc`로 배포합니다. 설정의 keep_vars는 대시보드 인증 변수를 유지합니다.
6. 로그인 후 관리 페이지를 엽니다. 비로그인 창에서는 로그인 화면으로 이동하거나 접근이 차단되는지 확인합니다.

관리 Worker는 페이지와 API 전체에서 Access JWT의 RSA 서명·발급자·대상 AUD·만료를 검사합니다. 인증 설정이 빠지면 503, 유효한 인증이 없으면 401로 접근을 차단합니다. 공개 Worker의 게시 요청은 항상 거부됩니다. 게시 API는 동일 출처의 JSON 요청만 허용합니다. URL 분리나 숨겨진 버튼을 인증으로 취급하지 않습니다.

### 편집과 게시

- 캐릭터 등록·수정·삭제와 문구 편집의 저장은 해당 브라우저의 임시 작업 자료입니다.
- 상단 `공개 사이트에 게시` → `지금 게시하기`를 누르면 사진·캐릭터·문구를 함께 KV에 저장합니다.
- 공개 페이지를 새로고침하면 바뀐 자료를 표시합니다. KV 특성상 다른 지역까지 반영되는 데 60초 이상 걸릴 수 있으며 즉시 일관성을 보장하지 않습니다.
- 사진과 JSON 전체는 24MB, 캐릭터는 300명 이하입니다. 이미지 한 장은 변환 후 약 2.5MB 이하입니다. 브라우저 localStorage 제한이 먼저 걸릴 수 있으며 실패 시 게시 전 백업을 권장합니다.
- 한 명이 한 관리 창에서 게시하는 용도입니다. 여러 창에서 동시에 게시하면 마지막 저장이 적용될 수 있습니다. 게시 전 자료·문구 내보내기로 백업할 수 있습니다. 자동 버전 복구 기능은 없습니다.
- 공개 사이트는 개인 브라우저의 임시 작업 자료를 읽지 않습니다. 기존 도메인의 임시 자료는 내보내기/가져오기로 옮깁니다.

KV 무료 플랜은 일일 읽기·쓰기 및 저장 용량 한도가 있습니다. 사용량을 초과하면 요청이 실패할 수 있으므로 무제한 무료를 보장하지 않습니다. 이 구성은 R2나 유료 플랜 가입을 요구하지 않습니다. 비밀키를 브라우저나 GitHub에 저장하지 않습니다.

### 확인

```sh
node scripts/build.mjs
node tests/publishing.mjs
```

Node.js 22 이상에서 인증 서명·만료·잘못된 AUD·서명 위조·공개 쓰기 거부·다른 출처 요청 거부·자료 검증·게시 후 공개 조회를 검사합니다. 실제 Cloudflare KV 연결과 Access 정책은 계정에서 배포 후 별도로 확인해야 합니다.

새 공개 Worker에서 정상 표시를 확인한 뒤 GitHub 저장소를 Private으로 전환할 수 있습니다. Cloudflare GitHub 앱은 이 비공개 저장소 접근 권한이 있어야 합니다. 원본 저장소는 비공개로 보호할 수 있지만 브라우저에 전달하는 HTML/CSS/JavaScript와 공개 이미지는 열람 가능합니다.

## 보안

외부 스크립트·폰트·분석 도구를 쓰지 않습니다. 사용자 문구는 textContent로 표시하고 HTML로 실행하지 않습니다. 가져온 이미지는 허용된 PNG/JPEG/WebP 데이터만 사용하며 외부 URL·임의 SVG를 거부합니다. `_headers` 지원 호스팅에는 인라인 코드의 정확한 SHA-256을 허용하는 CSP를 설정합니다. GitHub Pages는 이 헤더 파일을 적용하지 않습니다.

비공개 저장소도 웹사이트가 전달하는 HTML/CSS/JavaScript·이미지·공개 JSON을 숨기지는 못합니다. 비밀키나 비공개 개인정보를 공개 자료에 넣지 마세요. 취약점의 부재를 보장하지는 않습니다.

공개용 동작은 `public.js`, 편집용 동작은 `app.js`, 공통 커서는 `cursor.js`입니다. 파비콘은 `favicon.svg`이며 빌드 시 페이지에 포함됩니다.

## 글꼴과 커서

Pretendard 공식 패키지의 Pretendard Variable WOFF2를 로컬 보관하고 배포 페이지에 포함합니다. 모든 글자는 이 글꼴을 사용하며 100–900 굵기를 지원합니다. SIL OFL 라이선스는 `assets/fonts/Pretendard-OFL.txt`에 포함합니다.

커서는 `ful1e5/apple_cursor`의 GPL-3.0 macOS 재현 세트를 사용하며 Apple 공식 구형 OS 원본은 아닙니다. 출처·변환 내용·수정 SVG·라이선스는 `assets/cursors/`에 배포합니다. 기본 화살표, 손가락, I빔, 실제 이미지 처리 중의 회전 커서를 구현했습니다. 포인터를 빠르게 좌우로 흔들면 일시 확대됩니다. 마우스를 즉시 따라가며 터치 화면에는 표시하지 않습니다. 동작 감소 설정에서는 회전과 확대를 생략합니다.

지정된 MEMORIES.psd 장식, 별 아이콘, 스크롤 안내, 파일·컬렉션 라벨, PRIVATE COLLECTION 및 기존 푸터 문장은 제거했습니다. 푸터에는 `@ererwintaft`만 표시합니다. 사진 카드와 hover 모션, 연도 묶음은 유지합니다.

현재 색상은 Fallen Angels 레퍼런스의 Lava Red #E42217, Lemon Lime #A9ED3D, Fresh Green #34CD3F, Black Bean #081910을 사용합니다. 검정·어두운 녹색을 바탕으로 라임·초록을 배치하고 빨강을 작은 포인트로 사용합니다. ONE NAN은 이전 THE CHARACTER FILES 문구를 대체하며 위에 한 줄 여백을 두고 Postype 링크보다 굵게 표시합니다. 기존 게시 자료의 이전 문구도 표시할 때 변환하되 다른 사용자 문구는 유지합니다. 제목의 타원과 기울기, 연도 글자의 굵기를 조정했으며 캐릭터 영역의 열 수·사진 크기·간격·padding·hover 전환값은 이전 버전과 데스크톱 및 모바일에서 동일하게 유지했습니다. ARCHIVED WITH AFFECTION / HANDLE WITH CARE와 PERSONAL COLLECTION / EST. IN MEMORIES는 제거했습니다.
