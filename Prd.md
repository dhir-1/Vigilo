CrimeSafe AI - Product Requirements Document (PRD)

📄 Document Information
Project Name: Vigilo
Version: 1.0
Date: January 24, 2025
Author: Dhir agrawal
Project Type: College Major Project
Status: Planning Phase

1. EXECUTIVE SUMMARY
1.1 Overview
CrimeSafe AI is a comprehensive crime mapping and safety intelligence platform designed specifically for Surat, India. The platform combines interactive geospatial visualization, community-driven crime reporting, artificial intelligence-powered verification systems, and machine learning-based route optimization to create a holistic urban safety solution.

1.2 Problem Statement
Current Challenges:

Lack of Public Crime Awareness

Citizens have no easy way to know which areas of Surat are safe or dangerous
Crime data exists but is not accessible or visualized for public use
People unknowingly travel through high-crime areas


Inefficient Crime Reporting

Traditional police reporting is time-consuming and intimidating
No digital platform for citizen-led incident reporting
Evidence collection and submission is cumbersome


Route Planning Ignores Safety

Google Maps shows fastest routes but ignores crime risk
No way to plan travel routes that prioritize personal safety
Commuters, especially women, lack safety-aware navigation


Fake/Misleading Reports

Community reporting systems suffer from false information
Manual verification is resource-intensive for authorities
Lack of trust in crowdsourced crime data


Emergency Response Gaps

No quick way to alert authorities and contacts during emergencies
Location sharing during panic situations is difficult
Delayed response due to communication barriers



1.3 Solution
CrimeSafe AI addresses these challenges through:

Interactive Crime Maps: Real-time visualization of crime hotspots with color-coded danger zones
AI-Verified Reporting: Community-driven reporting with automated fake detection using machine learning
Smart Route Planning: ML-powered pathfinding that suggests safest routes, not just fastest
Emergency SOS System: One-tap emergency alerts with automatic location sharing
Time-Based Risk Intelligence: Dynamic safety scores that change based on time of day
Offline Capability: PWA architecture ensures access even without internet connection

1.4 Goals & Objectives
Primary Goals:

Increase Safety Awareness: Enable 10,000+ Surat citizens to make informed safety decisions
Reduce Crime Exposure: Help users avoid high-risk areas through intelligent route planning
Empower Community Reporting: Create verified, crowdsourced crime database with 80%+ accuracy
Improve Emergency Response: Reduce emergency alert time from minutes to seconds

Success Metrics:

1,000+ active users within 6 months of launch
500+ verified crime reports in database
90%+ user satisfaction with route safety recommendations
95%+ AI verification accuracy rate
Sub-5-second SOS alert delivery time

1.5 Target Audience
Primary Users:

Surat Residents (Age 18-45)

Daily commuters concerned about route safety
Women traveling alone
Parents worried about children's safety
New residents unfamiliar with city areas


Tourists & Visitors

Out-of-town visitors needing safety guidance
Students relocating to Surat
Business travelers



Secondary Users:

City Administrators

Municipal corporation officials
Urban planning departments
Public safety coordinators


Law Enforcement

Police departments
Crime analysis units
Community policing initiatives



Platform Administrators:

System Admins

Report verification team
Data quality managers
Platform moderators




2. PRODUCT SCOPE
2.1 In-Scope Features
Core Features (Must Have - Prototype):
✅ Interactive crime map with OpenStreetMap integration
✅ Heat map visualization (blue to red gradient)
✅ Crime data filtering (type, date, severity, time)
✅ Click-anywhere safety score calculation
✅ User authentication (registration, login, JWT)
✅ Crime report submission with media upload
✅ AI-powered fake detection (HuggingFace models)
✅ Admin verification dashboard
✅ Basic route planning (safest vs fastest)
Enhanced Features (Should Have - Full Version):
✅ SOS panic button with emergency alerts
✅ Time-based risk prediction (24-hour analysis)
✅ Advanced route planning (3 options: safest/fastest/balanced)
✅ XGBoost ML model for crime risk prediction
✅ Modified A* pathfinding algorithm
✅ Progressive Web App (PWA) with offline mode
✅ Image analysis (EXIF metadata, AI detection)
✅ Report export (PDF, CSV)
✅ Police escalation system (automated emails)
✅ User report history and tracking
✅ Admin analytics dashboard
✅ Mobile-responsive design
Nice-to-Have Features (Could Have - Future Enhancements):
⭕ Dark mode UI
⭕ Multilingual support (English + Gujarati)
⭕ Push notifications
⭕ Social sharing of safe routes
⭕ Community safety tips section
⭕ Integration with Surat Police official data
⭕ Native mobile apps (iOS/Android)
⭕ Live crime alerts
⭕ Neighborhood watch groups
⭕ Safety ratings for businesses/locations
2.2 Out-of-Scope Features
Explicitly NOT Included (To Prevent Scope Creep):
❌ Real-time live location tracking of users
❌ In-app messaging/chat between users
❌ Payment/monetization features
❌ Blockchain/cryptocurrency integration
❌ Facial recognition technology
❌ Integration with home security systems
❌ Ride-sharing/transport booking
❌ E-commerce features
❌ Video streaming of live incidents
❌ AI-powered CCTV analysis
2.3 Assumptions & Constraints
Assumptions:

Users have smartphones with GPS capability
Internet connectivity is available for most features (offline mode for basic functions)
Users will report crime incidents honestly
Surat has sufficient existing crime data to train ML models
Free-tier cloud services will handle initial user load (up to 5,000 users)

Constraints:

Budget: ₹0 (100% free tools and services)
Time: 12-16 weeks for full development
Team: Solo developer (college project)
Technology: Limited to free-tier APIs and open-source libraries
Data: No access to official police crime databases initially (use synthetic + crowdsourced data)
Legal: No authority to enforce or guarantee safety; platform is informational only


3. FUNCTIONAL REQUIREMENTS
3.1 User Authentication & Management
FR-1.1: User Registration

Users can create accounts with email and password
Password must be minimum 8 characters with at least one number
Email verification required before account activation
Optional: Phone number and emergency contacts
System generates unique user ID (UUID)

FR-1.2: User Login

Users log in with email/password credentials
JWT token generated with 24-hour expiry
"Remember Me" option extends session to 7 days
Failed login attempts locked after 5 tries (15-minute cooldown)

FR-1.3: Password Recovery

"Forgot Password" flow with email-based reset link
Reset link valid for 1 hour
Old password invalidated after successful reset

FR-1.4: Profile Management

Users can view/edit: name, phone, emergency contacts, saved locations
Profile photo upload (max 2MB, JPG/PNG only)
Account statistics: reports submitted, verification rate, trust score

FR-1.5: Role-Based Access Control

Two roles: "User" and "Admin"
Users can: view map, submit reports, plan routes, use SOS
Admins can: all user features + verify reports + manage users + view analytics


3.2 Interactive Crime Mapping
FR-2.1: Base Map Display

Display OpenStreetMap centered on Surat (21.1702°N, 72.8311°E)
Default zoom level: 12 (city-wide view)
Zoom range: 10 (full city) to 18 (street level)
Pan, zoom, and rotate controls enabled
Mobile touch gestures supported (pinch, swipe)

FR-2.2: Crime Markers

Each verified crime displayed as colored circle marker
Color coding: Green (Low severity), Yellow (Medium), Red (High)
Marker size: 8px radius at zoom level 12
Marker clustering when zoomed out (groups nearby crimes)
Click marker to show popup with: crime type, date, severity, area

FR-2.3: Heat Map Layer

Smooth color gradient overlay showing crime density
Color scale: Blue/Transparent → Green → Yellow → Orange → Red
Gradient based on crime count and severity within radius
Configuration: 25px radius, 15px blur, 0.4 min opacity
Toggle heat map on/off with button
Heat map updates in real-time when filters applied

FR-2.4: Crime Filtering

Filter by crime type: All, Theft, Assault, Robbery, Vandalism, Burglary, Other
Filter by date range: All time, Last 7 days, Last 30 days, Last 6 months, Custom range
Filter by severity: All, Low, Medium, High
Filter by time of day: All day, Morning (6AM-12PM), Afternoon (12PM-6PM), Evening (6PM-12AM), Night (12AM-6AM)
Filters apply immediately without page reload
Filter state persists during session

FR-2.5: Click-Anywhere Safety Score

User clicks any point on map
System captures latitude/longitude
Backend calculates crimes within 1km radius
Safety score (0-100) computed based on:

Crime count (40% weight)
Average severity (30% weight)
Recency of crimes (20% weight)
Distance to nearest police station (10% weight)


Popup displays:

Safety Score with color (Green/Yellow/Red)
Crime count in area
Nearest crime type and distance
Risk level description


Score updates based on current time (time-based multiplier applied)


3.3 Crime Report Submission
FR-3.1: Report Form

Required fields: Crime type, Severity, Date/Time, Location, Description
Optional fields: Photos (max 3), Video (max 1)
Crime type dropdown: Theft, Assault, Robbery, Vandalism, Burglary, Other
Severity radio buttons: Low, Medium, High
Date/time picker (cannot be future date)
Description text area (max 500 characters)

FR-3.2: Location Capture

Three methods to set location:

Auto-detect current GPS location (if permission granted)
Click on interactive map to pin location
Type address and geocode to coordinates


Location displayed on mini-map preview
Coordinates validated to be within Surat bounds

FR-3.3: Media Upload

Photos: JPG/PNG, max 10MB each, max 3 photos
Video: MP4/MOV, max 50MB, max 1 video
Client-side validation before upload
Upload to Cloudinary via API
Progress bar shown during upload
Thumbnail preview after upload
Option to remove uploaded media before submission

FR-3.4: Report Submission

"Submit Report" button validates all required fields
Loading indicator shown during submission
Backend receives:

All form data
User ID (from JWT token)
Media URLs (from Cloudinary)
Timestamp of submission


Report ID generated (format: CR##### )
Initial status: "Pending"

FR-3.5: AI Verification (Backend)

Automatic processing upon submission:

EXIF Metadata Extraction:

Extract GPS coordinates from photos
Extract timestamp from photos
Verify GPS matches reported location (within 500m tolerance)
Verify timestamp is recent (within 48 hours of report time)


AI-Generated Image Detection:

Run HuggingFace model to detect synthetic images
Calculate AI probability score (0-1)
Flag if score > 0.5


Image-Text Consistency (CLIP):

Embed image and description separately
Calculate cosine similarity
Flag if similarity < 0.6


Image Quality Analysis:

Check resolution (flag if < 640px width)
Detect heavy editing/filters




Trust Score Calculation:

  Trust Score = (EXIF_check * 30) + (AI_detection * 30) + 
                (CLIP_similarity * 25) + (Quality_score * 15)

Trust score saved with report
Reports with score < 50 flagged for detailed admin review

FR-3.6: Submission Confirmation

Success page/modal shown with:

Report ID
Trust score
Current status ("Pending Review")
Estimated review time (24-48 hours)


Email confirmation sent to user
Option to view report details or submit another


3.4 Route Planning
FR-4.1: Route Input

Start location input:

Auto-detect current location (button)
Type/search address (autocomplete suggestions)
Click on map
Select from saved locations


Destination input:

Type/search address (autocomplete suggestions)
Click on map
Select from saved locations


Optional: Travel time (Now / Schedule for specific time)

FR-4.2: Address Geocoding

Use Nominatim API (OpenStreetMap) for address → coordinates conversion
Show autocomplete suggestions while typing
Validate addresses are within Surat
Display selected locations on map with markers

FR-4.3: Route Calculation (Backend)

Download road network using OSMnx for area covering start and end points
For each road segment, query XGBoost model to get crime risk score
Risk score based on:

Historical crime density along segment
Time of day (if scheduled route)
Crime severity in area
Recent crime trends


Run Modified A* algorithm three times with different cost functions:

Route 1 - Safest:
Edge cost = (distance * 0.1) + (risk_score * 0.9)
Prioritizes crime avoidance over distance
Route 2 - Fastest:
Edge cost = (distance * 0.9) + (risk_score * 0.1)
Traditional shortest path with minimal safety consideration
Route 3 - Balanced:
Edge cost = (distance * 0.5) + (risk_score * 0.5)
Equal weight to distance and safety
FR-4.4: Route Display

All three routes displayed on map simultaneously:

Safest: Blue line
Fastest: Red line
Balanced: Yellow line


Each route color-coded by segment risk:

Green segments (low risk)
Yellow segments (moderate risk)
Red segments (high risk)


Route cards show:

Total distance (km)
Estimated time (minutes)
Average risk score (0-100)
Number of high-risk segments
Route type icon



FR-4.5: Route Selection

User clicks "Select Route" on any option
Selected route highlighted, others faded
Turn-by-turn directions panel appears (optional enhancement)
"Start Navigation" button opens in Google Maps / Apple Maps
"Share Route" option to send via WhatsApp/Email

FR-4.6: Route Caching

Popular routes (same start/end within 500m) cached in database
Cache valid for 24 hours
Cache invalidated when new crimes reported along route
Cached routes return in < 2 seconds
New routes take 10-20 seconds to calculate


3.5 SOS Emergency System
FR-5.1: SOS Button

Large red button always visible in bottom-right corner
Button size: 60px diameter (mobile), 80px (desktop)
Pulsing animation to draw attention
Label: "🆘 EMERGENCY"

FR-5.2: SOS Activation

User presses button
Confirmation modal appears: "Are you in an emergency?"
Two options: "YES - SEND ALERT" (red) or "Cancel" (gray)
If YES pressed:

Attempt to capture current GPS location
If GPS denied, show map to click location
If user doesn't interact within 10 seconds, proceed with last known location



FR-5.3: Emergency Alert Dispatch

Simultaneously send alerts via multiple channels:

Email Alerts:

Sent to user's pre-registered emergency contacts (max 3)
Subject: "🚨 EMERGENCY ALERT from [User Name]"
Body includes:

User name and phone number
Current location (address + map link)
Timestamp
Google Maps link to location
Message: "This person pressed emergency SOS button"



SMS Alerts (if configured):

Sent to same emergency contacts
Message: "[User Name] needs help! Location: [Address]. Time: [Timestamp]. Map: [Link]"

Admin Dashboard Alert:

High-priority notification in admin panel
Marked with red flag and urgent tag
Includes all user details and location

Optional - Police Integration:

If enabled, send email to nearest police station
Include PDF report with user info, location, map screenshot

FR-5.4: Evidence Recording (Optional)

After alert sent, prompt user: "Record evidence?"
Options: "Record Audio (30s)" or "Record Video (30s)" or "Skip"
If selected, use device camera/microphone
Recording auto-stops after 30 seconds
Upload to Cloudinary
Link included in follow-up emails

FR-5.5: SOS Report Creation

Automatically create incident report with:

Type: "Emergency SOS"
Severity: High
Location: Captured GPS coordinates
Description: "User activated emergency SOS"
Media: Any recorded audio/video
Status: "Verified" (bypass normal verification)
Flag: is_sos = true


Report appears at top of admin verification queue

FR-5.6: Post-SOS Support

Show confirmation: "Emergency alerts sent to [X] contacts"
Display "I'm Safe Now" button

If pressed, send follow-up emails: "User reports they are safe"


Show nearby police stations on map
Show quick dial buttons for police (100), ambulance (108)


3.6 Time-Based Risk Prediction
FR-6.1: Hourly Crime Analysis

Backend analyzes crime database to calculate crime frequency per hour (0-23)
For each hour, count total verified crimes that occurred during that hour
Calculate average crimes per hour (baseline)
Compute risk multiplier for each hour:

  Multiplier[hour] = Crimes[hour] / Average_Crimes_Per_Hour

Store hourly multipliers in database, update daily

FR-6.2: Time Slider UI

Horizontal slider with 24 tick marks (0-23 hours)
Current hour highlighted by default
Color bar above slider showing risk level per hour:

Green (multiplier < 0.7)
Yellow (0.7 - 1.3)
Red (> 1.3)


Label shows selected hour: "Risk at 3 AM" or "Risk Now"

FR-6.3: Dynamic Safety Score Adjustment

When time slider moved or "Risk Now" button clicked:

Recalculate all safety scores on map with time multiplier
Adjust heat map intensity based on hourly multiplier
Update all displayed scores in real-time


Formula:

  Adjusted_Score = Base_Safety_Score / Time_Multiplier

Display message: "This area is 45% more dangerous at night" or "30% safer during daytime"

FR-6.4: Contextual Warnings

If user planning route for nighttime (8PM-6AM):

Show warning banner: "⚠️ Travel during high-risk hours"
Suggest alternative daytime hours if possible


If safety score drops below 40 during selected time:

Alert: "🔴 Danger Zone at this time - avoid if possible"



FR-6.5: Animated Heat Map (Optional)

"Play" button to animate heat map through 24-hour cycle
Auto-cycle through each hour showing changes
Speed: 2 seconds per hour
Shows visual pattern of how danger zones shift throughout day


3.7 Admin Report Verification
FR-7.1: Admin Dashboard

Overview showing:

Pending reports count
SOS alerts count (last 24 hours)
Total verified/rejected today
High-priority items (low trust score < 50)


Quick stats cards with trends (up/down arrows)
Recent activity feed

FR-7.2: Verification Queue

Tabular/card view of all pending reports
Sortable by: Trust score (default: lowest first), Date (newest first), Severity
Filterable by: All, SOS only, Low trust only (< 50), High trust (> 80)
Each report card shows:

Report ID, User name, Crime type, Severity
Location, Date/time, Trust score (color-coded)
Thumbnail preview of media
"Review" button



FR-7.3: Detailed Report Review

Full-screen review interface with sections:

User Information:

Name, email, phone, account age
Previous report count, verification rate
User trust rating (average of all reports)
Red flags if any (new account, multiple rejections)

Report Details:

All submitted data displayed
Location shown on map (zoomable)
Full description text
Date/time with timezone

Evidence Review:

Full-size media viewer
Photo gallery (swipe through multiple photos)
Video player with controls
Download original files button

AI Analysis Results:

Trust score prominently displayed with breakdown:

EXIF Check: ✅ Passed / ❌ Failed (with details)
AI Detection: ✅ Passed / ⚠️ Warning / ❌ Failed
Image-Text Consistency: Score and verdict
Image Quality: Resolution, editing flags


Detailed report explaining each check

FR-7.4: Admin Decision Making

Three action buttons:

Approve & Verify (green button)

Mark status as "Verified"
Add to crime database for map display
Update heat map and risk scores
Send confirmation email to user
Option to escalate to police immediately


Reject Report (red button)

Mark status as "Rejected"
Require reason selection: Low trust score, False information, Spam, Duplicate, Other
Optional: Custom admin notes
Send rejection email to user with reason
Flag user account if multiple rejections


Request More Information (yellow button)

Mark status as "Info Requested"
Send email to user asking for additional evidence
Report stays in pending queue
48-hour deadline for user response





Admin Notes Field:

Text area for internal comments
Notes visible only to admins
Timestamp and admin name logged

FR-7.5: Police Escalation

If report approved, checkbox: "Send to police"
If checked:

Generate PDF report with:

All report details formatted professionally
Embedded photos/video links
Location map screenshot
User contact information
Timestamp and report ID


Send automated email to police email address(es)
Subject: "Verified Crime Report - [Crime Type] at [Location]"
Attach PDF
Log escalation in database with timestamp
Update report status to "Escalated"
Send confirmation to user: "Your report has been forwarded to authorities"



FR-7.6: Bulk Actions (Optional)

Select multiple reports with checkboxes
Bulk approve all (for high-trust reports)
Bulk reject with same reason
Export selected reports to CSV


3.8 User Report Management
FR-8.1: My Reports List

Display all reports submitted by logged-in user
Card/list view with:

Report ID (clickable)
Crime type icon and label
Location (area name)
Date submitted
Status badge (Pending / Verified / Rejected / Info Requested)
Trust score


Sort by: Date (newest first - default), Status, Trust score
Filter by status: All, Pending, Verified, Rejected

FR-8.2: Report Detail View

Full details of selected report
All submitted information displayed
Media gallery
AI analysis results (what user sees):

Overall trust score
Basic explanation: "Your report scored well on verification checks" or "Some concerns were flagged"
Specific failures if rejected


Status timeline:

Submitted: [Date/Time]
Under Review: [Date/Time]
Verified/Rejected: [Date/Time]
Escalated (if applicable): [Date/Time]


Admin notes (if any shared with user)

FR-8.3: Report Actions

Download PDF button (generates formatted PDF of report)
Share button (copy link, share via email)
If rejected: "Appeal" button

Opens form to explain why report is legitimate
Admin reviews appeal


If info requested: "Submit Additional Info" button

Upload more photos
Add more details to description




3.9 User Profile & Settings
FR-9.1: Profile Page

View/edit personal information:

Full name (editable)
Email (display only, cannot change)
Phone number (editable)
Profile photo upload


Emergency contacts management:

Add up to 3 contacts (name, phone, email)
Edit/remove existing contacts
Mark primary contact


Saved locations:

Add locations with labels (Home, Office, etc.)
Edit/delete saved locations
Quick-select from dropdown in route planner


Account statistics (read-only):

Member since date
Total reports submitted
Verification rate percentage
Average trust score
Community rank badge (Trusted User, Contributor, etc.)



FR-9.2: Settings Page
General Settings:

Dark mode toggle (ON/OFF)
Language selection: English, ગુજરાતી (Gujarati)
Default map view: Heat map, Markers, Both

Map Preferences:

Auto-detect location on app open (toggle)
Show crime markers by default (toggle)
Heat map opacity slider (0-100%)
Default zoom level (dropdown)

Privacy Settings:

Location sharing: None, Emergency contacts only, Public
Profile visibility: Private, Public
Report history visibility: Private (default), Public

Notification Settings:

Email notifications (toggle)
SMS notifications (toggle)
New crimes near saved locations (toggle)
Report status updates (toggle)
Weekly safety digest (toggle)

Account Management:

Change password
Manage emergency contacts (link to profile)
Export my data (GDPR compliance - downloads JSON file)
Delete account (with confirmation warning)

About:

App version number
Privacy policy link
Terms of service link
Contact support button
Give feedback form link


3.10 Progressive Web App (PWA) & Offline Mode
FR-10.1: PWA Installation

Service worker registered on first visit
"Add to Home Screen" prompt shown (mobile)
App icon, splash screen configured
Works as standalone app when installed

FR-10.2: Offline Map Caching

Download map tiles for user-selected area
Settings page: "Download Offline Maps" section
Select area (draw rectangle on map)
Max area: 10km x 10km
Download size estimate shown before download
Tiles cached locally (browser storage)
Offline maps valid for 7 days, then refresh

FR-10.3: Offline Crime Data

Last synced crime data (up to 500 points) cached locally
Shows "(Offline - Last updated: [time])" banner
Crime markers and heat map functional offline
Safety scores calculated from cached data

FR-10.4: Offline Report Queue

If user submits report while offline:

Save report to browser local storage queue
Show "Report queued - will upload when online" message
Badge on navigation shows pending queue count


When connection restored:

Auto-upload queued reports in background
Show success notification
Clear from queue



FR-10.5: Background Sync

Service worker monitors network status
When online:

Fetch latest crime data
Upload queued reports
Sync profile changes
Update cached map tiles if needed


Low-data mode option: sync only on WiFi


3.11 Image Analysis & Enhancement
FR-11.1: EXIF Metadata Extraction

Backend extracts from uploaded photos:

GPS coordinates (latitude, longitude)
Timestamp (date and time photo was taken)
Camera make/model
Image dimensions
Software used (indicates editing)


Validation:

If GPS exists, compare with reported location
Tolerance: ±500 meters acceptable
If mismatch: Flag and reduce trust score by 30 points
If timestamp > 7 days old: Flag as "old evidence"



FR-11.2: AI-Generated Image Detection

Use HuggingFace model (e.g., "umm-maybe/AI-image-detector")
Input: Image file
Output: Probability score (0-1) that image is AI-generated
Interpretation:

0.0-0.3: Likely real photo (✅ Passed)
0.3-0.6: Uncertain (⚠️ Warning)
0.6-1.0: Likely AI-generated (❌ Failed)


If score > 0.5: Flag report, reduce trust score by 30 points

FR-11.3: Image-Text Consistency (CLIP)

Use OpenAI CLIP model from HuggingFace
Embed uploaded image
Embed report description text
Calculate cosine similarity between embeddings
Interpretation:

Similarity > 0.7: Good match (✅ Passed)
0.5-0.7: Moderate match (⚠️ Warning)
< 0.5: Poor match (❌ Failed)


If < 0.6: Flag, reduce trust score by 25 points

FR-11.4: Image Quality Checks

Resolution check:

If width < 640px or height < 480px: Low quality flag
Reduce trust score by 10 points


Editing detection:

Check EXIF for Photoshop, GIMP, editing software
If detected: Flag as "edited image"
Reduce trust score by 15 points


Duplicate check
ContinueJan 24(optional):

Reverse image search using TinEye API
If found online (stock photo): Major red flag
Reduce trust score by 50 points

FR-11.5: Face Blurring (Privacy)

Use face-api.js or similar library
Detect faces in uploaded images
Automatically blur detected faces (Gaussian blur)
User option to disable (if reporting suspect)
Protects victim/bystander privacy


3.12 Export & Reporting
FR-12.1: User Report Export (PDF)

"Download PDF" button on report detail page
Generate formatted PDF with:

Header: "CrimeSafe AI - Crime Report"
Report ID, Date, User name
All report details (crime type, location, description)
Embedded photos (resized to fit)
Map screenshot of location
Trust score and status
Footer: Timestamp, "Generated by CrimeSafe AI"


Use jsPDF library for generation
Download as: "CrimeSafe_Report_[ID].pdf"

FR-12.2: User Report History Export (CSV)

"Export My Reports" button on My Reports page
Generate CSV file with columns:

Report ID, Date Submitted, Crime Type, Severity
Location (Lat, Lon, Area Name)
Status, Trust Score, Description


Download as: "My_Reports_[Date].csv"

FR-12.3: Admin Analytics Export (Excel)

"Export Data" button on admin analytics page
Generate Excel file with multiple sheets:

Sheet 1: Crime Summary (by type, severity, area)
Sheet 2: Time Analysis (crimes by hour, day, month)
Sheet 3: User Stats (reports per user, verification rates)
Sheet 4: Geographic Data (crimes by coordinates)


Use SheetJS library
Download as: "CrimeSafe_Analytics_[DateRange].xlsx"

FR-12.4: Police Report PDF

Auto-generated when admin escalates report
Professional format:

Official header with logo
Report metadata (ID, timestamp, severity)
Detailed incident description
Witness information (reporter details)
Evidence section with photo gallery
Location map with address
Signature section


Email as attachment to police


3.13 Performance Optimization
FR-13.1: Map Marker Clustering

When zoomed out (zoom level < 13):

Group nearby markers (within 50px radius)
Display cluster icon with count
Click cluster to zoom in and separate


Prevents rendering 1000+ individual markers
Use Leaflet.markercluster plugin

FR-13.2: Lazy Loading

Crime data loaded in batches:

Initial load: crimes in current map viewport only
As user pans: load nearby crimes
Max visible crimes: 500 at a time


Images loaded on-demand:

Placeholder thumbnail initially
Full image loads when user clicks/hovers
Use Intersection Observer API



FR-13.3: Route Caching

Frequently requested routes cached:

Hash start+end coordinates
Store calculated route in database
Cache valid for 24 hours
Invalidate if new crimes reported on route


Cache hit: return in < 2 seconds
Cache miss: calculate new route (10-20 seconds)

FR-13.4: Database Query Optimization

PostGIS spatial indexes on location columns (GIST index)
Compound indexes on frequently queried combinations:

(date, crime_type)
(status, trust_score)
(user_id, created_at)


Query only necessary columns (SELECT specific fields, not *)
Pagination for large result sets (50 items per page)

FR-13.5: Image Optimization

Cloudinary automatic optimizations:

Convert to WebP format (smaller file size)
Responsive images (serve size based on device)
Lazy loading with blur-up placeholder


Thumbnail generation:

150x150px for gallery views
800x600px for detail views
Original for download only



FR-13.6: Code Splitting (Frontend)

React lazy loading for routes:

Main map page loads first (critical)
Route planner, report form loaded on-demand
Admin pages loaded only if user is admin


Reduces initial bundle size by 60%

FR-13.7: CDN Usage

Static assets served via CDN:

Vercel/Netlify CDN for frontend files
Cloudinary CDN for images/videos
Map tiles from OpenStreetMap CDN


Reduces latency for global users


4. NON-FUNCTIONAL REQUIREMENTS
4.1 Performance
NFR-1.1: Page Load Time

Landing page: < 2 seconds on 3G connection
Main map page: < 3 seconds initial load
Route calculation: < 15 seconds for new routes, < 2 seconds for cached
Report submission: < 5 seconds (excluding media upload)

NFR-1.2: Map Responsiveness

Pan/zoom interactions: < 100ms response time
Smooth 60fps animation when zooming
Heat map updates: < 1 second after filter change
No lag when rendering up to 500 markers

NFR-1.3: Scalability

Support 5,000 concurrent users on free tier hosting
Handle 10,000 crimes in database without performance degradation
Process 100 report submissions per day
Admin panel handles 50 pending reports without slowdown

4.2 Security
NFR-2.1: Authentication

Passwords hashed with bcrypt (minimum 12 rounds)
JWT tokens with 24-hour expiry
HTTPS-only (redirect all HTTP to HTTPS)
Secure session management (httpOnly cookies)

NFR-2.2: Data Protection

User PII encrypted at rest (Supabase AES-256)
Database connections over SSL/TLS only
API endpoints require authentication (except public map view)
Rate limiting: 100 requests/hour per IP for public endpoints

NFR-2.3: Input Validation

All user inputs validated on both client and server
SQL injection prevention (parameterized queries)
XSS protection (sanitize user-generated content)
CSRF tokens for state-changing operations

NFR-2.4: Privacy

User email/phone never exposed publicly
Location data blurred to 100m radius for public display
Reporter identity hidden from map (only admins see)
GDPR-compliant data export and deletion

4.3 Availability
NFR-3.1: Uptime

Target: 99% uptime (allows ~7 hours downtime/month)
Free tier limitations accepted (Render.com sleeps after 15min inactivity)
PWA offline mode ensures basic functionality during outages

NFR-3.2: Error Handling

Graceful degradation: if maps fail, show list view
User-friendly error messages (not technical jargon)
Automatic retry for failed API calls (max 3 attempts)
Error logging to console for debugging

4.4 Usability
NFR-4.1: Accessibility

WCAG 2.1 Level AA compliance
Keyboard navigation supported
Screen reader compatible (ARIA labels)
High contrast mode available
Text scalable to 200% without breaking layout

NFR-4.2: Mobile Responsiveness

Works on devices 320px width and up
Touch-friendly (minimum tap target size: 44x44px)
No horizontal scrolling
Optimized for iOS Safari and Chrome Android

NFR-4.3: Browser Compatibility

Supports last 2 versions of Chrome, Firefox, Safari, Edge
Graceful degradation for older browsers (no complete failure)
IE11 not supported (polyfill if required)

NFR-4.4: Learnability

New users can submit first report within 5 minutes
Tooltips and help text for complex features
Onboarding tour for first-time users (optional)
Consistent UI patterns across pages

4.5 Maintainability
NFR-5.1: Code Quality

Modular component architecture (React)
Consistent code style (Prettier/ESLint)
Comprehensive comments for complex logic
Meaningful variable/function names

NFR-5.2: Documentation

README with setup instructions
API endpoint documentation
Database schema diagram
User manual (this PRD serves as foundation)

NFR-5.3: Monitoring

Error tracking (console logging minimum, Sentry optional)
Performance monitoring (Lighthouse scores)
User analytics (basic usage stats)

4.6 Legal & Compliance
NFR-6.1: Disclaimers

Platform is informational only, not legal advice
No guarantee of safety or accuracy
Users responsible for their own safety decisions
Not liable for incidents occurring despite use of app

NFR-6.2: Terms of Service

Users agree to honest reporting
False reports may result in account suspension
Platform can moderate/remove content
User data handling explained in Privacy Policy

NFR-6.3: Copyright

User-uploaded content: users retain ownership
Users grant platform license to display content
OpenStreetMap attribution displayed
Third-party library licenses respected


5. TECHNICAL ARCHITECTURE
5.1 System Architecture Diagram
┌─────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Browser    │  │ Mobile Web   │  │   PWA App    │      │
│  │ (Desktop)    │  │   (Phone)    │  │  (Installed) │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
│         └──────────────────┴──────────────────┘              │
│                           │                                  │
│                    React Frontend                            │
│              (Vercel/Netlify CDN)                           │
└───────────────────────────┬─────────────────────────────────┘
                            │ HTTPS
                            │
┌───────────────────────────┴─────────────────────────────────┐
│                      API GATEWAY LAYER                       │
│                                                              │
│                  FastAPI Backend Server                      │
│                (Render.com Free Tier)                        │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │     Auth     │  │    Crime     │  │    Route     │     │
│  │  Endpoints   │  │  Endpoints   │  │  Endpoints   │     │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘     │
└─────────┼──────────────────┼──────────────────┼─────────────┘
          │                  │                  │
          │         ┌────────┴────────┐        │
          │         │                 │        │
┌─────────┴─────┐  │  ┌──────────────┴────────┴──────┐
│               │  │  │                               │
│   PostgreSQL  │  │  │      Machine Learning         │
│   + PostGIS   │  │  │         Services              │
│   (Supabase)  │  │  │                               │
│               │  │  │  ┌─────────────────────────┐  │
│  ┌─────────┐  │  │  │  │    XGBoost Model       │  │
│  │ Users   │  │  │  │  │  (Crime Prediction)    │  │
│  │ Reports │  │  │  │  └─────────────────────────┘  │
│  │ Crimes  │  │  │  │                               │
│  │ Routes  │  │  │  │  ┌─────────────────────────┐  │
│  │ Scores  │  │  │  │  │  HuggingFace APIs      │  │
│  └─────────┘  │  │  │  │  (Fake Detection)      │  │
│               │  │  │  └─────────────────────────┘  │
└───────────────┘  │  │                               │
                   │  │  ┌─────────────────────────┐  │
                   │  │  │    OSMnx + NetworkX    │  │
                   │  │  │   (Route Planning)     │  │
                   │  │  └─────────────────────────┘  │
                   │  │                               │
                   │  └───────────────────────────────┘
                   │
┌──────────────────┴──────────────────────────────────────────┐
│                  EXTERNAL SERVICES LAYER                     │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │  Cloudinary  │  │ OpenStreetMap│  │  Nominatim   │     │
│  │   (Images)   │  │  (Map Tiles) │  │  (Geocoding) │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐                        │
│  │ Resend/Brevo │  │ HuggingFace  │                        │
│  │   (Emails)   │  │   (AI APIs)  │                        │
│  └──────────────┘  └──────────────┘                        │
└─────────────────────────────────────────────────────────────┘
5.2 Technology Stack Details
Frontend:

React 18.x - UI framework
Tailwind CSS 3.x - Styling
Leaflet 1.9.x - Mapping library
Leaflet.heat - Heat map plugin
Leaflet.markercluster - Marker clustering
Recharts - Data visualization
i18next - Internationalization
Workbox - Service worker/PWA

Backend:

Python 3.10+
FastAPI 0.100+ - Web framework
Uvicorn - ASGI server
Pydantic - Data validation
SQLAlchemy - ORM
Alembic - Migrations
PyJWT - Token generation
Bcrypt - Password hashing
Python-Multipart - File uploads

Database:

PostgreSQL 14+
PostGIS 3.x - Geospatial extension
Supabase - Cloud hosting

Machine Learning:

XGBoost 1.7+ - Crime prediction
Scikit-learn - Model training/evaluation
HuggingFace Transformers - Pre-trained models
Pillow (PIL) - Image processing
ExifRead - EXIF extraction
OSMnx - Road network analysis
NetworkX - Graph algorithms

External APIs:

Cloudinary - Media storage
Nominatim - Geocoding
OpenStreetMap - Map tiles
HuggingFace Inference API - AI models
Resend/Brevo - Email delivery

DevOps:

Git/GitHub - Version control
Vercel/Netlify - Frontend hosting
Render.com - Backend hosting
GitHub Actions - CI/CD (optional)


6. USER STORIES & USE CASES
6.1 User Personas
Persona 1: Priya Shah (Daily Commuter)

Age: 28, Female
Occupation: Software Engineer
Location: Vesu, Surat
Commutes to Adajan office daily
Concerns: Safety during late-night work, unsafe routes
Tech-savvy, uses smartphone extensively
Goals: Find safest route home after 9 PM, avoid high-crime areas

Persona 2: Rajesh Patel (Concerned Parent)

Age: 45, Male
Occupation: Small business owner
Location: Adajan, Surat
Has teenage daughter who travels for tuition
Concerns: Daughter's safety in unfamiliar areas
Moderate tech skills
Goals: Monitor crime trends near daughter's routes, get alerts

Persona 3: Meera Desai (New Resident)

Age: 22, Female
Occupation: College student (recently moved from Mumbai)
Location: Athwa, Surat
Unfamiliar with Surat geography
Concerns: Which areas to avoid, where it's safe to live
Active on social media, trusts crowdsourced info
Goals: Learn about neighborhood safety before choosing PG

Persona 4: Admin - Karan Mehta (Platform Moderator)

Age: 32, Male
Role: CrimeSafe AI Administrator
Background: Social work, community safety advocacy
Responsibilities: Verify reports, maintain data quality
Goals: Ensure accurate crime data, coordinate with police

6.2 Key User Stories
Epic 1: Safety Awareness
US-1.1: As a commuter, I want to see crime hotspots on a map, so that I can avoid dangerous areas.

Acceptance Criteria:

Map displays color-coded heat zones (green/yellow/red)
Clicking any location shows safety score (0-100)
Filter crimes by type and date range
Heat map updates in real-time based on filters



US-1.2: As a parent, I want to check safety scores for specific locations, so that I can advise my children on safe routes.

Acceptance Criteria:

Click anywhere on map to get instant safety score
Score breakdown shows: crime count, severity, recency
Can search by address to check specific places
Results shareable via WhatsApp/email



US-1.3: As a new resident, I want to see crime trends over time, so that I can understand long-term safety patterns.

Acceptance Criteria:

Time slider shows risk changes throughout day
Charts display crime trends (daily/weekly/monthly)
Compare different neighborhoods side-by-side
Historical data available for last 6 months




Epic 2: Safe Navigation
US-2.1: As a woman traveling alone at night, I want route suggestions that prioritize safety over speed, so that I feel secure.

Acceptance Criteria:

Three route options: Safest, Fastest, Balanced
Safest route avoids high-crime areas even if longer
Each route shows risk score and color-coded segments
Can schedule route for specific time (e.g., 10 PM)



US-2.2: As a daily commuter, I want to compare routes based on both time and safety, so that I can make informed choices.

Acceptance Criteria:

Side-by-side comparison of all three routes
Clear metrics: distance, time, risk score
Visual map showing all routes simultaneously
Can save preferred routes for future use



US-2.3: As a user without GPS, I want to manually enter locations, so that I can still plan safe routes.

Acceptance Criteria:

Type start/end addresses with autocomplete
Click map to set locations
Select from saved locations (Home, Office)
Works without requiring GPS permission




Epic 3: Community Reporting
US-3.1: As a crime witness, I want to report incidents easily with photo evidence, so that others can be warned.

Acceptance Criteria:

Simple form with crime type, severity, description
Upload up to 3 photos and 1 video
Pin exact location on map
Receive confirmation with report ID



US-3.2: As a user, I want my reports verified by AI, so that I know they're taken seriously.

Acceptance Criteria:

AI analyzes photos for authenticity
Trust score (0-100) calculated and shown
Reports with high trust scores prioritized
Email notification when report verified/rejected



US-3.3: As a reporter, I want to track my submitted reports, so that I know their status.

Acceptance Criteria:

"My Reports" page lists all submissions
See status: Pending/Verified/Rejected
View timeline of report processing
Download PDF of verified reports




Epic 4: Emergency Response
US-4.1: As someone in danger, I want a quick SOS button, so that I can alert my emergency contacts immediately.

Acceptance Criteria:

Large, visible SOS button on every page
One-tap activation (with confirmation)
Sends location to emergency contacts via SMS/email
Works even without GPS (manual location selection)



US-4.2: As a user, I want to pre-configure emergency contacts, so that SOS alerts reach the right people.

Acceptance Criteria:

Add up to 3 emergency contacts in profile
Include name, phone, email for each
Test SOS system without actually sending alerts
Edit contacts anytime



US-4.3: As an emergency contact, I want to receive clear location information, so that I can help quickly.

Acceptance Criteria:

Email/SMS includes exact address
Google Maps link to location
Timestamp of alert
User's name and phone number




Epic 5: Admin Moderation
US-5.1: As an admin, I want to review pending reports, so that I can verify legitimate incidents.

Acceptance Criteria:

Dashboard shows all pending reports
Sort by trust score (lowest first)
View full report details and evidence
See AI analysis results



US-5.2: As an admin, I want to approve/reject reports with reasons, so that users understand decisions.

Acceptance Criteria:

Approve button adds report to map
Reject button requires reason selection
Request more info option available
User receives email notification with decision



US-5.3: As an admin, I want to escalate verified reports to police, so that authorities are informed.

Acceptance Criteria:

Generate PDF report with all evidence
Send automated email to police
Log escalation with timestamp
Notify user that report was forwarded




6.3 Use Case: Safe Route Planning
Use Case ID: UC-001
Use Case Name: Plan Safe Route for Nighttime Travel
Primary Actor: Priya (Daily Commuter)
Goal: Find safest route from office to home at 10 PM in Surat
Preconditions:

Priya is logged in to CrimeSafe AI
GPS permission granted
Crime database has data for the area

Main Success Scenario:

Priya opens CrimeSafe AI at 9:45 PM, still at office
System detects current location: Vesu
Priya clicks "Route Planner" in navigation
Start location auto-filled with current position
Priya types "Adajan" as destination
Priya selects travel time: "Now"
Priya clicks "Calculate Routes"
System downloads road network for area
System queries XGBoost model for risk scores on each road segment
System runs Modified A* algorithm three times:

Safest route calculated (8.5 km, 22 min, Risk: 15/100)
Fastest route calculated (6.2 km, 15 min, Risk: 68/100)
Balanced route calculated (7.1 km, 18 min, Risk: 32/100)


All three routes displayed on map with color-coded segments
Priya reviews routes:

Fastest route goes through Varachha (red zone)
Safest route avoids Varachha, takes Dumas Road
Balanced route uses partially safer roads


Priya selects "Safest Route"
Priya clicks "Start Navigation"
Route opens in Google Maps
Priya travels home safely, avoiding high-crime areas

Postconditions:

Route saved in Priya's history
Route cached for future similar requests
No incidents reported along safest route

Alternative Flows:
Alt 1: No GPS Available

Step 4: System shows "Cannot detect location"
Priya types "Vastrapur" manually
System geocodes address to coordinates
Continue from step 5

Alt 2: High Risk at Current Time

Step 11: All routes show high risk (> 60) due to nighttime
System displays warning: "🔴 High-risk travel time. Consider waiting or taking alternative transport."
Priya sees suggestion: "This area is 50% safer at 8 AM"
Priya decides to take cab instead

Alt 3: Route Calculation Failure

Step 9: OSMnx fails to download road network (network error)
System shows error: "Unable to calculate route. Check connection."
"Retry" and "Use Cached Route" options shown
Priya clicks "Retry"
System successfully calculates on second attempt


6.4 Use Case: Report Crime with AI Verification
Use Case ID: UC-002
Use Case Name: Submit Crime Report with Photo Evidence
Primary Actor: Rajesh (Concerned Parent)
Goal: Report theft incident near daughter's school in Surat
Preconditions:

Rajesh is logged in
Has photo of broken bicycle lock
Knows location and time of incident

Main Success Scenario:

Rajesh witnesses bike theft near school (3 PM)
Rajesh opens CrimeSafe AI and clicks "Report Crime"
Report form loads
Rajesh selects crime type: "Theft"
Rajesh selects severity: "Medium"
Rajesh sets date/time: "Today, 3:00 PM"
Rajesh clicks map to pin location (school address auto-detected)
Rajesh types description: "Bike stolen from school parking. Lock was cut."
Rajesh uploads photo of broken lock (2.5 MB JPG file)
Upload progress bar shows, completes in 3 seconds
Thumbnail preview appears
Rajesh clicks "Submit Report"
Frontend validates all required fields (✓ All filled)
Backend receives report
AI verification pipeline starts:
EXIF Analysis:

GPS extracted: 23.0255, 72.5850 (within 200m of reported location ✓)
Timestamp: Today 3:05 PM (within 48 hours ✓)
Camera: iPhone 12 (genuine device ✓)
EXIF Score: 30/30

AI-Generated Detection:

HuggingFace model analyzes image
AI probability: 0.15 (likely real photo ✓)
AI Detection Score: 30/30

CLIP Consistency:

Image embedding: [vector]
Text "bike lock cut" embedding: [vector]
Cosine similarity: 0.78 (good match ✓)
CLIP Score: 25/25

Quality Check:

Resolution: 1920x1080 (good ✓)
No editing software in EXIF ✓
Quality Score: 15/15


Total Trust Score: 100/100 🟢
Report status set to "Pending" (awaits admin review despite high score)
Report ID generated: CR12456
Rajesh sees success page:

"Report Submitted Successfully!"
Report ID: #CR12456
Trust Score: 100/100 - Excellent
"Your report will be reviewed within 24 hours"


Confirmation email sent to Rajesh's email
Admin notification generated (high-trust report flagged for quick approval)

Postconditions:

Report saved in database with status "Pending"
Photo stored in Cloudinary
Admin sees report in verification queue (top priority due to high trust)
Report awaits verification before appearing on public map

Alternative Flows:
Alt 1: Low Trust Score (Fake Photo)

Step 15: AI-Generated Detection returns 0.85 (likely AI image)
EXIF GPS coordinates missing (no location data)
Trust Score: 35/100 🔴
Step 19: Rajesh sees:

"Report Submitted"
Trust Score: 35/100 - Requires Review
"Your report has been flagged for additional verification"


Admin sees report with ⚠️ warning, reviews carefully

Alt 2: Missing Required Field

Step 13: Rajesh forgot to select crime type
Frontend shows error: "Please select crime type"
Form field highlighted in red
Rajesh selects "Theft"
Resubmits successfully

Alt 3: Photo Upload Failure

Step 10: Network error during upload
Error message: "Upload failed. Retrying..."
Automatic retry succeeds
Continue from step 11

Alt 4: Offline Submission

Step 12: No internet connection
Report saved to local queue
Banner shows: "Offline - Report queued for upload"
When connection restored:

Background sync uploads report
Notification: "Your report has been submitted"




6.5 Use Case: Admin Report Verification
Use Case ID: UC-003
Use Case Name: Verify High-Trust Crime Report
Primary Actor: Karan (Admin)
Goal: Review and approve Rajesh's theft report
Preconditions:

Karan is logged in as admin
Rajesh's report (CR12456) is in pending queue
Report has trust score of 100/100

Main Success Scenario:

Karan logs in to admin panel at 4 PM (1 hour after Rajesh's submission)
Admin dashboard loads:

15 pending reports shown
CR12456 at top (sorted by trust score, descending)
Badge: "🟢 High Trust - 100/100"


Karan clicks "Review" on CR12456
Detailed review screen loads:
User Info Section:

Name: Rajesh Patel
Account Age: 6 months
Previous Reports: 3
Verification Rate: 100% (3/3 approved)
User Trust Rating: 95/100 ← Trusted user!

Report Details:

Crime Type: Theft
Severity: Medium
Date/Time: Today, Jan 24, 2025, 3:00 PM
Location: Near Sunshine School, Adajan
Description: "Bike stolen from school parking. Lock was cut."
[View on Map] button

Evidence:

Photo 1: [Thumbnail of broken lock]
Karan clicks photo → Full-size viewer opens
Photo clearly shows cut bicycle lock with visible damage

AI Analysis Report:

Overall Trust: 100/100 🟢
EXIF Check: ✅ PASSED

GPS: 23.0255, 72.5850 (210m from reported location ✓)
Timestamp: Today 3:05 PM (5 min after incident ✓)
Camera: iPhone 12
No manipulation detected


AI Detection: ✅ PASSED

AI Probability: 0.15 (85% confident real photo)
No synthetic image patterns found


Image-Text Consistency: ✅ PASSED

Similarity Score: 0.78/1.0
Description matches image content


Image Quality: ✅ PASSED

Resolution: 1920x1080 (excellent)
No editing software detected




Karan reviews all information
Karan verifies:

✓ User is trusted (3 previous reports all verified)
✓ Photo is genuine (AI analysis confirms)
✓ Location matches (GPS data accurate)
✓ Description is detailed and specific
✓ No red flags


K
ContinueJan 24aran decides to approve
8. Karan clicks "Approve & Verify" button
9. Modal appears: "Escalate to police?"
10. Karan checks "✓ Send to police" (theft is reportable)
11. Karan adds admin notes: "Verified theft. User has good history. Photo evidence clear."
12. Karan clicks "Submit Decision"
13. Backend processes:
- Report status updated: "Pending" → "Verified"
- verified_at timestamp set
- Report added to crime database for map display
- Heat map updated with new crime point
- Risk scores recalculated for area

Police escalation triggered:

PDF generated with:

Report details
Rajesh's contact info
Photo embedded
Location map screenshot


Email sent to police@surat.gov.in (simulated)
Subject: "Verified Crime Report - Theft at Adajan"
PDF attached
Escalation logged


Email sent to Rajesh:

Subject: "Your report #CR12456 has been verified"
Body: "Thank you for contributing to community safety. Your report has been verified and forwarded to local authorities."


Success message shown to Karan: "Report verified and escalated successfully"
Karan returns to queue, CR12456 removed from pending list
Next pending report loaded for review

Postconditions:

Report status: "Verified"
Crime appears on public map
Heat map updated
Police notified
Rajesh notified
Karan's verification logged for audit

Alternative Flows:
Alt 1: Rejection (Low Trust Report)

Step 7: Karan reviews different report CR12457 with trust score 25/100
AI flagged: AI-generated image (0.9 probability)
EXIF missing GPS data
User is new (0 previous reports)
Photo looks like stock image
Karan decides to reject
Karan selects rejection reason: "Low trust score - suspected fake image"
Karan adds notes: "AI-generated image detected. No GPS data."
Karan clicks "Reject Report"
Report status → "Rejected"
Email sent to user: "Your report was rejected. Reason: Low trust score..."
User account flagged (strike 1 of 3)

Alt 2: Request More Information

Step 7: Karan reviews report with 65/100 trust (borderline)
Photo is blurry, can't see details
Description is vague: "Something happened"
Karan clicks "Request More Information"
Karan types: "Please provide clearer photo and more details about what you witnessed."
Email sent to user with request
Report stays in pending with status "Info Requested"
48-hour deadline set for user response


7. PROJECT TIMELINE & MILESTONES
7.1 Development Phases
Total Duration: 14 weeks (3.5 months)
Effort: ~280-350 hours total

PHASE 1: Planning & Setup (Week 1-2)
Week 1: Requirements & Design

Day 1-2: Finalize PRD, gather feedback
Day 3-4: Create wireframes for all 13 pages
Day 5-6: Design database schema
Day 7: Setup development environment

Week 2: Technical Setup

Day 8-9: Initialize React project, configure Tailwind
Day 10-11: Setup FastAPI backend, connect Supabase
Day 12-13: Configure deployment (Vercel + Render)
Day 14: Create mock crime dataset (100 records)

Deliverables:

✅ Approved PRD
✅ Wireframes for all pages
✅ Database schema document
✅ Development environment ready
✅ Mock data CSV file


PHASE 2: Prototype (Week 3-5)
Week 3: Basic Map & Authentication

Map display with OpenStreetMap
User registration and login
JWT authentication
Basic navigation structure

Week 4: Crime Visualization

Plot crime markers on map
Implement heat map layer
Add filter functionality
Click-for-safety-score feature

Week 5: Crime Reporting

Report submission form
Image upload to Cloudinary
Basic admin verification page
Report status tracking

Milestone: Prototype Demo (End of Week 5)

✅ Working map with 100 crimes displayed
✅ Heat map visualization functional
✅ Users can submit reports
✅ Admins can verify reports
Goal: Prove core concept works


PHASE 3: AI & ML Integration (Week 6-8)
Week 6: Fake Detection

EXIF metadata extraction
HuggingFace API integration
CLIP model for image-text consistency
Trust score calculation

Week 7: ML Route Planning - Part 1

OSMnx integration for road networks
Basic XGBoost model training
Crime risk score calculation
Route caching system

Week 8: ML Route Planning - Part 2

Modified A* algorithm implementation
Three-route calculation (safest/fastest/balanced)
Route visualization on map
Performance optimization

Milestone: AI Features Complete (End of Week 8)

✅ Fake detection working with 90%+ accuracy
✅ Route planner suggests 3 options
✅ Routes avoid high-crime areas
Goal: Demonstrate ML capabilities


PHASE 4: Enhanced Features (Week 9-10)
Week 9: SOS & Time-Based Risk

SOS panic button implementation
Emergency contact management
Email/SMS alert system
Time-based risk analysis
Hourly risk multipliers

Week 10: User Experience

User profile management
Report history page
Settings page with dark mode
Mobile responsive design
Accessibility improvements

Milestone: Feature Complete (End of Week 10)

✅ All core features implemented
✅ SOS system functional
✅ Time-based predictions working
Goal: Ready for user testing


PHASE 5: PWA & Optimization (Week 11-12)
Week 11: Progressive Web App

Service worker setup
Offline map caching
Background sync for reports
Add-to-home-screen prompt
Push notifications (optional)

Week 12: Performance & Polish

Image optimization (WebP, lazy loading)
Map marker clustering
Route caching optimization
Database query optimization
Loading states and error handling

Milestone: Performance Optimized (End of Week 12)

✅ Lighthouse score > 90
✅ Offline mode working
✅ Sub-3-second page loads
Goal: Production-ready performance


PHASE 6: Testing & Documentation (Week 13-14)
Week 13: Testing

Unit tests for critical functions
Manual testing of all user flows
Admin panel testing
Cross-browser testing (Chrome, Firefox, Safari)
Mobile device testing (iOS, Android)
Bug fixes

Week 14: Documentation & Deployment

User manual / help documentation
API documentation
README with setup instructions
Final deployment to production
Domain setup (if custom domain)
Pre-launch checklist

Milestone: Launch Ready (End of Week 14)

✅ All features tested and working
✅ Documentation complete
✅ Deployed to production
✅ Zero critical bugs
Goal: Ready for college presentation and public use


7.2 Milestones Summary
WeekMilestoneKey DeliverableSuccess Criteria2Setup CompleteDev environmentCan run app locally5Prototype DemoBasic map + reportingMap shows crimes, users can report8AI IntegrationML features workingFake detection + route planning10Feature CompleteAll pages doneAll 13 pages functional12OptimizedPWA + performanceLighthouse > 90, offline mode14LaunchProduction deploymentLive URL accessible

7.3 Risk Management
High-Risk Items:

XGBoost Model Training

Risk: Insufficient crime data for accurate predictions
Mitigation: Use synthetic data initially, collect real data post-launch
Backup Plan: Use simpler rule-based risk scoring


Free Tier Limitations

Risk: Services may throttle/crash under load
Mitigation: Implement caching, optimize queries
Backup Plan: Document need for paid tier in future


HuggingFace API Rate Limits

Risk: Free API has limited requests/month
Mitigation: Download models, run locally if possible
Backup Plan: Use simpler EXIF-only verification


Scope Creep

Risk: Adding too many features, missing deadline
Mitigation: Strict adherence to PRD, postpone nice-to-haves
Backup Plan: Launch with MVP, add features post-submission



Medium-Risk Items:

GPS Permission Denial

Risk: Users don't grant location access
Mitigation: Multiple fallback options (manual entry, map click)
Covered in requirements


Browser Compatibility

Risk: Features don't work in older browsers
Mitigation: Target latest 2 versions only, polyfills where needed
Acceptable for college project




8. SUCCESS METRICS & KPIs
8.1 Launch Metrics (First 3 Months)
User Acquisition:

Target: 1,000 registered users
Method: College campus promotion, social media
Measurement: User count in database

Engagement:

Target: 500+ verified crime reports
Target: 5,000+ route calculations
Target: 50+ SOS button uses (tests + real emergencies)
Measurement: Database query counts

Data Quality:

Target: 90%+ trust score accuracy (AI vs admin agreement)
Target: 80%+ report verification rate
Measurement: Compare AI trust scores with admin decisions

Performance:

Target: < 3 second page load (Lighthouse)
Target: 99% uptime
Target: < 5 second SOS alert delivery
Measurement: Monitoring tools, user feedback

8.2 User Satisfaction
Qualitative:

User interviews (5-10 users)
Feedback form responses
Net Promoter Score (NPS) survey

Quantitative:

Route planning success rate (% who complete flow)
Report submission completion rate
Return user rate (daily active users)


9. FUTURE ENHANCEMENTS (Post-Launch)
9.1 Short-Term (3-6 months)

Integration with Surat Police official crime data
Multilingual support (Gujarati language)
Dark mode for entire app
Native mobile apps (React Native)
Live crime alerts (push notifications)

9.2 Long-Term (6-12 months)

Expand to other Indian cities (Mumbai, Delhi, Bangalore)
Community features (neighborhood watch groups, forums)
Business safety ratings (restaurants, malls, etc.)
AI-powered crime prediction (future hotspots)
Integration with ride-sharing for safe rides
Partnerships with local authorities for verified data


10. APPENDICES
10.1 Glossary

Heat Map: Visual representation showing data intensity using color gradients
PostGIS: PostgreSQL extension for geospatial data
XGBoost: Machine learning algorithm for classification/regression
A Algorithm:* Pathfinding algorithm for finding shortest path in graphs
EXIF: Exchangeable Image File Format - metadata in photos
CLIP: Contrastive Language-Image Pre-training - AI model by OpenAI
PWA: Progressive Web App - web app that works like native app
JWT: JSON Web Token - authentication token format
GeoCoding: Converting addresses to coordinates (lat/lon)
OSMnx: Python library for OpenStreetMap network analysis

10.2 Abbreviations

API: Application Programming Interface
CSV: Comma-Separated Values
GDPR: General Data Protection Regulation
GPS: Global Positioning System
ML: Machine Learning
PDF: Portable Document Format
SMS: Short Message Service
SOS: Save Our Souls (emergency distress signal)
UI/UX: User Interface / User Experience
UUID: Universally Unique Identifier

10.3 References
Technical Documentation:

Leaflet.js: https://leafletjs.com/reference.html
FastAPI: https://fastapi.tiangolo.com/
PostGIS: https://postgis.net/documentation/
XGBoost: https://xgboost.readthedocs.io/
HuggingFace: https://huggingface.co/docs

Inspiration:

SpotCrime: https://spotcrime.com
Trulia Crime Map: https://trulia.com
Citizen App: https://citizen.com

10.4 Contact & Support
Project Owner: [Dhir agrawal]
Email: [dhiragrwal70@gmai.com]
College: [C.B. Patel Computer College]
Department: BCA
Project Guide: [Jennish Mam]
GitHub Repository: https://github.com/[username]/crimesafe-ai

