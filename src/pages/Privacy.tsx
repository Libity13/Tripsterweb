import { useLanguage } from '@/hooks/useLanguage';
import { Link } from 'react-router-dom';
import { ArrowLeft, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';

const Privacy = () => {
  const { language } = useLanguage();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <Link to={`/${language}`} className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
            <ArrowLeft className="w-5 h-5" />
            <span>กลับหน้าหลัก</span>
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <div className="flex items-center gap-3 mb-6">
            <Shield className="w-8 h-8 text-blue-500" />
            <h1 className="text-3xl font-bold text-gray-900">นโยบายความเป็นส่วนตัว</h1>
          </div>
          
          <div className="prose prose-slate max-w-none">
            <p className="text-gray-600 mb-6">
              อัปเดตล่าสุด: {new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>

            <h2 className="text-xl font-semibold mt-6 mb-3">1. ข้อมูลที่เราเก็บรวบรวม</h2>
            <p className="text-gray-700 mb-4">
              Tripster เก็บรวบรวมข้อมูลต่อไปนี้เมื่อคุณใช้บริการของเรา:
            </p>
            <ul className="list-disc pl-6 text-gray-700 space-y-2 mb-4">
              <li>ข้อมูลบัญชี: อีเมล, ชื่อ, รูปโปรไฟล์ (เมื่อเข้าสู่ระบบด้วย Google หรือ Facebook)</li>
              <li>ข้อมูลการวางแผนทริป: สถานที่, วันที่, หมายเหตุส่วนตัว</li>
              <li>ข้อมูลการสนทนากับ AI</li>
            </ul>

            <h2 className="text-xl font-semibold mt-6 mb-3">2. วิธีการใช้ข้อมูล</h2>
            <p className="text-gray-700 mb-4">
              เราใช้ข้อมูลของคุณเพื่อ:
            </p>
            <ul className="list-disc pl-6 text-gray-700 space-y-2 mb-4">
              <li>ให้บริการวางแผนการท่องเที่ยว</li>
              <li>บันทึกและซิงค์แผนการเดินทางของคุณ</li>
              <li>ปรับปรุงประสบการณ์การใช้งาน</li>
            </ul>

            <h2 className="text-xl font-semibold mt-6 mb-3">3. การแชร์ข้อมูล</h2>
            <p className="text-gray-700 mb-4">
              เราไม่ขายหรือแชร์ข้อมูลส่วนตัวของคุณกับบุคคลที่สาม ยกเว้น:
            </p>
            <ul className="list-disc pl-6 text-gray-700 space-y-2 mb-4">
              <li>เมื่อคุณเลือกแชร์แผนการเดินทางด้วยตนเอง</li>
              <li>เมื่อกฎหมายกำหนด</li>
            </ul>

            <h2 className="text-xl font-semibold mt-6 mb-3">4. ความปลอดภัยของข้อมูล</h2>
            <p className="text-gray-700 mb-4">
              เราใช้มาตรการรักษาความปลอดภัยที่เหมาะสมเพื่อปกป้องข้อมูลของคุณ รวมถึงการเข้ารหัสและการจัดเก็บข้อมูลอย่างปลอดภัย
            </p>

            <h2 className="text-xl font-semibold mt-6 mb-3">5. สิทธิ์ของคุณ</h2>
            <p className="text-gray-700 mb-4">
              คุณมีสิทธิ์:
            </p>
            <ul className="list-disc pl-6 text-gray-700 space-y-2 mb-4">
              <li>เข้าถึงข้อมูลของคุณ</li>
              <li>แก้ไขข้อมูลของคุณ</li>
              <li>ลบบัญชีและข้อมูลของคุณ</li>
            </ul>

            <h2 className="text-xl font-semibold mt-6 mb-3">6. การติดต่อ</h2>
            <p className="text-gray-700 mb-4">
              หากมีคำถามเกี่ยวกับนโยบายความเป็นส่วนตัว กรุณาติดต่อ: thanawat.rattanakitt@gmail.com
            </p>
          </div>

          <div className="mt-8 pt-6 border-t">
            <Link to={`/${language}`}>
              <Button variant="outline">
                <ArrowLeft className="w-4 h-4 mr-2" />
                กลับหน้าหลัก
              </Button>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Privacy;

