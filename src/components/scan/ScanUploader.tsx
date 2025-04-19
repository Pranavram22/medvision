import React, { useState, useRef } from 'react';
import { Camera, Upload, X, FileImage, Brain } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useScan } from '@/context/ScanContext';
import { useAuth } from '@/context/AuthContext';
import { useUI } from '@/context/UIContext';

export function ScanUploader() {
  const { uploadScan, analyzeScan, loading } = useScan();
  const { authState } = useAuth();
  const { addToast } = useUI();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [useCamera, setUseCamera] = useState<boolean>(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      
      // Create preview URL
      const fileUrl = URL.createObjectURL(file);
      setPreviewUrl(fileUrl);
    }
  };
  
  // Handle file drop
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      setSelectedFile(file);
      
      // Create preview URL
      const fileUrl = URL.createObjectURL(file);
      setPreviewUrl(fileUrl);
    }
  };
  
  // Prevent default drag behavior
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };
  
  // Clear selected file
  const clearSelectedFile = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  
  // Toggle camera
  const toggleCamera = async () => {
    if (useCamera) {
      // Turn off camera
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
        setCameraStream(null);
      }
      setUseCamera(false);
    } else {
      // Turn on camera
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        setCameraStream(stream);
        setUseCamera(true);
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (error) {
        console.error('Error accessing camera:', error);
        addToast({
          title: 'Camera Error',
          description: 'Could not access your camera.',
          type: 'error'
        });
      }
    }
  };
  
  // Capture image from camera
  const captureImage = () => {
    if (videoRef.current && canvasRef.current && cameraStream) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      // Set canvas dimensions to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      // Draw video frame to canvas
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Convert canvas to Blob/File
        canvas.toBlob((blob) => {
          if (blob) {
            const file = new File([blob], 'camera-capture.jpg', { type: 'image/jpeg' });
            setSelectedFile(file);
            
            // Create preview URL
            const fileUrl = URL.createObjectURL(file);
            setPreviewUrl(fileUrl);
            
            // Turn off camera
            toggleCamera();
          }
        }, 'image/jpeg');
      }
    }
  };
  
  // Handle upload and analysis
  const handleUpload = async () => {
    if (!selectedFile) {
      addToast({
        title: 'Missing File',
        description: 'Please select a medical image to upload.',
        type: 'error'
      });
      return;
    }
    
    try {
      // Upload the scan - using generic values for bodyPart and type
      // AI will determine these automatically
      const scan = await uploadScan(selectedFile, {
        userId: authState.user?.id || '',
        type: 'other', // AI will determine the actual type
        bodyPart: 'autodetect', // AI will determine the actual body part
      });
      
      // Clear the form
      clearSelectedFile();
      
      // Automatically start analysis
      if (scan && scan.id) {
        await analyzeScan(scan.id);
      }
    } catch (error) {
      console.error('Upload failed:', error);
    }
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-primary" />
          AI-Powered Medical Image Analysis
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {useCamera ? (
          <div className="relative border rounded-lg overflow-hidden">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="w-full h-auto aspect-video object-cover"
            />
            <div className="absolute bottom-0 left-0 right-0 flex justify-center p-4 gap-2 bg-black/50">
              <Button onClick={captureImage} variant="default">
                Capture Image
              </Button>
              <Button onClick={toggleCamera} variant="secondary">
                Cancel
              </Button>
            </div>
            {/* Hidden canvas for capturing frames */}
            <canvas ref={canvasRef} className="hidden" />
          </div>
        ) : (
          <div 
            className={`flex flex-col items-center justify-center w-full h-52 border-2 border-dashed rounded-lg transition-colors ${
              previewUrl ? 'border-primary' : 'border-primary/50 hover:border-primary'
            }`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
          >
            {previewUrl ? (
              <div className="relative w-full h-full">
                <img 
                  src={previewUrl} 
                  alt="Scan preview" 
                  className="w-full h-full object-contain"
                />
                <Button 
                  variant="destructive" 
                  size="icon" 
                  className="absolute top-2 right-2"
                  onClick={clearSelectedFile}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-4">
                <FileImage className="h-12 w-12 text-primary/70" />
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">
                    Drag & drop your medical image here or
                  </p>
                  <div className="flex justify-center gap-2 mt-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Browse Files
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={toggleCamera}
                    >
                      <Camera className="h-4 w-4 mr-2" />
                      Use Camera
                    </Button>
                  </div>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </div>
            )}
          </div>
        )}
        
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Upload any medical image (X-Ray, CT Scan, MRI, Ultrasound, etc.) and our AI will automatically:
          </p>
          <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
            <li>Identify the body part and scan type</li>
            <li>Detect potential abnormalities</li>
            <li>Generate a detailed analysis report</li>
            <li>Provide treatment recommendations</li>
          </ul>
        </div>
        
        <div className="flex justify-end mt-6">
          <Button 
            className="w-full"
            disabled={!selectedFile || loading}
            onClick={handleUpload}
          >
            {loading ? 'Processing with AI...' : 'Upload & Analyze with AI'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}