import { useState, useEffect, createContext, useContext } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';

export type Language = 'th' | 'en';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// Translation keys
const translations = {
  th: {
    'app.title': 'Tripster',
    'app.subtitle': 'ผู้ช่วยวางแผนทริปอัจฉริยะ',
    'chat.placeholder': 'บอกผมว่าคุณอยากไปที่ไหน...',
    'chat.send': 'ส่ง',
    'chat.thinking': 'กำลังคิด...',
    'language.switch': 'เปลี่ยนภาษา',
    'language.thai': 'ไทย',
    'language.english': 'English',
    'features.search': 'ค้นหาสถานที่',
    'features.recommend': 'แนะนำสถานที่',
    'features.plan': 'วางแผนทริป',
    'error.network': 'เกิดข้อผิดพลาดในการเชื่อมต่อ',
    'error.ai': 'ระบบ AI ขัดข้องชั่วคราว',
    'success.saved': 'บันทึกเรียบร้อยแล้ว',
    'success.shared': 'แชร์เรียบร้อยแล้ว',
    'hero.description': 'บอกความชอบและงบประมาณ เราจะวางแผนการเดินทางที่สมบูรณ์แบบให้คุณ',
    'hero.start': 'เริ่มวางแผน',
    'auth.login': 'เข้าสู่ระบบ',
    'auth.logout': 'ออกจากระบบ',
    'chat.aiTitle': 'ผู้ช่วยวางแผนทริป AI',
    'chat.aiSubtitle': 'บอกฉันว่าคุณอยากไปที่ไหน แล้วฉันจะช่วยวางแผนให้เอง',
    'hero.cta': 'พร้อมเริ่มการผจญภัยของคุณแล้วหรือยัง?',
    'hero.ctaButton': 'เริ่มวางแผนเลย',
    'chat.viewTrip': 'ดูแผนการเดินทาง',
    'chat.status.analyzing': 'AI กำลังวิเคราะห์...',
    'chat.status.creating': 'AI กำลังสร้างทริป...',
    'chat.status.adding': 'AI กำลังเพิ่มสถานที่...',
    'chat.status.processing': 'AI กำลังประมวลผล...',
    'chat.status.completed': 'AI เสร็จสิ้น!',
    'chat.status.idle': 'AI กำลังวางแผน...',
    'chat.empty.heading': 'สวัสดี! 👋',
    'chat.empty.description': 'ผมคือ AI Travel Assistant ที่จะช่วยวางแผนการเดินทางให้คุณ',
    'chat.empty.tip': '💡 เคล็ดลับ: ตอบคำถาม AI ให้ครบถ้วน เพื่อให้ได้แผนการเดินทางที่สมบูรณ์',
    'chat.empty.sampleLabel': 'ลองถามผมดู เช่น:',
    'chat.empty.sample1': 'ฉันอยากไปเที่ยวกรุงเทพ 3 วัน',
    'chat.empty.sample1Short': 'เที่ยวกรุงเทพ 3 วัน',
    'chat.empty.sample2': 'แนะนำสถานที่เที่ยวในเชียงใหม่',
    'chat.empty.sample2Short': 'เที่ยวเชียงใหม่',
    'chat.empty.sample3': 'วางแผนเที่ยวญี่ปุ่น',
    'chat.empty.sample3Short': 'เที่ยวญี่ปุ่น',
    'chat.recommendations.title': 'คำแนะนำสถานที่:',
    'quickActions.findPlaces': 'หาสถานที่ท่องเที่ยว',
    'quickActions.planTrip': 'วางแผนการเดินทาง',
    'quickActions.beachTrip': 'ท่องเที่ยวชายหาด',
    'quickActions.mountainAdventure': 'ผจญภัยภูเขา',
    'examplePrompts.title': 'ตัวอย่างคำถาม',
    'examplePrompts.bangkokChiangMai': 'วางแผน 7 วันในกรุงเทพและเชียงใหม่',
    'examplePrompts.phuketBudget': 'แนะนำการเดินทางงบประหยัดที่ภูเก็ต',
    'examplePrompts.japanRomantic': 'เที่ยวโรแมนติก 5 วันที่ญี่ปุ่น',
    'examplePrompts.koreaFamily': 'ท่องเที่ยวครอบครัวที่เกาหลีใต้',
    'stats.trips': 'แผนการเดินทาง',
    'stats.users': 'ผู้ใช้งาน',
    'stats.reviews': 'คะแนนรีวิว',
    'stats.provinces': 'จังหวัดทั่วไทย',
    'stats.speed': 'วางแผนรวดเร็ว',
    'stats.custom': 'ปรับแต่งได้อิสระ',
    'myTrips.sectionTitle': 'แผนการเดินทางของฉัน',
    'myTrips.sectionSubtitle': 'แผนการเดินทางที่คุณเคยสร้างและบันทึกไว้',
    'myTrips.greeting': 'สวัสดี',
    'myTrips.loading': 'กำลังโหลดแผนการเดินทาง...',
    'myTrips.emptyTitle': 'ยังไม่มีแผนการเดินทาง',
    'myTrips.emptyDescription': 'เริ่มสร้างแผนการเดินทางแรกของคุณ!',
    'myTrips.createFirst': 'สร้างแผนแรก',
    'myTrips.status.hasPlaces': 'มีสถานที่',
    'myTrips.status.empty': 'ว่างเปล่า',
    'myTrips.viewDetails': 'ดูรายละเอียด',
    'myTrips.createNew': 'สร้างแผนใหม่',
    'features.title': 'คุณสามารถถามอะไรก็ได้',
    'features.subtitle': 'AI ของเราพร้อมช่วยวางแผนทุกแง่มุมของการเดินทาง',
    'features.card.inspiration.title': 'แรงบันดาลใจ',
    'features.card.inspiration.description': 'ค้นหาสถานที่ท่องเที่ยวที่ซ่อนอยู่และไม่เหมือนใคร',
    'features.card.flight.title': 'ตั้งเที่ยวบิน',
    'features.card.flight.description': 'ค้นหาตั๋วเครื่องบินราคาดีที่สุด',
    'features.card.lodging.title': 'ที่พัก',
    'features.card.lodging.description': 'แนะนำโรงแรมและที่พักที่เหมาะกับคุณ',
    'features.card.itinerary.title': 'แผนการเดินทาง',
    'features.card.itinerary.description': 'วางแผนทริปละเอียดพร้อมกิจกรรมและร้านอาหาร',
    'footer.text': '© 2025 Tripster. ขับเคลื่อนด้วย AI เพื่อประสบการณ์การท่องเที่ยวที่ดีที่สุด',
    'chat.aiThinking': 'AI กำลังคิด...',
    'suggestedPlaces.title': 'สถานที่แนะนำ',
    'suggestedPlaces.type.restaurant': '🍽️ ร้านอาหาร',
    'suggestedPlaces.type.lodging': '🏨 ที่พัก',
    'suggestedPlaces.type.attraction': '🏛️ ที่เที่ยว',
    'suggestedPlaces.add': 'เพิ่ม',
    'suggestedPlaces.addWithPlus': '+ เพิ่ม',
    'loginPrompt.title': '🎉 แผนการเดินทางพร้อมแล้ว!',
    'loginPrompt.description': 'เพื่อบันทึกแผนการเดินทางของคุณ ผมแนะนำให้เข้าสู่ระบบก่อน',
    'loginPrompt.benefits': 'จะได้:',
    'loginPrompt.benefit.save': '✅ บันทึกแผนไว้ดูใหม่ได้',
    'loginPrompt.benefit.share': '✅ แชร์กับเพื่อน/ครอบครัว',
    'loginPrompt.benefit.export': '✅ ส่งออกเป็น PDF',
    'loginPrompt.benefit.remember': '✅ AI จำความชอบของคุณ',
    'loginPrompt.login': 'เข้าสู่ระบบ',
    'loginPrompt.skip': 'ข้าม - ดูแผนต่อ',
    'auth.loginHeading': 'เข้าสู่ระบบ',
    'auth.email': 'อีเมล',
    'auth.password': 'รหัสผ่าน',
    'auth.emailPlaceholder': 'your@email.com',
    'auth.passwordPlaceholder': 'รหัสผ่านของคุณ',
    'auth.cancel': 'ยกเลิก',
    'chat.reviews': 'รีวิว',
    'chat.open.now': '🟢 เปิดอยู่',
    'chat.open.closed': '🔴 ปิดแล้ว',
    'chat.website': 'เว็บไซต์ →',
    'common.add': 'เพิ่ม',
    'common.skip': 'ข้าม',
    'common.cancel': 'ยกเลิก',
    // Dialog & Modal Translations
    'dialog.locationChange.title': 'ตรวจพบการเปลี่ยนปลายทาง',
    'dialog.locationChange.description': 'คุณต้องการจัดการทริปอย่างไร?',
    'dialog.locationChange.from': 'จาก:',
    'dialog.locationChange.to': 'ไป:',
    'dialog.locationChange.newTrip': 'สร้างทริปใหม่',
    'dialog.locationChange.newTripDesc': 'ลบข้อมูลเก่าทั้งหมด เริ่มวางแผนทริปใหม่สำหรับ',
    'dialog.locationChange.addLocation': 'เพิ่มจังหวัดในทริปเดิม',
    'dialog.locationChange.addLocationDesc': 'เก็บข้อมูลเดิมไว้ เพิ่มจังหวัดใหม่ต่อจากทริปเดิม',
    'dialog.locationChange.undo': 'ย้อนกลับ',
    'dialog.locationChange.confirm': 'ตกลง',
    'dialog.locationChange.recommend': 'แนะนำ',
    'dialog.locationChange.multiDest': 'Multi-destination',
    'modal.placeResolve.title': 'กำลังค้นหาพิกัดสถานที่',
    'modal.placeResolve.description': 'กรุณารอสักครู่ ระบบกำลังค้นหาพิกัดสถานที่ท่องเที่ยวจาก Google Maps',
    'modal.placeResolve.progress': 'สถานที่',
    'modal.placeResolve.searching': 'กำลังค้นหาจาก Google Maps...',
    'modal.placeResolve.success': 'สำเร็จ',
    'modal.placeResolve.failed': 'ไม่พบ',
    'modal.placeResolve.failedList': '⚠️ ไม่พบพิกัด',
    'modal.placeResolve.steps': 'ขั้นตอน:',
    'modal.placeResolve.step1': 'ลบสถานที่เดิม',
    'modal.placeResolve.step2': 'ค้นหาพิกัดจาก Google Maps',
    'modal.placeResolve.step3': 'เพิ่มสถานที่ใหม่เข้าทริป',
    'dialog.daySelection.title': 'เลือกวันที่ต้องการเพิ่ม',
    'dialog.daySelection.description': 'เลือกวันที่คุณต้องการเพิ่ม',
    'dialog.daySelection.intoPlan': 'เข้าไปในแผนการเที่ยว',
    'dialog.daySelection.day': 'วันที่',
    'dialog.daySelection.recommend': 'แนะนำ',
    'dialog.daySelection.reason': 'เหตุผล:',
    // Login Modal Translations
    'loginModal.title': 'เข้าสู่ระบบเพื่อบันทึกแผนการเดินทาง',
    'loginModal.close': 'ปิด',
    'loginModal.tabSignIn': 'เข้าสู่ระบบ',
    'loginModal.tabSignUp': 'สมัครสมาชิก',
    'loginModal.email': 'อีเมล',
    'loginModal.password': 'รหัสผ่าน',
    'loginModal.passwordPlaceholder': 'รหัสผ่านของคุณ',
    'loginModal.displayName': 'ชื่อแสดง',
    'loginModal.displayNamePlaceholder': 'ชื่อของคุณ',
    'loginModal.signInButton': 'เข้าสู่ระบบ',
    'loginModal.signInLoading': 'กำลังเข้าสู่ระบบ...',
    'loginModal.signUpButton': 'สมัครสมาชิก',
    'loginModal.signUpLoading': 'กำลังสมัครสมาชิก...',
    'loginModal.or': 'หรือ',
    'loginModal.googleSignIn': 'เข้าสู่ระบบด้วย Google',
    'loginModal.googleSignUp': 'สมัครสมาชิกด้วย Google',
    'loginModal.confirmEmail': 'กรุณายืนยันอีเมลก่อนเข้าสู่ระบบ',
    'loginModal.resendConfirmation': 'ส่งอีเมลยืนยันใหม่',
    'loginModal.resendLoading': 'กำลังส่ง...',
    'loginModal.migrationNotice': 'แผนการเดินทางของคุณจะถูกย้ายมา',
    'loginModal.migrationDetail': 'ไม่ต้องกังวล แผนที่สร้างไว้จะไม่หายไป',
    'loginModal.skip': 'ข้าม',
    'loginModal.refresh': 'รีเฟรช',
    'loginModal.successSignIn': 'เข้าสู่ระบบสำเร็จ! แผนการเดินทางของคุณถูกย้ายมาแล้ว',
    'loginModal.successSignUp': 'สมัครสมาชิกสำเร็จ! แผนการเดินทางของคุณถูกย้ายมาแล้ว',
    'loginModal.errorSignIn': 'เข้าสู่ระบบไม่สำเร็จ กรุณาลองใหม่',
    'loginModal.errorSignUp': 'สมัครสมาชิกไม่สำเร็จ กรุณาลองใหม่',
    'loginModal.errorGoogle': 'Google Sign In ไม่สำเร็จ',
    'loginModal.errorResend': 'ส่งอีเมลยืนยันไม่สำเร็จ',
    'loginModal.successResend': 'ส่งอีเมลยืนยันใหม่แล้ว กรุณาตรวจสอบอีเมลของคุณ',
  },
  en: {
    'app.title': 'Tripster',
    'app.subtitle': 'Your Intelligent Travel Planning Assistant',
    'chat.placeholder': 'Tell me where you want to go...',
    'chat.send': 'Send',
    'chat.thinking': 'Thinking...',
    'language.switch': 'Switch Language',
    'language.thai': 'ไทย',
    'language.english': 'English',
    'features.search': 'Search Places',
    'features.recommend': 'Recommend Places',
    'features.plan': 'Plan Trip',
    'error.network': 'Network connection error',
    'error.ai': 'AI system temporarily down',
    'success.saved': 'Saved successfully',
    'success.shared': 'Shared successfully',
    'hero.description': 'Tell me your preferences and budget, I will craft the perfect trip for you.',
    'hero.start': 'Start planning',
    'auth.login': 'Log in',
    'auth.logout': 'Log out',
    'chat.aiTitle': 'AI Travel Assistant',
    'chat.aiSubtitle': "Tell me where you'd like to go and I'll plan it for you!",
    'hero.cta': 'Ready to start your next adventure?',
    'hero.ctaButton': "Let's plan now",
    'chat.viewTrip': 'View itinerary',
    'chat.status.analyzing': 'AI is analyzing...',
    'chat.status.creating': 'AI is building your trip...',
    'chat.status.adding': 'AI is adding destinations...',
    'chat.status.processing': 'AI is processing...',
    'chat.status.completed': 'AI is done!',
    'chat.status.idle': 'AI is planning...',
    'chat.empty.heading': 'Hello! 👋',
    'chat.empty.description': "I'm an AI travel assistant who will plan trips for you.",
    'chat.empty.tip': '💡 Tip: answer AI questions clearly to get the best plan.',
    'chat.empty.sampleLabel': 'Try asking me things like:',
    'chat.empty.sample1': 'I want to visit Bangkok for 3 days',
    'chat.empty.sample1Short': 'Bangkok 3-day trip',
    'chat.empty.sample2': 'Recommend places in Chiang Mai',
    'chat.empty.sample2Short': 'Chiang Mai trip',
    'chat.empty.sample3': 'Plan a trip to Japan',
    'chat.empty.sample3Short': 'Japan trip',
    'chat.recommendations.title': 'Suggested places:',
    'quickActions.findPlaces': 'Find attractions',
    'quickActions.planTrip': 'Plan a trip',
    'quickActions.beachTrip': 'Beach getaway',
    'quickActions.mountainAdventure': 'Mountain adventure',
    'examplePrompts.title': 'Sample prompts',
    'examplePrompts.bangkokChiangMai': 'Plan 7 days in Bangkok and Chiang Mai',
    'examplePrompts.phuketBudget': 'Recommend a budget trip in Phuket',
    'examplePrompts.japanRomantic': 'Romantic 5-day trip in Japan',
    'examplePrompts.koreaFamily': 'Family vacation in South Korea',
    'stats.trips': 'Trip plans',
    'stats.users': 'Travelers',
    'stats.reviews': 'Review score',
    'stats.provinces': 'Provinces Covered',
    'stats.speed': 'Fast Planning',
    'stats.custom': 'Fully Customizable',
    'myTrips.sectionTitle': 'My trips',
    'myTrips.sectionSubtitle': 'Trips you have created and saved',
    'myTrips.greeting': 'Hello',
    'myTrips.loading': 'Loading your trips...',
    'myTrips.emptyTitle': 'No trips yet',
    'myTrips.emptyDescription': 'Start by creating your first itinerary!',
    'myTrips.createFirst': 'Create first trip',
    'myTrips.status.hasPlaces': 'Has places',
    'myTrips.status.empty': 'Empty',
    'myTrips.viewDetails': 'View details',
    'myTrips.createNew': 'Create new trip',
    'features.title': 'Ask me anything',
    'features.subtitle': 'Our AI can plan every aspect of your journey',
    'features.card.inspiration.title': 'Inspiration',
    'features.card.inspiration.description': 'Discover hidden and unique destinations',
    'features.card.flight.title': 'Flights',
    'features.card.flight.description': 'Find the best airfare deals',
    'features.card.lodging.title': 'Lodging',
    'features.card.lodging.description': 'Get hotels that match your style',
    'features.card.itinerary.title': 'Itinerary',
    'features.card.itinerary.description': 'Detailed plans with activities and dining',
    'footer.text': '© 2025 Tripster. Powered by AI for the best travel experience.',
    'chat.aiThinking': 'AI is thinking...',
    'suggestedPlaces.title': 'Suggested places',
    'suggestedPlaces.type.restaurant': '🍽️ Restaurant',
    'suggestedPlaces.type.lodging': '🏨 Lodging',
    'suggestedPlaces.type.attraction': '🏛️ Attraction',
    'suggestedPlaces.add': 'Add',
    'suggestedPlaces.addWithPlus': '+ Add',
    'loginPrompt.title': '🎉 Your trip is ready!',
    'loginPrompt.description': 'Sign in to save this itinerary to your account.',
    'loginPrompt.benefits': 'You will be able to:',
    'loginPrompt.benefit.save': '✅ Save and revisit your plan',
    'loginPrompt.benefit.share': '✅ Share with friends & family',
    'loginPrompt.benefit.export': '✅ Export as PDF',
    'loginPrompt.benefit.remember': '✅ Let AI remember your preferences',
    'loginPrompt.login': 'Sign in',
    'loginPrompt.skip': 'Skip - continue viewing',
    'auth.loginHeading': 'Sign in',
    'auth.email': 'Email',
    'auth.password': 'Password',
    'auth.emailPlaceholder': 'you@email.com',
    'auth.passwordPlaceholder': 'Your password',
    'auth.cancel': 'Cancel',
    'chat.reviews': 'reviews',
    'chat.open.now': '🟢 Open now',
    'chat.open.closed': '🔴 Closed',
    'chat.website': 'Website →',
    'common.add': 'Add',
    'common.skip': 'Skip',
    'common.cancel': 'Cancel',
    // Dialog & Modal Translations
    'dialog.locationChange.title': 'Location Change Detected',
    'dialog.locationChange.description': 'How would you like to handle this trip?',
    'dialog.locationChange.from': 'From:',
    'dialog.locationChange.to': 'To:',
    'dialog.locationChange.newTrip': 'Create New Trip',
    'dialog.locationChange.newTripDesc': 'Clear all old data and start a new trip for',
    'dialog.locationChange.addLocation': 'Add to Existing Trip',
    'dialog.locationChange.addLocationDesc': 'Keep existing data and add new destination',
    'dialog.locationChange.undo': 'Undo',
    'dialog.locationChange.confirm': 'Confirm',
    'dialog.locationChange.recommend': 'Recommended',
    'dialog.locationChange.multiDest': 'Multi-destination',
    'modal.placeResolve.title': 'Resolving Locations',
    'modal.placeResolve.description': 'Please wait while we find coordinates from Google Maps',
    'modal.placeResolve.progress': 'places',
    'modal.placeResolve.searching': 'Searching Google Maps...',
    'modal.placeResolve.success': 'Success',
    'modal.placeResolve.failed': 'Failed',
    'modal.placeResolve.failedList': '⚠️ Coordinates not found',
    'modal.placeResolve.steps': 'Steps:',
    'modal.placeResolve.step1': 'Remove old places',
    'modal.placeResolve.step2': 'Search coordinates',
    'modal.placeResolve.step3': 'Add new places',
    'dialog.daySelection.title': 'Select Day',
    'dialog.daySelection.description': 'Select which day you want to add',
    'dialog.daySelection.intoPlan': 'to your itinerary',
    'dialog.daySelection.day': 'Day',
    'dialog.daySelection.recommend': 'Recommended',
    'dialog.daySelection.reason': 'Reason:',
    // Login Modal Translations
    'loginModal.title': 'Sign in to save your trip',
    'loginModal.close': 'Close',
    'loginModal.tabSignIn': 'Sign In',
    'loginModal.tabSignUp': 'Sign Up',
    'loginModal.email': 'Email',
    'loginModal.password': 'Password',
    'loginModal.passwordPlaceholder': 'Your password',
    'loginModal.displayName': 'Display Name',
    'loginModal.displayNamePlaceholder': 'Your name',
    'loginModal.signInButton': 'Sign In',
    'loginModal.signInLoading': 'Signing in...',
    'loginModal.signUpButton': 'Sign Up',
    'loginModal.signUpLoading': 'Signing up...',
    'loginModal.or': 'or',
    'loginModal.googleSignIn': 'Sign in with Google',
    'loginModal.googleSignUp': 'Sign up with Google',
    'loginModal.confirmEmail': 'Please verify your email before signing in',
    'loginModal.resendConfirmation': 'Resend verification email',
    'loginModal.resendLoading': 'Sending...',
    'loginModal.migrationNotice': 'Your trips will be migrated',
    'loginModal.migrationDetail': "Don't worry, your existing plans will be preserved",
    'loginModal.skip': 'Skip',
    'loginModal.refresh': 'Refresh',
    'loginModal.successSignIn': 'Signed in successfully! Your trips have been migrated.',
    'loginModal.successSignUp': 'Signed up successfully! Your trips have been migrated.',
    'loginModal.errorSignIn': 'Sign in failed. Please try again.',
    'loginModal.errorSignUp': 'Sign up failed. Please try again.',
    'loginModal.errorGoogle': 'Google Sign In failed',
    'loginModal.errorResend': 'Failed to resend verification email',
    'loginModal.successResend': 'Verification email sent! Please check your inbox.',
  }
};

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [language, setLanguage] = useState<Language>('th');

  // Sync language state with URL
  useEffect(() => {
    const pathLang = location.pathname.split('/')[1] as Language;
    if (pathLang === 'th' || pathLang === 'en') {
      setLanguage(pathLang);
    }
  }, [location.pathname]);

  // Change language and update URL
  const handleSetLanguage = (newLang: Language) => {
    if (language === newLang) return;

    const currentPath = location.pathname;
    let newPath = currentPath;

    // Replace existing language prefix if present
    if (currentPath.match(/^\/(th|en)/)) {
      newPath = currentPath.replace(/^\/(th|en)/, `/${newLang}`);
    } else if (currentPath === '/') {
      // If root, just append language
      newPath = `/${newLang}`;
    } else {
      // If no language prefix (e.g. /some-page), prepend it
      // Note: This case should be rare if everything is redirected properly
      newPath = `/${newLang}${currentPath.startsWith('/') ? currentPath : '/' + currentPath}`;
    }
    
    navigate(newPath);
    setLanguage(newLang);
    localStorage.setItem('travelmate-language', newLang);
  };

  // Translation function
  const t = (key: string): string => {
    // @ts-ignore
    return translations[language][key as keyof typeof translations[typeof language]] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage: handleSetLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}

/**
 * Detect language from text automatically
 * @param text - Text to detect language from
 * @returns 'th' if Thai detected, 'en' otherwise
 */
export function detectLanguage(text: string): Language {
  // Check for Thai characters (Unicode range: U+0E00 to U+0E7F)
  const thaiPattern = /[\u0E00-\u0E7F]/;
  const hasThai = thaiPattern.test(text);
  
  // If text contains Thai characters, consider it Thai
  if (hasThai) {
    return 'th';
  }
  
  // Otherwise, default to English
  return 'en';
}

/**
 * Get language-specific greeting
 * @param language - Language code
 * @returns Greeting message
 */
export function getGreeting(language: Language): string {
  return language === 'th' 
    ? 'สวัสดีครับ! มีอะไรให้ช่วยไหมครับ?'
    : 'Hello! How can I help you today?';
}

// Language switcher component
export function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);

  const flags = {
    th: 'https://flagcdn.com/w40/th.png',
    en: 'https://flagcdn.com/w40/us.png'
  };

  const labels = {
    th: 'ไทย',
    en: 'English'
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="w-10 h-6 rounded-md overflow-hidden border border-white/20 hover:opacity-80 transition-opacity shadow-sm focus:outline-none focus:ring-2 focus:ring-white/50"
        title={language === 'th' ? 'เปลี่ยนภาษา' : 'Switch Language'}
      >
        <img 
          src={flags[language]} 
          alt={language} 
          className="w-full h-full object-cover"
        />
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center animate-in fade-in duration-200">
          <div 
            className="bg-white dark:bg-gray-900 rounded-xl p-6 w-full max-w-sm shadow-2xl scale-100 animate-in zoom-in-95 duration-200 border border-gray-100 dark:border-gray-800"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold mb-4 text-gray-900 dark:text-white text-center">
              {language === 'th' ? 'เลือกภาษา' : 'Select Language'}
            </h3>
            
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => {
                  setLanguage('th');
                  setIsOpen(false);
                }}
                className={`flex flex-col items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                  language === 'th'
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 ring-2 ring-blue-200 dark:ring-blue-800'
                    : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
              >
                <div className="w-16 h-10 rounded shadow-sm overflow-hidden relative">
                   <img src={flags.th} alt="Thai" className="w-full h-full object-cover" />
                   {language === 'th' && (
                     <div className="absolute inset-0 bg-blue-500/20 flex items-center justify-center">
                       <div className="bg-white rounded-full p-0.5">
                         <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                         </svg>
                       </div>
                     </div>
                   )}
                </div>
                <span className={`font-medium ${language === 'th' ? 'text-blue-700 dark:text-blue-300' : 'text-gray-700 dark:text-gray-300'}`}>
                  {labels.th}
                </span>
              </button>

              <button
                onClick={() => {
                  setLanguage('en');
                  setIsOpen(false);
                }}
                className={`flex flex-col items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                  language === 'en'
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 ring-2 ring-blue-200 dark:ring-blue-800'
                    : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
              >
                <div className="w-16 h-10 rounded shadow-sm overflow-hidden relative">
                   <img src={flags.en} alt="English" className="w-full h-full object-cover" />
                   {language === 'en' && (
                     <div className="absolute inset-0 bg-blue-500/20 flex items-center justify-center">
                       <div className="bg-white rounded-full p-0.5">
                         <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                         </svg>
                       </div>
                     </div>
                   )}
                </div>
                <span className={`font-medium ${language === 'en' ? 'text-blue-700 dark:text-blue-300' : 'text-gray-700 dark:text-gray-300'}`}>
                  {labels.en}
                </span>
              </button>
            </div>

            <button
              onClick={() => setIsOpen(false)}
              className="w-full mt-6 py-2.5 text-sm font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              {language === 'th' ? 'ปิด' : 'Close'}
            </button>
          </div>
        </div>
      )}
    </>
  );
}

// Helper Link component that preserves language
export const NavLink = ({ to, children, className, ...props }: React.ComponentProps<typeof Link>) => {
  const { language } = useLanguage();
  
  // If link is external or already has language, might need care, but assuming internal relative links
  // Handle case where 'to' might already include lang or be absolute?
  // For now, simple implementation as requested:
  
  let path = to.toString();
  if (path.startsWith('/') && !path.startsWith('/th') && !path.startsWith('/en')) {
     path = `/${language}${path}`;
  } else if (!path.startsWith('/')) {
     // Relative path, might be tricky if we are already at /th/something
     // But typically links are absolute from root in React apps (e.g. /about)
     path = `/${language}/${path}`;
  }

  return <Link to={path} className={className} {...props}>{children}</Link>;
};
