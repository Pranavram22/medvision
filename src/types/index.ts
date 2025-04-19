// User and Authentication Types
export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'doctor' | 'patient';
  avatar?: string;
  specialization?: string; // For doctors
  licenseNumber?: string; // For doctors
  createdAt: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
}

// Scan Types
export interface Scan {
  id: string;
  userId: string;
  patientId?: string; // If uploaded by doctor for patient
  type: 'xray' | 'ct' | 'mri' | 'ultrasound' | 'other';
  bodyPart: string;
  originalImage: string;
  processedImage?: string; // Processed version of the image (e.g., enhanced, normalized)
  thumbnailImage?: string;
  uploadedAt: string;
  metadata?: Record<string, any>;
  status: 'uploaded' | 'processing' | 'analyzed' | 'reviewed' | 'completed';
  result?: ScanResult;
  report?: string;
}

export interface DetectedArea {
  severity: 'low' | 'medium' | 'high';
  description: string;
  coordinates: { x: number; y: number };
}

export interface ScanResult {
  id: string;
  scanId: string;
  abnormalitiesDetected: boolean;
  confidenceScore: number;
  heatmapImage?: string;
  aiModel: string;
  findings: Array<{
    id: string;
    area: string;
    description: string;
    confidence: number;
    severity: 'normal' | 'low' | 'medium' | 'high' | 'critical';
  }>;
  severity: 'normal' | 'low' | 'medium' | 'high' | 'critical';
  triagePriority: number; // 1-10 scale
  reportId?: string;
  processedAt: string;
  rawAnalysis?: string; // Raw text from the AI analysis
  detectedAreas?: DetectedArea[];
  confidence?: number;
  analysisDate?: string;
}

export interface Finding {
  id: string;
  area: string;
  description: string;
  confidence: number;
  severity: 'normal' | 'low' | 'medium' | 'high' | 'critical';
}

export interface BoundingBox {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  confidence: number;
}

export interface Report {
  id: string;
  scanResultId: string;
  patientSummary: string;
  clinicalDetails: string;
  recommendations: string;
  doctorId?: string; // If reviewed by doctor
  createdAt: string;
  updatedAt: string;
  hash?: string; // Blockchain verification hash
}

// UI Types
export interface Toast {
  id: string;
  title: string;
  description?: string;
  type: 'default' | 'success' | 'warning' | 'error';
}

export interface Tab {
  id: string;
  label: string;
  icon?: React.ReactNode;
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}