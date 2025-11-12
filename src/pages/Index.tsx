import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Sparkles, MapPin, MessageSquare, Plane, Palmtree, Mountain, Calendar, Clock, Users, Plus, User, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { tripService, type Trip } from "@/services/tripService";
import { authService } from "@/services/authService";
import { useAIConfig } from "@/config/aiConfig";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import LoginModal from "@/components/LoginModal";
import { toast } from "sonner";
import heroBg from "@/assets/hero-bg.jpg";

const Index = () => {
  const [input, setInput] = useState("");
  const [myTrips, setMyTrips] = useState<Trip[]>([]);
  const [showMyTrips, setShowMyTrips] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const navigate = useNavigate();
  
  // Get AI config from context
  const { config: aiConfig, updateProvider, updateModel, getAvailableModels } = useAIConfig();

  const quickActions = [
    { icon: MapPin, text: "หาสถานที่ท่องเที่ยว", color: "bg-cyan-500" },
    { icon: Plane, text: "วางแผนการเดินทาง", color: "bg-teal-500" },
    { icon: Palmtree, text: "ท่องเที่ยวชายหาด", color: "bg-cyan-600" },
    { icon: Mountain, text: "ผจญภัยภูเขา", color: "bg-teal-600" },
  ];

  const examplePrompts = [
    "วางแผน 7 วันในกรุงเทพและเชียงใหม่",
    "แนะนำการเดินทางงบประหยัดที่ภูเก็ต",
    "เที่ยวโรแมนติก 5 วันที่ญี่ปุ่น",
    "ท่องเที่ยวครอบครัวที่เกาหลีใต้",
  ];

  const handleStartPlanning = () => {
    if (input.trim()) {
      navigate("/chat", { state: { initialMessage: input } });
    } else {
      navigate("/chat");
    }
  };

  const handleQuickAction = (text: string) => {
    setInput(text);
  };

  const handleExamplePrompt = (prompt: string) => {
    navigate("/chat", { state: { initialMessage: prompt } });
  };

  // Check authentication status and load user trips
  useEffect(() => {
    const checkAuthAndLoadTrips = async () => {
      try {
        const currentUser = await authService.getCurrentUser();
        if (currentUser) {
          setIsAuthenticated(true);
          setUser(currentUser);
          
          // Load user trips only if authenticated
          setLoading(true);
          const trips = await tripService.getUserTrips();
          setMyTrips(trips);
        } else {
          setIsAuthenticated(false);
          setUser(null);
          setMyTrips([]);
        }
      } catch (error) {
        console.error('Error checking auth or loading trips:', error);
        setIsAuthenticated(false);
        setUser(null);
        setMyTrips([]);
      } finally {
        setLoading(false);
      }
    };

    checkAuthAndLoadTrips();
  }, []);

  const handleViewTrip = (tripId: string) => {
    navigate(`/trip/${tripId}`);
  };

  const handleLogin = () => {
    // Show login modal instead of redirecting
    setShowLoginModal(true);
  };

  const handleSignOut = async () => {
    try {
      await authService.signOut();
      setIsAuthenticated(false);
      setUser(null);
      setMyTrips([]);
      window.location.reload();
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  // Handle login success
  const handleLoginSuccess = () => {
    console.log('🎉 Login successful! Refreshing page...');
    setShowLoginModal(false);
    // Refresh the page to update the UI
    window.location.reload();
  };


  // Handle skip login
  const handleSkipLogin = () => {
    console.log('⏭️ Skipping login, continuing as guest...');
    setShowLoginModal(false);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section 
        className="relative min-h-[90vh] flex items-center justify-center overflow-hidden"
        style={{
          backgroundImage: `url(${heroBg})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        {/* Overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-overlay/70 via-overlay/50 to-overlay/70" />
        
        {/* Header with Avatar */}
        <div className="absolute top-0 left-0 right-0 z-20 p-4">
          <div className="container mx-auto flex justify-between items-center">
            {/* Logo/Brand */}
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-full bg-primary/20 backdrop-blur-md">
                <Sparkles className="w-8 h-8 text-primary-foreground" />
              </div>
              <h1 className="text-2xl md:text-3xl font-bold text-white">
                Tripster
              </h1>
            </div>

            {/* User Avatar/Login Button */}
            <div className="flex items-center gap-3">
              {isAuthenticated ? (
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md rounded-full px-4 py-2">
                    {user?.user_metadata?.avatar_url || user?.user_metadata?.picture ? (
                      <img
                        src={user.user_metadata.avatar_url || user.user_metadata.picture}
                        alt="Profile"
                        className="w-8 h-8 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-400 to-teal-400 flex items-center justify-center">
                        <User className="w-4 h-4 text-white" />
                      </div>
                    )}
                    <span className="text-white text-sm font-medium">
                      {user?.user_metadata?.display_name || user?.email || 'ผู้ใช้'}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleSignOut}
                    className="text-white hover:bg-white/10"
                  >
                    ออกจากระบบ
                  </Button>
                </div>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLogin}
                  className="text-white hover:bg-white/10 flex items-center gap-2"
                >
                  <LogIn className="w-4 h-4" />
                  เข้าสู่ระบบ
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="relative z-10 container mx-auto px-4 py-20">
          <div className="max-w-4xl mx-auto text-center">

            {/* Headline */}
            <h2 className="text-3xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
              {isAuthenticated ? (
                <>สวัสดี {user?.user_metadata?.display_name || user?.email || 'คุณ'} วันนี้เราจะไปไหนกันดี?</>
              ) : (
                <>
                  สวัสดี ฉันชื่อ Tripster
                  <br />
                  <span className="bg-gradient-to-r from-cyan-400 to-teal-400 bg-clip-text text-transparent">
                    ผู้ช่วยวางแผนการเดินทาง AI ของคุณ
                  </span>
                </>
              )}
            </h2>

            <p className="text-xl text-white/90 mb-12 max-w-2xl mx-auto">
              บอกความชอบและงบประมาณ เราจะวางแผนการเดินทางที่สมบูรณ์แบบให้คุณ
            </p>

            {/* Search Box */}
            <Card className="p-2 bg-background/95 backdrop-blur-lg shadow-2xl border-white/20 max-w-3xl mx-auto mb-8">
              <div className="space-y-3">
                {/* AI Model Selection */}
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Label htmlFor="ai-provider" className="text-xs text-gray-900 dark:text-white/80 mb-1 block">AI Model</Label>
                    <div className="flex gap-2">
                      <Select
                        value={aiConfig.currentProvider}
                        onValueChange={(value: 'openai' | 'claude' | 'gemini') => updateProvider(value)}
                      >
                        <SelectTrigger className="h-9 text-xs bg-white/95 border-white/20 text-gray-900">
                          <SelectValue placeholder="Select Provider" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="openai">OpenAI</SelectItem>
                          <SelectItem value="claude">Claude</SelectItem>
                          <SelectItem value="gemini">Gemini</SelectItem>
                        </SelectContent>
                      </Select>
                      <Select
                        value={aiConfig.currentModel}
                        onValueChange={(value) => updateModel(value)}
                      >
                        <SelectTrigger className="h-9 text-xs bg-white/95 border-white/20 text-gray-900">
                          <SelectValue placeholder="Select Model" />
                        </SelectTrigger>
                        <SelectContent>
                          {getAvailableModels().map((model) => (
                            <SelectItem key={model.id} value={model.id}>
                              {model.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
                
                {/* Input Box */}
              <div className="flex gap-2">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="เช่น: วางแผน 5 วันที่เชียงใหม่ งบประมาณ 10,000 บาท"
                  className="flex-1 border-0 bg-transparent text-base h-14 px-6"
                  onKeyPress={(e) => {
                    if (e.key === "Enter") handleStartPlanning();
                  }}
                />
                <Button
                  onClick={handleStartPlanning}
                  variant="hero"
                  size="lg"
                  className="h-14 px-8"
                >
                  <MessageSquare className="w-5 h-5 mr-2" />
                  เริ่มวางแผน
                </Button>
                </div>
              </div>
            </Card>

            {/* Quick Action Buttons */}
            <div className="flex flex-wrap gap-3 justify-center mb-12">
              {quickActions.map((action, idx) => (
                <Button
                  key={idx}
                  variant="glass"
                  size="lg"
                  onClick={() => handleQuickAction(action.text)}
                  className="text-white hover:scale-105 transition-transform"
                >
                  <action.icon className="w-5 h-5 mr-2" />
                  {action.text}
                </Button>
              ))}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6 max-w-2xl mx-auto">
              <div className="backdrop-blur-md bg-white/10 rounded-xl p-4 border border-white/20">
                <div className="text-3xl font-bold text-white mb-1">10K+</div>
                <div className="text-sm text-white/80">แผนการเดินทาง</div>
              </div>
              <div className="backdrop-blur-md bg-white/10 rounded-xl p-4 border border-white/20">
                <div className="text-3xl font-bold text-white mb-1">50K+</div>
                <div className="text-sm text-white/80">ผู้ใช้งาน</div>
              </div>
              <div className="backdrop-blur-md bg-white/10 rounded-xl p-4 border border-white/20 col-span-2 md:col-span-1">
                <div className="text-3xl font-bold text-white mb-1">4.8⭐</div>
                <div className="text-sm text-white/80">คะแนนรีวิว</div>
              </div>
            </div>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <div className="w-6 h-10 border-2 border-white/50 rounded-full flex items-start justify-center p-2">
            <div className="w-1.5 h-3 bg-white/50 rounded-full animate-pulse" />
          </div>
        </div>
      </section>

      {/* My Trips Section - Only show if authenticated */}
      {isAuthenticated && (
        <section className="py-16 bg-gradient-to-b from-secondary to-background">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <div className="flex items-center justify-center gap-3 mb-4">
                {user?.user_metadata?.avatar_url || user?.user_metadata?.picture ? (
                  <img
                    src={user.user_metadata.avatar_url || user.user_metadata.picture}
                    alt="Profile"
                    className="w-12 h-12 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-400 to-teal-400 flex items-center justify-center">
                    <User className="w-6 h-6 text-white" />
                  </div>
                )}
                <div className="text-left">
                  <h2 className="text-3xl md:text-4xl font-bold">
                    แผนการเดินทางของฉัน
                  </h2>
                  <p className="text-muted-foreground text-lg">
                    สวัสดี {user?.user_metadata?.display_name || user?.email || 'ผู้ใช้'}
                  </p>
                </div>
              </div>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                แผนการเดินทางที่คุณเคยสร้างและบันทึกไว้
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto mb-8">
              {loading ? (
                <div className="col-span-full text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
                  <p className="text-gray-600">กำลังโหลดแผนการเดินทาง...</p>
                </div>
              ) : myTrips.length === 0 ? (
                <div className="col-span-full text-center py-8">
                  <MapPin className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <p className="text-gray-600">ยังไม่มีแผนการเดินทาง</p>
                  <p className="text-sm text-gray-500">เริ่มสร้างแผนการเดินทางแรกของคุณ!</p>
                  <Button 
                    onClick={() => navigate('/chat')}
                    className="mt-4"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    สร้างแผนแรก
                  </Button>
                </div>
              ) : (
                myTrips.map((trip) => (
                  <Card key={trip.id} className="hover:shadow-xl transition-all hover:-translate-y-1 cursor-pointer" onClick={() => handleViewTrip(trip.id)}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <CardTitle className="text-lg line-clamp-2">{trip.title}</CardTitle>
                        <Badge variant={trip.destinations.length > 0 ? 'default' : 'secondary'}>
                          {trip.destinations.length > 0 ? 'มีสถานที่' : 'ว่างเปล่า'}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="w-4 h-4" />
                          <span>{new Date(trip.start_date).toLocaleDateString('th-TH')} - {new Date(trip.end_date).toLocaleDateString('th-TH')}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <MapPin className="w-4 h-4" />
                          <span>{trip.destinations.length} สถานที่</span>
                        </div>
                      </div>
                      <Button variant="outline" size="sm" className="w-full mt-4">
                        ดูรายละเอียด
                      </Button>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>

            <div className="text-center">
              <Button variant="outline" size="lg" onClick={() => navigate('/chat')}>
                <Plus className="w-5 h-5 mr-2" />
                สร้างแผนใหม่
              </Button>
            </div>
          </div>
        </section>
      )}

      {/* Features Section */}
      <section className="py-20 bg-gradient-to-b from-background to-secondary">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              คุณสามารถถามอะไรก็ได้
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              AI ของเราพร้อมช่วยวางแผนทุกแง่มุมของการเดินทาง
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto mb-16">
            <Card className="p-6 text-center hover:shadow-xl transition-all hover:-translate-y-1 border-primary/20">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-cyan-500 to-cyan-600 flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-7 h-7 text-white" />
              </div>
              <h3 className="font-semibold text-lg mb-2">แรงบันดาลใจ</h3>
              <p className="text-sm text-muted-foreground">
                ค้นหาสถานที่ท่องเที่ยวที่ซ่อนอยู่และไม่เหมือนใคร
              </p>
            </Card>

            <Card className="p-6 text-center hover:shadow-xl transition-all hover:-translate-y-1 border-teal-500/20">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center mx-auto mb-4">
                <Plane className="w-7 h-7 text-white" />
              </div>
              <h3 className="font-semibold text-lg mb-2">ตั้งเที่ยวบิน</h3>
              <p className="text-sm text-muted-foreground">
                ค้นหาตั๋วเครื่องบินราคาดีที่สุด
              </p>
            </Card>

            <Card className="p-6 text-center hover:shadow-xl transition-all hover:-translate-y-1 border-cyan-600/20">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-cyan-600 to-cyan-700 flex items-center justify-center mx-auto mb-4">
                <MapPin className="w-7 h-7 text-white" />
              </div>
              <h3 className="font-semibold text-lg mb-2">ที่พัก</h3>
              <p className="text-sm text-muted-foreground">
                แนะนำโรงแรมและที่พักที่เหมาะกับคุณ
              </p>
            </Card>

            <Card className="p-6 text-center hover:shadow-xl transition-all hover:-translate-y-1 border-teal-600/20">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-teal-600 to-teal-700 flex items-center justify-center mx-auto mb-4">
                <Mountain className="w-7 h-7 text-white" />
              </div>
              <h3 className="font-semibold text-lg mb-2">แผนการเดินทาง</h3>
              <p className="text-sm text-muted-foreground">
                วางแผนทริปละเอียดพร้อมกิจกรรมและร้านอาหาร
              </p>
            </Card>
          </div>

          {/* Example Prompts */}
          <div className="max-w-4xl mx-auto">
            <h3 className="text-2xl font-bold text-center mb-8">ตัวอย่างคำถาม</h3>
            <div className="grid md:grid-cols-2 gap-4">
              {examplePrompts.map((prompt, idx) => (
                <Card
                  key={idx}
                  className="p-4 cursor-pointer hover:shadow-lg hover:border-primary transition-all group"
                  onClick={() => handleExamplePrompt(prompt)}
                >
                  <div className="flex items-center gap-3">
                    <MessageSquare className="w-5 h-5 text-primary group-hover:scale-110 transition-transform" />
                    <p className="text-sm group-hover:text-primary transition-colors">
                      {prompt}
                    </p>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-br from-primary via-accent to-primary relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS1vcGFjaXR5PSIwLjEiIHN0cm9rZS13aWR0aD0iMSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNncmlkKSIvPjwvc3ZnPg==')] opacity-20" />
        <div className="container mx-auto px-4 text-center relative z-10">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            พร้อมเริ่มการผจญภัยของคุณแล้วหรือยัง?
          </h2>
          <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
            ให้ AI วางแผนการเดินทางที่สมบูรณ์แบบให้คุณภายในไม่กี่นาที
          </p>
          <Button
            onClick={() => navigate("/chat")}
            variant="glass"
            size="lg"
            className="text-white text-lg px-12 h-16 hover:scale-105"
          >
            <Sparkles className="w-6 h-6 mr-2" />
            เริ่มวางแผนเลย
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 bg-card border-t">
        <div className="container mx-auto px-4 text-center">
          <p className="text-sm text-muted-foreground">
            © 2025 Tripster. ขับเคลื่อนด้วย AI เพื่อประสบการณ์การท่องเที่ยวที่ดีที่สุด
          </p>
        </div>
      </footer>

      {/* Login Modal */}
      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onSuccess={handleLoginSuccess}
      />
    </div>
  );
};

export default Index;
