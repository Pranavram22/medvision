import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  Bot,
  Send,
  X,
  Brain,
  Heart,
  Activity,
  Stethoscope,
  Bone
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
import { User, Scan, ScanResult, Report, Finding } from '@/types';
import { BeforeAfterUpload } from './BeforeAfterUpload';

interface ScanDetailProps {
  scanId: string;
  onBack: () => void;
}

interface Message {
  id: string;
  role: 'user' | 'ai';
  content: string;
  timestamp: Date;
}

interface AIContext {
  report: {
    patientSummary: string;
    clinicalDetails: string;
    recommendations: string;
  };
  scan: {
    type: string;
    bodyPart: string;
    metadata?: any;
    status: string;
  };
  result: {
    findings: Finding[];
    severity: string;
    rawAnalysis: string;
    confidenceScore: number;
    abnormalitiesDetected: boolean;
    triagePriority: number;
  };
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

// Update TabValue type
type TabValue = 'image' | 'ai-analysis' | 'report';

export function ScanDetail({ scanId, onBack }: ScanDetailProps) {
  const { 
    getScanById, 
    getResultByScanId, 
    getReportByResultId,
    analyzeScan,
    generateReport,
    loading,
    scans
  } = useScan();
  const { authState } = useAuth();
  const { user } = authState;
  const { addToast } = useUI();
  
  const scan = getScanById(scanId);
  const result = getResultByScanId(scanId);
  const report = result?.reportId ? getReportByResultId(result.id) : undefined;
  
  // Update getDefaultTab function
  const getDefaultTab = (): TabValue => {
    if (report) return "report";
    if (result) return "ai-analysis";
    return "image";
  };
  
  // Update tab state
  const [activeTab, setActiveTab] = useState<TabValue>(getDefaultTab());
  
  // Update handleTabChange function
  const handleTabChange = (value: TabValue) => {
    console.log(`Tab changing from ${activeTab} to ${value}`);
    setActiveTab(value);
  };
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [language, setLanguage] = useState('english');
  const [summaryInput, setSummaryInput] = useState('');
  const [showQADialog, setShowQADialog] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [isAiTyping, setIsAiTyping] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  
  // Update useEffect for tab changes
  useEffect(() => {
    if (scanId) {
      const newTab = getDefaultTab();
      console.log('Setting default tab:', newTab);
      setActiveTab(newTab);
    }
  }, [scanId, report, result]);
  
  // Function to scroll chat to bottom
  const scrollToBottom = () => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  };

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Function to handle asking questions to AI
  const handleAskQuestion = async () => {
    if (!currentQuestion.trim() || !report || !result || !scan) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: currentQuestion,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, newMessage]);
    setCurrentQuestion('');
    setIsAiTyping(true);

    try {
      // Prepare comprehensive context for AI response
      const context: AIContext = {
        report: {
          patientSummary: report.patientSummary,
          clinicalDetails: report.clinicalDetails,
          recommendations: report.recommendations
        },
        scan: {
          type: scan.type,
          bodyPart: scan.bodyPart,
          metadata: scan.metadata,
          status: scan.status
        },
        result: {
          findings: result.findings,
          severity: result.severity,
          rawAnalysis: result.rawAnalysis || '',
          confidenceScore: result.confidenceScore,
          abnormalitiesDetected: result.abnormalitiesDetected,
          triagePriority: result.triagePriority
        }
      };

      // Simulate AI processing time
      setTimeout(() => {
        const aiResponse: Message = {
          id: Date.now().toString(),
          role: 'ai',
          content: generateAIResponse(currentQuestion.toLowerCase(), context),
          timestamp: new Date()
        };
        setMessages(prev => [...prev, aiResponse]);
        setIsAiTyping(false);
      }, 1000);
    } catch (error) {
      addToast({
        title: 'Error',
        description: 'Failed to get AI response',
        type: 'error'
      });
      setIsAiTyping(false);
    }
  };

  // Enhanced AI response generation with specific question handling
  const generateAIResponse = (question: string, context: AIContext) => {
    const findings = context.result.findings;
    const severity = context.result.severity;
    const scanType = context.scan.type;
    const bodyPart = context.scan.bodyPart;
    const analysis = context.result.rawAnalysis;

    // Handle different types of questions
    if (question.includes('finding') || question.includes('see') || question.includes('detect')) {
      return `Based on the ${scanType} scan of your ${bodyPart}, we found:\n\n${
        findings.map((f: Finding) => `• ${f.area}: ${f.description}\n  Severity: ${f.severity}\n  Confidence: ${Math.round(f.confidence * 100)}%`).join('\n\n')
      }\n\nOverall severity level: ${severity}\n\nDetailed Analysis:\n${analysis}`;
    }

    if (question.includes('severe') || question.includes('serious')) {
      const criticalFindings = findings.filter((f: Finding) => f.severity === 'critical' || f.severity === 'high');
      return `The overall severity is ${severity}.\n\n${
        criticalFindings.length > 0 
          ? `Critical/High severity findings:\n${
              criticalFindings.map((f: Finding) => `• ${f.area}: ${f.description}`).join('\n')
            }`
          : 'No critical or high severity findings were detected.'
      }\n\nTriage Priority: ${context.result.triagePriority}/10`;
    }

    if (question.includes('recommend') || question.includes('next steps')) {
      return `Based on the scan results, here are the recommendations:\n\n${
        context.report.recommendations
      }\n\n${
        context.report.clinicalDetails 
          ? `Additional clinical context:\n${context.report.clinicalDetails}`
          : ''
      }`;
    }

    // Default comprehensive response
    return `Analysis of your ${scanType} scan of the ${bodyPart}:\n\n${
      context.report.patientSummary
    }\n\nKey Findings:\n${
      findings.map((f: Finding) => `• ${f.area}: ${f.description} (${f.severity} severity)`).join('\n')
    }\n\nConfidence Score: ${Math.round(context.result.confidenceScore * 100)}%\n\nRecommendations:\n${
      context.report.recommendations
    }`;
  };
  
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
  
  // Add report generation loading state
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);

  // Update handleGenerateReport function
  const handleGenerateReport = async () => {
    if (!result) {
      addToast({
        title: 'Error',
        description: 'Please analyze the scan first before generating a report.',
        type: 'warning'
      });
      return;
    }
    
    if (isGeneratingReport) return;
    
    try {
      setIsGeneratingReport(true);
      const reportData = await generateReport(result.id, summaryInput || "Summary of scan findings for patient review.");
      
      // Add success toast
      addToast({
        title: 'Success',
        description: 'Medical report has been generated successfully.',
        type: 'success'
      });

      // Force refresh the report data and switch to report tab
      if (reportData) {
        // Update local state
        setActiveTab("report");
      }
    } catch (error) {
      console.error('Failed to generate report:', error);
      addToast({
        title: 'Error',
        description: 'Failed to generate medical report. Please try again.',
        type: 'error'
      });
    } finally {
      setIsGeneratingReport(false);
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
  
  // Update switchTab function
  const switchTab = (tabValue: 'image' | 'ai-analysis' | 'report') => {
    console.log('Switching to tab:', tabValue);
    handleTabChange(tabValue);
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
      
      {/* Tab Navigation */}
      <div className="bg-muted/30 p-2 rounded flex flex-wrap gap-2 items-center">
        <Button 
          size="sm" 
          variant={activeTab === "image" ? "default" : "outline"} 
          onClick={() => handleTabChange("image")}
        >
          <Layers className="h-4 w-4 mr-2" />
          Image
        </Button>
        <Button 
          size="sm" 
          variant={activeTab === "ai-analysis" ? "default" : "outline"} 
          onClick={() => handleTabChange("ai-analysis")}
          disabled={!result || scan.status === 'uploaded'}
        >
          <Brain className="h-4 w-4 mr-2" />
          AI Analysis
          {!result && <span className="ml-2 text-xs">(Analyze First)</span>}
        </Button>
        <Button 
          size="sm" 
          variant={activeTab === "report" ? "default" : "outline"} 
          onClick={() => handleTabChange("report")}
        >
          <FileHeart className="h-4 w-4 mr-2" />
          Report
          {!report && result && <span className="ml-2 text-xs">(Report Preview)</span>}
        </Button>
        {!result && scan.status === 'uploaded' && (
          <Button
            size="sm"
            variant="secondary"
            onClick={handleAnalyze}
            disabled={loading}
          >
            <Bot className="h-4 w-4 mr-2" />
            {loading ? 'Analyzing...' : 'Start Analysis'}
          </Button>
        )}
        {result && !report && (
          <Button
            size="sm"
            variant="secondary"
            onClick={handleGenerateReport}
            disabled={isGeneratingReport}
          >
            <FileHeart className="h-4 w-4 mr-2" />
            {isGeneratingReport ? 'Generating...' : 'Generate Report'}
          </Button>
        )}
      </div>
      
      <div className="text-xs text-muted-foreground">
        Current tab: {activeTab} | Past scans available: {scans.length - 1}
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
            
            {/* Debug info */}
            <div className="text-xs text-muted-foreground mt-2">
              Current tab: {activeTab} | Has result: {result ? 'Yes' : 'No'} | Has report: {report ? 'Yes' : 'No'}
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
                  <CardContent className="p-4">
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
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          {/* Diagnosis Status */}
                          <div className={`rounded-lg p-4 ${
                            result.abnormalitiesDetected 
                              ? 'bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-800' 
                              : 'bg-green-100 dark:bg-green-900/30 border border-green-200 dark:border-green-800'
                          }`}>
                            <div className="flex flex-col items-center text-center">
                              <div className={`text-2xl font-bold mb-1 ${
                                result.abnormalitiesDetected 
                                  ? 'text-red-700 dark:text-red-400' 
                                  : 'text-green-700 dark:text-green-400'
                              }`}>
                                {result.abnormalitiesDetected ? 'Abnormal' : 'Normal'}
                              </div>
                              <div className="text-xs text-muted-foreground">Diagnosis</div>
                            </div>
                          </div>

                          {/* AI Confidence */}
                          <div className="rounded-lg p-4 bg-muted/50 border">
                            <div className="flex flex-col items-center text-center">
                              <div className="text-2xl font-bold mb-1">
                                {Math.round(result.confidenceScore * 100)}%
                              </div>
                              <div className="text-xs text-muted-foreground">AI Confidence</div>
                              <div className="w-full mt-2">
                                <Progress value={result.confidenceScore * 100} className="h-1.5" />
                              </div>
                            </div>
                          </div>

                          {/* Triage Priority */}
                          <div className={`rounded-lg p-4 ${
                            result.triagePriority >= 8 ? 'bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-800' : 
                            result.triagePriority >= 6 ? 'bg-orange-100 dark:bg-orange-900/30 border border-orange-200 dark:border-orange-800' :
                            result.triagePriority >= 4 ? 'bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800' :
                            'bg-blue-100 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800'
                          }`}>
                            <div className="flex flex-col items-center text-center">
                              <div className={`text-2xl font-bold mb-1 ${
                                result.triagePriority >= 8 ? 'text-red-700 dark:text-red-400' :
                                result.triagePriority >= 6 ? 'text-orange-700 dark:text-orange-400' :
                                result.triagePriority >= 4 ? 'text-yellow-700 dark:text-yellow-400' :
                                'text-blue-700 dark:text-blue-400'
                              }`}>
                                {result.triagePriority}/10
                              </div>
                              <div className="text-xs text-muted-foreground">Triage Priority</div>
                              <div className="w-full mt-2">
                                <Progress 
                                  value={result.triagePriority * 10} 
                                  className={`h-1.5 ${
                                    result.triagePriority >= 8 ? 'bg-red-500' : 
                                    result.triagePriority >= 6 ? 'bg-orange-500' : 
                                    result.triagePriority >= 4 ? 'bg-yellow-500' : 
                                    'bg-blue-500'
                                  }`}
                                />
                              </div>
                            </div>
                          </div>

                          {/* Severity Level */}
                          <div className={`rounded-lg p-4 ${
                            result.severity === 'critical' ? 'bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-800' :
                            result.severity === 'high' ? 'bg-orange-100 dark:bg-orange-900/30 border border-orange-200 dark:border-orange-800' :
                            result.severity === 'medium' ? 'bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800' :
                            'bg-blue-100 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800'
                          }`}>
                            <div className="flex flex-col items-center text-center">
                              <div className={`text-2xl font-bold mb-1 capitalize ${
                                result.severity === 'critical' ? 'text-red-700 dark:text-red-400' :
                                result.severity === 'high' ? 'text-orange-700 dark:text-orange-400' :
                                result.severity === 'medium' ? 'text-yellow-700 dark:text-yellow-400' :
                                'text-blue-700 dark:text-blue-400'
                              }`}>
                                {result.severity}
                              </div>
                              <div className="text-xs text-muted-foreground">Severity Level</div>
                            </div>
                          </div>
                        </div>

                        {/* Findings Section */}
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
                                      <Progress 
                                        value={finding.confidence * 100} 
                                        className={`h-1.5 flex-1 ${
                                          finding.confidence > 0.8 ? 'bg-green-500' :
                                          finding.confidence > 0.6 ? 'bg-yellow-500' :
                                          'bg-orange-500'
                                        }`}
                                      />
                                      <span className="text-xs font-medium">{Math.round(finding.confidence * 100)}%</span>
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
                              Detailed Analysis
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
                  </CardContent>
                </Card>
              )}
              
              {/* Report Tab */}
              {activeTab === "report" && (
                <Card>
                  {report ? (
                    <>
                      <CardHeader>
                        <CardTitle className="flex justify-between items-center">
                          <span>Medical Report</span>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">
                              {format(new Date(report.createdAt), 'PPP')}
                            </Badge>
                            {report.doctorId && (
                              <Badge variant="default">
                                Reviewed by Doctor
                              </Badge>
                            )}
                          </div>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        {/* Patient Summary Section */}
                        <div className="space-y-2">
                          <div className="flex justify-between items-start">
                            <h3 className="text-lg font-medium">Patient Summary</h3>
                            <div className="flex items-center gap-2">
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
                          <div className="bg-muted/50 p-4 rounded-lg">
                            {report.patientSummary || 'No patient summary available.'}
                          </div>
                        </div>

                        {/* Clinical Details Section */}
                        {user?.role === 'doctor' && (
                          <div className="space-y-2">
                            <h3 className="text-lg font-medium">Clinical Details</h3>
                            <div className="bg-muted/50 p-4 rounded-lg">
                              {report.clinicalDetails || 'No clinical details available.'}
                            </div>
                          </div>
                        )}

                        {/* Key Findings Section */}
                        {result?.findings && result.findings.length > 0 && (
                          <div className="space-y-2">
                            <h3 className="text-lg font-medium">Key Findings</h3>
                            <div className="grid gap-3">
                              {result.findings.map((finding) => (
                                <div key={finding.id} className="bg-muted/50 p-4 rounded-lg">
                                  <div className="flex justify-between items-start">
                                    <h4 className="font-medium">{finding.area}</h4>
                                    <Badge className={
                                      finding.severity === 'critical' ? 'bg-red-500' :
                                      finding.severity === 'high' ? 'bg-orange-500' :
                                      finding.severity === 'medium' ? 'bg-yellow-500' :
                                      'bg-blue-500'
                                    }>
                                      {finding.severity}
                                    </Badge>
                                  </div>
                                  <p className="mt-2 text-sm">{finding.description}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Recommendations Section */}
                        <div className="space-y-2">
                          <h3 className="text-lg font-medium">Recommendations</h3>
                          <div className="bg-muted/50 p-4 rounded-lg">
                            {report.recommendations || 'No recommendations available.'}
                          </div>
                        </div>

                        {/* Verification Section */}
                        {user?.role === 'doctor' && report.hash && (
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <h3 className="text-lg font-medium">Verification</h3>
                              <Badge variant="outline" className="bg-green-100 dark:bg-green-900/30">
                                Blockchain Verified
                              </Badge>
                            </div>
                            <div className="bg-muted p-2 rounded-lg">
                              <p className="text-xs font-mono break-all">
                                {report.hash}
                              </p>
                            </div>
                          </div>
                        )}
                      </CardContent>
                      <CardFooter className="flex justify-between border-t pt-6">
                        <div className="flex gap-2">
                          <Button variant="outline" onClick={handleDownloadPDF}>
                            <Download className="h-4 w-4 mr-2" /> Download PDF
                          </Button>
                          <Button variant="outline">
                            <Printer className="h-4 w-4 mr-2" /> Print Report
                          </Button>
                        </div>
                        {user?.role === 'patient' && (
                          <Button variant="secondary" onClick={() => setShowQADialog(true)}>
                            <MessageSquare className="h-4 w-4 mr-2" /> Ask Questions
                          </Button>
                        )}
                      </CardFooter>
                    </>
                  ) : (
                    <CardContent className="py-12">
                      <div className="text-center space-y-4">
                        <div className="flex flex-col items-center">
                          <FileHeart className="h-12 w-12 text-muted-foreground mb-4" />
                          <h3 className="text-lg font-medium mb-2">No Report Available</h3>
                          <p className="text-muted-foreground mb-4">
                            {result ? 'Generate a report to view the detailed medical analysis.' : 'Run an AI analysis first to generate a report.'}
                          </p>
                        </div>
                        
                        {result && user?.role === 'doctor' && (
                          <div className="max-w-md mx-auto space-y-4">
                            <Textarea
                              placeholder="Enter patient-friendly summary and any additional notes..."
                              value={summaryInput}
                              onChange={(e) => setSummaryInput(e.target.value)}
                              className="min-h-[100px]"
                            />
                            <Button 
                              className="w-full" 
                              onClick={handleGenerateReport}
                              disabled={isGeneratingReport}
                            >
                              {isGeneratingReport ? (
                                <>
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2" />
                                  Generating Report...
                                </>
                              ) : (
                                <>
                                  <FileHeart className="h-4 w-4 mr-2" />
                                  Generate Medical Report
                                </>
                              )}
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  )}
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* AI Q&A Dialog */}
      {showQADialog && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50">
          <div className="fixed inset-x-4 top-[10%] bottom-[10%] md:inset-x-[20%] bg-background rounded-lg shadow-lg border p-6 overflow-hidden flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold flex items-center">
                <Bot className="h-5 w-5 mr-2" />
                Ask Questions About Your Scan
              </h2>
              <Button variant="ghost" size="icon" onClick={() => setShowQADialog(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Chat Messages */}
            <div 
              ref={chatContainerRef}
              className="flex-1 overflow-y-auto space-y-4 mb-4 p-4 border rounded-lg"
            >
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-2 ${
                    message.role === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  {message.role === 'ai' && <Bot className="h-6 w-6 flex-shrink-0" />}
                  <div
                    className={`rounded-lg p-3 max-w-[80%] ${
                      message.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{message.content}</p>
                    <p className="text-xs opacity-70 mt-1">
                      {format(message.timestamp, 'HH:mm')}
                    </p>
                  </div>
                </div>
              ))}
              {isAiTyping && (
                <div className="flex gap-2">
                  <Bot className="h-6 w-6" />
                  <div className="bg-muted rounded-lg p-3">
                    <p>AI is typing...</p>
                  </div>
                </div>
              )}
            </div>

            {/* Question Input */}
            <div className="flex gap-2">
              <Textarea
                value={currentQuestion}
                onChange={(e) => setCurrentQuestion(e.target.value)}
                placeholder="Ask any questions about your scan report..."
                className="flex-1"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleAskQuestion();
                  }
                }}
              />
              <Button 
                onClick={handleAskQuestion}
                disabled={!currentQuestion.trim() || isAiTyping}
                className="flex-shrink-0"
              >
                <Send className="h-4 w-4 mr-2" />
                Send
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}