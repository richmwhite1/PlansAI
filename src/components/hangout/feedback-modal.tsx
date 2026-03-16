"use client";

import { useState, useRef } from "react";
import { Star, Loader2, BrainCircuit, X, Camera, ImagePlus, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface FeedbackModalProps {
    hangoutId: string;
    hangoutTitle: string;
    isOpen: boolean;
    onClose: () => void;
    onComplete?: () => void;
}

interface PhotoPreview {
    file: File;
    preview: string;
    caption: string;
    uploading: boolean;
    url?: string;
}

async function uploadToCloudinary(file: File): Promise<string> {
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

    if (!cloudName || !uploadPreset) {
        // Fallback: compress & return data URL if Cloudinary not configured
        return new Promise((resolve) => {
            const canvas = document.createElement("canvas");
            const img = new Image();
            img.onload = () => {
                const MAX = 900;
                const scale = Math.min(1, MAX / Math.max(img.width, img.height));
                canvas.width = img.width * scale;
                canvas.height = img.height * scale;
                canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
                resolve(canvas.toDataURL("image/jpeg", 0.75));
            };
            img.src = URL.createObjectURL(file);
        });
    }

    const form = new FormData();
    form.append("file", file);
    form.append("upload_preset", uploadPreset);
    form.append("folder", "plans-app");

    const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: "POST",
        body: form,
    });
    const data = await res.json();
    if (!data.secure_url) throw new Error("Cloudinary upload failed");
    return data.secure_url;
}

export function FeedbackModal({ hangoutId, hangoutTitle, isOpen, onClose, onComplete }: FeedbackModalProps) {
    const [reflection, setReflection] = useState("");
    const [rating, setRating] = useState<number>(0);
    const [photos, setPhotos] = useState<PhotoPreview[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [extracted, setExtracted] = useState<{ vibes: string[], keywords: string[], summary: string } | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files ?? []).slice(0, 6 - photos.length);
        const previews: PhotoPreview[] = files.map((file) => ({
            file,
            preview: URL.createObjectURL(file),
            caption: "",
            uploading: false,
        }));
        setPhotos((prev) => [...prev, ...previews]);
        // Reset so same file can be re-selected
        e.target.value = "";
    };

    const removePhoto = (index: number) => {
        setPhotos((prev) => {
            URL.revokeObjectURL(prev[index].preview);
            return prev.filter((_, i) => i !== index);
        });
    };

    const handleSubmit = async () => {
        if (!reflection) return;
        setIsSubmitting(true);

        try {
            // 1. Upload photos to Cloudinary in parallel
            const uploadedPhotos = await Promise.all(
                photos.map(async (p) => {
                    setPhotos((prev) => prev.map((ph, i) => photos.indexOf(p) === i ? { ...ph, uploading: true } : ph));
                    const url = await uploadToCloudinary(p.file);
                    return { url, caption: p.caption };
                })
            );

            // 2. Save feedback (reflection + rating)
            const res = await fetch(`/api/hangouts/${hangoutId}/feedback`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ reflection, rating }),
            });

            if (res.ok) {
                const data = await res.json();
                setExtracted(data.extracted);
                onComplete?.();
            }

            // 3. Save photos (non-blocking — fire and forget)
            if (uploadedPhotos.length > 0) {
                uploadedPhotos.forEach(({ url, caption }) => {
                    fetch(`/api/hangouts/${hangoutId}/photos`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ url, caption: caption || undefined }),
                    }).catch(() => {});
                });
            }
        } catch (err) {
            console.error("Feedback submission failed:", err);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/80 backdrop-blur-sm">
            <motion.div
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 40 }}
                className="w-full sm:max-w-md bg-slate-900 border border-white/10 rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl max-h-[92dvh] flex flex-col"
            >
                {extracted ? (
                    /* ── Success screen ── */
                    <div className="p-8 text-center space-y-6">
                        <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto">
                            <BrainCircuit className="w-8 h-8 text-primary" />
                        </div>
                        <div className="space-y-2">
                            <h2 className="text-2xl font-bold text-white">Recap saved!</h2>
                            <p className="text-slate-400 italic">"{extracted.summary}"</p>
                        </div>
                        <div className="flex flex-wrap justify-center gap-2">
                            {extracted.vibes.map((v) => (
                                <span key={v} className="px-3 py-1 bg-primary/10 text-primary rounded-full border border-primary/20 text-xs font-medium">
                                    {v}
                                </span>
                            ))}
                        </div>
                        <button
                            onClick={onClose}
                            className="w-full py-3 bg-white text-slate-950 font-bold rounded-xl hover:bg-slate-200 transition-colors"
                        >
                            Done
                        </button>
                    </div>
                ) : (
                    /* ── Input screen ── */
                    <div className="flex flex-col overflow-hidden">
                        {/* Header */}
                        <div className="flex items-center justify-between p-5 pb-4 shrink-0">
                            <div>
                                <h2 className="text-lg font-bold text-white">How was it?</h2>
                                <p className="text-xs text-slate-500 mt-0.5 truncate max-w-[240px]">{hangoutTitle}</p>
                            </div>
                            <button onClick={onClose} className="p-1.5 text-slate-500 hover:text-white transition-colors rounded-full hover:bg-white/10">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Scrollable body */}
                        <div className="overflow-y-auto flex-1 px-5 pb-5 space-y-5">

                            {/* Star rating */}
                            <div className="flex justify-center gap-1">
                                {[1, 2, 3, 4, 5].map((s) => (
                                    <button
                                        key={s}
                                        onClick={() => setRating(s)}
                                        className="p-1 transition-transform active:scale-110"
                                    >
                                        <Star
                                            className={cn(
                                                "w-9 h-9 transition-colors",
                                                s <= rating ? "fill-amber-400 text-amber-400" : "text-slate-700"
                                            )}
                                        />
                                    </button>
                                ))}
                            </div>

                            {/* Reflection */}
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                    Reflection
                                </label>
                                <textarea
                                    value={reflection}
                                    onChange={(e) => setReflection(e.target.value)}
                                    placeholder="What made this night memorable? The more you share, the better Plans gets at suggestions."
                                    className="w-full h-28 bg-white/5 border border-white/10 rounded-xl p-3.5 text-slate-200 placeholder:text-slate-600 focus:border-primary/50 outline-none transition-colors resize-none text-sm"
                                />
                            </div>

                            {/* Photos */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                        Photos
                                    </label>
                                    <span className="text-[10px] text-slate-600">{photos.length}/6</span>
                                </div>

                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    multiple
                                    capture="environment"
                                    onChange={handleFileSelect}
                                    className="hidden"
                                />

                                {photos.length === 0 ? (
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        className="w-full flex flex-col items-center justify-center gap-2 h-24 rounded-xl border border-dashed border-white/15 bg-white/[0.02] text-slate-500 hover:text-slate-300 hover:border-white/25 transition-colors"
                                    >
                                        <Camera className="w-5 h-5" />
                                        <span className="text-xs font-medium">Add photos from the night</span>
                                    </button>
                                ) : (
                                    <div className="grid grid-cols-3 gap-2">
                                        {photos.map((p, i) => (
                                            <div key={i} className="relative aspect-square rounded-xl overflow-hidden bg-slate-800">
                                                <img
                                                    src={p.preview}
                                                    alt=""
                                                    className="w-full h-full object-cover"
                                                />
                                                {p.uploading && (
                                                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                                        <Loader2 className="w-5 h-5 text-white animate-spin" />
                                                    </div>
                                                )}
                                                <button
                                                    onClick={() => removePhoto(i)}
                                                    className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/70 flex items-center justify-center"
                                                >
                                                    <X className="w-3 h-3 text-white" />
                                                </button>
                                            </div>
                                        ))}
                                        {photos.length < 6 && (
                                            <button
                                                onClick={() => fileInputRef.current?.click()}
                                                className="aspect-square rounded-xl border border-dashed border-white/15 flex items-center justify-center text-slate-600 hover:text-slate-400 hover:border-white/25 transition-colors"
                                            >
                                                <ImagePlus className="w-5 h-5" />
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Footer CTA */}
                        <div className="p-5 pt-3 border-t border-white/5 shrink-0">
                            <button
                                onClick={handleSubmit}
                                disabled={isSubmitting || !reflection}
                                className="w-full py-4 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-2xl transition-all disabled:opacity-50 disabled:grayscale flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        Saving recap…
                                    </>
                                ) : (
                                    "Save Recap"
                                )}
                            </button>
                        </div>
                    </div>
                )}
            </motion.div>
        </div>
    );
}
