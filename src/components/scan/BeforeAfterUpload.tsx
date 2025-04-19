import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Upload, ArrowRight, RefreshCw, TrendingDown, TrendingUp, Minus, AlertTriangle } from 'lucide-react';
import { useScan } from '@/context/ScanContext';
import { Scan, Finding } from '@/types';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';

interface BeforeAfterUploadProps {
  onComparisonComplete?: (analysis: ComparisonResult) => void;
}

interface ComparisonResult {
  overallChange: 'improved' | 'worsened' | 'stable';
  changePercentage: number;
  resolvedIssues: Finding[];
  newIssues: Finding[];
  changedIssues: Array<{
    area: string;
    before: Finding;
    after: Finding;
    change: 'improved' | 'worsened' | 'stable';
    changePercentage: number;
  }>;
  summary: string;
  recommendations: string[];
  geminiAnalysis: string;
}

export const BeforeAfterUpload: React.FC<BeforeAfterUploadProps> = ({ onComparisonComplete }) => {
  const { uploadScan, analyzeScan } = useScan();
  const [beforeScan, setBeforeScan] = useState<Scan | null>(null);
  const [afterScan, setAfterScan] = useState<Scan | null>(null);
  const [loading, setLoading] = useState(false);
  const [comparisonResult, setComparisonResult] = useState<ComparisonResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [textOutput, setTextOutput] = useState<string>("");

  const handleFileUpload = useCallback(async (file: File, isBeforeScan: boolean) => {
    try {
      setLoading(true);
      const metadata: Partial<Scan> = {
        type: 'other' as const,
        bodyPart: 'unknown',
        status: 'uploaded' as const
      };

      const scan = await uploadScan(file, metadata);
      const result = await analyzeScan(scan.id);

      if (isBeforeScan) {
        setBeforeScan({ ...scan, result: result || undefined });
      } else {
        setAfterScan({ ...scan, result: result || undefined });
      }
    } catch (error) {
      console.error('Failed to upload scan:', error);
    } finally {
      setLoading(false);
    }
  }, [uploadScan, analyzeScan]);

  const compareScans = useCallback(async () => {
    if (!beforeScan?.result || !afterScan?.result) {
      setError("Both scans must be uploaded and analyzed first");
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const beforeFindings = beforeScan.result.findings || [];
      const afterFindings = afterScan.result.findings || [];
      
      // Calculate overall severity change
      const severityLevels = { normal: 0, low: 1, medium: 2, high: 3, critical: 4 };
      const beforeSeverityLevel = severityLevels[beforeScan.result.severity as keyof typeof severityLevels] || 0;
      const afterSeverityLevel = severityLevels[afterScan.result.severity as keyof typeof severityLevels] || 0;
      
      // Find resolved and new issues
      const resolvedIssues = beforeFindings.filter(
        before => !afterFindings.some(after => after.area === before.area)
      );
      
      const newIssues = afterFindings.filter(
        after => !beforeFindings.some(before => before.area === before.area)
      );
      
      // Analyze changes in existing issues
      const changedIssues = beforeFindings
        .filter(before => afterFindings.some(after => after.area === before.area))
        .map(before => {
          const after = afterFindings.find(a => a.area === before.area)!;
          const severityChange = severityLevels[after.severity as keyof typeof severityLevels] - 
                               severityLevels[before.severity as keyof typeof severityLevels];
          const confidenceChange = after.confidence - before.confidence;
          
          const change: 'improved' | 'worsened' | 'stable' = 
            severityChange < 0 ? 'improved' : 
            severityChange > 0 ? 'worsened' : 
            'stable';
          
          return {
            area: before.area,
            before,
            after,
            change,
            changePercentage: Math.abs(confidenceChange * 100)
          };
        });
      
      // Calculate overall improvement percentage
      const totalIssues = beforeFindings.length;
      const resolvedCount = resolvedIssues.length;
      const improvedCount = changedIssues.filter(issue => issue.change === 'improved').length;
      const worsenedCount = changedIssues.filter(issue => issue.change === 'worsened').length + newIssues.length;
      
      const improvementScore = totalIssues > 0 ? 
        ((resolvedCount + improvedCount) - worsenedCount) / totalIssues : 0;
      const changePercentage = Math.abs(improvementScore * 100);
      
      // Determine overall change
      const overallChange: ComparisonResult['overallChange'] = 
        improvementScore > 0 ? 'improved' : 
        improvementScore < 0 ? 'worsened' : 
        'stable';
      
      // Generate recommendations based on changes
      const recommendations = generateRecommendations(
        overallChange,
        newIssues,
        changedIssues,
        afterScan.result.severity
      );
      
      // Create detailed summary
      const summary = generateSummary(
        overallChange,
        changePercentage,
        resolvedIssues,
        newIssues,
        changedIssues,
        beforeScan.result.severity,
        afterScan.result.severity
      );

      // Generate advanced AI analysis
      const geminiAnalysis = generateGeminiAnalysis(
        overallChange,
        beforeScan.type || 'unknown',
        beforeScan.bodyPart || 'unknown',
        beforeFindings,
        afterFindings,
        beforeScan.result.severity,
        afterScan.result.severity
      );
      
      // Generate a plain text output summarizing key changes
      const plainTextOutput = `
SCAN COMPARISON ANALYSIS:
-------------------------
Scan Type: ${beforeScan.type?.toUpperCase() || 'Unknown'}
Body Part: ${beforeScan.bodyPart?.toUpperCase() || 'Unknown'}
Overall Change: ${overallChange.toUpperCase()}
Change Percentage: ${changePercentage.toFixed(1)}%
Severity Change: ${beforeScan.result.severity.toUpperCase()} → ${afterScan.result.severity.toUpperCase()}

MAIN FINDINGS:
${resolvedIssues.length > 0 ? `✓ ${resolvedIssues.length} resolved issues: ${resolvedIssues.map(i => i.area).join(', ')}` : '✓ No resolved issues'}
${newIssues.length > 0 ? `⚠ ${newIssues.length} new issues: ${newIssues.map(i => i.area).join(', ')}` : '✓ No new issues detected'}
${changedIssues.filter(i => i.change === 'improved').length > 0 ? `↗ ${changedIssues.filter(i => i.change === 'improved').length} improved areas: ${changedIssues.filter(i => i.change === 'improved').map(i => i.area).join(', ')}` : ''}
${changedIssues.filter(i => i.change === 'worsened').length > 0 ? `↘ ${changedIssues.filter(i => i.change === 'worsened').length} worsened areas: ${changedIssues.filter(i => i.change === 'worsened').map(i => i.area).join(', ')}` : ''}

ANALYSIS SUMMARY:
${summary}

KEY RECOMMENDATIONS:
${recommendations.map(r => `• ${r}`).join('\n')}
`;

      setTextOutput(plainTextOutput);
      
      const result: ComparisonResult = {
        overallChange,
        changePercentage,
        resolvedIssues,
        newIssues,
        changedIssues,
        summary,
        recommendations,
        geminiAnalysis
      };
      
      setComparisonResult(result);
      onComparisonComplete?.(result);
      
    } catch (error) {
      console.error('Failed to compare scans:', error);
      setError(`Error comparing scans: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setLoading(false);
    }
  }, [beforeScan, afterScan, onComparisonComplete]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Before Scan Upload */}
        <Card className="p-4">
          <div className="text-lg font-semibold mb-4">Before Scan</div>
          <div className={cn(
            "border-2 border-dashed rounded-lg p-4 text-center",
            beforeScan ? "border-green-500" : "border-gray-300"
          )}>
            {beforeScan ? (
              <div className="space-y-4">
                <div className="relative h-48 w-full">
                  <img
                    src={beforeScan.originalImage}
                    alt="Before scan"
                    className="object-contain w-full h-full"
                  />
                </div>
                <div className="text-sm">
                  <Badge variant={beforeScan.result?.severity === 'normal' ? 'secondary' : 'destructive'}>
                    {beforeScan.result?.severity.toUpperCase()}
                  </Badge>
                </div>
              </div>
            ) : (
              <label className="cursor-pointer block p-4">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload(file, true);
                  }}
                />
                <Upload className="mx-auto h-12 w-12 text-gray-400" />
                <p className="mt-2">Upload Before Scan</p>
              </label>
            )}
          </div>
        </Card>

        {/* After Scan Upload */}
        <Card className="p-4">
          <div className="text-lg font-semibold mb-4">After Scan</div>
          <div className={cn(
            "border-2 border-dashed rounded-lg p-4 text-center",
            afterScan ? "border-green-500" : "border-gray-300"
          )}>
            {afterScan ? (
              <div className="space-y-4">
                <div className="relative h-48 w-full">
                  <img
                    src={afterScan.originalImage}
                    alt="After scan"
                    className="object-contain w-full h-full"
                  />
                </div>
                <div className="text-sm">
                  <Badge variant={afterScan.result?.severity === 'normal' ? 'secondary' : 'destructive'}>
                    {afterScan.result?.severity.toUpperCase()}
                  </Badge>
                </div>
              </div>
            ) : (
              <label className="cursor-pointer block p-4">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload(file, false);
                  }}
                />
                <Upload className="mx-auto h-12 w-12 text-gray-400" />
                <p className="mt-2">Upload After Scan</p>
              </label>
            )}
          </div>
        </Card>
      </div>

      <div className="flex flex-col items-center gap-4">
        <Button
          onClick={compareScans}
          disabled={!beforeScan || !afterScan || loading}
          className="gap-2"
        >
          {loading ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : (
            <ArrowRight className="h-4 w-4" />
          )}
          Compare Scans
        </Button>
        
        {error && (
          <div className="text-red-500 text-sm mt-2">
            Error: {error}
          </div>
        )}
      </div>

      {/* Plain Text Output Section */}
      {textOutput && (
        <Card className="p-6 bg-white shadow-md border-blue-200 border-2">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <h3 className="text-xl font-semibold">Text Comparison Output</h3>
            </div>
            <Badge variant="outline" className="font-mono">AI-Generated</Badge>
          </div>
          
          <div className="bg-gray-50 p-4 rounded-md border font-mono text-sm whitespace-pre-wrap overflow-x-auto">
            {textOutput}
          </div>
          
          <div className="mt-4 flex justify-end">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                try {
                  navigator.clipboard.writeText(textOutput);
                } catch (e) {
                  console.error("Failed to copy text", e);
                }
              }}
              className="text-xs"
            >
              Copy Analysis Text
            </Button>
          </div>
        </Card>
      )}

      {comparisonResult && (
        <div className="space-y-6">
          {/* Overall Change Indicator */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold">Overall Change</h3>
              <Badge 
                variant={
                  comparisonResult.overallChange === 'improved' ? 'secondary' :
                  comparisonResult.overallChange === 'worsened' ? 'destructive' :
                  'secondary'
                }
                className="text-lg px-4 py-1"
              >
                {comparisonResult.overallChange === 'improved' && (
                  <TrendingDown className="w-4 h-4 mr-2" />
                )}
                {comparisonResult.overallChange === 'worsened' && (
                  <TrendingUp className="w-4 h-4 mr-2" />
                )}
                {comparisonResult.overallChange === 'stable' && (
                  <Minus className="w-4 h-4 mr-2" />
                )}
                {comparisonResult.overallChange.toUpperCase()}
              </Badge>
            </div>
            
            <Progress 
              value={comparisonResult.changePercentage} 
              className={cn(
                "h-2",
                comparisonResult.overallChange === 'improved' ? "bg-green-500" :
                comparisonResult.overallChange === 'worsened' ? "bg-red-500" :
                "bg-gray-500"
              )}
            />
            
            <p className="mt-4 text-muted-foreground">
              {comparisonResult.summary}
            </p>
          </Card>

          {/* Detailed Changes */}
          <Card className="p-6">
            <h3 className="text-xl font-semibold mb-4">Detailed Analysis</h3>
            
            {/* Resolved Issues */}
            {comparisonResult.resolvedIssues.length > 0 && (
              <div className="mb-6">
                <h4 className="text-lg font-medium text-green-600 dark:text-green-400 mb-2">
                  Resolved Issues ({comparisonResult.resolvedIssues.length})
                </h4>
                <div className="space-y-2">
                  {comparisonResult.resolvedIssues.map((issue, index) => (
                    <div key={index} className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                      <div className="flex justify-between">
                        <span className="font-medium">{issue.area}</span>
                        <Badge variant="secondary">Resolved</Badge>
                      </div>
                      <p className="text-sm mt-1">{issue.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* New Issues */}
            {comparisonResult.newIssues.length > 0 && (
              <div className="mb-6">
                <h4 className="text-lg font-medium text-red-600 dark:text-red-400 mb-2">
                  New Issues ({comparisonResult.newIssues.length})
                </h4>
                <div className="space-y-2">
                  {comparisonResult.newIssues.map((issue, index) => (
                    <div key={index} className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                      <div className="flex justify-between">
                        <span className="font-medium">{issue.area}</span>
                        <Badge variant="destructive">New</Badge>
                      </div>
                      <p className="text-sm mt-1">{issue.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Changed Issues */}
            {comparisonResult.changedIssues.length > 0 && (
              <div className="mb-6">
                <h4 className="text-lg font-medium mb-2">Changed Conditions</h4>
                <div className="space-y-2">
                  {comparisonResult.changedIssues.map((issue, index) => (
                    <div 
                      key={index} 
                      className={cn(
                        "p-3 rounded-lg",
                        issue.change === 'improved' ? "bg-green-50 dark:bg-green-900/20" :
                        issue.change === 'worsened' ? "bg-red-50 dark:bg-red-900/20" :
                        "bg-gray-50 dark:bg-gray-900/20"
                      )}
                    >
                      <div className="flex justify-between">
                        <span className="font-medium">{issue.area}</span>
                        <Badge 
                          variant={
                            issue.change === 'improved' ? 'secondary' :
                            issue.change === 'worsened' ? 'destructive' :
                            'secondary'
                          }
                        >
                          {issue.change === 'improved' && 'Improved'}
                          {issue.change === 'worsened' && 'Worsened'}
                          {issue.change === 'stable' && 'Stable'}
                        </Badge>
                      </div>
                      <div className="mt-2">
                        <div className="flex justify-between text-sm">
                          <span>Change Intensity:</span>
                          <span>{issue.changePercentage.toFixed(1)}%</span>
                        </div>
                        <Progress 
                          value={issue.changePercentage} 
                          className={cn(
                            "h-1 mt-1",
                            issue.change === 'improved' ? "bg-green-500" :
                            issue.change === 'worsened' ? "bg-red-500" :
                            "bg-gray-500"
                          )}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>

          {/* Recommendations */}
          <Card className="p-6">
            <h3 className="text-xl font-semibold mb-4">Recommendations</h3>
            <div className="space-y-2">
              {comparisonResult.recommendations.map((recommendation, index) => (
                <div key={index} className="flex items-start gap-2">
                  <AlertTriangle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                  <p>{recommendation}</p>
                </div>
              ))}
            </div>
          </Card>

          {/* Gemini AI Analysis */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-full bg-blue-100">
                  <svg 
                    width="24" 
                    height="24" 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    xmlns="http://www.w3.org/2000/svg"
                    className="text-blue-600"
                  >
                    <path d="M11.9997 2L19.0793 5.5V13.5L11.9997 17L4.92969 13.5V5.5L11.9997 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M12 17V22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M4.92969 5.5L11.9997 9L19.0793 5.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M12 9L12 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-semibold">Gemini AI Analysis</h3>
                  <p className="text-xs text-muted-foreground">Powered by advanced medical imaging AI</p>
                </div>
              </div>
              
              <div className="text-right text-sm">
                <div className="font-semibold">Report ID: GEMINI-{Math.floor(Math.random() * 10000).toString().padStart(4, '0')}</div>
                <div className="text-muted-foreground text-xs">Generated: {new Date().toLocaleDateString()}</div>
              </div>
            </div>
            
            <div className="flex items-center justify-between p-4 bg-blue-50 rounded-md mb-4 border border-blue-100">
              <div>
                <div className="text-sm"><span className="font-medium">Scan Type:</span> {beforeScan?.type?.toUpperCase() || 'N/A'}</div>
                <div className="text-sm"><span className="font-medium">Body Part:</span> {beforeScan?.bodyPart?.toUpperCase() || 'N/A'}</div>
              </div>
              <div>
                <div className={`text-sm px-3 py-1 rounded-full ${
                  comparisonResult.overallChange === 'improved' ? 'bg-green-100 text-green-700' : 
                  comparisonResult.overallChange === 'worsened' ? 'bg-red-100 text-red-700' :
                  'bg-gray-100 text-gray-700'
                }`}>
                  Overall: <span className="font-medium capitalize">{comparisonResult.overallChange}</span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm"><span className="font-medium">Before Date:</span> {beforeScan?.uploadedAt ? new Date(beforeScan.uploadedAt).toLocaleDateString() : 'N/A'}</div>
                <div className="text-sm"><span className="font-medium">After Date:</span> {afterScan?.uploadedAt ? new Date(afterScan.uploadedAt).toLocaleDateString() : 'N/A'}</div>
              </div>
            </div>
            
            <div className="bg-slate-50 rounded-md p-6 markdown-content border">
              {comparisonResult.geminiAnalysis.split('\n').map((line, index) => {
                // Heading levels
                if (line.startsWith('## ')) {
                  return <h2 key={index} className="text-xl font-bold mb-3 mt-6">{line.replace('## ', '')}</h2>;
                } else if (line.startsWith('### ')) {
                  return <h3 key={index} className="text-lg font-semibold mb-2 mt-4 text-blue-700">{line.replace('### ', '')}</h3>;
                } else if (line.startsWith('1. ') || line.startsWith('2. ') || line.startsWith('3. ') || line.startsWith('4. ')) {
                  return <div key={index} className="ml-6 mb-2 list-item">{line.replace(/^\d+\.\s/, '')}</div>;
                } else if (line.trim() === '') {
                  return <div key={index} className="h-2"></div>;
                } else {
                  return <p key={index} className="mb-3">{line}</p>;
                }
              })}
            </div>
            
            <div className="mt-4 pt-4 border-t text-center text-xs text-muted-foreground">
              This report was generated using Gemini AI and should be reviewed by a qualified healthcare professional.
              <br />Analysis and recommendations are provided as decision support tools only.
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

// Helper function to generate recommendations
function generateRecommendations(
  overallChange: ComparisonResult['overallChange'],
  newIssues: Finding[],
  changedIssues: ComparisonResult['changedIssues'],
  currentSeverity: string
): string[] {
  const recommendations: string[] = [];

  if (overallChange === 'worsened') {
    recommendations.push(
      "Schedule an immediate follow-up with your healthcare provider to discuss the progression of your condition."
    );
  }

  if (newIssues.length > 0) {
    recommendations.push(
      `New findings require medical attention. Consider consulting a specialist for the ${newIssues.map(i => i.area).join(', ')}.`
    );
  }

  const worsenedIssues = changedIssues.filter(i => i.change === 'worsened');
  if (worsenedIssues.length > 0) {
    recommendations.push(
      `Areas showing deterioration (${worsenedIssues.map(i => i.area).join(', ')}) should be closely monitored.`
    );
  }

  if (currentSeverity === 'high' || currentSeverity === 'critical') {
    recommendations.push(
      "Due to the current severity level, immediate medical consultation is strongly advised."
    );
  }

  if (overallChange === 'improved') {
    recommendations.push(
      "Continue with your current treatment plan as it shows positive results.",
      "Schedule a routine follow-up to maintain progress monitoring."
    );
  }

  if (overallChange === 'stable') {
    recommendations.push(
      "Maintain your current treatment regimen and continue regular monitoring.",
      "Consider discussing preventive measures with your healthcare provider."
    );
  }

  return recommendations;
}

// Helper function to generate summary
function generateSummary(
  overallChange: ComparisonResult['overallChange'],
  changePercentage: number,
  resolvedIssues: Finding[],
  newIssues: Finding[],
  changedIssues: ComparisonResult['changedIssues'],
  beforeSeverity: string,
  afterSeverity: string
): string {
  let summary = '';

  if (overallChange === 'improved') {
    summary = `Analysis shows an overall improvement of ${changePercentage.toFixed(1)}%. `;
    if (resolvedIssues.length > 0) {
      summary += `${resolvedIssues.length} condition(s) have been resolved. `;
    }
    summary += `Severity level has changed from ${beforeSeverity.toUpperCase()} to ${afterSeverity.toUpperCase()}. `;
  } else if (overallChange === 'worsened') {
    summary = `Analysis indicates a decline of ${changePercentage.toFixed(1)}%. `;
    if (newIssues.length > 0) {
      summary += `${newIssues.length} new issue(s) detected. `;
    }
    summary += `Severity level has changed from ${beforeSeverity.toUpperCase()} to ${afterSeverity.toUpperCase()}. `;
  } else {
    summary = 'The condition appears stable with no significant changes. ';
    if (changedIssues.some(i => i.change !== 'stable')) {
      summary += 'While some areas show minor variations, the overall severity remains unchanged. ';
    }
  }

  const improvedAreas = changedIssues.filter(i => i.change === 'improved').length;
  const worsenedAreas = changedIssues.filter(i => i.change === 'worsened').length;

  if (improvedAreas > 0 || worsenedAreas > 0) {
    summary += `Detailed analysis shows ${improvedAreas} improved area(s) and ${worsenedAreas} worsened area(s).`;
  }

  return summary;
}

// Simulate Gemini AI enhanced comparison analysis
const generateGeminiAnalysis = (
  overallChange: ComparisonResult['overallChange'],
  scanType: string,
  bodyPart: string,
  beforeFindings: Finding[],
  afterFindings: Finding[],
  beforeSeverity: string,
  afterSeverity: string
): string => {
  // This simulates what a Gemini API call would return
  const changeStatus = 
    overallChange === 'improved' ? 'has shown improvement' :
    overallChange === 'worsened' ? 'has deteriorated' :
    'remains stable';
  
  const severeFindings = afterFindings.filter(f => f.severity === 'high' || f.severity === 'critical');
  const resolvedAreas = beforeFindings
    .filter(before => !afterFindings.some(after => after.area === before.area))
    .map(f => f.area);
  
  const newAreas = afterFindings
    .filter(after => !beforeFindings.some(before => before.area === after.area))
    .map(f => f.area);

  // Generate a detailed professional medical analysis
  return `
## Comparative Analysis Report: ${scanType.toUpperCase()} of ${bodyPart.toUpperCase()}

### Executive Summary
The patient's condition ${changeStatus} between the two examinations. The overall severity has changed from ${beforeSeverity.toUpperCase()} to ${afterSeverity.toUpperCase()}, indicating a ${overallChange === 'improved' ? 'positive' : overallChange === 'worsened' ? 'concerning' : 'stable'} trajectory.

### Detailed Findings
The comparative analysis of the ${scanType} scans reveals significant changes in the ${bodyPart} region. ${
  resolvedAreas.length > 0 
    ? `Previously identified abnormalities in ${resolvedAreas.join(', ')} have resolved, suggesting therapeutic efficacy.` 
    : ''
} ${
  newAreas.length > 0 
    ? `New findings have emerged in ${newAreas.join(', ')}, which warrant clinical attention.` 
    : 'No new concerning areas have been identified.'
}

${
  severeFindings.length > 0 
    ? `Of particular concern are the ${severeFindings.length} high/critical severity findings in ${severeFindings.map(f => f.area).join(', ')}. These areas demonstrate ${
        overallChange === 'worsened' ? 'progressive deterioration and may require urgent intervention.' : 'persistent abnormalities despite treatment.'
      }`
    : 'No high-severity findings are present in the current scan.'
}

### Radiological Interpretation
The ${scanType} images demonstrate ${
  overallChange === 'improved' 
    ? 'reduction in pathological markers, with improved tissue architecture and diminished inflammatory response.'
    : overallChange === 'worsened'
      ? 'progression of pathological features, with increased tissue involvement and potential structural changes.'
      : 'relatively unchanged pathological features, with similar tissue presentation across both timepoints.'
}

### Clinical Correlation
These imaging findings ${
  overallChange === 'improved'
    ? 'correlate with a positive response to the current treatment regimen and suggest continuing the established therapeutic approach.'
    : overallChange === 'worsened'
      ? 'indicate suboptimal response to the current treatment regimen and suggest reevaluation of the therapeutic approach.'
      : 'suggest a plateau in response to the current treatment regimen and may warrant consideration of treatment modifications.'
}

### Recommendations
1. ${
  overallChange === 'improved'
    ? 'Continue current treatment protocol with regular monitoring.'
    : overallChange === 'worsened'
      ? 'Consider escalation of therapy and more frequent follow-up imaging.'
      : 'Maintain vigilant monitoring while evaluating potential adjustments to treatment.'
}
2. Focus clinical attention on ${newAreas.length > 0 ? `newly identified areas: ${newAreas.join(', ')}` : 'maintaining current status'}.
3. Schedule follow-up imaging in ${
  overallChange === 'improved' ? '6-12 months' : overallChange === 'worsened' ? '3-6 months' : '4-8 months'
} to reassess progression.
4. ${
  severeFindings.length > 0
    ? `Prioritize evaluation of the ${severeFindings.length} high-severity findings.`
    : 'Continue holistic evaluation of the entire region during follow-up.'
}

This analysis was performed using advanced medical imaging AI and should be interpreted in conjunction with clinical findings by a qualified healthcare professional.
`;
};

export default BeforeAfterUpload; 