/**
 * SalesCode question bank — 155 items total (139 legacy Q1–Q204 + 16 new Q205–Q220).
 *
 * IDs are intentionally non-contiguous and MUST be preserved verbatim — the
 * scoring engine in ./scoring.ts keys off these exact IDs. Gaps in the
 * legacy bank (33–40, 96–102, 126–151, 157–180) are unused IDs, not missing
 * questions.
 *
 * Categories are for internal verification only; respondents see the items
 * in fixed order (see PRESENTATION_ORDER) with no category labels.
 *
 * Source of truth: salescode-content-and-scoring.md (Q205–Q220) and the
 * pasted legacy bank (Q1–Q204). Typos called out in the source were lightly
 * corrected; US/UK spelling was left as-is.
 */
import type { Question } from "./types";

export const QUESTIONS: ReadonlyArray<Question> = [
  // ── Personality / type axes (Q1–Q32) ────────────────────────────────────
  { id: 1, category: "type-axes", text: "You are more likely to make lists rather than rely on your memory." },
  { id: 2, category: "type-axes", text: "You are skeptical and don't find it easy to believe in things." },
  { id: 3, category: "type-axes", text: "You get bored by spending time alone." },
  { id: 4, category: "type-axes", text: "You accept things the way they are and are not unsatisfied with the status quo." },
  { id: 5, category: "type-axes", text: "You keep your workspace and home clean and tidy." },
  { id: 6, category: "type-axes", text: "You think being called \"robotic\" or \"mechanical\" is an insult." },
  { id: 7, category: "type-axes", text: "You are more energetic rather than mellow." },
  { id: 8, category: "type-axes", text: "You prefer taking multiple choice exams over writing essays." },
  { id: 9, category: "type-axes", text: "You'd consider yourself to live a more chaotic life rather than organized." },
  { id: 10, category: "type-axes", text: "Your feelings are easily hurt rather than being someone described as thick skinned." },
  { id: 11, category: "type-axes", text: "You work best in groups rather than alone." },
  { id: 12, category: "type-axes", text: "You're focused on the present, not the future." },
  { id: 13, category: "type-axes", text: "You plan far ahead rather than doing your planning last minute." },
  { id: 14, category: "type-axes", text: "You want people's respect more than their love." },
  { id: 15, category: "type-axes", text: "You get worn out at parties rather than getting fired up." },
  { id: 16, category: "type-axes", text: "You fit in more than you stand out." },
  { id: 17, category: "type-axes", text: "You like to keep your options open rather than committing." },
  { id: 18, category: "type-axes", text: "You're better at fixing things than you are at fixing people." },
  { id: 19, category: "type-axes", text: "You talk more than you listen." },
  { id: 20, category: "type-axes", text: "When you describe an event, you tell people what happened rather than how it felt." },
  { id: 21, category: "type-axes", text: "You get your work done immediately rather than procrastinating." },
  { id: 22, category: "type-axes", text: "You follow your heart more than following your head." },
  { id: 23, category: "type-axes", text: "You'd rather stay at home rather than go out on the town." },
  { id: 24, category: "type-axes", text: "You want to know the big picture rather than the details." },
  { id: 25, category: "type-axes", text: "You improvise rather than prepare." },
  { id: 26, category: "type-axes", text: "You base morality on justice rather than on compassion." },
  { id: 27, category: "type-axes", text: "You find it difficult to yell loudly in public." },
  { id: 28, category: "type-axes", text: "You prefer theory over numbers." },
  { id: 29, category: "type-axes", text: "You'd rather work hard than play hard." },
  { id: 30, category: "type-axes", text: "You are uncomfortable with emotions." },
  { id: 31, category: "type-axes", text: "You like to perform in front of other people." },
  { id: 32, category: "type-axes", text: "You like to know the \"who\", \"what\" and \"when\" rather than the \"why\"." },

  // ── Emotional intelligence (Q41–Q55) ────────────────────────────────────
  { id: 41, category: "emotional-intelligence", text: "I know when to speak about my personal problems to others." },
  { id: 42, category: "emotional-intelligence", text: "When I am faced with obstacles, I remember times I faced similar obstacles and overcame them." },
  { id: 43, category: "emotional-intelligence", text: "I expect that I will do well on most things I try." },
  { id: 44, category: "emotional-intelligence", text: "Other people find it easy to confide in me." },
  { id: 45, category: "emotional-intelligence", text: "I find it hard to understand the non-verbal messages of other people." },
  { id: 46, category: "emotional-intelligence", text: "Some of the major events of my life have led me to re-evaluate what is important and not important." },
  { id: 47, category: "emotional-intelligence", text: "When my mood changes, I see new possibilities." },
  { id: 48, category: "emotional-intelligence", text: "Emotions are one of the things that make my life worth living." },
  { id: 49, category: "emotional-intelligence", text: "I am aware of my emotions as I experience them." },
  { id: 50, category: "emotional-intelligence", text: "I expect good things to happen." },
  { id: 51, category: "emotional-intelligence", text: "I like to share my emotions with others." },
  { id: 52, category: "emotional-intelligence", text: "When I am faced with a challenge, I give up because I believe I will fail." },
  { id: 53, category: "emotional-intelligence", text: "I arrange events others enjoy." },
  { id: 54, category: "emotional-intelligence", text: "I am aware of the non-verbal messages I send to others." },
  { id: 55, category: "emotional-intelligence", text: "It is difficult for me to understand why people feel the way they do." },

  // ── Optimism (Q56–Q70) ──────────────────────────────────────────────────
  { id: 56, category: "optimism", text: "It is best not to set your sights too high in sales otherwise you might be disappointed." },
  { id: 57, category: "optimism", text: "I have a tendency to make mountains out of mole hills." },
  { id: 58, category: "optimism", text: "Rarely do I expect good things to happen when selling." },
  { id: 59, category: "optimism", text: "All in all, the world is a good place." },
  { id: 60, category: "optimism", text: "I don't believe there is much hope for the human race." },
  { id: 61, category: "optimism", text: "If you hope for something hard enough, it has a tendency to happen." },
  { id: 62, category: "optimism", text: "With enough belief, you can make anything happen in business." },
  { id: 63, category: "optimism", text: "When I undertake something new, I expect to succeed." },
  { id: 64, category: "optimism", text: "Generally I look on the brighter side of life." },
  { id: 65, category: "optimism", text: "I generally make light of my problems." },
  { id: 66, category: "optimism", text: "As time goes on, things tend to get worse." },
  { id: 67, category: "optimism", text: "It is the slow and steady sales professional that wins long term." },
  { id: 68, category: "optimism", text: "When I go to a party I expect to have a laugh." },
  { id: 69, category: "optimism", text: "I expect to achieve most of the things I want out of life." },
  { id: 70, category: "optimism", text: "Before a job interview, I'm usually confident things will go well." },

  // ── Self-esteem (Q71–Q80) ───────────────────────────────────────────────
  { id: 71, category: "self-esteem", text: "On the whole, I am satisfied with myself." },
  { id: 72, category: "self-esteem", text: "At times I think I am no good at all." },
  { id: 73, category: "self-esteem", text: "I feel that I have a number of good qualities." },
  { id: 74, category: "self-esteem", text: "I am able to do things as well as most other people." },
  { id: 75, category: "self-esteem", text: "I feel I do not have much to be proud of." },
  { id: 76, category: "self-esteem", text: "I certainly feel useless at times." },
  { id: 77, category: "self-esteem", text: "I feel that I'm a person of worth, at least on an equal plane with others." },
  { id: 78, category: "self-esteem", text: "I wish I could have more respect for myself." },
  { id: 79, category: "self-esteem", text: "All in all, I am inclined to feel that I am a failure." },
  { id: 80, category: "self-esteem", text: "I take a positive attitude toward myself." },

  // ── Assertiveness (Q81–Q92) ─────────────────────────────────────────────
  { id: 81, category: "assertiveness", text: "I am often concerned about what other people think of me." },
  { id: 82, category: "assertiveness", text: "I tend to rely on others in my sales role." },
  { id: 83, category: "assertiveness", text: "I like to avoid eye contact." },
  { id: 84, category: "assertiveness", text: "I often think that potential customers won't like me." },
  { id: 85, category: "assertiveness", text: "When with friends or a partner, I let them decide things for me." },
  { id: 86, category: "assertiveness", text: "I tend to think other people are better than me." },
  { id: 87, category: "assertiveness", text: "If I want to find out something, I will ask someone about it." },
  { id: 88, category: "assertiveness", text: "I generally feel fine in my sales role." },
  { id: 89, category: "assertiveness", text: "In general, I like my work." },
  { id: 90, category: "assertiveness", text: "I usually feel at least equal to others." },
  { id: 91, category: "assertiveness", text: "I usually like to discuss my ideas with others." },
  { id: 92, category: "assertiveness", text: "I am often commended for what I do at work." },

  // ── Growth mindset (Q93–Q95) — asked but UNSCORED ───────────────────────
  { id: 93, category: "growth-mindset", text: "Your intelligence is something very basic about you that you can't change very much." },
  { id: 94, category: "growth-mindset", text: "No matter how much intelligence you have, you can always change it quite a bit." },
  { id: 95, category: "growth-mindset", text: "You can always substantially change how intelligent you are." },

  // ── People-pleaser (Q103–Q114) ──────────────────────────────────────────
  { id: 103, category: "people-pleaser", text: "Whenever I sense that someone disagrees with my point of view, I tend to soften my position." },
  { id: 104, category: "people-pleaser", text: "I find it easy to set boundaries with most people." },
  { id: 105, category: "people-pleaser", text: "I intentionally compliment people to appear more likeable." },
  { id: 106, category: "people-pleaser", text: "I prioritize everyone else's needs no matter how it affects me." },
  { id: 107, category: "people-pleaser", text: "I work overtime to please my sales manager." },
  { id: 108, category: "people-pleaser", text: "Conflicts do not make me anxious and I do not avoid them." },
  { id: 109, category: "people-pleaser", text: "I am happy when I drive a nicer car than my peers." },
  { id: 110, category: "people-pleaser", text: "I compare myself to others." },
  { id: 111, category: "people-pleaser", text: "I put more importance on other people's feelings than on my own." },
  { id: 112, category: "people-pleaser", text: "I never give more than I take." },
  { id: 113, category: "people-pleaser", text: "I am often stuck doing things I don't want to do simply because I can't say \"No\"." },
  { id: 114, category: "people-pleaser", text: "I resent customers for not reciprocating the value I have given them." },

  // ── Comfortable talking about money (Q115–Q120) ─────────────────────────
  { id: 115, category: "comfortable-with-money", text: "I sometimes put off mentioning the price when qualifying prospects." },
  { id: 116, category: "comfortable-with-money", text: "I'd rather tell a stranger than my parent or partner what my bonus was last month." },
  { id: 117, category: "comfortable-with-money", text: "I don't know how much money is in my savings account." },
  { id: 118, category: "comfortable-with-money", text: "I'm comfortable talking about how much money I earn each year if someone asks." },
  { id: 119, category: "comfortable-with-money", text: "I'm always happy to share my product's pricing with the customer." },
  { id: 120, category: "comfortable-with-money", text: "I've never understood people who are uncomfortable talking about money." },

  // ── Personal accountability (Q121–Q125) ─────────────────────────────────
  { id: 121, category: "personal-accountability", text: "I work on tasks and projects until they are done." },
  { id: 122, category: "personal-accountability", text: "I do what I say I am going to do." },
  { id: 123, category: "personal-accountability", text: "I do what is expected even when no one is watching." },
  { id: 124, category: "personal-accountability", text: "I expect only what is earned." },
  { id: 125, category: "personal-accountability", text: "I have methods to keep myself, both personally and professionally, on track." },

  // ── Goal setting (Q152–Q156) ────────────────────────────────────────────
  { id: 152, category: "goal-setting", text: "I love setting new years goals each year." },
  { id: 153, category: "goal-setting", text: "I set personal goals but never goals in my sales job." },
  { id: 154, category: "goal-setting", text: "I tend to achieve most of my new year's resolutions." },
  { id: 155, category: "goal-setting", text: "Every quarter, I know roughly which deals in my pipeline are going to close." },
  { id: 156, category: "goal-setting", text: "I don't have my goals written out on paper." },

  // ── Objection handling (Q181–Q184) ──────────────────────────────────────
  { id: 181, category: "objection-handling", text: "You can defeat or move past any sales objection that you're given." },
  { id: 182, category: "objection-handling", text: "Prospects regularly mess up the flow of your conversations with their objections." },
  { id: 183, category: "objection-handling", text: "You know how to deal with the top 5 sales objections you commonly face." },
  { id: 184, category: "objection-handling", text: "You're unable to by-pass sales objections." },

  // ── Influence (Q185–Q188) ───────────────────────────────────────────────
  { id: 185, category: "influence", text: "You can usually nudge a buyer to commit to things." },
  { id: 186, category: "influence", text: "You're capable in influencing most people." },
  { id: 187, category: "influence", text: "You choose activities and your friends join you and follow your lead." },
  { id: 188, category: "influence", text: "You struggle to influence people to do what you want them to do." },

  // ── Industry expert (Q189–Q192) ─────────────────────────────────────────
  { id: 189, category: "industry-expert", text: "You are known within your company as someone with strong product knowledge." },
  { id: 190, category: "industry-expert", text: "Your customers never call you for non-sales, industry advice." },
  { id: 191, category: "industry-expert", text: "You have spoken on stage or written for industry publications." },
  { id: 192, category: "industry-expert", text: "Few of your prospects follow you on social media." },

  // ── Storytelling (Q193–Q196) ────────────────────────────────────────────
  { id: 193, category: "storytelling", text: "When you speak, people stop to listen." },
  { id: 194, category: "storytelling", text: "You don't know specific steps that make up a strong story." },
  { id: 195, category: "storytelling", text: "You always have an anecdote to share with your prospects." },
  { id: 196, category: "storytelling", text: "When out with friends, the stories you tell fall flat and have a disappointing ending." },

  // ── Negotiations (Q197–Q200) ────────────────────────────────────────────
  { id: 197, category: "negotiations", text: "You have a structured, logical approach when negotiating with others." },
  { id: 198, category: "negotiations", text: "You get emotional when you negotiate with others." },
  { id: 199, category: "negotiations", text: "I never back down on price when negotiating with prospects." },
  { id: 200, category: "negotiations", text: "When debating, you must win at all costs. Even if the other person is made to look stupid." },

  // ── Productivity (Q201–Q204) ────────────────────────────────────────────
  { id: 201, category: "productivity", text: "Generally, I'm in control of the tasks I must complete each day." },
  { id: 202, category: "productivity", text: "I sometimes feel overwhelmed with the amount of work I'm expected to do." },
  { id: 203, category: "productivity", text: "I have a system for recording and ticking off the sales tasks I must complete each day." },
  { id: 204, category: "productivity", text: "I sometimes struggle to prioritise my important sales tasks vs less important but urgent tasks." },

  // ── Simplification (Q205–Q208) — new ────────────────────────────────────
  { id: 205, category: "simplification", text: "You can explain your offer in a single, simple sentence a buyer immediately understands." },
  { id: 206, category: "simplification", text: "Your explanations of what you sell tend to be long and full of detail." },
  { id: 207, category: "simplification", text: "You strip away jargon so prospects grasp the value quickly." },
  { id: 208, category: "simplification", text: "Prospects often seem confused after you describe your product." },

  // ── Identifying key accounts (Q209–Q212) — new ──────────────────────────
  { id: 209, category: "identifying-key-accounts", text: "You know exactly which accounts in your pipeline are worth most of your time." },
  { id: 210, category: "identifying-key-accounts", text: "You give every prospect the same attention regardless of their potential value." },
  { id: 211, category: "identifying-key-accounts", text: "You deliberately prioritise the few accounts that could move your numbers most." },
  { id: 212, category: "identifying-key-accounts", text: "You struggle to tell your high-value opportunities apart from the rest." },

  // ── Caveman brain (Q213–Q216) — new ─────────────────────────────────────
  { id: 213, category: "caveman-brain", text: "When a prospect pushes back hard, you stay calm rather than react defensively." },
  { id: 214, category: "caveman-brain", text: "Rejection in sales triggers a strong emotional reaction in you." },
  { id: 215, category: "caveman-brain", text: "You can sit with the discomfort of a tense negotiation without flinching." },
  { id: 216, category: "caveman-brain", text: "Fear of a \"no\" often stops you from asking for the sale." },

  // ── Habits (Q217–Q220) — new ────────────────────────────────────────────
  { id: 217, category: "habits", text: "You have consistent daily routines that move your sales forward." },
  { id: 218, category: "habits", text: "Your sales activity is sporadic rather than habitual." },
  { id: 219, category: "habits", text: "You do the small, important sales tasks every day without needing to be told." },
  { id: 220, category: "habits", text: "You rely on motivation rather than routine to get your selling done." },
];

/**
 * Presentation order — currently the bank's own order. Per the content spec
 * the respondent sees items in a fixed order with no category labels, so the
 * UI just iterates this array and chunks it into steps.
 *
 * Keeping it as a derived constant (vs. inline iteration) leaves room to
 * later interleave categories to reduce response bias without touching the
 * scoring engine.
 */
export const PRESENTATION_ORDER: ReadonlyArray<number> = QUESTIONS.map((q) => q.id);

export const QUESTIONS_BY_ID: ReadonlyMap<number, Question> = new Map(
  QUESTIONS.map((q) => [q.id, q] as const),
);

export const TOTAL_QUESTIONS = QUESTIONS.length;
