# 📱 GitHub Actions 기반 텔레그램 예약 알림이

웹 대시보드를 통해 지정한 예약 시간에 내 텔레그램 핸드폰으로 알림을 보내주는 **GitHub Actions 기반 자동화 예약 시스템**입니다.

---

## ✨ 핵심 기능 및 특징

1. **GitHub Actions 스케줄러**: 서버를 24시간 켜둘 필요 없이 GitHub의 무료 Infra(Cron)를 활용하여 정해진 시간에 텔레그램 메세지를 전송합니다.
2. **사용량 최적화 (월 2,000분 무료 한도 준수)**:
   - 30분 주기 Cron(`0,30 * * * *`)을 기본으로 적용하여 한 달 약 **1,440분**만 소비합니다. (월 2,000분 한도 이내)
   - 웹 UI에서 알림 등록 시 `Workflow Dispatch`를 동시 호출하여 30분 cron 대기 없이 수시/즉시 동기화가 가능합니다.
3. **하루 30회 알림 제한**:
   - 하루 최대 **30회** 발송 제한 카운터를 웹 UI 및 Python 처리기 양쪽에 두어 사용량을 제어합니다.
4. **Modern UI 대시보드**:
   - 다크 모드, 글래스모피즘, 일일 잔여 알림 수 프로그레스 바, 실시간 동기화 및 텔레그램 테스트 전송 기능을 제공합니다.

---

## 🛠️ 설정 가이드 (1회 최초 설정)

### 1. 텔레그램 봇 만들기 (Bot Token & Chat ID)
1. 텔레그램 앱에서 **[@BotFather](https://t.me/BotFather)**를 검색합니다.
2. `/newbot` 명령어를 입력하고 봇 이름과 username을 지정하여 봇을 생성합니다.
3. 생성 완료 후 제공되는 **HTTP API Token** (예: `123456789:ABCdefGHIjkl...`)을 복사합니다.
4. 내 봇과의 대화창을 열고 아무 메시지(예: `안녕`)를 전송합니다.
5. 웹 브라우저에서 아래 URL로 접속하여 내 **Chat ID** (숫자)를 확인합니다:
   ```
   https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates
   ```

### 2. GitHub Secrets 설정 (권장)
1. GitHub 저장소의 `Settings` ➔ `Secrets and variables` ➔ `Actions` 메뉴로 이동합니다.
2. **New repository secret** 버튼을 클릭하여 아래 2개의 Secret을 등록합니다:
   - `TELEGRAM_BOT_TOKEN`: 1단계에서 얻은 Bot Token
   - `TELEGRAM_CHAT_ID`: 1단계에서 얻은 Chat ID

### 3. GitHub Personal Access Token (PAT) 발급 (웹 UI 저장용)
웹 대시보드에서 `.github/data/schedules.json`을 수정하기 위해 토큰이 필요합니다.
1. GitHub ➔ Settings ➔ Developer settings ➔ **Personal access tokens** ➔ Tokens (classic)으로 이동합니다.
2. **Generate new token** 클릭 후 `repo` (Full control of private repositories) 권한 체크 후 생성합니다.
3. 생성된 토큰(`ghp_...`)을 복사합니다.

---

## 🚀 웹 대시보드 사용 방법

1. 본 저장소의 `index.html` 파일을 웹 브라우저(Chrome, Edge 등)로 엽니다.
2. 우측 상단 **[설정]** 버튼을 누릅니다:
   - `GitHub Username / Org`, `Repository Name`, `Personal Access Token (PAT)` 입력
   - `Telegram Bot Token`, `Chat ID` 입력 후 **[텔레그램 테스트 메세지 보내기]** 버튼으로 동작 확인
   - **[설정 저장하기]** 클릭
3. **[새 알림 예약]** 폼에서 알림 제목, 예약 날짜/시간(KST), 메세지를 작성하고 **[알림 예약 등록하기]**를 클릭합니다.
4. 예약된 시각이 되면 GitHub Actions가 작동하여 텔레그램으로 메세지를 전송합니다! 📱

---

## 📁 파일 구조

```
Notification_Telegram_Actions/
├── index.html                    # 웹 UI 대시보드 (HTML)
├── style.css                     # Modern Glassmorphism CSS 스타일
├── app.js                        # GitHub REST API & 텔레그램 연동 스크립트
├── scripts/
│   └── notify.py                 # Python 알림 처리 및 일일 30회 제한 제어 스크립트
├── .github/
│   ├── data/
│   │   └── schedules.json        # 예약 데이터 저장소
│   └── workflows/
│       └── notify.yml            # GitHub Actions 30분 스케줄러 Workflow
└── README.md                     # 가이드 문서
```
