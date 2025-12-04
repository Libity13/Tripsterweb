import { useLanguage } from '@/hooks/useLanguage';
import { Link } from 'react-router-dom';
import { ArrowLeft, Trash2, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';

const DataDeletion = () => {
  const { language } = useLanguage();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-red-50">
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
            <Trash2 className="w-8 h-8 text-red-500" />
            <h1 className="text-3xl font-bold text-gray-900">การลบข้อมูลผู้ใช้</h1>
          </div>
          
          <div className="prose prose-slate max-w-none">
            <p className="text-gray-600 mb-6">
              คำแนะนำในการขอลบข้อมูลของคุณจาก Tripster
            </p>

            <h2 className="text-xl font-semibold mt-6 mb-3">วิธีลบข้อมูลของคุณ</h2>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <h3 className="font-semibold text-blue-800 mb-2">วิธีที่ 1: ลบด้วยตนเอง (แนะนำ)</h3>
              <ol className="list-decimal pl-6 text-blue-700 space-y-2">
                <li>เข้าสู่ระบบบัญชี Tripster ของคุณ</li>
                <li>ไปที่หน้า "ทริปของฉัน"</li>
                <li>ลบทริปที่ต้องการทีละรายการ</li>
                <li>ออกจากระบบ</li>
              </ol>
            </div>

            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
              <h3 className="font-semibold text-orange-800 mb-2">วิธีที่ 2: ขอลบข้อมูลผ่านอีเมล</h3>
              <p className="text-orange-700 mb-3">
                ส่งอีเมลไปที่:
              </p>
              <a 
                href="mailto:thanawat.rattanakitt@gmail.com?subject=ขอลบข้อมูลผู้ใช้ Tripster&body=กรุณาลบข้อมูลของฉัน%0A%0Aอีเมลที่ใช้ลงทะเบียน: [ใส่อีเมลของคุณ]"
                className="inline-flex items-center gap-2 bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 transition-colors"
              >
                <Mail className="w-4 h-4" />
                thanawat.rattanakitt@gmail.com
              </a>
              <p className="text-orange-600 text-sm mt-3">
                กรุณาระบุอีเมลที่ใช้ลงทะเบียน เราจะดำเนินการภายใน 30 วัน
              </p>
            </div>

            <h2 className="text-xl font-semibold mt-6 mb-3">ข้อมูลที่จะถูกลบ</h2>
            <ul className="list-disc pl-6 text-gray-700 space-y-2 mb-4">
              <li>ข้อมูลบัญชีผู้ใช้ (ชื่อ, อีเมล, รูปโปรไฟล์)</li>
              <li>แผนการเดินทางทั้งหมด</li>
              <li>สถานที่ที่บันทึกไว้</li>
              <li>ประวัติการสนทนากับ AI</li>
            </ul>

            <h2 className="text-xl font-semibold mt-6 mb-3">ระยะเวลาการดำเนินการ</h2>
            <p className="text-gray-700 mb-4">
              เราจะดำเนินการลบข้อมูลของคุณภายใน 30 วันหลังจากได้รับคำขอ 
              และจะแจ้งยืนยันทางอีเมลเมื่อเสร็จสิ้น
            </p>

            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mt-6">
              <p className="text-gray-600 text-sm">
                <strong>หมายเหตุ:</strong> การลบข้อมูลจะเป็นการถาวรและไม่สามารถกู้คืนได้ 
                กรุณาสำรองข้อมูลที่ต้องการเก็บไว้ก่อนทำการลบ
              </p>
            </div>
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

export default DataDeletion;

