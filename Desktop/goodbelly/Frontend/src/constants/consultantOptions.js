// Consultant Registration Options and Constants
// Source: Website code analysis from gbwebFront/goodbellyFrontend

export const SPECIALIZATIONS = [
    "Gut Health & Holistic Nutrition",
    "Women's Hormonal Health",
    "Metabolic Health & Diabetes",
    "Sports/Performance Nutrition",
    "Plant-based & Sustainable Nutrition",
    "Mental Wellbeing & Mindful Eating",
    "Pediatric & Family Nutrition",
    "Clinical Dietetics",
    "Weight Management",
    "Geriatric Nutrition",
    "Digestive Disorders (IBS/IBD)",
    "Other (custom)",
];

export const LANGUAGE_OPTIONS = [
    "English",
    "Hindi",
    "Bengali",
    "Gujarati",
    "Marathi",
    "Punjabi",
    "Tamil",
    "Telugu",
    "Malayalam",
    "Kannada",
    "Urdu",
];

export const FOCUS_AREA_OPTIONS = [
    "PCOS nutrition",
    "Thyroid balance",
    "Diabetes remission",
    "Gut health",
    "Weight management",
    "Sports nutrition",
    "Prenatal & postpartum",
    "Family nutrition",
    "Body image healing",
    "Stress eating recovery",
    "Sleep-supportive routines",
    "Blood sugar stability",
    "Vegan/plant-based",
    "Corporate wellness",
    "Cycle syncing",
    "Injury recovery",
    "Endurance athletes",
    "Kids' immunity",
    "Balanced meal planning",
    "Family meal planning",
];

export const SLOT_OPTIONS = [
    "08:00 AM",
    "09:00 AM",
    "10:00 AM",
    "11:00 AM",
    "12:00 PM",
    "01:00 PM",
    "02:00 PM",
    "03:00 PM",
    "04:00 PM",
    "05:00 PM",
    "06:00 PM",
    "07:00 PM",
    "08:00 PM",
    "09:00 PM",
    "10:00 PM",
    "11:00 PM",
    "12:00 AM",
    "01:00 AM",
    "02:00 AM",
    "03:00 AM",
    "04:00 AM",
    "05:00 AM",
    "06:00 AM",
    "07:00 AM",
];

export const DAYS_OF_WEEK = [
    "MONDAY",
    "TUESDAY",
    "WEDNESDAY",
    "THURSDAY",
    "FRIDAY",
    "SATURDAY",
];

export const CONSULTANT_TYPES = ["NUTRITIONIST", "DIETICIAN", "DOCTOR"];

export const DEFAULT_DURATIONS = [
    { id: "45", label: "45 minutes", price: "399" },
];

export const REGISTRATION_STEPS = [
    {
        id: "profile",
        title: "Professional profile",
        description: "We will use this to create your public listing.",
    },
    {
        id: "focus",
        title: "Areas of focus",
        description: "Tell us who you usually help and how you like to work.",
    },
    {
        id: "consultation",
        title: "Consultation setup",
        description: "Select durations, slot availability, and delivery format.",
    },
    {
        id: "review",
        title: "Review & submit",
        description: "Confirm the details before we reach out for onboarding.",
    },
];

export const PASSWORD_MIN_LENGTH = 8;
