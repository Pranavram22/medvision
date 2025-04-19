import { Scan, ScanResult, Report, User, DetectedArea } from '@/types';
import { processAndStoreImage } from '@/lib/storage';

// Sample image URLs (replace these with actual medical scan images)
const sampleImageUrls = [
  '/samples/chest-xray-1.png',
  '/samples/chest-xray-2.png',
  '/samples/brain-ct-1.png',
  '/samples/knee-mri-1.png',
  '/samples/abdomen-ultrasound-1.png'
];

// Define heatmap URLs with proper typing
const heatmapUrls = [
  '/images/heatmaps/heatmap1.png',
  '/images/heatmaps/heatmap2.png',
  '/images/heatmaps/heatmap3.png'
] as [string, string, string];

type HeatmapIndex = 0 | 1 | 2;

// Mock users
export const mockUsers: User[] = [
  {
    id: 'user-1',
    email: 'doctor@smartmed.com',
    name: 'Dr. Sarah Chen',
    role: 'doctor',
    avatar: 'https://images.pexels.com/photos/5452293/pexels-photo-5452293.jpeg?auto=compress&cs=tinysrgb&w=150',
    specialization: 'Radiology',
    licenseNumber: 'MD12345',
    createdAt: '2023-05-15T08:30:00Z',
  },
  {
    id: 'user-2',
    email: 'patient@smartmed.com',
    name: 'Sam Johnson',
    role: 'patient',
    avatar: 'https://images.pexels.com/photos/614810/pexels-photo-614810.jpeg?auto=compress&cs=tinysrgb&w=150',
    createdAt: '2023-06-20T14:45:00Z',
  },
  {
    id: 'user-3',
    email: 'admin@smartmed.com',
    name: 'Alex Rodriguez',
    role: 'admin',
    avatar: 'https://images.pexels.com/photos/1181686/pexels-photo-1181686.jpeg?auto=compress&cs=tinysrgb&w=150',
    createdAt: '2023-04-10T09:15:00Z',
  },
];

// Mock detected areas with proper typing
export const mockDetectedAreas: DetectedArea[] = [
  {
    severity: 'high',
    description: 'Abnormal opacity detected',
    coordinates: { x: 120, y: 150 }
  }
];

// Mock scan results with proper typing
export const mockResults: ScanResult[] = [
  {
    id: 'result-1',
    scanId: 'scan-1',
    abnormalitiesDetected: true,
    confidenceScore: 0.92,
    heatmapImage: heatmapUrls[0],
    aiModel: 'ResNet-50',
    findings: [
      {
        id: 'finding-1',
        area: 'Upper right lobe',
        description: 'Potential nodule detected in upper right lobe',
        confidence: 0.89,
        severity: 'medium'
      }
    ],
    severity: 'medium',
    triagePriority: 7,
    processedAt: new Date().toISOString(),
    rawAnalysis: 'Detailed analysis of the scan shows a potential nodule in the upper right lobe...'
  },
  {
    id: 'result-2',
    scanId: 'scan-2',
    abnormalitiesDetected: true,
    confidenceScore: 0.85,
    heatmapImage: heatmapUrls[1],
    aiModel: 'ResNet-50',
    findings: [
      {
        id: 'finding-2',
        area: 'Lower left lobe',
        description: 'Increased density observed',
        confidence: 0.82,
        severity: 'low'
      }
    ],
    severity: 'low',
    triagePriority: 4,
    processedAt: new Date().toISOString(),
    rawAnalysis: 'Analysis shows increased density in lower left lobe...'
  }
];

// Define mock scans with proper types
export const mockScans: Scan[] = [
  {
    id: 'scan-1',
    patientId: 'patient-1',
    userId: 'user-1',
    type: 'xray',
    bodyPart: 'chest',
    uploadedAt: new Date(2024, 2, 15).toISOString(),
    status: 'completed',
    originalImage: '/samples/chest-xray-1.png',
    result: mockResults.find(r => r.scanId === 'scan-1'),
    report: 'Scan analysis complete. High-severity abnormality detected in upper right quadrant.'
  },
  {
    id: 'scan-2',
    patientId: 'patient-1',
    userId: 'user-1',
    type: 'xray',
    bodyPart: 'chest',
    uploadedAt: new Date(2024, 2, 10).toISOString(),
    status: 'uploaded',
    originalImage: '/samples/chest-xray-2.png'
  }
];

export async function initializeMockData() {
  try {
    // Process and store mock images
    const processedScans = await Promise.all(
      mockScans.map(async (scan: Scan) => {
        const imageUrl = `/mock/scan${scan.id.split('-')[1]}.jpg`;
        const response = await fetch(imageUrl);
        const blob = await response.blob();
        const originalImage = await processAndStoreImage(imageUrl, scan.id);
        return { ...scan, originalImage };
      })
    );

    // Store scans in localStorage
    localStorage.setItem('scans', JSON.stringify(processedScans));
    
    console.log('Mock data initialized successfully');
  } catch (error) {
    console.error('Failed to initialize mock data:', error);
    throw error;
  }
}

// Initialize IndexedDB
const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('medvision_db', 1);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains('scan_images')) {
        db.createObjectStore('scan_images', { keyPath: 'id' });
      }
    };
  });
};

// Define mock scan results with proper types
export const mockScanResults: ScanResult[] = [
  {
    id: 'result-1',
    scanId: 'scan-1',
    abnormalitiesDetected: true,
    confidenceScore: 0.92,
    heatmapImage: heatmapUrls[0 as HeatmapIndex],
    aiModel: 'ResNet-50',
    findings: [
      {
        id: 'finding-1',
        area: 'Upper right lobe',
        description: 'Potential nodule detected in upper right lobe',
        confidence: 0.89,
        severity: 'medium'
      }
    ],
    severity: 'medium',
    triagePriority: 7,
    processedAt: '2023-08-15T10:35:00Z',
    reportId: 'report-1',
    rawAnalysis: 'Detailed analysis of the scan shows a potential nodule in the upper right lobe...'
  },
  {
    id: 'result-2',
    scanId: 'scan-2',
    abnormalitiesDetected: false,
    confidenceScore: 0.97,
    heatmapImage: heatmapUrls[1 as HeatmapIndex],
    aiModel: 'EfficientNet-B4',
    findings: [],
    severity: 'normal',
    triagePriority: 2,
    processedAt: '2023-09-05T15:50:00Z',
    reportId: 'report-2',
    rawAnalysis: 'Analysis shows no significant abnormalities...'
  },
  {
    id: 'result-3',
    scanId: 'scan-3',
    abnormalitiesDetected: true,
    confidenceScore: 0.85,
    heatmapImage: heatmapUrls[2 as HeatmapIndex],
    aiModel: 'ResNet-50',
    findings: [
      {
        id: 'finding-2',
        area: 'Medial meniscus',
        description: 'Partial tear in medial meniscus',
        confidence: 0.83,
        severity: 'medium'
      }
    ],
    severity: 'medium',
    triagePriority: 6,
    processedAt: '2023-10-20T08:20:00Z',
    reportId: 'report-3',
    rawAnalysis: 'Analysis reveals a partial tear in the medial meniscus...'
  }
];

// Define mock reports with proper types
export const mockReports: Report[] = [
  {
    id: 'report-1',
    scanResultId: 'result-1',
    patientSummary: 'Patient presented with chest discomfort. Chest X-ray was performed to evaluate for any abnormalities.',
    clinicalDetails: 'Examination reveals a potential nodule in the upper right lobe of the lung. The nodule measures approximately 1.2cm in diameter with irregular borders.',
    recommendations: 'Follow-up CT scan recommended in 3 months to monitor nodule size and characteristics. If symptoms worsen, earlier follow-up may be warranted.',
    doctorId: 'doctor-1',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'report-2',
    scanResultId: 'result-2',
    patientSummary: 'Your brain CT scan looks normal with no concerning findings.',
    clinicalDetails: 'Non-contrast CT of the brain demonstrates normal gray-white matter differentiation. No intracranial hemorrhage, mass effect, or midline shift. Ventricles are normal in size and configuration.',
    recommendations: 'No follow-up imaging required based on current findings.',
    doctorId: 'user-1',
    createdAt: '2023-09-05T16:15:00Z',
    updatedAt: '2023-09-05T16:15:00Z'
  },
  {
    id: 'report-3',
    scanResultId: 'result-3',
    patientSummary: 'MRI of the knee was performed due to persistent pain and limited mobility.',
    clinicalDetails: 'MRI demonstrates a partial tear of the medial meniscus. No evidence of complete rupture. Mild joint effusion present. ACL and PCL appear intact.',
    recommendations: 'Orthopedic consultation recommended. Consider physical therapy and activity modification. Follow-up imaging in 6-8 weeks if symptoms persist.',
    doctorId: 'doctor-2',
    createdAt: '2023-10-20T09:00:00Z',
    updatedAt: '2023-10-20T09:00:00Z'
  }
];