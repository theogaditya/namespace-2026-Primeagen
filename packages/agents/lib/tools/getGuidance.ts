import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";

/**
 * Returns in-app guidance text (no DB needed).
 * Covers how-to guides for all platform features.
 */

const GUIDES: Record<string, string> = {
  register_complaint: `**How to Register a Complaint:**
1. Go to the Dashboard and tap the AI Chat or click "Register Complaint"
2. You can describe your issue in text or voice -the AI will guide you
3. Upload a photo of the issue if you have one (this improves quality score)
4. Confirm the category, location, and description
5. Review the complaint preview, check for similar complaints
6. Submit -you'll get a complaint number for tracking`,

  track_complaint: `**How to Track a Complaint:**
1. Go to Dashboard → "My Complaints" section
2. Each complaint shows its current status (Registered, Under Processing, Forwarded, etc.)
3. You can ask the AI: "What's the status of my complaint #123?"
4. The timeline shows every status change and escalation`,

  upvote: `**How to Upvote a Complaint:**
1. Browse the Community Feed on the Dashboard
2. Tap the upvote (👍) button on any complaint you support
3. More upvotes = higher visibility and priority
4. You earn badges for community engagement!`,

  voice: `**How to Use Voice Chat:**
1. Tap the microphone icon in the AI Chat
2. Speak clearly in Hindi, English, or Hinglish
3. The AI will transcribe your speech and respond in the same language
4. You can switch between text and voice anytime during a conversation`,

  quality_score: `**Understanding Quality Scores:**
Every complaint gets a quality score (0-100) based on:
- **Clarity** (0-25): How clear and specific is the description?
- **Evidence** (0-25): Did you attach a relevant photo?
- **Location** (0-25): How precise is the location (GPS > PIN code > district)?
- **Completeness** (0-25): Are all fields filled?

Higher quality = faster resolution. You can see the score before submitting.`,

  abuse_flag: `**Understanding AI Moderation (⚠️ AI Moderated):**
When you see "AI Moderated" on a complaint, it means:
- The AI detected inappropriate language (slurs, threats, obscenity)
- Offensive words were replaced with ****** to keep the community respectful
- The complaint's core issue is preserved and still being addressed
- This is automated and not a punishment -it helps maintain respectful discourse`,

  similar_complaints: `**Understanding "Similar Complaints":**
When you see "📋 X similar complaints" on a complaint:
- Other citizens have reported similar issues in the same area
- Click to see the related complaints and their statuses
- Upvoting these helps consolidate civic attention on the issue
- This helps administration identify recurring problems`,

  language: `**Language Support:**
- The AI auto-detects your language (Hindi, English, or Hinglish)
- You can mix languages freely -the AI understands code-switching
- Voice chat supports all three languages natively
- Responses come in the same language you use`,

  badges: `**How Badges Work:**
Earn badges for being an active citizen:
- **Filing badges**: File your first complaint, 5th, 10th, etc.
- **Engagement badges**: Upvote and support community complaints
- **Resolution badges**: Get your complaints resolved
- **Category specialist**: File multiple complaints in the same category
Badges have rarities: Common → Uncommon → Rare → Epic → Legendary`,

  feed: `**Using the Community Feed:**
The Community Feed has three tabs:
- **For You**: Complaints relevant to your area and interests
- **Trending**: Most upvoted complaints this week
- **Recent**: Latest complaints across the platform
Each card shows status, category, location, upvotes, quality score, and AI flags`,

  escalation: `**How Complaint Escalation Works:**
1. Your complaint starts at the assigned department
2. If unresolved, it escalates: Agent → Municipal Admin → State Admin
3. Each level has SLA timelines
4. You can see the escalation level on your complaint status
5. Cross-department issues get special handling`,
};

export function createGetGuidanceTool() {
  return new DynamicStructuredTool({
    name: "getGuidance",
    description:
      "Get in-app guidance and how-to guides for platform features. Use when a user asks how to do something, needs help understanding a feature, or asks about quality scores, abuse flags, badges, etc.",
    schema: z.object({
      topic: z
        .enum([
          "register_complaint",
          "track_complaint",
          "upvote",
          "voice",
          "quality_score",
          "abuse_flag",
          "similar_complaints",
          "language",
          "badges",
          "feed",
          "escalation",
        ])
        .describe("The guide topic to retrieve"),
    }),
    func: async ({ topic }) => {
      return GUIDES[topic] || "I don't have a specific guide for that topic, but I can help you with questions about it!";
    },
  });
}
