/*
  # Create scans and related tables

  1. New Tables
    - `scans`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles)
      - `patient_id` (uuid, references profiles, for doctor uploads)
      - `type` (text)
      - `body_part` (text)
      - `original_image` (text)
      - `thumbnail_image` (text)
      - `status` (text)
      - `metadata` (jsonb)
      - `uploaded_at` (timestamp)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `scans` table
    - Add policies for authenticated users to:
      - Create scans
      - Read their own scans (patients)
      - Read patient scans (doctors)
      - Update scan status (doctors)
*/

CREATE TABLE IF NOT EXISTS public.scans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  patient_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('xray', 'ct', 'mri', 'ultrasound', 'other')),
  body_part text NOT NULL,
  original_image text NOT NULL,
  thumbnail_image text,
  status text NOT NULL CHECK (status IN ('uploaded', 'processing', 'analyzed', 'reviewed')),
  metadata jsonb DEFAULT '{}'::jsonb,
  uploaded_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.scans ENABLE ROW LEVEL SECURITY;

-- Allow users to create scans
CREATE POLICY "Users can create scans"
  ON public.scans
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Allow users to read their own scans
CREATE POLICY "Users can read own scans"
  ON public.scans
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id OR 
    auth.uid() = patient_id OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'doctor'
    )
  );

-- Allow doctors to update scan status
CREATE POLICY "Doctors can update scan status"
  ON public.scans
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'doctor'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'doctor'
    )
  );

-- Create trigger to update updated_at
CREATE TRIGGER update_scans_updated_at
  BEFORE UPDATE ON public.scans
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();