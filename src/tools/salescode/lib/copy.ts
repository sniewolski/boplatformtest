/**
 * SalesCode trait copy — populated from canonical trait document.
 *
 * Each entry carries shared definition/why-it-matters plus the two
 * declarative lines: `strengthLine` (favorable outcome) and `growthLine`
 * (development outcome). The renderer picks one based on the scored
 * `TraitOutcome.kind`.
 */
import type { TraitCopyEntry, TraitKey } from "./types";

export type TraitArea = "sales-skills" | "inner-game" | "habits-and-drive";

export const TRAIT_AREA_LABELS: Record<TraitArea, string> = {
  "sales-skills": "Sales skills",
  "inner-game": "Inner game",
  "habits-and-drive": "Habits & drive",
};

export const TRAIT_AREA_OF: Record<TraitKey, TraitArea> = {
  "objection-handling": "sales-skills",
  "influence": "sales-skills",
  "simplification": "sales-skills",
  "storytelling": "sales-skills",
  "negotiations": "sales-skills",
  "identifying-key-accounts": "sales-skills",
  "industry-expert": "sales-skills",
  "comfortable-with-money": "inner-game",
  "self-esteem": "inner-game",
  "personal-accountability": "inner-game",
  "optimism": "inner-game",
  "caveman-brain": "inner-game",
  "emotional-intelligence": "inner-game",
  "assertiveness": "habits-and-drive",
  "productivity": "habits-and-drive",
  "goal-setting": "habits-and-drive",
  "habits": "habits-and-drive",
  "people-pleaser": "habits-and-drive",
  "introvert-extrovert": "habits-and-drive",
};

export const TRAIT_COPY: Record<TraitKey, TraitCopyEntry> = 
{
  "introvert-extrovert": {
    "key": "introvert-extrovert",
    "name": "Introvert / Extrovert",
    "whatItMeans": "Extroverts gain energy from time with other people; introverts recover energy from time alone.",
    "whyItMatters": "Your work involves a high volume of client interactions, sales conversations, discovery calls, and networking. If you're an extrovert, you can sustain this energy naturally and often build momentum through back-to-back conversations. If you're an introvert, you can absolutely succeed --- but you need to be more deliberate about protecting recovery time and structuring your days to avoid hitting a wall before the most important conversations happen.",
    "strengthLine": "You are more extroverted.",
    "growthLine": "You are more introverted."
  },
  "assertiveness": {
    "key": "assertiveness",
    "name": "Assertiveness",
    "whatItMeans": "The ability to express your needs, set expectations, and advocate for your position --- calmly and directly, without aggression or passive acceptance.",
    "whyItMatters": "Assertiveness is what allows you to follow up on unpaid invoices, push back on out-of-scope requests, set boundaries with clients, and ask for the business at the end of a sales conversation. Without it, you are likely leaving money on the table and building relationships where the client gradually holds all the power.",
    "strengthLine": "You are assertive.",
    "growthLine": "You are not very assertive."
  },
  "comfortable-with-money": {
    "key": "comfortable-with-money",
    "name": "Comfortable talking about money",
    "whatItMeans": "The ability to discuss pricing, fees, and financial expectations without emotional attachment --- treating money as a straightforward business tool.",
    "whyItMatters": "If you're not comfortable talking about money, you'll likely discount your fees before being asked, avoid raising prices even when justified, and let nervousness bleed into conversations about budgets or contracts. Clients pick up on that discomfort and it erodes their confidence in your business. Being able to talk about money clearly and calmly is one of the most direct levers you have on your profitability.",
    "strengthLine": "You are comfortable talking about money.",
    "growthLine": "You are not comfortable talking about money."
  },
  "emotional-intelligence": {
    "key": "emotional-intelligence",
    "name": "Emotional intelligence",
    "whatItMeans": "The ability to recognise and manage your own emotions, and to read and respond to the emotions of others --- handling conversations with both clarity and empathy.",
    "whyItMatters": "Your business is built on relationships. Whether you're navigating a difficult client, closing a new project, or managing a team, your ability to stay composed under pressure and read the room determines outcomes. High emotional intelligence allows you to keep conversations on track even when they get tense, and to identify what a client actually needs versus what they're saying.",
    "strengthLine": "You have high emotional intelligence.",
    "growthLine": "You have lower emotional intelligence."
  },
  "self-esteem": {
    "key": "self-esteem",
    "name": "Self-esteem",
    "whatItMeans": "Genuine confidence in your own worth and the value your business delivers to clients.",
    "whyItMatters": "Your self-esteem sets the floor on what you charge and how you present your services. If it's lower than it should be, you'll likely undervalue what you do, apologise when you shouldn't, and struggle to hold firm on pricing or push back on unreasonable requests. When you genuinely believe in what you offer, that belief comes through in every sales conversation and directly influences how prospects perceive your value.",
    "strengthLine": "You have high self-esteem.",
    "growthLine": "You have lower self-esteem."
  },
  "optimism": {
    "key": "optimism",
    "name": "Optimism",
    "whatItMeans": "The tendency to favour positive outcomes when the future is uncertain.",
    "whyItMatters": "You will face rejection, slow months, difficult clients, and setbacks regularly. Optimism isn't about being naive --- it's about recovering faster and maintaining the confidence to keep putting yourself out there. Research consistently shows optimists handle adversity better, stay more engaged, and are significantly less likely to burn out than pessimists.",
    "strengthLine": "You are highly optimistic.",
    "growthLine": "You are not naturally optimistic."
  },
  "people-pleaser": {
    "key": "people-pleaser",
    "name": "People pleaser",
    "whatItMeans": "An emotional need to please others, often at the expense of your own needs or the health of your business.",
    "whyItMatters": "Your instinct to please clients can work against you. It can lead to scope creep, undercharging, and accepting terms that don't work for your business. Sustainable client relationships require clear boundaries and mutual value exchange --- not just giving without limit. When clients don't reciprocate the respect or value you give, the result is often resentment rather than a direct conversation.",
    "strengthLine": "You are not a people pleaser.",
    "growthLine": "You tend to be a people pleaser."
  },
  "personal-accountability": {
    "key": "personal-accountability",
    "name": "Personal accountability",
    "whatItMeans": "The belief that you are fully responsible for your decisions, your actions, and their consequences.",
    "whyItMatters": "If you lack accountability, you'll tend to attribute slow growth, difficult clients, or cash flow problems to external factors --- the economy, bad luck, difficult industries. When you take full ownership of your results, you recognise that your choices drive your outcomes. That mindset is what unlocks the ability to actually change things rather than just endure them.",
    "strengthLine": "You have strong personal accountability.",
    "growthLine": "You have weak personal accountability."
  },
  "goal-setting": {
    "key": "goal-setting",
    "name": "Goal setting",
    "whatItMeans": "The practice of defining what you want to achieve and building measurable milestones and timelines to get there.",
    "whyItMatters": "Without clear goals, a service business drifts. You may be busy without making progress on the things that actually matter --- revenue targets, client mix, team growth, or time freedom. An effective goal-setting process gives you a destination and a roadmap, so your daily decisions are aligned with where you actually want to end up.",
    "strengthLine": "You have an effective goal setting process.",
    "growthLine": "You do not have an effective goal setting process."
  },
  "objection-handling": {
    "key": "objection-handling",
    "name": "Objection handling",
    "whatItMeans": "The ability to confidently address the concerns, hesitations, and deflections that prospects raise during a sales conversation.",
    "whyItMatters": "You probably hear the same five objections repeatedly: price, timing, needing to think about it, or speaking to a partner. If any of those can stop you cold before you've had the chance to demonstrate your value, you will lose a significant portion of the clients you could have won. Handling objections well doesn't mean bulldozing prospects --- it means understanding their real concern and addressing it directly.",
    "strengthLine": "You handle objections well.",
    "growthLine": "You struggle to handle objections."
  },
  "influence": {
    "key": "influence",
    "name": "Influence",
    "whatItMeans": "The subtle ability to guide a prospect's thinking and gently move them toward a decision --- without pressure.",
    "whyItMatters": "Prospects procrastinate. Even when they can see the value of what you offer, the status quo feels safer than change. Your ability to influence means helping someone break through their own inertia and take the step they already know they should take. This is what separates a good conversation from a signed contract.",
    "strengthLine": "You are effective at influencing others.",
    "growthLine": "You struggle to influence others."
  },
  "industry-expert": {
    "key": "industry-expert",
    "name": "Industry expert",
    "whatItMeans": "Being known within your market as someone with genuine, credible expertise --- through content, reputation, or track record.",
    "whyItMatters": "Trust is the hardest thing to build and the most valuable asset you can have. When you're already known as an expert before a conversation starts, you've compressed the sales process significantly. Prospects who seek you out because of your reputation arrive pre-qualified and require far less convincing than cold prospects who know nothing about you.",
    "strengthLine": "You are recognised as an industry expert.",
    "growthLine": "You are not yet recognised as an industry expert."
  },
  "storytelling": {
    "key": "storytelling",
    "name": "Storytelling",
    "whatItMeans": "The ability to communicate through narrative --- using client stories and outcomes to make your value tangible and believable.",
    "whyItMatters": "If you rely on features and credentials alone, you'll often lose to competitors who tell better stories. Prospects don't buy your methodology --- they buy the idea of reaching a better outcome. When you can tell a compelling story about how someone just like them went from where they are now to where they want to be, you make the decision feel possible and make yourself the obvious choice to get them there.",
    "strengthLine": "You are an effective storyteller.",
    "growthLine": "You struggle with storytelling."
  },
  "negotiations": {
    "key": "negotiations",
    "name": "Negotiation",
    "whatItMeans": "The ability to exchange value clearly, communicate what your service is worth, and navigate the gap between what a client wants to pay and what your business needs to charge.",
    "whyItMatters": "Service value is often intangible, which makes it easy for clients to challenge your pricing. A strong negotiator doesn't just defend their number --- they shift the conversation to outcomes, ROI, and what it costs the client not to act. If you're a weak negotiator, you'll end up discounting reflexively or walking away from deals you could have won on better terms.",
    "strengthLine": "You are a sound negotiator.",
    "growthLine": "You are a weak negotiator."
  },
  "productivity": {
    "key": "productivity",
    "name": "Productivity",
    "whatItMeans": "The volume of high-value work you complete within a set period of time --- specifically, the activities that directly move your business forward.",
    "whyItMatters": "You face a constant tension between doing the work and growing the business. Productivity isn't about working more hours --- it's about making sure that business development, client acquisition, and delivery are all getting the right share of your attention. If you're not productive enough in your sales-related activity, a full pipeline quickly becomes an empty one.",
    "strengthLine": "You are highly productive.",
    "growthLine": "You are not very productive."
  },
  "simplification": {
    "key": "simplification",
    "name": "Simplification",
    "whatItMeans": "The ability to cut through noise and identify the shortest, most effective path to a result.",
    "whyItMatters": "You face unlimited options for how to grow: new channels, new offers, new tools, new processes. The ability to simplify means ruthlessly cutting what doesn't move the needle and doubling down on what does. Without it, you'll stay busy doing low-leverage activities while the high-leverage moves go untouched.",
    "strengthLine": "You are great at simplifying.",
    "growthLine": "You struggle to simplify."
  },
  "identifying-key-accounts": {
    "key": "identifying-key-accounts",
    "name": "Identifying high-value clients",
    "whatItMeans": "The ability to spot a prospective client who has significant long-term potential --- and prioritise them accordingly.",
    "whyItMatters": "Not all clients are created equal. If you can identify the prospects with the highest upside --- in terms of deal size, longevity, referrals, or strategic fit --- and give those relationships disproportionate attention, you'll consistently outperform those who treat every prospect the same. One or two of the right clients can fundamentally change your trajectory.",
    "strengthLine": "You are good at identifying high-value client opportunities.",
    "growthLine": "You are weak at identifying high-value client opportunities."
  },
  "caveman-brain": {
    "key": "caveman-brain",
    "name": "Emotional self-control (caveman brain)",
    "whatItMeans": "The ability to override instinctive, reactive emotional responses and choose deliberate, rational behaviour instead.",
    "whyItMatters": "High-pressure sales conversations, difficult client feedback, and stressful negotiations all trigger emotional reactions. If you act from those reactions --- getting defensive, over-explaining, or caving on price out of discomfort --- you will consistently underperform. The ability to pause, stay calm, and respond from logic rather than emotion is what keeps you in control of outcomes.",
    "strengthLine": "You are in control of your emotional responses.",
    "growthLine": "You struggle to control your emotional responses."
  },
  "habits": {
    "key": "habits",
    "name": "Habits",
    "whatItMeans": "When a high-value business activity --- lead generation, follow-up, content creation, client outreach --- is completed consistently and without friction, it has become a habit.",
    "whyItMatters": "The people who grow most consistently aren't always the ones with the best strategy --- they're the ones who execute it every single day without having to rely on motivation or willpower. Turning your most important growth activities into daily habits is the most reliable way to compound results over time.",
    "strengthLine": "You have strong business development habits.",
    "growthLine": "You have weak business development habits."
  }
};
