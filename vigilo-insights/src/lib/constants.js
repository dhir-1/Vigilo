// Surat center coordinates
export const SURAT_CENTER = [21.1702, 72.8311];
export const DEFAULT_ZOOM = 13;

// Crime types — user-friendly labels with auto-severity
export const CRIME_TYPES = [
  { value: "phone_bag_snatching", label: "Phone / Bag Snatching", hint: "Someone grabbed your phone, purse or bag", backendType: "Theft", autoSeverity: "Medium" },
  { value: "chain_snatching", label: "Chain Snatching", hint: "Gold chain or jewelry snatched in public", backendType: "Theft", autoSeverity: "Medium" },
  { value: "vehicle_theft", label: "Vehicle Theft", hint: "Bike, scooter, car or auto stolen / parts stolen", backendType: "Theft", autoSeverity: "Medium" },
  { value: "physical_attack", label: "Physical Attack / Fight", hint: "Someone was beaten, hit, or physically hurt", backendType: "Assault", autoSeverity: "High" },
  { value: "robbery", label: "Robbery / Looting", hint: "Valuables taken by force or threat", backendType: "Robbery", autoSeverity: "High" },
  { value: "property_damage", label: "Property Damage", hint: "Car scratched, shop shutter broken, graffiti", backendType: "Vandalism", autoSeverity: "Low" },
  { value: "harassment", label: "Eve-teasing / Harassment", hint: "Stalking, catcalling, or threatening behaviour", backendType: "Harassment", autoSeverity: "Medium" },
  { value: "fraud", label: "Online / Money Fraud", hint: "UPI scam, fake call, card fraud, phishing", backendType: "Fraud", autoSeverity: "Medium" },
  { value: "break_in", label: "House / Shop Break-in", hint: "Forced entry into house, office or shop", backendType: "Burglary", autoSeverity: "High" },
  { value: "drug_activity", label: "Drug Activity", hint: "Drug dealing, substance abuse in public area", backendType: "Drug Related", autoSeverity: "High" },
  { value: "suspicious", label: "Suspicious Activity", hint: "Someone loitering, acting strange, trespassing", backendType: "Other", autoSeverity: "Low" },
  { value: "other", label: "Other", hint: "Anything not listed above — please describe", backendType: "Other", autoSeverity: "Medium" },
];

// Severity levels
export const SEVERITY_LEVELS = [
  { value: "low", label: "Low", color: "bg-green-500" },
  { value: "medium", label: "Medium", color: "bg-yellow-500" },
  { value: "high", label: "High", color: "bg-red-500" },
];

// Surat areas
export const SURAT_AREAS = [
  "Adajan", "Vesu", "Katargam", "Varachha", "Athwa",
  "Pal", "Udhna", "Limbayat", "Pandesara", "Sachin",
  "Rander", "Ring Road", "Citylight", "Dumas Road", "Piplod",
];

// Time of day options
export const TIME_OF_DAY = [
  { value: "morning", label: "Morning (6AM–12PM)" },
  { value: "afternoon", label: "Afternoon (12PM–6PM)" },
  { value: "evening", label: "Evening (6PM–12AM)" },
  { value: "night", label: "Night (12AM–6AM)" },
];

// Status options
export const REPORT_STATUSES = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending", color: "bg-yellow-500/15 text-yellow-600" },
  { value: "verified", label: "Verified", color: "bg-green-500/15 text-green-600" },
  { value: "rejected", label: "Rejected", color: "bg-red-500/15 text-red-600" },
];

// Mock crime markers for the map
export const MOCK_CRIME_MARKERS = [
  { id: 1, lat: 21.1850, lng: 72.8140, type: "theft", severity: "low", area: "Adajan", date: "2026-03-14", time: "14:30", safetyScore: 78, description: "Bicycle stolen from parking area" },
  { id: 2, lat: 21.1560, lng: 72.7710, type: "assault", severity: "high", area: "Katargam", date: "2026-03-13", time: "23:15", safetyScore: 32, description: "Physical assault near market area" },
  { id: 3, lat: 21.1670, lng: 72.8450, type: "robbery", severity: "high", area: "Varachha", date: "2026-03-14", time: "01:45", safetyScore: 25, description: "Armed robbery at jewelry store" },
  { id: 4, lat: 21.1810, lng: 72.8010, type: "vandalism", severity: "medium", area: "Athwa", date: "2026-03-12", time: "19:00", safetyScore: 55, description: "Car vandalized in residential area" },
  { id: 5, lat: 21.1460, lng: 72.8460, type: "theft", severity: "low", area: "Udhna", date: "2026-03-14", time: "10:20", safetyScore: 72, description: "Mobile phone snatching incident" },
  { id: 6, lat: 21.1950, lng: 72.8290, type: "harassment", severity: "medium", area: "Pal", date: "2026-03-13", time: "20:45", safetyScore: 48, description: "Street harassment reported" },
  { id: 7, lat: 21.1720, lng: 72.7890, type: "burglary", severity: "high", area: "Rander", date: "2026-03-11", time: "03:00", safetyScore: 30, description: "House break-in while residents were away" },
  { id: 8, lat: 21.1590, lng: 72.8200, type: "fraud", severity: "medium", area: "Ring Road", date: "2026-03-14", time: "16:00", safetyScore: 60, description: "Online payment fraud reported" },
  { id: 9, lat: 21.1750, lng: 72.7950, type: "theft", severity: "low", area: "Citylight", date: "2026-03-14", time: "12:30", safetyScore: 80, description: "Bag snatching at bus stop" },
  { id: 10, lat: 21.1430, lng: 72.8100, type: "assault", severity: "high", area: "Limbayat", date: "2026-03-13", time: "22:00", safetyScore: 28, description: "Gang-related assault" },
  { id: 11, lat: 21.1900, lng: 72.8400, type: "vandalism", severity: "low", area: "Vesu", date: "2026-03-14", time: "08:00", safetyScore: 85, description: "Graffiti on public wall" },
  { id: 12, lat: 21.1650, lng: 72.8550, type: "drug_related", severity: "high", area: "Pandesara", date: "2026-03-12", time: "02:30", safetyScore: 22, description: "Drug dealing activity suspected" },
];

// Mock user reports
export const MOCK_USER_REPORTS = [
  {
    id: "RPT-001",
    crimeType: "theft",
    severity: "medium",
    location: "Adajan, Surat",
    coordinates: [21.1850, 72.8140],
    date: "2026-03-14",
    time: "14:30",
    description: "My bicycle was stolen from the parking area near Adajan BRTS stop. It was a blue Hero Sprint cycle with a black seat. Last seen around 2:15 PM.",
    status: "verified",
    trustScore: 87,
    submittedAt: "2026-03-14T14:35:00",
    media: ["/placeholder-crime-1.jpg", "/placeholder-crime-2.jpg"],
    aiAnalysis: {
      exifCheck: { status: "pass", detail: "EXIF data consistent with reported time/location" },
      aiDetection: { status: "pass", detail: "No AI-generated content detected" },
      imageTextConsistency: { score: 92, detail: "High consistency between image and description" },
      imageQuality: { status: "pass", detail: "Image quality sufficient for verification" },
    },
    timeline: [
      { status: "Submitted", date: "2026-03-14 14:35", completed: true },
      { status: "Under Review", date: "2026-03-14 15:00", completed: true },
      { status: "Verified", date: "2026-03-14 16:20", completed: true },
    ],
  },
  {
    id: "RPT-002",
    crimeType: "vandalism",
    severity: "low",
    location: "Vesu, Surat",
    coordinates: [21.1560, 72.7710],
    date: "2026-03-13",
    time: "19:00",
    description: "Someone scratched my car that was parked outside my apartment building in Vesu. Found deep scratches on the driver side door.",
    status: "pending",
    trustScore: 72,
    submittedAt: "2026-03-13T19:15:00",
    media: ["/placeholder-crime-3.jpg"],
    aiAnalysis: {
      exifCheck: { status: "pass", detail: "EXIF data matches" },
      aiDetection: { status: "pass", detail: "Authentic image" },
      imageTextConsistency: { score: 78, detail: "Moderate consistency" },
      imageQuality: { status: "pass", detail: "Clear image" },
    },
    timeline: [
      { status: "Submitted", date: "2026-03-13 19:15", completed: true },
      { status: "Under Review", date: "2026-03-13 20:00", completed: true },
      { status: "Pending Verification", date: "", completed: false },
    ],
  },
  {
    id: "RPT-003",
    crimeType: "assault",
    severity: "high",
    location: "Katargam, Surat",
    coordinates: [21.1670, 72.8450],
    date: "2026-03-12",
    time: "23:15",
    description: "Was assaulted by two unknown men near the Katargam bridge around 11 PM. They fled when other people arrived. Suffered minor injuries.",
    status: "verified",
    trustScore: 94,
    submittedAt: "2026-03-12T23:30:00",
    media: ["/placeholder-crime-4.jpg", "/placeholder-crime-5.jpg", "/placeholder-crime-6.jpg"],
    aiAnalysis: {
      exifCheck: { status: "pass", detail: "Location and time verified" },
      aiDetection: { status: "pass", detail: "No manipulation detected" },
      imageTextConsistency: { score: 96, detail: "Very high consistency" },
      imageQuality: { status: "pass", detail: "High quality evidence" },
    },
    timeline: [
      { status: "Submitted", date: "2026-03-12 23:30", completed: true },
      { status: "Under Review", date: "2026-03-13 00:15", completed: true },
      { status: "Verified", date: "2026-03-13 02:00", completed: true },
    ],
  },
  {
    id: "RPT-004",
    crimeType: "robbery",
    severity: "high",
    location: "Varachha, Surat",
    coordinates: [21.1810, 72.8010],
    date: "2026-03-11",
    time: "01:45",
    description: "My shop was robbed. The thieves broke the shutter and stole electronics worth approximately 2 lakhs.",
    status: "rejected",
    trustScore: 35,
    submittedAt: "2026-03-11T07:00:00",
    media: [],
    aiAnalysis: {
      exifCheck: { status: "fail", detail: "No EXIF data found in uploaded images" },
      aiDetection: { status: "warning", detail: "Possible AI-generated content" },
      imageTextConsistency: { score: 28, detail: "Low consistency between claims and evidence" },
      imageQuality: { status: "fail", detail: "Images are too blurry" },
    },
    timeline: [
      { status: "Submitted", date: "2026-03-11 07:00", completed: true },
      { status: "Under Review", date: "2026-03-11 08:30", completed: true },
      { status: "Rejected", date: "2026-03-11 10:00", completed: true },
    ],
    rejectionReason: "Insufficient evidence and inconsistent information",
  },
  {
    id: "RPT-005",
    crimeType: "harassment",
    severity: "medium",
    location: "Athwa, Surat",
    coordinates: [21.1460, 72.8460],
    date: "2026-03-10",
    time: "20:45",
    description: "A group of men were catcalling and following women near Athwa Gate area. This has been happening repeatedly in the evening hours.",
    status: "pending",
    trustScore: 65,
    submittedAt: "2026-03-10T21:00:00",
    media: ["/placeholder-crime-7.jpg"],
    aiAnalysis: {
      exifCheck: { status: "pass", detail: "Data verified" },
      aiDetection: { status: "pass", detail: "Authentic" },
      imageTextConsistency: { score: 70, detail: "Moderate match" },
      imageQuality: { status: "warning", detail: "Low light conditions" },
    },
    timeline: [
      { status: "Submitted", date: "2026-03-10 21:00", completed: true },
      { status: "Under Review", date: "", completed: false },
    ],
  },
];

// Mock admin pending reports
export const MOCK_ADMIN_REPORTS = [
  ...MOCK_USER_REPORTS,
  {
    id: "RPT-006",
    crimeType: "burglary",
    severity: "high",
    location: "Rander, Surat",
    coordinates: [21.1720, 72.7890],
    date: "2026-03-14",
    time: "03:00",
    description: "Our house was broken into while we were away on vacation. Multiple valuables stolen including gold jewelry and cash.",
    status: "pending",
    trustScore: 45,
    submittedAt: "2026-03-14T10:00:00",
    userName: "Rajesh Patel",
    userAccountAge: "8 months",
    userPreviousReports: 3,
    userVerificationRate: 67,
    media: ["/placeholder-crime-8.jpg", "/placeholder-crime-9.jpg"],
    aiAnalysis: {
      exifCheck: { status: "warning", detail: "Time mismatch — photos taken 7 hours after reported time" },
      aiDetection: { status: "pass", detail: "No AI-generated content" },
      imageTextConsistency: { score: 55, detail: "Moderate consistency" },
      imageQuality: { status: "pass", detail: "Clear images" },
    },
    timeline: [
      { status: "Submitted", date: "2026-03-14 10:00", completed: true },
      { status: "Under Review", date: "", completed: false },
    ],
  },
  {
    id: "RPT-007",
    crimeType: "theft",
    severity: "low",
    location: "Pal, Surat",
    coordinates: [21.1950, 72.8290],
    date: "2026-03-14",
    time: "16:00",
    description: "Wallet stolen from jacket pocket in a crowded bus.",
    status: "pending",
    trustScore: 82,
    submittedAt: "2026-03-14T16:30:00",
    userName: "Priya Sharma",
    userAccountAge: "2 years",
    userPreviousReports: 12,
    userVerificationRate: 92,
    media: [],
    aiAnalysis: {
      exifCheck: { status: "pass", detail: "Consistent" },
      aiDetection: { status: "pass", detail: "Authentic" },
      imageTextConsistency: { score: 85, detail: "High consistency" },
      imageQuality: { status: "pass", detail: "Good quality" },
    },
    timeline: [
      { status: "Submitted", date: "2026-03-14 16:30", completed: true },
      { status: "Under Review", date: "", completed: false },
    ],
  },
];

// Mock route data
export const MOCK_ROUTES = {
  safest: {
    label: "Safest Route",
    color: "#3B82F6",
    distance: "5.8 km",
    time: "22 min",
    riskScore: 12,
    path: [
      [21.1702, 72.8311],
      [21.1730, 72.8280],
      [21.1780, 72.8220],
      [21.1820, 72.8180],
      [21.1850, 72.8140],
    ],
  },
  fastest: {
    label: "Fastest Route",
    color: "#EF4444",
    distance: "4.2 km",
    time: "14 min",
    riskScore: 58,
    path: [
      [21.1702, 72.8311],
      [21.1750, 72.8270],
      [21.1810, 72.8180],
      [21.1850, 72.8140],
    ],
  },
  balanced: {
    label: "Balanced Route",
    color: "#EAB308",
    distance: "4.9 km",
    time: "18 min",
    riskScore: 35,
    path: [
      [21.1702, 72.8311],
      [21.1720, 72.8290],
      [21.1770, 72.8230],
      [21.1800, 72.8190],
      [21.1850, 72.8140],
    ],
  },
};

// Admin dashboard chart data
export const CRIMES_BY_TYPE_DATA = [
  { name: "Theft", count: 145, fill: "hsl(235, 45%, 38%)" },
  { name: "Assault", count: 89, fill: "hsl(0, 70%, 58%)" },
  { name: "Robbery", count: 67, fill: "hsl(42, 90%, 55%)" },
  { name: "Vandalism", count: 54, fill: "hsl(340, 55%, 65%)" },
  { name: "Harassment", count: 78, fill: "hsl(12, 80%, 55%)" },
  { name: "Fraud", count: 42, fill: "hsl(155, 40%, 50%)" },
  { name: "Burglary", count: 33, fill: "hsl(280, 50%, 55%)" },
];

export const CRIMES_BY_AREA_DATA = [
  { name: "Varachha", count: 87 },
  { name: "Katargam", count: 72 },
  { name: "Udhna", count: 65 },
  { name: "Limbayat", count: 58 },
  { name: "Adajan", count: 42 },
  { name: "Athwa", count: 38 },
  { name: "Vesu", count: 28 },
  { name: "Pal", count: 22 },
];

export const HOURLY_CRIME_DATA = [
  { hour: "00", crimes: 12 },
  { hour: "01", crimes: 8 },
  { hour: "02", crimes: 15 },
  { hour: "03", crimes: 18 },
  { hour: "04", crimes: 10 },
  { hour: "05", crimes: 5 },
  { hour: "06", crimes: 3 },
  { hour: "07", crimes: 7 },
  { hour: "08", crimes: 14 },
  { hour: "09", crimes: 22 },
  { hour: "10", crimes: 19 },
  { hour: "11", crimes: 25 },
  { hour: "12", crimes: 30 },
  { hour: "13", crimes: 28 },
  { hour: "14", crimes: 32 },
  { hour: "15", crimes: 26 },
  { hour: "16", crimes: 24 },
  { hour: "17", crimes: 35 },
  { hour: "18", crimes: 42 },
  { hour: "19", crimes: 48 },
  { hour: "20", crimes: 52 },
  { hour: "21", crimes: 45 },
  { hour: "22", crimes: 38 },
  { hour: "23", crimes: 22 },
];

// Trust score color helper
export function getTrustScoreColor(score) {
  if (score <= 40) return "text-red-500 bg-red-500/15";
  if (score <= 70) return "text-yellow-500 bg-yellow-500/15";
  return "text-green-500 bg-green-500/15";
}

// Severity color helper
export function getSeverityColor(severity) {
  switch (severity) {
    case "low": return "text-green-500 bg-green-500/15 border-green-500/30";
    case "medium": return "text-yellow-500 bg-yellow-500/15 border-yellow-500/30";
    case "high": return "text-red-500 bg-red-500/15 border-red-500/30";
    default: return "text-muted-foreground bg-muted";
  }
}

// Status badge color helper
export function getStatusColor(status) {
  switch (status) {
    case "pending": return "bg-yellow-500/15 text-yellow-600 border-yellow-500/30";
    case "verified": return "bg-green-500/15 text-green-600 border-green-500/30";
    case "rejected": return "bg-red-500/15 text-red-600 border-red-500/30";
    default: return "bg-muted text-muted-foreground";
  }
}

// Marker color based on severity
export function getMarkerColor(severity) {
  switch (severity) {
    case "low": return "#22c55e";
    case "medium": return "#eab308";
    case "high": return "#ef4444";
    default: return "#6b7280";
  }
}
