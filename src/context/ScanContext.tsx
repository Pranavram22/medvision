import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { Scan, ScanResult, Report } from '@/types';
import { useUI } from './UIContext';
import { AIService } from '@/lib/ai';
import { mockScans, mockScanResults, mockReports, initializeMockData } from '@/data/mockData';
import {
  processAndStoreImage,
  getImageData,
  storeScansMetadata,
  getScansMetadata,
  revokeImageUrl,
  cleanupUnusedImages
} from '@/lib/storage';

// Helper function to fetch and create blob URLs for scans
const hydrateScansWithImages = async (scans: Scan[]): Promise<Scan[]> => {
  const hydratedScans = await Promise.all(
    scans.map(async (scan) => {
      try {
        const imageUrl = await getImageData(scan.id);
        return { ...scan, originalImage: imageUrl || scan.originalImage };
      } catch (error) {
        console.error(`Failed to hydrate scan ${scan.id}:`, error);
        return scan;
      }
    })
  );
  return hydratedScans;
};

interface ScanContextProps {
  scans: Scan[];
  scanResults: ScanResult[];
  reports: Report[];
  loading: boolean;
  error: string | null;
  uploadScan: (file: File, metadata: Partial<Scan>) => Promise<Scan>;
  analyzeScan: (scanId: string) => Promise<ScanResult | null>;
  getScanById: (id: string) => Scan | undefined;
  getResultByScanId: (scanId: string) => ScanResult | undefined;
  getReportByResultId: (resultId: string) => Report | undefined;
  generateReport: (resultId: string, patientSummary: string) => Promise<Report | null>;
}

const ScanContext = createContext<ScanContextProps | null>(null);

export const ScanProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [scans, setScans] = useState<Scan[]>([]);
  const [scanResults, setScanResults] = useState<ScanResult[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { addToast } = useUI();

  // Load scans from storage on initial load
  useEffect(() => {
    const loadPersistedData = async () => {
      try {
        setLoading(true);
        // Load scans metadata
        const persistedScans = getScansMetadata();
        
        if (persistedScans.length === 0) {
          // Initialize mock data if no persisted data exists
          await initializeMockData();
          const hydratedMockScans = await hydrateScansWithImages(mockScans);
          setScans(hydratedMockScans);
          storeScansMetadata(mockScans);
          
          // Store mock results and reports
          localStorage.setItem('medvision_scan_results', JSON.stringify(mockScanResults));
          localStorage.setItem('medvision_reports', JSON.stringify(mockReports));
          
          setScanResults(mockScanResults);
          setReports(mockReports);
        } else {
          // Hydrate persisted scans with image data
          const hydratedScans = await hydrateScansWithImages(persistedScans);
          setScans(hydratedScans);
          
          // Load persisted results and reports
          const persistedResults = localStorage.getItem('medvision_scan_results');
          const persistedReports = localStorage.getItem('medvision_reports');
          
          setScanResults(persistedResults ? JSON.parse(persistedResults) : []);
          setReports(persistedReports ? JSON.parse(persistedReports) : []);
        }
      } catch (error) {
        console.error("Failed to load persisted data:", error);
        setError("Failed to load scan data. Please refresh the page.");
        addToast({
          title: 'Error',
          description: 'Failed to load scan data. Please refresh the page.',
          type: 'error'
        });
      } finally {
        setLoading(false);
      }
    };

    loadPersistedData();

    // Cleanup function to revoke blob URLs
    return () => {
      scans.forEach(scan => {
        if (scan.originalImage?.startsWith('blob:')) {
          revokeImageUrl(scan.originalImage);
        }
      });
    };
  }, [addToast]);

  // Save scans to storage whenever they change
  useEffect(() => {
    if (scans.length > 0) {
      // Store metadata without blob URLs
      const metadataScans = scans.map(({ originalImage, ...scan }) => ({
        ...scan,
        originalImage: '' // Don't store blob URLs in metadata
      }));
      storeScansMetadata(metadataScans);
      
      // Clean up unused images
      cleanupUnusedImages(scans);
    }
  }, [scans]);

  const uploadScan = useCallback(async (file: File, metadata: Partial<Scan>): Promise<Scan> => {
    setLoading(true);
    setError(null);

    try {
      const scanId = `scan-${Date.now()}`;
      // Process and store the image
      const imageUrl = await processAndStoreImage(URL.createObjectURL(file), scanId);

      // Create new scan object
      const newScan: Scan = {
        id: scanId,
        userId: metadata.userId || '',
        type: metadata.type || 'other',
        bodyPart: metadata.bodyPart || 'unknown',
        originalImage: imageUrl,
        uploadedAt: new Date().toISOString(),
        status: 'uploaded',
        ...metadata
      };

      setScans(prev => [...prev, newScan]);

      addToast({
        title: 'Upload Successful',
        description: 'Your scan has been uploaded successfully.',
        type: 'success'
      });

      return newScan;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to upload scan';
      setError(errorMessage);
      
      addToast({
        title: 'Upload Failed',
        description: errorMessage,
        type: 'error'
      });
      
      throw error;
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  // Analyze a scan
  const analyzeScan = useCallback(async (scanId: string) => {
    setLoading(true);
    setError(null);
    
    try {
      // Update scan status
      setScans(prev => 
        prev.map(scan => 
          scan.id === scanId 
            ? { ...scan, status: 'processing' }
            : scan
        )
      );
      
      // Get the scan
      const scan = scans.find(s => s.id === scanId);
      if (!scan) {
        throw new Error('Scan not found');
      }
      
      // Use AI to analyze the image
      const imageUrl = scan.originalImage;
      
      // Convert URL to base64 for AI analysis
      const imageBase64 = await convertImageUrlToBase64(imageUrl);
      
      // Run AI analysis on the image
      const aiPrompt = "You are a medical imaging expert. Analyze this medical image (which could be an X-ray, CT scan, MRI, Ultrasound, or other medical image) and provide a detailed assessment. First identify what type of scan this is and what body part is shown. Then describe any visible abnormalities, potential diagnoses, and areas of concern. Be thorough and specific in your observations, and include severity levels if applicable.";
      const analysisResult = await AIService.analyzeMedicalImage(imageBase64, aiPrompt);
      
      // Parse the analysis to determine details
      const scanDetails = extractScanDetails(analysisResult);
      
      // Create a result object with the AI analysis
      const newResult: ScanResult = {
        id: `result-${Date.now()}`,
        scanId,
        abnormalitiesDetected: scanDetails.abnormalitiesDetected,
        confidenceScore: 0.95, // High confidence for AI analysis
        aiModel: '',
        findings: scanDetails.findings,
        severity: scanDetails.severity,
        triagePriority: scanDetails.abnormalitiesDetected ? 7 : 2, // Higher priority if abnormalities found
        rawAnalysis: analysisResult,
        processedAt: new Date().toISOString(),
      };
      
      // Update scan details with AI-detected information
      setScans(prev => 
        prev.map(scan => {
          if (scan.id === scanId) {
            return {
              ...scan,
              status: 'analyzed',
              type: scanDetails.scanType as 'xray' | 'ct' | 'mri' | 'ultrasound' | 'other',
              bodyPart: scanDetails.bodyPart
            };
          }
          return scan;
        })
      );
      
      setScanResults(prev => [...prev, newResult]);
      
      addToast({
        title: 'AI Analysis Complete',
        description: scanDetails.abnormalitiesDetected 
          ? 'Potential abnormalities detected in your scan.'
          : 'No significant abnormalities detected in your scan.',
        type: scanDetails.abnormalitiesDetected ? 'warning' : 'success'
      });
      
      // Store data for auto-generating report
      const resultId = newResult.id;
      const patientSummary = `AI analysis of ${scanDetails.scanType} scan of the ${scanDetails.bodyPart}${scanDetails.abnormalitiesDetected ? ' showing potential abnormalities' : ' with no significant abnormalities detected'}.`;
      
      // Schedule auto-report generation after this function completes
      setTimeout(() => {
        autoGenerateReport(resultId, patientSummary);
      }, 100);
      
      return newResult;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to analyze scan';
      setError(errorMessage);
      
      // Revert scan status
      setScans(prev => 
        prev.map(scan => 
          scan.id === scanId 
            ? { ...scan, status: 'uploaded' }
            : scan
        )
      );
      
      addToast({
        title: 'Analysis Failed',
        description: errorMessage,
        type: 'error'
      });
      
      return null;
    } finally {
      setLoading(false);
    }
  }, [scans, addToast]);
  
  // Helper function to auto-generate report (to avoid circular dependency)
  const autoGenerateReport = (resultId: string, patientSummary: string) => {
    try {
      // Create the report
      generateReport(resultId, patientSummary).then(report => {
        if (report) {
          addToast({
            title: 'Report Generated',
            description: 'Medical report has been automatically generated.',
            type: 'success'
          });
        }
      }).catch(error => {
        console.error('Auto-report generation failed:', error);
      });
    } catch (error) {
      console.error('Auto-report generation setup failed:', error);
    }
  };

  // Helper function to convert a URL to base64
  const convertImageUrlToBase64 = async (url: string): Promise<string> => {
    try {
      // For blob URLs, fetch them directly
      const response = await fetch(url);
      const blob = await response.blob();
      
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64String = reader.result as string;
          // Remove the data URL prefix (e.g., "data:image/jpeg;base64,")
          const base64 = base64String.split(',')[1];
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.error('Error converting image to base64:', error);
      throw error;
    }
  };
  
  // Extract structured data from AI analysis text
  const extractScanDetails = (analysisText: string): {
    scanType: 'xray' | 'ct' | 'mri' | 'ultrasound' | 'other';
    bodyPart: string;
    abnormalitiesDetected: boolean;
    findings: Array<{
      id: string;
      area: string;
      description: string;
      confidence: number;
      severity: 'normal' | 'low' | 'medium' | 'high' | 'critical';
    }>;
    severity: 'normal' | 'low' | 'medium' | 'high' | 'critical';
  } => {
    // Default values
    const result = {
      scanType: 'other' as 'xray' | 'ct' | 'mri' | 'ultrasound' | 'other',
      bodyPart: 'unknown',
      abnormalitiesDetected: false,
      findings: [] as Array<{
        id: string;
        area: string;
        description: string;
        confidence: number;
        severity: 'normal' | 'low' | 'medium' | 'high' | 'critical';
      }>,
      severity: 'normal' as 'normal' | 'low' | 'medium' | 'high' | 'critical'
    };
    
    // Try to detect scan type
    if (analysisText.toLowerCase().includes('x-ray') || analysisText.toLowerCase().includes('xray')) {
      result.scanType = 'xray';
    } else if (analysisText.toLowerCase().includes('ct scan') || analysisText.toLowerCase().includes('computed tomography')) {
      result.scanType = 'ct';
    } else if (analysisText.toLowerCase().includes('mri') || analysisText.toLowerCase().includes('magnetic resonance')) {
      result.scanType = 'mri';
    } else if (analysisText.toLowerCase().includes('ultrasound') || analysisText.toLowerCase().includes('sonogram')) {
      result.scanType = 'ultrasound';
    }
    
    // Try to detect body part
    const bodyParts = ['brain', 'chest', 'lung', 'heart', 'abdomen', 'liver', 'kidney', 'spine', 'pelvis', 'shoulder', 'knee', 'ankle', 'wrist', 'hand', 'foot'];
    for (const part of bodyParts) {
      if (analysisText.toLowerCase().includes(part)) {
        result.bodyPart = part;
        break;
      }
    }
    
    // Detect abnormalities
    const abnormalityIndicators = [
      'abnormal', 'abnormality', 'lesion', 'mass', 'tumor', 'fracture', 'break', 
      'inflammation', 'infection', 'pneumonia', 'cancer', 'growth', 'concerning',
      'suspicious', 'pathology', 'irregular', 'deformity', 'degenerative'
    ];
    
    for (const indicator of abnormalityIndicators) {
      if (analysisText.toLowerCase().includes(indicator)) {
        result.abnormalitiesDetected = true;
        break;
      }
    }
    
    // Detect severity
    if (analysisText.toLowerCase().includes('critical') || 
        analysisText.toLowerCase().includes('severe') || 
        analysisText.toLowerCase().includes('emergent') ||
        analysisText.toLowerCase().includes('emergency')) {
      result.severity = 'critical';
    } else if (analysisText.toLowerCase().includes('high severity') || 
               analysisText.toLowerCase().includes('significant') ||
               analysisText.toLowerCase().includes('concerning')) {
      result.severity = 'high';
    } else if (analysisText.toLowerCase().includes('moderate') || 
               analysisText.toLowerCase().includes('medium severity')) {
      result.severity = 'medium';
    } else if (analysisText.toLowerCase().includes('mild') || 
               analysisText.toLowerCase().includes('low severity') ||
               analysisText.toLowerCase().includes('minimal')) {
      result.severity = 'low';
    }
    
    // Create a finding if abnormalities were detected
    if (result.abnormalitiesDetected) {
      result.findings.push({
        id: `finding-${Date.now()}`,
        area: result.bodyPart,
        description: extractMainFinding(analysisText),
        confidence: 0.9,
        severity: result.severity
      });
    }
    
    return result;
  };
  
  // Extract the main finding from the analysis text
  const extractMainFinding = (analysisText: string): string => {
    // Get the first 300 characters of findings if long
    const findingsIndicators = ['finding', 'abnormality', 'observation', 'impression'];
    
    for (const indicator of findingsIndicators) {
      const index = analysisText.toLowerCase().indexOf(indicator);
      if (index !== -1) {
        // Find the end of the sentence or take up to 300 chars
        const excerpt = analysisText.slice(index, index + 300);
        const endIndex = excerpt.indexOf('. ');
        if (endIndex !== -1) {
          return excerpt.slice(0, endIndex + 1);
        }
        return excerpt;
      }
    }
    
    // If no findings section found, return a substring
    return analysisText.slice(0, Math.min(300, analysisText.length)) + '...';
  };

  // Generate a report
  const generateReport = useCallback(async (resultId: string, patientSummary: string) => {
    setLoading(true);
    setError(null);
    
    try {
      // Get the result
      const result = scanResults.find(r => r.id === resultId);
      if (!result) {
        throw new Error('Scan result not found');
      }
      
      // Use the raw AI analysis to generate a report
      const rawAnalysis = result.rawAnalysis || '';
      
      // Create the report with AI-generated content
      const newReport: Report = {
        id: `report-${Date.now()}`,
        scanResultId: resultId,
        patientSummary,
        clinicalDetails: generateClinicalDetails(rawAnalysis, result),
        recommendations: generateRecommendations(rawAnalysis, result),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      setReports(prev => [...prev, newReport]);
      
      // Update result with report ID
      setScanResults(prev => 
        prev.map(r => 
          r.id === resultId 
            ? { ...r, reportId: newReport.id }
            : r
        )
      );
      
      addToast({
        title: 'Report Generated',
        description: 'AI analysis report has been successfully generated.',
        type: 'success'
      });
      
      return newReport;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate report';
      setError(errorMessage);
      
      addToast({
        title: 'Report Generation Failed',
        description: errorMessage,
        type: 'error'
      });
      
      return null;
    } finally {
      setLoading(false);
    }
  }, [scanResults, addToast]);
  
  // Generate clinical details from AI analysis
  const generateClinicalDetails = (analysis: string, result: ScanResult): string => {
    if (!analysis) {
      return 'No clinical details available.';
    }
    
    // Extract the most relevant part of the analysis for clinical details
    const keyTerms = ['clinical', 'diagnosis', 'assessment', 'findings', 'observation'];
    for (const term of keyTerms) {
      const index = analysis.toLowerCase().indexOf(term);
      if (index !== -1) {
        // Extract a meaningful chunk around this term
        const start = Math.max(0, index - 50);
        const end = Math.min(analysis.length, index + 350);
        return analysis.slice(start, end);
      }
    }
    
    // If no key terms found, return a shortened version
    return analysis.slice(0, 300) + '...';
  };
  
  // Generate recommendations from AI analysis
  const generateRecommendations = (analysis: string, result: ScanResult): string => {
    if (result.abnormalitiesDetected) {
      // Look for recommendation sections in the AI analysis
      const recommendationTerms = ['recommend', 'follow-up', 'follow up', 'advised', 'suggest'];
      for (const term of recommendationTerms) {
        const index = analysis.toLowerCase().indexOf(term);
        if (index !== -1) {
          // Extract the sentence containing the recommendation
          const start = analysis.lastIndexOf('.', index) + 1;
          const end = analysis.indexOf('.', index) + 1;
          if (end > start) {
            return analysis.slice(start, end).trim();
          }
        }
      }
      
      // Default recommendations based on severity
      if (result.severity === 'critical') {
        return 'Immediate specialist consultation required. Consider emergency intervention.';
      } else if (result.severity === 'high') {
        return 'Urgent follow-up recommended within 1-2 days. Specialist consultation advised.';
      } else if (result.severity === 'medium') {
        return 'Follow-up recommended within 1-2 weeks. Consider additional imaging if symptoms persist.';
      } else {
        return 'Follow-up at next routine visit. Monitor for any changes in symptoms.';
      }
    } else {
      return 'No abnormalities detected. Routine follow-up as needed.';
    }
  };

  // Helper functions
  const getScanById = useCallback((id: string) => scans.find(s => s.id === id), [scans]);
  
  const getResultByScanId = useCallback(
    (scanId: string) => scanResults.find(r => r.scanId === scanId),
    [scanResults]
  );
  
  const getReportByResultId = useCallback(
    (resultId: string) => reports.find(r => r.scanResultId === resultId),
    [reports]
  );

  return (
    <ScanContext.Provider
      value={{
        scans,
        scanResults,
        reports,
        loading,
        error,
        uploadScan,
        analyzeScan,
        getScanById,
        getResultByScanId,
        getReportByResultId,
        generateReport
      }}
    >
      {children}
    </ScanContext.Provider>
  );
};

export const useScan = () => {
  const context = useContext(ScanContext);
  if (!context) {
    throw new Error('useScan must be used within a ScanProvider');
  }
  return context;
};