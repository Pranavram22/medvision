import { Scan, ScanResult, Report, User } from '@/types';

// Sample medical scan images from Pexels (valid URLs)
const sampleImageUrls = [
  'https://images.pexels.com/photos/8472637/pexels-photo-8472637.jpeg?auto=compress&cs=tinysrgb&w=600',
  'https://images.pexels.com/photos/7089401/pexels-photo-7089401.jpeg?auto=compress&cs=tinysrgb&w=600',
  'https://images.pexels.com/photos/7088465/pexels-photo-7088465.jpeg?auto=compress&cs=tinysrgb&w=600',
  'https://images.pexels.com/photos/4226894/pexels-photo-4226894.jpeg?auto=compress&cs=tinysrgb&w=600',
  'https://images.pexels.com/photos/6823562/pexels-photo-6823562.jpeg?auto=compress&cs=tinysrgb&w=600'
];

const heatmapUrls = [
  'https://images.pexels.com/photos/7089020/pexels-photo-7089020.jpeg?auto=compress&cs=tinysrgb&w=600',
  'https://images.pexels.com/photos/3970330/pexels-photo-3970330.jpeg?auto=compress&cs=tinysrgb&w=600'
];

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

// Mock scans
export const mockScans: Scan[] = [
  {
    id: 'scan-1',
    userId: 'user-2',
    type: 'xray',
    bodyPart: 'chest',
    originalImage: sampleImageUrls[0],
    uploadedAt: '2023-08-15T10:30:00Z',
    status: 'analyzed',
  },
  {
    id: 'scan-2',
    userId: 'user-2',
    type: 'ct',
    bodyPart: 'brain',
    originalImage: sampleImageUrls[1],
    uploadedAt: '2023-09-05T15:45:00Z',
    status: 'reviewed',
  },
  {
    id: 'scan-3',
    userId: 'user-2',
    type: 'mri',
    bodyPart: 'knee',
    originalImage: sampleImageUrls[2],
    uploadedAt: '2023-10-20T08:15:00Z',
    status: 'analyzed',
  },
  {
    id: 'scan-4',
    userId: 'user-2',
    patientId: 'user-2',
    type: 'xray',
    bodyPart: 'spine',
    originalImage: sampleImageUrls[3],
    uploadedAt: '2023-11-12T11:20:00Z',
    status: 'uploaded',
  },
  {
    id: 'scan-5',
    userId: 'user-1',
    patientId: 'user-2',
    type: 'ultrasound',
    bodyPart: 'abdomen',
    originalImage: sampleImageUrls[4],
    uploadedAt: '2023-12-03T14:10:00Z',
    status: 'processing',
  }
];

// Mock scan results
export const mockScanResults: ScanResult[] = [
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
    processedAt: '2023-08-15T10:35:00Z',
    reportId: 'report-1'
  },
  {
    id: 'result-2',
    scanId: 'scan-2',
    abnormalitiesDetected: false,
    confidenceScore: 0.97,
    aiModel: 'EfficientNet-B4',
    findings: [],
    severity: 'normal',
    triagePriority: 2,
    processedAt: '2023-09-05T15:50:00Z',
    reportId: 'report-2'
  },
  {
    id: 'result-3',
    scanId: 'scan-3',
    abnormalitiesDetected: true,
    confidenceScore: 0.85,
    heatmapImage: heatmapUrls[1],
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
    reportId: 'report-3'
  }
];

// Mock reports
export const mockReports: Report[] = [
  {
    id: 'report-1',
    scanResultId: 'result-1',
    patientSummary: 'Your chest X-ray shows a small spot in your right lung. This needs further evaluation.',
    clinicalDetails: 'Chest radiograph demonstrates a 1.2 cm nodular opacity in the right upper lobe. No pleural effusion or pneumothorax. Heart size within normal limits.',
    recommendations: 'Follow-up CT scan recommended within 2 weeks. Clinical correlation required.',
    doctorId: 'user-1',
    createdAt: '2023-08-15T11:00:00Z',
    updatedAt: '2023-08-15T11:00:00Z',
    hash: '0x7f2c4d8e1a3b5c9f0e6d2a4b8c0e2d4f6a8c0e2d4f'
  },
  {
    id: 'report-2',
    scanResultId: 'result-2',
    patientSummary: 'Your brain CT scan looks normal with no concerning findings.',
    clinicalDetails: 'Non-contrast CT of the brain demonstrates normal gray-white matter differentiation. No intracranial hemorrhage, mass effect, or midline shift. Ventricles are normal in size and configuration.',
    recommendations: 'No follow-up imaging required based on current findings.',
    doctorId: 'user-1',
    createdAt: '2023-09-05T16:15:00Z',
    updatedAt: '2023-09-05T16:15:00Z',
    hash: '0x3a5b7c9d1e2f4a6b8c0d2e4f6a8c0d2e4f6a8c0d2e'
  },
  {
    id: 'report-3',
    scanResultId: 'result-3',
    patientSummary: 'Your knee MRI shows a small tear in the inner cartilage of your knee (medial meniscus).',
    clinicalDetails: 'MRI of the right knee demonstrates a horizontal tear of the posterior horn of the medial meniscus. ACL, PCL, MCL, and LCL appear intact. No significant joint effusion.',
    recommendations: 'Orthopedic consultation recommended. Consider physical therapy and activity modification.',
    doctorId: 'user-1',
    createdAt: '2023-10-20T09:00:00Z',
    updatedAt: '2023-10-20T09:00:00Z',
    hash: '0x5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5'
  }
];