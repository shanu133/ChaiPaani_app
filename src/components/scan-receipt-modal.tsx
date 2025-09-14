import { useState, useRef } from "react";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { Alert, AlertDescription } from "./ui/alert";
import { Progress } from "./ui/progress";
import { Badge } from "./ui/badge";
import { 
  Camera, 
  Upload, 
  FileImage, 
  Scan, 
  CheckCircle, 
  AlertCircle,
  X,
  RotateCw,
  Zap
} from "lucide-react";
import { toast } from "sonner@2.0.3";

interface ScanReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onReceiptScanned: (receiptData: ReceiptData) => void;
}

interface ReceiptData {
  merchant: string;
  total: number;
  date: string;
  items: Array<{
    name: string;
    price: number;
    quantity: number;
  }>;
  category: string;
  confidence: number;
}

export function ScanReceiptModal({ isOpen, onClose, onReceiptScanned }: ScanReceiptModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanResult, setScanResult] = useState<ReceiptData | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [scanStep, setScanStep] = useState<'upload' | 'scanning' | 'result'>('upload');

  // Mock receipt data for demonstration
  const mockReceiptData: ReceiptData = {
    merchant: "Udupi Palace Restaurant",
    total: 1247.50,
    date: new Date().toISOString().split('T')[0],
    items: [
      { name: "Masala Dosa", price: 180, quantity: 2 },
      { name: "Idli Sambar", price: 120, quantity: 1 },
      { name: "Filter Coffee", price: 45, quantity: 3 },
      { name: "Vada", price: 60, quantity: 2 },
      { name: "Coconut Chutney", price: 25, quantity: 1 },
      { name: "Service Charge", price: 62.40, quantity: 1 },
      { name: "GST (5%)", price: 59.38, quantity: 1 }
    ],
    category: "Food",
    confidence: 92
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error("Please select an image file");
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File size must be less than 10MB");
      return;
    }

    setSelectedFile(file);
    
    // Create preview URL
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    
    toast.success("Receipt image selected successfully");
  };

  const handleCameraCapture = () => {
    // Trigger file input to open camera on mobile devices
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const simulateScanning = async () => {
    setIsScanning(true);
    setScanStep('scanning');
    setScanProgress(0);

    // Simulate scanning progress
    const intervals = [
      { progress: 20, message: "Analyzing image quality..." },
      { progress: 40, message: "Detecting text regions..." },
      { progress: 60, message: "Extracting text content..." },
      { progress: 80, message: "Parsing receipt data..." },
      { progress: 95, message: "Validating information..." },
      { progress: 100, message: "Scan complete!" }
    ];

    for (const interval of intervals) {
      await new Promise(resolve => setTimeout(resolve, 800));
      setScanProgress(interval.progress);
    }

    // Set mock result
    setScanResult(mockReceiptData);
    setScanStep('result');
    setIsScanning(false);
    toast.success("Receipt scanned successfully!");
  };

  const handleScanReceipt = async () => {
    if (!selectedFile) {
      toast.error("Please select a receipt image first");
      return;
    }

    await simulateScanning();
  };

  const handleConfirmScan = () => {
    if (scanResult) {
      onReceiptScanned(scanResult);
      toast.success("Receipt data added to expense");
      handleClose();
    }
  };

  const handleRetry = () => {
    setScanStep('upload');
    setScanResult(null);
    setScanProgress(0);
    setSelectedFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClose = () => {
    setScanStep('upload');
    setScanResult(null);
    setScanProgress(0);
    setSelectedFile(null);
    setPreviewUrl(null);
    setIsScanning(false);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onClose();
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 85) return "text-green-600";
    if (confidence >= 70) return "text-yellow-600";
    return "text-red-600";
  };

  const getConfidenceBadge = (confidence: number) => {
    if (confidence >= 85) return { variant: "default" as const, label: "High Confidence" };
    if (confidence >= 70) return { variant: "secondary" as const, label: "Medium Confidence" };
    return { variant: "destructive" as const, label: "Low Confidence" };
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Scan className="w-5 h-5 text-primary" />
            Scan Receipt
          </DialogTitle>
          <DialogDescription>
            Upload a photo of your receipt and let AI extract all the expense details automatically.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 pt-4">
          {scanStep === 'upload' && (
            <>
              {/* Upload Area */}
              <div className="space-y-4">
                <Alert>
                  <Zap className="h-4 w-4" />
                  <AlertDescription>
                    Upload a clear photo of your receipt. AI will extract all expense details automatically.
                  </AlertDescription>
                </Alert>

                <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6">
                  <div className="text-center space-y-4">
                    <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                      <FileImage className="w-8 h-8 text-primary" />
                    </div>
                    
                    <div>
                      <h3 className="font-medium">Upload Receipt Photo</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        JPG, PNG, or HEIC up to 10MB
                      </p>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                      <Button 
                        variant="outline" 
                        className="gap-2"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <Upload className="w-4 h-4" />
                        Choose File
                      </Button>
                      <Button 
                        variant="outline" 
                        className="gap-2"
                        onClick={handleCameraCapture}
                      >
                        <Camera className="w-4 h-4" />
                        Take Photo
                      </Button>
                    </div>
                  </div>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleFileSelect}
                  className="hidden"
                />

                {/* Preview */}
                {previewUrl && (
                  <div className="space-y-3">
                    <div className="relative">
                      <img 
                        src={previewUrl} 
                        alt="Receipt preview" 
                        className="w-full max-h-64 object-contain rounded-lg border"
                      />
                      <Button
                        variant="secondary"
                        size="sm"
                        className="absolute top-2 right-2"
                        onClick={handleRetry}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                    
                    <Button 
                      className="w-full gap-2" 
                      onClick={handleScanReceipt}
                    >
                      <Scan className="w-4 h-4" />
                      Scan Receipt
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}

          {scanStep === 'scanning' && (
            <div className="space-y-6 text-center">
              <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                <Scan className="w-8 h-8 text-primary animate-pulse" />
              </div>
              
              <div className="space-y-3">
                <h3 className="font-medium">Scanning Receipt...</h3>
                <Progress value={scanProgress} className="h-2" />
                <p className="text-sm text-muted-foreground">
                  {scanProgress < 20 && "Analyzing image quality..."}
                  {scanProgress >= 20 && scanProgress < 40 && "Detecting text regions..."}
                  {scanProgress >= 40 && scanProgress < 60 && "Extracting text content..."}
                  {scanProgress >= 60 && scanProgress < 80 && "Parsing receipt data..."}
                  {scanProgress >= 80 && scanProgress < 100 && "Validating information..."}
                  {scanProgress >= 100 && "Scan complete!"}
                </p>
              </div>
            </div>
          )}

          {scanStep === 'result' && scanResult && (
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-6 h-6 text-green-600" />
                <div>
                  <h3 className="font-medium">Receipt Scanned Successfully</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge {...getConfidenceBadge(scanResult.confidence)}>
                      {getConfidenceBadge(scanResult.confidence).label}
                    </Badge>
                    <span className={`text-sm ${getConfidenceColor(scanResult.confidence)}`}>
                      {scanResult.confidence}% accuracy
                    </span>
                  </div>
                </div>
              </div>

              {/* Extracted Data */}
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                  <div>
                    <p className="text-sm text-muted-foreground">Merchant</p>
                    <p className="font-medium">{scanResult.merchant}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Date</p>
                    <p className="font-medium">{scanResult.date}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Amount</p>
                    <p className="font-semibold text-lg text-primary">₹{scanResult.total}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Category</p>
                    <Badge variant="outline">{scanResult.category}</Badge>
                  </div>
                </div>

                {/* Items */}
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Items ({scanResult.items.length})</h4>
                  <div className="max-h-32 overflow-y-auto space-y-1">
                    {scanResult.items.map((item, index) => (
                      <div key={index} className="flex justify-between items-center text-sm p-2 bg-background border rounded">
                        <span>{item.name} {item.quantity > 1 && `(${item.quantity}x)`}</span>
                        <span className="font-medium">₹{item.price}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {scanResult.confidence < 85 && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Please review the extracted data carefully. You can edit the details when creating the expense.
                    </AlertDescription>
                  </Alert>
                )}
              </div>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-3">
                <Button 
                  variant="outline" 
                  onClick={handleRetry}
                  className="sm:flex-1 gap-2"
                >
                  <RotateCw className="w-4 h-4" />
                  Scan Again
                </Button>
                <Button 
                  onClick={handleConfirmScan}
                  className="sm:flex-1 gap-2"
                >
                  <CheckCircle className="w-4 h-4" />
                  Use This Data
                </Button>
              </div>
            </div>
          )}

          {/* Close Button */}
          {scanStep === 'upload' && (
            <div className="pt-2">
              <Button 
                variant="outline" 
                className="w-full" 
                onClick={handleClose}
              >
                Cancel
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}