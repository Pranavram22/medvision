import { BeforeAfterUpload } from '@/components/scan/BeforeAfterUpload';

export default function ComparePage() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8">Compare Scans</h1>
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-2">Before & After Analysis</h2>
          <p className="text-gray-600">
            Upload two scans to compare and analyze changes in the patient's condition.
            The AI will analyze both scans and provide insights on improvements or deterioration.
          </p>
        </div>
        <BeforeAfterUpload />
      </div>
    </div>
  );
} 