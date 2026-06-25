/**
 * SalesCode trait copy — RESPONDENT (salesperson) variant.
 *
 * Populated from the canonical "Sales Skills and Personality Traits
 * (Salespeople)" document. Same shape and key set as the owner version
 * in copy.ts so a renderer can swap by audience without any field-level
 * branching. whatItMeans = "Definition" line. whyItMatters = "Why"
 * paragraph. strengthLine = the declarative line under the Positive
 * version, growthLine = under the Negative version.
 */
import type { TraitCopyEntry, TraitKey } from "./types";

export const TRAIT_COPY_RESPONDENT: Record<TraitKey, TraitCopyEntry> = {
  "people-pleaser": {
    key: "people-pleaser",
    name: "People pleaser",
    whatItMeans:
      "An emotional need to please others often at the expense your own needs or desires.",
    whyItMatters:
      "Whilst the act of \"people pleasing\" might on the surface seem like a positive trait to have, it isn't. B2B selling is all about giving and taking value. People pleasers tend to give in abundance and expect the other party to respond in kind. When they do not, they become passive aggressive towards them rather than being assertive in making their asks.",
    strengthLine: "You are not a people pleaser.",
    growthLine: "You are a people pleaser.",
  },
  "comfortable-with-money": {
    key: "comfortable-with-money",
    name: "Comfortable talking about money",
    whatItMeans:
      "The ability to talk about money without emotional attachment. Money is just a tool.",
    whyItMatters:
      "People who are not comfortable talking about money will allow their emotions to interfere when conducting business. They discount the value they give to potential partners and they get nervous when it comes time to discuss finances. This transfers to the people they're talking to and gives them an uneasy feeling about doing business with them.",
    strengthLine: "You are comfortable talking about money.",
    growthLine: "You are not comfortable talking about money.",
  },
  "introvert-extrovert": {
    key: "introvert-extrovert",
    name: "Introvert / Extrovert",
    whatItMeans:
      "An extrovert gains energy from spending time with other people. Whereas introverts gain energy from spending time alone.",
    whyItMatters:
      "B2B sales is all about engaging other people. Extroverts have the ability to gain energy from their countless, daily selling interactions. This enables them to gain momentum and confidence as the day goes on which allows them to break through any barriers that might crop up. Introverts don't get the time and space they need to recover during a busy workday and so their performance can suffer.",
    strengthLine: "You are more extroverted.",
    growthLine: "You are more introverted.",
  },
  "emotional-intelligence": {
    key: "emotional-intelligence",
    name: "Emotional intelligence",
    whatItMeans:
      "The capacity to be aware of and to control both your and other peoples emotions. Additionally the ability to handle interpersonal relationships judiciously and empathetically.",
    whyItMatters:
      "The ability to manage your emotions in a complex and fast moving sales process leads you to act calm and collected. When others see this in you, they respond in kind and so deals get made much faster as the sale is being made on logical rather than emotional grounds.",
    strengthLine: "You have great levels of emotional intelligence.",
    growthLine: "You do not have high levels of emotional intelligence.",
  },
  "optimism": {
    key: "optimism",
    name: "Optimism",
    whatItMeans:
      "Optimism is the inclination to favour positive outcomes when it's not possible to accurately predict the future.",
    whyItMatters:
      "Optimistic sales professionals are more likely to manage rejection and adversity better than a pessimistic individuals. On top of this, research shows that they are also 40% more likely to get a promotion in the next 12 months, six times more likely to be highly engaged at work and five times less likely to burnout than pessimists.",
    strengthLine: "You are very optimistic.",
    growthLine: "Are are not very optimistic.",
  },
  "self-esteem": {
    key: "self-esteem",
    name: "Self esteem",
    whatItMeans: "The trait of having confidence in your own self worth and abilities.",
    whyItMatters:
      "Individuals with high levels of self esteem value their own self worth and the impact they have on other people. This leads to more confidence in selling interactions and the perceived value being exchanged is rated as much higher than someone with average levels of self esteem.",
    strengthLine: "You have high levels of self esteem.",
    growthLine: "You do not have high levels of self esteem.",
  },
  "assertiveness": {
    key: "assertiveness",
    name: "Assertiveness",
    whatItMeans:
      "Being able to stand up for your own or other people's rights in a calm and positive way, without being either aggressive or passively accepting 'wrong'.",
    whyItMatters:
      "If you can not assertively ask for value to be returned after you have given it, you will never succeed in modern B2B sales. If you're unable to be assertive with your thoughts and opinions in the marketplace, nobody will ever listen to you.",
    strengthLine: "You have strong levels of assertiveness.",
    growthLine: "You are not very assertive.",
  },
  "personal-accountability": {
    key: "personal-accountability",
    name: "Personal accountability",
    whatItMeans:
      "The belief that you are fully responsible for your own actions and consequences.",
    whyItMatters:
      "If you don't believe that you are responsible for your actions, then you will forever blame others for your situation. When you know that your actions create your environment and that you control your actions, anything is possible.",
    strengthLine: "You have strong levels of personal accountability.",
    growthLine: "You have weak levels of personal accountability.",
  },
  "goal-setting": {
    key: "goal-setting",
    name: "Goal setting",
    whatItMeans:
      "Goal setting is the process of identifying something that you want to accomplish and establishing measurable goals and timeframes to get there.",
    whyItMatters:
      "If you don't know where you're going, how are you ever going to get there? You need to set yearly goals so you have both a destination to travel to but also a road map to get there too.",
    strengthLine: "You have a goal setting process.",
    growthLine: "You do not have an effective goal setting process.",
  },
  "objection-handling": {
    key: "objection-handling",
    name: "Objection handling",
    whatItMeans:
      "The ability to resolve or move past common sales objections that prospects will through at you to buy themselves time or get you off the phone.",
    whyItMatters:
      "If a prospect can stop you in your tracks with just a few words, before you've even had the opportunity to share your value with them, you're going to miss out a large percentage of your market. You must be able to defuse sales objections and answer or avoid them when they come up.",
    strengthLine: "You able to handle objections.",
    growthLine: "You are not able to handle objections.",
  },
  "influence": {
    key: "influence",
    name: "Influence",
    whatItMeans:
      "Influence is the subtle skill of nudging someone's decision making in a specific direction.",
    whyItMatters:
      "We all procrastinate on doing things that we know are good for us. The ability to influence your prospect to break through the status quo and take action is a valuable asset. The goal isn't to bully your prospects into signing contract, but gently nudge them past any slight bits of friction they face throughout the buying journey.",
    strengthLine: "You are able to influence others.",
    growthLine: "You are not strong at influencing others.",
  },
  "industry-expert": {
    key: "industry-expert",
    name: "Industry expert",
    whatItMeans:
      "You are known as in expert in your industry through sharing insights and publications.",
    whyItMatters:
      "A huge part of winning B2B sales comes from the prospect trusting the seller. When you have know expertise in your industry, you've already built trust at distance and so can dramatically shorten your sales cycles.",
    strengthLine: "You are known as an industry expert.",
    growthLine: "You are not an industry expert.",
  },
  "storytelling": {
    key: "storytelling",
    name: "Storytelling",
    whatItMeans:
      "Storytelling is the interactive art of using words and actions to reveal the elements and images of a story while encouraging the listener's imagination.",
    whyItMatters:
      "Your prospects don't care for your opinions. They do care about how other people, who are similar to themselves, break through their pain points and reach a bigger, brighter, bolder reality on the other side. The skill of storytelling allows you to tap into an ancient part of your prospects brain and teach them that overcoming their pain and getting to a better reality is possible.",
    strengthLine: "You are amazing at storytelling.",
    growthLine: "You struggle to storytell effectively.",
  },
  "negotiations": {
    key: "negotiations",
    name: "Negotiations",
    whatItMeans: "Negotiating is the process of exchanging value to get a sale completed.",
    whyItMatters:
      "Often, prospects find it hard to assign a dollar amount to the value that you provide. This is where sellers need to be able to negotiate and communicate the value that you provide. Additionally, sometimes there are true intangibles within a product offering. Therefore, you must be able to negotiate the value of these intangibles with each prospect you engage to help them become a buyer.",
    strengthLine: "You are a sound negotiator.",
    growthLine: "You are a weak negotiator.",
  },
  "productivity": {
    key: "productivity",
    name: "Productivity",
    whatItMeans:
      "Sales productivity is the volume of units of essential work that gets completed within a fixed period of time.",
    whyItMatters:
      "When salespeople know who they're selling to, the value they offer and how to get in front of these prospects. The next biggest leverage point they have to earn more commissions is to do more of the right stuff. You could extend the number of hours you work to a certain extent. But eventually, you need to more work, inside your workday, by becoming more productive.",
    strengthLine: "You are highly productive.",
    growthLine: "You are not very productive.",
  },
  "simplification": {
    key: "simplification",
    name: "Simplification",
    whatItMeans:
      "The ability to look at all the options and implement the quickest pathway between two places.",
    whyItMatters:
      "There are unlimited things you can do to find and close new business. When sellers can identify what is absolutely necessary and then eliminate everything else they become deadly efficient with their sales activities.",
    strengthLine: "You are great at simplifying.",
    growthLine: "You are poor at simplifying.",
  },
  "identifying-key-accounts": {
    key: "identifying-key-accounts",
    name: "Identifying key accounts",
    whatItMeans:
      "A key-account is a prospect that has insane upside if they close. One or two of these a year is easily enough to smash a quota.",
    whyItMatters:
      "The ability to identify a potential key account is often the difference between a decent year and the top of the leaderboard. The goal is to find prospects that you have some relationship but massive potential in new revenue.",
    strengthLine: "You are good at identifying key accounts.",
    growthLine: "You are weak at identifying key accounts.",
  },
  "caveman-brain": {
    key: "caveman-brain",
    name: "Caveman brain",
    whatItMeans:
      "The caveman brain is the part of your brain that throws out near instantaneous emotional responses to its environment.",
    whyItMatters:
      "The caveman brain used to be incredibly important to humans... when we were living in caves. In modern society the ability to suppress the often irrational and always emotional outbursts of the caveman brain will all you to start logical, rational and influence your prospects.",
    strengthLine: "You are in control of your caveman brain.",
    growthLine: "You lack control of your caveman brain.",
  },
  "habits": {
    key: "habits",
    name: "Habits",
    whatItMeans:
      "When you complete a selling activity each day, without stressing about it, with minimal fuss, it has become habitualised.",
    whyItMatters:
      "The more you can turn your boring sales activities into habits, the more likely you are to complete them over the long term and the less draining they will be. The world's highest performers do the same, habitualised tasks every single day and dominate the sellers who have to leverage willpower to do the same tasks every so often.",
    strengthLine: "You have positive selling habits.",
    growthLine: "You have weak selling habits.",
  },
};
