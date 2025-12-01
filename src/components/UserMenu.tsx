import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  LogOut,
  User,
  Plus,
  MapPin,
  CreditCard,
  Settings,
  HelpCircle,
  MessageSquare,
  FileText,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useLanguage } from "@/hooks/useLanguage";
import { authService } from "@/services/authService";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface UserMenuProps {
  user: any;
  onSignOut: () => void;
  onUpdateProfile: () => void; // Callback to reload user data after update
}

export function UserMenu({ user, onSignOut, onUpdateProfile }: UserMenuProps) {
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [newDisplayName, setNewDisplayName] = useState("");
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  const displayName = user?.user_metadata?.display_name || user?.email || (language === 'th' ? 'ผู้ใช้' : 'Traveler');
  const email = user?.email || "";
  const avatarUrl = user?.user_metadata?.avatar_url || user?.user_metadata?.picture;

  const handleUpdateProfileSubmit = async () => {
    if (!newDisplayName.trim()) return;

    try {
      setIsSavingProfile(true);
      const { error } = await authService.updateProfile({
        display_name: newDisplayName,
      });

      if (error) throw error;

      toast.success(language === 'th' ? 'อัปเดตข้อมูลสำเร็จ' : 'Profile updated successfully');
      setIsEditingProfile(false);
      onUpdateProfile();
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error(language === 'th' ? 'เกิดข้อผิดพลาดในการอัปเดต' : 'Failed to update profile');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const openEditProfile = () => {
    setNewDisplayName(displayName);
    setIsEditingProfile(true);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="relative h-10 w-10 rounded-full p-0 hover:bg-white/10 ring-2 ring-white/20 transition-all hover:ring-white/50">
            <Avatar className="h-10 w-10 border-2 border-white/10">
              <AvatarImage src={avatarUrl} alt={displayName} className="object-cover" />
              <AvatarFallback className="bg-gradient-to-br from-cyan-400 to-teal-400 text-white">
                <User className="h-5 w-5" />
              </AvatarFallback>
            </Avatar>
            {/* Online Status Indicator */}
            <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-500 border-2 border-background"></span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-72" align="end" forceMount>
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none">{displayName}</p>
              <p className="text-xs leading-none text-muted-foreground">
                {email}
              </p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem onClick={() => navigate(`/${language}/chat`)}>
              <Plus className="mr-2 h-4 w-4" />
              <span>{language === 'th' ? 'สร้างทริปใหม่' : 'New Trip'}</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate(`/${language}/trips`)}> {/* Assuming route exists or handled elsewhere */}
              <MapPin className="mr-2 h-4 w-4" />
              <span>{language === 'th' ? 'ทริปของฉัน' : 'My Trips'}</span>
            </DropdownMenuItem>
            <DropdownMenuItem disabled>
              <CreditCard className="mr-2 h-4 w-4" />
              <span>{language === 'th' ? 'จัดการแพ็คเกจ' : 'Manage Subscription'}</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={openEditProfile}>
              <Settings className="mr-2 h-4 w-4" />
              <span>{language === 'th' ? 'ตั้งค่า' : 'Settings'}</span>
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem disabled>
              <HelpCircle className="mr-2 h-4 w-4" />
              <span>{language === 'th' ? 'เกี่ยวกับเรา' : 'About'}</span>
            </DropdownMenuItem>
            <DropdownMenuItem disabled>
              <MessageSquare className="mr-2 h-4 w-4" />
              <span>{language === 'th' ? 'ติดต่อเรา' : 'Contact'}</span>
            </DropdownMenuItem>
            <DropdownMenuItem disabled>
              <FileText className="mr-2 h-4 w-4" />
              <span>{language === 'th' ? 'เงื่อนไขการให้บริการ' : 'Terms of service'}</span>
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={onSignOut} className="text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-900/20">
            <LogOut className="mr-2 h-4 w-4" />
            <span>{t('auth.logout')}</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Edit Profile Dialog */}
      <Dialog open={isEditingProfile} onOpenChange={setIsEditingProfile}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{language === 'th' ? 'แก้ไขข้อมูลส่วนตัว' : 'Edit Profile'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                {language === 'th' ? 'ชื่อที่แสดง' : 'Name'}
              </Label>
              <Input
                id="name"
                value={newDisplayName}
                onChange={(e) => setNewDisplayName(e.target.value)}
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" onClick={handleUpdateProfileSubmit} disabled={isSavingProfile}>
              {isSavingProfile ? (language === 'th' ? 'กำลังบันทึก...' : 'Saving...') : (language === 'th' ? 'บันทึก' : 'Save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

