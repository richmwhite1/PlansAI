"use client";

import { useState, useRef } from "react";
import { Camera, Plus, X, Loader2, Image as ImageIcon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface Photo {
    id: string;
    url: string;
    caption?: string | null;
    uploader: {
        displayName: string | null;
        avatarUrl: string | null;
    };
}

interface PhotoGalleryProps {
    hangoutId: string;
    initialPhotos: Photo[];
    isParticipant: boolean;
    onPhotoClick?: (photo: Photo) => void;
}

export function PhotoGallery({ hangoutId, initialPhotos, isParticipant, onPhotoClick }: PhotoGalleryProps) {
    const [photos, setPhotos] = useState<Photo[]>(initialPhotos);
    const [isAdding, setIsAdding] = useState(false);
    const [url, setUrl] = useState("");
    const [caption, setCaption] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [preview, setPreview] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleAddPhoto = async () => {
        const finalUrl = preview || url;
        if (!finalUrl) return;
        setIsSubmitting(true);

        try {
            const res = await fetch(`/api/hangouts/${hangoutId}/photos`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ url: finalUrl, caption })
            });

            if (res.ok) {
                const data = await res.json();
                setPhotos([data.photo, ...photos]);
                setIsAdding(false);
                setUrl("");
                setCaption("");
                setPreview(null);
            }
        } catch (err) {
            console.error("Failed to add photo");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setPreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                    <Camera className="w-5 h-5 text-violet-400" />
                    Shared Gallery
                </h2>
                {isParticipant && (
                    <button
                        onClick={() => setIsAdding(true)}
                        className="text-xs font-medium text-violet-400 hover:text-violet-300 flex items-center gap-1 transition-colors"
                    >
                        <Plus className="w-3.5 h-3.5" />
                        Add Photo
                    </button>
                )}
            </div>

            <AnimatePresence>
                {isAdding && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="p-4 bg-white/5 border border-white/10 rounded-2xl space-y-3">
                            {preview ? (
                                <div className="relative aspect-video rounded-xl overflow-hidden bg-slate-900 border border-white/10">
                                    <img src={preview} alt="Preview" className="w-full h-full object-cover" />
                                    <button
                                        onClick={() => setPreview(null)}
                                        className="absolute top-2 right-2 p-1 bg-black/50 hover:bg-black/70 rounded-full text-white transition-colors"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            ) : (
                                <div
                                    onClick={() => fileInputRef.current?.click()}
                                    className="aspect-video bg-slate-900/50 border-2 border-dashed border-white/10 rounded-xl flex flex-col items-center justify-center text-slate-500 hover:border-violet-500/50 hover:bg-violet-500/5 cursor-pointer transition-all"
                                >
                                    <Plus className="w-8 h-8 mb-2 opacity-20" />
                                    <p className="text-sm font-medium">Click to upload photo</p>
                                    <p className="text-[10px] opacity-50 mt-1">PNG, JPG up to 10MB</p>
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        onChange={handleFileChange}
                                        accept="image/*"
                                        className="hidden"
                                    />
                                </div>
                            )}

                            <input
                                type="text"
                                value={caption}
                                onChange={(e) => setCaption(e.target.value)}
                                placeholder="Add a caption (optional)"
                                className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-200 outline-none focus:border-violet-500/50"
                            />
                            <div className="flex justify-end gap-2">
                                <button
                                    onClick={() => {
                                        setIsAdding(false);
                                        setPreview(null);
                                    }}
                                    className="px-3 py-1.5 text-xs text-slate-400 hover:text-white transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleAddPhoto}
                                    disabled={(!preview && !url) || isSubmitting}
                                    className="px-6 py-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-violet-500/20 flex items-center gap-2"
                                >
                                    {isSubmitting && <Loader2 className="w-3 h-3 animate-spin" />}
                                    Post Photo
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {photos.length === 0 ? (
                <div className="aspect-video bg-white/5 border border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center text-slate-600 p-8">
                    <ImageIcon className="w-8 h-8 mb-2 opacity-20" />
                    <p className="text-sm">No photos shared yet</p>
                </div>
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {photos.map((p) => (
                        <motion.div
                            key={p.id}
                            layoutId={p.id}
                            className="group relative aspect-square rounded-xl overflow-hidden bg-slate-900 border border-white/5 cursor-pointer"
                            onClick={() => onPhotoClick?.(p)}
                        >
                            <img
                                src={p.url}
                                alt={p.caption || "Hangout photo"}
                                className="w-full h-full object-cover transition-transform group-hover:scale-105"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-2 flex flex-col justify-end">
                                {p.caption && <p className="text-[10px] text-white line-clamp-1 mb-1">{p.caption}</p>}
                                <div className="flex items-center gap-1">
                                    <div className="w-4 h-4 rounded-full bg-violet-500 flex items-center justify-center text-[8px] font-bold text-white">
                                        {p.uploader.displayName?.slice(0, 1).toUpperCase() || "?"}
                                    </div>
                                    <span className="text-[8px] text-slate-300">
                                        {p.uploader.displayName || "Shared"}
                                    </span>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}
        </div>
    );
}
