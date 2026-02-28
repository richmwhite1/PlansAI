"use client";

import { useState, useEffect } from "react";
import { FileText, Plus, Trash2, ExternalLink, Link2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface Document {
    id: string;
    title: string;
    url: string | null;
    description: string | null;
    uploadedBy: string;
    createdAt: string;
}

interface SharedDocumentsProps {
    hangoutId: string;
    isParticipant: boolean;
    isOrganizer: boolean;
    currentUserId?: string;
}

export function SharedDocuments({ hangoutId, isParticipant, isOrganizer, currentUserId }: SharedDocumentsProps) {
    const [documents, setDocuments] = useState<Document[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAdd, setShowAdd] = useState(false);
    const [newDoc, setNewDoc] = useState({ title: "", url: "", description: "" });
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        fetchDocuments();
    }, [hangoutId]);

    const fetchDocuments = async () => {
        try {
            const res = await fetch(`/api/hangouts/${hangoutId}/documents`);
            if (res.ok) {
                const data = await res.json();
                setDocuments(data.documents);
            }
        } catch (err) {
            console.error("Failed to fetch documents:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newDoc.title.trim()) return;

        setSubmitting(true);
        try {
            const res = await fetch(`/api/hangouts/${hangoutId}/documents`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(newDoc),
            });

            if (res.ok) {
                const data = await res.json();
                setDocuments(prev => [data.document, ...prev]);
                setNewDoc({ title: "", url: "", description: "" });
                setShowAdd(false);
                toast.success("Document added!");
            }
        } catch (err) {
            toast.error("Failed to add document");
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (docId: string) => {
        try {
            const res = await fetch(`/api/hangouts/${hangoutId}/documents?documentId=${docId}`, {
                method: "DELETE",
            });

            if (res.ok) {
                setDocuments(prev => prev.filter(d => d.id !== docId));
                toast.success("Document removed");
            }
        } catch (err) {
            toast.error("Failed to delete document");
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <FileText className="w-4 h-4 text-primary" />
                    Shared Documents
                </h3>
                {isParticipant && (
                    <button
                        onClick={() => setShowAdd(!showAdd)}
                        className="text-xs font-medium text-primary hover:text-primary/80 flex items-center gap-1"
                    >
                        <Plus className="w-3.5 h-3.5" /> Add
                    </button>
                )}
            </div>

            <AnimatePresence>
                {showAdd && (
                    <motion.form
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        onSubmit={handleAdd}
                        className="bg-slate-900/60 rounded-xl p-4 border border-white/10 space-y-3 overflow-hidden"
                    >
                        <input
                            type="text"
                            placeholder="Document title *"
                            value={newDoc.title}
                            onChange={(e) => setNewDoc(p => ({ ...p, title: e.target.value }))}
                            className="w-full bg-slate-800/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-primary/50"
                            autoFocus
                        />
                        <input
                            type="url"
                            placeholder="URL (Google Doc, PDF link, etc.)"
                            value={newDoc.url}
                            onChange={(e) => setNewDoc(p => ({ ...p, url: e.target.value }))}
                            className="w-full bg-slate-800/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-primary/50"
                        />
                        <input
                            type="text"
                            placeholder="Description (optional)"
                            value={newDoc.description}
                            onChange={(e) => setNewDoc(p => ({ ...p, description: e.target.value }))}
                            className="w-full bg-slate-800/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-primary/50"
                        />
                        <div className="flex gap-2 justify-end">
                            <button type="button" onClick={() => setShowAdd(false)} className="px-3 py-1.5 text-xs text-slate-400">
                                Cancel
                            </button>
                            <button type="submit" disabled={submitting} className="px-4 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-bold disabled:opacity-50 flex items-center gap-1.5">
                                {submitting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                                Add
                            </button>
                        </div>
                    </motion.form>
                )}
            </AnimatePresence>

            {loading ? (
                <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-5 h-5 animate-spin text-slate-500" />
                </div>
            ) : documents.length === 0 ? (
                <div className="text-center py-8 bg-white/5 rounded-xl border border-dashed border-white/10">
                    <FileText className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-muted-foreground text-xs italic">No documents shared yet.</p>
                    <p className="text-muted-foreground text-[10px] mt-1">Add waivers, packing lists, maps, or other resources.</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {documents.map(doc => (
                        <motion.div
                            key={doc.id}
                            layout
                            className="group flex items-center gap-3 bg-slate-900/40 rounded-xl p-3 border border-white/5 hover:border-white/10 transition-all"
                        >
                            <div className="shrink-0 w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                                {doc.url ? <Link2 className="w-4 h-4 text-primary" /> : <FileText className="w-4 h-4 text-primary" />}
                            </div>
                            <div className="flex-1 min-w-0">
                                <h4 className="text-sm font-semibold text-white truncate">{doc.title}</h4>
                                {doc.description && <p className="text-xs text-slate-400 truncate">{doc.description}</p>}
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                                {doc.url && (
                                    <a
                                        href={doc.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-primary transition-all"
                                    >
                                        <ExternalLink className="w-3.5 h-3.5" />
                                    </a>
                                )}
                                {(isOrganizer || doc.uploadedBy === currentUserId) && (
                                    <button
                                        onClick={() => handleDelete(doc.id)}
                                        className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-500/20 text-slate-500 hover:text-red-400 transition-all"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                )}
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}
        </div>
    );
}
