import React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { 
  Home, 
  Upload, 
  FileText, 
  User, 
  Users, 
  BarChart2, 
  Settings, 
  HelpCircle,
  Shield,
  FileHeart,
  BrainCircuit
} from 'lucide-react';
import { useUI } from '@/context/UIContext';
import { useAuth } from '@/context/AuthContext';

interface SidebarItemProps {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick?: () => void;
}

const SidebarItem: React.FC<SidebarItemProps> = ({
  icon,
  label,
  active = false,
  onClick,
}) => {
  return (
    <Button
      variant={active ? "secondary" : "ghost"}
      className={cn(
        "w-full justify-start gap-2",
        active ? "bg-secondary" : "hover:bg-secondary/50"
      )}
      onClick={onClick}
    >
      {icon}
      <span>{label}</span>
    </Button>
  );
};

export function Sidebar() {
  const { isSidebarOpen } = useUI();
  const { authState } = useAuth();
  const { user } = authState;
  
  const [activeItem, setActiveItem] = React.useState('dashboard');
  
  // Get role-specific navigation items
  const getNavItems = () => {
    const commonItems = [
      { id: 'dashboard', label: 'Dashboard', icon: <Home className="h-5 w-5" /> },
    ];
    
    const roleSpecificItems = {
      admin: [
        { id: 'users', label: 'User Management', icon: <Users className="h-5 w-5" /> },
        { id: 'analytics', label: 'Analytics', icon: <BarChart2 className="h-5 w-5" /> },
        { id: 'models', label: 'AI Models', icon: <BrainCircuit className="h-5 w-5" /> },
        { id: 'security', label: 'Security', icon: <Shield className="h-5 w-5" /> },
      ],
      doctor: [
        { id: 'patients', label: 'Patients', icon: <Users className="h-5 w-5" /> },
        { id: 'scans', label: 'Scans', icon: <FileHeart className="h-5 w-5" /> },
        { id: 'reports', label: 'Reports', icon: <FileText className="h-5 w-5" /> },
      ],
      patient: [
        { id: 'upload', label: 'Upload Scan', icon: <Upload className="h-5 w-5" /> },
        { id: 'my-scans', label: 'My Scans', icon: <FileHeart className="h-5 w-5" /> },
        { id: 'my-reports', label: 'My Reports', icon: <FileText className="h-5 w-5" /> },
      ],
    };
    
    const bottomItems = [
      { id: 'profile', label: 'Profile', icon: <User className="h-5 w-5" /> },
      { id: 'settings', label: 'Settings', icon: <Settings className="h-5 w-5" /> },
      { id: 'help', label: 'Help & Support', icon: <HelpCircle className="h-5 w-5" /> },
    ];
    
    return {
      top: commonItems,
      middle: user ? roleSpecificItems[user.role] || [] : [],
      bottom: bottomItems,
    };
  };
  
  const { top, middle, bottom } = getNavItems();
  
  if (!isSidebarOpen) {
    return null;
  }
  
  return (
    <div className="hidden md:block fixed z-30 h-[calc(100vh-4rem)] w-64 border-r bg-background">
      <div className="flex h-full flex-col gap-2 p-4">
        <div className="flex-1 flex flex-col gap-1">
          {top.map((item) => (
            <SidebarItem
              key={item.id}
              icon={item.icon}
              label={item.label}
              active={activeItem === item.id}
              onClick={() => setActiveItem(item.id)}
            />
          ))}
          
          {middle.length > 0 && (
            <>
              <div className="my-2 h-px bg-border" />
              {middle.map((item) => (
                <SidebarItem
                  key={item.id}
                  icon={item.icon}
                  label={item.label}
                  active={activeItem === item.id}
                  onClick={() => setActiveItem(item.id)}
                />
              ))}
            </>
          )}
        </div>
        
        <div className="flex flex-col gap-1">
          <div className="my-2 h-px bg-border" />
          {bottom.map((item) => (
            <SidebarItem
              key={item.id}
              icon={item.icon}
              label={item.label}
              active={activeItem === item.id}
              onClick={() => setActiveItem(item.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}