import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Upload, 
  FileHeart, 
  FileText, 
  Users,
  BarChart2,
  BrainCircuit
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useScan } from '@/context/ScanContext';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  description?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon,
  description,
  trend,
  trendValue
}) => {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <div className="flex items-baseline gap-2">
              <p className="text-3xl font-bold">{value}</p>
              {trend && trendValue && (
                <p className={`text-xs ${
                  trend === 'up' ? 'text-green-500' : 
                  trend === 'down' ? 'text-red-500' : 
                  'text-muted-foreground'
                }`}>
                  {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→'} {trendValue}
                </p>
              )}
            </div>
            {description && (
              <p className="text-xs text-muted-foreground mt-1">{description}</p>
            )}
          </div>
          <div className="bg-primary/10 p-3 rounded-full">
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export function DashboardHeader() {
  const { authState } = useAuth();
  const { scans, scanResults, reports } = useScan();
  const { user } = authState;
  
  // Get stats based on user role
  const getStats = () => {
    if (!user) return [];
    
    const userScans = scans.filter(scan => 
      scan.userId === user.id || scan.patientId === user.id
    );
    
    const abnormalScans = scanResults.filter(result => 
      result.abnormalitiesDetected
    );
    
    if (user.role === 'admin') {
      return [
        {
          title: 'Total Users',
          value: 157,
          icon: <Users className="h-5 w-5 text-primary" />,
          trend: 'up',
          trendValue: '12% this month'
        },
        {
          title: 'Total Scans',
          value: scans.length,
          icon: <FileHeart className="h-5 w-5 text-primary" />,
          trend: 'up',
          trendValue: '8% this week'
        },
        {
          title: 'Abnormalities Detected',
          value: `${abnormalScans.length}`,
          icon: <BarChart2 className="h-5 w-5 text-primary" />,
          description: `${Math.round((abnormalScans.length / scanResults.length) * 100)}% of all scans`
        },
        {
          title: 'AI Model Accuracy',
          value: '94.5%',
          icon: <BrainCircuit className="h-5 w-5 text-primary" />,
          trend: 'up',
          trendValue: '2.3% improvement'
        }
      ];
    }
    
    if (user.role === 'doctor') {
      return [
        {
          title: 'Patients',
          value: 24,
          icon: <Users className="h-5 w-5 text-primary" />,
          trend: 'up',
          trendValue: '3 new this week'
        },
        {
          title: 'Pending Reviews',
          value: scans.filter(s => s.status === 'analyzed').length,
          icon: <FileHeart className="h-5 w-5 text-primary" />
        },
        {
          title: 'Reports Generated',
          value: reports.length,
          icon: <FileText className="h-5 w-5 text-primary" />,
          trend: 'up',
          trendValue: '5 this week'
        },
        {
          title: 'Critical Cases',
          value: scanResults.filter(r => r.severity === 'critical' || r.severity === 'high').length,
          icon: <BarChart2 className="h-5 w-5 text-primary" />,
          description: 'Requires immediate attention'
        }
      ];
    }
    
    // Patient role
    return [
      {
        title: 'My Scans',
        value: userScans.length,
        icon: <FileHeart className="h-5 w-5 text-primary" />
      },
      {
        title: 'Pending Analysis',
        value: userScans.filter(s => s.status === 'uploaded' || s.status === 'processing').length,
        icon: <FileHeart className="h-5 w-5 text-primary" />
      },
      {
        title: 'My Reports',
        value: reports.filter(r => 
          scanResults.some(res => 
            res.scanId === userScans.find(s => s.id === res.scanId)?.id
          )
        ).length,
        icon: <FileText className="h-5 w-5 text-primary" />
      },
      {
        title: 'Last Upload',
        value: userScans.length > 0 ? new Date(
          Math.max(...userScans.map(s => new Date(s.uploadedAt).getTime()))
        ).toLocaleDateString() : 'N/A',
        icon: <Upload className="h-5 w-5 text-primary" />
      }
    ];
  };
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {getStats().map((stat, index) => (
        <StatCard key={index} {...stat} />
      ))}
    </div>
  );
}