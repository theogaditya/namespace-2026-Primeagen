/**
 * Hardcoded knowledge base for Help AI (Agent 2).
 * Covers FAQs, troubleshooting, feature explanations, policies.
 * Will be upgraded to pgvector RAG in Phase 10 when schema changes land.
 */

export interface HelpDoc {
  id: string;
  title: string;
  content: string;
  category: "faq" | "guide" | "troubleshoot" | "policy" | "ai-features";
  language: "en" | "hi" | "both";
  keywords: string[];
}

export const HELP_DOCUMENTS: HelpDoc[] = [
  // ============ FAQs ============
  {
    id: "faq-what-is-swarajdesk",
    title: "What is SwarajDesk?",
    content: `SwarajDesk is India's AI-powered citizen grievance platform. It allows citizens to file complaints about civic issues (potholes, water supply, waste management, etc.), track their progress, and engage with their community. The platform uses AI to help you file better complaints, detect duplicates, and moderate content. Available in English and Hindi.`,
    category: "faq",
    language: "both",
    keywords: ["what", "swarajdesk", "platform", "about", "kya hai"],
  },
  {
    id: "faq-registration",
    title: "How do I register on SwarajDesk?",
    content: `To register: 1) Visit the SwarajDesk website, 2) Click "Sign Up", 3) Enter your name, email, phone number, and create a password, 4) Verify your email or phone via OTP, 5) Complete your profile with your district and address. You need to provide valid information as complaints are linked to your profile.`,
    category: "faq",
    language: "both",
    keywords: ["register", "sign up", "create account", "new account", "join", "registration"],
  },
  {
    id: "faq-complaint-lifecycle",
    title: "What happens after I file a complaint?",
    content: `After filing: 1) REGISTERED -Your complaint enters the system, 2) UNDER_PROCESSING -Assigned to the relevant department, 3) FORWARDED -May be forwarded to another department if needed, 4) RESOLVED -The department marks it resolved, 5) CLOSED -Finalized after resolution. You receive updates at each stage. Average resolution time depends on the department and urgency, typically 7-30 days. If unresolved, complaints are automatically escalated.`,
    category: "faq",
    language: "both",
    keywords: ["after filing", "lifecycle", "process", "what happens", "status", "stages", "kya hota hai"],
  },
  {
    id: "faq-complaint-categories",
    title: "What types of complaints can I file?",
    content: `SwarajDesk supports complaints across many categories: Roads & Infrastructure (potholes, broken roads, streetlights), Water Supply (leaks, contamination, no supply), Waste Management (garbage collection, illegal dumping), Electricity (outages, unsafe wiring), Public Health (sanitation, drainage), Public Safety, Education, Transport, Housing, and more. Each category has specific sub-categories. The AI can help you pick the right one.`,
    category: "faq",
    language: "both",
    keywords: ["categories", "types", "what complaints", "which issues", "category list"],
  },
  {
    id: "faq-public-private",
    title: "Are my complaints public?",
    content: `By default, complaints are visible to the community (public). This helps others with similar issues find and upvote your complaint, increasing its priority. You can choose to make a complaint private if it contains sensitive personal information. Private complaints are only visible to you and the assigned department.`,
    category: "faq",
    language: "both",
    keywords: ["public", "private", "visibility", "who can see", "community visible"],
  },
  {
    id: "faq-upvote",
    title: "What does upvoting do?",
    content: `Upvoting a complaint signals to the system and departments that this issue affects more people. Higher upvote counts increase the complaint's priority and visibility in the trending section. Anyone can upvote a public complaint once. You earn engagement badges for active participation in the community.`,
    category: "faq",
    language: "both",
    keywords: ["upvote", "like", "support", "vote", "priority"],
  },

  // ============ GUIDES ============
  {
    id: "guide-file-complaint",
    title: "Step-by-step: Filing a complaint",
    content: `There are 3 ways to file a complaint on SwarajDesk:

**1. AI Chat (Recommended):**
- Open the AI Chat from the dashboard
- Say "I want to register a complaint" or describe your issue
- The AI will guide you through category, description, location, and photo upload
- Review the AI-generated preview and submit

**2. Auto-fill with Photo:**
- Go to Register Complaint → Auto-fill path
- Upload a photo of the issue
- The AI analyzes the photo and auto-fills category, description, and urgency
- Review, edit if needed, and submit

**3. Manual Form:**
- Go to Register Complaint → Manual
- Fill in category, sub-category, description, location, urgency, and optionally upload a photo
- Review and submit

Tips for a high-quality complaint:
- Upload a clear photo (boosts quality score by ~25 points)
- Allow location access (exact GPS is more effective than just district)
- Write a specific, detailed description
- Select the correct category and sub-category`,
    category: "guide",
    language: "both",
    keywords: ["file complaint", "register complaint", "how to file", "submit", "new complaint", "shikayat kaise karein"],
  },
  {
    id: "guide-track-complaint",
    title: "Step-by-step: Tracking your complaint",
    content: `To track a complaint:
1. Go to Dashboard → My Complaints section
2. Each complaint card shows: status, department, date filed, upvote count
3. Click on a complaint to see the full timeline of status changes
4. You can also ask the AI: "What's the status of complaint #[number]?"
5. Notifications are sent when your complaint status changes
6. If your complaint hasn't moved in a while, you can ask "Why is my complaint stuck?" and the AI will help`,
    category: "guide",
    language: "both",
    keywords: ["track", "tracking", "status", "where is my complaint", "complaint number", "timeline"],
  },
  {
    id: "guide-voice-chat",
    title: "Using Voice Chat",
    content: `SwarajDesk supports full voice conversations in Hindi and English:
1. Tap the microphone icon in the AI Chat
2. Speak naturally -the AI understands Hindi, English, and Hinglish (mixed)
3. Your speech is transcribed and displayed as text in the chat
4. The AI responds with both text and audio playback
5. You can go back and forth with voice many times in a conversation
6. You can switch between text and voice mid-conversation
7. Voice is great for filing complaints -just describe your issue verbally`,
    category: "guide",
    language: "both",
    keywords: ["voice", "microphone", "speak", "audio", "hindi voice", "bolna", "awaaz"],
  },

  // ============ TROUBLESHOOTING ============
  {
    id: "trouble-login",
    title: "Login issues",
    content: `Common login problems and solutions:
- **Forgot password**: Click "Forgot Password" on the login page, enter your email, and follow the reset link
- **Invalid credentials**: Make sure you're using the correct email. Passwords are case-sensitive
- **Account locked**: After 5 failed attempts, your account is temporarily locked for 15 minutes
- **Email not verified**: Check your inbox (and spam folder) for the verification email sent during registration
- **Session expired**: If you see "Token expired", simply log in again. Sessions last 24 hours
If none of these help, contact support and we'll assist you directly.`,
    category: "troubleshoot",
    language: "both",
    keywords: ["login", "can't login", "password", "forgot", "locked", "expired", "sign in problem"],
  },
  {
    id: "trouble-complaint-stuck",
    title: "Complaint stuck or not updating",
    content: `If your complaint status hasn't changed:
- **Just filed (< 48 hours)**: Processing takes time. Departments review complaints within 2 business days
- **Under Processing (> 7 days)**: The department is working on it. Some issues take longer depending on complexity
- **No change in 15+ days**: Your complaint may be eligible for automatic escalation. Ask "Can you escalate my complaint #[number]?"
- **Marked Resolved but issue persists**: You can reopen the complaint or file a new one referencing the old complaint number
- **Wrong department assigned**: Sometimes complaints are forwarded to the correct department, which resets the processing timer
The AI can look up your specific complaint and give you a personalized status update.`,
    category: "troubleshoot",
    language: "both",
    keywords: ["stuck", "not updating", "no change", "pending", "delayed", "slow", "atak gaya"],
  },
  {
    id: "trouble-photo-upload",
    title: "Photo upload issues",
    content: `If you're having trouble uploading photos:
- **File too large**: Photos must be under 5MB. Try taking a smaller photo or compressing the image
- **Wrong format**: Supported formats are JPG, JPEG, PNG, and WebP. Other formats won't upload
- **Upload stuck/spinning**: Check your internet connection. Try on WiFi if mobile data is slow
- **Photo not appearing**: Wait a moment -photos are processed by AI for auto-fill, which takes 5-10 seconds
- **Camera not working**: Make sure you've granted camera permissions in your browser/phone settings
Tips: Use a well-lit, clear photo showing the issue directly. Close-ups work better than wide shots.`,
    category: "troubleshoot",
    language: "both",
    keywords: ["photo", "upload", "image", "camera", "picture", "tasveer"],
  },
  {
    id: "trouble-voice-not-working",
    title: "Voice chat not working",
    content: `If voice chat isn't working:
- **Microphone permission**: Your browser needs microphone access. When prompted, click "Allow"
- **No audio recording**: Check that your microphone is connected and not muted in system settings
- **Chrome recommended**: Voice works best in Chrome. Safari and Firefox may have limited support
- **Can't hear response**: Make sure your volume is turned up. The AI sends audio playback alongside text
- **Transcription incorrect**: Speak clearly and minimize background noise. The AI works with Hindi, English, and Hinglish
- **Timeout**: Very long audio (> 60 seconds) may timeout. Try shorter messages`,
    category: "troubleshoot",
    language: "both",
    keywords: ["voice not working", "microphone", "recording", "audio problem", "can't speak", "mic"],
  },
  {
    id: "trouble-map-location",
    title: "Map/location issues",
    content: `If the map or location features aren't working:
- **Location not detected**: Allow location access in your browser. Go to browser settings → Site permissions → Location → Allow
- **Wrong location shown**: The GPS can be imprecise. You can manually drag the pin on the map to the correct spot
- **Map not loading**: Check internet connection. The map requires a stable connection to load tiles
- **PIN code not recognized**: Make sure you're entering a valid Indian PIN code (6 digits)
- **District not listed**: SwarajDesk operates in specific districts. If your district isn't listed, the platform may not have expanded there yet`,
    category: "troubleshoot",
    language: "both",
    keywords: ["map", "location", "gps", "pin code", "district", "address", "naksha"],
  },
  {
    id: "trouble-notification",
    title: "Notification issues",
    content: `If you're not receiving notifications:
- **Browser notifications**: Allow push notifications when prompted, or enable in browser settings
- **Email notifications**: Check your spam/junk folder. Add SwarajDesk to your email contacts
- **In-app notifications**: Check the bell icon on the dashboard -all notifications are logged there
- **Notification preferences**: You can manage notification settings in your profile page
- **Delayed notifications**: Some notifications are batched and sent periodically, not instantly`,
    category: "troubleshoot",
    language: "both",
    keywords: ["notification", "alert", "email", "push", "not receiving", "suchna"],
  },

  // ============ AI FEATURES ============
  {
    id: "ai-quality-score",
    title: "What is the Quality Score?",
    content: `Every complaint receives an AI-calculated Quality Score (0-100) based on 4 dimensions:

**Clarity (0-25)**: How specific and well-written is the description?
**Evidence (0-25)**: Does it include a relevant photo?
**Location (0-25)**: How precise is the location? (GPS coordinates > PIN code > just district)
**Completeness (0-25)**: Are all fields filled? Sub-category, urgency, description length?

Score ranges:
- 76-100 ⭐ Excellent (gold badge) -Complete with photo, exact location, detailed description
- 51-75 ✅ Good (green badge) -Most fields filled, decent description
- 26-50 ⚠️ Fair (orange badge) -Missing photo or vague description
- 0-25 ❌ Poor (red badge) -Minimal information provided

Higher quality complaints get resolved faster because departments have all the information they need. You can see your average quality score in your civic standing section.`,
    category: "ai-features",
    language: "both",
    keywords: ["quality score", "score", "rating", "stars", "points", "badge color", "gunvatta"],
  },
  {
    id: "ai-abuse-moderation",
    title: "Why does my complaint show ******?",
    content: `SwarajDesk uses AI moderation to maintain respectful community standards. If a complaint contains abusive, threatening, or hateful language:

1. The offensive words are automatically replaced with ******
2. The complaint shows a "⚠️ AI Moderated" badge
3. The rest of your complaint remains exactly as you wrote it
4. The core issue is preserved -only the language is cleaned

**Important**: Being passionate about your issue is fine! The AI only flags actual slurs, threats, and obscenity. Describing a problem firmly ("This road is terrible and has been ignored for months!") is NOT flagged.

The severity levels are:
- **Low**: Minor language issue
- **Medium**: Clear abusive language
- **High**: Threats or severe hate speech

If you believe your complaint was incorrectly moderated, contact support.`,
    category: "ai-features",
    language: "both",
    keywords: ["stars", "******", "censored", "flagged", "abuse", "moderated", "bad words", "gaali"],
  },
  {
    id: "ai-similar-complaints",
    title: "What does 'Similar Complaints' mean?",
    content: `When you see "📋 N similar complaints" on a complaint card, it means our AI found other citizens who reported very similar issues in the same area.

**How it works:**
- When a complaint is filed, our AI checks for existing complaints about similar issues nearby
- If matches are found, the complaints are linked together
- You can click the badge to see the linked complaints

**Why it matters:**
- It shows how widespread an issue is
- Upvoting any linked complaint helps all of them get prioritized
- Departments can see the full scope of an issue across multiple reports

**When filing**: Before you submit, the AI checks for similar complaints and may suggest upvoting an existing one instead -this concentrates civic attention and gets issues resolved faster.`,
    category: "ai-features",
    language: "both",
    keywords: ["similar", "duplicate", "same complaint", "linked", "related", "already reported", "pehle se"],
  },
  {
    id: "ai-chat-features",
    title: "What can the AI Chat do?",
    content: `The SwarajDesk AI Chat can help you with:

1. **File a complaint** -Describe your issue and the AI guides you through the process
2. **Track complaints** -Ask "What's the status of complaint #123?"
3. **Search complaints** -"Show me recent pothole complaints in my district"
4. **Trending issues** -"What's trending in my area?"
5. **Platform help** -"How do I upload a photo?", "How do I earn badges?"
6. **Department info** -"Which department handles water supply?", "Resolution stats?"
7. **General civic info** -Category explanations, feature guides, community tips
8. **Voice support** -Speak in Hindi, English, or Hinglish

The AI remembers your conversation, so you can ask follow-up questions naturally.`,
    category: "ai-features",
    language: "both",
    keywords: ["ai chat", "what can ai do", "chatbot", "features", "help", "assistant"],
  },

  // ============ POLICY ============
  {
    id: "policy-privacy",
    title: "Privacy & Data Policy",
    content: `SwarajDesk takes your privacy seriously:
- Your Aadhaar number and phone number are never shared publicly
- Public complaints show your name but NOT your email or phone
- The AI never reveals other users' personal information
- Your conversation with the AI is stored for session continuity but not shared with other users
- Department admins can see complaint details but cannot access your account password
- You can request deletion of your account and data by contacting support`,
    category: "policy",
    language: "both",
    keywords: ["privacy", "data", "personal information", "security", "nijta"],
  },
  {
    id: "policy-escalation",
    title: "Complaint Escalation Policy",
    content: `Complaints are escalated automatically based on SLA timelines:
- **Municipal level**: If unresolved within 15 days, escalated to senior municipal admin
- **State level**: If unresolved within 30 days, escalated to state department
- **Priority boost**: Complaints with high upvote counts may be escalated faster
- **Manual escalation**: You can request escalation through the AI chat or by contacting support
- **Urgency factor**: HIGH urgency complaints have shorter SLA windows

Note: Escalation doesn't guarantee instant resolution but ensures the complaint gets higher-level attention.`,
    category: "policy",
    language: "both",
    keywords: ["escalation", "escalate", "higher authority", "not resolved", "time limit", "SLA"],
  },
  {
    id: "policy-badges",
    title: "Badges & Civic Score System",
    content: `SwarajDesk rewards civic engagement:

**Civic Score**: Points earned through platform activity. Higher score = more community influence
**Badges**: Earned for specific achievements:
- File your first complaint → "First Complaint" badge
- Upvote 10 complaints → "Community Supporter" badge
- File 5 quality complaints (score > 75) → "Quality Reporter" badge
- Have 3 complaints resolved → "Problem Solver" badge
- And many more...

Badges are displayed on your profile and visible to the community. They build trust and recognize active citizens.`,
    category: "policy",
    language: "both",
    keywords: ["badge", "civic score", "points", "rewards", "achievements", "nishaan"],
  },
];

/**
 * Simple keyword-based search across the knowledge base.
 * Returns top N docs ranked by keyword match count.
 */
export function searchKnowledge(query: string, maxResults: number = 3): HelpDoc[] {
  const queryLower = query.toLowerCase();
  const queryWords = queryLower.split(/\s+/).filter((w) => w.length > 2);

  const scored = HELP_DOCUMENTS.map((doc) => {
    let score = 0;
    const searchable = `${doc.title} ${doc.content} ${doc.keywords.join(" ")}`.toLowerCase();

    // Keyword match scoring
    for (const word of queryWords) {
      if (searchable.includes(word)) score += 1;
    }
    // Bonus for keyword array exact matches
    for (const kw of doc.keywords) {
      if (queryLower.includes(kw.toLowerCase())) score += 3;
    }
    // Bonus for title match
    if (doc.title.toLowerCase().includes(queryLower)) score += 5;

    return { doc, score };
  });

  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults)
    .map((s) => s.doc);
}
