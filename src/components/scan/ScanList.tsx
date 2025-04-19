import React from 'react';
import { useScan } from '@/context/ScanContext';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Eye, 
  FileHeart, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Loader2,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface ScanItemProps {
  id: string;
  imageSrc: string;
  type: string;
  bodyPart: string;
  date: string;
  status: string;
  onClick: () => void;
}

const ScanItem: React.FC<ScanItemProps> = ({
  id,
  imageSrc,
  type,
  bodyPart,
  date,
  status,
  onClick
}) => {
  const getStatusBadge = () => {
    switch (status) {
      case 'uploaded':
        return <Badge variant="outline" className="flex items-center gap-1"><Clock className="h-3 w-3" /> Pending</Badge>;
      case 'processing':
        return <Badge variant="secondary" className="flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> Processing</Badge>;
      case 'analyzed':
        return <Badge variant="default" className="flex items-center gap-1"><CheckCircle className="h-3 w-3" /> Analyzed</Badge>;
      case 'reviewed':
        return <Badge variant="success" className="flex items-center gap-1 bg-green-500"><CheckCircle className="h-3 w-3" /> Reviewed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow duration-300">
      <div className="relative aspect-video">
        <img 
          src={imageSrc} 
          alt={`${type} scan of ${bodyPart}`}
          className="object-cover w-full h-full"
        />
        <div className="absolute top-2 right-2">
          {getStatusBadge()}
        </div>
      </div>
      <CardContent className="p-4">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="font-semibold capitalize">{type} - {bodyPart}</h3>
            <p className="text-sm text-muted-foreground">
              {formatDistanceToNow(new Date(date), { addSuffix: true })}
            </p>
          </div>
          <Button size="sm" variant="ghost" onClick={onClick}>
            <Eye className="h-4 w-4 mr-1" /> View
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export function ScanList({ onScanSelect }: { onScanSelect: (scanId: string) => void }) {
  const { scans, loading } = useScan();
  const { authState } = useAuth();
  const { user } = authState;
  
  // Filter scans based on user role
  const filteredScans = React.useMemo(() => {
    if (!user) return [];
    
    return scans.filter(scan => {
      if (user.role === 'admin') return true;
      if (user.role === 'doctor') return true;
      return scan.userId === user.id || scan.patientId === user.id;
    });
  }, [scans, user]);
  
  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  if (filteredScans.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 flex flex-col items-center justify-center">
          <FileHeart className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground text-lg">No scans available</p>
          <p className="text-muted-foreground text-sm mt-1">
            Upload a scan to get started
          </p>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {filteredScans.map(scan => (
        <ScanItem
          key={scan.id}
          id={scan.id}
          imageSrc={scan.originalImage}
          type={scan.type}
          bodyPart={scan.bodyPart}
          date={scan.uploadedAt}
          status={scan.status}
          onClick={() => onScanSelect(scan.id)}
        />
      ))}
    </div>
  );
}