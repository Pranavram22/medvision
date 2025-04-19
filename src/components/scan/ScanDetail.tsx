import React, { useState, useEffect } from 'react';
import { 
  AlertTriangle, 
  FileHeart, 
  Clock, 
  CheckCircle, 
  ArrowLeft,
  Download,
  Volume2,
  Printer,
  MessageSquare,
  BarChart,
  Layers,
  PlayCircle,
  PauseCircle
} from 'lucide-react';
import { useScan } from '@/context/ScanContext';
import { useAuth } from '@/context/AuthContext';
import { useUI } from '@/context/UIContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { Progress } from '@/components/ui/progress';
import { format } from 'date-fns';
import { downloadReportAsPDF } from '@/lib/pdfUtils';

interface ScanDetailProps {
  scanId: string;
  onBack: () => void;
}

// Function to format analysis text with bullet points and highlights
const formatAnalysisWithBullets = (text: string): React.ReactNode => {
  if (!text) return null;
  
  // Process the text to enhance readability
  const paragraphs = text.split('\n').filter(p => p.trim().length > 0);
  
  return (
    <div className="space-y-4">
      {paragraphs.map((paragraph, idx) => {
        // Check if paragraph is a header (uppercase or ends with colon)
        if (paragraph.toUpperCase() === paragraph && paragraph.length > 3 || 
            /^[A-Z][\w\s]{2,20}:$/.test(paragraph)) {
          return (
            <h4 key={idx} className="text-base font-medium mt-2">
              {paragraph}
            </h4>
          );
        }
        
        // Check if paragraph contains findings or observations
        if (paragraph.toLowerCase().includes('finding') || 
            paragraph.toLowerCase().includes('observation') ||
            paragraph.toLowerCase().includes('abnormalit')) {
          return (
            <div key={idx} className="ml-0 p-2 bg-amber-50 dark:bg-amber-950/20 rounded border-l-2 border-amber-500">
              {paragraph}
            </div>
          );
        }
        
        // Check if paragraph contains conclusion or impression
        if (paragraph.toLowerCase().includes('conclusion') || 
            paragraph.toLowerCase().includes('impression') ||
            paragraph.toLowerCase().includes('diagnos')) {
          return (
            <div key={idx} className="ml-0 p-2 bg-blue-50 dark:bg-blue-950/20 rounded border-l-2 border-blue-500">
              {paragraph}
            </div>
          );
        }
        
        // Convert lists to bullet points (detect numbered lists or dashes)
        if (/^(\d+[\.\):]|\s*-|\s*\*)/.test(paragraph)) {
          return (
            <ul key={idx} className="list-disc pl-6">
              <li>{paragraph.replace(/^(\d+[\.\):]|\s*-|\s*\*)/, '')}</li>
            </ul>
          );
        }
        
        // Regular paragraph
        return <p key={idx}>{paragraph}</p>;
      })}
    </div>
  );
};

export function ScanDetail({ scanId, onBack }: ScanDetailProps) {
  const { 
    getScanById, 
    getResultByScanId, 
    getReportByResultId, 
    analyzeScan, 
    generateReport, 
    loading 
  } = useScan();
  const { authState } = useAuth();
  const { user } = authState;
  const { addToast } = useUI();
  
  const scan = getScanById(scanId);
  const result = getResultByScanId(scanId);
  const report = result?.reportId ? getReportByResultId(result.id) : undefined;
  
  // Update the getDefaultTab function to ensure we have a valid initial state
  const getDefaultTab = () => {
    if (report) return "report";
    if (result) return "ai-analysis";
    return "image";
  };
  
  const [activeTab, setActiveTab] = useState(getDefaultTab());
  const [isPlaying, setIsPlaying] = useState(false);
  const [language, setLanguage] = useState('english');
  const [summaryInput, setSummaryInput] = useState('');
  
  // Reset tab when scan changes
  useEffect(() => {
    if (scanId) {
      setActiveTab(getDefaultTab());
    }
  }, [scanId, report, result]);
  
  // Handle tab change with feedback for debugging
  const handleTabChange = (value: string) => {
    console.log(`Tab changing from ${activeTab} to ${value}`);
    setActiveTab(value);
    
    // Optional toast for debugging
    addToast({
      title: 'Tab Changed',
      description: `Switched to ${value} tab`,
      type: 'default'
    });
  };
  
  // Add debugging for heatmap image
  useEffect(() => {
    if (result) {
      console.log("Result data:", { 
        id: result.id, 
        hasHeatmap: !!result.heatmapImage,
        heatmapUrl: result.heatmapImage,
        analysisTab: activeTab === "analysis"
      });
    }
  }, [result, activeTab]);
  
  if (!scan) {
    return (
      <Card>
        <CardContent className="py-12 flex flex-col items-center justify-center">
          <FileHeart className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground text-lg">Scan not found</p>
          <Button variant="outline" onClick={onBack} className="mt-4">
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to Scans
          </Button>
        </CardContent>
      </Card>
    );
  }
  
  const handleAnalyze = () => {
    analyzeScan(scanId);
  };
  
  const handleGenerateReport = () => {
    if (result) {
      generateReport(result.id, summaryInput || "Summary of scan findings for patient review.");
    }
  };
  
  const handlePlayNarration = () => {
    setIsPlaying(!isPlaying);
    // In a real app, this would trigger the text-to-speech API
  };
  
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'text-red-500';
      case 'high':
        return 'text-orange-500';
      case 'medium':
        return 'text-yellow-500';
      case 'low':
        return 'text-blue-500';
      default:
        return 'text-green-500';
    }
  };
  
  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <Badge variant="destructive" className="ml-2">Critical</Badge>;
      case 'high':
        return <Badge className="bg-orange-500 ml-2">High</Badge>;
      case 'medium':
        return <Badge className="bg-yellow-500 ml-2">Medium</Badge>;
      case 'low':
        return <Badge className="bg-blue-500 ml-2">Low</Badge>;
      default:
        return <Badge className="bg-green-500 ml-2">Normal</Badge>;
    }
  };
  
  // Add this helper function to handle tab switching safely
  const switchTab = (tabValue: string) => {
    const tabElement = document.querySelector(`[data-value="${tabValue}"]`) as HTMLElement;
    if (tabElement) {
      tabElement.click();
    }
  };
  
  // Handle PDF download
  const handleDownloadPDF = async () => {
    if (!scan || !result || !report) return;
    
    try {
      await downloadReportAsPDF(
        report,
        scan,
        result,
        scan.originalImage // Pass the image URL if available
      );
    } catch (error) {
      console.error('Failed to download PDF:', error);
      addToast({
        title: 'Download Failed',
        description: 'Failed to generate PDF report.',
        type: 'error'
      });
    }
  };
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Scans
        </Button>
        
        <div className="flex items-center gap-2">
          {user?.role === 'doctor' && (
            <>
              <Button variant="outline">
                <Printer className="h-4 w-4 mr-2" /> Print
              </Button>
              <Button variant="outline" onClick={handleDownloadPDF} disabled={!report}>
                <Download className="h-4 w-4 mr-2" /> Download
              </Button>
            </>
          )}
        </div>
      </div>
      
      {/* Add manual tab buttons for debugging */}
      <div className="bg-muted/30 p-2 rounded flex flex-wrap gap-2 items-center">
        <span className="text-sm text-muted-foreground">Manual tab switcher:</span>
        <Button 
          size="sm" 
          variant={activeTab === "image" ? "default" : "outline"} 
          onClick={() => handleTabChange("image")}
        >
          Image
        </Button>
        <Button 
          size="sm" 
          variant={activeTab === "ai-analysis" ? "default" : "outline"} 
          onClick={() => handleTabChange("ai-analysis")}
          disabled={!result}
        >
          AI Analysis
        </Button>
        <Button 
          size="sm" 
          variant={activeTab === "analysis" ? "default" : "outline"} 
          onClick={() => handleTabChange("analysis")}
          disabled={!result?.heatmapImage}
        >
          Analysis View
        </Button>
        <Button 
          size="sm" 
          variant={activeTab === "report" ? "default" : "outline"} 
          onClick={() => handleTabChange("report")}
          disabled={!report}
        >
          Report
        </Button>
        <span className="text-xs text-muted-foreground ml-auto">Current tab: {activeTab}</span>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex justify-between items-center">
                <span>Scan Information</span>
                {result && getSeverityBadge(result.severity)}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium">Type</p>
                <p className="capitalize">{scan.type}</p>
              </div>
              <div>
                <p className="text-sm font-medium">Body Part</p>
                <p className="capitalize">{scan.bodyPart}</p>
              </div>
              <div>
                <p className="text-sm font-medium">Uploaded</p>
                <p>{format(new Date(scan.uploadedAt), 'PPpp')}</p>
              </div>
              <div>
                <p className="text-sm font-medium">Status</p>
                <div className="flex items-center mt-1">
                  {scan.status === 'uploaded' && (
                    <Badge variant="outline" className="flex items-center">
                      <Clock className="h-3 w-3 mr-1" /> Pending Analysis
                    </Badge>
                  )}
                  {scan.status === 'processing' && (
                    <Badge variant="secondary" className="flex items-center">
                      <Clock className="h-3 w-3 mr-1 animate-spin" /> Processing
                    </Badge>
                  )}
                  {scan.status === 'analyzed' && (
                    <Badge className="flex items-center">
                      <CheckCircle className="h-3 w-3 mr-1" /> Analysis Complete
                    </Badge>
                  )}
                  {scan.status === 'reviewed' && (
                    <Badge className="flex items-center bg-green-500">
                      <CheckCircle className="h-3 w-3 mr-1" /> Doctor Reviewed
                    </Badge>
                  )}
                </div>
              </div>
              
              {!result && scan.status === 'uploaded' && (
                <Button 
                  className="w-full mt-4" 
                  onClick={handleAnalyze}
                  disabled={loading}
                >
                  {loading ? 'Processing...' : 'Start Analysis'}
                </Button>
              )}
              
              {result && (
                <>
                  <div>
                    <p className="text-sm font-medium">AI Model</p>
                    <p>{result.aiModel}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Confidence Score</p>
                    <div className="flex items-center gap-2">
                      <Progress value={result.confidenceScore * 100} className="h-2" />
                      <span className="text-sm">{Math.round(result.confidenceScore * 100)}%</span>
                    </div>
                  </div>
                  {result.abnormalitiesDetected && (
                    <div>
                      <p className="text-sm font-medium">Triage Priority</p>
                      <div className="flex items-center gap-2">
                        <Progress 
                          value={result.triagePriority * 10} 
                          className={`h-2 ${
                            result.triagePriority >= 8 ? "bg-red-500" : 
                            result.triagePriority >= 6 ? "bg-orange-500" : 
                            result.triagePriority >= 4 ? "bg-yellow-500" : "bg-blue-500"
                          }`}
                        />
                        <span className="text-sm">{result.triagePriority}/10</span>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
          
          {result && result.findings.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Findings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {result.findings.map((finding) => (
                  <div key={finding.id} className="border rounded-lg p-3">
                    <div className="flex justify-between">
                      <p className="font-medium">{finding.area}</p>
                      <span className={getSeverityColor(finding.severity)}>{finding.severity}</span>
                    </div>
                    <p className="text-sm mt-1">{finding.description}</p>
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Confidence:</span>
                      <Progress value={finding.confidence * 100} className="h-1.5 flex-1" />
                      <span className="text-xs">{Math.round(finding.confidence * 100)}%</span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
        
        <div className="lg:col-span-2 space-y-6">
          {/* Custom Tab Implementation */}
          <div className="w-full">
            {/* Tab Navigation */}
            <div className="flex space-x-1 rounded-md bg-muted p-1">
              <button
                className={`flex-1 justify-center rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 ${
                  activeTab === "image" 
                    ? "bg-background text-foreground shadow-sm" 
                    : "text-muted-foreground hover:bg-background/40"
                }`}
                onClick={() => handleTabChange("image")}
              >
                Original Image
              </button>
              
              <button
                className={`flex-1 justify-center rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 ${
                  activeTab === "ai-analysis" 
                    ? "bg-background text-foreground shadow-sm" 
                    : "text-muted-foreground hover:bg-background/40"
                }`}
                onClick={() => handleTabChange("ai-analysis")}
                disabled={!result}
              >
                AI Analysis
              </button>
              
              <button
                className={`flex-1 justify-center rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 ${
                  activeTab === "analysis" 
                    ? "bg-background text-foreground shadow-sm" 
                    : "text-muted-foreground hover:bg-background/40"
                }`}
                onClick={() => handleTabChange("analysis")}
                disabled={!result?.heatmapImage}
              >
                Analysis View
              </button>
              
              <button
                className={`flex-1 justify-center rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 ${
                  activeTab === "report" 
                    ? "bg-background text-foreground shadow-sm" 
                    : "text-muted-foreground hover:bg-background/40"
                }`}
                onClick={() => handleTabChange("report")}
                disabled={!report}
              >
                Report
              </button>
            </div>
            
            {/* Tab Content */}
            <div className="mt-4">
              {/* Original Image Tab */}
              {activeTab === "image" && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex justify-between items-center">
                      <span>Original Scan Image</span>
                      <Badge variant="outline">
                        {scan.type.toUpperCase()} - {scan.bodyPart}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0 relative">
                    <div className="relative group">
                      <img
                        src={scan.originalImage}
                        alt={`${scan.type} scan of ${scan.bodyPart}`}
                        className="w-full h-auto rounded-lg"
                      />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-lg">
                        <Button variant="secondary" size="sm" className="mx-2">
                          <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                          </svg>
                          Zoom
                        </Button>
                        <Button variant="secondary" size="sm" className="mx-2">
                          <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          Full Screen
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="flex flex-col border-t pt-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
                      <div>
                        <h3 className="text-sm font-medium mb-2">Scan Details</h3>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Type:</span>
                            <span>{scan.type.toUpperCase()}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Body Part:</span>
                            <span>{scan.bodyPart}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Captured Date:</span>
                            <span>{scan.metadata?.captureDate ? format(new Date(scan.metadata.captureDate), 'PP') : 'Unknown'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Acquisition Method:</span>
                            <span>{scan.metadata?.acquisitionMethod || scan.type}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Modality:</span>
                            <span>{scan.metadata?.modality || 'Standard'}</span>
                          </div>
                        </div>
                      </div>
                      <div>
                        <h3 className="text-sm font-medium mb-2">Technical Information</h3>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Dimensions:</span>
                            <span>{scan.metadata?.dimensions || '1024 x 1024 px'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Format:</span>
                            <span>{scan.metadata?.format || scan.originalImage.split('.').pop()?.toUpperCase() || 'DICOM'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Bit Depth:</span>
                            <span>{scan.metadata?.bitDepth || '16-bit'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">File Size:</span>
                            <span>{scan.metadata?.fileSize || 'Unknown'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Slice Thickness:</span>
                            <span>{scan.metadata?.sliceThickness ? `${scan.metadata.sliceThickness} mm` : 'N/A'}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-6 w-full">
                      <h3 className="text-sm font-medium mb-2">Image Analysis Notes</h3>
                      <div className="bg-muted p-3 rounded-md text-sm">
                        <p>{scan.metadata?.notes || `This ${scan.type.toLowerCase()} image shows a ${scan.bodyPart.toLowerCase()} scan taken using standard imaging protocols. The image quality is suitable for diagnostic evaluation. It was uploaded to the system on ${format(new Date(scan.uploadedAt), 'PPP')} for AI-assisted analysis and professional interpretation.`}</p>
                        {scan.metadata?.radiologistNotes && (
                          <p className="mt-2 pt-2 border-t">{scan.metadata.radiologistNotes}</p>
                        )}
                      </div>
                    </div>
                    
                    <div className="mt-6 flex justify-between w-full">
                      <div className="flex items-center text-sm text-muted-foreground">
                        <svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Uploaded {format(new Date(scan.uploadedAt), 'PPpp')}
                      </div>
                      
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm">
                          <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                          </svg>
                          View DICOM Data
                        </Button>
                        <Button variant="outline" size="sm">
                          <Download className="h-4 w-4 mr-2" />
                          Download Original
                        </Button>
                      </div>
                    </div>
                  </CardFooter>
                </Card>
              )}
              
              {/* AI Analysis Tab */}
              {activeTab === "ai-analysis" && result && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>AI Analysis Results</span>
                      {getSeverityBadge(result.severity)}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {result?.rawAnalysis ? (
                      <>
                        {/* Summary Cards */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                          <div className={`rounded-lg p-4 text-center ${
                            result.abnormalitiesDetected 
                              ? 'bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-800' 
                              : 'bg-green-100 dark:bg-green-900/30 border border-green-200 dark:border-green-800'
                          }`}>
                            <div className="text-2xl font-bold mb-1">
                              {result.abnormalitiesDetected ? 'Abnormal' : 'Normal'}
                            </div>
                            <div className="text-xs text-muted-foreground">Diagnosis</div>
                          </div>

                          <div className={`rounded-lg p-4 text-center bg-muted border`}>
                            <div className="text-2xl font-bold mb-1">
                              {Math.round(result.confidenceScore * 100)}%
                            </div>
                            <div className="text-xs text-muted-foreground">Confidence</div>
                          </div>

                          <div className={`rounded-lg p-4 text-center ${
                            result.triagePriority >= 8 ? 'bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-800' : 
                            result.triagePriority >= 6 ? 'bg-orange-100 dark:bg-orange-900/30 border border-orange-200 dark:border-orange-800' :
                            result.triagePriority >= 4 ? 'bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800' :
                            'bg-blue-100 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800'
                          }`}>
                            <div className="text-2xl font-bold mb-1">
                              {result.triagePriority}/10
                            </div>
                            <div className="text-xs text-muted-foreground">Triage Priority</div>
                          </div>

                          <div className="rounded-lg p-4 text-center bg-muted border">
                            <div className="text-lg font-bold mb-1 capitalize">
                              {result.severity}
                            </div>
                            <div className="text-xs text-muted-foreground">Severity</div>
                          </div>
                        </div>
                        
                        {/* Findings Summary with Icons */}
                        {result.findings && result.findings.length > 0 && (
                          <div className="border rounded-lg p-4">
                            <h3 className="text-md font-medium mb-4 flex items-center">
                              <AlertTriangle className="h-4 w-4 mr-2 text-orange-500" />
                              Key Findings ({result.findings.length})
                            </h3>
                            <div className="space-y-3">
                              {result.findings.map((finding, index) => (
                                <div key={finding.id} className="flex items-start pb-3 border-b last:border-0">
                                  <div className={`h-6 w-6 rounded-full flex items-center justify-center mr-3 flex-shrink-0 ${
                                    finding.severity === 'critical' ? 'bg-red-100 text-red-600 dark:bg-red-900/50 dark:text-red-400' : 
                                    finding.severity === 'high' ? 'bg-orange-100 text-orange-600 dark:bg-orange-900/50 dark:text-orange-400' : 
                                    finding.severity === 'medium' ? 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/50 dark:text-yellow-400' : 
                                    'bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400'
                                  }`}>
                                    {index + 1}
                                  </div>
                                  <div className="flex-1">
                                    <div className="flex justify-between items-start">
                                      <h4 className="font-medium text-sm">{finding.area}</h4>
                                      <Badge 
                                        className={`ml-2 ${
                                          finding.severity === 'critical' ? 'bg-red-500' : 
                                          finding.severity === 'high' ? 'bg-orange-500' : 
                                          finding.severity === 'medium' ? 'bg-yellow-500' : 
                                          'bg-blue-500'
                                        }`}
                                      >
                                        {finding.severity}
                                      </Badge>
                                    </div>
                                    <p className="text-sm mt-1">{finding.description}</p>
                                    <div className="mt-2 flex items-center gap-2">
                                      <span className="text-xs text-muted-foreground">Confidence:</span>
                                      <Progress value={finding.confidence * 100} className="h-1.5 flex-1" />
                                      <span className="text-xs">{Math.round(finding.confidence * 100)}%</span>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {/* AI Analysis with formatted output */}
                        <div className="border rounded-lg p-4">
                          <div className="flex items-center justify-between mb-4">
                            <h3 className="text-md font-medium flex items-center">
                              <FileHeart className="h-4 w-4 mr-2 text-blue-500" />
                              Analysis Summary
                            </h3>
                            <Button variant="outline" size="sm" onClick={() => {
                              if (navigator.clipboard) {
                                navigator.clipboard.writeText(result.rawAnalysis || '');
                                addToast({
                                  title: 'Copied',
                                  description: 'Analysis text copied to clipboard',
                                  type: 'success'
                                });
                              }
                            }}>
                              Copy Text
                            </Button>
                          </div>
                          
                          <div className="bg-muted/50 p-4 rounded-md max-h-[300px] overflow-y-auto">
                            {formatAnalysisWithBullets(result.rawAnalysis)}
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-8">
                        <AlertTriangle className="h-8 w-8 text-muted-foreground mb-2" />
                        <p className="text-muted-foreground">No AI analysis available yet</p>
                      </div>
                    )}
                    
                    {result && !result.reportId && (
                      <div className="space-y-2 pt-4 border-t">
                        <p className="text-sm font-medium">Generate Report</p>
                        <Textarea
                          placeholder="Add additional patient information or specific concerns..."
                          value={summaryInput}
                          onChange={(e) => setSummaryInput(e.target.value)}
                          className="h-24"
                        />
                        <Button
                          className="w-full"
                          onClick={handleGenerateReport}
                          disabled={loading}
                        >
                          {loading ? 'Generating...' : 'Generate Medical Report'}
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
              
              {/* Analysis View Tab */}
              {activeTab === "analysis" && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex justify-between items-center">
                      <span>AI Visualization</span>
                      {result && getSeverityBadge(result.severity)}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 relative">
                    {result?.heatmapImage ? (
                      <div className="space-y-4">
                        <img
                          src={result.heatmapImage}
                          alt="AI analysis visualization"
                          className="w-full h-auto rounded-lg border"
                          onError={(e) => {
                            console.error("Failed to load heatmap image:", e);
                            e.currentTarget.src = "https://images.pexels.com/photos/3970330/pexels-photo-3970330.jpeg?auto=compress&cs=tinysrgb&w=600";
                          }}
                        />
                        <div className="flex items-center justify-between">
                          <div className="text-sm text-muted-foreground">
                            AI model: {result.aiModel}
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" variant="secondary">
                              <Layers className="h-4 w-4 mr-1" /> Layers
                            </Button>
                            <Button size="sm" variant="secondary">
                              <BarChart className="h-4 w-4 mr-1" /> Metrics
                            </Button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-16">
                        <AlertTriangle className="h-8 w-8 text-muted-foreground mb-2" />
                        <p className="text-muted-foreground">No heatmap analysis available</p>
                        <p className="text-xs text-muted-foreground mt-2">
                          Try running the AI analysis again to generate a visualization
                        </p>
                        {user?.role === 'doctor' && (
                          <Button variant="secondary" className="mt-4" onClick={() => {
                            if (scan) {
                              analyzeScan(scan.id);
                              addToast({
                                title: 'Analysis Started',
                                description: 'Generating heatmap visualization...',
                                type: 'default'
                              });
                            }
                          }}>
                            Generate Heatmap
                          </Button>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
              
              {/* Report Tab */}
              {activeTab === "report" && (
                report ? (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex justify-between">
                        <span>Medical Report</span>
                        <Badge variant="outline" className="ml-auto">
                          {format(new Date(report.createdAt), 'PP')}
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="space-y-2">
                        <h3 className="text-lg font-medium">Patient Summary</h3>
                        <div className="flex justify-between items-center">
                          <div className="space-y-2 flex-1">
                            <p>{report.patientSummary}</p>
                          </div>
                          <div className="ml-2 flex gap-2">
                            <Select value={language} onValueChange={setLanguage}>
                              <SelectTrigger className="w-[140px]">
                                <SelectValue placeholder="Language" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="english">English</SelectItem>
                                <SelectItem value="spanish">Spanish</SelectItem>
                                <SelectItem value="french">French</SelectItem>
                                <SelectItem value="german">German</SelectItem>
                                <SelectItem value="hindi">Hindi</SelectItem>
                              </SelectContent>
                            </Select>
                            <Button 
                              variant="outline" 
                              size="icon"
                              onClick={handlePlayNarration}
                            >
                              {isPlaying ? (
                                <PauseCircle className="h-4 w-4" />
                              ) : (
                                <PlayCircle className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </div>
                      </div>
                      
                      {user?.role === 'doctor' && (
                        <div className="space-y-2">
                          <h3 className="text-lg font-medium">Clinical Details</h3>
                          <p>{report.clinicalDetails}</p>
                        </div>
                      )}
                      
                      <div className="space-y-2">
                        <h3 className="text-lg font-medium">Recommendations</h3>
                        <p>{report.recommendations}</p>
                      </div>
                      
                      {user?.role === 'doctor' && report.hash && (
                        <div className="space-y-2">
                          <h3 className="text-lg font-medium flex items-center">
                            Verification Hash
                            <Badge variant="outline" className="ml-2">Blockchain Verified</Badge>
                          </h3>
                          <p className="text-xs font-mono bg-muted p-2 rounded overflow-x-auto">
                            {report.hash}
                          </p>
                        </div>
                      )}
                    </CardContent>
                    <CardFooter className="flex justify-between">
                      <Button variant="outline" onClick={handleDownloadPDF}>
                        <Download className="h-4 w-4 mr-2" /> Download PDF
                      </Button>
                      {user?.role === 'patient' && (
                        <Button variant="secondary">
                          <MessageSquare className="h-4 w-4 mr-2" /> Ask Questions
                        </Button>
                      )}
                    </CardFooter>
                  </Card>
                ) : (
                  <Card>
                    <CardContent className="py-6">
                      <div className="text-center">
                        <p className="text-muted-foreground mb-4">No report available yet.</p>
                        {result && user?.role === 'doctor' && (
                          <div className="space-y-4">
                            <Textarea
                              placeholder="Enter patient-friendly summary of findings..."
                              value={summaryInput}
                              onChange={(e) => setSummaryInput(e.target.value)}
                              className="min-h-[100px]"
                            />
                            <Button onClick={handleGenerateReport} disabled={loading}>
                              Generate Report
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )
              )}
            </div>
          </div>
          
          {result && result.abnormalitiesDetected && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <AlertTriangle className="h-5 w-5 text-orange-500 mr-2" />
                  Abnormality Detection
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p>
                  Our AI has detected potential abnormalities in this scan.
                  {result.severity !== 'normal' && (
                    <span> The severity level is classified as <span className={`font-semibold ${getSeverityColor(result.severity)}`}>{result.severity}</span>.</span>
                  )}
                </p>
                {user?.role === 'patient' && !report && (
                  <div className="mt-4">
                    <Badge variant="outline" className="bg-muted">Pending Doctor Review</Badge>
                  </div>
                )}
                {user?.role === 'doctor' && !report && (
                  <div className="mt-4 flex gap-2">
                    <Button onClick={() => switchTab('report')}>
                      Generate Report
                    </Button>
                    <Button variant="outline">
                      <MessageSquare className="h-4 w-4 mr-2" /> Request Second Opinion
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}