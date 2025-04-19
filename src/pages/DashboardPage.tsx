import React, { useState } from 'react';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { ScanUploader } from '@/components/scan/ScanUploader';
import { ScanList } from '@/components/scan/ScanList';
import { ScanDetail } from '@/components/scan/ScanDetail';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/context/AuthContext';
import { useScan } from '@/context/ScanContext';

export function DashboardPage() {
  const { authState } = useAuth();
  const { user } = authState;
  
  const [selectedScanId, setSelectedScanId] = useState<string | null>(null);
  
  const handleScanSelect = (scanId: string) => {
    setSelectedScanId(scanId);
  };
  
  const handleBackToScans = () => {
    setSelectedScanId(null);
  };
  
  if (!user) {
    return null;
  }
  
  if (selectedScanId) {
    return (
      <ScanDetail scanId={selectedScanId} onBack={handleBackToScans} />
    );
  }
  
  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
      
      <DashboardHeader />
      
      <Tabs defaultValue="scans" className="w-full">
        <TabsList>
          <TabsTrigger value="scans">My Scans</TabsTrigger>
          <TabsTrigger value="upload">Upload New Scan</TabsTrigger>
        </TabsList>
        <TabsContent value="scans" className="mt-6">
          <ScanList onScanSelect={handleScanSelect} />
        </TabsContent>
        <TabsContent value="upload" className="mt-6">
          <ScanUploader />
        </TabsContent>
      </Tabs>
    </div>
  );
}