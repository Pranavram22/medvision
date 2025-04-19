import React from 'react';
import { useScan } from '@/context/ScanContext';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle, Clock, FileHeart, Upload } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

interface ActivityItem {
  id: string;
  type: 'upload' | 'analysis' | 'report' | 'review';
  title: string;
  description: string;
  timestamp: string;
  severity?: 'critical' | 'high' | 'medium' | 'low' | 'normal';
  scanId?: string;
}

export function RecentActivity({ limit = 10 }: { limit?: number }) {
  const { scans, scanResults, reports } = useScan();
  
  // Generate activity feed from scans, results, and reports
  const activityItems = React.useMemo(() => {
    const items: ActivityItem[] = [];
    
    // Add scan uploads
    scans.forEach(scan => {
      items.push({
        id: `upload-${scan.id}`,
        type: 'upload',
        title: `New ${scan.type.toUpperCase()} uploaded`,
        description: `A ${scan.type} scan of the ${scan.bodyPart} was uploaded.`,
        timestamp: scan.uploadedAt,
        scanId: scan.id
      });
    });
    
    // Add scan analyses
    scanResults.forEach(result => {
      const scan = scans.find(s => s.id === result.scanId);
      if (!scan) return;
      
      items.push({
        id: `analysis-${result.id}`,
        type: 'analysis',
        title: `${scan.type.toUpperCase()} scan analyzed`,
        description: result.abnormalitiesDetected 
          ? `Abnormalities detected with ${result.severity} severity.` 
          : 'No significant abnormalities detected.',
        timestamp: result.processedAt,
        severity: result.severity,
        scanId: scan.id
      });
    });
    
    // Add report generations
    reports.forEach(report => {
      const result = scanResults.find(r => r.scanId === report.scanResultId);
      const scan = result ? scans.find(s => s.id === result.scanId) : null;
      if (!scan) return;
      
      items.push({
        id: `report-${report.id}`,
        type: 'report',
        title: `Medical report generated`,
        description: `Report generated for ${scan.type.toUpperCase()} scan of ${scan.bodyPart}.`,
        timestamp: report.createdAt,
        severity: result?.severity,
        scanId: scan.id
      });
    });
    
    // Sort by timestamp (newest first)
    return items.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    ).slice(0, limit);
  }, [scans, scanResults, reports, limit]);
  
  // Get icon for activity type
  const getActivityIcon = (item: ActivityItem) => {
    switch (item.type) {
      case 'upload':
        return <Upload className="h-4 w-4 text-blue-500" />;
      case 'analysis':
        if (item.severity === 'critical' || item.severity === 'high') {
          return <AlertTriangle className="h-4 w-4 text-orange-500" />;
        }
        return <FileHeart className="h-4 w-4 text-green-500" />;
      case 'report':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'review':
        return <Clock className="h-4 w-4 text-purple-500" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };
  
  // Get badge for severity
  const getSeverityBadge = (severity?: string) => {
    if (!severity) return null;
    
    const colorMap = {
      critical: 'bg-red-500',
      high: 'bg-orange-500',
      medium: 'bg-yellow-500',
      low: 'bg-blue-500',
      normal: 'bg-green-500'
    };
    
    return (
      <Badge className={colorMap[severity] || 'bg-gray-500'}>
        {severity}
      </Badge>
    );
  };
  
  if (activityItems.length === 0) {
    return (
      <div className="text-center py-6">
        <p className="text-muted-foreground">No recent activity found</p>
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      {activityItems.map(item => (
        <div key={item.id} className="flex items-start gap-4 pb-4 border-b">
          <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
            {getActivityIcon(item)}
          </div>
          
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-medium">{item.title}</h4>
              {getSeverityBadge(item.severity)}
            </div>
            <p className="text-sm text-muted-foreground">{item.description}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {formatDistanceToNow(new Date(item.timestamp), { addSuffix: true })}
              {' · '}
              {format(new Date(item.timestamp), 'MMM d, h:mm a')}
            </p>
          </div>
          
          <div>
            <a 
              href={`#/scans/${item.scanId}`} 
              className="text-xs text-primary hover:underline"
            >
              View
            </a>
          </div>
        </div>
      ))}
    </div>
  );
} 