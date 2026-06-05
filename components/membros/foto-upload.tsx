"use client";

import { useState, useRef, useEffect } from "react";
import { Camera, Upload, X, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Spinner } from "@/components/ui/spinner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface FotoUploadProps {
  fotoUrl?: string;
  nome?: string;
  onFotoChange: (base64: string | null) => void;
  disabled?: boolean;
}

export function FotoUpload({ fotoUrl, nome, onFotoChange, disabled }: FotoUploadProps) {
  const [preview, setPreview] = useState<string | null>(fotoUrl || null);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);

  // Attach stream to video element when both are available
  useEffect(() => {
    if (stream && videoRef.current && cameraActive) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(() => {});
    }
  }, [stream, cameraActive]);

  const getInitials = (name?: string) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Por favor, selecione uma imagem");
      return;
    }

    setLoading(true);
    try {
      const base64 = await fileToBase64(file);
      setPreview(base64);
      onFotoChange(base64);
    } catch (error) {
      console.error("Erro ao processar imagem:", error);
    } finally {
      setLoading(false);
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  };

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: 640, height: 480 },
      });
      setStream(mediaStream);
      setCameraActive(true);
      
      // Wait for video element to be mounted, then attach stream
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          videoRef.current.play().catch(() => {});
        }
      }, 200);
    } catch (error) {
      console.error("Erro ao acessar câmera:", error);
      alert("Não foi possível acessar a câmera. Verifique as permissões do navegador.");
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    setCameraActive(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");

    if (!context) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0);

    const base64 = canvas.toDataURL("image/jpeg", 0.8);
    setPreview(base64);
    onFotoChange(base64);
    stopCamera();
    setDialogOpen(false);
  };

  const removePhoto = () => {
    setPreview(null);
    onFotoChange(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative">
        <Avatar className="h-32 w-32 border-4 border-background shadow-lg">
          <AvatarImage src={preview || undefined} alt={nome} />
          <AvatarFallback className="text-2xl bg-muted">
            {loading ? <Spinner className="h-8 w-8" /> : getInitials(nome)}
          </AvatarFallback>
        </Avatar>

        {preview && !disabled && (
          <Button
            type="button"
            variant="destructive"
            size="icon"
            className="absolute -right-2 -top-2 h-8 w-8 rounded-full"
            onClick={removePhoto}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {!disabled && (
        <div className="flex gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileSelect}
          />

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={loading}
          >
            <Upload className="mr-2 h-4 w-4" />
            Upload
          </Button>

          <Dialog 
            open={dialogOpen} 
            onOpenChange={(open) => {
              setDialogOpen(open);
              if (open) {
                // Auto-start camera when dialog opens
                setTimeout(() => startCamera(), 100);
              } else {
                stopCamera();
              }
            }}
          >
            <DialogTrigger asChild>
              <Button type="button" variant="outline" size="sm" disabled={loading}>
                <Camera className="mr-2 h-4 w-4" />
                Câmera
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Tirar Foto</DialogTitle>
              </DialogHeader>
              <div className="flex flex-col items-center gap-4">
                {cameraActive ? (
                  <>
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full max-w-sm rounded-lg bg-black"
                    />
                    <canvas ref={canvasRef} className="hidden" />
                    <div className="flex gap-2">
                      <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                        Cancelar
                      </Button>
                      <Button type="button" onClick={capturePhoto}>
                        <Camera className="mr-2 h-4 w-4" />
                        Capturar
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center gap-4 py-8">
                    <Spinner className="h-8 w-8" />
                    <p className="text-sm text-muted-foreground">
                      Ativando câmera...
                    </p>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </div>
      )}
    </div>
  );
}
