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

모든 방문자에게 공개하려면 내보낸 `archive.json`을 GitHub 저장소의 같은 파일에 업로드하고 `main`에 커밋하세요. 사이트에서 편집한 자료는 해당 브라우저에만 저장됩니다. 사이트 데이터 삭제나 브라우저 저장 공간 제한에 대비해 백업하세요.

이전 업데이트에서 제거된 샘플은 한 번만 복원합니다. 같은 ID로 직접 수정한 기록은 덮어쓰지 않으며 직접 등록한 캐릭터도 보존합니다. 복원 후에 사용자가 삭제한 캐릭터는 다시 추가하지 않습니다.

## 문구 편집

`문구 편집`을 누른 뒤 점선 제목을 수정합니다. `모든 문구`에서는 제목, 캐릭터 수 단위, 사진 hover 문구, 관리 화면 제목을 바꿀 수 있습니다. `저장`은 현재 브라우저에 적용하고 `취소`는 편집 이전으로 되돌립니다.

전체 공개: `공개용 문구 내보내기`로 받은 `settings.json`을 GitHub 저장소의 같은 파일에 업로드하고 `main`에 커밋하세요. 로컬 문구가 공개 문구보다 우선하므로 새 공개 문구를 확인하려면 시크릿 창을 사용하거나 `기본 문구로 되돌리기 → 저장`을 선택하세요. 문구 파일은 50KB, 각 문구는 600자 이하입니다.

## GitHub Pages

`.github/workflows/pages.yml`은 main 변경 또는 수동 실행 시 독립 실행 페이지를 빌드하고 `dist/`를 배포합니다. 저장소 Pages 설정의 Source는 GitHub Actions를 사용합니다. 공개 주소는 `https://wintaftjuly.github.io/1/`입니다. 업데이트 확인은 Actions에서 가장 최근 실행의 성공 상태를 확인한 뒤 수행합니다.

## Cloudflare Workers: 공개용과 편집용 분리

공개 Worker: `autumn-glitter-ba0e`, 주소 `https://autumn-glitter-ba0e.julyandwinter.workers.dev/`.

Cloudflare Workers & Pages → 해당 Worker → Settings → Builds에서 연결 저장소와 main 브랜치를 확인하고 아래 명령을 저장합니다.

- Build command: `node scripts/build.mjs`
- Deploy command: `npx wrangler deploy`
- Root directory: 저장소 루트 (비움)

`wrangler.jsonc`는 `dist/`만 공개합니다. 공개 페이지에는 관리·문구 편집 코드가 없으며 localStorage의 개인 수정도 읽지 않습니다. GitHub Pages도 같은 공개용 산출물을 사용합니다.

편집용은 별도 Worker `autumn-glitter-ba0e-admin`을 생성합니다. **편집용 파일을 배포하기 전에** 해당 Worker → Access → Protect this Worker behind Access → All traffic에서 본인 이메일만 허용하는 인증 정책을 설정합니다. Zero Trust 활성화가 필요할 수 있습니다. Worker 전체에 적용해 workers.dev·추가 도메인·미리보기 URL까지 보호합니다. 링크를 분리하는 것만으로는 인증이 되지 않습니다.

보호를 설정한 편집용 Worker에 같은 저장소를 연결하고 Build command는 동일하게, Deploy command는 `npx wrangler deploy --config wrangler.admin.jsonc`로 지정합니다. 편집용 산출물은 `dist-admin/`입니다. 별도 브라우저에서 비로그인 접근이 차단되는지 확인한 뒤 사용합니다.

편집은 해당 브라우저에 저장됩니다. 모든 방문자에게 반영하려면 편집용에서 내보낸 `archive.json`과 `settings.json`을 저장소에 업데이트합니다. 서버에 직접 저장하거나 자동 게시하는 기능은 현재 없습니다. 다른 주소로 옮기기 전에 기존 편집 자료를 내보내 백업하세요.

새 공개 Worker에서 정상 표시를 확인한 뒤 GitHub Settings → General → Danger Zone → Change visibility에서 저장소를 Private으로 전환하세요. Cloudflare GitHub 연결에 이 비공개 저장소 접근 권한이 있어야 합니다. 기존 무료 GitHub Pages는 중단될 수 있습니다. Workers 배포·Access·저장소 비공개 전환은 계정 대시보드에서 별도로 수행해야 합니다.

웹사이트 주소에는 GitHub 계정·저장소 경로가 포함되지 않습니다. 원본 저장소는 비공개로 보호할 수 있지만 브라우저에 전달하는 HTML/CSS/JavaScript와 이미지는 열람 가능합니다. 무료 플랜도 사용량 한도가 있습니다.

## 보안

외부 스크립트·폰트·분석 도구를 쓰지 않습니다. 사용자 문구는 textContent로 표시하고 HTML로 실행하지 않습니다. 가져온 이미지는 허용된 PNG/JPEG/WebP 데이터만 사용하며 외부 URL·임의 SVG를 거부합니다. `_headers` 지원 호스팅에는 인라인 코드의 정확한 SHA-256을 허용하는 CSP를 설정합니다. GitHub Pages는 이 헤더 파일을 적용하지 않습니다.

비공개 저장소도 웹사이트가 전달하는 HTML/CSS/JavaScript·이미지·공개 JSON을 숨기지는 못합니다. 비밀키나 비공개 개인정보를 공개 자료에 넣지 마세요. 취약점의 부재를 보장하지는 않습니다.

공개용 동작은 `public.js`, 편집용 동작은 `app.js`, 공통 커서는 `cursor.js`입니다. 파비콘은 `favicon.svg`이며 빌드 시 페이지에 포함됩니다.

## 글꼴과 커서

Pretendard 공식 패키지의 Pretendard Variable WOFF2를 로컬 보관하고 배포 페이지에 포함합니다. 모든 글자는 이 글꼴을 사용하며 100–900 굵기를 지원합니다. SIL OFL 라이선스는 `assets/fonts/Pretendard-OFL.txt`에 포함합니다.

커서는 `ful1e5/apple_cursor`의 GPL-3.0 macOS 재현 세트를 사용하며 Apple 공식 구형 OS 원본은 아닙니다. 출처·변환 내용·수정 SVG·라이선스는 `assets/cursors/`에 배포합니다. 기본 화살표, 손가락, I빔, 실제 이미지 처리 중의 회전 커서를 구현했습니다. 포인터를 빠르게 좌우로 흔들면 일시 확대됩니다. 마우스를 즉시 따라가며 터치 화면에는 표시하지 않습니다. 동작 감소 설정에서는 회전과 확대를 생략합니다.

지정된 MEMORIES.psd 장식, 별 아이콘, 스크롤 안내, 파일·컬렉션 라벨, PRIVATE COLLECTION 및 기존 푸터 문장은 제거했습니다. 푸터에는 `@ererwintaft`만 표시합니다. 사진 카드와 hover 모션, 연도 묶음은 유지합니다.

현재 색상은 첨부된 그래픽 레퍼런스를 바탕으로 코럴 레드, 라임, 연분홍, 오프화이트, 차콜을 사용합니다. 제목의 타원과 기울기, 연도 글자의 굵기를 조정했으며 캐릭터 영역의 열 수·사진 크기·간격·padding·hover 전환값은 이전 버전과 데스크톱 및 모바일에서 동일하게 유지했습니다. ARCHIVED WITH AFFECTION / HANDLE WITH CARE와 PERSONAL COLLECTION / EST. IN MEMORIES는 제거했습니다.
