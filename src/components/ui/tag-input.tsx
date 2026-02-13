"use client";

import { useState, KeyboardEvent } from "react";
import { X } from "lucide-react";

interface TagInputProps {
    name: string;
    label: string;
    initialTags?: string[];
    placeholder?: string;
    className?: string;
}

export function TagInput({ name, label, initialTags = [], placeholder, className }: TagInputProps) {
    const [tags, setTags] = useState<string[]>(initialTags);
    const [inputValue, setInputValue] = useState("");

    const addTag = () => {
        const trimmed = inputValue.trim().replace(/^#/, "");
        if (trimmed && !tags.includes(trimmed)) {
            setTags([...tags, trimmed]);
            setInputValue("");
        }
    };

    const removeTag = (tagToRemove: string) => {
        setTags(tags.filter((t) => t !== tagToRemove));
    };

    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            addTag();
        } else if (e.key === "Backspace" && !inputValue && tags.length > 0) {
            removeTag(tags[tags.length - 1]);
        }
    };

    return (
        <div className={`space-y-2 ${className}`}>
            <label className="block text-sm font-medium text-slate-400">{label}</label>
            <div className="flex flex-wrap gap-2 p-2 bg-slate-900/50 border border-white/10 rounded-xl min-h-[48px] focus-within:border-violet-500/50 transition-colors">
                {tags.map((tag) => (
                    <span
                        key={tag}
                        className="flex items-center gap-1 px-2 py-1 bg-violet-500/20 text-violet-300 text-sm font-medium rounded-lg border border-violet-500/30"
                    >
                        #{tag}
                        <button
                            type="button"
                            onClick={() => removeTag(tag)}
                            className="hover:text-white transition-colors"
                        >
                            <X size={14} />
                        </button>
                    </span>
                ))}
                <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onBlur={addTag}
                    placeholder={tags.length === 0 ? placeholder : ""}
                    className="flex-1 bg-transparent border-none outline-none text-sm min-w-[120px] py-1"
                />
            </div>
            {/* Hidden input to submit with form data */}
            <input type="hidden" name={name} value={tags.join(",")} />
        </div>
    );
}
