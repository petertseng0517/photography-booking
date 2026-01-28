# 守護四十.幸福顯影「拍」對 - 拍攝時段登記系統

## 📸 專案概述

為慶祝花蓮慈濟醫院40週年慶，院方推出 守護四十 幸福顯影「拍對」活動。因此我們設計了一個拍攝 **即時預約系統**，提供精細化的 10 分鐘時段預約管理。支援多人即時協作，讓預約資訊實時同步，杜絕重複預約。

### 🎯 核心功能

| 功能 | 說明 |
|------|------|
| **即時時段預約** | 支援 2025-01-22 和 2025-01-23 兩天，上午 08:00-12:00、下午 13:30-17:30，每 10 分鐘一個時段 |
| **實時資料同步** | 基於 Firebase Firestore，多設備實時推送（毫秒級延遲） |
| **預約統計表** | 一鍵查看所有預約統計、時段占用情況 |
| **CSV 匯出** | 下載所有預約資料為 CSV 檔案，方便 Excel 管理 |
| **AI 問候語** | 使用 Google Gemini 生成動態歡迎語 |
| **響應式設計** | 完美支援電腦、平板、手機等各種設備 |

---

## 🚀 快速開始

### 線上訪問

🌐 **直接開啟：** https://photography-booking-5d7b5.web.app/

### 本地開發

#### 1. 安裝依賴
```bash
npm install
```

#### 2. 配置環境變數
編輯 `.env.local` 檔案，填入你的 Firebase 配置和 Google Gemini API Key：

```dotenv
GEMINI_API_KEY=your_api_key_here

VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_firebase_auth_domain
VITE_FIREBASE_PROJECT_ID=your_firebase_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_firebase_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
VITE_FIREBASE_APP_ID=your_firebase_app_id
```

#### 3. 啟動開發伺服器
```bash
npm run dev
```

訪問 http://localhost:3000（本機）或 http://192.168.1.127:3000（區域網）

#### 4. 構建生產版本
```bash
npm run build
```

---

## 📋 使用說明

### 1. 預約時段

1. **選擇日期** - 在左側選擇 01/22 或 01/23
2. **選擇時段** - 點擊可用時段（綠色為可預約，灰色為已滿）
3. **填寫資料** - 輸入姓名、單位、分機
4. **確認報名** - 點擊「確認報名」按鈕
5. **預約成功** - 會看到成功提示，自動回到預約介面

### 2. 查看統計

點擊右上角「預約統計」按鈕：

- **時段表格** - 視覺化展示每個時段的預約狀態
- **詳細清單** - 所有預約者的完整資訊
- **下載 CSV** - 一鍵匯出為 Excel

### 3. 管理資料

在 [Firebase Console](https://console.firebase.google.com) 可以：

- 查看所有預約記錄
- 手動編輯或刪除預約
- 檢視實時資料變化

---

## 🛠️ 技術棧

```
前端框架          React 19 + TypeScript
構建工具          Vite 6
樣式框架          Tailwind CSS
資料庫/後端        Firebase Firestore（實時資料庫）
認證              Firebase Authentication（可選）
AI 服務           Google Gemini 3 Flash API
圖標庫            Font Awesome 6
部署平台          Firebase Hosting
```

### 核心依賴

```json
{
  "react": "^19.2.3",
  "react-dom": "^19.2.3",
  "firebase": "^10.x",
  "@google/genai": "^1.35.0"
}
```

---

## 📁 專案結構

```
.
├── src/
│   ├── App.tsx          # 主應用組件（時段選擇、預約表單、統計）
│   ├── firebase.ts      # Firebase 初始化
│   ├── utils.ts         # 工具函數（時間格式化、Firebase 操作）
│   ├── types.ts         # TypeScript 型別定義
│   └── index.tsx        # 入口點
├── index.html           # HTML 模板
├── vite.config.ts       # Vite 配置
├── tsconfig.json        # TypeScript 配置
├── firebase.json        # Firebase 部署配置
├── .env.local           # 環境變數（不上傳 Git）
└── package.json         # 專案依賴和腳本
```

---

## 🔄 即時同步原理

```
手機端提交預約
    ↓
上傳到 Firebase Firestore
    ↓
Firebase 推送更新信號
    ↓
電腦端即時接收（毫秒級）
    ↓
UI 自動更新
```

**優勢：**
- ⚡ 毫秒級延遲（相比 20 秒輪詢方案）
- 📱 多設備同步無誤
- 🔒 杜絕雙重預約
- 💪 Firebase 官方穩定支援

---

## 📊 資料模型

### Registration（預約記錄）

```typescript
{
  id: string;           // 唯一識別碼
  name: string;         // 預約人姓名
  department: string;   // 單位
  extension: string;    // 分機
  date: string;         // 日期 (YYYY-MM-DD)
  timeSlot: string;     // 時段 (HH:mm)
  createdAt: number;    // 建立時間戳
}
```

---

## 🚀 部署指南

### 部署到 Firebase Hosting

```bash
# 1. 安裝 Firebase CLI
npm install -g firebase-tools

# 2. 登入 Firebase
firebase login

# 3. 初始化（已完成）
firebase init hosting

# 4. 構建
npm run build

# 5. 部署
firebase deploy --only hosting
```

### 自動 CI/CD 部署

已設定 GitHub Actions 工作流，當 push 到 `main` 分支時自動部署。

---

## 🔐 安全性設定

### Firebase Security Rules

建議在 Firestore 設定以下規則以保護資料：

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /registrations/{document=**} {
      // 任何人都可讀
      allow read: if true;
      // 只能添加（防止批量刪除）
      allow create: if request.resource.data.size() == 6;
      // 不允許直接編輯或刪除（由管理員在 Console 操作）
      allow update, delete: if false;
    }
  }
}
```

---

## 🎨 UI/UX 特色

- 📱 **響應式設計** - 自動適應各種螢幕尺寸
- 🎯 **直觀操作** - 三步完成預約（選日期 → 選時段 → 填資料）
- ✨ **視覺反饋** - 動畫、顏色提示，清楚標示時段狀態
- 📊 **即時統計** - 表格和清單並行展示，一目瞭然
- 🌈 **Tailwind CSS** - 現代化設計，深藍色主題

---

## 🐛 常見問題

### Q: 為什麼我的預約沒有立即出現在其他設備？

**A:** 應該會立即出現（毫秒級）。如果沒有：
1. 檢查網路連線
2. 重新整理頁面
3. 確認 Firebase 配置正確

### Q: 可以編輯或刪除預約嗎？

**A:** 
- 在 App 中：無法直接編輯，只能重新預約
- 在 Firebase Console：可以直接編輯或刪除記錄

### Q: 如何匯出預約資料？

**A:** 點擊「預約統計」→「下載為 CSV」，自動下載 Excel 檔案

### Q: 支援多少人同時使用？

**A:** Firebase 免費層可支援數千並發，足以應對中小型活動

---

## 📝 環境變數

### 必填項

- `GEMINI_API_KEY` - Google Gemini API 金鑰（用於 AI 歡迎語）
- `VITE_FIREBASE_*` - Firebase 專案配置（6 個環境變數）

### 取得 API 金鑰

**Google Gemini API:**
1. 訪問 [Google AI Studio](https://makersuite.google.com/app/apikey)
2. 建立新 API 金鑰
3. 複製到 `.env.local`

**Firebase 配置:**
1. 進入 [Firebase Console](https://console.firebase.google.com)
2. 進入專案設定
3. 複製網頁應用配置

---

## 📞 技術支援

如有問題或建議，請檢查：

1. ✅ 所有環境變數已正確設定
2. ✅ Firebase 專案已啟用 Firestore
3. ✅ 網路連線正常
4. ✅ 瀏覽器快取已清除（Ctrl+F5）

---

## 📄 授權

此專案為 MIT 授權。

---

**最後更新：** 2026-01-14  
**版本：** 1.0.0  
**應用網址：** https://photography-booking-5d7b5.web.app
