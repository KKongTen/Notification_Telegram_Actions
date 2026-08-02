#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import json
import os
import sys
import urllib.request
import urllib.parse
from datetime import datetime, timezone, timedelta

# KST 시간대 (UTC+9)
KST = timezone(timedelta(hours=9))

JSON_PATH = os.path.join(os.path.dirname(__file__), '..', '.github', 'data', 'schedules.json')
JSON_PATH = os.path.abspath(JSON_PATH)

def get_env_or_config(key, fallback_val=""):
    val = os.environ.get(key, "").strip()
    return val if val else fallback_val

def send_telegram_message(token, chat_id, text):
    if not token or not chat_id:
        print(f"[ERROR] Telegram Bot Token or Chat ID is missing. Token: {'Set' if token else 'Empty'}, ChatID: {'Set' if chat_id else 'Empty'}")
        return False
    
    url = f"https://api.telegram.org/bot{token}/sendMessage"
    payload = {
        "chat_id": chat_id,
        "text": text,
        "parse_mode": "HTML"
    }
    
    data = json.dumps(payload).encode('utf-8')
    req = urllib.request.Request(
        url,
        data=data,
        headers={"Content-Type": "application/json"}
    )
    
    try:
        with urllib.request.urlopen(req, timeout=15) as response:
            res_body = response.read().decode('utf-8')
            res_json = json.loads(res_body)
            if res_json.get("ok"):
                return True
            else:
                print(f"[ERROR] Telegram API Error: {res_json}")
                return False
    except Exception as e:
        print(f"[ERROR] Exception sending Telegram message: {e}")
        return False

def parse_iso_datetime(dt_str):
    try:
        # ISO 형식 파싱
        if dt_str.endswith('Z'):
            dt_str = dt_str[:-1] + '+00:00'
        dt = datetime.fromisoformat(dt_str)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=KST)
        return dt
    except Exception as e:
        print(f"[WARNING] Failed to parse datetime '{dt_str}': {e}")
        return None

def main():
    if not os.path.exists(JSON_PATH):
        print(f"[ERROR] JSON file not found at {JSON_PATH}")
        sys.exit(1)
        
    with open(JSON_PATH, 'r', encoding='utf-8') as f:
        data = json.load(f)
        
    daily_limit = data.get("daily_limit", 30)
    schedules = data.get("schedules", [])
    
    token = get_env_or_config("TELEGRAM_BOT_TOKEN", data.get("telegram_bot_token", ""))
    chat_id = get_env_or_config("TELEGRAM_CHAT_ID", data.get("telegram_chat_id", ""))
    
    now_kst = datetime.now(KST)
    today_str = now_kst.strftime("%Y-%m-%d")
    
    # 오늘 (KST 기준) 이미 전송된 알림 개수 세기
    sent_today_count = 0
    for item in schedules:
        if item.get("status") == "sent" and item.get("sent_at"):
            sent_dt = parse_iso_datetime(item.get("sent_at"))
            if sent_dt and sent_dt.astimezone(KST).strftime("%Y-%m-%d") == today_str:
                sent_today_count += 1
                
    print(f"[{now_kst.strftime('%Y-%m-%d %H:%M:%S KST')}] Daily limit check: {sent_today_count} / {daily_limit} sent today.")
    
    if sent_today_count >= daily_limit:
        print(f"[WARNING] Reached daily limit ({daily_limit}). Skipping pending notifications for today.")
        sys.exit(0)
        
    updated_count = 0
    
    for item in schedules:
        if item.get("status") != "pending":
            continue
            
        target_dt = parse_iso_datetime(item.get("datetime"))
        if not target_dt:
            continue
            
        # 예약 시간이 현재 시간이거나 지난 경우
        if target_dt <= now_kst:
            if sent_today_count >= daily_limit:
                print(f"[WARNING] Daily limit of {daily_limit} reached mid-processing!")
                # 초과 통지 메세지 1회 전송 시도
                send_telegram_message(
                    token, chat_id,
                    f"⚠️ <b>[텔레그램 알림이 경고]</b>\n오늘 일일 알림 한도({daily_limit}회)에 도달하여 추가 알림 발송이 일시 중단됩니다."
                )
                break
                
            title = item.get("title", "🔔 예약 알림")
            message = item.get("message", "")
            time_display = target_dt.astimezone(KST).strftime("%Y-%m-%d %H:%M")
            
            telegram_text = (
                f"🔔 <b>[텔레그램 알림이] {title}</b>\n\n"
                f"📝 {message}\n\n"
                f"⏰ <i>예약일시: {time_display}</i>"
            )
            
            print(f"[INFO] Sending notification: ID={item.get('id')}, Title={title}")
            success = send_telegram_message(token, chat_id, telegram_text)
            
            if success:
                item["status"] = "sent"
                item["sent_at"] = now_kst.isoformat()
                sent_today_count += 1
                updated_count += 1
            else:
                print(f"[ERROR] Failed to send notification ID={item.get('id')}")

    if updated_count > 0:
        data["schedules"] = schedules
        with open(JSON_PATH, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        print(f"[SUCCESS] Updated {updated_count} schedule(s) in {JSON_PATH}")
    else:
        print("[INFO] No pending schedules due for delivery at this time.")

if __name__ == "__main__":
    main()
