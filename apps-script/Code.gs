/**
 * 아정당 여행 파트너 지원서 → 구글 시트 자동 적재 (+ 첨부 파일은 구글 드라이브 폴더에 저장)
 *
 * GitHub Pages의 index.html이 이 웹 앱으로 지원서를 보내요.
 * 설치 방법은 저장소 README.md의 "구글 시트 연결" 참고.
 */

const SHEET_NAME = '파트너지원';         // 지원서가 쌓일 탭 이름
const FOLDER_NAME = '파트너지원_첨부';    // 첨부 견적서가 저장될 드라이브 폴더 이름
const NOTIFY_EMAIL = '';                // 새 지원서 알림 받을 메일 (필요 없으면 빈칸)
const MAX_FILE_BYTES = 10 * 1024 * 1024;

const COLUMNS = [
  ['submittedAt', '접수일시'],
  ['company', '업체명'],
  ['person', '담당자'],
  ['phone', '연락처'],
  ['email', '이메일'],
  ['site', '홈페이지'],
  ['kind', '업체 형태'],
  ['regions', '운영 지역'],
  ['channels', '판매 채널'],
  ['teams', '하루 운영 팀 수'],
  ['maxpax', '팀당 최대 인원'],
  ['assets', '차량·가이드'],
  ['price', '대표 일정 판매가'],
  ['costBasis', '견적 기준 조건'],
  ['currency', '통화'],
  ['landTotal', '1인 지상비 합계'],
  ['costHotel', '숙박'],
  ['costVehicle', '차량'],
  ['costGuide', '가이드·기사'],
  ['costMeal', '식사'],
  ['costAdmission', '입장·체험'],
  ['costEtc', '기타'],
  ['marginType', '마진 기준'],
  ['marginValue', '희망 마진'],
  ['quoteLink', '견적서 링크'],
  ['fileUrl', '첨부 파일'],
  ['ourLink', '대표 일정 링크'],
  ['baseLink', '비교 기준 링크'],
  ['diff', '차별화 포인트'],
  ['idea', '전용 일정 아이디어'],
  ['noShopping', '노쇼핑·노옵션'],
  ['openCost', '원가 공개 견적'],
  ['smallGroup', '2~4명 단독'],
  ['status', '검토 상태'],
  ['memo', '메모']
];

// 주소를 브라우저로 열었을 때 동작 확인용
function doGet() {
  return ContentService.createTextOutput('아정당 여행 파트너 지원 접수 서버가 동작 중이에요.');
}

function doPost(e) {
  try {
    const d = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    if (d.hp) return json_({ ok: true });                       // 스팸 봇
    if (!d.company || !d.email || !d.ourLink || !d.landTotal) {
      return json_({ ok: false, error: '필수 항목이 비어 있어요' });
    }

    let fileUrl = '';
    if (d.fileContent && d.fileName) {
      const bytes = Utilities.base64Decode(d.fileContent);
      if (bytes.length <= MAX_FILE_BYTES) {
        const stamp = Utilities.formatDate(new Date(), 'Asia/Seoul', 'yyMMdd-HHmm');
        const name = stamp + '_' + safeName_(d.company) + '_' + safeName_(d.fileName);
        const blob = Utilities.newBlob(bytes, d.fileType || 'application/octet-stream', name);
        fileUrl = getFolder_().createFile(blob).getUrl();
      } else {
        fileUrl = '(10MB 초과로 저장 안 됨) ' + d.fileName;
      }
    }

    const lock = LockService.getScriptLock();
    lock.waitLock(15000);
    try {
      const sh = getSheet_();
      sh.appendRow(COLUMNS.map(([key]) => {
        if (key === 'submittedAt') return new Date();
        if (key === 'fileUrl') return fileUrl;
        if (key === 'status') return '신규';
        if (key === 'memo') return '';
        return clean_(d[key]);
      }));
    } finally {
      lock.releaseLock();
    }

    notify_(d, fileUrl);
    return json_({ ok: true });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  }
}

function getSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) sh = ss.insertSheet(SHEET_NAME);
  if (sh.getLastRow() === 0) {
    sh.appendRow(COLUMNS.map(c => c[1]));
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, COLUMNS.length).setFontWeight('bold').setBackground('#e8efff');
  }
  return sh;
}

function getFolder_() {
  const it = DriveApp.getFoldersByName(FOLDER_NAME);
  return it.hasNext() ? it.next() : DriveApp.createFolder(FOLDER_NAME);
}

// =, +, -, @ 로 시작하면 수식으로 실행되지 않게 앞에 ' 를 붙이고 길이를 제한해요
function clean_(v) {
  const s = String(v == null ? '' : v).slice(0, 3000);
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}

function safeName_(s) {
  return String(s || '').replace(/[\\\/:*?"<>|]/g, '_').slice(0, 80);
}

function notify_(d, fileUrl) {
  if (!NOTIFY_EMAIL) return;
  try {
    MailApp.sendEmail(NOTIFY_EMAIL, '[아정당 여행] 새 파트너 지원: ' + d.company, [
      '업체명: ' + d.company + ' (' + (d.kind || '-') + ')',
      '담당자: ' + d.person + ' / ' + d.phone + ' / ' + d.email,
      '운영 지역: ' + d.regions,
      '1인 지상비: ' + d.landTotal + ' ' + (d.currency || ''),
      '대표 일정: ' + d.ourLink,
      fileUrl ? '첨부: ' + fileUrl : '',
      '',
      '시트: ' + SpreadsheetApp.getActiveSpreadsheet().getUrl()
    ].join('\n'));
  } catch (e) { /* 메일 실패해도 접수는 유지 */ }
}

function json_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}

// 설치 직후 한 번 실행하면 권한 승인 창이 떠요 (시트·드라이브·메일 권한)
function setup() {
  getSheet_();
  getFolder_();
}
