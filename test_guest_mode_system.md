# 🧪 Test Guest Mode System

## ✅ **Migration Status: SUCCESS**
- Database schema created ✅
- RLS policies created ✅
- Indexes created ✅
- Triggers created ✅

## 🧪 **Testing Steps:**

### **1. Test Guest Mode (Anonymous User):**

#### **Step 1.1: Create Guest Trip**
```bash
# เปิด Browser ในโหมด Incognito
# ไปที่ http://localhost:8082
# คลิก "สร้างแผนการเดินทางแบบละเอียด"
```

**Expected Result:**
- ✅ Trip created with `guest_id`
- ✅ No authentication required
- ✅ Can add destinations via AI chat

#### **Step 1.2: Test AI Chat**
```bash
# ในหน้า Chat
# พิมพ์: "ฉันอยากไปเที่ยวเชียงใหม่ 3 วัน"
# คลิก Send
```

**Expected Result:**
- ✅ AI responds in Thai
- ✅ Chat message saved to database
- ✅ Can add destinations to trip

#### **Step 1.3: Test Trip Planner**
```bash
# ไปที่ /trip/demo
# ตรวจสอบ 3 ส่วน: Chat, Itinerary, Map
```

**Expected Result:**
- ✅ Chat panel works
- ✅ Itinerary panel shows destinations
- ✅ Map view displays locations

### **2. Test Auth Mode (Authenticated User):**

#### **Step 2.1: Sign Up/Login**
```bash
# คลิก "เข้าสู่ระบบเพื่อบันทึก"
# สมัครสมาชิกใหม่หรือเข้าสู่ระบบ
```

**Expected Result:**
- ✅ Login modal opens
- ✅ Can sign up with email/password
- ✅ Can sign in with existing account

#### **Step 2.2: Test Migration**
```bash
# หลังจากเข้าสู่ระบบ
# ตรวจสอบว่า Guest trips ถูก migrate
```

**Expected Result:**
- ✅ Guest trips migrated to user_id
- ✅ Data preserved (no data loss)
- ✅ Can access trips from any device

### **3. Test Database Operations:**

#### **Step 3.1: Check Guest Data**
```sql
-- ใน Supabase Dashboard > SQL Editor
SELECT id, user_id, guest_id, title, created_at 
FROM public.trips 
WHERE guest_id IS NOT NULL 
ORDER BY created_at DESC;
```

**Expected Result:**
- ✅ Guest trips visible
- ✅ guest_id populated
- ✅ user_id is NULL

#### **Step 3.2: Check Auth Data**
```sql
-- หลังจาก login
SELECT id, user_id, guest_id, title, created_at 
FROM public.trips 
WHERE user_id IS NOT NULL 
ORDER BY created_at DESC;
```

**Expected Result:**
- ✅ User trips visible
- ✅ user_id populated
- ✅ guest_id is NULL

#### **Step 3.3: Check Chat Messages**
```sql
SELECT trip_id, role, content, created_at 
FROM public.chat_messages 
ORDER BY created_at DESC 
LIMIT 10;
```

**Expected Result:**
- ✅ Chat messages saved
- ✅ Linked to correct trip
- ✅ Role and content preserved

### **4. Test Error Handling:**

#### **Step 4.1: Test Network Errors**
```bash
# เปิด DevTools > Network tab
# จำลอง network error
# ตรวจสอบ error handling
```

**Expected Result:**
- ✅ Error messages displayed
- ✅ System doesn't crash
- ✅ Can retry operations

#### **Step 4.2: Test Database Errors**
```bash
# จำลอง database connection issues
# ตรวจสอบ fallback behavior
```

**Expected Result:**
- ✅ Graceful error handling
- ✅ User-friendly messages
- ✅ System remains stable

## 🎯 **Success Criteria:**

### **✅ Guest Mode:**
- [ ] Can create trips without login
- [ ] Can use AI chat
- [ ] Can add destinations
- [ ] Can drag & drop reorder
- [ ] Data saved with guest_id

### **✅ Auth Mode:**
- [ ] Can sign up/login
- [ ] Guest data migrated successfully
- [ ] Can access trips from any device
- [ ] Can share trips
- [ ] Can export trips

### **✅ Database:**
- [ ] All tables created
- [ ] RLS policies working
- [ ] Data integrity maintained
- [ ] Performance acceptable

## 🚨 **Common Issues & Solutions:**

### **Issue 1: "Cannot create trip"**
**Solution:** Check RLS policies, ensure guest_id is set

### **Issue 2: "AI chat not working"**
**Solution:** Check Edge Functions, verify API keys

### **Issue 3: "Migration failed"**
**Solution:** Check AuthService, verify user_id assignment

### **Issue 4: "Map not loading"**
**Solution:** Check Mapbox token, verify API key

## 📋 **Next Steps After Testing:**

1. **Fix any issues** found during testing
2. **Optimize performance** if needed
3. **Add security** improvements
4. **Prepare for production** deployment
5. **Document user guide** for end users

## 🎉 **System Ready!**

The Guest Mode system is now ready for testing and production use!
