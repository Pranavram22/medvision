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

interface ScanDetailProps {
  scanId: string;
  onBack: () => void;
}

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
  
  const scan = getScanById(scanId);
  const result = getResultByScanId(scanId);
  const report = result?.reportId ? getReportByResultId(result.id) : undefined;
  
  // Set the default active tab based on what's available
  const getDefaultTab = () => {
    if (report) return "report";
    if (result) return "ai-analysis";
    return "image";
  };
  
  const [activeTab, setActiveTab] = useState(getDefaultTab());
  const [isPlaying, setIsPlaying] = useState(false);
  const [language, setLanguage] = useState('english');
  const [summaryInput, setSummaryInput] = useState('');
  
  // Update active tab when report becomes available
  useEffect(() => {
    if (report && activeTab !== "report") {
      setActiveTab("report");
    } else if (result && !report && activeTab === "image") {
      setActiveTab("ai-analysis");
    }
  }, [report, result, activeTab]);
  
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
              <Button variant="outline">
                <Download className="h-4 w-4 mr-2" /> Download
              </Button>
            </>
          )}
        </div>
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
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="image">Original Image</TabsTrigger>
              <TabsTrigger value="ai-analysis" disabled={!result}>AI Analysis</TabsTrigger>
              {result?.heatmapImage && (
                <TabsTrigger value="analysis">Analysis View</TabsTrigger>
              )}
              <TabsTrigger value="report" disabled={!report}>Report</TabsTrigger>
            </TabsList>
            <TabsContent value="image" className="mt-4">
              <Card>
                <CardContent className="p-0 relative">
                  <img
                    src={scan.originalImage}
                    alt={`${scan.type} scan of ${scan.bodyPart}`}
                    className="w-full h-auto rounded-lg"
                  />
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="ai-analysis" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <span>Gemini 2.5 Pro AI Analysis</span>
                    {result && getSeverityBadge(result.severity)}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {result?.rawAnalysis ? (
                    <div className="bg-muted p-4 rounded-md max-h-[500px] overflow-y-auto whitespace-pre-wrap text-sm">
                      {result.rawAnalysis}
                    </div>
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
            </TabsContent>
            
            {result?.heatmapImage && (
              <TabsContent value="analysis" className="mt-4">
                <Card>
                  <CardContent className="p-0 relative">
                    <img
                      src={result.heatmapImage}
                      alt="AI analysis visualization"
                      className="w-full h-auto rounded-lg"
                    />
                    <div className="absolute bottom-2 right-2 flex gap-2">
                      <Button size="sm" variant="secondary">
                        <Layers className="h-4 w-4 mr-1" /> Layers
                      </Button>
                      <Button size="sm" variant="secondary">
                        <BarChart className="h-4 w-4 mr-1" /> Metrics
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            )}
            
            <TabsContent value="report" className="mt-4">
              {report ? (
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
                    <Button variant="outline">
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
              )}
            </TabsContent>
          </Tabs>
          
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