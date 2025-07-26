import { useState, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Upload, CloudUpload, FileText, Trash2, CheckCircle } from "lucide-react";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { useToast } from "@/hooks/use-toast";

export default function FileUpload() {
  const [resumeFile, setResumeFile] = useLocalStorage<File | null>("resumeFile", null);
  const [coverLetterFile, setCoverLetterFile] = useLocalStorage<File | null>("coverLetterFile", null);
  const [isDragging, setIsDragging] = useState<string | null>(null);
  
  const resumeInputRef = useRef<HTMLInputElement>(null);
  const coverLetterInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const validateFile = (file: File): boolean => {
    const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    const maxSize = 5 * 1024 * 1024; // 5MB

    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: "Only PDF, DOC, and DOCX files are allowed.",
        variant: "destructive",
      });
      return false;
    }

    if (file.size > maxSize) {
      toast({
        title: "File too large",
        description: "File size must be less than 5MB.",
        variant: "destructive",
      });
      return false;
    }

    return true;
  };

  const handleFileSelect = (file: File, type: 'resume' | 'coverLetter') => {
    if (!validateFile(file)) return;

    if (type === 'resume') {
      setResumeFile(file);
      toast({
        title: "Resume uploaded",
        description: `${file.name} has been uploaded successfully.`,
      });
    } else {
      setCoverLetterFile(file);
      toast({
        title: "Cover letter uploaded",
        description: `${file.name} has been uploaded successfully.`,
      });
    }
  };

  const handleDrop = (e: React.DragEvent, type: 'resume' | 'coverLetter') => {
    e.preventDefault();
    setIsDragging(null);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0], type);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDragEnter = (type: string) => {
    setIsDragging(type);
  };

  const handleDragLeave = () => {
    setIsDragging(null);
  };

  const FileUploadArea = ({ 
    type, 
    file, 
    onFileSelect, 
    inputRef, 
    required = false 
  }: {
    type: 'resume' | 'coverLetter';
    file: File | null;
    onFileSelect: (file: File) => void;
    inputRef: React.RefObject<HTMLInputElement>;
    required?: boolean;
  }) => (
    <div>
      <Label className="block text-sm font-medium text-gray-700 mb-2">
        {type === 'resume' ? 'Resume' : 'Cover Letter'}
        {required && <span className="text-red-500 ml-1">*</span>}
        {!required && <span className="text-gray-400 ml-1">(Optional)</span>}
      </Label>
      
      {!file ? (
        <div
          className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all ${
            isDragging === type
              ? 'border-primary bg-blue-50'
              : 'border-gray-300 hover:border-primary hover:bg-blue-50'
          }`}
          onClick={() => inputRef.current?.click()}
          onDrop={(e) => handleDrop(e, type)}
          onDragOver={handleDragOver}
          onDragEnter={() => handleDragEnter(type)}
          onDragLeave={handleDragLeave}
        >
          <CloudUpload className="mx-auto h-8 w-8 text-gray-400 mb-2" />
          <p className="text-sm text-gray-600 mb-1">
            <span className="font-medium text-primary">Click to upload</span> or drag and drop
          </p>
          <p className="text-xs text-gray-500">PDF, DOC, DOCX (Max 5MB)</p>
          <input
            ref={inputRef}
            type="file"
            className="hidden"
            accept=".pdf,.doc,.docx"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onFileSelect(file);
            }}
          />
        </div>
      ) : (
        <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <CheckCircle className="h-5 w-5 text-success" />
              <div>
                <p className="text-sm font-medium text-gray-900">{file.name}</p>
                <p className="text-xs text-gray-500">
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                if (type === 'resume') setResumeFile(null);
                else setCoverLetterFile(null);
                if (inputRef.current) inputRef.current.value = '';
              }}
              className="text-gray-400 hover:text-red-500"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center space-x-2 mb-6">
          <Upload className="text-primary" />
          <h2 className="text-lg font-semibold text-gray-900">Documents</h2>
        </div>

        <div className="space-y-4">
          <FileUploadArea
            type="resume"
            file={resumeFile}
            onFileSelect={(file) => handleFileSelect(file, 'resume')}
            inputRef={resumeInputRef}
            required
          />

          <FileUploadArea
            type="coverLetter"
            file={coverLetterFile}
            onFileSelect={(file) => handleFileSelect(file, 'coverLetter')}
            inputRef={coverLetterInputRef}
          />
        </div>
      </CardContent>
    </Card>
  );
}
