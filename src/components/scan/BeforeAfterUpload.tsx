import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Upload, ArrowRight, RefreshCw, TrendingDown, TrendingUp, Minus, AlertTriangle } from 'lucide-react';
import { useScan } from '@/context/ScanContext';
import { useUI } from '@/context/UIContext';
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
    changeFactors: {
      severityChange: number;
      confidenceChange: number;
      descriptionChange: number;
    };
  }>;
  summary: string;
  recommendations: string[];
  geminiAnalysis: string;
}

// Add helper function for generating detailed analysis
function generateDetailedAnalysis(
  overallChange: 'improved' | 'worsened' | 'stable',
  changePercentage: number,
  beforeSeverity: string,
  afterSeverity: string,
  resolvedCount: number,
  newIssuesCount: number,
  improvedCount: number,
  worsenedCount: number
): string[] {
  const analysis: string[] = [];
  
  // Overall Status
  analysis.push(`Overall Status: ${overallChange.toUpperCase()}`);
  
  // Change Magnitude
  analysis.push(`Change Magnitude: ${changePercentage.toFixed(1)}% ${
    changePercentage >= 75 ? "(Major Change)" :
    changePercentage >= 50 ? "(Significant Change)" :
    changePercentage >= 25 ? "(Moderate Change)" :
    "(Minor Change)"
  }`);
  
  // Severity Progression
  if (beforeSeverity !== afterSeverity) {
    analysis.push(`Severity Progression: ${beforeSeverity.toUpperCase()} → ${afterSeverity.toUpperCase()}`);
  } else {
    analysis.push(`Severity Status: Maintained at ${afterSeverity.toUpperCase()}`);
  }
  
  // Issue Distribution
  analysis.push(`Issue Distribution:
  • Resolved Issues: ${resolvedCount}
  • New Issues: ${newIssuesCount}
  • Improved Areas: ${improvedCount}
  • Worsened Areas: ${worsenedCount}`);
  
  // Trend Analysis
  const totalChanges = resolvedCount + newIssuesCount + improvedCount + worsenedCount;
  const positiveChanges = resolvedCount + improvedCount;
  const negativeChanges = newIssuesCount + worsenedCount;
  
  analysis.push(`Change Pattern:
  • Total Changes: ${totalChanges}
  • Positive Changes: ${positiveChanges} (${((positiveChanges/Math.max(totalChanges, 1))*100).toFixed(1)}%)
  • Negative Changes: ${negativeChanges} (${((negativeChanges/Math.max(totalChanges, 1))*100).toFixed(1)}%)`);
  
  return analysis;
}

export const BeforeAfterUpload: React.FC<BeforeAfterUploadProps> = ({ onComparisonComplete }) => {
  const { uploadScan, analyzeScan, scanResults } = useScan();
  const { addToast } = useUI();
  const [beforeScan, setBeforeScan] = useState<Scan | null>(null);
  const [afterScan, setAfterScan] = useState<Scan | null>(null);
  const [loading, setLoading] = useState(false);
  const [comparisonResult, setComparisonResult] = useState<ComparisonResult | null>(null);

  const handleFileUpload = useCallback(async (file: File, isBeforeScan: boolean) => {
    try {
      setLoading(true);
      setError(null);
      const metadata: Partial<Scan> = {
        type: 'other' as const,
        bodyPart: 'unknown',
        status: 'uploaded' as const
      };

      const scan = await uploadScan(file, metadata);
      const result = await analyzeScan(scan.id);
      
      console.log(`Scan ${isBeforeScan ? 'before' : 'after'} analysis result:`, result);
      
      // Ensure result has a findings array
      const scanWithResult = { 
        ...scan, 
        result: result ? {
          ...result,
          findings: result.findings || []
        } : undefined 
      };

      if (isBeforeScan) {
        setBeforeScan(scanWithResult);
      } else {
        setAfterScan(scanWithResult);
      }
    } catch (error) {
      console.error('Failed to upload scan:', error);
    } finally {
      setLoading(false);
    }
  }, [uploadScan, analyzeScan]);

  const [error, setError] = useState<string | null>(null);
  
  // Create a function to force scan analysis if needed
  const ensureScanAnalyzed = useCallback(async (scan: Scan): Promise<Scan> => {
    if (!scan) return scan;
    
    // If the scan already has a result with findings, return it
    if (scan.result?.findings) {
      console.log(`Scan ${scan.id} already has a result with findings`);
      return scan;
    }
    
    // Check if there's a result in scanResults that we can use
    const existingResult = scanResults.find(result => result.scanId === scan.id);
    if (existingResult) {
      console.log(`Found existing result for scan ${scan.id}`);
      const updatedScan = { 
        ...scan, 
        result: existingResult,
        status: 'analyzed' as const
      };
      
      // Update the scan state based on which scan it is
      if (scan === beforeScan) {
        setBeforeScan(updatedScan);
      } else if (scan === afterScan) {
        setAfterScan(updatedScan);
      }
      
      return updatedScan;
    }
    
    // If the scan has no result at all, try to analyze it
    if (scan.status === 'uploaded') {
      console.log(`Analyzing scan ${scan.id}...`);
      try {
        setLoading(true);
        const result = await analyzeScan(scan.id);
        if (result) {
          const updatedScan = { 
            ...scan, 
            result, 
            status: 'analyzed' as const 
          };
          
          // Update the scan state based on which scan it is
          if (scan === beforeScan) {
            setBeforeScan(updatedScan);
          } else if (scan === afterScan) {
            setAfterScan(updatedScan);
          }
          
          return updatedScan;
        }
      } catch (error) {
        console.error(`Failed to analyze scan ${scan.id}:`, error);
      } finally {
        setLoading(false);
      }
    }
    
    return scan;
  }, [beforeScan, afterScan, analyzeScan, scanResults]);
  
  const compareScans = useCallback(async () => {
    console.log('Before scan:', beforeScan);
    console.log('After scan:', afterScan);
    
    // Check if we have both scans
    if (!beforeScan || !afterScan) {
      setError("Both scans must be uploaded first");
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      // Ensure both scans are analyzed
      const analyzedBeforeScan = await ensureScanAnalyzed(beforeScan);
      const analyzedAfterScan = await ensureScanAnalyzed(afterScan);
      
      // Check if analysis was successful
      if (!analyzedBeforeScan.result || !analyzedAfterScan.result) {
        setError("Failed to analyze one or both scans. Please try again.");
        return;
      }
      
      try {
        // Create safe copies with all required properties initialized
        // This approach completely avoids accessing potentially undefined properties
        const safeBeforeResult = {
          ...analyzedBeforeScan.result,
          findings: Array.isArray(analyzedBeforeScan.result?.findings) ? analyzedBeforeScan.result.findings : [],
          severity: typeof analyzedBeforeScan.result?.severity === 'string' ? analyzedBeforeScan.result.severity : 'normal',
          confidenceScore: typeof analyzedBeforeScan.result?.confidenceScore === 'number' ? analyzedBeforeScan.result.confidenceScore : 0.5
        };
        
        const safeAfterResult = {
          ...analyzedAfterScan.result,
          findings: Array.isArray(analyzedAfterScan.result?.findings) ? analyzedAfterScan.result.findings : [],
          severity: typeof analyzedAfterScan.result?.severity === 'string' ? analyzedAfterScan.result.severity : 'normal',
          confidenceScore: typeof analyzedAfterScan.result?.confidenceScore === 'number' ? analyzedAfterScan.result.confidenceScore : 0.5
        };
        
        console.log('Created safe result objects with all required properties:');
        console.log('Before scan safe result:', safeBeforeResult);
        console.log('After scan safe result:', safeAfterResult);
        
        // Safe access to findings arrays
        const beforeFindings = safeBeforeResult.findings;
        const afterFindings = safeAfterResult.findings;
        
        // Safe severity values
        const beforeSeverity = safeBeforeResult.severity;
        const afterSeverity = safeAfterResult.severity;
        
        console.log('Before severity:', beforeSeverity);
        console.log('After severity:', afterSeverity);
      
        // Define safe severity levels mapping
        const severityLevels = { normal: 0, low: 1, medium: 2, high: 3, critical: 4 };
        
        // Find resolved and new issues with proper error handling
        const resolvedIssues = beforeFindings.filter(before => {
          if (!before || !before.area) return false;
          return !afterFindings.some(after => after && after.area === before.area);
        });
        
        const newIssues = afterFindings.filter(after => {
          if (!after || !after.area) return false;
          return !beforeFindings.some(before => before && before.area === after.area);
        });
        
        console.log('Resolved issues:', resolvedIssues.length);
        console.log('New issues:', newIssues.length);
        
        // Analyze changes in existing issues with defensive programming
        const changedIssues = beforeFindings
          .filter(before => {
            if (!before || !before.area) return false;
            return afterFindings.some(after => after && after.area === before.area);
          })
          .map(before => {
            const after = afterFindings.find(a => a && a.area === before.area);
            
            if (!after) {
              console.log('Warning: No matching after finding for', before.area);
              return null;
            }
            
            // Calculate change intensity using the new function
            const changeAnalysis = calculateChangeIntensity(before, after);
            
            // Determine change type based on severity levels
            const beforeSeverityLevel = severityLevels[before.severity as keyof typeof severityLevels] ?? 0;
            const afterSeverityLevel = severityLevels[after.severity as keyof typeof severityLevels] ?? 0;
            const severityChange = afterSeverityLevel - beforeSeverityLevel;
            
            const change: 'improved' | 'worsened' | 'stable' = 
              severityChange < 0 ? 'improved' : 
              severityChange > 0 ? 'worsened' : 
              'stable';
            
            return {
              area: before.area,
              before,
              after,
              change,
              changePercentage: changeAnalysis.intensity,
              changeFactors: changeAnalysis.factors
            };
          })
          .filter(Boolean) as any[]; // Remove nulls
      
        console.log('Changed issues:', changedIssues.length);
        
        // Safe calculation for improvement percentage
        const totalIssues = Math.max(beforeFindings.length, 1); // Avoid division by zero
        const resolvedCount = resolvedIssues.length;
        const improvedCount = changedIssues.filter(issue => issue && issue.change === 'improved').length;
        const worsenedCount = 
          changedIssues.filter(issue => issue && issue.change === 'worsened').length + 
          newIssues.length;
        
        console.log('Issue counts - Total:', totalIssues, 'Resolved:', resolvedCount, 
                   'Improved:', improvedCount, 'Worsened:', worsenedCount);
                   
        // Calculate improvement score safely
        const improvementScore = ((resolvedCount + improvedCount) - worsenedCount) / totalIssues;
        const changePercentage = Math.abs(improvementScore * 100);
        
        console.log('Improvement score:', improvementScore, 'Change percentage:', changePercentage);
        
        // Determine overall change with safety checks
        const overallChange: ComparisonResult['overallChange'] = 
          improvementScore > 0 ? 'improved' : 
          improvementScore < 0 ? 'worsened' : 
          'stable';
      
        // Generate recommendations, summary, and analysis with safe parameters
        const recommendations = generateRecommendations(
          overallChange,
          newIssues,
          changedIssues,
          afterSeverity
        );
        
        const summary = generateSummary(
          overallChange, 
          changePercentage,
          resolvedIssues, 
          newIssues, 
          changedIssues, 
          beforeSeverity, 
          afterSeverity
        );

        const geminiAnalysis = generateGeminiAnalysis(
          overallChange,
          analyzedBeforeScan.type || 'unknown',
          analyzedBeforeScan.bodyPart || 'unknown',
          beforeFindings,
          afterFindings,
          beforeSeverity,
          afterSeverity
        );
      
      // Create result object and update state
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
      
      // Display toast notification
      addToast({
        title: 'Comparison Complete',
        description: `Analysis shows ${overallChange === 'improved' ? 'improvement' : overallChange === 'worsened' ? 'deterioration' : 'stability'} between the two scans.`,
        type: overallChange === 'improved' ? 'success' : overallChange === 'worsened' ? 'warning' : 'default'
      });
      
      // Update scan statuses - we only do this if we actually have valid scan objects with results
      if (analyzedBeforeScan?.result && analyzedAfterScan?.result) {
        // Create updated copies with the proper type assertions
        const updatedBeforeScan = {...analyzedBeforeScan};
        const updatedAfterScan = {...analyzedAfterScan};
        
        // Update before scan status if it's not already reviewed or completed
        const beforeStatus = updatedBeforeScan.status;
        if (beforeStatus !== 'reviewed' && beforeStatus !== 'completed') {
          updatedBeforeScan.status = 'reviewed' as const;
        }
        
        // Update after scan status if it's not already reviewed or completed
        const afterStatus = updatedAfterScan.status;
        if (afterStatus !== 'reviewed' && afterStatus !== 'completed') {
          updatedAfterScan.status = 'reviewed' as const;
        }
        
        // Update the state with our new copies
        setBeforeScan(updatedBeforeScan);
        setAfterScan(updatedAfterScan);
      }
      } catch (error) {
        console.error('Failed to compare scans:', error);
        setError(`Error comparing scans: ${error instanceof Error ? error.message : String(error)}`);
      } finally {
        setLoading(false);
      }
    } catch (outerError) {
      console.error('Outer error in scan comparison:', outerError);
      setError(`Failed to run comparison: ${outerError instanceof Error ? outerError.message : String(outerError)}`);
      setLoading(false);
    }
  }, [beforeScan, afterScan, onComparisonComplete, ensureScanAnalyzed, addToast]);



  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
          <strong className="font-bold">Error: </strong>
          <span className="block sm:inline">{error}</span>
        </div>
      )}
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
                comparisonResult.overallChange === 'improved' ? "bg-gradient-to-r from-green-200 to-green-500" :
                comparisonResult.overallChange === 'worsened' ? "bg-gradient-to-r from-red-200 to-red-500" :
                "bg-gradient-to-r from-gray-200 to-gray-500"
              )}
            />
            
            <p className="mt-4 text-muted-foreground">
              {comparisonResult.summary}
            </p>

            <div className="mt-6 space-y-2 bg-muted/50 p-4 rounded-lg">
              <h4 className="font-medium mb-3">Detailed Analysis</h4>
              {generateDetailedAnalysis(
                comparisonResult.overallChange,
                comparisonResult.changePercentage,
                beforeScan?.result?.severity || 'normal',
                afterScan?.result?.severity || 'normal',
                comparisonResult.resolvedIssues.length,
                comparisonResult.newIssues.length,
                comparisonResult.changedIssues.filter(i => i.change === 'improved').length,
                comparisonResult.changedIssues.filter(i => i.change === 'worsened').length
              ).map((point: string, index: number) => (
                <div key={index} className="text-sm">
                  {point.includes('•') ? (
                    <div className="ml-4 space-y-1">
                      {point.split('\n').map((subPoint: string, subIndex: number) => (
                        <p key={`${index}-${subIndex}`} className="text-muted-foreground">{subPoint}</p>
                      ))}
                    </div>
                  ) : (
                    <p className="font-medium">{point}</p>
                  )}
                </div>
              ))}
            </div>
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
                <div className="space-y-4">
                  {comparisonResult.changedIssues.map((issue, index) => (
                    <div 
                      key={index} 
                      className={cn(
                        "p-4 rounded-lg border",
                        issue.change === 'improved' ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800" :
                        issue.change === 'worsened' ? "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800" :
                        "bg-gray-50 dark:bg-gray-900/20 border-gray-200 dark:border-gray-800"
                      )}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <span className="font-medium text-lg">{issue.area}</span>
                          <div className="text-sm text-muted-foreground mt-1">
                            Severity: {issue.before.severity.toUpperCase()} → {issue.after.severity.toUpperCase()}
                          </div>
                        </div>
                        <Badge 
                          variant={
                            issue.change === 'improved' ? 'secondary' :
                            issue.change === 'worsened' ? 'destructive' :
                            'secondary'
                          }
                          className="px-3"
                        >
                          {issue.change === 'improved' && (
                            <TrendingDown className="w-3 h-3 mr-1" />
                          )}
                          {issue.change === 'worsened' && (
                            <TrendingUp className="w-3 h-3 mr-1" />
                          )}
                          {issue.change === 'stable' && (
                            <Minus className="w-3 h-3 mr-1" />
                          )}
                          {issue.change.charAt(0).toUpperCase() + issue.change.slice(1)}
                        </Badge>
                      </div>

                      <div className="space-y-4">
                        {/* Description Changes */}
                        <div className="text-sm">
                          <div className="font-medium mb-1">Description Changes:</div>
                          <div className="grid grid-cols-2 gap-4 bg-background/50 p-2 rounded">
                            <div>
                              <div className="text-xs text-muted-foreground mb-1">Before:</div>
                              <p>{issue.before.description}</p>
                            </div>
                            <div>
                              <div className="text-xs text-muted-foreground mb-1">After:</div>
                              <p>{issue.after.description}</p>
                            </div>
                          </div>
                        </div>

                        {/* Change Intensity */}
                        <div>
                          <div className="flex justify-between text-sm mb-1">
                            <span>Change Intensity:</span>
                            <span className="font-medium">
                              {issue.changePercentage}% 
                              {issue.changePercentage >= 75 ? " (Major)" :
                               issue.changePercentage >= 50 ? " (Significant)" :
                               issue.changePercentage >= 25 ? " (Moderate)" :
                               " (Minor)"}
                            </span>
                          </div>
                          <Progress 
                            value={issue.changePercentage} 
                            className={cn(
                              "h-2",
                              issue.change === 'improved' ? "bg-gradient-to-r from-green-200 to-green-500" :
                              issue.change === 'worsened' ? "bg-gradient-to-r from-red-200 to-red-500" :
                              "bg-gradient-to-r from-gray-200 to-gray-500"
                            )}
                          />
                          
                          {/* Change Factors */}
                          <div className="grid grid-cols-3 gap-4 mt-3 text-sm">
                            <div className="bg-background/50 p-2 rounded">
                              <div className="text-xs text-muted-foreground">Severity Change</div>
                              <div className="font-medium mt-1">{issue.changeFactors.severityChange}%</div>
                              <Progress 
                                value={issue.changeFactors.severityChange} 
                                className="h-1 mt-1 bg-blue-500"
                              />
                            </div>
                            <div className="bg-background/50 p-2 rounded">
                              <div className="text-xs text-muted-foreground">Confidence Change</div>
                              <div className="font-medium mt-1">{issue.changeFactors.confidenceChange}%</div>
                              <Progress 
                                value={issue.changeFactors.confidenceChange} 
                                className="h-1 mt-1 bg-purple-500"
                              />
                            </div>
                            <div className="bg-background/50 p-2 rounded">
                              <div className="text-xs text-muted-foreground">Description Change</div>
                              <div className="font-medium mt-1">{issue.changeFactors.descriptionChange}%</div>
                              <Progress 
                                value={issue.changeFactors.descriptionChange} 
                                className="h-1 mt-1 bg-amber-500"
                              />
                            </div>
                          </div>
                        </div>
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
  beforeSeverity: string = 'normal',
  afterSeverity: string = 'normal'
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

// Helper function to generate AI-powered analysis of scan changes
function generateGeminiAnalysis(
  overallChange: ComparisonResult['overallChange'],
  scanType: string = 'unknown',
  bodyPart: string = 'unknown',
  beforeFindings: Finding[] = [],
  afterFindings: Finding[] = [],
  beforeSeverity: string = 'normal',
  afterSeverity: string = 'normal'
): string {
  const changeDescription = {
    improved: 'improvement',
    worsened: 'deterioration',
    stable: 'stability'
  }[overallChange];

  const beforeIssueCount = beforeFindings.length;
  const afterIssueCount = afterFindings.length;
  
  let analysisText = `# Longitudinal Scan Analysis: ${scanType.toUpperCase()} of ${bodyPart.toUpperCase()}\n\n`;
  
  // Add overall assessment
  analysisText += `## OVERALL ASSESSMENT\n`;
  analysisText += `The comparative analysis of your ${scanType} scans shows ${changeDescription} in your condition. `;
  
  if (overallChange === 'improved') {
    analysisText += `There has been a positive progression from ${beforeSeverity.toUpperCase()} to ${afterSeverity.toUpperCase()} severity level. `;
    analysisText += `The number of detected issues has changed from ${beforeIssueCount} to ${afterIssueCount}.\n\n`;
  } else if (overallChange === 'worsened') {
    analysisText += `There has been a negative progression from ${beforeSeverity.toUpperCase()} to ${afterSeverity.toUpperCase()} severity level. `;
    analysisText += `The number of detected issues has changed from ${beforeIssueCount} to ${afterIssueCount}.\n\n`;
  } else {
    analysisText += `Your condition has remained largely unchanged at ${afterSeverity.toUpperCase()} severity level.\n\n`;
  }
  
  // Add detailed findings section
  analysisText += `## DETAILED FINDINGS\n`;
  
  // Resolved issues
  const resolvedIssues = beforeFindings.filter(
    before => !afterFindings.some(after => after.area === before.area)
  );
  
  if (resolvedIssues.length > 0) {
    analysisText += `### Resolved Issues (${resolvedIssues.length})\n`;
    resolvedIssues.forEach(issue => {
      analysisText += `- ${issue.area}: Previously ${issue.severity} severity finding is no longer detected.\n`;
    });
    analysisText += '\n';
  }
  
  // New issues
  const newIssues = afterFindings.filter(
    after => !beforeFindings.some(before => before.area === after.area)
  );
  
  if (newIssues.length > 0) {
    analysisText += `### New Issues (${newIssues.length})\n`;
    newIssues.forEach(issue => {
      analysisText += `- ${issue.area}: New finding detected with ${issue.severity} severity.\n`;
    });
    analysisText += '\n';
  }
  
  // Changed issues
  const commonIssues = beforeFindings.filter(
    before => afterFindings.some(after => after.area === before.area)
  );
  
  if (commonIssues.length > 0) {
    analysisText += `### Progression in Existing Issues (${commonIssues.length})\n`;
    commonIssues.forEach(before => {
      const after = afterFindings.find(a => a.area === before.area)!;
      const changeDirection = before.severity === after.severity ? 'unchanged' :
                              before.severity > after.severity ? 'improved' : 'worsened';
      const changeIndicator = changeDirection === 'improved' ? '↓' :
                             changeDirection === 'worsened' ? '↑' : '→';
      
      analysisText += `- ${before.area}: ${before.severity} ${changeIndicator} ${after.severity}\n`;
      analysisText += `  * Confidence: ${Math.round(before.confidence * 100)}% → ${Math.round(after.confidence * 100)}%\n`;
    });
    analysisText += '\n';
  }
  
  // Conclusion
  analysisText += `## CONCLUSION\n`;
  if (overallChange === 'improved') {
    analysisText += 'The comparison indicates a positive trend in your condition. Continue with your current treatment plan as it appears to be effective.\n';
  } else if (overallChange === 'worsened') {
    analysisText += 'The comparison indicates a negative trend in your condition. A consultation with your healthcare provider is recommended to discuss adjustments to your treatment plan.\n';
  } else {
    analysisText += 'Your condition appears to be stable. Maintain your current treatment plan and continue regular monitoring.\n';
  }
  
  return analysisText;
}

// Add helper function for calculating change intensity
function calculateChangeIntensity(before: Finding, after: Finding): {
  intensity: number;
  factors: {
    severityChange: number;
    confidenceChange: number;
    descriptionChange: number;
  };
} {
  // Severity level mapping
  const severityLevels = { normal: 0, low: 1, medium: 2, high: 3, critical: 4 };
  
  // Calculate severity change (0-4 scale)
  const beforeSeverityLevel = severityLevels[before.severity as keyof typeof severityLevels] ?? 0;
  const afterSeverityLevel = severityLevels[after.severity as keyof typeof severityLevels] ?? 0;
  const severityChange = Math.abs(afterSeverityLevel - beforeSeverityLevel) / 4; // Normalize to 0-1
  
  // Calculate confidence change (already 0-1)
  const beforeConfidence = typeof before.confidence === 'number' ? before.confidence : 0;
  const afterConfidence = typeof after.confidence === 'number' ? after.confidence : 0;
  const confidenceChange = Math.abs(afterConfidence - beforeConfidence);
  
  // Calculate description similarity (basic change detection)
  const beforeDesc = before.description || '';
  const afterDesc = after.description || '';
  const descriptionChange = beforeDesc === afterDesc ? 0 : 0.5;
  
  // Weighted combination of factors
  const weights = {
    severity: 0.5,    // Severity changes are most important
    confidence: 0.3,  // Confidence changes are moderately important
    description: 0.2  // Description changes are least important
  };
  
  const intensity = (
    (severityChange * weights.severity) +
    (confidenceChange * weights.confidence) +
    (descriptionChange * weights.description)
  ) * 100; // Convert to percentage
  
  return {
    intensity: Math.min(Math.round(intensity), 100),
    factors: {
      severityChange: Math.round(severityChange * 100),
      confidenceChange: Math.round(confidenceChange * 100),
      descriptionChange: Math.round(descriptionChange * 100)
    }
  };
}

export default BeforeAfterUpload; 