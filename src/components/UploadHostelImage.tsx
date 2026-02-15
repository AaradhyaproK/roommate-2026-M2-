import { useState } from 'react';
import { uploadImageToImgBB } from '../lib/imgbb';
// Adjust these imports based on where your UI components are located
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export function UploadHostelImage() {
  const [uploading, setUploading] = useState(false);
  const [imageUrl, setImageUrl] = useState<string>("");

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const url = await uploadImageToImgBB(file);
      setImageUrl(url);
      console.log("Image uploaded:", url);
    } catch (error) {
      console.error(error);
      alert("Failed to upload image");
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">Upload Image</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          {/* DialogTitle is required for accessibility */}
          <DialogTitle>Upload Hostel Image</DialogTitle>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <input 
            type="file" 
            accept="image/*"
            onChange={handleUpload}
            disabled={uploading}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          />
          
          {uploading && <p className="text-sm text-muted-foreground">Uploading...</p>}
          
          {imageUrl && (
            <div className="mt-2">
              <p className="text-sm font-medium mb-2">Uploaded Image:</p>
              <img src={imageUrl} alt="Hostel" className="rounded-md border max-h-48 object-cover" />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}