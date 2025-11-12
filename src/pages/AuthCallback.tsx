// Auth Callback - Handle OAuth redirects
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/unifiedSupabaseClient';
import { authService } from '@/services/authService';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';

const AuthCallback = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('กำลังเข้าสู่ระบบ...');

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Get the session from URL hash
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          throw error;
        }

        if (data.session?.user) {
          // Migrate guest trips to authenticated user
          const guestId = authService.getGuestId();
          if (guestId) {
            await authService.migrateGuestTrips(guestId, data.session.user.id);
            authService.clearGuestId();
          }
          
          setStatus('success');
          setMessage('เข้าสู่ระบบสำเร็จ! แผนการเดินทางของคุณถูกย้ายมาแล้ว');
          
          // Redirect to home page after 2 seconds
          setTimeout(() => {
            navigate('/');
          }, 2000);
        } else {
          throw new Error('ไม่พบข้อมูลผู้ใช้');
        }
      } catch (error) {
        console.error('Auth callback error:', error);
        setStatus('error');
        setMessage('เข้าสู่ระบบไม่สำเร็จ กรุณาลองใหม่');
        
        // Redirect to home page after 3 seconds
        setTimeout(() => {
          navigate('/');
        }, 3000);
      }
    };

    handleAuthCallback();
  }, [navigate]);

  const getIcon = () => {
    switch (status) {
      case 'loading':
        return <Loader2 className="h-8 w-8 animate-spin text-blue-500" />;
      case 'success':
        return <CheckCircle className="h-8 w-8 text-green-500" />;
      case 'error':
        return <XCircle className="h-8 w-8 text-red-500" />;
      default:
        return <Loader2 className="h-8 w-8 animate-spin text-blue-500" />;
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'loading':
        return 'text-blue-600';
      case 'success':
        return 'text-green-600';
      case 'error':
        return 'text-red-600';
      default:
        return 'text-blue-600';
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md mx-4">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center text-center space-y-4">
            {getIcon()}
            <h2 className={`text-lg font-semibold ${getStatusColor()}`}>
              {message}
            </h2>
            {status === 'loading' && (
              <p className="text-sm text-gray-600">
                กรุณารอสักครู่...
              </p>
            )}
            {status === 'success' && (
              <p className="text-sm text-gray-600">
                กำลังนำคุณไปยังหน้าหลัก...
              </p>
            )}
            {status === 'error' && (
              <p className="text-sm text-gray-600">
                กำลังนำคุณกลับไปยังหน้าหลัก...
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AuthCallback;
