import { BeforeAfterUpload } from '@/components/scan/BeforeAfterUpload';
import { Card } from '@/components/ui/card';
import { useEffect } from 'react';
import { Bot } from 'lucide-react';

export default function ComparePage() {
  useEffect(() => {
    console.log('=== COMPARE PAGE MOUNTED ===');
  }, []);

  return (
    <div className="container mx-auto py-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-3xl font-bold">Compare Scans</h1>
          <div className="px-3 py-1 bg-blue-100 text-blue-700 text-sm rounded-full flex items-center gap-1">
            <svg 
              width="16" 
              height="16" 
              viewBox="0 0 24 24" 
              fill="none" 
              xmlns="http://www.w3.org/2000/svg"
              className="text-blue-600"
            >
              <path d="M11.9997 2L19.0793 5.5V13.5L11.9997 17L4.92969 13.5V5.5L11.9997 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M12 17V22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M4.92969 5.5L11.9997 9L19.0793 5.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M12 9L12 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Gemini AI Powered
          </div>
        </div>
        
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-lg mb-8 flex items-start gap-3 border border-blue-100">
          <Bot className="h-5 w-5 text-blue-500 mt-1" />
          <div>
            <p className="text-muted-foreground mb-2">
              Upload and compare two scans to track changes over time. Our Gemini-powered AI will analyze both scans and provide enhanced clinical insights on improvements or deterioration, helping you make more informed decisions.
            </p>
            <p className="text-xs text-muted-foreground">
              The analysis includes detailed clinical assessment, side-by-side comparison, and specific medical recommendations based on observed changes.
            </p>
          </div>
        </div>
        
        <Card className="p-6">
          <BeforeAfterUpload />
        </Card>
      </div>
    </div>
  );
} 