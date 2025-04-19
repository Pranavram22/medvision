import React from 'react';
import { DashboardHeader } from './DashboardHeader';
import { DoctorScansWidget } from './DoctorScansWidget';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Users, 
  FileText, 
  BarChart2, 
  BrainCircuit, 
  Crosshair,
  Clock,
  CheckCircle
} from 'lucide-react';
import { useScan } from '@/context/ScanContext';
import { RecentActivity } from './RecentActivity';

export function DoctorDashboard({ onScanSelect }: { onScanSelect: (scanId: string) => void }) {
  const { scans, scanResults, reports } = useScan();
  
  // Get counts for various metrics
  const metrics = React.useMemo(() => {
    const pendingReviews = scans.filter(s => s.status === 'analyzed').length;
    const criticalScans = scanResults.filter(r => r.severity === 'critical').length;
    const highPriorityScans = scanResults.filter(r => r.severity === 'high').length;
    const reportsGenerated = reports.length;
    const abnormalScans = scanResults.filter(r => r.abnormalitiesDetected).length;
    const patientsCount = [...new Set(scans.map(s => s.userId))].length;
    
    return {
      pendingReviews,
      criticalScans,
      highPriorityScans,
      reportsGenerated,
      abnormalScans,
      patientsCount
    };
  }, [scans, scanResults, reports]);
  
  return (
    <div className="space-y-6">
      <DashboardHeader />
      
      <div className="grid grid-cols-1 md:grid-cols-6 gap-6">
        {/* Main metrics */}
        <Card className="md:col-span-3">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Crosshair className="h-5 w-5 text-primary mr-2" />
              Priority Cases
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col items-center justify-center p-4 bg-red-100 dark:bg-red-900/20 rounded-lg">
                <span className="text-xs text-muted-foreground mb-1">Critical</span>
                <span className="text-3xl font-bold text-red-600 dark:text-red-400">
                  {metrics.criticalScans}
                </span>
                <Badge variant="outline" className="mt-2 text-xs">Immediate</Badge>
              </div>
              
              <div className="flex flex-col items-center justify-center p-4 bg-orange-100 dark:bg-orange-900/20 rounded-lg">
                <span className="text-xs text-muted-foreground mb-1">High Priority</span>
                <span className="text-3xl font-bold text-orange-600 dark:text-orange-400">
                  {metrics.highPriorityScans}
                </span>
                <Badge variant="outline" className="mt-2 text-xs">24-48 hours</Badge>
              </div>
              
              <div className="flex flex-col items-center justify-center p-4 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                <span className="text-xs text-muted-foreground mb-1">Abnormal</span>
                <span className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                  {metrics.abnormalScans}
                </span>
                <Badge variant="outline" className="mt-2 text-xs">Total</Badge>
              </div>
              
              <div className="flex flex-col items-center justify-center p-4 bg-green-100 dark:bg-green-900/20 rounded-lg">
                <span className="text-xs text-muted-foreground mb-1">Reports</span>
                <span className="text-3xl font-bold text-green-600 dark:text-green-400">
                  {metrics.reportsGenerated}
                </span>
                <Badge variant="outline" className="mt-2 text-xs">Generated</Badge>
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => window.location.hash = '#/scans?filter=abnormal'}
            >
              View All Abnormal Scans
            </Button>
          </CardFooter>
        </Card>
        
        {/* Pending reviews */}
        <div className="md:col-span-3">
          <DoctorScansWidget onScanSelect={onScanSelect} />
        </div>
        
        {/* Status overview */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Clock className="h-5 w-5 text-primary mr-2" />
              Workflow Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  <Badge variant="outline" className="mr-2 bg-purple-100 dark:bg-purple-900/20">
                    {scans.filter(s => s.status === 'uploaded').length}
                  </Badge>
                  <span className="text-sm">Waiting for Analysis</span>
                </div>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </div>
              
              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  <Badge variant="outline" className="mr-2 bg-yellow-100 dark:bg-yellow-900/20">
                    {scans.filter(s => s.status === 'processing').length}
                  </Badge>
                  <span className="text-sm">In Progress</span>
                </div>
                <Clock className="h-4 w-4 text-yellow-500 animate-pulse" />
              </div>
              
              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  <Badge variant="outline" className="mr-2 bg-amber-100 dark:bg-amber-900/20">
                    {scans.filter(s => s.status === 'analyzed').length}
                  </Badge>
                  <span className="text-sm">Pending Review</span>
                </div>
                <AlertTriangle className="h-4 w-4 text-amber-500" />
              </div>
              
              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  <Badge variant="outline" className="mr-2 bg-green-100 dark:bg-green-900/20">
                    {scans.filter(s => s.status === 'reviewed').length}
                  </Badge>
                  <span className="text-sm">Completed</span>
                </div>
                <CheckCircle className="h-4 w-4 text-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Patient stats */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Users className="h-5 w-5 text-primary mr-2" />
              Patient Stats
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm">Total Patients</span>
                <Badge>{metrics.patientsCount}</Badge>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm">Scans per Patient</span>
                <Badge>
                  {metrics.patientsCount ? (scans.length / metrics.patientsCount).toFixed(1) : '0'}
                </Badge>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm">Average Turnaround</span>
                <Badge>4.5 hours</Badge>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm">New This Week</span>
                <Badge>+3</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* AI stats */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center">
              <BrainCircuit className="h-5 w-5 text-primary mr-2" />
              AI Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm">Model Accuracy</span>
                <Badge className="bg-blue-500">94.5%</Badge>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm">Auto-Analysis</span>
                <Badge variant="outline" className="bg-green-100 dark:bg-green-900/20">Enabled</Badge>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm">True Positive Rate</span>
                <Badge>92.3%</Badge>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm">False Positive Rate</span>
                <Badge>3.7%</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Recent activity */}
        <Card className="md:col-span-6">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <RecentActivity limit={5} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 