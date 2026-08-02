/**
 * Telegram Notifier - GitHub Actions Web Dashboard JavaScript
 */

document.addEventListener('DOMContentLoaded', () => {

  // Default Configuration Keys
  const STORAGE_KEYS = {
    GH_OWNER: 'tg_notifier_gh_owner',
    GH_REPO: 'tg_notifier_gh_repo',
    GH_TOKEN: 'tg_notifier_gh_token',
    TG_TOKEN: 'tg_notifier_tg_token',
    TG_CHAT_ID: 'tg_notifier_tg_chat_id'
  };

  const DAILY_MAX_LIMIT = 30;
  const FILE_PATH = '.github/data/schedules.json';

  // App State
  let config = {
    ghOwner: localStorage.getItem(STORAGE_KEYS.GH_OWNER) || '',
    ghRepo: localStorage.getItem(STORAGE_KEYS.GH_REPO) || 'Notification_Telegram_Actions',
    ghToken: localStorage.getItem(STORAGE_KEYS.GH_TOKEN) || '',
    tgToken: localStorage.getItem(STORAGE_KEYS.TG_TOKEN) || '',
    tgChatId: localStorage.getItem(STORAGE_KEYS.TG_CHAT_ID) || ''
  };

  let schedulesData = {
    daily_limit: DAILY_MAX_LIMIT,
    schedules: []
  };

  let currentFileSha = null;
  let activeTab = 'pending';

  // DOM Elements
  const elBtnOpenSettings = document.getElementById('btnOpenSettings');
  const elBtnCloseSettings = document.getElementById('btnCloseSettings');
  const elBtnCancelSettings = document.getElementById('btnCancelSettings');
  const elBtnSaveSettings = document.getElementById('btnSaveSettings');
  const elSettingsModal = document.getElementById('settingsModal');
  const elBtnTestTelegram = document.getElementById('btnTestTelegram');
  const elBtnRefresh = document.getElementById('btnRefresh');
  const elBtnManualDispatch = document.getElementById('btnManualDispatch');

  // Input Elements
  const elGhOwner = document.getElementById('ghOwner');
  const elGhRepo = document.getElementById('ghRepo');
  const elGhToken = document.getElementById('ghToken');
  const elTgToken = document.getElementById('tgToken');
  const elTgChatId = document.getElementById('tgChatId');

  // Schedule Form Elements
  const elForm = document.getElementById('addScheduleForm');
  const elInputTitle = document.getElementById('inputTitle');
  const elInputDatetime = document.getElementById('inputDatetime');
  const elInputMessage = document.getElementById('inputMessage');
  const elCheckImmediateTrigger = document.getElementById('checkImmediateTrigger');
  const elBtnSubmitSchedule = document.getElementById('btnSubmitSchedule');

  // Stats & Progress Elements
  const elSentTodayCount = document.getElementById('sentTodayCount');
  const elMaxDailyLimit = document.getElementById('maxDailyLimit');
  const elUsagePercentText = document.getElementById('usagePercentText');
  const elUsageProgressBar = document.getElementById('usageProgressBar');
  const elStatPendingCount = document.getElementById('statPendingCount');
  const elStatSentTodayCount = document.getElementById('statSentTodayCount');
  const elStatTotalCount = document.getElementById('statTotalCount');
  const elScheduleList = document.getElementById('scheduleList');
  const elEmptyState = document.getElementById('emptyState');
  const elTabCountPending = document.getElementById('tabCountPending');
  const elTabCountSent = document.getElementById('tabCountSent');

  // Init Form Inputs with saved configs
  function populateConfigInputs() {
    elGhOwner.value = config.ghOwner;
    elGhRepo.value = config.ghRepo;
    elGhToken.value = config.ghToken;
    elTgToken.value = config.tgToken;
    elTgChatId.value = config.tgChatId;
  }

  // Set default datetime picker to the next 30-minute interval and set min attribute to current time
  function setDefaultDatetimePicker() {
    const now = new Date();
    
    // Set min attribute to prevent selecting past time
    const minYear = now.getFullYear();
    const minMonth = String(now.getMonth() + 1).padStart(2, '0');
    const minDay = String(now.getDate()).padStart(2, '0');
    const minHours = String(now.getHours()).padStart(2, '0');
    const minMinutes = String(now.getMinutes()).padStart(2, '0');
    elInputDatetime.min = `${minYear}-${minMonth}-${minDay}T${minHours}:${minMinutes}`;

    // Set default value to next 30-min slot
    let m = now.getMinutes();
    if (m < 30) {
      now.setMinutes(30, 0, 0);
    } else {
      now.setHours(now.getHours() + 1, 0, 0, 0);
    }
    
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');

    elInputDatetime.value = `${year}-${month}-${day}T${hours}:${minutes}`;
  }

  // Toast Helper
  function showToast(message, type = 'info') {
    const toastContainer = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    let iconClass = 'fa-info-circle';
    if (type === 'success') iconClass = 'fa-check-circle';
    if (type === 'error') iconClass = 'fa-exclamation-circle';
    if (type === 'warning') iconClass = 'fa-triangle-exclamation';

    toast.innerHTML = `<i class="fa-solid ${iconClass}"></i> <span>${message}</span>`;
    toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }

  // Unicode safe Base64 decode/encode
  function b64DecodeUnicode(str) {
    return decodeURIComponent(Array.prototype.map.call(atob(str), function(c) {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
  }

  function unicodeToB64(str) {
    return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, function(match, p1) {
      return String.fromCharCode('0x' + p1);
    }));
  }

  // GitHub REST API: Read Schedules
  async function fetchSchedulesFromGitHub() {
    if (!config.ghOwner || !config.ghRepo) {
      showToast('GitHub 저장소 설정이 필요합니다.', 'warning');
      openModal();
      return;
    }

    const url = `https://api.github.com/repos/${config.ghOwner}/${config.ghRepo}/contents/${FILE_PATH}`;
    const headers = { 'Accept': 'application/vnd.github.v3+json' };
    if (config.ghToken) {
      headers['Authorization'] = `token ${config.ghToken}`;
    }

    try {
      elBtnRefresh.classList.add('fa-spin');
      const response = await fetch(url, { headers });

      if (response.status === 404) {
        showToast('저장소에 schedules.json 파일이 없습니다. 기본 구조를 사용합니다.', 'info');
        schedulesData = { daily_limit: DAILY_MAX_LIMIT, schedules: [] };
        currentFileSha = null;
        renderDashboard();
        return;
      }

      if (!response.ok) {
        throw new Error(`GitHub API Error: ${response.statusText}`);
      }

      const json = await response.json();
      currentFileSha = json.sha;
      const contentDecoded = b64DecodeUnicode(json.content.replace(/\n/g, ''));
      schedulesData = JSON.parse(contentDecoded);
      
      showToast('GitHub 저장소 동기화 완료!', 'success');
      renderDashboard();

    } catch (err) {
      console.error(err);
      showToast(`동기화 실패: ${err.message}`, 'error');
    } finally {
      elBtnRefresh.classList.remove('fa-spin');
    }
  }

  // GitHub REST API: Save Schedules (Commit to repo)
  async function saveSchedulesToGitHub(commitMsg = 'chore: update notification schedules') {
    if (!config.ghOwner || !config.ghRepo || !config.ghToken) {
      showToast('GitHub 저장소 수정 권한(PAT Token)이 설정되어야 저장할 수 있습니다.', 'error');
      openModal();
      return false;
    }

    const url = `https://api.github.com/repos/${config.ghOwner}/${config.ghRepo}/contents/${FILE_PATH}`;
    const jsonStr = JSON.stringify(schedulesData, null, 2);
    const contentEncoded = unicodeToB64(jsonStr);

    const body = {
      message: commitMsg,
      content: contentEncoded,
      branch: 'main'
    };
    if (currentFileSha) {
      body.sha = currentFileSha;
    }

    try {
      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'Authorization': `token ${config.ghToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Commit failed');
      }

      const resJson = await response.json();
      currentFileSha = resJson.content.sha;
      return true;

    } catch (err) {
      console.error(err);
      showToast(`저장 실패: ${err.message}`, 'error');
      return false;
    }
  }

  // GitHub REST API: Workflow Dispatch (Trigger Action immediately)
  async function triggerWorkflowDispatch() {
    if (!config.ghOwner || !config.ghRepo || !config.ghToken) {
      return;
    }

    const url = `https://api.github.com/repos/${config.ghOwner}/${config.ghRepo}/actions/workflows/notify.yml/dispatches`;
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'Authorization': `token ${config.ghToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ ref: 'main' })
      });

      if (response.ok || response.status === 204) {
        showToast('🚀 GitHub Actions 실행이 개시되었습니다!', 'success');
      } else {
        console.warn('Dispatch failed:', response.status);
      }
    } catch (err) {
      console.error('Dispatch trigger error:', err);
    }
  }

  // Telegram Direct API Test
  async function testTelegramMessage() {
    const token = elTgToken.value.trim() || config.tgToken;
    const chatId = elTgChatId.value.trim() || config.tgChatId;

    if (!token || !chatId) {
      showToast('Telegram Bot Token과 Chat ID를 모두 입력해주세요.', 'warning');
      return;
    }

    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: '✅ <b>[텔레그램 알림이]</b>연결 테스트 메세지입니다!\n정상적으로 메시지를 수신했습니다 📱',
          parse_mode: 'HTML'
        })
      });

      const json = await response.json();
      if (json.ok) {
        showToast('텔레그램으로 테스트 메세지를 성공적으로 보냈습니다!', 'success');
      } else {
        showToast(`텔레그램 오류: ${json.description}`, 'error');
      }
    } catch (err) {
      showToast(`연결 오류: ${err.message}`, 'error');
    }
  }

  // Calculate Sent Today Count (KST)
  function getSentTodayCount() {
    const now = new Date();
    const todayKst = getKSTDateString(now);

    return schedulesData.schedules.filter(item => {
      if (item.status === 'sent' && item.sent_at) {
        const sentDt = new Date(item.sent_at);
        return getKSTDateString(sentDt) === todayKst;
      }
      return false;
    }).length;
  }

  function getKSTDateString(dt) {
    const kstMs = dt.getTime() + (9 * 60 * 60 * 1000) + (dt.getTimezoneOffset() * 60 * 1000);
    const kstDt = new Date(kstMs);
    const y = kstDt.getFullYear();
    const m = String(kstDt.getMonth() + 1).padStart(2, '0');
    const d = String(kstDt.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  // Render Dashboard Elements & Lists
  function renderDashboard() {
    const sentToday = getSentTodayCount();
    const maxLimit = schedulesData.daily_limit || DAILY_MAX_LIMIT;
    const usagePercent = Math.min(100, Math.round((sentToday / maxLimit) * 100));

    // Update Badges & Stat Cards
    elSentTodayCount.textContent = sentToday;
    elMaxDailyLimit.textContent = maxLimit;
    elStatSentTodayCount.textContent = sentToday;
    elUsagePercentText.textContent = `${usagePercent}% 사용 중 (${sentToday}/${maxLimit}회)`;
    elUsageProgressBar.style.width = `${usagePercent}%`;

    const pendingList = schedulesData.schedules.filter(s => s.status === 'pending');
    const sentList = schedulesData.schedules.filter(s => s.status === 'sent');

    elStatPendingCount.textContent = pendingList.length;
    elStatTotalCount.textContent = schedulesData.schedules.length;

    elTabCountPending.textContent = pendingList.length;
    elTabCountSent.textContent = sentList.length;

    // Filter Items by active tab
    let displayItems = [];
    if (activeTab === 'pending') displayItems = pendingList;
    else if (activeTab === 'sent') displayItems = sentList;
    else displayItems = schedulesData.schedules;

    // Sort by datetime
    displayItems.sort((a, b) => a.datetime.localeCompare(b.datetime));

    renderScheduleItems(displayItems);
  }

  function renderScheduleItems(items) {
    // Clear list
    const existingCards = elScheduleList.querySelectorAll('.schedule-item');
    existingCards.forEach(c => c.remove());

    if (items.length === 0) {
      elEmptyState.style.display = 'flex';
      return;
    }

    elEmptyState.style.display = 'none';

    items.forEach(item => {
      const card = document.createElement('div');
      card.className = 'schedule-item';

      const isPending = item.status === 'pending';
      
      // Exact parsing without JS timezone shifts
      const dtStr = item.datetime; // e.g., "2026-08-02T23:00:00+09:00"
      let timeStr = dtStr;
      const match = dtStr.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
      if (match) {
        timeStr = `${match[1]}. ${match[2]}. ${match[3]}. ${match[4]}:${match[5]}`;
      }

      const badgeHtml = isPending
        ? `<span class="badge-status badge-pending"><i class="fa-regular fa-clock"></i> 발송 대기</span>`
        : `<span class="badge-status badge-sent"><i class="fa-solid fa-check"></i> 발송 완료</span>`;

      card.innerHTML = `
        <div class="item-main">
          <div class="item-header-line">
            <span class="item-title">${escapeHtml(item.title)}</span>
            ${badgeHtml}
          </div>
          <div class="item-message">${escapeHtml(item.message)}</div>
          <div class="item-meta">
            <span><i class="fa-regular fa-calendar"></i> ${timeStr} (KST)</span>
            ${item.sent_at ? `<span><i class="fa-regular fa-circle-check"></i> 발송시각: ${new Date(item.sent_at).toLocaleTimeString('ko-KR')}</span>` : ''}
          </div>
        </div>
        <div class="item-actions">
          <button class="btn-delete" data-id="${item.id}" title="삭제">
            <i class="fa-regular fa-trash-can"></i>
          </button>
        </div>
      `;

      elScheduleList.appendChild(card);
    });

    // Attach delete listeners
    elScheduleList.querySelectorAll('.btn-delete').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        deleteScheduleItem(id);
      });
    });
  }

  function escapeHtml(text) {
    if (!text) return '';
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // Delete Schedule Handler
  async function deleteScheduleItem(id) {
    if (!confirm('이 알림 예약을 삭제하시겠습니까?')) return;

    schedulesData.schedules = schedulesData.schedules.filter(s => s.id !== id);
    const success = await saveSchedulesToGitHub('chore: delete notification schedule');
    
    if (success) {
      showToast('알림 예약을 삭제했습니다.', 'info');
      renderDashboard();
    }
  }

  // Form Submit Handler (Add Schedule)
  elForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const sentToday = getSentTodayCount();
    if (sentToday >= (schedulesData.daily_limit || DAILY_MAX_LIMIT)) {
      showToast(`오늘 일일 최대 알림 한도(${DAILY_MAX_LIMIT}회)에 도달하여 추가 예약을 할 수 없습니다.`, 'error');
      return;
    }

    const title = elInputTitle.value.trim();
    const datetimeVal = elInputDatetime.value; // e.g. "2026-08-02T23:00"
    const message = elInputMessage.value.trim();
    const immediateTrigger = elCheckImmediateTrigger.checked;

    if (!title || !datetimeVal || !message) {
      showToast('모든 양식을 입력해주세요.', 'warning');
      return;
    }

    // Past Time Validation Check
    const selectedDt = new Date(datetimeVal);
    const now = new Date();
    if (selectedDt <= now) {
      showToast('⚠️ 예약 시간은 현재 시각 이후여야 합니다. (지나간 과거 시간은 예약할 수 없습니다)', 'warning');
      elInputDatetime.focus();
      return;
    }

    // Absolutely exact string formatting for KST (+09:00)
    const formattedDatetime = datetimeVal.length === 16 ? `${datetimeVal}:00` : datetimeVal;
    const isoKstStr = `${formattedDatetime}+09:00`;

    const newItem = {
      id: 'item_' + Date.now(),
      title: title,
      message: message,
      datetime: isoKstStr,
      status: 'pending',
      created_at: new Date().toISOString(),
      sent_at: null
    };

    schedulesData.schedules.push(newItem);

    elBtnSubmitSchedule.disabled = true;
    elBtnSubmitSchedule.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> 저장 중...';

    const success = await saveSchedulesToGitHub(`feat: add schedule '${title}'`);

    if (success) {
      showToast(`알림 '${title}'이 성공적으로 예약되었습니다!`, 'success');
      elForm.reset();
      setDefaultDatetimePicker();
      renderDashboard();

      if (immediateTrigger) {
        await triggerWorkflowDispatch();
      }
    }

    elBtnSubmitSchedule.disabled = false;
    elBtnSubmitSchedule.innerHTML = '<i class="fa-solid fa-paper-plane"></i> <span>알림 예약 등록하기</span>';
  });

  // Modal Open / Close Logic
  function openModal() { elSettingsModal.classList.add('active'); }
  function closeModal() { elSettingsModal.classList.remove('active'); }

  elBtnOpenSettings.addEventListener('click', () => {
    populateConfigInputs();
    openModal();
  });
  elBtnCloseSettings.addEventListener('click', closeModal);
  elBtnCancelSettings.addEventListener('click', closeModal);

  elBtnSaveSettings.addEventListener('click', () => {
    config.ghOwner = elGhOwner.value.trim();
    config.ghRepo = elGhRepo.value.trim();
    config.ghToken = elGhToken.value.trim();
    config.tgToken = elTgToken.value.trim();
    config.tgChatId = elTgChatId.value.trim();

    localStorage.setItem(STORAGE_KEYS.GH_OWNER, config.ghOwner);
    localStorage.setItem(STORAGE_KEYS.GH_REPO, config.ghRepo);
    localStorage.setItem(STORAGE_KEYS.GH_TOKEN, config.ghToken);
    localStorage.setItem(STORAGE_KEYS.TG_TOKEN, config.tgToken);
    localStorage.setItem(STORAGE_KEYS.TG_CHAT_ID, config.tgChatId);

    showToast('설정이 성공적으로 저장되었습니다.', 'success');
    closeModal();

    if (config.ghOwner && config.ghRepo) {
      fetchSchedulesFromGitHub();
    }
  });

  elBtnTestTelegram.addEventListener('click', testTelegramMessage);
  elBtnRefresh.addEventListener('click', fetchSchedulesFromGitHub);
  elBtnManualDispatch.addEventListener('click', triggerWorkflowDispatch);

  // Tab Handler
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      activeTab = e.target.getAttribute('data-tab');
      renderDashboard();
    });
  });

  // App Initialization
  populateConfigInputs();
  setDefaultDatetimePicker();

  if (config.ghOwner && config.ghRepo) {
    fetchSchedulesFromGitHub();
  } else {
    renderDashboard();
  }

});
