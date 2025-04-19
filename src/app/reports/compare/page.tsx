import { BeforeAfterUpload } from '@/components/scan/BeforeAfterUpload';
import { Card } from '@/components/ui/card';

export default function ComparePage() {
  return (
    <div className="container mx-auto py-8">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold mb-4">Compare Scans</h1>
        <p className="text-muted-foreground mb-8">
          Upload and compare two scans to track changes over time. Our AI will analyze both scans and provide insights on improvements or deterioration.
        </p>
        
        <Card className="p-6">
          <BeforeAfterUpload />
        </Card>
      </div>
    </div>
  );
} 