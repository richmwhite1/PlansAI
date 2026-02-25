const fs = require('fs');
const file = './src/components/dashboard/activity-suggestions.tsx';
let code = fs.readFileSync(file, 'utf8');

// 1. Add DatePicker / Calendar imports
if (!code.includes('import { format } from "date-fns"')) {
    code = code.replace(/import \{ useState, useEffect, useRef \} from "react";\n/, 'import { useState, useEffect, useRef } from "react";\nimport { Calendar as CalendarIcon } from "lucide-react";\nimport { format } from "date-fns";\n');
}

// 2. Add targetDate state
if (!code.includes('const [targetDate, setTargetDate]')) {
    code = code.replace(/const \[distanceFilter, setDistanceFilter\] = useState<5 \| 10 \| 25>\(10\);/, 'const [distanceFilter, setDistanceFilter] = useState<5 | 10 | 25>(10);\n    const [targetDate, setTargetDate] = useState<Date | undefined>(undefined);');
}

// 3. Update API calls to include Date
code = code.replace(/radius: distanceFilter \* 1609,\n                    friendIds\n                \}\)/g, 'radius: distanceFilter * 1609,\n                    friendIds,\n                    targetDate: targetDate ? targetDate.toISOString() : undefined\n                })');
code = code.replace(/fetch\(\`\/api\/events\/trending\?lat=\$\{location\.lat\}&lng=\$\{location\.lng\}&radius=\$\{distanceFilter\}\`\)/, 'fetch(`/api/events/trending?lat=${location.lat}&lng=${location.lng}&radius=${distanceFilter}${targetDate ? `&targetDate=${targetDate.toISOString()}` : \'\'}`)');

// 4. Update the Filters UI to include a Date Picker toggle
const filterStart = code.indexOf('{/* Filters */}');
const filterEnd = code.indexOf('<div className="space-y-2');
const filtersBlock = code.slice(filterStart, filterEnd);

if (!filtersBlock.includes('Date')) {
    const newFiltersBlock = `
            {/* Filters */}
            <div className="flex flex-wrap items-center gap-2 mb-4">
                <div className="flex bg-slate-800/50 rounded-lg p-1 border border-white/5 text-xs">
                    {(['All', 'Food', 'Activity', 'Nightlife'] as const).map((f) => (
                        <button
                            key={f}
                            onClick={() => setActiveFilter(f)}
                            className={cn(
                                "px-3 py-1.5 rounded-md font-bold uppercase tracking-tight transition-all",
                                activeFilter === f ? "bg-primary text-primary-foreground shadow-lg" : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            {f}
                        </button>
                    ))}
                </div>
                
                {/* Simple Date Toggle for demo, in real app use a DatePicker component */}
                <div className="flex items-center gap-2 ml-auto">
                    <input 
                        type="date" 
                        value={targetDate ? format(targetDate, 'yyyy-MM-dd') : ''}
                        onChange={(e) => setTargetDate(e.target.value ? new Date(e.target.value) : undefined)}
                        className="bg-slate-800/50 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-foreground outline-none focus:border-primary/50 [&::-webkit-calendar-picker-indicator]:filter-invert"
                    />
                    {targetDate && (
                        <button 
                            onClick={() => setTargetDate(undefined)}
                            className="text-xs text-muted-foreground hover:text-foreground"
                        >
                            Clear
                        </button>
                    )}
                </div>
            </div>

            `;
    code = code.replace(filtersBlock, newFiltersBlock);
}

// 5. Overhaul the Option Card
// We need to change:
// <motion.button ... onClick={onSelectCallback} ... relative overflow-hidden>
// to
// <motion.div ... relative overflow-hidden>
// Make the whole thing an <a> link out
// Move the Checkbox to the right side

const mapStart = code.indexOf('filteredOptions.map((activity, i) => {');
const motionButtonStart = code.indexOf('<motion.button', mapStart);
const innerContentStart = code.indexOf('<div className="flex gap-4">', motionButtonStart);

// We need to replace from motionButtonStart to the end of that block.
// Let's do a targeted regex replace for the row mapping logic.

let refactoredCard = code.substring(mapStart);

// Replace motion.button wrapper
refactoredCard = refactoredCard.replace(/<motion\.button([\s\S]*?)onClick=\{\(\) => onSelectCallback\(activity\)\}([\s\S]*?)className=\{cn\(/, '<motion.div$1$2className={cn(');

// Remove the end tag
refactoredCard = refactoredCard.replace(/<\/motion\.button>/g, '</motion.div>');

// Now we need to restructure the inner content.
// The whole inner content should be an <a> link except the checkbox.
// Actually, nested clickable elements (<a> inside <button> inside <a> etc.) are annoying.
// Let's make the wrapper relative.
// - Left: the image
// - Middle: the text details (make this the clickable link)
// - Right: the Checkbox button

const oldFlexGap = '<div className="flex gap-4">';
const newFlexGap = `
                                <div className="flex gap-4 w-full cursor-pointer" onClick={() => window.open(activity.websiteUrl || activity.locationUrl || \`https://www.google.com/search?q=\${encodeURIComponent(activity.title + ' ' + (activity.address || ''))}\`, '_blank')}>
`;

refactoredCard = refactoredCard.replace(oldFlexGap, newFlexGap);

// Remove the old Check layover from the picture
refactoredCard = refactoredCard.replace(/\{isSelected && \(\s*<div className="absolute inset-0 bg-primary\/40 flex items-center justify-center">\s*<Check className="w-8 h-8 text-white" \/>\s*<\/div>\s*\)\}/, '');

// Replace the old distinct Link button on the far right with a Checkbox button
const oldRightSide = `<div className="flex flex-col justify-between items-end gap-2">
                                        <a
                                            href={activity.websiteUrl || activity.locationUrl || \`https://www.google.com/search?q=\${encodeURIComponent(activity.title + ' ' + (activity.address || ''))}\`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            onClick={(e) => e.stopPropagation()}
                                            className="p-2 rounded-full bg-white/5 hover:bg-primary/20 text-muted-foreground hover:text-primary transition-colors"
                                            title="Visit Website / Info"
                                        >
                                            <Link className="w-4 h-4" />
                                        </a>
                                    </div>`;

const newRightSide = `<div className="flex flex-col justify-center items-end pl-4" onClick={(e) => e.stopPropagation()}>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onSelectCallback(activity);
                                            }}
                                            className={cn(
                                                "w-8 h-8 rounded-full flex items-center justify-center transition-all border-2",
                                                isSelected 
                                                    ? "bg-primary border-primary text-primary-foreground shadow-[0_0_15px_rgba(var(--primary),0.5)]" 
                                                    : "bg-transparent border-white/20 text-transparent hover:border-primary/50"
                                            )}
                                        >
                                            <Check className="w-5 h-5" />
                                        </button>
                                    </div>`;

refactoredCard = refactoredCard.replace(oldRightSide, newRightSide);

code = code.substring(0, mapStart) + refactoredCard;

fs.writeFileSync(file, code);
console.log("Activity Suggestions Refactored!");
