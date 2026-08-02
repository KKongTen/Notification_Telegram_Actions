#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import json
import os
import sys
import re
from datetime import datetime, timezone, timedelta

KST = timezone(timedelta(hours=9))
JSON_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '.github', 'data', 'schedules.json'))

def parse_issue_body(body_text):
    """
    GitHub Issue Form body 파싱
    """
    title, dt_str, message = "", "", ""
    
    title_match = re.search(r'### 알림 제목\s*\n\s*(.*?)(?=\n###|\Z)', body_text, re.DOTALL)
    if title_match:
        title = title_match.group(1).strip()
        
    dt_match = re.search(r'### 예약 일시.*?\n\s*(.*?)(?=\n###|\Z)', body_text, re.DOTALL)
    if dt_match:
        dt_str = dt_match.group(1).strip()
        
    msg_match = re.search(r'### 알림 메세지 내용\s*\n\s*(.*?)(?=\n###|\Z)', body_text, re.DOTALL)
    if msg_match:
        message = msg_match.group(1).strip()

    return title, dt_str, message

def parse_datetime_to_kst(dt_input_str):
    dt_input_str = dt_input_str.strip()
    formats = [
        "%Y-%m-%d %H:%M",
        "%Y-%m-%d %H:%M:%S",
        "%Y-%m-%dT%H:%M",
        "%Y-%m-%dT%H:%M:%S",
        "%Y/%m/%d %H:%M"
    ]
    for fmt in formats:
        try:
            dt = datetime.strptime(dt_input_str, fmt)
            return dt.replace(tzinfo=KST)
        except ValueError:
            pass
    return None

def main():
    body = os.environ.get("ISSUE_BODY", "")
    issue_title = os.environ.get("ISSUE_TITLE", "")
    
    title, dt_str, message = parse_issue_body(body)
    if not title:
        title = issue_title.replace("[예약]", "").strip() or "이슈 알림 예약"
        
    if not dt_str or not message:
        print("[ERROR] Failed to parse datetime or message from Issue body.")
        sys.exit(1)
        
    dt_kst = parse_datetime_to_kst(dt_str)
    if not dt_kst:
        print(f"[ERROR] Invalid datetime format '{dt_str}'. Expected 'YYYY-MM-DD HH:MM'")
        sys.exit(1)
        
    now_kst = datetime.now(KST)
    if dt_kst <= now_kst:
        print(f"[ERROR] Scheduled time '{dt_kst.isoformat()}' is in the past! Current time: '{now_kst.isoformat()}'")
        sys.exit(1)
        
    iso_dt = dt_kst.isoformat()

    with open(JSON_PATH, 'r', encoding='utf-8') as f:
        data = json.load(f)
        
    new_item = {
        "id": "issue_" + str(int(datetime.now().timestamp() * 1000)),
        "title": title,
        "message": message,
        "datetime": iso_dt,
        "status": "pending",
        "created_at": datetime.now(KST).isoformat(),
        "sent_at": None
    }
    
    data["schedules"].append(new_item)
    
    with open(JSON_PATH, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        
    print(f"[SUCCESS] Added new schedule from Issue: '{title}' at {iso_dt}")

if __name__ == "__main__":
    main()
