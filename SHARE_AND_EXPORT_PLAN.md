# 📤 Share & Export PDF Feature Plan

## 🎯 Overview
เพิ่มฟีเจอร์ให้ผู้ใช้สามารถ:
1. **Share Trip** - แชร์ลิงก์แผนการเดินทางให้เพื่อนดู (Read-only)
2. **Export PDF** - ดาวน์โหลดแผนการเดินทางเป็นไฟล์ PDF สวยงาม พร้อมพิมพ์

---

## 📋 Feature 1: Share Trip (Public Link)

### User Flow
```
User คลิก "Share" → ระบบสร้าง Public Link → Copy ลิงก์ → 
แชร์ให้เพื่อน → เพื่อนเปิดดูแผนแบบ Read-only
```

### Technical Plan

#### 1. Database Changes
**Table: `trips`** - เพิ่มคอลัมน์ใหม่
```sql
ALTER TABLE trips ADD COLUMN IF NOT EXISTS share_token TEXT UNIQUE;
ALTER TABLE trips ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT false;
ALTER TABLE trips ADD COLUMN IF NOT EXISTS shared_at TIMESTAMP WITH TIME ZONE;
```

#### 2. Backend - Supabase RLS Policy
```sql
-- Policy: อนุญาตให้ทุกคนอ่าน Trip ที่ is_public = true
CREATE POLICY "Allow public read for shared trips"
ON trips FOR SELECT
USING (is_public = true);

-- Policy: อนุญาตให้ทุกคนอ่าน Destinations ของ Public Trip
CREATE POLICY "Allow public read for shared trip destinations"
ON destinations FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM trips 
    WHERE trips.id = destinations.trip_id 
    AND trips.is_public = true
  )
);
```

#### 3. Frontend Components

**`src/components/ShareTripButton.tsx`** (ใหม่)
```tsx
- สร้างปุ่ม "Share" 
- คลิกแล้วเรียก API สร้าง share_token (ถ้ายังไม่มี)
- แสดง Dialog พร้อม:
  ✓ Link: https://tripster.app/share/{share_token}
  ✓ ปุ่ม Copy Link
  ✓ QR Code (optional)
  ✓ สถานะ Public/Private Toggle
  ✓ ปุ่ม Social Share (Line, Facebook, Twitter)
```

**`src/pages/SharedTrip.tsx`** (ใหม่)
```tsx
- Route: /share/:share_token
- แสดงแผนการเดินทางแบบ Read-only
- ไม่มีปุ่ม Edit / Chat / Delete
- มีปุ่ม "Copy this trip" ให้คนอื่นสร้างทริปเดียวกัน
- แสดง Watermark "Created with Tripster" (optional)
```

#### 4. Service Layer

**`src/services/shareService.ts`** (ใหม่)
```typescript
// สร้าง share token และ update database
async function generateShareLink(tripId: string): Promise<string>

// ดึงข้อมูล trip จาก share_token
async function getTripByShareToken(token: string): Promise<Trip>

// Toggle public/private
async function toggleTripVisibility(tripId: string, isPublic: boolean)

// คัดลอก trip ของคนอื่นมาเป็นของตัวเอง
async function duplicateTrip(shareToken: string, userId: string): Promise<Trip>
```

#### 5. Routes (App.tsx)
```tsx
<Route path="/share/:shareToken" element={<SharedTrip />} />
```

---

## 📄 Feature 2: Export to PDF

### User Flow
```
User คลิก "Export PDF" → เลือกตัวเลือก (แบบสั้น/เต็ม) → 
ระบบ Generate PDF → ดาวน์โหลดไฟล์
```

### Technical Plan

#### 1. PDF Generation Library
**เลือก Library:** `react-pdf/renderer` (แนะนำ) หรือ `jsPDF` + `html2canvas`

เหตุผล:
- ✅ `react-pdf/renderer`: สร้าง PDF จาก React Components ได้โดยตรง, คุณภาพสูง, รองรับ Thai font
- ⚠️ `jsPDF + html2canvas`: แปลง HTML เป็นรูป แล้วใส่ใน PDF (ง่ายแต่คุณภาพต่ำกว่า)

#### 2. Installation
```bash
npm install @react-pdf/renderer
npm install -D @types/react-pdf
```

#### 3. Thai Font Setup
ดาวน์โหลด Thai Font (เช่น Noto Sans Thai, Sarabun) และ import เข้า PDF

```typescript
import { Font } from '@react-pdf/renderer';

Font.register({
  family: 'Sarabun',
  fonts: [
    { src: '/fonts/Sarabun-Regular.ttf' },
    { src: '/fonts/Sarabun-Bold.ttf', fontWeight: 'bold' }
  ]
});
```

#### 4. PDF Template Components

**`src/components/pdf/TripPDFDocument.tsx`** (ใหม่)
```tsx
import { Document, Page, Text, View, Image, StyleSheet } from '@react-pdf/renderer';

// โครงสร้าง PDF:
- Header: ชื่อทริป + วันที่ + โลโก้
- Trip Summary: 
  ✓ จำนวนวัน
  ✓ ระยะทางรวม
  ✓ งบประมาณรวม (ถ้ามี)
- Day-by-Day Itinerary:
  ✓ วันที่ + รายการสถานที่
  ✓ แผนที่ thumbnail (optional)
  ✓ เวลาเดินทาง + ระยะทาง
  ✓ รายละเอียดสถานที่ (ที่อยู่, เบอร์โทร)
- Footer: "Created with Tripster" + QR Code ลิงก์กลับมาดูออนไลน์
```

**PDF Styles:**
```typescript
const styles = StyleSheet.create({
  page: { 
    fontFamily: 'Sarabun', 
    padding: 30, 
    fontSize: 12 
  },
  header: { 
    fontSize: 24, 
    fontWeight: 'bold', 
    marginBottom: 20,
    color: '#2563eb' 
  },
  daySection: { 
    marginTop: 15, 
    padding: 10,
    backgroundColor: '#f3f4f6',
    borderRadius: 5
  },
  destination: { 
    marginLeft: 10, 
    marginTop: 5 
  }
});
```

#### 5. Export Button & Logic

**`src/components/ExportPDFButton.tsx`** (ใหม่)
```tsx
import { PDFDownloadLink } from '@react-pdf/renderer';

<PDFDownloadLink 
  document={<TripPDFDocument trip={trip} destinations={destinations} />}
  fileName={`trip-${trip.destination}-${trip.start_date}.pdf`}
>
  {({ loading }) => loading ? 'กำลังสร้าง PDF...' : '📥 Export PDF'}
</PDFDownloadLink>
```

#### 6. PDF Options Dialog (Optional)

**`src/components/ExportOptionsDialog.tsx`** (ใหม่)
```tsx
// ให้ User เลือก:
- ☑️ รวมแผนที่ (Map thumbnail)
- ☑️ รวมรูปภาพสถานที่
- ☑️ แบบสั้น (ชื่อ + เวลา เท่านั้น)
- ☑️ แบบเต็ม (รายละเอียดครบ + รูป)
- ☑️ ภาษา: ไทย / อังกฤษ
```

---

## 🗂️ File Structure (New Files)

```
src/
├── components/
│   ├── ShareTripButton.tsx          (ปุ่ม Share + Dialog)
│   ├── ShareDialog.tsx               (Modal แสดง Link + QR Code)
│   ├── ExportPDFButton.tsx           (ปุ่ม Export)
│   ├── ExportOptionsDialog.tsx       (เลือกตัวเลือก PDF)
│   └── pdf/
│       ├── TripPDFDocument.tsx       (Template หลัก)
│       ├── PDFHeader.tsx             (ส่วนหัว)
│       ├── PDFDaySection.tsx         (แต่ละวัน)
│       └── PDFFooter.tsx             (ส่วนท้าย)
├── pages/
│   └── SharedTrip.tsx                (หน้าแสดง Shared Trip)
├── services/
│   ├── shareService.ts               (Logic การ Share)
│   └── pdfExportService.ts           (Helper functions)
└── public/
    └── fonts/
        ├── Sarabun-Regular.ttf
        └── Sarabun-Bold.ttf
```

---

## 🎨 UI Integration

### ที่ใส่ปุ่ม Share & Export:

#### 1. ใน `TripPlanner.tsx` (หน้าแผนหลัก)
```tsx
<div className="flex gap-2">
  <ShareTripButton tripId={trip.id} />
  <ExportPDFButton trip={trip} destinations={destinations} />
</div>
```

#### 2. ใน `Index.tsx` (My Trips Section)
```tsx
// ที่แต่ละ Trip Card ให้มีเมนู ... (3 dots)
<DropdownMenu>
  <DropdownMenuItem onClick={() => navigateToTrip()}>
    🗺️ เปิดดู
  </DropdownMenuItem>
  <DropdownMenuItem onClick={() => shareTrip()}>
    🔗 แชร์ลิงก์
  </DropdownMenuItem>
  <DropdownMenuItem onClick={() => exportPDF()}>
    📥 Export PDF
  </DropdownMenuItem>
  <DropdownMenuItem onClick={() => deleteTrip()}>
    🗑️ ลบ
  </DropdownMenuItem>
</DropdownMenu>
```

---

## 🔐 Security & Privacy Considerations

### Share Feature:
- ✅ Share Token ควรเป็น UUID หรือ Random String ยาว 32-64 ตัวอักษร (ไม่ให้เดาได้ง่าย)
- ✅ User สามารถ Revoke (ปิด Public) ได้ตลอดเวลา
- ✅ ไม่แชร์ข้อมูลส่วนตัว (Email, User ID) ใน Public View
- ⚠️ พิจารณา: มีอายุ Link หมดอายุหรือไม่ (เช่น 30 วัน)

### Export PDF:
- ✅ Generate PDF ฝั่ง Client (ไม่ส่งข้อมูลไปเซิร์ฟเวอร์)
- ✅ ไม่มีข้อมูลส่วนตัวใน PDF (เว้นแต่ User เลือก)

---

## 📊 Analytics (Optional)

Track:
- จำนวนครั้งที่ Share Link
- จำนวนคนที่เปิด Shared Link
- จำนวน PDF ที่ถูก Export
- Format PDF ที่นิยม (สั้น vs เต็ม)

---

## 🧪 Testing Checklist

### Share Feature:
- [ ] สร้าง Share Link สำเร็จ
- [ ] Copy Link ทำงาน
- [ ] เปิด Shared Link แสดงข้อมูลถูกต้อง (Read-only)
- [ ] Toggle Public/Private ทำงาน
- [ ] RLS Policy ป้องกัน Private Trip
- [ ] QR Code สแกนได้
- [ ] Duplicate Trip ทำงาน

### Export PDF:
- [ ] ฟอนต์ไทยแสดงผลถูกต้อง
- [ ] Layout สวยงาม พิมพ์ได้
- [ ] รูปภาพ Load ครบ
- [ ] แผนที่แสดงผล (ถ้ามี)
- [ ] ดาวน์โหลดไฟล์สำเร็จ
- [ ] รองรับ Multilingual (ไทย/อังกฤษ)
- [ ] Mobile responsive

---

## 🚀 Implementation Steps (Day 1)

### Phase 1: Share Feature (3-4 ชม.)
1. ✅ Database migration (เพิ่มคอลัมน์)
2. ✅ RLS Policies
3. ✅ `shareService.ts` - Logic
4. ✅ `ShareTripButton.tsx` + `ShareDialog.tsx`
5. ✅ `SharedTrip.tsx` - Public View
6. ✅ เพิ่ม Route `/share/:token`
7. ✅ Integration ใน TripPlanner & Index
8. ✅ Test

### Phase 2: Export PDF (3-4 ชม.)
1. ✅ ติดตั้ง `@react-pdf/renderer`
2. ✅ Download Thai Font + Setup
3. ✅ สร้าง PDF Template Components
4. ✅ `ExportPDFButton.tsx`
5. ✅ `ExportOptionsDialog.tsx` (Optional)
6. ✅ Integration ใน UI
7. ✅ Test + Adjust Layout

---

## 💡 Nice-to-Have Features (Future)

### Share:
- 🔗 Custom Short URL (เช่น `tripster.app/t/bangkok-2025`)
- 📱 Social Share Cards (Open Graph meta tags)
- 👥 Collaborative Editing (Share with edit permission)
- 💬 Comments on Shared Trip

### Export:
- 📧 Email PDF ส่งให้เพื่อน
- 🗓️ Export to Google Calendar / iCal
- 🖼️ Export เป็น Image (PNG/JPG) สำหรับโพสต์ Social
- 📊 Export Excel (Budget Breakdown)

---

## 📦 Dependencies to Install

```bash
# PDF Generation
npm install @react-pdf/renderer

# QR Code (for Share Dialog)
npm install qrcode.react

# Copy to Clipboard (ถ้ายังไม่มี)
npm install react-copy-to-clipboard

# Types
npm install -D @types/qrcode.react
```

---

## 🎯 Success Metrics

- ✅ User สามารถ Share Link ได้ภายใน 2 คลิก
- ✅ PDF ดาวน์โหลดได้ภายใน 5 วินาที
- ✅ Shared Link โหลดเร็ว (<2 วินาที)
- ✅ PDF สวยงาม พิมพ์ได้ชัด ฟอนต์ไทยไม่แตก
- ✅ Mobile-friendly (Share & PDF)

---

## 📝 Notes

- **QR Code Library:** ใช้ `qrcode.react` แทน `react-qr-code` (maintainance ดีกว่า)
- **PDF Size:** ถ้ารวมรูปเยอะ ไฟล์จะใหญ่ ต้อง compress รูปก่อน
- **Map Thumbnail:** ใช้ Google Maps Static API (ต้อง API Key) หรือ Export จาก Leaflet
- **SEO for Shared Links:** ต้องทำ Server-Side Rendering (SSR) หรือ Pre-rendering สำหรับ Social Share

---

**สร้างเอกสารโดย:** AI Assistant  
**วันที่:** 25 พฤศจิกายน 2025  
**สำหรับ:** Tripster - Trip Planning App  
**เวอร์ชัน:** 1.0

