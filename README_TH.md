# 🌏 Tripsterweb - ระบบวางแผนการเดินทางด้วย AI

<p align="center">
  <img src="https://img.shields.io/badge/React-18.x-61DAFB?logo=react" alt="React" />
  <img src="https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Supabase-Backend-3FCF8E?logo=supabase" alt="Supabase" />
  <img src="https://img.shields.io/badge/Tailwind-CSS-06B6D4?logo=tailwindcss" alt="Tailwind" />
</p>

## 📖 เกี่ยวกับโปรเจค

**Tripsterweb** เป็นเว็บแอปพลิเคชันวางแผนการเดินทางอัจฉริยะ ที่ใช้ AI ช่วยสร้างแผนการเดินทางแบบ personalized ผู้ใช้สามารถแชทกับ AI เพื่อขอคำแนะนำสถานที่ท่องเที่ยว ร้านอาหาร ที่พัก และจัดตารางการเดินทางได้อย่างสะดวก

### 🔗 ลิงค์
- **เว็บไซต์**: [tripsterweb.vercel.app](https://tripsterweb.vercel.app)
- **GitHub**: [github.com/Libity13/Tripsterweb](https://github.com/Libity13/Tripsterweb)

---

## ✨ ฟีเจอร์หลัก

### 🤖 AI Chat สำหรับวางแผนทริป
- รองรับ 3 AI: **OpenAI**, **Claude**, **Gemini**
- สนทนาภาษาไทยได้เต็มรูปแบบ
- AI แนะนำสถานที่ตามความต้องการ
- เพิ่มสถานที่ลงแผนได้ด้วยคลิกเดียว

### 🗺️ แผนที่และสถานที่
- **Google Maps** แสดงตำแหน่งสถานที่
- **Google Places** ค้นหาร้านอาหาร ที่พัก สถานที่ท่องเที่ยว
- แสดงเส้นทางการเดินทาง
- ลาก-วางเพื่อจัดลำดับสถานที่

### 📄 Export & Share
- **Export PDF** แผนการเดินทางสวยงาม
- แชร์ทริปให้เพื่อนดูได้
- QR Code สำหรับแชร์

### 🌐 รองรับหลายภาษา
- ภาษาไทย 🇹🇭
- ภาษาอังกฤษ 🇬🇧

### 👤 ระบบผู้ใช้
- Guest Mode (ใช้งานได้โดยไม่ต้องสมัคร)
- Google Sign-In
- บันทึกแผนการเดินทางในบัญชี

---

## 🛠️ เทคโนโลยีที่ใช้

| หมวด | เทคโนโลยี |
|------|-----------|
| **Frontend** | React, TypeScript, Vite |
| **UI** | Tailwind CSS, shadcn/ui, Radix UI |
| **Backend** | Supabase (Database, Auth, Edge Functions) |
| **Maps** | Google Maps API, Google Places API |
| **AI** | OpenAI, Anthropic Claude, Google Gemini |
| **PDF** | @react-pdf/renderer |

---

## 🚀 การติดตั้ง

### ขั้นตอนที่ 1: Clone โปรเจค

```bash
git clone https://github.com/Libity13/Tripsterweb.git
cd Tripsterweb
```

### ขั้นตอนที่ 2: ติดตั้ง Dependencies

```bash
npm install
```

### ขั้นตอนที่ 3: ตั้งค่า Environment Variables

```bash
# คัดลอกไฟล์ตัวอย่าง
cp .env.example .env.local
```

แก้ไขไฟล์ `.env.local`:

```env
# Supabase (จาก https://supabase.com/dashboard)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Google Maps (จาก https://console.cloud.google.com)
VITE_GOOGLE_MAPS_API_KEY=your-google-maps-key

# Mapbox (ถ้าต้องการ)
VITE_MAPBOX_TOKEN=your-mapbox-token
```

### ขั้นตอนที่ 4: ตั้งค่า Supabase

1. สร้าง Project ใหม่ที่ [supabase.com](https://supabase.com)
2. ไปที่ **SQL Editor** และรัน migrations:
   - `supabase/migrations/001_initial_schema.sql`
   - `supabase/migrations/002_add_share_columns.sql`
   - `supabase/migrations/003_add_destination_fields.sql`

3. ตั้งค่า **Edge Functions Secrets**:
   ```
   OPENAI_API_KEY=sk-...
   CLAUDE_API_KEY=sk-ant-...
   GEMINI_API_KEY=AIza...
   GOOGLE_MAPS_API_KEY=AIza...
   ```

### ขั้นตอนที่ 5: รันโปรเจค

```bash
npm run dev
```

เปิดเบราว์เซอร์ไปที่ `http://localhost:5173`

---

## 📁 โครงสร้างโปรเจค

```
Tripsterweb/
├── public/
│   └── fonts/                 # ฟอนต์สำหรับ PDF
├── src/
│   ├── components/            # React Components
│   │   ├── trip/              # Components เกี่ยวกับทริป
│   │   └── ui/                # UI Components (shadcn)
│   ├── hooks/                 # Custom Hooks
│   ├── pages/                 # หน้าต่างๆ
│   ├── services/              # Business Logic
│   │   ├── aiService.ts       # AI Chat Service
│   │   ├── tripService.ts     # Trip CRUD
│   │   ├── shareService.ts    # Share Trip
│   │   └── pdfExportService.tsx # PDF Export
│   ├── types/                 # TypeScript Types
│   └── lib/                   # Utilities
├── supabase/
│   ├── functions/             # Edge Functions
│   │   └── ai-chat/           # AI Chat Backend
│   └── migrations/            # Database Migrations
└── .env.example               # ตัวอย่าง Environment Variables
```

---

## 🔑 การขอ API Keys

### 1. Supabase
1. ไปที่ [supabase.com](https://supabase.com)
2. สร้าง Project ใหม่
3. ไปที่ **Settings > API**
4. คัดลอก `Project URL` และ `anon public` key

### 2. Google Maps & Places API
1. ไปที่ [Google Cloud Console](https://console.cloud.google.com)
2. สร้าง Project ใหม่
3. เปิดใช้งาน APIs:
   - Maps JavaScript API
   - Places API
   - Geocoding API
4. สร้าง API Key ใน **Credentials**

### 3. AI API Keys (เลือกอย่างน้อย 1 อัน)

| AI | ลิงค์สมัคร |
|----|-----------|
| **OpenAI** | [platform.openai.com](https://platform.openai.com/api-keys) |
| **Claude** | [console.anthropic.com](https://console.anthropic.com) |
| **Gemini** | [aistudio.google.com](https://aistudio.google.com/app/apikey) |

---

## 📸 ตัวอย่างหน้าจอ

### หน้าหลัก - รายการทริป
```
┌─────────────────────────────────────┐
│  🌏 Tripsterweb                     │
├─────────────────────────────────────┤
│  แผนการเดินทางของฉัน                  │
│                                     │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐│
│  │ทริปเชียงใหม่│ │ทริปภูเก็ต │ │ทริปกระบี่ ││
│  │ 3 วัน    │ │ 5 วัน    │ │ 4 วัน    ││
│  │ 8 สถานที่ │ │ 12 สถานที่│ │ 10 สถานที่││
│  └─────────┘ └─────────┘ └─────────┘│
└─────────────────────────────────────┘
```

### หน้าวางแผนทริป
```
┌──────────────────┬──────────────────┐
│   📅 กำหนดการ    │    🗺️ แผนที่     │
├──────────────────┤                  │
│ วันที่ 1         │   [Google Map]   │
│ • วัดพระธาตุ     │                  │
│ • ร้านข้าวซอย    │                  │
│ • ถนนนิมมาน     │                  │
├──────────────────┤                  │
│ 💬 AI Chat       │                  │
│ ──────────────── │                  │
│ คุณ: แนะนำร้าน   │                  │
│ AI: ขอแนะนำ...   │                  │
└──────────────────┴──────────────────┘
```

---

## 🤝 การมีส่วนร่วม

ยินดีรับ Pull Requests และ Issues ครับ!

1. Fork โปรเจค
2. สร้าง Branch ใหม่ (`git checkout -b feature/amazing-feature`)
3. Commit การเปลี่ยนแปลง (`git commit -m 'Add amazing feature'`)
4. Push ไป Branch (`git push origin feature/amazing-feature`)
5. เปิด Pull Request

---

## 📄 License

โปรเจคนี้เป็น Private และ Proprietary

---

## 👨‍💻 ผู้พัฒนา

สร้างด้วย ❤️ โดยใช้ [Cursor AI](https://cursor.sh) + [Claude](https://anthropic.com)

---

## 📞 ติดต่อ

- **GitHub**: [@Libity13](https://github.com/Libity13)
- **โปรเจค**: [Tripsterweb](https://github.com/Libity13/Tripsterweb)

