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
  PauseCircle,
  Check,
  Image as ImageIcon,
  FileText,
  MessagesSquare,
  Brain,
  PieChart,
  LineChart,
  FilePlus2
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
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Scan, ScanResult } from '@/types';

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
  
  const [activeTab, setActiveTab] = useState<string>(getDefaultTab());
  const [isPlaying, setIsPlaying] = useState(false);
  const [language, setLanguage] = useState('english');
  const [summaryInput, setSummaryInput] = useState('');
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<Array<{
    role: 'user' | 'system' | 'ai';
    content: string;
    timestamp: Date;
  }>>([]);
  const [newMessage, setNewMessage] = useState('');
  const [aiThinking, setAiThinking] = useState(false);
  const [reportFormat, setReportFormat] = useState<'standard' | 'detailed' | 'visual'>('standard');
  
  // Reset tab when scan changes
  useEffect(() => {
    if (scanId) {
      setActiveTab(getDefaultTab());
    }
  }, [scanId, report, result]);
  
  // Initialize chat with a welcome message specific to report questions
  useEffect(() => {
    if (chatMessages.length === 0 && report && scan) {
      setChatMessages([{
        role: 'ai',
        content: `Hello! I'm your AI medical assistant. I can help answer questions about your ${scan.type} scan report. What would you like to know about your report?`,
        timestamp: new Date()
      }]);
    }
  }, [chatMessages.length, scan, report]);
  
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
      generateReport(
        result.id, 
        summaryInput || "Summary of scan findings for patient review.",
        reportFormat
      );
      
      addToast({
        title: 'Report Generated',
        description: `${reportFormat.charAt(0).toUpperCase() + reportFormat.slice(1)} report is being generated`,
        type: 'success'
      });
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
  
  const handleSendMessage = async () => {
    if (!newMessage.trim() || aiThinking || !scan || !report) return;
    
    // Add user message
    const userMessage = {
      role: 'user' as const,
      content: newMessage,
      timestamp: new Date()
    };
    
    setChatMessages(prev => [...prev, userMessage]);
    setNewMessage('');
    setAiThinking(true);
    
    try {
      // Generate context for AI based on report content
      let context = `This is a ${scan.type} scan report for the ${scan.bodyPart}.`;
      
      if (report) {
        context += ` Patient summary: ${report.patientSummary}. `;
        context += ` Clinical details: ${report.clinicalDetails}. `;
        context += ` Recommendations: ${report.recommendations}. `;
      }
      
      if (result) {
        context += ` The scan ${result.abnormalitiesDetected ? "shows abnormalities with " + result.severity + " severity" : "shows no significant abnormalities"}.`;
      }
      
      // In production, you would call your AI API here
      // For demo purposes, simulate AI response
      setTimeout(() => {
        const aiResponse = generateReportResponse(userMessage.content, context, report, result);
        setChatMessages(prev => [...prev, {
          role: 'ai' as const,
          content: aiResponse,
          timestamp: new Date()
        }]);
        setAiThinking(false);
      }, 1500);
    } catch (error) {
      console.error('Error generating AI response:', error);
      setChatMessages(prev => [...prev, {
        role: 'system' as const,
        content: 'Sorry, I encountered an error while processing your question about the report. Please try again later.',
        timestamp: new Date()
      }]);
      setAiThinking(false);
    }
  };
  
  // Function to generate AI responses about the report (simulated for demo)
  const generateReportResponse = (question: string, context: string, report: any, result?: ScanResult): string => {
    const lowerQuestion = question.toLowerCase();
    
    if (lowerQuestion.includes('recommendation') || lowerQuestion.includes('next step') || lowerQuestion.includes('advised')) {
      return `Based on your report, the doctor recommends: ${report.recommendations}`;
    }
    
    if (lowerQuestion.includes('summary') || lowerQuestion.includes('overview')) {
      return `Your report summary is: ${report.patientSummary}`;
    }
    
    if (lowerQuestion.includes('clinical') || lowerQuestion.includes('detail') || lowerQuestion.includes('finding')) {
      return `The clinical details in your report state: ${report.clinicalDetails}`;
    }
    
    if (lowerQuestion.includes('explain') || lowerQuestion.includes('mean')) {
      return `Let me explain your report in simpler terms. ${report.patientSummary} This means that ${
        result?.abnormalitiesDetected 
          ? "there were some abnormalities detected that your doctor has documented. " + report.clinicalDetails
          : "your scan appears normal based on the report. " + report.clinicalDetails
      }. Your doctor recommends: ${report.recommendations}`;
    }
    
    // Default response
    return `Based on your medical report for the ${scan.type} scan: ${report.patientSummary}. Your doctor has provided these clinical details: ${report.clinicalDetails}. The recommendations are: ${report.recommendations}. Is there anything specific about the report you'd like me to explain?`;
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
          
          {result && result.findings && result.findings.length > 0 && (
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

          {/* AI Assistant Card */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Brain className="h-4 w-4 text-primary" />
                AI Scan Assistant
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground mb-3">
                Ask questions about your scan and get AI-powered responses based on the analysis.
              </p>
              <Button 
                onClick={() => setChatOpen(true)} 
                className="w-full flex items-center gap-2"
              >
                <MessagesSquare className="h-4 w-4" />
                Ask AI Assistant
              </Button>
            </CardContent>
          </Card>
        </div>
        
        <div className="lg:col-span-2 space-y-6">
          {/* Main content area for scan visualizations */}
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
                </div>
              </CardContent>
            </Card>
          )}
          
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
                    
                    {/* Visual breakdown of findings */}
                    {result.findings && result.findings.length > 0 && (
                      <div className="border rounded-lg p-4">
                        <h3 className="text-md font-medium mb-4 flex items-center">
                          <PieChart className="h-4 w-4 mr-2 text-blue-500" />
                          Findings Breakdown
                        </h3>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {/* Visual severity chart */}
                          <div className="flex flex-col items-center">
                            <h4 className="text-sm font-medium mb-2">Findings by Severity</h4>
                            <div className="w-full h-[180px] p-4 flex items-end justify-around">
                              {['critical', 'high', 'medium', 'low', 'normal'].map(severity => {
                                const count = result.findings.filter(f => f.severity === severity).length;
                                const maxHeight = 120;
                                const height = count ? Math.max(30, (count / result.findings.length) * maxHeight) : 0;
                                
                                const getBarColor = (sev: string) => {
                                  switch(sev) {
                                    case 'critical': return 'bg-red-500';
                                    case 'high': return 'bg-orange-500'; 
                                    case 'medium': return 'bg-yellow-500';
                                    case 'low': return 'bg-blue-500';
                                    default: return 'bg-green-500';
                                  }
                                };
                                
                                return (
                                  <div key={severity} className="flex flex-col items-center">
                                    <div 
                                      className={`${getBarColor(severity)} w-8 rounded-t-md transition-all`} 
                                      style={{ height: `${height}px` }}
                                    ></div>
                                    <div className="text-xs mt-2 capitalize">{severity}</div>
                                    <div className="text-xs font-medium">{count}</div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                          
                          {/* Confidence distribution */}
                          <div className="flex flex-col items-center">
                            <h4 className="text-sm font-medium mb-2">Finding Confidence Levels</h4>
                            <div className="w-full rounded-lg bg-muted/30 p-4">
                              <div className="space-y-3">
                                {result.findings.slice(0, 5).map((finding, idx) => (
                                  <div key={finding.id} className="space-y-1">
                                    <div className="flex justify-between text-xs">
                                      <span className="truncate max-w-[180px]">{finding.area}</span>
                                      <span>{Math.round(finding.confidence * 100)}%</span>
                                    </div>
                                    <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                                      <div 
                                        className={`h-full rounded-full ${
                                          finding.confidence > 0.8 ? 'bg-green-500' : 
                                          finding.confidence > 0.6 ? 'bg-blue-500' : 'bg-yellow-500'
                                        }`}
                                        style={{ width: `${finding.confidence * 100}%` }}
                                      ></div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
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
                    
                    {result && !result.reportId && (
                      <div className="space-y-2 pt-4 border-t">
                        <p className="text-sm font-medium">Generate Report</p>
                        <Textarea
                          placeholder="Add additional patient information or specific concerns..."
                          value={summaryInput}
                          onChange={(e) => setSummaryInput(e.target.value)}
                          className="h-24"
                        />
                        
                        <div className="grid grid-cols-3 gap-2 mb-3">
                          <Button 
                            variant={reportFormat === 'standard' ? 'default' : 'outline'} 
                            size="sm"
                            onClick={() => setReportFormat('standard')}
                            className="w-full"
                          >
                            <FileText className="h-4 w-4 mr-2" />
                            Standard
                          </Button>
                          <Button 
                            variant={reportFormat === 'detailed' ? 'default' : 'outline'} 
                            size="sm"
                            onClick={() => setReportFormat('detailed')}
                            className="w-full"
                          >
                            <FilePlus2 className="h-4 w-4 mr-2" />
                            Detailed
                          </Button>
                          <Button 
                            variant={reportFormat === 'visual' ? 'default' : 'outline'} 
                            size="sm"
                            onClick={() => setReportFormat('visual')}
                            className="w-full"
                          >
                            <LineChart className="h-4 w-4 mr-2" />
                            Visual
                          </Button>
                        </div>
                        
                        <div className="p-3 rounded-md bg-muted/50 mb-3 text-xs text-muted-foreground">
                          {reportFormat === 'standard' && (
                            <p>Standard report includes basic findings and recommendations in a concise format.</p>
                          )}
                          {reportFormat === 'detailed' && (
                            <p>Detailed report includes comprehensive analysis with references to medical literature and detailed explanations.</p>
                          )}
                          {reportFormat === 'visual' && (
                            <p>Visual report includes charts, highlighted regions, and visual explanations to help understand the analysis.</p>
                          )}
                        </div>
                        
                        <Button
                          className="w-full"
                          onClick={handleGenerateReport}
                          disabled={loading}
                        >
                          {loading ? 'Generating...' : 'Generate Medical Report'}
                        </Button>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8">
                    <AlertTriangle className="h-8 w-8 text-muted-foreground mb-2" />
                    <p className="text-muted-foreground">No AI analysis available yet</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* For the Analysis View tab (with the heatmap) */}
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
                  <div className="space-y-6">
                    <div className="relative">
                      <img
                        src={result.heatmapImage}
                        alt="AI analysis visualization"
                        className="w-full h-auto rounded-lg border"
                        onError={(e) => {
                          console.error("Failed to load heatmap image:", e);
                          e.currentTarget.src = "https://images.pexels.com/photos/3970330/pexels-photo-3970330.jpeg?auto=compress&cs=tinysrgb&w=600";
                        }}
                      />
                      
                      {/* Explanation overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent p-4 flex flex-col justify-end text-white rounded-lg opacity-0 hover:opacity-100 transition-opacity">
                        <p className="text-sm font-medium">
                          This heatmap visualization shows areas of interest identified by the AI.
                        </p>
                        <ul className="text-xs mt-2 list-disc pl-4">
                          <li>Red areas indicate potential abnormalities with high confidence</li>
                          <li>Yellow areas indicate regions of moderate concern</li>
                          <li>Blue areas indicate normal tissue or structures</li>
                        </ul>
                      </div>
                    </div>
                    
                    {/* Visual legend */}
                    <div className="flex items-center justify-center gap-6 p-3 bg-muted rounded-lg">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full bg-red-500"></div>
                        <span className="text-xs">High concern</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full bg-yellow-500"></div>
                        <span className="text-xs">Moderate concern</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full bg-blue-500"></div>
                        <span className="text-xs">Normal tissue</span>
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <div className="text-sm text-muted-foreground">
                        AI model: {result.aiModel}
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          variant="secondary"
                          onClick={() => {
                            if (navigator.clipboard) {
                              navigator.clipboard.writeText(`Analysis of ${scan.type} scan for ${scan.bodyPart} shows ${result.abnormalitiesDetected ? `abnormalities with ${result.severity} severity` : 'no significant abnormalities'}.`);
                              addToast({
                                title: 'Copied',
                                description: 'Analysis summary copied to clipboard',
                                type: 'success'
                              });
                            }
                          }}
                        >
                          <FileText className="h-4 w-4 mr-1" /> Copy Summary
                        </Button>
                        <Button 
                          size="sm" 
                          variant="default"
                          onClick={() => {
                            handleGenerateReport();
                          }}
                          disabled={!result || result.reportId || loading}
                        >
                          <FileHeart className="h-4 w-4 mr-1" /> Generate Report
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
                  <Button variant="secondary" onClick={() => setChatOpen(true)}>
                    <Brain className="h-4 w-4 mr-2" /> Ask AI About Report
                  </Button>
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

      {/* Chat Dialog */}
      <Dialog open={chatOpen} onOpenChange={setChatOpen}>
        <DialogContent className="sm:max-w-[500px] max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-primary" />
              AI Report Assistant
            </DialogTitle>
          </DialogHeader>
          
          <ScrollArea className="flex-1 pr-4 my-4">
            <div className="space-y-4">
              {chatMessages.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  <Brain className="h-10 w-10 mx-auto mb-2 opacity-50" />
                  <p>Ask questions about your medical report</p>
                </div>
              ) : (
                chatMessages.map((message, index) => (
                  <div 
                    key={index} 
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div 
                      className={`rounded-lg px-4 py-2 max-w-[80%] ${
                        message.role === 'user' 
                          ? 'bg-primary text-primary-foreground' 
                          : message.role === 'ai' 
                            ? 'bg-blue-100 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800'
                            : 'bg-muted'
                      }`}
                    >
                      {message.role === 'ai' && (
                        <div className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 mb-1">
                          <Brain className="h-3 w-3" /> AI Report Assistant
                        </div>
                      )}
                      <p className="text-sm">{message.content}</p>
                      <p className="text-xs opacity-70 mt-1">
                        {format(message.timestamp, 'h:mm a')}
                      </p>
                    </div>
                  </div>
                ))
              )}
              
              {aiThinking && (
                <div className="flex justify-start">
                  <div className="rounded-lg px-4 py-2 bg-blue-100 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                    <div className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 mb-1">
                      <Brain className="h-3 w-3" /> AI Report Assistant
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="animate-pulse">•</div>
                      <div className="animate-pulse delay-75">•</div>
                      <div className="animate-pulse delay-150">•</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
          
          <DialogFooter className="flex-shrink-0">
            <div className="flex w-full items-center space-x-2">
              <Input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Ask about your medical report..."
                className="flex-1"
                disabled={aiThinking}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
              />
              <Button 
                onClick={handleSendMessage} 
                disabled={aiThinking || !newMessage.trim() || !report} 
                type="submit"
              >
                {aiThinking ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full"></div>
                    <span>Processing</span>
                  </div>
                ) : "Ask AI"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}