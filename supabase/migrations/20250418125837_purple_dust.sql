/*
  # Create medical reports table

  1. New Tables
    - `reports`
      - `id` (uuid, primary key)
      - `scan_result_id` (uuid, references scan_results)
      - `patient_summary` (text)
      - `clinical_details` (text)
      - `recommendations` (text)
      - `doctor_id` (uuid, references profiles)
      - `hash` (text, for blockchain verification)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on reports table
    - Add policies for authenticated users to:
      - Read reports for their scans (patients)
      - Read and create reports (doctors)
*/

CREATE TABLE IF NOT EXISTS public.reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_result_id uuid REFERENCES public.scan_results(id) ON DELETE CASCADE NOT NULL,
  patient_summary text NOT NULL,
  clinical_details text NOT NULL,
  recommendations text NOT NULL,
  doctor_id uuid REFERENCES public.profiles(id),
  hash text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- Allow users to read reports for their scans
CREATE POLICY "Users can read reports for their scans"
  ON public.reports
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.scan_results
      JOIN public.scans ON scan_results.scan_id = scans.id
      WHERE reports.scan_result_id = scan_results.id
      AND (
        scans.user_id = auth.uid() OR
        scans.patient_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM public.profiles
          WHERE id = auth.uid() AND role = 'doctor'
        )
      )
    )
  );

-- Allow doctors to create reports
CREATE POLICY "Doctors can create reports"
  ON public.reports
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'doctor'
    )
  );

-- Create trigger to update updated_at
CREATE TRIGGER update_reports_updated_at
  BEFORE UPDATE ON public.reports
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();