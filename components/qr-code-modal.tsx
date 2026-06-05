"use client";

import { useState } from "react";
import QRCode from "react-qr-code";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { QrCode, Download, Copy, Share2 } from "lucide-react";
import { toast } from "sonner";

interface QRCodeModalProps {
  url: string;
  title: string;
  description?: string;
  triggerLabel?: string;
  triggerVariant?: "default" | "outline" | "ghost" | "secondary";
  triggerSize?: "default" | "sm" | "lg" | "icon";
}

export function QRCodeModal({
  url,
  title,
  description,
  triggerLabel = "QR Code",
  triggerVariant = "outline",
  triggerSize = "sm",
}: QRCodeModalProps) {
  const [open, setOpen] = useState(false);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(url);
    toast.success("Link copiado!");
  };

  const handleShareWhatsApp = () => {
    const text = `${title}: ${url}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  };

  const handleDownloadQR = () => {
    const svg = document.getElementById("qr-code-svg");
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx?.drawImage(img, 0, 0);
      const pngUrl = canvas.toDataURL("image/png");
      const downloadLink = document.createElement("a");
      downloadLink.download = `qrcode-${title.toLowerCase().replace(/\s+/g, "-")}.png`;
      downloadLink.href = pngUrl;
      downloadLink.click();
      toast.success("QR Code baixado!");
    };

    img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={triggerVariant} size={triggerSize}>
          <QrCode className="mr-2 h-4 w-4" />
          {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <div className="flex flex-col items-center gap-6 py-4">
          <div className="rounded-lg bg-white p-4 shadow-sm">
            <QRCode
              id="qr-code-svg"
              value={url}
              size={200}
              level="H"
              fgColor="#0d9488"
            />
          </div>
          <p className="max-w-full break-all text-center text-sm text-muted-foreground">
            {url}
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            <Button variant="outline" size="sm" onClick={handleCopyLink}>
              <Copy className="mr-2 h-4 w-4" />
              Copiar Link
            </Button>
            <Button variant="outline" size="sm" onClick={handleShareWhatsApp}>
              <Share2 className="mr-2 h-4 w-4" />
              WhatsApp
            </Button>
            <Button variant="outline" size="sm" onClick={handleDownloadQR}>
              <Download className="mr-2 h-4 w-4" />
              Baixar QR
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
