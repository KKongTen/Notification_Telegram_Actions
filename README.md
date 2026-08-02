# Telegram Notification Scheduler via GitHub Actions

GitHub Actions를 활용하여 예약된 시각에 텔레그램 메세지를 자동 발송하는 알림 시스템입니다.
웹 대시보드(GitHub Pages) 또는 GitHub Issue 탭을 사용하여 손쉽게 예약 알림을 등록할 수 있습니다.

An automated notification system that sends Telegram messages at scheduled times using GitHub Actions.
You can easily schedule notifications using either the web dashboard (GitHub Pages) or GitHub Issues.

---

## Language / 언어
- [한국어 가이드](#한국어-가이드)
- [English Guide](#english-guide)

---

<a name="한국어-가이드"></a>
## 한국어 가이드

### 주요 특징
1. **GitHub Actions 스케줄러**: 24시간 켜둘 서버 없이 GitHub의 무료 실행 환경(Cron)을 통해 작동합니다.
2. **실행 분량 최적화**: 30분 주기 Cron(`0,30 * * * *`) 스케줄을 적용하여 한 달 약 1,440분만 소비하므로 GitHub Actions 무료 제공량(월 2,000분) 이내에서 안전하게 동작합니다.
3. **일일 30회 발송 한도 관리**: 하루 최대 30회 발송 제한 로직이 포함되어 무분별한 사용 및 한도 초과를 방지합니다.
4. **두 가지 알림 등록 방식**:
   - **GitHub Issue 탭**: 별도 인증 토큰(PAT) 입력 없이 GitHub 로그인 상태로 이슈 양식을 제출하여 예약.
   - **GitHub Pages 웹 대시보드**: 모던 UI 화면에서 시각적으로 예약 현황 및 잔여 수량을 확인하며 관리.

---

### 설정 안내

#### 1. 텔레그램 봇 토큰 및 Chat ID 준비
1. 텔레그램 앱에서 `@BotFather`를 검색하여 접속합니다.
2. `/newbot` 명령어를 입력하고 안내에 따라 봇을 생성합니다.
3. 생성 완료 후 제공되는 API Token을 복사합니다.
4. 생성된 봇과의 대화창을 열고 아무 메세지를 하나 전송합니다.
5. 브라우저 주소창에 `https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates` 로 접속하여 `"chat":{"id":...}` 항목의 숫자로 된 Chat ID를 확인합니다.

#### 2. GitHub Repository Secrets 설정
1. GitHub 저장소의 `Settings` -> `Secrets and variables` -> `Actions` 메뉴로 이동합니다.
2. `New repository secret` 버튼을 클릭하여 아래 2가지 값을 등록합니다.
   - `TELEGRAM_BOT_TOKEN`: 봇 생성 시 전달받은 API Token 값
   - `TELEGRAM_CHAT_ID`: 텔레그램 숫자 Chat ID 값

---

### 사용 방법

#### 방법 1: GitHub Issue 탭으로 예약하기 (추천)
1. 저장소 상단의 `Issues` 탭으로 이동합니다.
2. `New issue` 버튼을 클릭한 후 `새 텔레그램 알림 예약` 양식을 선택합니다.
3. 알림 제목, 예약 일시(KST, YYYY-MM-DD HH:MM), 메세지 내용을 작성하고 제출합니다.
4. 이슈가 제출되면 GitHub Actions가 자동으로 알림을 예약 데이터에 등록하고 해당 이슈를 닫음(Closed) 처리합니다.

#### 방법 2: GitHub Pages 웹 대시보드 활용하기
1. 저장소 `Settings` -> `Pages` 메뉴로 이동합니다.
2. 저장소가 Public(공개) 상태인지 확인한 후, Source를 `Deploy from a branch`, Branch를 `main` / `/ (root)`로 선택하고 저장합니다.
3. 생성된 웹 URL(`https://<username>.github.io/Notification_Telegram_Actions/`)로 접속합니다.
4. 우측 상단 `설정` 메뉴에서 Personal Access Token(PAT) 및 텔레그램 정보를 입력하고 알림을 등록합니다.

---

## Repository Structure / 저장소 구조
```
.
├── .github/
│   ├── data/
│   │   └── schedules.json        # 알림 예약 데이터 저장 파일
│   ├── ISSUE_TEMPLATE/
│   │   └── schedule.yml          # GitHub Issue 예약 양식 템플릿
│   └── workflows/
│       ├── notify.yml            # 30분 주기 Cron 알림 발송 워크플로우
│       └── issue_schedule.yml    # Issue 등록 시 자동 알림 등록 워크플로우
├── scripts/
│   ├── notify.py                 # 텔레그램 알림 처리 및 일일 제한 검증 스크립트
│   └── add_from_issue.py         # Issue 데이터를 파싱하여 schedules.json에 반영하는 스크립트
├── index.html                    # 웹 대시보드 HTML
├── style.css                     # 웹 대시보드 CSS
├── app.js                        # 웹 대시보드 JavaScript
└── README.md                     # 시스템 가이드 문서
```

---

<a name="english-guide"></a>
## English Guide

### Key Features
1. **GitHub Actions Scheduler**: Runs on GitHub's free execution environment (Cron) without needing a 24/7 dedicated server.
2. **Usage Optimization**: Uses a 30-minute Cron schedule (`0,30 * * * *`), consuming approximately 1,440 minutes per month, safely within GitHub Actions free tier (2,000 minutes/month).
3. **Daily Limit of 30 Messages**: Built-in control logic restricts message delivery to a maximum of 30 notifications per day.
4. **Dual Scheduling Methods**:
   - **GitHub Issue Form**: Schedule notifications by submitting an issue template without requiring a Personal Access Token (PAT).
   - **GitHub Pages Dashboard**: Visually manage and monitor scheduled notifications via a web dashboard.

---

### Setup Instructions

#### 1. Obtain Telegram Bot Token and Chat ID
1. Search for `@BotFather` in the Telegram app and start a chat.
2. Enter `/newbot` and follow the instructions to create a bot.
3. Copy the HTTP API Token provided upon creation.
4. Open a chat with your newly created bot and send any message.
5. Access `https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates` in your browser and locate your numeric Chat ID under `"chat":{"id":...}`.

#### 2. Configure GitHub Repository Secrets
1. Navigate to your repository `Settings` -> `Secrets and variables` -> `Actions`.
2. Click `New repository secret` and add the following two secrets:
   - `TELEGRAM_BOT_TOKEN`: The API Token received from BotFather
   - `TELEGRAM_CHAT_ID`: Your numeric Telegram Chat ID

---

### How to Use

#### Method 1: Scheduling via GitHub Issues (Recommended)
1. Go to the `Issues` tab in your repository.
2. Click `New issue` and select the `New Telegram Notification Schedule` template.
3. Fill in the Title, Scheduled Datetime (KST, YYYY-MM-DD HH:MM), and Message Body, then submit.
4. Upon submission, GitHub Actions automatically registers the schedule and closes the issue.

#### Method 2: Scheduling via GitHub Pages Dashboard
1. Go to repository `Settings` -> `Pages`.
2. Ensure your repository is set to Public visibility, select `Deploy from a branch` as Source, choose `main` / `/ (root)` for Branch, and save.
3. Visit the generated site URL (`https://<username>.github.io/Notification_Telegram_Actions/`).
4. Enter your Personal Access Token (PAT) and Telegram settings in the `Settings` modal, then add your schedules.
