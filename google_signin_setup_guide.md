# 🔐 Google Sign In Setup Guide

## 📋 **สถานะปัจจุบัน:**

### **✅ เสร็จแล้ว:**
1. **ติดตั้ง packages** - `@supabase/auth-ui-react` และ `@supabase/auth-ui-shared`
2. **เพิ่ม Google Sign In** ใน `authService.ts`
3. **เพิ่มปุ่ม Google Sign In** ใน `LoginModal.tsx`
4. **สร้าง Auth Callback page** สำหรับจัดการ OAuth redirect
5. **เพิ่ม route** `/auth/callback` ใน `App.tsx`

### **❌ ยังต้องตั้งค่า:**
1. **Supabase Dashboard** - เปิดใช้งาน Google OAuth
2. **Google Cloud Console** - สร้าง OAuth 2.0 credentials
3. **Environment Variables** - ตั้งค่า Google OAuth credentials

## 🔧 **การตั้งค่า Supabase Dashboard:**

### **1. เปิดใช้งาน Google Provider:**
1. ไปที่ [Supabase Dashboard](https://supabase.com/dashboard)
2. เลือกโปรเจคของคุณ
3. ไปที่ **Authentication** > **Providers**
4. เปิดใช้งาน **Google** provider
5. ตั้งค่า **Site URL**: `http://localhost:5173` (สำหรับ development)
6. ตั้งค่า **Redirect URLs**: `http://localhost:5173/auth/callback`

### **2. ตั้งค่า Google OAuth:**
1. ไปที่ [Google Cloud Console](https://console.cloud.google.com/)
2. สร้างโปรเจคใหม่หรือเลือกโปรเจคที่มีอยู่
3. เปิดใช้งาน **Google+ API** และ **Google Identity API**
4. ไปที่ **Credentials** > **Create Credentials** > **OAuth 2.0 Client IDs**
5. เลือก **Web application**
6. ตั้งค่า **Authorized JavaScript origins**: `http://localhost:5173`
7. ตั้งค่า **Authorized redirect URIs**: `https://your-project.supabase.co/auth/v1/callback`

### **3. คัดลอก Credentials:**
1. คัดลอก **Client ID** และ **Client Secret**
2. ไปที่ Supabase Dashboard > Authentication > Providers > Google
3. ใส่ **Client ID** และ **Client Secret**
4. บันทึกการตั้งค่า

## 🔧 **การตั้งค่า Environment Variables:**

### **1. สร้างไฟล์ `.env.local`:**
```bash
# Supabase
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Google OAuth (ถ้าต้องการใช้ใน frontend)
VITE_GOOGLE_CLIENT_ID=your_google_client_id
```

### **2. อัปเดต `vite.config.ts`:**
```typescript
export default defineConfig({
  plugins: [react()],
  define: {
    global: 'globalThis',
  },
  server: {
    port: 5173,
    host: true
  }
});
```

## 🧪 **การทดสอบ:**

### **1. ทดสอบ Google Sign In:**
1. รันแอป: `npm run dev`
2. ไปที่หน้าใดก็ได้ที่มี Login Modal
3. กดปุ่ม "เข้าสู่ระบบด้วย Google"
4. ตรวจสอบว่า redirect ไป Google OAuth
5. ตรวจสอบว่า redirect กลับมาที่ `/auth/callback`
6. ตรวจสอบว่าเข้าสู่ระบบสำเร็จ

### **2. ทดสอบ Guest Migration:**
1. สร้างทริปในโหมด guest
2. เข้าสู่ระบบด้วย Google
3. ตรวจสอบว่าทริปถูกย้ายมาที่ user account

## 🔍 **Debug Tips:**

### **1. ตรวจสอบ Console Logs:**
- ดู error messages ใน browser console
- ตรวจสอบ network requests
- ดู Supabase logs ใน dashboard

### **2. ตรวจสอบ Supabase Dashboard:**
- ไปที่ **Authentication** > **Users**
- ตรวจสอบว่ามี user ใหม่ถูกสร้าง
- ตรวจสอบ **Authentication** > **Logs**

### **3. ตรวจสอบ Google Cloud Console:**
- ไปที่ **APIs & Services** > **Credentials**
- ตรวจสอบ OAuth 2.0 Client ID
- ดู **APIs & Services** > **OAuth consent screen**

## 🚨 **ปัญหาที่อาจเกิดขึ้น:**

### **1. Redirect URI Mismatch:**
- **ปัญหา:** Google OAuth redirect URI ไม่ตรงกัน
- **แก้ไข:** ตรวจสอบ redirect URIs ใน Google Cloud Console

### **2. CORS Error:**
- **ปัญหา:** CORS policy block requests
- **แก้ไข:** ตรวจสอบ Site URL ใน Supabase Dashboard

### **3. Invalid Client ID:**
- **ปัญหา:** Google Client ID ไม่ถูกต้อง
- **แก้ไข:** ตรวจสอบ Client ID ใน Supabase Dashboard

## 🎯 **การปรับปรุงเพิ่มเติม:**

### **1. เพิ่ม Social Providers อื่น:**
- Facebook
- GitHub
- Apple

### **2. เพิ่ม User Profile Management:**
- แก้ไขข้อมูลส่วนตัว
- อัปโหลดรูปโปรไฟล์
- เปลี่ยนรหัสผ่าน

### **3. เพิ่ม Advanced Features:**
- Remember me
- Two-factor authentication
- Social login with custom scopes

## 💡 **ตัวอย่างการใช้งาน:**

### **1. Google Sign In:**
```typescript
// ใน LoginModal.tsx
const handleGoogleSignIn = async () => {
  try {
    await authService.signInWithGoogle();
  } catch (error) {
    toast.error('Google Sign In ไม่สำเร็จ');
  }
};
```

### **2. Auth Callback:**
```typescript
// ใน AuthCallback.tsx
useEffect(() => {
  const handleAuthCallback = async () => {
    const { data, error } = await supabase.auth.getSession();
    if (data.session?.user) {
      // Migrate guest trips
      await authService.migrateGuestTrips(guestId, data.session.user.id);
    }
  };
  handleAuthCallback();
}, []);
```

ตอนนี้ระบบพร้อมรองรับ Google Sign In แล้ว! 🚀
