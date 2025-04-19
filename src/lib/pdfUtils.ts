import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import type { Report, Scan, ScanResult } from '@/types';
import { format } from 'date-fns';

/**
 * Generate and download a PDF report from scan data
 */
export const downloadReportAsPDF = async (
  report: Report,
  scan: Scan,
  result: ScanResult,
  originalImageUrl?: string
): Promise<void> => {
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 15;
  let currentY = margin;

  // Add header with logo and title
  pdf.setFontSize(18);
  pdf.setFont('helvetica', 'bold');
  pdf.text('MedVision Medical Report', pageWidth / 2, currentY, { align: 'center' });
  currentY += 10;

  // Add date
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`Date: ${format(new Date(report.createdAt), 'PPP')}`, pageWidth - margin, currentY, { align: 'right' });
  currentY += 15;

  // Add scan info
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Scan Information', margin, currentY);
  currentY += 8;

  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`Type: ${scan.type.toUpperCase()}`, margin, currentY);
  currentY += 6;
  pdf.text(`Body Part: ${scan.bodyPart}`, margin, currentY);
  currentY += 6;
  pdf.text(`Severity: ${result.severity.toUpperCase()}`, margin, currentY);
  currentY += 6;
  pdf.text(`Confidence Score: ${result.confidenceScore * 100}%`, margin, currentY);
  currentY += 6;
  pdf.text(`AI Model: ${result.aiModel}`, margin, currentY);
  currentY += 6;
  pdf.text(`Processed: ${format(new Date(result.processedAt), 'PPP')}`, margin, currentY);
  currentY += 15;

  // Add scan image if available
  if (originalImageUrl) {
    try {
      const imgWidth = pageWidth - (margin * 2);
      const imgHeight = 60; // Reduced height for image to make room for more content
      
      pdf.addImage(originalImageUrl, 'JPEG', margin, currentY, imgWidth, imgHeight);
      currentY += imgHeight + 10;
    } catch (error) {
      console.error('Error adding image to PDF:', error);
      // Continue without image if there's an error
    }
  }

  // Add heatmap image if available
  if (result.heatmapImage) {
    try {
      const imgWidth = pageWidth - (margin * 2);
      const imgHeight = 60; // Reduced height for image to make room for more content
      
      pdf.addImage(result.heatmapImage, 'JPEG', margin, currentY, imgWidth, imgHeight);
      currentY += imgHeight + 10;
      
      // Add caption for heatmap
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'italic');
      pdf.text('Heatmap visualization showing areas of concern highlighted by AI analysis', pageWidth / 2, currentY, { align: 'center' });
      currentY += 10;
    } catch (error) {
      console.error('Error adding heatmap to PDF:', error);
      // Continue without heatmap if there's an error
    }
  }

  // Add detailed findings section
  if (result.findings && result.findings.length > 0) {
    // Check if we need a new page
    if (currentY > pageHeight - 100) {
      pdf.addPage();
      currentY = margin;
    }
    
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Detailed Findings', margin, currentY);
    currentY += 8;
    
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    
    result.findings.forEach((finding, index) => {
      // Check if we need a new page
      if (currentY > pageHeight - 50) {
        pdf.addPage();
        currentY = margin;
      }
      
      pdf.setFont('helvetica', 'bold');
      pdf.text(`Finding ${index + 1}: ${finding.area}`, margin, currentY);
      currentY += 6;
      
      pdf.setFont('helvetica', 'normal');
      currentY = addTextWithWrapping(pdf, finding.description, margin, currentY, pageWidth - (margin * 2));
      
      pdf.text(`Severity: ${finding.severity.toUpperCase()}`, margin, currentY);
      currentY += 6;
      
      pdf.text(`Confidence: ${Math.round(finding.confidence * 100)}%`, margin, currentY);
      currentY += 10;
    });
    
    currentY += 5;
  }

  // Add abnormality summary if applicable
  if (result.abnormalitiesDetected) {
    // Check if we need a new page
    if (currentY > pageHeight - 80) {
      pdf.addPage();
      currentY = margin;
    }
    
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Abnormality Summary', margin, currentY);
    currentY += 8;
    
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Triage Priority: ${result.triagePriority}/10`, margin, currentY);
    currentY += 6;
    
    // Add a horizontal bar for triage priority visualization
    const barWidth = (pageWidth - (margin * 2)) * (result.triagePriority / 10);
    pdf.setFillColor(
      result.triagePriority >= 8 ? 255 : result.triagePriority >= 6 ? 255 : result.triagePriority >= 4 ? 255 : 100,
      result.triagePriority >= 8 ? 50 : result.triagePriority >= 6 ? 150 : result.triagePriority >= 4 ? 200 : 150,
      result.triagePriority >= 8 ? 50 : result.triagePriority >= 6 ? 50 : result.triagePriority >= 4 ? 50 : 255
    );
    pdf.rect(margin, currentY, barWidth, 3, 'F');
    currentY += 10;
    
    // Add raw AI analysis if available (excerpt)
    if (result.rawAnalysis) {
      const analysisExcerpt = result.rawAnalysis.slice(0, 300) + (result.rawAnalysis.length > 300 ? '...' : '');
      pdf.text('AI Analysis Excerpt:', margin, currentY);
      currentY += 6;
      currentY = addTextWithWrapping(pdf, analysisExcerpt, margin, currentY, pageWidth - (margin * 2));
      currentY += 10;
    }
  }

  // Check if we need a new page for patient summary
  if (currentY > pageHeight - 80) {
    pdf.addPage();
    currentY = margin;
  }

  // Add patient summary
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Patient Summary', margin, currentY);
  currentY += 8;

  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  currentY = addTextWithWrapping(pdf, report.patientSummary, margin, currentY, pageWidth - (margin * 2));
  currentY += 10;

  // Check if we need a new page for clinical details
  if (currentY > pageHeight - 80) {
    pdf.addPage();
    currentY = margin;
  }

  // Add clinical details
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Clinical Details', margin, currentY);
  currentY += 8;

  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  currentY = addTextWithWrapping(pdf, report.clinicalDetails, margin, currentY, pageWidth - (margin * 2));
  currentY += 10;

  // Check if we need a new page for recommendations
  if (currentY > pageHeight - 80) {
    pdf.addPage();
    currentY = margin;
  }

  // Add recommendations
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Recommendations', margin, currentY);
  currentY += 8;

  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  currentY = addTextWithWrapping(pdf, report.recommendations, margin, currentY, pageWidth - (margin * 2));
  currentY += 15;

  // Add footer with verification info if available
  if (report.hash) {
    pdf.setFontSize(8);
    pdf.text('This report has been verified and secured using blockchain technology.', margin, pageHeight - margin);
    pdf.text(`Verification Hash: ${report.hash}`, margin, pageHeight - margin + 4);
  }

  // Add a note about MedVision
  pdf.setFontSize(8);
  pdf.setTextColor(100, 100, 100);
  pdf.text('Generated by MedVision AI-Powered Medical Diagnostics', pageWidth / 2, pageHeight - margin - 6, { align: 'center' });
  pdf.text(format(new Date(), 'yyyy-MM-dd HH:mm:ss'), pageWidth / 2, pageHeight - margin - 2, { align: 'center' });

  // Save the PDF with detailed filename
  pdf.save(`medical-report-${scan.type}-${scan.bodyPart}-${format(new Date(report.createdAt), 'yyyy-MM-dd')}.pdf`);
};

/**
 * Generate a PDF from an HTML element
 */
export const downloadElementAsPDF = async (
  element: HTMLElement, 
  filename: string
): Promise<void> => {
  try {
    // Capture the element as a canvas
    const canvas = await html2canvas(element, {
      scale: 2,
      logging: false,
      useCORS: true
    });
    
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    
    // Calculate dimensions to fit the image within the page
    const imgWidth = pdf.internal.pageSize.getWidth();
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    
    pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
    pdf.save(filename);
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw error;
  }
};

/**
 * Helper function to add wrapped text to PDF
 */
const addTextWithWrapping = (
  pdf: jsPDF, 
  text: string, 
  x: number, 
  y: number, 
  maxWidth: number
): number => {
  const lines = pdf.splitTextToSize(text, maxWidth);
  const lineHeight = 5;
  
  lines.forEach((line: string) => {
    pdf.text(line, x, y);
    y += lineHeight;
  });
  
  return y;
}; 