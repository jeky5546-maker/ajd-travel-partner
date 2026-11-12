# 아정당 여행 · 현지 파트너 모집 페이지

외부 현지 파트너(랜드사·소규모 여행사·가이드)에게 보내는 모집 소개 + 지원서 페이지예요.
지원서는 Power Automate를 거쳐 엑셀 표에 한 줄씩 쌓여요.

```
index.html                     페이지 (HTML·CSS·JS 한 파일)
power-automate/schema.json     흐름 트리거에 붙여 넣을 JSON 스키마
power-automate/excel-columns.txt  엑셀 표 머리글
```

## 1. GitHub Pages로 올리기
1. GitHub에서 새 저장소를 만들고 이 폴더의 파일을 올려요.
2. 저장소 **Settings → Pages → Build and deployment**
   - Source: `Deploy from a branch`
   - Branch: `main` / `/ (root)` → Save
3. 1~2분 뒤 `https://<계정>.github.io/<저장소>/` 가 외부에 보낼 링크예요.

## 2. Power Automate로 엑셀에 쌓기
1. **엑셀 준비**: OneDrive/SharePoint에 엑셀 파일을 만들고, 첫 줄에 `power-automate/excel-columns.txt`의 머리글을 넣은 뒤 [삽입] → [표]. 표 이름은 `파트너지원`.
2. **흐름 만들기**
   - 트리거: `HTTP 요청을 받은 경우 (When a HTTP request is received)`
     - 트리거할 수 있는 사용자: `모든 사용자 (Anyone)`
     - 요청 본문 JSON 스키마: `power-automate/schema.json` 내용 붙여 넣기
   - 동작(첨부 파일): `조건` → `fileName`이 비어 있지 않으면
     `OneDrive for Business → 파일 만들기` (SharePoint면 `SharePoint → 파일 만들기`)
     - 폴더: 예) `/파트너지원_첨부`
     - 파일 이름: `formatDateTime(utcNow(),'yyMMdd-HHmm')`_`company`_`fileName` 처럼 겹치지 않게
     - 파일 콘텐츠: 식 `base64ToBinary(triggerBody()?['fileContent'])`
   - 동작: `Excel Online (Business) → 표에 행 추가` → 위 파일·표 선택 → `excel-columns.txt`의 연결대로 값 넣기 (첨부 파일 열에는 '파일 만들기'의 경로, 검토 상태는 `신규` 직접 입력)
   - (선택) 동작: `Outlook → 메일 보내기` — 새 지원 알림
   - 동작: `응답 (Response)` — 상태 코드 `200`, 헤더 `Access-Control-Allow-Origin: *`
3. 저장하면 트리거에 **HTTP POST URL**이 생겨요.
4. `index.html` 아래쪽 스크립트의 `const FLOW_URL = "";` 따옴표 안에 그 URL을 넣고 커밋해요.

## 확인
- 페이지에서 시험 지원서를 1건 제출 → 엑셀에 행이 생기고, 첨부한 파일이 폴더에 저장되면 끝이에요.
- 첨부 파일은 10MB까지 받아요. 파일 내용(fileContent)은 엑셀에 넣지 말고 파일 만들기에만 쓰세요.
- `FLOW_URL`이 비어 있으면 미리보기 모드라서, 제출하면 내용이 화면에 텍스트로만 나와요.

## 주의
- `HTTP 요청을 받은 경우` 트리거는 **Power Automate 프리미엄 라이선스**가 필요해요.
- 공개 저장소에 올리면 `FLOW_URL`이 누구에게나 보여요. 그 주소로 아무나 데이터를 보낼 수는 있으니, 저장소는 가능하면 **Private**(GitHub Pages는 유료 플랜에서 Private 저장소도 지원)로 두거나 이상한 행이 들어오면 지워 주세요. 페이지에는 스팸 봇 차단용 숨은 칸이 있어요.
- 수치(매출·유튜브·상담 조직·이사/청소 실적)는 출처 기준일이 있어요. 갱신되면 `index.html`의 해당 문구만 바꾸면 돼요.
