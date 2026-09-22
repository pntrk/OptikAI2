import React, { useState, useEffect, useRef } from 'react';
import { Exam, Anchors, Point, LaserMark, Student } from '../types';
import { Icons } from './Icons';
import { DEFAULT_OMR, OPTS_4, OPTS_5, getHomography, applyHomography, getQuestionsLayout } from '../constants';

interface ReadTabProps {
  exam: Exam;
  updateExam: (updates: Partial<Exam>) => void;
  setActiveTab: (tab: string) => void;
  totalQ: number;
  activeTab: string;
  schoolStudents?: Student[];
  showAlert: (msg: string) => void;
}

export function ReadTab({ exam, updateExam, setActiveTab: _setActiveTab, totalQ, activeTab, schoolStudents, showAlert }: ReadTabProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const arGuideRef = useRef<HTMLDivElement | null>(null);
  const lockCounter = useRef(0);

  const nativeCameraRef = useRef<HTMLInputElement | null>(null);

  const autoRotateTriedRef = useRef(0);
  const autoAlignTriedRef = useRef(false);

  const [imageLoaded, setImageLoaded] = useState(false);
  const [omrImg, setOmrImg] = useState<HTMLImageElement | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState("");

  const [anchors, setAnchors] = useState<Anchors | null>(null);
  const [draggingNode, setDraggingNode] = useState<'tl' | 'tr' | 'bl' | 'br' | null>(null);

  const [batchFiles, setBatchFiles] = useState<File[]>([]);
  const [batchIndex, setBatchIndex] = useState(-1);

  const [autoMode, setAutoMode] = useState(false);
  const [autoSaveSingle, setAutoSaveSingle] = useState(true);
  const [expectedFormat, setExpectedFormat] = useState('auto');
  const [laserMarks, setLaserMarks] = useState<LaserMark[]>([]);

  const [rotation90, setRotation90] = useState(0);
  const [fineAngle, setFineAngle] = useState(0);

  const [homographyMat, setHomographyMat] = useState<number[] | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [lockLevel, setLockLevel] = useState(0);
  const [torchAvailable, setTorchAvailable] = useState(false);
  const [isTorchOn, setIsTorchOn] = useState(false);
  const [cameraFacing, setCameraFacing] = useState<'environment' | 'user'>('environment');
  const [detectedQrCode, setDetectedQrCode] = useState<string | null>(null);

  const scannedFormatRef = useRef('standard');
  const scannedQrRef = useRef<string | null>(null);

  const playSuccessChime = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.18);
      osc.start();
      osc.stop(ctx.currentTime + 0.18);
    } catch (e) {}
    try {
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([70, 40, 70]);
      }
    } catch (e) {}
  };

  const processPdfToFiles = async (pdfFile: File): Promise<File[]> => {
    if (!window.pdfjsLib) throw new Error("PDF kütüphanesi yüklenemedi.");
    const arrayBuffer = await pdfFile.arrayBuffer();
    const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const extractedFiles: File[] = [];

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: 2.0 });
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) continue;
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      await page.render({ canvasContext: ctx, viewport: viewport }).promise;

      const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.95));
      if (blob) {
        const newFile = new File([blob], `${pdfFile.name.replace(/\.pdf$/i, '')}_Sayfa_${i}.jpg`, { type: 'image/jpeg' });
        extractedFiles.push(newFile);
      }
    }
    return extractedFiles;
  };

  const getActiveOMR = () => {
    const activeFmt = expectedFormat === 'auto' ? scannedFormatRef.current : expectedFormat;
    return activeFmt === 'mebi'
      ? { ...DEFAULT_OMR, infoBox: { ...DEFAULT_OMR.infoBox, h: 35 }, qBox: { ...DEFAULT_OMR.qBox, y: 65 } }
      : DEFAULT_OMR;
  };

  const getCanvasCoords = (e: React.MouseEvent | React.TouchEvent): Point | null => {
    const cvs = overlayCanvasRef.current;
    if (!cvs) return null;
    const rect = cvs.getBoundingClientRect();

    let clientX: number, clientY: number;
    if ('touches' in e && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else if ('clientX' in e) {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    } else {
      return null;
    }

    const canvasRatio = cvs.width / cvs.height;
    const elementRatio = rect.width / rect.height;
    let renderedW: number, renderedH: number, offsetX = 0, offsetY = 0;

    if (canvasRatio > elementRatio) {
      renderedW = rect.width;
      renderedH = rect.width / canvasRatio;
      offsetY = (rect.height - renderedH) / 2;
    } else {
      renderedH = rect.height;
      renderedW = rect.height * canvasRatio;
      offsetX = (rect.width - renderedW) / 2;
    }

    const x = ((clientX - rect.left - offsetX) / renderedW) * cvs.width;
    const y = ((clientY - rect.top - offsetY) / renderedH) * cvs.height;

    return { x, y };
  };

  const handlePtrDown = (e: React.MouseEvent | React.TouchEvent) => {
    if (!anchors || isProcessing || isCameraActive) return;
    const pos = getCanvasCoords(e);
    if (!pos) return;

    let closest: 'tl' | 'tr' | 'bl' | 'br' | null = null;
    let minDist = 250;
    const keys: ('tl' | 'tr' | 'bl' | 'br')[] = ['tl', 'tr', 'bl', 'br'];
    keys.forEach(key => {
      const p = anchors[key];
      const dist = Math.hypot(p.x - pos.x, p.y - pos.y);
      if (dist < minDist) {
        minDist = dist;
        closest = key;
      }
    });

    if (closest) {
      setDraggingNode(closest);
      if (e.cancelable) e.preventDefault();
    }
  };

  const handlePtrMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!draggingNode || !anchors || isCameraActive) return;
    const pos = getCanvasCoords(e);
    if (!pos) return;

    const newAnchors = { ...anchors, [draggingNode]: pos };
    setAnchors(newAnchors);

    const srcPts = [
      { x: DEFAULT_OMR.anchorMargin, y: DEFAULT_OMR.anchorMargin },
      { x: DEFAULT_OMR.paperW - DEFAULT_OMR.anchorMargin, y: DEFAULT_OMR.anchorMargin },
      { x: DEFAULT_OMR.anchorMargin, y: DEFAULT_OMR.paperH - DEFAULT_OMR.anchorMargin },
      { x: DEFAULT_OMR.paperW - DEFAULT_OMR.anchorMargin, y: DEFAULT_OMR.paperH - DEFAULT_OMR.anchorMargin }
    ];
    const dstPts = [newAnchors.tl, newAnchors.tr, newAnchors.bl, newAnchors.br];
    const H = getHomography(srcPts, dstPts);
    setHomographyMat(H);

    drawOverlay(newAnchors, H, laserMarks, getActiveOMR());
  };

  const handlePtrUp = () => {
    setDraggingNode(null);
  };

  const scanQRRobustly = (ctx: CanvasRenderingContext2D, w: number, h: number): string | null => {
    if (typeof window === 'undefined' || !window.jsQR) return null;

    let code = window.jsQR(ctx.getImageData(0, 0, w, h).data, w, h, { inversionAttempts: "dontInvert" });
    if (code && code.data) return code.data;

    const qrW = Math.floor(w * 0.45);
    const qrH = Math.floor(h * 0.35);
    const qrX = w - qrW;
    const qrY = 0;
    const qrImgData = ctx.getImageData(qrX, qrY, qrW, qrH);

    code = window.jsQR(qrImgData.data, qrW, qrH, { inversionAttempts: "dontInvert" });
    if (code && code.data) return code.data;

    code = window.jsQR(qrImgData.data, qrW, qrH, { inversionAttempts: "invertFirst" });
    if (code && code.data) return code.data;

    const thresholds = [128, 160, 100];
    for (const t of thresholds) {
      const binarized = new Uint8ClampedArray(qrImgData.data);
      for (let i = 0; i < binarized.length; i += 4) {
        const luma = 0.299 * binarized[i] + 0.587 * binarized[i + 1] + 0.114 * binarized[i + 2];
        const v = luma > t ? 255 : 0;
        binarized[i] = binarized[i + 1] = binarized[i + 2] = v;
      }
      code = window.jsQR(binarized, qrW, qrH, { inversionAttempts: "dontInvert" });
      if (code && code.data) return code.data;
    }
    return null;
  };

  useEffect(() => {
    let captureInterval: any;
    if (activeTab !== 'read') {
      stopCamera();
    } else if (isCameraActive && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(e => console.warn("Video oynatma hatası:", e));

      captureInterval = setInterval(() => {
        if (isProcessing) return;
        const video = videoRef.current;
        const guide = arGuideRef.current;
        if (!video || !guide || video.videoWidth === 0) return;

        try {
          const canvas = document.createElement('canvas');
          canvas.width = 420; canvas.height = 594;
          const ctx = canvas.getContext('2d', { willReadFrequently: true });
          if (!ctx) return;

          const videoRect = video.getBoundingClientRect();
          const guideRect = guide.getBoundingClientRect();
          const videoRatio = video.videoWidth / video.videoHeight;
          const containerRatio = videoRect.width / videoRect.height;
          let drawWidth: number, drawHeight: number, offsetX = 0, offsetY = 0;

          if (videoRatio > containerRatio) {
            drawHeight = video.videoHeight; drawWidth = video.videoHeight * containerRatio;
            offsetX = (video.videoWidth - drawWidth) / 2;
          } else {
            drawWidth = video.videoWidth; drawHeight = video.videoWidth / containerRatio;
            offsetY = (video.videoHeight - drawHeight) / 2;
          }
          const scale = drawWidth / videoRect.width;
          const cropX = offsetX + (guideRect.left - videoRect.left) * scale;
          const cropY = offsetY + (guideRect.top - videoRect.top) * scale;
          const cropW = guideRect.width * scale;
          const cropH = guideRect.height * scale;

          ctx.drawImage(video, cropX, cropY, cropW, cropH, 0, 0, canvas.width, canvas.height);
          const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);

          if (!scannedQrRef.current) {
            const qrRes = scanQRRobustly(ctx, canvas.width, canvas.height);
            if (qrRes) {
              scannedQrRef.current = qrRes;
              setDetectedQrCode(qrRes);
              if (qrRes.includes('N:')) {
                scannedFormatRef.current = 'mebi';
                if (expectedFormat === 'auto') setStatus(`✅ Öğrenciye Özel Karekodlu Form Algılandı`);
              } else {
                scannedFormatRef.current = 'mebi';
                if (expectedFormat === 'auto') setStatus(`✅ Karekodlu Form Algılandı`);
              }
            }
          }

          const getMinLumaInRegion = (cx: number, cy: number, radius: number) => {
            let minLuma = 255;
            for (let y = -radius; y <= radius; y++) {
              for (let x = -radius; x <= radius; x++) {
                const px = Math.floor(cx + x);
                const py = Math.floor(cy + y);
                if (px >= 0 && px < canvas.width && py >= 0 && py < canvas.height) {
                  const i = (py * canvas.width + px) * 4;
                  const luma = 0.299 * imgData.data[i] + 0.587 * imgData.data[i + 1] + 0.114 * imgData.data[i + 2];
                  if (luma < minLuma) minLuma = luma;
                }
              }
            }
            return minLuma;
          };

          const getAvgLumaInRegion = (cx: number, cy: number, radius: number) => {
            let sum = 0, count = 0;
            for (let y = -radius; y <= radius; y++) {
              for (let x = -radius; x <= radius; x++) {
                const px = Math.floor(cx + x);
                const py = Math.floor(cy + y);
                if (px >= 0 && px < canvas.width && py >= 0 && py < canvas.height) {
                  sum += 0.299 * imgData.data[(py * canvas.width + px) * 4] + 0.587 * imgData.data[(py * canvas.width + px) * 4 + 1] + 0.114 * imgData.data[(py * canvas.width + px) * 4 + 2];
                  count++;
                }
              }
            }
            return sum / count;
          };

          const tl = getMinLumaInRegion(420 * 0.0238, 594 * 0.0168, 20);
          const tr = getMinLumaInRegion(420 * 0.9762, 594 * 0.0168, 20);
          const bl = getMinLumaInRegion(420 * 0.0238, 594 * 0.9832, 20);
          const br = getMinLumaInRegion(420 * 0.9762, 594 * 0.9832, 20);
          const center = getAvgLumaInRegion(210, 297, 10);

          const isStableAnchor = (val: number) => val < 130 && (center - val) > 45;

          if (center > 120 && isStableAnchor(tl) && isStableAnchor(tr) && isStableAnchor(bl) && isStableAnchor(br)) {
            lockCounter.current += 1;
            setLockLevel(lockCounter.current);

            if (lockCounter.current === 3) {
              setStatus("Hedef algılandı, mercek odaklanıyor... ⏳");
            } else if (lockCounter.current === 8) {
              setStatus("Geometrik analiz yapılıyor, sabit tutun... 🔒");
            } else if (lockCounter.current >= 15) {
              clearInterval(captureInterval);
              performCapture(video, guide);
            }
          } else {
            if (lockCounter.current > 0) {
              lockCounter.current = 0;
              setLockLevel(0);
              if (!scannedQrRef.current) setStatus("Siyah kareleri pencerelere yerleştirin.");
            }
          }
        } catch (e) {}
      }, 250);
    }

    return () => {
      if (captureInterval) clearInterval(captureInterval);
    };
  }, [isCameraActive, activeTab, isProcessing, expectedFormat]);

  const startCamera = async (facing: 'environment' | 'user' = cameraFacing) => {
    setIsProcessing(true);
    setRotation90(0); setFineAngle(0);
    setStatus("Kamera hazırlanıyor...");
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setIsProcessing(false);
        setStatus("Sistem kamerası açılıyor...");
        if (nativeCameraRef.current) nativeCameraRef.current.click();
        return;
      }

      const streamPromise = navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing, width: { ideal: 1920 }, height: { ideal: 1080 } }
      });
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Timeout")), 3000)
      );

      const stream = await Promise.race([streamPromise, timeoutPromise]);

      streamRef.current = stream;
      const track = stream.getVideoTracks()[0];
      if (track) {
        const capabilities: any = track.getCapabilities ? track.getCapabilities() : {};
        setTorchAvailable(!!capabilities.torch);
        setIsTorchOn(false);
      }
      setCameraFacing(facing);
      setIsCameraActive(true);
      setImageLoaded(false);
      setOmrImg(null);
      setAnchors(null);
      setLaserMarks([]);
      setIsProcessing(false);
      scannedQrRef.current = null;
      setDetectedQrCode(null);
      lockCounter.current = 0;
      setLockLevel(0);
      setStatus("Kamera hazır. Optik formu vizöre hizalayın...");
    } catch (err) {
      setIsProcessing(false);
      setStatus("Kamera başlatılamadı. Sistem kamerası açılıyor...");
      if (nativeCameraRef.current) nativeCameraRef.current.click();
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
    setIsTorchOn(false);
    setLockLevel(0);
    setIsProcessing(false);
    setStatus("");
    setDetectedQrCode(null);
  };

  const toggleTorch = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (!track) return;
    try {
      const nextTorch = !isTorchOn;
      await (track as any).applyConstraints({
        advanced: [{ torch: nextTorch }]
      });
      setIsTorchOn(nextTorch);
    } catch (e) {
      console.warn("Flaş kontrolü desteklenmiyor:", e);
    }
  };

  const switchCamera = async () => {
    const nextFacing = cameraFacing === 'environment' ? 'user' : 'environment';
    stopCamera();
    setTimeout(() => {
      startCamera(nextFacing);
    }, 250);
  };

  const performCapture = (videoNode: HTMLVideoElement, guideNode: HTMLDivElement) => {
    setIsProcessing(true);
    setStatus("Fotoğraf analiz ediliyor...");

    const videoRect = videoNode.getBoundingClientRect();
    const guideRect = guideNode.getBoundingClientRect();
    const videoRatio = videoNode.videoWidth / videoNode.videoHeight;
    const containerRatio = videoRect.width / videoRect.height;

    let drawWidth: number, drawHeight: number, offsetX = 0, offsetY = 0;
    if (videoRatio > containerRatio) {
      drawHeight = videoNode.videoHeight; drawWidth = videoNode.videoHeight * containerRatio;
      offsetX = (videoNode.videoWidth - drawWidth) / 2;
    } else {
      drawWidth = videoNode.videoWidth; drawHeight = videoNode.videoWidth / containerRatio;
      offsetY = (videoNode.videoHeight - drawHeight) / 2;
    }

    const scale = drawWidth / videoRect.width;
    const cropX = offsetX + (guideRect.left - videoRect.left) * scale;
    const cropY = offsetY + (guideRect.top - videoRect.top) * scale;
    const cropW = guideRect.width * scale;
    const cropH = guideRect.height * scale;

    const canvas = document.createElement('canvas');
    canvas.width = cropW;
    canvas.height = cropH;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(videoNode, cropX, cropY, cropW, cropH, 0, 0, canvas.width, canvas.height);

    const img = new Image();
    img.onload = () => {
      setOmrImg(img);
      setImageLoaded(true);
      setAutoMode(true);
    };
    img.onerror = () => {
      setIsProcessing(false);
      setStatus("Görüntü alınamadı. Lütfen tekrar deneyin.");
    };
    img.src = canvas.toDataURL('image/jpeg', 0.95);
  };

  const captureImage = () => {
    if (!videoRef.current || !arGuideRef.current) return;
    performCapture(videoRef.current, arGuideRef.current);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) {
      setIsProcessing(false);
      setStatus("");
      return;
    }

    stopCamera();
    scannedQrRef.current = null;
    setIsProcessing(true);
    setStatus("Dosyalar işleniyor, lütfen bekleyin (PDF'ler dönüştürülüyor)...");

    let allProcessedFiles: File[] = [];

    for (const file of files) {
      if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
        try {
          const pdfFiles = await processPdfToFiles(file);
          allProcessedFiles = allProcessedFiles.concat(pdfFiles);
        } catch (error) {
          console.error("PDF işleme hatası:", error);
          showAlert(`${file.name} okunamadı veya bozuk.`);
        }
      } else {
        allProcessedFiles.push(file);
      }
    }

    if (allProcessedFiles.length === 0) {
      setIsProcessing(false);
      setStatus("Geçerli bir resim veya PDF bulunamadı.");
      return;
    }

    setBatchFiles(allProcessedFiles);
    setBatchIndex(0);
    const willBeAuto = allProcessedFiles.length > 1 || autoSaveSingle;
    setAutoMode(willBeAuto);
    loadImage(allProcessedFiles[0], willBeAuto, 0);

    if (e.target) e.target.value = "";
  };

  const loadImage = (file: File, isAuto: boolean, currentIdx = 0) => {
    setImageLoaded(false);
    setOmrImg(null);
    setAnchors(null);
    setIsProcessing(true);
    setLaserMarks([]);
    setHomographyMat(null);
    setRotation90(0);
    setFineAngle(0);

    setAutoMode(isAuto);
    autoRotateTriedRef.current = 0;
    autoAlignTriedRef.current = false;

    setStatus(`Resim yükleniyor... (${currentIdx + 1} / ${batchFiles.length || 1})`);

    const img = new Image();
    img.onload = () => {
      setOmrImg(img);
      setImageLoaded(true);
    };
    img.onerror = () => {
      setIsProcessing(false);
      setStatus("Resim okunamadı. Başka bir dosya deneyin.");
    };
    img.src = URL.createObjectURL(file);
  };

  const handleAutoAlign = () => {
    if (!anchors) {
      showAlert("Otomatik hizalama için referans noktalarının analiz edilmiş olması gerekir.");
      return;
    }
    const dy = anchors.tr.y - anchors.tl.y;
    const dx = anchors.tr.x - anchors.tl.x;
    const angle = Math.atan2(dy, dx) * (180 / Math.PI);

    if (Math.abs(angle) > 0.1) {
      setFineAngle(prev => {
        let newAngle = prev - angle;
        if (newAngle > 45) newAngle = 45;
        if (newAngle < -45) newAngle = -45;
        return parseFloat(newAngle.toFixed(2));
      });
      setAnchors(null);
      setIsProcessing(true);
      setStatus("Açı otomatik hizalandı. Yeniden işleniyor...");
    } else {
      showAlert("Kağıt zaten düz konumda.");
    }
  };

  useEffect(() => {
    if (!imageLoaded || !omrImg) return;

    const cvs = canvasRef.current;
    if (!cvs) return;
    const ctx = cvs.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    const baseW = 1600;
    const baseH = Math.round(omrImg.height * (baseW / omrImg.width));

    let rotW = baseW;
    let rotH = baseH;

    if (Math.abs(rotation90) % 180 !== 0) {
      rotW = baseH;
      rotH = baseW;
    }

    cvs.width = rotW;
    cvs.height = rotH;

    const findAnchorsCore = (context: CanvasRenderingContext2D, w: number, h: number) => {
      const imgData = context.getImageData(0, 0, w, h).data;
      const intImg = new Uint32Array(w * h);

      for (let y = 0; y < h; y++) {
        let rowSum = 0;
        for (let x = 0; x < w; x++) {
          const idx = (y * w + x) * 4;
          const l = 0.299 * imgData[idx] + 0.587 * imgData[idx + 1] + 0.114 * imgData[idx + 2];
          rowSum += l;
          intImg[y * w + x] = rowSum + (y > 0 ? intImg[(y - 1) * w + x] : 0);
        }
      }

      const getBoxSum = (x1: number, y1: number, x2: number, y2: number) => {
        x1 = Math.max(0, Math.min(w - 1, Math.floor(x1)));
        y1 = Math.max(0, Math.min(h - 1, Math.floor(y1)));
        x2 = Math.max(0, Math.min(w - 1, Math.floor(x2)));
        y2 = Math.max(0, Math.min(h - 1, Math.floor(y2)));

        const A = (x1 > 0 && y1 > 0) ? intImg[(y1 - 1) * w + (x1 - 1)] : 0;
        const B = (y1 > 0) ? intImg[(y1 - 1) * w + x2] : 0;
        const C = (x1 > 0) ? intImg[y2 * w + (x1 - 1)] : 0;
        const D = intImg[y2 * w + x2];
        return D - B - C + A;
      };

      const getBoxAvg = (x1: number, y1: number, x2: number, y2: number) => {
        const cx1 = Math.max(0, Math.min(w - 1, Math.floor(x1)));
        const cy1 = Math.max(0, Math.min(h - 1, Math.floor(y1)));
        const cx2 = Math.max(0, Math.min(w - 1, Math.floor(x2)));
        const cy2 = Math.max(0, Math.min(h - 1, Math.floor(y2)));
        const area = (cx2 - cx1 + 1) * (cy2 - cy1 + 1);
        if (area <= 0) return 255;
        return getBoxSum(cx1, cy1, cx2, cy2) / area;
      };

      const findAnchorNear = (targetX: number, targetY: number, _isTop: boolean) => {
        let bestAnchor: { x: number; y: number; score: number } | null = null;
        let minScore = Infinity;

        const srX = w * 0.35;
        const srY = h * 0.35;

        const startX = Math.max(w * 0.035, targetX - srX);
        const endX = Math.min(w * 0.965, targetX + srX);
        const startY = Math.max(h * 0.025, targetY - srY);
        const endY = Math.min(h * 0.975, targetY + srY);

        for (let y = startY; y < endY; y += 3) {
          for (let x = startX; x < endX; x += 3) {
            const coreAvg = getBoxAvg(x - 2, y - 2, x + 2, y + 2);
            if (coreAvg > 160) continue;

            let left = x, right = x, top = y, bottom = y;
            const threshold = Math.min(200, coreAvg + 40);

            while (left > 0 && getBoxAvg(left - 1, y, left - 1, y) < threshold) left--;
            while (right < w - 1 && getBoxAvg(right + 1, y, right + 1, y) < threshold) right++;
            while (top > 0 && getBoxAvg(x, top - 1, x, top - 1) < threshold) top--;
            while (bottom < h - 1 && getBoxAvg(x, bottom + 1, x, bottom + 1) < threshold) bottom++;

            const bw = right - left;
            const bh = bottom - top;

            if (bw >= 10 && bw <= 180 && bh >= 10 && bh <= 180) {
              const ratio = bw / bh;
              if (ratio > 0.4 && ratio < 2.5) {
                let sumX = 0, sumY = 0, weightSum = 0;
                for (let py = top; py <= bottom; py += 1) {
                  for (let px = left; px <= right; px += 1) {
                    const avg = getBoxAvg(px - 1, py - 1, px + 1, py + 1);
                    if (avg < threshold) {
                      let weight = 255 - avg;
                      weight = weight * weight;
                      sumX += px * weight;
                      sumY += py * weight;
                      weightSum += weight;
                    }
                  }
                }

                const cx = weightSum > 0 ? sumX / weightSum : left + (bw / 2);
                const cy = weightSum > 0 ? sumY / weightSum : top + (bh / 2);

                const dist = Math.hypot(cx - targetX, cy - targetY);
                const shapePenalty = Math.abs(bw - bh) * 1.5;
                const score = dist + shapePenalty + (coreAvg * 0.5);

                if (score < minScore) {
                  minScore = score;
                  bestAnchor = { x: cx, y: cy, score: score };
                }
              }
            }
          }
        }
        return bestAnchor;
      };

      const defTL = { x: w * 0.0238, y: h * 0.0168 };
      const defTR = { x: w * 0.9762, y: h * 0.0168 };
      const defBL = { x: w * 0.0238, y: h * 0.9832 };
      const defBR = { x: w * 0.9762, y: h * 0.9832 };

      const tl = findAnchorNear(defTL.x, defTL.y, true);
      const tr = findAnchorNear(defTR.x, defTR.y, true);
      const bl = findAnchorNear(defBL.x, defBL.y, false);
      const br = findAnchorNear(defBR.x, defBR.y, false);

      let lockFailed = !tl || !tr || !bl || !br;

      const finalTL = tl || defTL;
      const finalTR = tr || defTR;
      const finalBL = bl || defBL;
      const finalBR = br || defBR;

      if (!lockFailed) {
        if (finalTR.x - finalTL.x < w * 0.6 || finalBR.x - finalBL.x < w * 0.6) lockFailed = true;
        if (finalBL.y - finalTL.y < h * 0.6 || finalBR.y - finalTR.y < h * 0.6) lockFailed = true;
      }

      return { pts: { tl: finalTL, tr: finalTR, bl: finalBL, br: finalBR }, lockFailed };
    };

    const processImage = async () => {
      ctx.clearRect(0, 0, rotW, rotH);
      ctx.save();
      ctx.translate(rotW / 2, rotH / 2);
      ctx.rotate((rotation90 + fineAngle) * Math.PI / 180);

      if (Math.abs(rotation90) % 180 !== 0) {
        ctx.drawImage(omrImg, -rotH / 2, -rotW / 2, rotH, rotW);
      } else {
        ctx.drawImage(omrImg, -rotW / 2, -rotH / 2, rotW, rotH);
      }
      ctx.restore();

      const imgData = ctx.getImageData(0, 0, rotW, rotH);

      if (!scannedQrRef.current) {
        const qrRes = scanQRRobustly(ctx, rotW, rotH);
        if (qrRes) {
          scannedQrRef.current = qrRes;
          scannedFormatRef.current = qrRes.includes('N:') ? 'mebi' : 'standard';
        }
      }

      if (isProcessing && anchors === null) {
        setStatus(`Deep-Scan devrede. Saf Homografi analizi yapılıyor...`);
        await new Promise(r => setTimeout(r, 50));

        const anchorData = findAnchorsCore(ctx, rotW, rotH);
        const pts = anchorData.pts;

        if (autoMode) {
          if (anchorData.lockFailed && autoRotateTriedRef.current < 3) {
            autoRotateTriedRef.current += 1;
            setStatus(`Kağıt yönü aranıyor (Deneme ${autoRotateTriedRef.current})...`);
            setRotation90(prev => prev + 90);
            setAnchors(null);
            return;
          }

          if (!anchorData.lockFailed && !autoAlignTriedRef.current) {
            const dy = pts.tr.y - pts.tl.y;
            const dx = pts.tr.x - pts.tl.x;
            const angle = Math.atan2(dy, dx) * (180 / Math.PI);

            if (Math.abs(angle) > 0.4) {
              autoAlignTriedRef.current = true;
              setFineAngle(prev => {
                let newAngle = prev - angle;
                if (newAngle > 45) newAngle = 45;
                if (newAngle < -45) newAngle = -45;
                return parseFloat(newAngle.toFixed(2));
              });
              setAnchors(null);
              setStatus("Açı otomatik ince ayarlanıyor...");
              return;
            }
          }
        }

        setAnchors(pts);
        const srcPts = [
          { x: DEFAULT_OMR.anchorMargin, y: DEFAULT_OMR.anchorMargin },
          { x: DEFAULT_OMR.paperW - DEFAULT_OMR.anchorMargin, y: DEFAULT_OMR.anchorMargin },
          { x: DEFAULT_OMR.anchorMargin, y: DEFAULT_OMR.paperH - DEFAULT_OMR.anchorMargin },
          { x: DEFAULT_OMR.paperW - DEFAULT_OMR.anchorMargin, y: DEFAULT_OMR.paperH - DEFAULT_OMR.anchorMargin }
        ];
        const dstPts = [pts.tl, pts.tr, pts.bl, pts.br];
        const H = getHomography(srcPts, dstPts);
        setHomographyMat(H);

        if (!scannedQrRef.current) {
          const mappedQrCenter = applyHomography(182.5, 44.5, H);
          const radius = Math.floor(rotW * 0.015);
          let dSum = 0, dCnt = 0;
          for (let dy = -radius; dy <= radius; dy++) {
            for (let dx = -radius; dx <= radius; dx++) {
              const px = Math.floor(mappedQrCenter.x + dx);
              const py = Math.floor(mappedQrCenter.y + dy);
              if (px >= 0 && px < rotW && py >= 0 && py < rotH) {
                const i = (py * rotW + px) * 4;
                const luma = 0.299 * imgData.data[i] + 0.587 * imgData.data[i + 1] + 0.114 * imgData.data[i + 2];
                dSum += luma;
                dCnt++;
              }
            }
          }
          const avgLuma = dSum / (dCnt || 1);
          scannedFormatRef.current = avgLuma < 160 ? 'mebi' : 'standard';
        }

        const currentOMR = getActiveOMR();

        if (autoMode && !anchorData.lockFailed) {
          setTimeout(() => readForm(pts, H, currentOMR), 50);
        } else {
          setAutoMode(false);
          if (anchorData.lockFailed) {
            setStatus("⚠️ Otomatik kilitleme başarısız. Lütfen kağıt yönünü düzeltin veya kırmızı halkaları köşelerdeki siyah karelere taşıyın.");
          } else {
            setStatus("Referans noktaları bulundu. Nişangahları manuel düzeltebilirsiniz.");
          }
          setIsProcessing(false);
        }
      } else if (anchors !== null) {
        const currentOMR = getActiveOMR();
        const srcPts = [
          { x: DEFAULT_OMR.anchorMargin, y: DEFAULT_OMR.anchorMargin },
          { x: DEFAULT_OMR.paperW - DEFAULT_OMR.anchorMargin, y: DEFAULT_OMR.anchorMargin },
          { x: DEFAULT_OMR.anchorMargin, y: DEFAULT_OMR.paperH - DEFAULT_OMR.anchorMargin },
          { x: DEFAULT_OMR.paperW - DEFAULT_OMR.anchorMargin, y: DEFAULT_OMR.paperH - DEFAULT_OMR.anchorMargin }
        ];
        const dstPts = [anchors.tl, anchors.tr, anchors.bl, anchors.br];
        const H = getHomography(srcPts, dstPts);
        setHomographyMat(H);
        drawOverlay(anchors, H, laserMarks, currentOMR);
      }
    };

    processImage();
  }, [imageLoaded, omrImg, isProcessing, anchors, laserMarks, expectedFormat, rotation90, fineAngle]);

  const drawOverlay = (pts: Anchors, H: number[] | null, marks: LaserMark[] = [], omrToUse: typeof DEFAULT_OMR) => {
    const overCvs = overlayCanvasRef.current;
    const cvs = canvasRef.current;
    if (!overCvs || !cvs || !H || !omrToUse) return;

    overCvs.width = cvs.width; overCvs.height = cvs.height;
    const ctx = overCvs.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, overCvs.width, overCvs.height);

    ctx.strokeStyle = 'red';
    ctx.lineWidth = 2;
    Object.values(pts).forEach(p => {
      ctx.beginPath(); ctx.arc(p.x, p.y, 25, 0, 2 * Math.PI); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(p.x - 35, p.y); ctx.lineTo(p.x + 35, p.y); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(p.x, p.y - 35); ctx.lineTo(p.x, p.y + 35); ctx.stroke();
      ctx.fillStyle = 'rgba(255, 0, 0, 0.25)';
      ctx.beginPath(); ctx.arc(p.x, p.y, 25, 0, 2 * Math.PI); ctx.fill();
    });

    ctx.strokeStyle = 'rgba(0,150,255,0.7)';
    ctx.lineWidth = 1;

    const activeFormat = expectedFormat === 'auto' ? scannedFormatRef.current : expectedFormat;

    if (activeFormat !== 'mebi') {
      omrToUse.info.fields.forEach(f => {
        for (let c = 0; c < f.cols; c++) {
          for (let r = 0; r < f.items.length; r++) {
            const x_mm = f.startX + (c * omrToUse.info.colW) + (omrToUse.info.colW / 2);
            const y_mm = omrToUse.info.startY + (r * omrToUse.info.rowH);
            const mapped = applyHomography(x_mm, y_mm, H);
            ctx.strokeRect(mapped.x - 5, mapped.y - 5, 11, 11);
          }
        }
      });
    } else {
      ["A", "B", "C", "D"].forEach((_b, idx) => {
        const bx = 135 + (idx * 7);
        const by = 18;
        const x_mm = omrToUse.infoBox.x + bx;
        const y_mm = omrToUse.infoBox.y + by;
        const mapped = applyHomography(x_mm, y_mm, H);
        ctx.strokeRect(mapped.x - 5, mapped.y - 5, 11, 11);
      });
    }

    const { items: layoutItems } = getQuestionsLayout(exam, omrToUse);
    layoutItems.forEach((item) => {
      if (item.type === 'question') {
        for (let opt = 0; opt < exam.optionsCount; opt++) {
          const x_mm = omrToUse.qBox.x + (item.cIdx * omrToUse.questions.colW) + omrToUse.questions.startXOffset + (opt * omrToUse.questions.bubbleGap);
          const y_mm = item.y;
          const mapped = applyHomography(x_mm, y_mm, H);
          ctx.strokeRect(mapped.x - 5, mapped.y - 5, 11, 11);
        }
      }
    });

    if (marks && marks.length > 0) {
      marks.forEach(m => {
        ctx.beginPath();
        ctx.arc(m.x, m.y, m.type === 'info' ? 3 : 4, 0, 2 * Math.PI);
        ctx.strokeStyle = m.type === 'info' ? 'cyan' : 'magenta';
        ctx.lineWidth = 3;
        ctx.stroke();
      });
    }
  };

  const readForm = (pts: Anchors | null = anchors, currentH: number[] | null = homographyMat, specificOMR: typeof DEFAULT_OMR | null = null) => {
    const omrToUse = specificOMR || getActiveOMR();

    if (!pts || !currentH) return showAlert("Önce kalibrasyon yapılmalı.");
    setIsProcessing(true);

    setTimeout(() => {
      try {
        const cvs = canvasRef.current;
        if (!cvs) return;
        const ctx = cvs.getContext('2d', { willReadFrequently: true });
        if (!ctx) return;
        const imgData = ctx.getImageData(0, 0, cvs.width, cvs.height);
        const imgBytes = imgData.data;

        const foundMarks: LaserMark[] = [];
        let qrDataObj: any = null;

        if (!scannedQrRef.current) {
          const qrRes = scanQRRobustly(ctx, cvs.width, cvs.height);
          if (qrRes) {
            scannedQrRef.current = qrRes;
            scannedFormatRef.current = qrRes.includes('N:') ? 'mebi' : 'standard';
          }
        }

        if (scannedQrRef.current) {
          const parts = scannedQrRef.current.split('|');
          qrDataObj = {};
          parts.forEach(p => { const [k, v] = p.split(':'); qrDataObj[k] = v; });
        }

        const getFastAvg = (cx: number, cy: number, radius: number) => {
          let dSum = 0, dCnt = 0;
          for (let dy = -radius; dy <= radius; dy++) {
            for (let dx = -radius; dx <= radius; dx++) {
              const px = Math.floor(cx + dx);
              const py = Math.floor(cy + dy);
              if (px >= 0 && px < cvs.width && py >= 0 && py < cvs.height) {
                const i = (py * cvs.width + px) * 4;
                const r = imgBytes[i];
                const g = imgBytes[i + 1];
                const b = imgBytes[i + 2];
                const whiteness = Math.max(r, g, b);
                dSum += (255 - whiteness);
                dCnt++;
              }
            }
          }
          return dSum / (dCnt || 1);
        };

        const getDeepestDarkness = (cx: number, cy: number, searchRadiusX: number, searchRadiusY: number, coreRadius: number) => {
          let maxScore = -Infinity;
          let bestX = cx, bestY = cy;
          let actualVal = 0;

          for (let sy = -searchRadiusY; sy <= searchRadiusY; sy += 1) {
            for (let sx = -searchRadiusX; sx <= searchRadiusX; sx += 1) {
              const avgDark = getFastAvg(cx + sx, cy + sy, coreRadius);
              const dist = Math.hypot(sx, sy);

              const penalty = (dist * dist) * 0.35;
              const score = avgDark - penalty;

              if (score > maxScore) {
                maxScore = score;
                bestX = cx + sx;
                bestY = cy + sy;
                actualVal = avgDark;
              }
            }
          }
          return { val: actualVal, x: bestX, y: bestY };
        };

        const getTrueRowY = (expectedY_mm: number) => {
          const mappedLeft = applyHomography(5.5, expectedY_mm, currentH);
          let bestY = mappedLeft.y;
          let maxDarkness = -1;
          for (let dy = -15; dy <= 15; dy++) {
            const dark = getFastAvg(mappedLeft.x, mappedLeft.y + dy, 2);
            if (dark > maxDarkness) {
              maxDarkness = dark;
              bestY = mappedLeft.y + dy;
            }
          }
          return maxDarkness > 80 ? bestY : mappedLeft.y;
        };

        const parsedInfo = { name: "", no: "", cls: "", sec: "", bk: "" };
        let mebiCodedBk: string | null = null;

        const activeFormat = expectedFormat === 'auto' ? scannedFormatRef.current : expectedFormat;

        if (activeFormat === 'mebi') {
          const bkDarks: { opt: string; val: number; x: number; y: number }[] = [];
          ["A", "B", "C", "D"].forEach((b, idx) => {
            const bx = 135 + (idx * 7);
            const by = 18;
            const x_mm = omrToUse.infoBox.x + bx;
            const y_mm = omrToUse.infoBox.y + by;
            const mapped = applyHomography(x_mm, y_mm, currentH);

            const res = getDeepestDarkness(mapped.x, mapped.y, 5, 4, 1);
            bkDarks.push({ opt: b, val: res.val, x: res.x, y: res.y });
          });

          bkDarks.sort((a, b) => b.val - a.val);
          if (bkDarks[0].val > 40 && (bkDarks[0].val - bkDarks[1].val) > 15) {
            mebiCodedBk = bkDarks[0].opt;
            foundMarks.push({ x: bkDarks[0].x, y: bkDarks[0].y, type: 'info' });
          }
        } else {
          omrToUse.info.fields.forEach(f => {
            let fStr = "";
            for (let c = 0; c < f.cols; c++) {
              const darks: { optIdx: number; val: number; char: string; x: number; y: number }[] = [];
              for (let r = 0; r < f.items.length; r++) {
                const x_mm = f.startX + (c * omrToUse.info.colW) + (omrToUse.info.colW / 2);
                const y_mm = omrToUse.info.startY + (r * omrToUse.info.rowH);
                const mapped = applyHomography(x_mm, y_mm, currentH);

                const res = getDeepestDarkness(mapped.x, mapped.y, 6, 4, 1);
                darks.push({ optIdx: r, val: res.val, char: f.items[r], x: res.x, y: res.y });
              }

              darks.sort((a, b) => b.val - a.val);
              const maxD = darks[0].val;
              const secD = darks.length > 1 ? darks[1].val : 0;
              if (maxD > 40 && (maxD - secD) > 15) {
                fStr += darks[0].char;
                foundMarks.push({ x: darks[0].x, y: darks[0].y, type: 'info' });
              } else {
                fStr += (f.id === 'name' ? " " : "");
              }
            }
            (parsedInfo as any)[f.id] = fStr;
          });
        }

        const { items: layoutItems } = getQuestionsLayout(exam, omrToUse);
        const optsList = exam.optionsCount === 4 ? OPTS_4 : OPTS_5;
        const readAns = Array(totalQ).fill("");
        const rowYCache: { [key: number]: number } = {};

        layoutItems.forEach((item) => {
          if (item.type === 'question' && item.qIdx !== undefined) {
            if (!rowYCache[item.y]) {
              rowYCache[item.y] = getTrueRowY(item.y);
            }
            const adjustedMappedY = rowYCache[item.y];
            const baseMappedLeft = applyHomography(5.5, item.y, currentH);
            const localYOffset = adjustedMappedY - baseMappedLeft.y;

            const darks: { optIdx: number; val: number; x: number; y: number }[] = [];
            for (let opt = 0; opt < exam.optionsCount; opt++) {
              const x_mm = omrToUse.qBox.x + (item.cIdx * omrToUse.questions.colW) + omrToUse.questions.startXOffset + (opt * omrToUse.questions.bubbleGap);
              const mapped = applyHomography(x_mm, item.y, currentH);
              mapped.y += localYOffset;

              const res = getDeepestDarkness(mapped.x, mapped.y, 8, 5, 2);
              darks.push({ optIdx: opt, val: res.val, x: res.x, y: res.y });
            }

            darks.sort((a, b) => b.val - a.val);
            const maxD = darks[0].val;
            const secondMaxD = darks.length > 1 ? darks[1].val : 0;

            if (maxD > 40 && (maxD - secondMaxD) > 15) {
              readAns[item.qIdx] = optsList[darks[0].optIdx];
              foundMarks.push({ x: darks[0].x, y: darks[0].y, type: 'question' });
            }
          }
        });

        setLaserMarks(foundMarks);

        let finalNo = "BOŞ";
        let finalBk = "A";
        let finalName = "İSİMSİZ";
        let cleanCls = "-";
        let cleanSec = "-";
        let autoCorrected = false;

        if (qrDataObj && qrDataObj.N) {
          finalNo = qrDataObj.N;
          finalBk = "A"; // Kitapçık optik form üzerindeki işaretlemeden okunur, işaretlenmemişse varsayılan "A" kabul edilir
          if (exam.studentList) {
            const matchedStudent = exam.studentList.find(s => parseInt(s.no, 10) === parseInt(finalNo, 10));
            if (matchedStudent) {
              finalName = matchedStudent.name || finalName;
              cleanCls = matchedStudent.classStr || cleanCls;
              cleanSec = matchedStudent.sectionStr || cleanSec;
            }
          }
        }

        if (activeFormat === 'mebi') {
          if (mebiCodedBk) {
            finalBk = mebiCodedBk;
          } else {
            // Canlı taramada kitapçık türü işaretlenmemiş optikleri okurken varsayılan A kitapçığı olarak kabul edilir
            finalBk = "A";
          }
        } else {
          const cleanNo = parsedInfo.no.replace(/\s+/g, "");
          let bubbleNo = cleanNo.length > 0 ? parseInt(cleanNo, 10).toString() : "BOŞ";
          if (isNaN(Number(bubbleNo)) || bubbleNo === "NaN") bubbleNo = "BOŞ";

          const cleanName = parsedInfo.name.trim();
          const bubbleName = cleanName.length > 0 ? cleanName : "İSİMSİZ";
          const bubbleCls = parsedInfo.cls.trim();
          const bubbleSec = parsedInfo.sec.trim();
          const bubbleBk = parsedInfo.bk.trim();

          if (finalNo === "BOŞ") {
            finalNo = bubbleNo;
            finalName = bubbleName;
            cleanCls = bubbleCls;
            cleanSec = bubbleSec;
            // İşaretlenmemiş optiklerde varsayılan A kitapçığı kabul edilir
            finalBk = bubbleBk.length > 0 ? bubbleBk : "A";

            const effectiveList = (schoolStudents && schoolStudents.length > 0) ? schoolStudents : (exam.studentList || []);
            if (effectiveList.length > 0 && finalNo !== "BOŞ") {
              const matchedStudent = effectiveList.find(s => parseInt(s.no, 10) === parseInt(finalNo, 10));
              if (matchedStudent) {
                if (finalName !== matchedStudent.name || cleanCls !== matchedStudent.classStr || cleanSec !== matchedStudent.sectionStr) {
                  autoCorrected = true;
                }
                finalName = matchedStudent.name || finalName;
                cleanCls = matchedStudent.classStr || cleanCls;
                cleanSec = matchedStudent.sectionStr || cleanSec;
              }
            }
          } else {
            // Kitapçık işaretlenmişse onu kullan, işaretlenmemişse varsayılan "A"
            finalBk = bubbleBk.length > 0 ? bubbleBk : "A";
            if (cleanCls === "-") cleanCls = bubbleCls;
          }
        }

        let isUpdated = false;
        const updatedResults = [...exam.results];

        if (finalNo !== "BOŞ") {
          const existingIdx = updatedResults.findIndex(r => parseInt(r.no, 10) === parseInt(finalNo, 10));
          if (existingIdx >= 0) {
            updatedResults[existingIdx] = {
              ...updatedResults[existingIdx],
              name: finalName,
              classStr: cleanCls || "-",
              sectionStr: cleanSec || "-",
              booklet: finalBk,
              answers: readAns
            };
            isUpdated = true;
          }
        }

        if (!isUpdated) {
          const newResult = {
            id: Date.now() + Math.random(),
            name: finalName,
            no: finalNo,
            classStr: cleanCls || "-",
            sectionStr: cleanSec || "-",
            booklet: finalBk,
            answers: readAns
          };
          updatedResults.push(newResult);
        }

        updateExam({ results: updatedResults });
        playSuccessChime();

        if (isCameraActive) {
          let successMsg = isUpdated ? `🔄 ${finalName} güncellendi.` : `✅ ${finalName} eklendi.`;
          if (activeFormat === 'mebi') successMsg = `🎯 MEBİ Modu: ${finalName} kaydedildi! (${finalBk} Kit.)`;
          if (autoCorrected && activeFormat !== 'mebi') successMsg = `✨ ${finalName} eklendi (Kayıttan Çekildi!)`;

          setStatus(successMsg);
          setTimeout(() => {
            if (!isCameraActive) return;
            setImageLoaded(false);
            setOmrImg(null);
            setAnchors(null);
            setLaserMarks([]);
            setIsProcessing(false);
            lockCounter.current = 0;
            setLockLevel(0);
            scannedQrRef.current = null;
            setStatus("Sıradaki optiği hizalayın...");
          }, 1200);
        } else if (batchFiles.length > 1 && batchIndex + 1 < batchFiles.length) {
          const nextIdx = batchIndex + 1;
          setStatus(`Sıradaki forma geçiliyor... (${nextIdx + 1} / ${batchFiles.length})`);

          setTimeout(() => {
            setImageLoaded(false);
            setOmrImg(null);
            setAnchors(null);
            setLaserMarks([]);
            setHomographyMat(null);
            setBatchIndex(nextIdx);
            scannedQrRef.current = null;
            loadImage(batchFiles[nextIdx], true, nextIdx);
          }, 1000);
        } else {
          setIsProcessing(false);
          setAutoMode(false);
          scannedQrRef.current = null;
          setStatus("✅ Tarama tamamlandı ve hafızaya kaydedildi.");
          setBatchFiles([]);
        }
      } catch (err: any) {
        showAlert("Okuma sırasında hata oluştu: " + err.message);
        setIsProcessing(false);
        setStatus("Hata oluştu.");
      }
    }, 50);
  };

  const anchorTargets = [
    { top: '2.5%', left: '3.5%' },
    { top: '2.5%', left: '96.5%' },
    { top: '97.5%', left: '3.5%' },
    { top: '97.5%', left: '96.5%' }
  ];

  return (
    <div className="bg-slate-900 rounded-none md:rounded-2xl shadow-xl border-0 md:border border-slate-800 overflow-hidden h-full flex flex-col text-white relative">
      {/* Top Header Bar */}
      <div className="bg-slate-900/90 backdrop-blur-md px-3.5 py-2.5 sm:px-4 sm:py-3 flex items-center justify-between gap-2 border-b border-slate-800 shrink-0">
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-md shadow-emerald-900/30 shrink-0">
            <Icons.Camera />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm sm:text-base font-bold tracking-tight text-white flex items-center gap-2 truncate">
              Akıllı Optik Tarayıcı
            </h3>
            <p className="text-slate-400 text-[11px] sm:text-xs hidden sm:block truncate">
              Yapay zeka ve optik hizalama ile ultra hızlı okuma
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 bg-slate-800/90 border border-slate-700/80 rounded-xl text-xs font-semibold text-slate-300">
            <Icons.CheckCircle />
            <span><strong className="text-emerald-400 font-mono">{exam.results.length}</strong> Okundu</span>
          </div>

          {imageLoaded && !isCameraActive && (
            <button
              onClick={() => {
                setImageLoaded(false);
                setOmrImg(null);
                setAnchors(null);
                setBatchFiles([]);
                setStatus("");
              }}
              className="px-2.5 py-1 sm:py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs transition-colors border border-slate-700 cursor-pointer font-medium"
              title="Formu Temizle"
            >
              Temizle
            </button>
          )}
        </div>
      </div>

      {/* Main Layout Area */}
      <div className="flex flex-col lg:flex-row flex-1 overflow-y-auto lg:overflow-hidden relative bg-slate-950">
        {/* Left Control Panel */}
        <div className="w-full lg:w-96 flex flex-col gap-3 p-3 sm:p-4 lg:border-r border-slate-800 shrink-0 overflow-y-auto custom-scrollbar">
          {/* Format Selector Badge */}
          <div className="bg-slate-900/70 p-2.5 sm:p-3 rounded-xl border border-slate-800/80 flex items-center justify-between">
            <div className="min-w-0">
              <span className="text-[11px] font-bold text-slate-300 block truncate">
                Optik Form Algılama
              </span>
              <span className="text-[10px] text-slate-400 block truncate">
                Karekod otomatik taranır ve eşleşir
              </span>
            </div>
            <span className="text-[10px] text-emerald-400 font-bold bg-emerald-950/80 px-2.5 py-1 rounded-lg border border-emerald-700/50 flex items-center gap-1.5 shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Karekodlu
            </span>
          </div>

          {/* Primary Action Buttons */}
          <div className="space-y-2">
            {/* Live Camera Button */}
            <button
              type="button"
              onClick={() => startCamera('environment')}
              disabled={isProcessing}
              className={`w-full group px-4 py-3.5 sm:py-4 rounded-xl font-bold transition-all text-left flex items-center justify-between shadow-lg cursor-pointer ${
                isProcessing
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                  : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-950/40 active:scale-[0.99] border border-emerald-400/30'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center text-white shrink-0 group-hover:scale-105 transition-transform">
                  <Icons.Video />
                </div>
                <div className="min-w-0">
                  <div className="text-sm sm:text-base font-bold leading-tight">Canlı Kamerayı Aç</div>
                  <div className="text-[11px] sm:text-xs text-emerald-100/80 font-normal mt-0.5 truncate">
                    Otomatik odaklama & anında tarama
                  </div>
                </div>
              </div>
              <span className="px-2.5 py-1 bg-white/20 hover:bg-white/30 rounded-lg text-xs font-bold text-white shrink-0 transition-colors">
                Başlat
              </span>
            </button>

            {/* File or PDF Upload & Native System Camera */}
            <div className="grid grid-cols-2 gap-2">
              <label
                className={`flex flex-col items-center justify-center p-2.5 sm:p-3 rounded-xl border text-center font-bold text-xs transition-all cursor-pointer ${
                  isProcessing
                    ? 'bg-slate-800 text-slate-500 border-slate-700 cursor-not-allowed'
                    : 'bg-slate-900/80 hover:bg-slate-800 text-slate-200 border-slate-700/80 hover:border-slate-600 active:scale-[0.98]'
                }`}
              >
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center mb-1">
                  <Icons.Upload />
                </div>
                <span className="text-[11px] sm:text-xs">Dosya / PDF</span>
                <span className="text-[9px] sm:text-[10px] text-slate-400 font-normal">Görsel veya PDF</span>
                <input
                  type="file"
                  multiple
                  accept="image/jpeg, image/png, image/jpg, application/pdf"
                  onChange={handleImageUpload}
                  disabled={isProcessing}
                  className="hidden"
                />
              </label>

              <button
                type="button"
                onClick={() => {
                  if (nativeCameraRef.current) nativeCameraRef.current.click();
                }}
                disabled={isProcessing}
                className={`flex flex-col items-center justify-center p-2.5 sm:p-3 rounded-xl border text-center font-bold text-xs transition-all cursor-pointer ${
                  isProcessing
                    ? 'bg-slate-800 text-slate-500 border-slate-700 cursor-not-allowed'
                    : 'bg-slate-900/80 hover:bg-slate-800 text-slate-200 border-slate-700/80 hover:border-slate-600 active:scale-[0.98]'
                }`}
              >
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center mb-1">
                  <Icons.Smartphone />
                </div>
                <span className="text-[11px] sm:text-xs">Cihaz Kamerası</span>
                <span className="text-[9px] sm:text-[10px] text-slate-400 font-normal">Tek Çekim</span>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleImageUpload}
                  ref={nativeCameraRef}
                  className="hidden"
                />
              </button>
            </div>

            {/* Auto-save toggle */}
            <div className="flex items-center justify-between px-3 py-2 bg-slate-900/60 rounded-xl border border-slate-800/80">
              <label htmlFor="autoSaveToggle" className="text-xs text-slate-300 font-medium cursor-pointer select-none">
                Tekli fotoğrafları otomatik kaydet
              </label>
              <input
                type="checkbox"
                id="autoSaveToggle"
                checked={autoSaveSingle}
                onChange={e => setAutoSaveSingle(e.target.checked)}
                className="w-4 h-4 text-emerald-600 bg-slate-800 border-slate-600 rounded cursor-pointer accent-emerald-500"
              />
            </div>
          </div>

          {/* Batch Status Progress */}
          {isProcessing && !isCameraActive && (
            <div className="bg-slate-900/90 p-3 rounded-xl border border-blue-500/30 space-y-2 text-left shadow-md">
              <div className="flex justify-between text-xs font-bold text-blue-400">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping" />
                  Toplu İşlem Sürüyor
                </span>
                <span>{batchIndex + 1} / {batchFiles.length || 1}</span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden border border-slate-700">
                <div
                  className="bg-gradient-to-r from-blue-500 to-indigo-500 h-1.5 rounded-full transition-all duration-300"
                  style={{ width: `${((batchIndex + 1) / (batchFiles.length || 1)) * 100}%` }}
                />
              </div>
            </div>
          )}

          {/* Status Message */}
          {status && !isCameraActive && (
            <div className="text-emerald-300 text-xs font-semibold bg-emerald-950/40 p-2.5 sm:p-3 rounded-xl border border-emerald-500/30 flex items-start gap-2 shadow-sm">
              <span className="text-emerald-400 shrink-0 mt-0.5">ℹ️</span>
              <span className="leading-snug">{status}</span>
            </div>
          )}

          {/* Image Alignment & Rotation Controls (When an image is loaded) */}
          {imageLoaded && !isCameraActive && (
            <div className="bg-slate-900/90 p-3 sm:p-3.5 rounded-xl border border-slate-800 space-y-2.5 shadow-md">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-white text-xs flex items-center gap-1.5">
                  <Icons.Sliders />
                  Hizalama & Açı
                </h4>
                <button
                  type="button"
                  onClick={handleAutoAlign}
                  className="text-[11px] font-bold text-indigo-300 hover:text-white bg-indigo-950/60 hover:bg-indigo-900/60 px-2 py-0.5 rounded-lg border border-indigo-700/40 transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <Icons.Sparkles /> Otomatik Düzelt
                </button>
              </div>

              {/* 90-degree Rotation Buttons */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => { setRotation90(prev => prev - 90); setAnchors(null); setIsProcessing(true); }}
                  className="flex items-center justify-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold py-1.5 rounded-lg transition-colors text-xs border border-slate-700 active:scale-95 cursor-pointer"
                >
                  <Icons.RotateCcw />
                  <span>Sola 90°</span>
                </button>
                <button
                  type="button"
                  onClick={() => { setRotation90(prev => prev + 90); setAnchors(null); setIsProcessing(true); }}
                  className="flex items-center justify-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold py-1.5 rounded-lg transition-colors text-xs border border-slate-700 active:scale-95 cursor-pointer"
                >
                  <Icons.RotateCw />
                  <span>Sağa 90°</span>
                </button>
              </div>

              {/* Fine Angle Slider */}
              <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800/80">
                <div className="flex justify-between items-center text-[10px] text-slate-400 mb-1 font-bold">
                  <span>İnce Açı</span>
                  <span className="text-blue-400 font-mono text-xs px-1.5 py-0.2 bg-blue-950/60 rounded border border-blue-800/40">
                    {fineAngle > 0 ? `+${fineAngle}` : fineAngle}°
                  </span>
                  <button
                    type="button"
                    onClick={() => { setFineAngle(0); setAnchors(null); setIsProcessing(true); }}
                    className="text-slate-400 hover:text-white text-[10px] cursor-pointer"
                  >
                    Sıfırla
                  </button>
                </div>
                <input
                  type="range"
                  min="-45"
                  max="45"
                  step="0.5"
                  value={fineAngle}
                  onChange={(e) => { setFineAngle(parseFloat(e.target.value)); setAnchors(null); setIsProcessing(true); }}
                  className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                />
              </div>

              {/* Manual Confirmation Button */}
              {!isProcessing && !autoMode && (
                <button
                  type="button"
                  onClick={() => readForm(anchors)}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 active:scale-[0.99] text-white font-bold py-2.5 rounded-xl shadow-lg shadow-emerald-950/40 transition-all text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer border border-emerald-400/30"
                >
                  <Icons.CheckCircle />
                  <span>ONAYLA VE FORMU OKU</span>
                </button>
              )}
            </div>
          )}

          {/* Quick Guidance Info */}
          <div className="mt-auto pt-2 border-t border-slate-800/60 text-[11px] text-slate-400 space-y-1">
            <div className="flex items-center gap-1.5 text-slate-300 font-semibold">
              <Icons.Sparkles /> İpuçları
            </div>
            <p className="leading-relaxed text-[10px] sm:text-[11px]">
              Optik formu düz bir zemine koyun ve 4 siyah köşe karesinin kamerada net görünmesini sağlayın.
            </p>
          </div>
        </div>

        {/* Right Preview Viewport Area */}
        <div className="flex-1 bg-slate-950 flex flex-col justify-center items-center relative p-3 md:p-6 min-h-[50vh] lg:min-h-0 overflow-hidden">
          {/* Active Image Loaded Stage */}
          {imageLoaded && !isCameraActive ? (
            <div className="relative h-full w-full flex flex-col justify-center items-center">
              <div
                className="relative rounded-lg overflow-hidden border border-slate-700 shadow-2xl bg-white"
                style={{ height: '100%', aspectRatio: '210 / 297', maxHeight: '82vh', maxWidth: '94vw' }}
              >
                <canvas ref={canvasRef} className="absolute top-0 left-0 w-full h-full object-contain bg-white" />
                <canvas
                  ref={overlayCanvasRef}
                  className={`absolute top-0 left-0 w-full h-full object-contain z-10 ${
                    (!isCameraActive && imageLoaded && !isProcessing)
                      ? 'pointer-events-auto touch-none cursor-crosshair'
                      : 'pointer-events-none'
                  }`}
                  onMouseDown={handlePtrDown}
                  onMouseMove={handlePtrMove}
                  onMouseUp={handlePtrUp}
                  onMouseLeave={handlePtrUp}
                  onTouchStart={handlePtrDown}
                  onTouchMove={handlePtrMove}
                  onTouchEnd={handlePtrUp}
                />
              </div>

              <div className="mt-2 text-center text-xs text-slate-400 select-none">
                Gerekirse kırmızı noktaları parmağınızla siyah köşe karelerine sürükleyebilirsiniz
              </div>
            </div>
          ) : (
            /* Empty State Placeholder (Desktop only to prevent redundant vertical stacking on mobile) */
            !isCameraActive && (
              <div className="hidden lg:flex flex-col items-center justify-center p-8 text-center max-w-sm">
                <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500 mb-3 shadow-inner">
                  <Icons.Camera />
                </div>
                <h4 className="text-base font-bold text-slate-200 mb-1">
                  Taramaya Hazır
                </h4>
                <p className="text-xs text-slate-400 leading-relaxed mb-4">
                  Optik formları okumak için <strong>Canlı Kamerayı Aç</strong> veya optik form görselini/PDF dosyasını yükleyin.
                </p>
                <button
                  type="button"
                  onClick={() => startCamera('environment')}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-emerald-950/50 transition-all cursor-pointer"
                >
                  <Icons.Video /> Canlı Kamerayı Başlat
                </button>
              </div>
            )
          )}
        </div>
      </div>

      {/* FULLSCREEN CAMERA OVERLAY (When Live Camera is Active) */}
      {isCameraActive && (
        <div className="fixed inset-0 z-[150] bg-black flex flex-col overflow-hidden select-none">
          {/* Hidden Background Video */}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="absolute inset-0 w-full h-full object-cover"
          />

          {/* TOP GLASSMORPHIC HUD */}
          <div className="fixed top-0 left-0 right-0 z-50 p-2.5 sm:p-4 pt-[max(0.75rem,env(safe-area-inset-top))] flex items-center justify-between gap-2 pointer-events-none">
            {/* Status Radar Badge */}
            <div className="flex items-center gap-1.5 sm:gap-2 bg-slate-900/85 backdrop-blur-md border border-white/15 px-3 py-1.5 rounded-full shadow-2xl pointer-events-auto">
              <span className={`w-2 sm:w-2.5 h-2 sm:h-2.5 rounded-full transition-all shrink-0 ${
                lockLevel >= 8
                  ? 'bg-emerald-400 shadow-[0_0_10px_#34d399] animate-ping'
                  : lockLevel >= 3
                  ? 'bg-amber-400 shadow-[0_0_8px_#fbbf24] animate-pulse'
                  : 'bg-red-400'
              }`} />
              <span className="text-[11px] sm:text-xs font-bold text-slate-100 whitespace-nowrap">
                {lockLevel >= 8 ? 'Hedef Kilitlendi ⚡' : lockLevel >= 3 ? 'Odaklanıyor... ⏳' : 'Hizalanıyor...'}
              </span>
              {detectedQrCode && (
                <span className="bg-blue-500/30 text-blue-300 border border-blue-400/40 text-[9px] px-1.5 py-0.5 rounded-full font-black">
                  MEBİ
                </span>
              )}
            </div>

            {/* Instruction Floating Pill (At Top, not blocking the center of the sheet!) */}
            <div className="hidden md:flex items-center bg-slate-950/80 backdrop-blur-md border border-white/10 px-3 py-1.5 rounded-full text-xs text-slate-200 font-medium shadow-lg pointer-events-auto">
              Siyah 4 köşe karesini vizörün köşelerine oturtun
            </div>

            {/* Right Action Icons */}
            <div className="flex items-center gap-1.5 sm:gap-2 pointer-events-auto">
              {/* Form Scanned Counter */}
              <div className="flex items-center gap-1 sm:gap-1.5 bg-emerald-950/85 border border-emerald-500/40 text-emerald-300 text-[11px] sm:text-xs px-2.5 sm:px-3 py-1.5 rounded-full font-bold backdrop-blur-md shadow-lg">
                <Icons.CheckCircle />
                <span>{exam.results.length} Form</span>
              </div>

              {/* Torch Toggle Button */}
              {torchAvailable && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); toggleTorch(); }}
                  className={`p-2 sm:p-2.5 rounded-full backdrop-blur-md border transition-all cursor-pointer ${
                    isTorchOn
                      ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-[0_0_18px_rgba(251,191,36,0.7)]'
                      : 'bg-slate-900/80 text-white border-white/15 hover:bg-slate-800'
                  }`}
                  title="Flaş / Işık"
                >
                  <Icons.Zap />
                </button>
              )}

              {/* Camera Switcher Button */}
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); switchCamera(); }}
                className="p-2 sm:p-2.5 rounded-full bg-slate-900/80 hover:bg-slate-800 text-white border border-white/15 backdrop-blur-md transition-colors shadow-lg cursor-pointer"
                title="Kamera Değiştir"
              >
                <Icons.FlipCamera />
              </button>

              {/* Close Button */}
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); stopCamera(); }}
                className="p-2 sm:p-2.5 rounded-full bg-red-600/80 hover:bg-red-600 text-white border border-red-400/30 backdrop-blur-md transition-colors shadow-lg cursor-pointer"
                title="Kapat"
              >
                <Icons.X />
              </button>
            </div>
          </div>

          {/* AR GUIDE VİZÖR (Aspect Ratio 210/297 A4 Guide - Unobstructed Clear Viewport) */}
          {!imageLoaded && (
            <div className="relative w-full h-full flex justify-center items-center pointer-events-none">
              <div
                ref={arGuideRef}
                className={`relative z-10 transition-all duration-300 rounded-lg ${
                  lockLevel >= 8
                    ? 'border-[3px] border-emerald-400 shadow-[0_0_25px_rgba(52,211,153,0.6)]'
                    : lockLevel >= 3
                    ? 'border-[2.5px] border-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.4)]'
                    : 'border-[2px] border-white/40'
                }`}
                style={{
                  width: '94vw',
                  maxWidth: 'calc(80vh * (210 / 297))',
                  aspectRatio: '210 / 297',
                  boxShadow: '0 0 0 9999px rgba(0,0,0,0.82)'
                }}
              >
                {/* Traversing Laser Line */}
                <div className="absolute inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_10px_#34d399] animate-scanlaser pointer-events-none" />

                {/* 4 Corner Anchors Target Brackets */}
                {anchorTargets.map((pos, i) => (
                  <div
                    key={i}
                    className={`absolute border-[2.5px] rounded-lg flex items-center justify-center transition-all ${
                      lockLevel >= 8
                        ? 'border-emerald-400 bg-emerald-400/20 scale-105'
                        : lockLevel >= 3
                        ? 'border-amber-400 bg-amber-400/15'
                        : 'border-red-500/70 bg-red-500/10'
                    }`}
                    style={{
                      left: pos.left,
                      top: pos.top,
                      width: '16%',
                      height: '11%',
                      transform: 'translate(-50%, -50%)'
                    }}
                  >
                    <div className={`w-[2px] h-3.5 ${lockLevel >= 8 ? 'bg-emerald-400' : lockLevel >= 3 ? 'bg-amber-400' : 'bg-red-500/60'} absolute`} />
                    <div className={`h-[2px] w-3.5 ${lockLevel >= 8 ? 'bg-emerald-400' : lockLevel >= 3 ? 'bg-amber-400' : 'bg-red-500/60'} absolute`} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Captured Canvas Preview in Camera */}
          {imageLoaded && (
            <div className="absolute z-20 w-full h-full flex justify-center items-center pointer-events-none bg-black/75">
              <div
                className="relative border-2 border-emerald-400 shadow-[0_0_30px_rgba(52,211,153,0.5)] rounded-lg overflow-hidden"
                style={{ width: '94vw', maxWidth: 'calc(80vh * (210 / 297))', aspectRatio: '210 / 297' }}
              >
                <canvas ref={canvasRef} className="absolute top-0 left-0 w-full h-full object-contain shadow-2xl" />
                <canvas ref={overlayCanvasRef} className="absolute top-0 left-0 w-full h-full object-contain" />
              </div>
            </div>
          )}

          {/* BOTTOM CONTROLS & MANUAL SHUTTER */}
          <div className="fixed bottom-[max(1.25rem,env(safe-area-inset-bottom))] left-0 right-0 z-50 flex flex-col items-center gap-2 pointer-events-none">
            {/* Shutter Button */}
            <div className="flex items-center gap-4 pointer-events-auto">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (!isProcessing) captureImage();
                }}
                disabled={isProcessing}
                className="group relative flex items-center justify-center w-18 h-18 sm:w-20 sm:h-20 rounded-full border-4 border-white/90 bg-white/20 active:scale-95 transition-transform backdrop-blur-md shadow-2xl cursor-pointer"
                title="Fotoğraf Çek ve Oku"
              >
                <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-full bg-emerald-500 group-hover:bg-emerald-400 group-active:scale-90 transition-all shadow-inner" />
              </button>
            </div>

            <p className="text-[10px] sm:text-[11px] text-white/90 font-medium bg-black/70 px-3.5 py-1 rounded-full backdrop-blur-md shadow pointer-events-auto">
              {status ? status : "Sabit tuttuğunuzda otomatik çeker veya butona dokunun"}
            </p>
          </div>

          {/* Process Success Message Floating Toast */}
          {status && isProcessing && (
            <div className="fixed bottom-24 left-0 right-0 flex justify-center z-50 pointer-events-none px-4">
              <div className="bg-emerald-600 text-white px-5 py-2.5 rounded-full text-xs sm:text-sm font-bold shadow-2xl border-2 border-white flex items-center gap-2 animate-bounce">
                <span>⚡</span>
                <span>{status}</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
