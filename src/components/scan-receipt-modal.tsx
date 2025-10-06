import React, { useState } from 'react';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Separator } from './ui/separator';
import { Card, CardContent } from './ui/card';
import * as Sonner from 'sonner';
import { Scan, Camera, X, Upload } from 'lucide-react';

interface ScanReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const ScanReceiptModal: React.FC<ScanReceiptModalProps> = ({ isOpen, onClose, onSuccess }) => {
  // Safe toast wrapper (falls back to console if Sonner.toast is unavailable)
  const notify = {
    info: (msg: string) => ((Sonner as any).toast?.info ? (Sonner as any).toast.info(msg) : (Sonner as any).toast ? (Sonner as any).toast(msg) : console.info(msg)),
    success: (msg: string) => ((Sonner as any).toast?.success ? (Sonner as any).toast.success(msg) : (Sonner as any).toast ? (Sonner as any).toast(msg) : console.info(msg)),
    error: (msg: string) => ((Sonner as any).toast?.error ? (Sonner as any).toast.error(msg) : (Sonner as any).toast ? (Sonner as any).toast(msg) : console.error(msg)),
  };
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [extractedItems, setExtractedItems] = useState<Array<{name: string, price: number, quantity: number}>>([]);
  const [receiptDetails, setReceiptDetails] = useState<{
    merchantName: string;
    date: string;
    totalAmount: number;
  }>({
    merchantName: '',
    date: new Date().toISOString().split('T')[0],
    totalAmount: 0,
  });

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Enforce JPG/PNG only and max 5MB
    const maxSize = 5 * 1024 * 1024; // 5MB
    const allowedTypes = ['image/jpeg', 'image/png'];
    if (file.size > maxSize) {
      notify.error('File size exceeds 5MB. Please upload a smaller image.');
      return;
    }
    if (!allowedTypes.includes(file.type)) {
      notify.error('Unsupported file type. Please upload a JPG or PNG image.');
      return;
    }

    // Preview the image and advance to processing step
    const reader = new FileReader();
    reader.onload = () => {
      setUploadedImage(reader.result as string);
      setCurrentStep(2);
    };
    reader.readAsDataURL(file);
  };

  const simulateImageProcessing = () => {
    setIsProcessing(true);
    notify.info('Processing receipt image...');

    // TODO: Replace with actual receipt processing API
    setTimeout(() => {
      setExtractedItems([
        { name: 'Coffee', price: 4.50, quantity: 2 },
        { name: 'Bagel with Cream Cheese', price: 3.75, quantity: 1 },
        { name: 'Orange Juice', price: 2.25, quantity: 1 },
      ]);
      setReceiptDetails({
        merchantName: 'Starbucks Coffee',
        date: new Date().toISOString().split('T')[0],
        totalAmount: 15.00,
      });
      setCurrentStep(3);
      setIsProcessing(false);
      notify.success('Receipt data extracted successfully');
    }, 1500);
  };

  const handleCameraCapture = async () => {
    notify.info('Camera capture is not available in this demo. Please upload an image.');
  };


  const handleConfirmDetails = () => {
      // Validate receipt details
      if (!receiptDetails.merchantName.trim()) {
        notify.error('Please enter a merchant name.');
        return;
      }
      if (receiptDetails.totalAmount <= 0 || isNaN(receiptDetails.totalAmount)) {
        notify.error('Please enter a valid total amount.');
        return;
      }
      if (extractedItems.length === 0) {
        notify.error('At least one item is required.');
        return;
      }
      if (extractedItems.some(item => !item.name.trim() || item.price <= 0 || item.quantity < 1)) {
        notify.error('Please ensure all items have valid names, prices, and quantities.');
        return;
      }

      notify.success('Expense created from receipt');
    onSuccess?.();
    onClose();
  };

  const handleBack = () => {
    if (currentStep === 2) {
      setUploadedImage(null);
    }
    setCurrentStep(prev => Math.max(1, prev - 1));
  };

  const handleCancel = () => {
    setUploadedImage(null);
    setCurrentStep(1);
    setIsProcessing(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleCancel}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Scan className="h-5 w-5" />
            Scan Receipt
          </DialogTitle>
          <DialogDescription>
            Upload a receipt image to automatically extract expense details
          </DialogDescription>
        </DialogHeader>

        {currentStep === 1 && (
          <div className="grid gap-6 py-4">
            <Tabs defaultValue="upload" className="w-full">
              <TabsList className="grid grid-cols-2 mb-6">
                <TabsTrigger value="upload">Upload Image</TabsTrigger>
                <TabsTrigger value="camera">Take Photo</TabsTrigger>
              </TabsList>
              
              <TabsContent value="upload" className="space-y-4">
                <Card className="border-2 border-dashed">
                  <CardContent className="p-8 flex flex-col items-center justify-center text-center">
                    <Upload className="h-12 w-12 text-muted-foreground mb-4" />
                    <h4 className="font-medium mb-1">Drag and drop your receipt image here</h4>
                    <p className="text-sm text-muted-foreground mb-4">Supports JPG and PNG files up to 5MB</p>
                    <div className="relative">
                      <Button variant="default">Select File</Button>
                      <input
                        type="file"
                        accept=".jpg,.jpeg,.png"
                        onChange={handleImageUpload}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="camera" className="space-y-4">
                <Card className="border-2 border-dashed">
                  <CardContent className="p-8 flex flex-col items-center justify-center text-center">
                    <Camera className="h-12 w-12 text-muted-foreground mb-4" />
                    <h4 className="font-medium mb-1">Take a photo of your receipt</h4>
                    <p className="text-sm text-muted-foreground mb-4">Ensure good lighting and clear focus</p>
                    <Button variant="default" onClick={handleCameraCapture}>
                      Open Camera
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        )}

        {currentStep === 2 && (
          <div className="grid gap-6 py-4">
            {uploadedImage && (
              <div className="relative rounded-lg overflow-hidden border">
                <img
                  src={uploadedImage}
                  alt="Receipt preview"
                  className="w-full h-auto max-h-64 object-contain"
                />
                <Button
                  variant="destructive"
                  size="sm"
                  className="absolute top-2 right-2 rounded-full h-8 w-8 p-0"
                  onClick={() => setUploadedImage(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
            
            <div className="space-y-4">
              <h4 className="font-medium">Process Receipt</h4>
              <p className="text-sm text-muted-foreground">
                Our AI will extract merchant name, date, total amount, and individual items from your receipt.
              </p>
              <Button
                variant="default"
                className="w-full"
                onClick={simulateImageProcessing}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <>
                    <div className="mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Processing...
                  </>
                ) : (
                  'Extract Information'
                )}
              </Button>
            </div>
          </div>
        )}

        {currentStep === 3 && (
          <div className="grid gap-6 py-4">
            <div className="space-y-4">
              <h4 className="font-medium">Review Extracted Information</h4>
              
              <div className="space-y-3">
                <div className="grid grid-cols-3 items-center gap-2">
                  <Label htmlFor="merchant-name" className="text-right">Merchant:</Label>
                  <Input
                    id="merchant-name"
                    className="col-span-2"
                    value={receiptDetails.merchantName}
                    onChange={(e) => setReceiptDetails({ ...receiptDetails, merchantName: e.target.value })}
                  />
                </div>
                
                <div className="grid grid-cols-3 items-center gap-2">
                  <Label htmlFor="receipt-date" className="text-right">Date:</Label>
                  <Input
                    id="receipt-date"
                    type="date"
                    className="col-span-2"
                    value={receiptDetails.date}
                    onChange={(e) => setReceiptDetails({ ...receiptDetails, date: e.target.value })}
                  />
                </div>
                
                <div className="grid grid-cols-3 items-center gap-2">
                  <Label htmlFor="total-amount" className="text-right">Total Amount:</Label>
                  <Input
                    id="total-amount"
                    type="number"
                    step="0.01"
                    className="col-span-2"
                    value={receiptDetails.totalAmount}
                    onChange={(e) => setReceiptDetails({ ...receiptDetails, totalAmount: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>
              
              <Separator />
              
              <div className="space-y-3">
                <h5 className="font-medium">Extracted Items</h5>
                {extractedItems.map((item, index) => (
                  <div key={index} className="grid grid-cols-12 gap-2 items-center p-2 rounded-lg bg-muted/30">
                    <div className="col-span-6">
                      <Input
                        value={item.name}
                        onChange={(e) => {
                          const updatedItems = [...extractedItems];
                          updatedItems[index].name = e.target.value;
                          setExtractedItems(updatedItems);
                        }}
                      />
                    </div>
                    <div className="col-span-3">
                      <Input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => {
                          const updatedItems = [...extractedItems];
                          updatedItems[index].quantity = Math.max(1, parseInt(e.target.value) || 1);
                          setExtractedItems(updatedItems);
                        }}
                      />
                    </div>
                    <div className="col-span-3">
                      <Input
                        type="number"
                        step="0.01"
                        value={item.price}
                        onChange={(e) => {
                          const updatedItems = [...extractedItems];
                          updatedItems[index].price = parseFloat(e.target.value) || 0;
                          setExtractedItems(updatedItems);
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="flex gap-3 pt-4">
          {currentStep > 1 && (
            <Button variant="outline" onClick={handleBack}>
              Back
            </Button>
          )}
          {currentStep < 3 && (
            <Button variant="destructive" onClick={handleCancel} className={currentStep === 1 ? 'ml-auto' : ''}>
              Cancel
            </Button>
          )}
          {currentStep === 3 && (
            <Button variant="default" onClick={handleConfirmDetails} className="ml-auto">
              Confirm & Create Expense
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
