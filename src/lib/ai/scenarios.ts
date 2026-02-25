/**
 * Scenario Templates for Hangout Creation
 * 
 * Each scenario modifies the AI prompt context so suggestions are
 * appropriate for the type of gathering being planned.
 */

export interface ScenarioTemplate {
    id: string;
    name: string;
    emoji: string;
    description: string;
    promptContext: string;
    suggestedCategories: string[];
    defaultRadius: number; // in miles
}

export const SCENARIO_TEMPLATES: ScenarioTemplate[] = [
    {
        id: "date-night",
        name: "Date Night",
        emoji: "💕",
        description: "Romantic spots with great ambiance",
        promptContext: "This is for a romantic date night. Prioritize intimate venues with great ambiance, candlelit restaurants, cocktail lounges, scenic overlooks, or unique experiences like wine tastings or cooking classes. Avoid loud, crowded, or extremely casual venues.",
        suggestedCategories: ["restaurant", "bar", "Arts", "Music"],
        defaultRadius: 15,
    },
    {
        id: "group-dinner",
        name: "Group Dinner",
        emoji: "🍽️",
        description: "Restaurants that seat large parties",
        promptContext: "This is for a group dinner. Prioritize restaurants that can comfortably accommodate large parties (6+ people), have shareable menus, and offer a fun social atmosphere. Family-style dining, KBBQ, hot pot, tapas, and brewpubs work great.",
        suggestedCategories: ["restaurant", "Food"],
        defaultRadius: 15,
    },
    {
        id: "outdoor-adventure",
        name: "Outdoor Fun",
        emoji: "🏔️",
        description: "Hikes, parks, and outdoor activities",
        promptContext: "This is for an outdoor adventure. Suggest trails, hikes, parks, camping spots, kayaking, rock climbing, mountain biking, or other outdoor activities. Consider weather appropriateness and difficulty level for a mixed group.",
        suggestedCategories: ["activity", "sightseeing"],
        defaultRadius: 50,
    },
    {
        id: "chill-hangout",
        name: "Chill Hangout",
        emoji: "☕",
        description: "Low-key spots to relax and chat",
        promptContext: "This is for a chill, low-key hangout. Suggest cozy cafes, bookstores with seating, board game cafes, laid-back breweries, parks with good seating, or dessert spots. The vibe should be relaxed and conversational.",
        suggestedCategories: ["restaurant", "bar", "activity"],
        defaultRadius: 10,
    },
    {
        id: "night-out",
        name: "Night Out",
        emoji: "🎉",
        description: "Bars, clubs, and live entertainment",
        promptContext: "This is for a night out. Suggest bars, nightclubs, live music venues, comedy shows, karaoke spots, or late-night entertainment. Energy should be high and social.",
        suggestedCategories: ["bar", "Nightlife", "Music", "Comedy"],
        defaultRadius: 15,
    },
    {
        id: "weekend-trip",
        name: "Weekend Trip",
        emoji: "🚗",
        description: "Multi-day getaway destinations",
        promptContext: "This is for a weekend trip. Suggest destinations within 2-4 hours drive that offer a mix of activities, dining, and lodging. National parks, ski resorts, beach towns, and charming small towns are ideal. Include both the destination and specific activities there.",
        suggestedCategories: ["activity", "sightseeing", "restaurant"],
        defaultRadius: 150,
    },
];

/**
 * Builds a scenario-aware prompt modifier string.
 * Returns empty string if no scenario is selected.
 */
export function buildScenarioContext(scenarioId: string | null): string {
    if (!scenarioId) return "";
    const scenario = SCENARIO_TEMPLATES.find(s => s.id === scenarioId);
    if (!scenario) return "";
    return `\nScenario: ${scenario.name}. ${scenario.promptContext}\n`;
}
