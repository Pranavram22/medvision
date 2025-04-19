export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          name: string
          role: 'admin' | 'doctor' | 'patient'
          avatar: string | null
          specialization: string | null
          license_number: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          name: string
          role: 'admin' | 'doctor' | 'patient'
          avatar?: string | null
          specialization?: string | null
          license_number?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          role?: 'admin' | 'doctor' | 'patient'
          avatar?: string | null
          specialization?: string | null
          license_number?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      scans: {
        Row: {
          id: string
          user_id: string
          patient_id: string | null
          type: 'xray' | 'ct' | 'mri' | 'ultrasound' | 'other'
          body_part: string
          original_image: string
          thumbnail_image: string | null
          status: 'uploaded' | 'processing' | 'analyzed' | 'reviewed'
          metadata: Json | null
          uploaded_at: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          patient_id?: string | null
          type: 'xray' | 'ct' | 'mri' | 'ultrasound' | 'other'
          body_part: string
          original_image: string
          thumbnail_image?: string | null
          status: 'uploaded' | 'processing' | 'analyzed' | 'reviewed'
          metadata?: Json | null
          uploaded_at?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          patient_id?: string | null
          type?: 'xray' | 'ct' | 'mri' | 'ultrasound' | 'other'
          body_part?: string
          original_image?: string
          thumbnail_image?: string | null
          status?: 'uploaded' | 'processing' | 'analyzed' | 'reviewed'
          metadata?: Json | null
          uploaded_at?: string
          created_at?: string
          updated_at?: string
        }
      }
      scan_results: {
        Row: {
          id: string
          scan_id: string
          abnormalities_detected: boolean
          confidence_score: number
          heatmap_image: string | null
          ai_model: string
          severity: 'normal' | 'low' | 'medium' | 'high' | 'critical'
          triage_priority: number
          processed_at: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          scan_id: string
          abnormalities_detected?: boolean
          confidence_score: number
          heatmap_image?: string | null
          ai_model: string
          severity: 'normal' | 'low' | 'medium' | 'high' | 'critical'
          triage_priority: number
          processed_at?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          scan_id?: string
          abnormalities_detected?: boolean
          confidence_score?: number
          heatmap_image?: string | null
          ai_model?: string
          severity?: 'normal' | 'low' | 'medium' | 'high' | 'critical'
          triage_priority?: number
          processed_at?: string
          created_at?: string
          updated_at?: string
        }
      }
      findings: {
        Row: {
          id: string
          result_id: string
          area: string
          description: string
          confidence: number
          severity: 'normal' | 'low' | 'medium' | 'high' | 'critical'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          result_id: string
          area: string
          description: string
          confidence: number
          severity: 'normal' | 'low' | 'medium' | 'high' | 'critical'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          result_id?: string
          area?: string
          description?: string
          confidence?: number
          severity?: 'normal' | 'low' | 'medium' | 'high' | 'critical'
          created_at?: string
          updated_at?: string
        }
      }
      reports: {
        Row: {
          id: string
          scan_result_id: string
          patient_summary: string
          clinical_details: string
          recommendations: string
          doctor_id: string | null
          hash: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          scan_result_id: string
          patient_summary: string
          clinical_details: string
          recommendations: string
          doctor_id?: string | null
          hash?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          scan_result_id?: string
          patient_summary?: string
          clinical_details?: string
          recommendations?: string
          doctor_id?: string | null
          hash?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}