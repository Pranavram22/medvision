/*
  # Create scan results and findings tables

  1. New Tables
    - `scan_results`
      - `id` (uuid, primary key)
      - `scan_id` (uuid, references scans)
      - `abnormalities_detected` (boolean)
      - `confidence_score` (numeric)
      - `heatmap_image` (text)
      - `ai_model` (text)
      - `severity` (text)
      - `triage_priority` (integer)
      - `processed_at` (timestamp)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

    - `findings`
      - `id` (uuid, primary key)
      - `result_id` (uuid, references scan_results)
      - `area` (text)
      - `description` (text)
      - `confidence` (numeric)
      - `severity` (text)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated users to:
      - Read results for their scans (patients)
      - Read all results (doctors)
      - Create and update results (system only)
*/

CREATE TABLE IF NOT EXISTS public.scan_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_id uuid REFERENCES public.scans(id) ON DELETE CASCADE NOT NULL,
  abnormalities_detected boolean NOT NULL DEFAULT false,
  confidence_score numeric NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 1),
  heatmap_image text,
  ai_model text NOT NULL,
  severity text NOT NULL CHECK (severity IN ('normal', 'low', 'medium', 'high', 'critical')),
  triage_priority integer NOT NULL CHECK (triage_priority >= 1 AND triage_priority <= 10),
  processed_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.findings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  result_id uuid REFERENCES public.scan_results(id) ON DELETE CASCADE NOT NULL,
  area text NOT NULL,
  description text NOT NULL,
  confidence numeric NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  severity text NOT NULL CHECK (severity IN ('normal', 'low', 'medium', 'high', 'critical')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.scan_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.findings ENABLE ROW LEVEL SECURITY;

-- Allow users to read results for their scans
CREATE POLICY "Users can read results for their scans"
  ON public.scan_results
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.scans
      WHERE scan_results.scan_id = scans.id
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

-- Allow users to read findings for their results
CREATE POLICY "Users can read findings for their results"
  ON public.findings
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.scan_results
      JOIN public.scans ON scan_results.scan_id = scans.id
      WHERE findings.result_id = scan_results.id
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

-- Create triggers to update updated_at
CREATE TRIGGER update_scan_results_updated_at
  BEFORE UPDATE ON public.scan_results
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_findings_updated_at
  BEFORE UPDATE ON public.findings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();