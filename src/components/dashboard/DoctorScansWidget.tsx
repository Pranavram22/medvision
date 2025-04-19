import React from 'react';
import { useScan } from '@/context/ScanContext';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileHeart, AlertTriangle, Clock, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';

export function DoctorScansWidget({ onScanSelect }: { onScanSelect: (scanId: string) => void }) {
  const { scans, scanResults } = useScan();
  const { authState } = useAuth();
  const { user } = authState;
  
  // Find scans that need doctor review (status is 'analyzed')
  const pendingScans = React.useMemo(() => {
    return scans
      .filter(scan => scan.status === 'analyzed')
      .map(scan => {
        const result = scanResults.find(r => r.scanId === scan.id);
        return { scan, result };
      })
      .filter(item => item.result) // Only include scans that have results
      .sort((a, b) => {
        // Sort by severity (critical first) and then by upload date (newest first)
        const severityOrder = { critical: 1, high: 2, medium: 3, low: 4, normal: 5 };
        
        const severityA = a.result?.severity || 'normal';
        const severityB = b.result?.severity || 'normal';
        
        if (severityOrder[severityA] !== severityOrder[severityB]) {
          return severityOrder[severityA] - severityOrder[severityB];
        }
        
        return new Date(b.scan.uploadedAt).getTime() - new Date(a.scan.uploadedAt).getTime();
      })
      .slice(0, 5); // Show only top 5 for the widget
  }, [scans, scanResults]);
  
  if (!user || user.role !== 'doctor') {
    return null;
  }
  
  const getSeverityBadge = (severity: string) => {
    const severityClasses = {
      critical: 'bg-red-500',
      high: 'bg-orange-500',
      medium: 'bg-yellow-500',
      low: 'bg-blue-500',
      normal: 'bg-green-500'
    };
    
    const colorClass = severityClasses[severity] || 'bg-gray-500';
    
    return <Badge className={colorClass}>{severity}</Badge>;
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center">
            <FileHeart className="h-5 w-5 text-primary mr-2" />
            Pending Scan Reviews
          </span>
          <Badge variant="outline">
            {pendingScans.length} of {scans.filter(s => s.status === 'analyzed').length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {pendingScans.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <Clock className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-muted-foreground">No scans pending review</p>
          </div>
        ) : (
          <div className="space-y-4">
            {pendingScans.map(({ scan, result }) => (
              <div 
                key={scan.id} 
                className="flex items-center justify-between p-3 rounded-md border hover:bg-accent/10 transition-colors cursor-pointer"
                onClick={() => onScanSelect(scan.id)}
              >
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <img 
                      src={scan.thumbnailImage || scan.originalImage} 
                      alt={`${scan.type} of ${scan.bodyPart}`}
                      className="w-12 h-12 rounded-md object-cover"
                    />
                    {result?.abnormalitiesDetected && (
                      <span className="absolute -top-1 -right-1">
                        <AlertTriangle className="h-4 w-4 text-amber-500" />
                      </span>
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-sm">
                      {scan.type.toUpperCase()} - {scan.bodyPart}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Uploaded {format(new Date(scan.uploadedAt), 'MMM d, h:mm a')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {result && getSeverityBadge(result.severity)}
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
      <CardFooter>
        <Button 
          variant="outline"
          className="w-full"
          onClick={() => window.location.hash = '#/scans'}
        >
          View All Scans
        </Button>
      </CardFooter>
    </Card>
  );
} 