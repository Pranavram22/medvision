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
}

export const BeforeAfterUpload: React.FC<BeforeAfterUploadProps> = ({ onComparisonComplete }) => {
  const { uploadScan, analyzeScan } = useScan();
  const [beforeScan, setBeforeScan] = useState<Scan | null>(null);
  const [afterScan, setAfterScan] = useState<Scan | null>(null);
  const [loading, setLoading] = useState(false);
  const [comparisonResult, setComparisonResult] = useState<ComparisonResult | null>(null);

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
    if (!beforeScan?.result || !afterScan?.result) return;

    setLoading(true);
    try {
      const beforeFindings = beforeScan.result.findings;
      const afterFindings = afterScan.result.findings;
      
      // Calculate overall severity change
      const severityLevels = { normal: 0, low: 1, medium: 2, high: 3, critical: 4 };
      const beforeSeverityLevel = severityLevels[beforeScan.result.severity as keyof typeof severityLevels];
      const afterSeverityLevel = severityLevels[afterScan.result.severity as keyof typeof severityLevels];
      
      // Find resolved and new issues
      const resolvedIssues = beforeFindings.filter(
        before => !afterFindings.some(after => after.area === before.area)
      );
      
      const newIssues = afterFindings.filter(
        after => !beforeFindings.some(before => before.area === after.area)
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
      
      const improvementScore = ((resolvedCount + improvedCount) - worsenedCount) / totalIssues;
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
      
      const result: ComparisonResult = {
        overallChange,
        changePercentage,
        resolvedIssues,
        newIssues,
        changedIssues,
        summary,
        recommendations
      };
      
      setComparisonResult(result);
      onComparisonComplete?.(result);
      
    } catch (error) {
      console.error('Failed to compare scans:', error);
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

      <div className="flex justify-center gap-4">
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
      </div>

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

export default BeforeAfterUpload; 