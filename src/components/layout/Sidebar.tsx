import React from 'react';
import { Link, useLocation } from 'react-router-dom';
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
  BrainCircuit,
  History,
  ArrowLeftRight
} from 'lucide-react';
import { useUI } from '@/context/UIContext';
import { useAuth } from '@/context/AuthContext';

export function Sidebar() {
  const { isSidebarOpen } = useUI();
  const { authState } = useAuth();
  const { user } = authState;
  const location = useLocation();
  
  // Get role-specific navigation items
  const getNavItems = () => {
    const commonItems = [
      { id: 'dashboard', label: 'Dashboard', icon: <Home className="h-5 w-5" />, href: '/' },
    ];
    
    const roleSpecificItems = {
      admin: [
        { id: 'users', label: 'User Management', icon: <Users className="h-5 w-5" />, href: '/users' },
        { id: 'analytics', label: 'Analytics', icon: <BarChart2 className="h-5 w-5" />, href: '/analytics' },
        { id: 'models', label: 'AI Models', icon: <BrainCircuit className="h-5 w-5" />, href: '/models' },
        { id: 'security', label: 'Security', icon: <Shield className="h-5 w-5" />, href: '/security' },
      ],
      doctor: [
        { id: 'patients', label: 'Patients', icon: <Users className="h-5 w-5" />, href: '/patients' },
        { id: 'scans', label: 'Scans', icon: <FileHeart className="h-5 w-5" />, href: '/scans' },
        { id: 'reports', label: 'Reports', icon: <FileText className="h-5 w-5" />, href: '/reports' },
      ],
      patient: [
        { id: 'upload', label: 'Upload Scan', icon: <Upload className="h-5 w-5" />, href: '/upload' },
        { id: 'my-scans', label: 'My Scans', icon: <FileHeart className="h-5 w-5" />, href: '/scans' },
        { id: 'my-reports', label: 'My Reports', icon: <FileText className="h-5 w-5" />, href: '/reports' },
        { id: 'compare-scans', label: 'Compare Scans', icon: <ArrowLeftRight className="h-5 w-5" />, href: '/reports/compare' },
        { id: 'Segmentation analysis', label: 'Segmentation analysis', icon: <History className="h-5 w-5" />, href: 'https://752af7f859166d9325.gradio.live' },
      ],
    };
    
    const bottomItems = [
      { id: 'profile', label: 'Profile', icon: <User className="h-5 w-5" />, href: '/profile' },
      { id: 'settings', label: 'Settings', icon: <Settings className="h-5 w-5" />, href: '/settings' },
      { id: 'help', label: 'Help & Support', icon: <HelpCircle className="h-5 w-5" />, href: '/help' },
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
            <Button
              key={item.id}
              variant={location.pathname === item.href ? "secondary" : "ghost"}
              className={cn(
                "w-full justify-start gap-2",
                location.pathname === item.href ? "bg-secondary" : "hover:bg-secondary/50"
              )}
              asChild
            >
              <Link to={item.href}>
                {item.icon}
                <span>{item.label}</span>
              </Link>
            </Button>
          ))}
          
          {middle.length > 0 && (
            <>
              <div className="my-2 h-px bg-border" />
              {middle.map((item) => (
                <Button
                  key={item.id}
                  variant={location.pathname === item.href ? "secondary" : "ghost"}
                  className={cn(
                    "w-full justify-start gap-2",
                    location.pathname === item.href ? "bg-secondary" : "hover:bg-secondary/50"
                  )}
                  asChild
                >
                  <Link to={item.href}>
                    {item.icon}
                    <span>{item.label}</span>
                  </Link>
                </Button>
              ))}
            </>
          )}
        </div>
        
        <div className="flex flex-col gap-1">
          <div className="my-2 h-px bg-border" />
          {bottom.map((item) => (
            <Button
              key={item.id}
              variant={location.pathname === item.href ? "secondary" : "ghost"}
              className={cn(
                "w-full justify-start gap-2",
                location.pathname === item.href ? "bg-secondary" : "hover:bg-secondary/50"
              )}
              asChild
            >
              <Link to={item.href}>
                {item.icon}
                <span>{item.label}</span>
              </Link>
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}