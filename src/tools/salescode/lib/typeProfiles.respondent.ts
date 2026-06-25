/**
 * SalesCode archetype profiles — RESPONDENT (salesperson) variant.
 *
 * Populated from the canonical 16-archetype salesperson document. Same
 * shape and keys as the owner version in typeProfiles.ts so a renderer
 * can swap variants without any field-level branching.
 */
import type { SalesCodeType, TypeProfile } from "./types";

export const TYPE_PROFILES_RESPONDENT: Record<SalesCodeType, TypeProfile> = {
  "INTJ": {
  "code": "INTJ",
  "name": "The Architect",
  "tagline": "The Strategic Builder",
  "intro": [
    "Your SalesCode forms just 2% of the population and in women this personality type is particularly rare, falling under 1% of all females. Because of this, it is often a challenge for individuals like you to find like-minded people to spend time with.",
    "You are imaginative yet decisive, a big thinker yet a private person, amazingly curious and you do not squander your natural energy.",
    "You have a thirst for knowledge and this often shows itself in early life. You were likely given the title of a bookworm as a child. Whilst this may have been intended as an insult, you were probably proud of the label as you enjoy expanding your knowledge of the world.",
    "You rather talk about how you are going to execute on a brilliant sales action plan, rather than sharing opinions on useless, uninteresting gossip around the water cooler.",
    "You tend to believe that with effort, consideration and intelligence, nothing is impossible. However, you will often blame not hitting targets on the people around them who are too lazy or short-sighted to actually help you achieve these fantastic results.",
    "It may seem at times that you are hellbent on rebuilding every single system that you come into contact with and and you enjoy a sense of perfectionism as well.",
    "You are self-confident and have an aura of mystery around you and your ideas. You’ll tend to use willpower and forceful personality to get things done. It may seem at times that you are hellbent on rebuilding every single system that you come into contact with and and you enjoy a sense of perfectionism as well.",
    "This is all well and good but one area where you could stumble upon is social interactions. You often find small talk difficult or even having to shake hands at the beginning of a meeting downright stupid.",
    "You typically move through life as if it was a giant chessboard, constantly shifting the pieces around with consideration and intelligence and always try new tactics and strategies to outmanoeuvre your peers to remain in control."
  ],
  "pullQuote": "You have a thirst for knowledge and this often shows itself in early life.",
  "peopleLikeYou": [
    "Christopher Nolan",
    "Elon Musk",
    "Vladimir Putin",
    "Michelle Obama"
  ],
  "strengths": [
    {
      "lead": "Imaginative and strategic mind",
      "body": "You pride yourself on the power of your mind and you take every opportunity to improve your knowledge. You are insatiably curious and always up for an intellectual challenge. You have the ability to see things from many perspectives."
    },
    {
      "lead": "High self-confidence",
      "body": "You trust your rationalism above all else and so when you come to a conclusion you have no reason to doubt your feelings. This creates an honest and direct style of communication."
    },
    {
      "lead": "Independent and decisive",
      "body": "When creativity, logic and your confidence come together it creates an individual who can take responsibility for their own actions. Authority figures don’t impress you, nor does tradition or how popular something is. Either something is rational and right or it’s wrong. You apply this to your arguments as well as your own behaviour. You stay calm and detached from emotionally charged conflicts which is powerful way to negotiate in business."
    },
    {
      "lead": "Determined",
      "body": "If something peaks your interest, you can be astonishingly dedicated to your work and put in long hours and intense effort to see an idea through. However, this drive for efficiency can also lead to essentially elaborate laziness where you will find ways to bypass seemingly redundant processes."
    },
    {
      "lead": "Open-mindedness",
      "body": "All this rationalism leads to you being open to new ideas if they are supported by logic, even if they prove some of your previous ideas wrong. You are likely to be fairly liberal from a social perspective."
    }
  ],
  "weaknesses": [
    {
      "lead": "Arrogant",
      "body": "You are perfectly capable of carrying your confidence too far, falsely believing all of your logic and hype. You can also close yourself off to other people’s opinions if you believe them to be intellectually inferior to you. Clearly this is not a good look if you are dealing with and selling to someone who is more focused on their emotions and feelings and so you should focus on being more open to other ways of communicating."
    },
    {
      "lead": "Judgemental",
      "body": "You have complete confidence in your thought process because what you’re saying is likely correct – at least in theory. In practice this isn’t always the case and so you must be open to hearing other people’s thoughts and opinions before sharing your own."
    },
    {
      "lead": "Overly analytical",
      "body": "Having analytical powers is clearly a strength but it can fall painfully short when logic doesn’t rule such as with human relationships. Unfortunately most humans are emotional creatures. Whilst having a strong business relationship, hence an emotional connection, isn’t always necessary to get the deal done, often it can make things easier."
    },
    {
      "lead": "Doesn’t like highly structured environments",
      "body": "Blindly following precedents and rules without the ability to understand them is likely distasteful to you. You don’t get along well with authority figures who blindly uphold these laws and rules without understanding them either. You can make your life more difficult than it needs to be by fighting these individuals rather than just accepting at least some of the rules."
    }
  ],
  "businessAndSales": [
    "Professional competence is an area in which you will shine brilliantly. You have the capacity to digest difficult and complex theories and turn them into actionable ideas and strategies. You are able to walk into a selling situation, ignore the noise, identify the core thread and then re-weave this into a complex and useful solution.",
    "Your biggest challenge is that in order to innovate you have to be heard. You need to be working with someone who has a friendly ear, and building rapport with these likely authority figures is not in your list of core strengths. You tend to prefer to work alone or at the very most in small groups. You likely focus best without questioning colleagues or loud and obnoxious potential partners.",
    "Therefore, your best suited to sales positions where you are the Lone Wolf, a full stack sales professional who is both prospecting and account managing complex partners. You’ll only accept competent leadership from your sales management and you will reject and ignore authority from people who you feel might hold you back.",
    "You need to be working in a complex environment as you push to further your reputation, knowledge and evolve into a position where you’re facing new challenges each day. Whilst it is likely you do not care for the spotlight, you do enjoy staying in control of your ideas and may end up in influential roles such as a sales engineer or sales enablement specialist.",
    "You work best when you tackle intellectually challenging sales work, as a true consultant with minimal outside interference. Sales managers will annoy you with their time-consuming reporting and other nonsense. You want to crush your sales target not because it may lead to a promotion but because of its own intrinsic merit.",
    "Finally, you are a natural leader and this shows in your management style. You value innovation and effectiveness more than just about any quality and will gladly cast aside protocol or even your own beliefs if you are presented with rational arguments of why things should change. These are powerful traits for an extremely effective manager or leader of a fast-moving organisation."
  ],
  "closingQuote": "Your biggest challenge is that in order to innovate you have to be heard."
},
  "INTP": {
  "code": "INTP",
  "name": "The Logician",
  "tagline": "The Problem-Solving Owner",
  "intro": [
    "Your SalesCode is rare making up only 3% of the population which is actually a good thing for you as there is nothing that makes you more unhappy than being “common”.",
    "You pride yourself on your inventiveness, creativity, unique perspective and powerful intellect. Putting sales to one side for a moment, your people with your SalesCode have been responsible for many incredible scientific discoveries throughout history.",
    "You love finding patterns and spotting discrepancies. Because of these fundamental traits you can spot a white lie a mile away. You see right through deception especially in logical environments like the business world.",
    "However, it makes it somewhat ironic that what you tell others should be taken with a grain of salt as well. It’s not that you are dishonest but you tend to share thoughts before they are fully developed. You are not “matter of fact” when you speak, rather you talk to others to use them as a sounding board to develop your ideas and theories.",
    "This might make you appear a unreliable but the reality is that no one is more enthusiastic or more capable of spotting and solving a business problem than you are. Just don’t tell your sales manager to expect punctual progress reports on the project as they’ll never materialise.",
    "You sometimes appear to drift off into an unending daydream but it is due to the fact that your thought process is unceasing.",
    "You sometimes appear to drift off into an unending daydream but it is due to the fact that your thought process is unceasing. Your mind is buzzing with ideas from the moment that you wake up. You should be conscious that this constant thinking can have an effect of making you look detached. The reality is quiet the opposite though as it’s likely you’re having a fully-fledged debate in your own mind.",
    "You can be relaxed and friendly when you’re with people that you know or individuals that share your interests with. However this can be replaced by overwhelming shyness when you are among unfamiliar faces. This is clearly an issue for a B2B sales professional like yourself and is something that needs to be worked on over time.",
    "Additionally, you are unlikely to understand emotional complaints from potential partners or management very clearly. It’s safe to bet that your friends don’t come to you for emotional support when they need it. You would much rather make a series of logical suggestions for them to resolve their underlying issues, rather than being an emotional punching bag for them to gas out on beating up.",
    "One thing that really holds you back is your fear of failure. You are prone to reassessing your own thoughts and theories, worrying about what you’ve missed, over analysing each piece of the puzzle to the point in which you can stagnate and get lost. Overcoming this self-doubt is the greatest challenge you will face in becoming an incredible B2B sales professional."
  ],
  "pullQuote": "You love finding patterns and spotting discrepancies. Because of these fundamental traits you can spot a white lie a mile away.",
  "peopleLikeYou": [
    "Bill Gates",
    "Albert Einstein",
    "Neo from the matrix",
    "Lord Varys from Game of thrones"
  ],
  "strengths": [
    {
      "lead": "Great analysis and abstract thinking",
      "body": "You view the world as a big, complex machine and you recognise that like any, machine all the parts are interrelated. You excel in analysing these connections and seeing how seemingly unrelated factors tie in with each other in ways that would bewilder other people."
    },
    {
      "lead": "Original",
      "body": "All these connections that you see lead to distinctly original ideas. These ideas may seem counter-intuitive to others at first but they always prove remarkable if you can get over the stumbling block of communicating them to other people."
    },
    {
      "lead": "Open-minded",
      "body": "You couldn’t possibly make all his connections if you thought you knew it all or you were arrogant. You are highly receptive to alternative theories as long as they are supported by logic and fact."
    },
    {
      "lead": "Honest and straightforward",
      "body": "You often don’t go around intentionally hurting other people’s feelings but you do believe that truth is the most important factor. So if someone challenges you on truth, you will give them more truth in return."
    }
  ],
  "weaknesses": [
    {
      "lead": "Very private",
      "body": "You see your surroundings as an extension of your thoughts. As you will fight violently to protect your intellectual space, you will attempt to control your surroundings and so avoid being in the presence of individuals that are disruptive. This can make you appear shy in social situations. Clearly this is an issue if you need to be meeting with people in person to do business."
    },
    {
      "lead": "Insensitive",
      "body": "You can get so caught up in your logic that you forget any kind of emotional consideration when engaging with others. You may dismiss people’s thoughts when all they’re trying to do is build rapport and get to know you. Purely emotional situations are often utterly puzzling to you and your lack of sympathy can offend others."
    },
    {
      "lead": "Absent-minded",
      "body": "When your interest is captured, your absence can go beyond just not wanting to be around other people, to include avoiding the entire physical world. It is easy for you to become infatuated with solving a problem so much so that you skip meals, suffer from a lack of sleep and even neglect your own health as you muse on the issue."
    },
    {
      "lead": "Second-guessing",
      "body": "You often remain so open to new information that you never commit to a decision and action at all. You’re likely to constantly revise or just quit working with potential partners before you’ve given the deal chance to materialise."
    }
  ],
  "businessAndSales": [
    "You are eccentric and independent which is typically the opposite of what is desirable for corporate positions. With that said, your interest in exploring and building models for underlying principles and ideas makes you naturally very good at mathematics, system analytics an science in general. This means that if you can sell within a very technical environment, perhaps to other people who have similar SalesCode to yourself, such as computer programmers, you can do very well in B2B sales.",
    "Additionally, as you live primarily in your own head and have little interest in social distractions like chitchat and motivational speeches from sales managers who have no idea what they’re talking about… you will work better in a flatter workplace hierarchy. Whether that be a small technical start-up or selling into verticals such as medical devices, forensics or where laboratory research is being done. It is unlikely that you’re going thrive in a sales environment where you must provide the potential partner with a high degree of emotional satisfaction.",
    "With all that said, business is growing more and more complex every day. In this complexity, with machine learning and artificial intelligence there is going to be more room for individuals like you that are capable of putting together a novel approach to selling. Your goal is to smile, shake a hand, survive the awkwardness just long enough to establish yourself as a brilliant innovator.",
    "The running theme for you is a desire for solitude, a need for intellectual stimulation and the satisfaction of putting the final piece of puzzle into place. You will struggle in any sales role that you do not get access to complex processes and then are given the spotlight to winning the business and solving the potential partners problem yourself.",
    "Finally, whilst this may seem counter-intuitive and you may scoff at the notion what you would function better when paired with another person… If you can partner up in your job with someone who is an implementer and someone who can help your ideas see the light of day, then this individual will ensure that no stroke of your sales genius will go unnoticed."
  ],
  "closingQuote": "In this complexity, with machine learning and artificial intelligence there is going to be more room for individuals like you that are capable of putting together a novel approach to selling."
},
  "ENTJ": {
  "code": "ENTJ",
  "name": "The Commander",
  "tagline": "The Dominant Market Builder",
  "intro": [
    "You are a natural born leader. Individuals like you embody the gifts of charisma, confidence and are able to project authority in a way that draws people together behind a common goal.",
    "However, unlike people you will meet in business who are more emotionally-inclined, you are likely ruthless with your level of rationality and determination to achieve whatever goals you set for yourself.",
    "Perhaps it is best that you only make up 3% of the population as you may overwhelm the more timid and sensitive individuals that make up the rest of the world. If there’s anything that you love, it’s a big challenge, and you firmly believe that given enough time and resources you can achieve any goal.",
    "This makes commanders incredible B2B sales professionals and entrepreneurs. You have the ability to think strategically and hold a long-term focus while executing each step of your plan with determination and precision. All these traits lead to an outcome of a powerful potential business leader.",
    "Your determination is often a self-fulfilling prophecy as you are able to push towards your goals with sheer willpower. When other people might give up, your extroverted nature means that others are likely to push alongside you, achieving spectacular business results in the process.",
    "You have to be careful when at the negotiation table though because whether it’s in the corporate environment or even just buying a new car, you can be dominant, relentless and unforgiving. This isn’t because you’re cold-hearted or vicious, it’s more because you can get wrapped up in the challenge of beating someone, pushing them until they can’t keep up, rather than looking for the best end result for everyone.",
    "Because of your extroverted nature there is likely a distance between you and your emotions, especially if you’re in public.",
    "Emotional intelligence isn’t necessarily your strong suit. Because of your extroverted nature there is likely a distance between you and your emotions, especially if you’re in public. Particularly in a professional environment, you run the risk of crushing the sensitivities of those around you who you view as being ineffective, incompetent or lazy.",
    "To you, people who are more emotional are weak. It is important that you are conscious when you feel this wave of authority and want to belittle these individuals because you will absolutely depend on them if you’re going to have a functioning team around you to achieve your goals.",
    "You are a true powerhouse, you cultivate an image of being a larger-than-life. Remember though that this stature doesn’t just come from your own actions in B2B sales, it comes from the team around you and the product you’re selling. Even if you have to fake it until you make it emotionally, when you put the skill of emotional intelligence alongside your other strengths, you’ll be rewarded with deep satisfying relationships and all the challenging victories you could possibly handle."
  ],
  "pullQuote": "If there’s anything that you love, it’s a big challenge, and you firmly believe that given enough time and resources you can achieve any goal.",
  "peopleLikeYou": [
    "Steve Jobs",
    "Gordon Ramsay",
    "Harrison Ford",
    "Tony soprano from the Sopranos"
  ],
  "strengths": [
    {
      "lead": "Efficient",
      "body": "You see inefficiency not just as a problem in its own right but something that pulls time and energy from your future goals. You will want to root out inefficiencies that you see in your potential partners work flows too and this is a powerful way to add value to them."
    },
    {
      "lead": "Energetic",
      "body": "Rather than finding the B2B sales process taxing, you are energised by it and you genuinely enjoy leading your team and your potential partners forward as you implement your plan of action with them."
    },
    {
      "lead": "Self-confident",
      "body": "You couldn’t do any of this if you were plagued by self-doubt. You trust your own ability, you’re happy to share your opinions and you believe in your capacity as a sales professional."
    },
    {
      "lead": "Strong-willed",
      "body": "You don’t give up when the going gets tough. You will make the extra calls that your competition unwilling to make. Nothing is quite as satisfying to you as breaking through to that potential partner that no one else has managed to do business with."
    },
    {
      "lead": "Strategic thinking",
      "body": "You exemplify the difference between moments of crisis management and navigating the challenges of a bigger plan. You examine every angle of a problem and don’t just resolve to issues in the moment but focus on the whole sales process too."
    },
    {
      "lead": "Charismatic and inspiring",
      "body": "These qualities combine to create individuals who are able to inspire and invigorate others. People want you to be their leader and this is a tool you should be leveraging to smash through your ambitious goals that could never be done alone."
    }
  ],
  "weaknesses": [
    {
      "lead": "Stubborn",
      "body": "All this confidence and willpower can sometimes go too far and you are capable of digging in your heels and trying to win every debate, when often this is not necessary to win the war."
    },
    {
      "lead": "Intolerance",
      "body": "You are notoriously unsupportive of any idea that distracts you from your primary goal. Even more so if these ideas are based on emotional considerations rather than logic."
    },
    {
      "lead": "Impatient",
      "body": "Some of your potential partners and internal stakeholders need more time to think than about big issues than what you do. You feel like this is an intolerable delay and you often misinterpret this thinking time as stupidity or disinterest."
    },
    {
      "lead": "Poor handling of emotions",
      "body": "Your speed of taking action, alongside your assumed supremacy and violent rationalism forces you distance yourself from your own emotional expression. Individuals like you often trample on other people’s feelings and can inadvertently hurt their partners and their friends especially in emotionally charged situations. If you’re in an emotionally charged state such as a negotiation, you should think very carefully about the words come out of your mouth."
    }
  ],
  "businessAndSales": [
    "In a business environment where boldness and drive truly matter, you are as suited to working B2B sales as you are to be the respected leader of an enterprise organisation. No other combination of SalesCode likes being in charge as much as you do.",
    "Structure and order are key in your day-to-day sales success and if somebody that you’re working with gets sloppy or holds you back with their incompetence, laziness or inefficiency you are likely come down hard. You pursue your goals with a singular vision and have strict standards for yourself and the others around you. This makes you excellent at developing corporate strategy and your logical clarity of thought is perfectly suited to selling to like minded individuals such as the C-suite or lawyers for example.",
    "If you are in a office-based role, your workplace is very likely your natural habitat. Your clear efficiency and communications are valued by the people you work with, your leadership skills are admired and your ability to get things done is unrivalled.",
    "With that being said there are some situations that you will thrive in more than others. One of which is sales management or general leadership. This is because subordinate positions are often challenging to you. Your take a lot of active management from your sales manager to ensure that you are satisfied and engaged and so there can be friction in this relationship."
  ],
  "closingQuote": "Your clear efficiency and communications are valued by the people you work with, your leadership skills are admired and your ability to get things done is unrivalled."
},
  "ENTP": {
  "code": "ENTP",
  "name": "The Debater",
  "tagline": "The Market-Disrupting Owner",
  "intro": [
    "Your SalesCode has made you become the ultimate devil’s advocate. You thrive on the process of shredding other peoples arguments and undoing their false beliefs. You don’t necessarily do this because you are trying to achieve some deeper purpose or strategic business goal, you often do this because it’s fun.",
    "You are particularly suited to stressful selling positions because they give you a chance to exercise your effortlessly quick wit and broad accumulated knowledge. You have a capacity for connecting lots of different ideas to prove a specific point.",
    "When you play devil’s advocate it helps people with your SalesCode to not only develop a better sense of other people’s reasoning but to understand their opposing ideas since you need to understand their position to argue against them.",
    "This shouldn’t be confused with a goal of trying to come to a mutual understanding. You are on a quest for knowledge and there is no better way to help attack and defend an idea from every angle than to know as much about it as possible.",
    "You take great pleasure in being the underdog and you enjoy the mental exercise found in questioning the prevailing mode of thought. This makes you an irreplaceable member in B2B sales team when a potential partner has a problem that needs a new paradigm to solve. You can shake things up and point them in clever new directions.",
    "You love to brainstorm and think big, but you will avoid doing the grunt work at all costs.",
    "However, you’re likely miserable when you have to managing the day-to-day mechanics actually implementing your own suggestions. You love to brainstorm and think big, but you will avoid doing the grunt work at all costs.",
    "Your SalesCode makes up about 3% of the population which puts you at a competitive advantage over the others. Although you’re happy to go alone, you also work well in teams if you allow yourself to be the creator of strategy and then have people to support you in implementing it.",
    "Your ability to debate can be a vexing for some. Often it is appreciated when other people call upon it, but it can fall painfully flat and you can step on the toes of your potential partners inadvertently when they just want to talk with you without the battling.",
    "You have an unyielding strong trait of honesty as you don’t like to mince your words and you care little about being seen as sensitive or compassionate. People who have similar SalesCode will get along with you well, whilst more sensitive individuals who are conflict averse, will even tell white lies over sharing unpleasant truths, and this will not sit well with you.",
    "You end up arguing more than you mean to and you may burn bridges inadvertently. You have little tolerance of being coddled and dislike it when people, especially potential partners, beat around the bush.",
    "You have a longer road than most to fully harnessing your natural abilities in business. Your intellectual independence and free-form vision are tremendously valuable when you are in charge. But implementing the follow through and actually taking action is what leads to success and this is a skill that you will have develop as you move through your career.",
    "It is not enough to just win arguments, you have to build consensus. You can’t just play devil’s advocate, you need to learn how to really embrace your potential partners way of thinking to influence rather than run straight through them."
  ],
  "pullQuote": "You are on a quest for knowledge and there is no better way to help attack and defend an idea from every angle than to know as much about it as possible.",
  "peopleLikeYou": [
    "Tom Hanks",
    "Thomas Edison",
    "Capt. Jack Sparrow of Pirates of the Caribbean",
    "Tyrion Lannister from Game of thrones"
  ],
  "strengths": [
    {
      "lead": "Knowledgeable",
      "body": "You rarely pass up a good opportunity to learn something new especially abstract concepts. Whilst most people won’t absorb this information because there is no real planned purpose for it, you will absorb it because you just find it interesting."
    },
    {
      "lead": "Quick thinker",
      "body": "You have a tremendously flexible mind able to shift from idea to idea without effort. You will draw on your accumulated knowledge to prove your points or the points of your opponents as you see fit."
    },
    {
      "lead": "Original",
      "body": "As you have little attachments to tradition and you are able to disregard existing systems and ways of doing business. This enables you to pull together disparate ideas from your extensive knowledge base to create new solutions for potential partners."
    },
    {
      "lead": "Charismatic",
      "body": "You have a witty personality that other SalesCode combinations find intriguing. Your confidence, ability to think quickly and skill set of being able to connect new ideas in novel ways create a style of communication that is charming and entertaining."
    },
    {
      "lead": "Energetic",
      "body": "When you are given a chance to combine all of your SalesCode traits to examine an interesting problem, you can be truly impressive with your enthusiasm and energy levels. You have no qualms putting aside long days and nights to find solutions to a potential partners problem if there is a large financial upside doing so."
    }
  ],
  "weaknesses": [
    {
      "lead": "Argumentative",
      "body": "You enjoy the mental exercise of debating an idea and nothing is sacred. Because of this, you will walk over other people’s beliefs and feelings which can lead to a great deal of tension. Sometimes you don’t even realise that you are annoying other people in a conversation."
    },
    {
      "lead": "Insensitive",
      "body": "You are very rational and so you often misjudge other people’s feelings and push debates well past their tolerance levels. It’s likely that you do not consider the emotional points that are made as being as valid, which for someone who communicates in an emotional style can become an issue."
    },
    {
      "lead": "Intolerant",
      "body": "Unless someone is able to back up their ideas with a round metal sparring, you are likely to dismiss their ideas and potentially even the individual themselves. Remember that people with SalesCode differing to yours still have great ideas. If someone is more introverted than you, they might not want to debate their idea in person would be happy to do so over email where they can think their points through."
    },
    {
      "lead": "Lack of focus",
      "body": "The same incredible flexibility that allows you to come up with original plans and solutions is the same energy that will encourage you to drop them entirely after the initial excitement wanes. Most B2B orders come months or years after the initial engagement and so developing the ability to focus for longer is important for you."
    },
    {
      "lead": "Lack of practicality",
      "body": "You are interested in what could be, abstract ideas and concepts rather than the hard details of day-to-day execution. Depending on what you’re selling and who you’re selling it to, this creative flair might not just be unnecessary but can actually be counter-productive. A challenge for you is the day-to-day grind of sales rather than the “ah-ha” moments of blowing potential partners minds with new ideas."
    }
  ],
  "businessAndSales": [
    "As you have the benefit of being naturally engaged and interested in solving complex problems, you work great in both corporate and start up environments. Although you are less people oriented, you are great at developing solutions to interesting, diverse and technical problems. Like a fine wine, as you age up the corporate ladder from junior sales roles to roles that require solving big, complex problems, your performance will increase too. You’ll likely enjoy working in B2B sales more in 10 years time than you can ever imagine you would now.",
    "As long as you are honest about yourself and your strength and weaknesses you could also survive what the world of entrepreneurship or even engineering could throw at you.",
    "Your intellectual power can be intimidating to others but unlike your more introverted selling cousins. Your SalesCode has the benefit of making you an excellent communicator so this dulls the intimidation.",
    "For you, long-term success in life means having a sense of personal freedom to know that you can apply yourself to fully understanding and solving problems that interest you, without getting bogged down by the social organisation or the politics. You’re less interested in finding out what makes other people tick and routine, structure and formal rules all seem like unnecessary hindrances.",
    "In the office you expect your ideas to be heard by those above you in sales leadership positions and beyond. You expect robust debate among your peers and in larger organisations sometimes this doesn’t happen. Therefore, you might be better working within a smaller corporate environment which is faster pace and has less hierarchical nonsense going on."
  ],
  "closingQuote": "Your intellectual power can be intimidating to others but unlike your more introverted selling cousins."
},
  "INFJ": {
  "code": "INFJ",
  "name": "The Advocate",
  "tagline": "The Mission-Driven Owner",
  "intro": [
    "Your SalesCode type is very rare as it makes up less than 1% of the population. Nevertheless, people like you leave their mark on the world. The diplomat personality type has an inborn sense of idealism and morality but the thing that really sets them apart is that they have a tutoring trait. You are not an idle dreamer you are capable of taking concrete steps to realise your goal and make a lasting positive impact.",
    "If you are selling a product that you believe in you can have an incredible impact with your natural personality traits.",
    "It’s likely that you share a unique combination of traits e.g. soft-spoken but with very strong opinions and you will fight tirelessly if there is an idea that you believe in. You are decisive and strong willed but will rarely use that energy for personal gain as you use creativity and imagination to create balance rather than an advantage. If you are selling to someone who is supportive of the problems that you solve, you will likely resonate well with them.",
    "You have the ability to make connections with others easily and you have a talent for speaking in a warm, sensitive language in human terms rather than leading with pure logic or fact.",
    "You have the ability to make connections with others easily and you have a talent for speaking in a warm, sensitive language in human terms rather than leading with pure logic or fact. In fact, your colleagues and customers may even see you as an extrovert even though you probably lean more on the introverted side of things and need a little bit of time alone to decompress and recharge at the end of the day.",
    "It is important that you take care of yourself. Your passion for your convictions is capable of carrying you past your breaking point and if you feel like your conversations or interactions are getting out of hand you can end up exhausted unhealthy and stressed. You have high levels of sensitivity and so you should avoid situations where you may come under personal attack even if the circumstances are unavoidable e.g. a customer complains directly to you. You can’t fight back even though it might be helpful to do so."
  ],
  "pullQuote": "You are decisive and strong willed but will rarely use that energy for personal gain as you use creativity and imagination to create balance rather than an advantage.",
  "peopleLikeYou": [
    "Martin Luther King",
    "Nicole Kidman",
    "Morgan Freeman",
    "John Snow from Game of thrones"
  ],
  "strengths": [
    {
      "lead": "Creative",
      "body": "you combine a vivid map imagination and a strong sense of compassion, so you have the ability to resolve not just technical challenges but what someone wants. People with your personality type enjoy finding the perfect solution for someone they care about. This makes you not just a potentially great sales professional but an excellent counsellor or adviser as well."
    },
    {
      "lead": "Insightful",
      "body": "you have the ability to see through dishonesty and disingenuous people. You are capable of stepping past manipulation or all weird buying tactics and pushing the buyer into a more honest discussion. At which point you are able to get to the heart of the matter quickly."
    },
    {
      "lead": "Inspiring",
      "body": "as you have the ability to speak in human terms via emotions rather than leaning towards the technical side of things you have a fluid inspirational speaking and writing style that will appear the inner idealist in your audience."
    },
    {
      "lead": "Determined",
      "body": "when you come to believe something is true and important, you will pursue that goal with conviction and energy. If there is something about the product that you’re selling that you do not like you will often rock the boat if you have to in order to get something changed, but your passion is an intrinsic part of your personality"
    },
    {
      "lead": "Decisive",
      "body": "because you understand that your insight and inspiration are able to have a real impact on the world and in the business world you work in, you are able to follow through with your ideas with the conviction and willpower necessary to see even the most complex projects through to the end. If things are to be done the way they ought to be, you make that happen."
    }
  ],
  "weaknesses": [
    {
      "lead": "Sensitive",
      "body": "when someone criticises or challenges you on your principles or things that you value, they are likely to receive an alarmingly disproportionate strong response. Unfortunately, you are highly vulnerable to criticism and conflict and a customer questioning your good motives is the quickest way to get you riled up. You should double down on learning to cope and deal with rejection and not take things too personally."
    },
    {
      "lead": "Private",
      "body": "you tend to present yourself as an idea rather than as an individual. This is because you both believe in the idea as a whole but also because you are extremely private when comes to your personal life. Having an image that you present to others of yourself keeps you from having to open up to your colleagues or even your close friends."
    },
    {
      "lead": "Perfectionist",
      "body": "you are defined by your pursuit of ideals. Whilst this is a wonderful quality in many ways, it can hold you back in sales because often it’s more important to get the job done that it is for it to be perfect. Additionally, it may be a trait that you ignore healthy productive business relationships or projects because you believe there might be a better option down the road but this isn’t always the case."
    },
    {
      "lead": "Always need a cause",
      "body": "you often get so caught up in the passion of your work that any of the cumbersome administrative or maintenance work that is needed in the sales industry to keep sales managers and leaders happy with our performance, seemingly comes between you and the ideal you set on the horizon. If this happens to you regularly you may find that you are restless and annoyed at the people around you even though they might be trying to help keep you on the tracks."
    },
    {
      "lead": "Easily burnt out",
      "body": "People like you often exhaust themselves and they don’t find a way to balance their ideals with the realities of day-to-day living so this is something you should be conscious of."
    }
  ],
  "businessAndSales": [
    "It is likely that you’ll find that most corporations are not designed for you. They are designed for people you strive for status and material gain rather than someone he wants to change the world because of an idea they have.",
    "With that being said, if you can find a sales role where you are constantly helping and connecting with people, this can be extremely rewarding for you. Any role where you are truly consulting with and helping an individual, and not just engaging with them to make more money, is likely to have a lot of appeal for you.",
    "Additionally, rather than a stereotypical corporate job when you are forced to not just manage your own policies but manage someone else’s offered you probably don’t care very much about, if you can get yourself into a leadership position, you are more able to follow your heart, acquire a personal touch and help develop a sales team beneath you.",
    "If you are going to give your sales manager some advice it would be to allow you to express your creativity and insight and to reinforce the fact that the work that you are doing has real meaning."
  ],
  "closingQuote": "Any role where you are truly consulting with and helping an individual, and not just engaging with them to make more money, is likely to have a lot of appeal for you."
},
  "INFP": {
  "code": "INFP",
  "name": "The Mediator",
  "tagline": "The Values-Led Owner",
  "intro": [
    "You are a true idealist, always looking for the little bit of good even in the worst people. You’re always searching for ways to make things better which is a powerful trait for a B2B sales professional.",
    "Even though you may be perceived as calm, reserved or even shy you have an inner flame of passion that truly makes you shine.",
    "Your SalesCode makes up just 4% of the population so there is a risk of feeling misunderstood when socialising but when you are around like-minded people you will be a torch of joy and inspiration.",
    "You are guided by your principles rather than external logic or shiny objects. When you are selling it is likely you will be honourable, virtuous and you are led by the purity of your intents rather than financial rewards or punishments dished out by management. This means you have to be selling a product that you believe in otherwise you going to have zero success.",
    "The strength of this intuitive communication style works great in a creative sales process where perhaps you’re putting a project in place, rather than selling a generic widget.",
    "When you are at your best, you can communicate deeply with others, easily speak in metaphors or parables and understand ways to teach others new and interesting ideas. The strength of this intuitive communication style works great in a creative sales process where perhaps you’re putting a project in place, rather than selling a generic widget.",
    "You have a much higher percentage chance of knowing more than one language because you are naturally gifted with understanding different ways to communicate.",
    "Unlike your more extroverted cousins however you will focus your attention on a few people, a few potential partners and if you are spread out to thin, you can r run out of energy and feel overwhelmed. You should focus on a sales role that allow you to go deep with just one or two accounts at a time.",
    "You often drift into deep thought, enjoying and contemplating the hypothetical more than any other combination of SalesCode. Sometimes there is a chance that you can withdraw a little bit too far and may need support from your sales manager or people around you to bring you back into the real world."
  ],
  "pullQuote": "There is a risk of feeling misunderstood when socialising but when you are around like-minded people you will be a torch of joy and inspiration.",
  "peopleLikeYou": [
    "William Shakespeare",
    "Johnny Depp",
    "Kurt Cobain",
    "Frodo Baggins from Lord of the Rings"
  ],
  "strengths": [
    {
      "lead": "Idealistic",
      "body": "Your friends and loved ones will come to admire and depend on you because of your optimism. You are a breath of fresh air for potential partners who are having a bad day. You have an unshaken belief that all people are inherently good and you think perhaps if even they appear bad, they are just misunderstood. Because of this you can always spin any rejection that comes into your world from selling as the person having a bad day and so you’re resilient when you choose to be."
    },
    {
      "lead": "Value harmony",
      "body": "You typically have no interest in having power over others and don’t care that much for dealing with potential partners who have domineering attitudes. You prefer a democratic approach to selling and you work hard to ensure that every voice and perspective is heard, so that everyone is happy at the end of the engagement."
    },
    {
      "lead": "Open-minded",
      "body": "You have a live and let live attitude and you dislike being constrained by rules. You’re more likely to give the benefit of the doubt so long as your principles have not being challenged."
    },
    {
      "lead": "Creative",
      "body": "You combine your intuitive nature with open-mindedness to allow you to see things from unconventional perspectives. You are able to connect many far-flung dots into a single theme which can add massive value when engaging in a complex enterprise sale."
    },
    {
      "lead": "Passionate and energetic",
      "body": "If something catches your imagination and speaks to your beliefs, you will intensely dedicate all your time, energy and thoughts to that project. You perhaps have a little bit of shyness that will keep you away from claiming all the credit when you are on the right track in business but it is still difficult to discourage you from having success. Whilst other people are focusing on the challenges of the moment and may give up when things get tough, you have the benefit of far-reaching vision to help push you through the pain."
    }
  ],
  "weaknesses": [
    {
      "lead": "Too idealistic",
      "body": "Sometimes you can take your idealism too far and set yourself up for disappointment. You will come across bad people and evil things happening in the world, so it’s important to not idealise specific business deals or individuals. Don’t forget that no one or no deal is perfect 100% of the time."
    },
    {
      "lead": "Impractical",
      "body": "When something catches your imagination, you can sometimes neglect the practical matters like day-to-day maintenance of servicing your other current partners or treating yourself to life's simple pleasures. You may even neglect eating and drinking as you dive fully into your passion and so it important to get the basics right, make them a habit and routine."
    },
    {
      "lead": "Dislike data",
      "body": "You are often so focused on the big picture that you forget the forest is made out of individual trees. When the facts or data contradict your ideas, this can be a real challenge for you."
    },
    {
      "lead": "Taking things personally",
      "body": "You often take rejection from potential partners and criticism in general personally. This can lead you to avoid conflict and put a great deal of time and energy into trying to build a middle ground that satisfies everybody. You need to remind yourself that sometimes it is okay to disagree and sometimes it is okay not to work with specific people if their ideals or personality do not match yours."
    },
    {
      "lead": "Difficult to get to know",
      "body": "You can be private, reserved and self-conscious. This goes against the the age old sales advice of being open to know, like and trust. You need to remind yourself to be more open and available to the people around you both in business and out of business as well."
    }
  ],
  "businessAndSales": [
    "It can be more challenging for you and your SalesCode to find a satisfying sales career than any other SalesCode combination. You often wish that you could just be doing what you love without the stress and rigour of the professional life.",
    "However, like many things the answer often lies somewhere in the middle. If you sell a product that you are passionate about, your dedication will overcome any of the negative traits you may have. If you can align yourself in a creative role where your independence key, perhaps in more of a consultant type role rather than a traditional sales professional, who is interacting with people via meaningful relationships, you can succeed in sales.",
    "You may prefer a more personal touch, for example being able to work face-to-face with potential partners rather than selling on the phone in an office. Any role where you’re giving a high level of service to the potential partner can be exceptionally rewarding for you.",
    "With all that said you will likely not thrive in a high stress, team heavy, busy environment that has lots of bureaucracy. Your SalesCode puts you at the least likely to have success in management. Your attitudes lend you to respect everybody, and to prefer to communicate as human beings rather than in a boss/employee frame. Sometimes the boss just needs to be the boss. Someone who will inevitably get criticised and as you can be reluctant to criticism yourself, you’re going to avoid criticising your underlings.",
    "Stick to creative sales roles where you can add a high level of service on top of the product itself and you’ll do great."
  ],
  "closingQuote": "Any role where you’re giving a high level of service to the potential partner can be exceptionally rewarding for you."
},
  "ENFJ": {
  "code": "ENFJ",
  "name": "The Protagonist",
  "tagline": "The Client-Championing Owner",
  "intro": [
    "You are a natural born leader, full of passion and charisma. You form around 2% of the population and your personality peers include politicians, sports coaches and other individuals who enjoy reaching out and inspiring people to achieve and do good in the world. Because you have a natural level of confidence, you are influential which is a strong trait to have for B2B sales",
    "People are drawn to you because you are unafraid to stand up and speak when you feel something needs to be said. You find it easy to communicate with others, especially in person. You sometimes feel like you have the ability to read people’s minds. You can track people’s motivations along seemingly disconnected events and you are able to bring these ideas together, communicating them as a common goal which is seen as memorizing by your potential partners.",
    "You have a genuine interest in other people, almost to a fault. When you believe in someone, you can become too involved in that individuals problems and place too much trust in them. So be careful that you do not over extend your optimism or push other people further than they are willing to go.",
    "Because you have such a tremendous capacity for reflecting and analyzing your own feelings, if you get caught up in someone else’s problems you can start to see those problems in yourself. This may lead you to try and fix something that isn’t wrong. When this happens it’s important for you to pull back and use some self-reflection to distinguish between what you really feel and what is just other people’s perspectives.",
    "Whether you’re leading a nation to prosperity or bringing an B2B account into the 21st century by upgrading their IT department, you have the motivation to win any hard-fought victory.",
    "You are truly altruistic, which can be a positive and a negative. You are likely to take the arrows and swings from swords in battle to protect other people. It’s no wonder that many people with your user manual type are US presidents. Whether you’re leading a nation to prosperity or bringing an B2B account into the 21st century by upgrading their IT department, you have the motivation to win any hard-fought victory."
  ],
  "pullQuote": "When you believe in someone, you can become too involved in that individuals problems and place too much trust in them.",
  "peopleLikeYou": [
    "Barack Obama",
    "Oprah Winfrey",
    "Daenerys Targaryen in Game of Thrones",
    "Morpheus from The Matrix"
  ],
  "strengths": [
    {
      "lead": "Tolerant",
      "body": "You are a true team player and you recognize that means listening to other people’s opinions even when they contradict your own. You admit that you don’t have all the answers and you can even be criticized by potential partners as long as the criticism is constructive and moves the sale forward."
    },
    {
      "lead": "Reliable",
      "body": "Something that really bugs you is the idea of letting someone down. Therefore, it’s very likely you are extremely reliable and can always be counted on when something is asked of you."
    },
    {
      "lead": "Charismatic",
      "body": "You have charm and popularity in spades. You instinctively know how to capture an audience as you can pick up on their mood and motivation in intrinsic ways. You are able to communicate with reason, emotion and passion. You are a talented imitator, able to shift your tone and manner to reflect the needs of an potential partner in a sales meeting while still maintaining your own voice."
    },
    {
      "lead": "Altruistic",
      "body": "Uniting all your good qualities is an unyielding desire to do good in and for your community. Whether that be your friends and family or the business environment that you work it. You are warm and selfless and you can bring people together. You have a genuine belief you are making an impact."
    },
    {
      "lead": "Natural leader",
      "body": "Rather than going out and taking authority for yourself, people with your user manual often end up in leadership roles at the request of others, cheered on by the admirers of your strong personality and a powerful vision."
    }
  ],
  "weaknesses": [
    {
      "lead": "Overly idealistic",
      "body": "You can be caught off-guard if you encounter people that don’t agree with you. You assume everyone is as idealistic as yourself and so can be frustrated when people have other belief systems."
    },
    {
      "lead": "People pleaser",
      "body": "You can bury yourself in promises to others. You sometimes embrace other people’s problems and try and solve them as if they were your own. When you do this often enough, you can spread yourself too thin and be left unable to help anyone."
    },
    {
      "lead": "Fluctuating self-esteem",
      "body": "You define your self-esteem by whether you are able to live up to your ideals. You are always wondering what you could do better. If you fail to meet a goal to help someone, when you promised you would, your self-confidence will plummet down."
    },
    {
      "lead": "Tough decisions",
      "body": "If you are caught between a rock and a hard place, you get stricken with paralysis as you imagine all the consequences of your actions.This is especially true if the potential consequences could lead to a change in someone else’s emotions."
    }
  ],
  "businessAndSales": [
    "Sales is a perfect career for you because it allows you to do what you love the most – helping other people. Luckily for you, individuals in the marketplace like being helped and are willing to pay for a higher touch of service that you can offer.",
    "Sales roles where you can approach people with a genuine interest, with warm helpful advice will suit you best. You may be motivated by working in a more altruistic business environment that is less about smashing targets and buying Ferrari’s and more about making the world a better place. You will get more pleasure out of helping other people grow than from working crazy hours just to buy fast toys.",
    "As you are able to express yourself both creatively and honestly, a consultative role is perfect for you. Any role where you can spend time to pick up on the needs and wants of your potential partners and then help to make these problems disappear. However, you are less likely to thrive in a sales role that focuses heavily on systems and spreadsheets rather than interactions with people.",
    "Whilst you are up for a challenge, any sales roles where you are constantly criticized despite going to great efforts to help others such as selling technical products to technical people might not be the best fit.",
    "You are intelligent, warm, idealistic, charismatic and social and so with this wind at your back you are able to thrive in many diverse sales roles. Additionally you will thive at any level of seniority so don’t think you have a 20 year career of selling on the front line a head of you."
  ],
  "closingQuote": "You will get more pleasure out of helping other people grow than from working crazy hours just to buy fast toys."
},
  "ENFP": {
  "code": "ENFP",
  "name": "The Campaigner",
  "tagline": "The Energising Owner",
  "intro": [
    "You are a truly free spirit. You’re often the life of the party but unlike other people, you are less interested in the shared excitement and pleasure of the moment. You are more interested in the social and emotional connections you make with individuals. You are charming, independent, compassionate and you make up 7% of the population.",
    "You are more than just a people pleaser as you are shaped by your intuitive quality. You are able to read between the lines through high levels of curiosity. You see life as a big complex puzzle, everything is connected and you are always looking for a deeper meaning in the pieces.",
    "Your personality is often found to be irresistible by your colleagues or potential partners which thrusts you into the spotlight. You are held up by your peers as a leader. However, this isn’t always where you want to be as you are more interested in independence than having a following.",
    "Worse still is if you find yourself wrapped up in administrative tasks or routine selling maintenance that can accompany any kind of sales leadership position. Your self-esteem is dependent on your ability to come up with original solutions which work great in a complex selling environment. You need to have the freedom to be innovative otherwise you can quickly lose patience. Therefore management might not be for you.",
    "You are able to switch from a passion-driven idealist in the workplace to a free spirit on the dance floor, to a more reserved state at a moment’s notice.",
    "Unlike other sellers, your SalesCode means you are perfectly capable of relaxing. You are able to switch from a passion-driven idealist in the workplace to a free spirit on the dance floor, to a more reserved state at a moment’s notice.",
    "You believe that everyone should take the time to recognize and express their feelings. Your levels of empathy allow you to make very natural conversations with potential partners which they get a lot of value out of.",
    "You do need to be careful if you rely too much on your gut instinct however as you have the tendency to plan ahead too quickly, without properly understanding other peoples true motivations. You sometimes misread signals and over complicate things when a more straightforward approach would have been simpler and more effective.",
    "You are emotional and sensitive and so when you step on someone’s toes you feel it as much as what they do. This keeps you on the straight and narrow in a job like B2B sale where there may be a dark pull to manipulate rather than influence others."
  ],
  "pullQuote": "You see life as a big complex puzzle, everything is connected and you are always looking for a deeper meaning in the pieces.",
  "peopleLikeYou": [
    "Will Smith",
    "Robin Williams",
    "Michael Scott from the office",
    "Willy Wonka from Charlie and the chocolate factory"
  ],
  "strengths": [
    {
      "lead": "Curious",
      "body": "When it comes to ideas, you aren’t interested in brooding and contemplating, you want to go out and experience new things. You do not hesitate to jump out of your comfort zone because you are open-minded. You see things as part of the big mysterious puzzle that you call life."
    },
    {
      "lead": "Observance",
      "body": "You believe that there are no irrelevant actions and that every shift in sentiment, every move in the boardroom and every idea is part of something bigger. To satisfy your curiosity you will notice things that other people don’t and this can be incredibly powerful when looking for solutions for your potential partners."
    },
    {
      "lead": "Energetic and enthusiastic",
      "body": "As you observe the world and form new connections, you won’t hold back your tongue. You are excited about your findings and you’ll share them with anyone who will listen. You have an infectious enthusiasm which allows you to create a lot of great content if you are sold on the idea of social selling."
    },
    {
      "lead": "Excellent communicator",
      "body": "It’s a good thing you have great people skills otherwise you’d never be able to accurately express your incredible ideas. You enjoy both small talk and deep meaningful conversations, which you see as two sides of the same coin. You steer conversations towards your desired subjects and lead conversations which is a powerful tool in the world of sales."
    },
    {
      "lead": "You know how to relax",
      "body": "You’re not always on the phone with potential partners, you know that sometimes nothing is more important than just simply having fun and experiencing life. Your gut feelings let you know when it’s time to shake things up and so you’re unlikely to suffer from burnout."
    },
    {
      "lead": "Popular",
      "body": "This adaptability emotionally and socially comes together to build an individual who is approachable, interesting and exciting. You get along with pretty much everybody and potential partners will ring you just to catch up and spend time in your presence."
    }
  ],
  "weaknesses": [
    {
      "lead": "Core practical skills",
      "body": "You are incredible when it comes to conceiving new ideas and starting projects. Unfortunately, you have less focus on up-keeping projects, doing admin and following through with promises if there are any struggles along the way. Without people around to help with the day-to-day side of things, your ideas are likely to remain just that, ideas."
    },
    {
      "lead": "Difficult to focus",
      "body": "You’re a natural explorer of interpersonal connections and philosophy. This backfires when the work that needs to be done is an account report or some other nonsense paperwork to your sales manager that they ask you to complete. It is hard for you to maintain interest in this “boring work” as your brain drifts towards broader concepts and ideas away from administrative tasks."
    },
    {
      "lead": "Over thinker",
      "body": "As you don’t take things at face value, you are constantly looking for underlying motives in even the simplest of things. It’s not uncommon for you to lose a bit of sleep as you ponder why someone did what they did, what it might mean and what you should do about it… when the reality is that it didn’t mean anything at all."
    },
    {
      "lead": "Easily stressed",
      "body": "All this over thinking isn’t always self-serving. You are particularly sensitive and you care deeply about other people’s feelings. This can become a burden if left unmanaged which can weigh you down."
    },
    {
      "lead": "Highly emotional",
      "body": "Emotional expression is healthy, natural and it is a core part of your identity. But this can lead you to being emotional when you shouldn’t be, particularly when you’re under high levels of stress. You need to remember that emotional outbursts are counter-productive at best and cost you your career worst."
    },
    {
      "lead": "Over independent",
      "body": "You loathe being micromanaged and restrained by heavy-handed rules. You want to be seen by others as being highly independent and a master of your own destiny. The challenge here is that in the increasingly complex world of B2B sales, there is a need for others to help check, balance and support your work if you are going to crush your sales targets. You should learn to embrace these individuals rather than try to do everything yourself and avoiding giving them responsibility."
    }
  ],
  "businessAndSales": [
    "You are fascinated by new ideas in terms of new developments in the field that you are selling within. The trick for you is to take advantage of this quality and use it to propel yourself further in your sales career, by going deeper than what your competition are willing to go. Sticking with a single industry vertical and going deep into it will serve you better than getting distracted and changing sales jobs every two years and moving into completely different industries. So why not instead commit to one industry over the next decade and really master it.",
    "Chief among your natural talents is your people skills. A quality that is more valuable now than ever before in a world where salespeople hide behind cold emails and phone calls. You have an incredible ability to match your communication style to your audience which enables you to explore other people’s perspectives and gain new insight out of them very quickly. If you work in a sales role where you are face-to-face with your potential partners or you spend time meeting them at industry conferences, you will do very well.",
    "You have exceptional social perception to understand what makes people tick and so any consulting role where you have to do detective work before you start selling will suit you. Even better if you’re selling to someone like HR whose problems are likely human-based rather than a scientist who needs a bigger test tube.",
    "You will not shine in organizations with a strict, regimented hierarchy such as large enterprise companies or anywhere where it appears like you’re in the military. You thrive on the ability to question the status quo and explore alternatives, so the world of start-up selling might be most applicable for you."
  ],
  "closingQuote": "If you work in a sales role where you are face-to-face with your potential partners or you spend time meeting them at industry conferences, you will do very well."
},
  "ISTJ": {
  "code": "ISTJ",
  "name": "The Logistician",
  "tagline": "The Reliable Expert Owner",
  "intro": [
    "Your SalesCode make up is the most abundant out of all the combinations and makes up around 13% of the population. The defining characteristics of integrity, practical logic and tireless dedication to your duties make you the center of many families and organizations. You enjoy taking responsibility for your actions and you take pride in the work you do when working towards a goal. You have a lot of success as you never hold back your time and energy, you complete each and every task with accuracy and patience.",
    "You don’t make any assumptions, preferring instead to analyse your surroundings and check the facts as you move towards a practical course of action. When you relay the facts necessary to achieve your goal, you expect others to take immediate action on them too.",
    "The way you are wired is such that you have little tolerance for indecisiveness and you lose your patience quickly, especially if the individual you are dealing with ignores the key details or challenges you with pointless, time-consuming debate.",
    "Potential partners like working with you because when you say you’re going to do something, it gets done. You meet all obligations no matter what the personal cost. You do this to a fault and so can potentially be at the risk of burn out.",
    "It’s likely that you prefer to work alone or otherwise have clear authority, established in a clear hierarchy so you do not have to debate or worry about the performance or reliability of other people.",
    "You have a sharp, fact-based mind, preferring self-sufficiency rather than reliance on someone else.",
    "You have a sharp, fact-based mind, preferring self-sufficiency rather than reliance on someone else. You actually see dependency on other people as a weakness.",
    "You will adhere to the rules and guidelines regardless of the cost. You may even report your own mistakes to your sales manager and confer the truth, even when the consequences of doing so could be disastrous. To you, honesty is more important than the emotional consequences of doing something wrong and it may unfortunately leave others with the false impression that you are cold or even robotic.",
    "Your dedication to high levels of quality allows you to accomplish a lot. However if this is not managed it can also be a weakness that less scrupulous people could try and advantage of. You seek stability and security which is not a trait of a high performing sales professional and so you need to be aware that sometimes instability can lead to opportunity in a marketplace.",
    "As you can to keep your opinions to yourself, you’ll do well in an environments where you’re selling technical products to scientific individuals like doctors or even software to accountants for example. You have less success selling to a middle manager who doesn’t use the end product themselves.",
    "You need to remember to take care of yourself – your stubborn dedication to stability and efficiency can create an emotional strain that you may not express for fully deal with for years or more."
  ],
  "pullQuote": "When you relay the facts necessary to achieve your goal, you expect others to take immediate action on them too.",
  "peopleLikeYou": [
    "Natalie Portman",
    "Anthony Hopkins",
    "George Washington",
    "Hermione Granger from Harry Potter"
  ],
  "strengths": [
    {
      "lead": "Honest and direct",
      "body": "Integrity is at the heart of your SalesCode. Emotional manipulation, mind games and lies all run counter to your preference for managing the reality you find yourself in with plain and simple honesty."
    },
    {
      "lead": "Strong-willed",
      "body": "You embody your integrity not just with your words but with your actions. You will work hard and stay focused on your goals for the long-term as you are patient and determined."
    },
    {
      "lead": "Responsible",
      "body": "Your word is a promise and that promise means everything. You would rather run yourself into the ground by working weekends and losing sleep than fail to deliver the results that you said you would."
    },
    {
      "lead": "Calm",
      "body": "None of your promises would mean much if you lost your temper and broke down at every sign of hardship. You keep your feet on the ground and make clear rational decisions. You focus on logic rather than using wishy washy empathy to get the job done."
    },
    {
      "lead": "Jack of all trades",
      "body": "You are proud of your mental repository of knowledge. Although you slightly over emphasize on facts and statistics rather than concepts and principles, you are able to apply your knowledge to a variety of situations as you go through your career. You might be known as a expert in lots but master of few."
    }
  ],
  "weaknesses": [
    {
      "lead": "Stubborn",
      "body": "You believe that the facts are the facts and that it’s useless to support any new idea that isn’t supported data or logic. This purely factual decision-making process makes it difficult people with your SalesCode to accept that they have might have been wrong about something. Remember that in business anyone can miss a small detail, even you."
    },
    {
      "lead": "Insensitive",
      "body": "Whilst you’re not intentionally harsh to others, you can hurt more sensitive people by your believe that honesty is the best policy."
    },
    {
      "lead": "Always by the book",
      "body": "You believe that everything work best with clearly defined rules and you have a natural reluctance to bend these rules or try new things even if there is a potential tremendous upside for experimenting. This can be a liability in B2B sales as what you been told to do in the past doesn’t necessarily mean is what the market wants you to do in the future. If you have been doing the same thing for a long time and it is becoming less effective, you must consciously force yourself to experiment with new solutions."
    },
    {
      "lead": "Blame",
      "body": "All of these traits can combine to make you believe that you are the only one who can see projects through reliably. You may overload yourself with extra work and responsibility and turn away people are trying to help you. If you do this for long enough, sooner or later during you’ll reach a tipping point where you simply just can’t deliver."
    }
  ],
  "businessAndSales": [
    "You will have success building a long-term, stable career and this can work in sales but only in very large organisations with particularly long buying cycles. You are much less interested in working as a consultant or an entrepreneur. It’s not that you couldn’t handle a fast-paced consultative sales process, it’s that you crave dependability and those roles are more volatile.",
    "You should be looking to work in a sales role where the potential partner is concerned about reliability and objectivity. Working with accountants, auditors, financial institutions or even doctors will set you up to be on the same wavelength as your potential partners which will lead to increased chanced of success selling to them.",
    "Whilst you might prefer to work alone, teams are necessary and so you should make sure that everyone around you has a clearly defined role and responsibility for you to thrive as part of this network.",
    "You have strong opinions about how things should be done and if you are shuffled around or messed about too often you have to be conscious not to be too vocal in your response. Remember that even the most traditional and stable careers can and do need to change as time goes on, so it’s much better to accept this with grace rather than develop a reputation of being an enemy of new ideas.",
    "Selling to potential partners who have to follow rules because they have something on the line is your best path to sales success. When that’s linked with your hard-working, dutiful demeanour, you will take on responsibility effortlessly and become a trusted and relied-upon business executive."
  ],
  "closingQuote": "Remember that even the most traditional and stable careers can and do need to change as time goes on, so it’s much better to accept this with grace rather than develop a reputation of being an enemy of new ideas."
},
  "ISFJ": {
  "code": "ISFJ",
  "name": "The Defender",
  "tagline": "The High-Care Owner",
  "intro": [
    "Your SalesCode makes up a large proportion of the population at around 13% and it is quite unique as many of your qualities push in two directions. For example, you listen to your gut feelings, yet have excellent analytical abilities and even though you are slightly introverted, you have well developed people skills.",
    "You have a desire to do good and so you will thrive in sales roles like medical device sales that help doctors perform their jobs better or positions provide have a positive impact on potential partners lives rather than just to their bottom line.",
    "You can be meticulous, often to the point of perfectionism and although you may procrastinate at first, you can always be relied on to get the job done on time. You take your responsibilities personally, consistently going above and beyond, doing everything you can to exceed expectations and delight others both at work and at home. This is incredibly valuable for potential partners in that they know they can rely on you and that you will always go the extra mile for them when needed.",
    "Often the challenge for you is ensuring that you do get noticed. You have a tendency to underplay your accomplishments and while your subtleness is often respected, more cynical and selfish people may try and take advantage by taking the credit for your work. You need to learn when to say “no” and when to stand up for yourself if you are to maintain your enthusiasm in the business environment.",
    "You are naturally social which is an interesting and quite odd quality for an introvert. You use your excellent memory to not just retain data and facts but also to remember people and details about their lives. You are able to use your imagination and natural sensitivity to express generosity that touches the hearts of your friends and family. Try to leverage this when you are reaching out to potential partners and you will stand out from the crowd.",
    "You rarely sit idle if a worthy cause can to be helped. You have a strong ability to connect with others on an intimate level that is unrivalled among introverts.",
    "People with your SalesCode are a wonderful group of individuals to be around. You rarely sit idle if a worthy cause can to be helped. You have a strong ability to connect with others on an intimate level that is unrivalled among introverts.",
    "Finally, whilst you may never be truly comfortable in the spotlight, you should ensure that your efforts are recognized because when they are, you will feel a deep level of satisfaction in what you do that most other SalesCode combinations can only dream of."
  ],
  "pullQuote": "You take your responsibilities personally, consistently going above and beyond, doing everything you can to exceed expectations and delight others both at work and at home.",
  "peopleLikeYou": [
    "Queen Elizabeth II",
    "Beyoncé",
    "Vin Diesel",
    "Samwise Gamgee from Lord of the Rings"
  ],
  "strengths": [
    {
      "lead": "Supportive",
      "body": "People with your SalesCode are the universal helpers on this planet, sharing your knowledge, experience and energy to anyone who needs it. You will often strive for win–win outcomes, choosing empathy over judgement whenever possible."
    },
    {
      "lead": "Reliable",
      "body": "Rather than offering sporadic, excited rushes of energetic productivity that leave things half finished, you are meticulous and careful. You take a steady approach and will bend to the needs of the situation just enough to accomplish your goals. You not only ensure that things are done to the highest standard but will often go beyond what is required to win the business."
    },
    {
      "lead": "Imaginative",
      "body": "You are very imaginative and can use this quality as an accessory to empathy. You observe other people’s emotional states and have the ability to see things visually through their eyes. This is powerful when you’re trying to understand your potential partners problems before you attempt to solve them."
    },
    {
      "lead": "Long term success",
      "body": "If you align your goals in sales and life, you can take your natural reliability and imagination to really make a difference. You’ll begin to see a self-fulfilling prophecy of you working hard over the long term and having bigger and bigger successes and the longer you go."
    },
    {
      "lead": "Loyal and hard-working",
      "body": "Given a little time, your enthusiasm will grow into loyalty as you form an emotional attachment to the ideas and organizations you dedicate yourself to. At this point anything short of meeting your obligations with good hard work and vigour will fail your own expectations."
    },
    {
      "lead": "Excellent practical skills",
      "body": "You have the practical sense to actually do something with all this leverage you have. Even if it’s routine, mundane tasks like cold calling that need to be done, you know that it will help other people and so you can plod along through them with little resistance."
    }
  ],
  "weaknesses": [
    {
      "lead": "Shy",
      "body": "The biggest problem you’ll face in sales is that you’re likely you are shy, at least to a certain extent. Whilst “the meek shall inherit the earth”, it’s a long road until they get recognition in business. The standards you set for yourself are often so high that you may downplay your success entirely to take the spotlight off you."
    },
    {
      "lead": "Taking things personally",
      "body": "You can have trouble separating personal and impersonal situations. This is clearly an issue if someone rejects you rudely, but you also can often take conflict or criticism from your professional life to be a personal attack too. You need to be conscious about how you are show up and leaving work so you can leave the office non-sense behind at the end of the day."
    },
    {
      "lead": "Overload",
      "body": "Your strong sense of duty and perfectionism combined with an aversion to emotional conflicts, can create a situation where it is far too easy for you to overload yourself with stress. You may struggle silently to meet everyone else’s expectations, but it is the expectation you put on yourself that will push you over the edge."
    },
    {
      "lead": "Reluctant to change",
      "body": "All these challenges can be particularly hard to address since you values traditions highly. Sometimes a situation needs to reach a breaking point before you can be persuaded by a boss, a potential partner or even a loved one to alter your course. Sometimes burying your head in the sand and marching forward can be useful in sales but sometimes you have to be open to knowing when to reset and retreat too."
    }
  ],
  "businessAndSales": [
    "In many ways you are the backbone of the modern workforce. You’re altruistic and well-rounded and no other set of SalesCode traits is so well suited to be of service to other people. Although you can do well in sales, your you might do even better in a role like human resources or support positions like sales enablement as you’ll get more enjoyment out of help others than you will from just counting stacks of money.",
    "With that said if you are in a relationship-heavy sales environment, as you are incredibly skilled at remembering things about other people you are extremely well-liked by customers and colleagues. You can always be counted on to remember a birthday, graduation or even just your customer’s dogs name and that can make all the difference.",
    "Because of this and your hard work and dedication it’s no surprise that your career in sales often progresses smoothly with very few of the ups and downs that typically accompany B2B sales roles.",
    "You are less likely to seek out a managerial position and you’re even more unlikely to brag about your accomplishments to secure it. You need to be in a sales role where you are rewarded by your partners seeing the first-hand the positive impact of your efforts. You need to be rewarded financially and emotionally on things that can be measured rather than via people’s opinion.",
    "You will thrive in large enterprise organizations where you can move through a structured hierarchy and whilst you might not always seek out a managerial position, moving within sales, from junior to senior executive positions will be a powerful motivator for you.",
    "Individuals with your SalesCode share the goal of putting good service and dedication before all else. Whether you are helping your potential partners directly or helping your sales colleagues finish their project on time, you can always be relied upon for your kindness and ability to listen to concerns and solving problems. Win-win outcomes are your bread-and-butter and no one else quite takes the same pleasure in finding satisfying resolutions to day-to-day challenges as you do."
  ],
  "closingQuote": "You can always be counted on to remember a birthday, graduation or even just your customer’s dogs name and that can make all the difference."
},
  "ESTJ": {
  "code": "ESTJ",
  "name": "The Executive",
  "tagline": "The Standard-Setting Owner",
  "intro": [
    "Your SalesCode screams for tradition and order, utilizing your understanding of what is right and wrong to bring organizations and businesses together.",
    "You embrace the values of honesty, dedication and dignity. You are valued for your clear advice and guidance as you happily lead the way on difficult paths. You thrive in sales roles where the stakes are clearly defined and there is a clear path to success, even if it is a difficult road to travel down.",
    "You will thrive in sales roles were there is a team of people around you as you can work hard to bring everyone together in celebration of winning new business.",
    "Your SalesCode forms around 11% of the population. You are strong believer in the rule of law and authority and you will demonstrate dedication and purpose whilst rejecting laziness and cheating especially in the workplace environment. It’s no wonder why so many of America’s previous presidents have the same SalesCode as you.",
    "You are the kind of person who declares hard manual work is an excellent way to “build character”. You are aware of your surroundings and you live in a world of verifiable facts.",
    "Your strong opinions are not just empty talk as you are more than willing to dive into the most challenging action plans whilst sorting out the details along the way, making even the most complicated business tasks seem approachable.",
    "This can earn you a reputation for inflexibility but not because you are stubborn, it is because you truly believe your values and so are unable to stray from them.",
    "You do not work alone and you expect your reliability and work ethic to be mirrored amongst your peers. If someone jeopardizes a project through incompetence, laziness or worse still dishonesty, you will not hesitate to show them your wrath. This can earn you a reputation for inflexibility but not because you are stubborn, it is because you truly believe your values and so are unable to stray from them.",
    "The main challenge for you is to recognize that not everyone follows the same path and contributes in the way that you do. As a leader (all sales roles are really leadership positions) you must recognize the strength of the individual as well as that of the group. You must focus on bringing other peoples ideas to the table when working with potential partners so that you really do have all the facts. You should focus on making sure everyone is happy before you start to lead the charge in a direction that works for everyone."
  ],
  "pullQuote": "You are strong believer in the rule of law and authority and you will demonstrate dedication and purpose whilst rejecting laziness and cheating especially in the workplace environment.",
  "peopleLikeYou": [
    "John Rockefeller",
    "Frank Sinatra",
    "Dwight from the US Office",
    "Robb Stark from Game of Thrones"
  ],
  "strengths": [
    {
      "lead": "Dedicated",
      "body": "Your drive to see things to completion borders on an ethical obligation. You do not abandon your daily tasks because they become difficult or boring, you take them up and continue them because it’s the right thing to do. This is powerful in a world of PC sales where mundane tasks like cold calling are just as useful as the creative tasks such as discovery with an effective customer."
    },
    {
      "lead": "Strong-willed –Being strong willed makes all this dedication possible. You will not give up on your beliefs because of a simple opposition and you will defend your ideas and principles relentlessly.",
      "body": ""
    },
    {
      "lead": "Honest",
      "body": "You trust facts far more than abstract ideas or opinions. Straightforward statements and information are your king and you will leverage to give straightforward and honest answers without beating around the bush."
    },
    {
      "lead": "Loyal",
      "body": "You work to exemplify truthfulness and reliability and so you consider stability and security very important. When you tell a customer that you’re going to do something, they know that you’re going to keep your word and so in high level selling where there’s lots on the line, you will likely be trusted over other personality types."
    },
    {
      "lead": "Great at organising",
      "body": "Your commitments to clear standards makes you a capable and confident leader. You are also gifted with the ability to distribute tasks and responsibilities over to yourself and others objectively and fairly and so people like working with you."
    }
  ],
  "weaknesses": [
    {
      "lead": "Inflexible and stubborn",
      "body": "The problem of being so fixated on what works now is that you might dismiss things that might work better later. In your mind everything is an opinion until it’s proven fact and so you can be reluctant to believe an opinion long enough to test it out for validity."
    },
    {
      "lead": "Uncomfortable with the unconventional",
      "body": "You have a strong adherence to tradition and so if someone suddenly suddenly pushes a novel solution, you may become uncomfortable and stressed. This is not so much of an issue if you’re selling in the corporate, enterprise environment but it means that start up or fast-paced verticals might not be the best fit."
    },
    {
      "lead": "Focus on social status",
      "body": "You take pride in the respect that your friends, colleagues and community give you. You are very concerned with public opinion and so can get caught up in meeting other people’s expectations rather than putting your own standards first."
    },
    {
      "lead": "Difficult to relax",
      "body": "As you need to respect from other people to maintain your dignity, you can find it difficult to cut loose and relax due to the risk of looking silly or allowing other people to catch up on the progress you’ve made."
    },
    {
      "lead": "Difficulty expressing emotion",
      "body": "This is your greatest weakness. You are unable to express emotions and feel empathy at the level of some of the SalesCode make ups. When dealing with potential partners you can get so caught up in the facts and the most effective methods to solve problems, that you can forget to even consider what will make the potential customer happy. If they are of an emotional personality type it can sometimes be difficult for you to connect with them."
    }
  ],
  "businessAndSales": [
    "Your career is often as clear and straightforward as you are. You will almost always gravitate toward situations that give you the opportunity to exercise your affinity for organisation, structure and follow-through. You have a profound respect for tradition, stability and security which leads you from sales professional to senior C-suite leadership rapidly.",
    "Your sense of loyalty results in you staying with organisations for far longer than the stereotypical two years that the average sales professional stays in their job.",
    "You are the image of a model citizen and you’ll strive to maintain this idea throughout your career. You have many traits inherent to leadership which will be acknowledged regardless of industry you find yourself in. From the genuine enjoyment that you feel in organising other people and your knack for clearly expressing principles, values and expectations you are likely an extremely effective manager.",
    "If you can get into a sales role where you have an assistant to help with logistics or even a trainee underneath you to help mentor, you’ll get great pleasure out of your role. Additionally, selling a product allows you to spend time with financial people or administrative buyers will likely lead to more success as well."
  ],
  "closingQuote": "You have a profound respect for tradition, stability and security which leads you from sales professional to senior C-suite leadership rapidly."
},
  "ESFJ": {
  "code": "ESFJ",
  "name": "The Consul",
  "tagline": "The Relationship-First Owner",
  "intro": [
    "You are for lack of a better word, popular. This makes sense given that your SalesCode makes up 12% of the population. In high school you were the cheerleaders or the quarterbacks, setting the tone and taking the spotlight, leading your team forwards to victory. Later in life you continue to enjoy supporting your friends and loved ones, organizing social gatherings and making sure that everyone is happy.",
    "Discussing scientific theories or debating politics is unlikely to capture your attention for long. You’re more concerned with fashion, your parents and your social status within the people around you. Perhaps you do gossip a little but you try to use your powers for good.",
    "You are an altruist and you take your responsibility to help others do the right thing seriously.",
    "You will base your moral compass on established traditions and laws, upholding authority and rules rather than leaning into more creative structures. It is important for you to remember as you engage with your potential partners though that they may come from a wide variety backgrounds and have lots of differing perspectives. To them, what they see as right might not follow your absolute truths.",
    "A strong positive bias towards you having success in sales is that you love to be of service. Any role that allows you to be appreciated in a meaningful way will leave you feeling happy.",
    "You respect hierarchy and will do your best to position yourself with some authority both at home and at work. This is useful in both places because it helps keep things stable and organized for everyone that you engage with.",
    "But your devotion goes further than just breezing around different conversations because you have to, you truly enjoy hearing about your friends and potential partners relationships or activities and you remember the little details that are going on in their lives.",
    "You are supportive, outgoing and can always be spotted at the national sales meeting or at the office Christmas. You’re the one who finds the time to chat and laugh with everyone else. But your devotion goes further than just breezing around different conversations because you have to, you truly enjoy hearing about your friends and potential partners relationships or activities and you remember the little details that are going on in their lives.",
    "If the tension of a room rises, such as in a fast-paced business negotiation, you will always pick up on it and try and restore stability to the group, likely before anyone else even notices as there may be problem.",
    "With that said you are conflict averse and you will spend a lot of time and energy establishing social order to cut off potential conflict before it arises. This can become tiring. You are also always the person creating plans and organising events or get-togethers. People with your SalesCode put a lot of effort into the activities they have arranged and it is easy for them to get their feelings hurt if their ideas are rejected or people aren’t interested in taking part. It is important to remember that especially in sales, everyone is coming from a different place, with different interests, different priorities and so disinterest isn’t a comment about you personally, your plans are just not right for them, right now.",
    "For you to have crazy success in sales, the biggest thing you need to do is to come to terms with your sensitivity. People are going to disagree with you, they’re going to criticize your work and while it hurts, it is just a part of life. The best thing you can do, is to do what you do best and take care of what you have power to take care of."
  ],
  "pullQuote": "You’re more concerned with fashion, your parents and your social status within the people around you.",
  "peopleLikeYou": [
    "Bill Clinton",
    "Taylor Swift",
    "Sansa Stark in Game of Thrones",
    "Monica from Friends"
  ],
  "strengths": [
    {
      "lead": "Strong practical skills",
      "body": "You are an excellent manager of day-to-day tasks and routine business activity. You enjoy making sure that people close to you are well cared for, that includes both people in your personal life and your potential partners as well."
    },
    {
      "lead": "Sense of duty",
      "body": "People with your SalesCode have a strong sense of responsibility and strive to meet their business obligations. However, this may come more from a sense of social expectation rather than a intrinsic drive to help others."
    },
    {
      "lead": "Loyal",
      "body": "As you value stability and security highly, you are eager to preserve the status quo. This makes you extremely loyal and trustworthy to partners and vendors. It is likely that you are a true pillar of any group you belong to, whether it’s your family or sales team. You can always be relied upon."
    },
    {
      "lead": "Sensitive and warm",
      "body": "You will help others to ensure that stability and harmony exist in your world. During this process you will show that you care deeply about other people’s feelings and you’re careful not to offend or hurt anyone. You always aim for a win-win outcome and this can be a positive, but be wary if you are selling to a professional buyer who might try manipulating you."
    },
    {
      "lead": "Connecting with others",
      "body": "All these qualities come together to make you social, comfortable and well liked at work. You have no problem with generating small talk or following social cues in real time to have deep and engaging conversations with your potential partners. Your ability to strike up conversations is likely something you take for granted but is a skill that many introverted personalities would kill for."
    }
  ],
  "weaknesses": [
    {
      "lead": "Worried about social status",
      "body": "A lot of your strengths tie back to a chief weakness – your preoccupation with social status. This may inadvertently affect many decisions you make, which can limit your creativity and open-mindedness. Don’t waste money on that Rolex or fancy car when you have no savings in the bank or could better invest that money for your future rather than the change your perceived social status right now."
    },
    {
      "lead": "Inflexible",
      "body": "As you place a lot of importance on what is socially acceptable, you can become very cautious and even critical of unconventional way of doing things. If you have always been a cold caller, you might struggle to implement a social selling game into your sales arsenal because you’re worried about what other people might think of you for example."
    },
    {
      "lead": "Reluctance to improvise",
      "body": "Just as you can be critical of other people’s unusual behavior, you are typically unwilling to step out of your own comfort zone for fear of being judged as different. Sometimes in business you need to take a different approach to everyone else, and when things just aren’t working for whatever reason, you should keep this in mind."
    },
    {
      "lead": "Vulnerable to criticism",
      "body": "It can be challenging to change any of these tendencies because you are conflict adverse. It is likely that you become defensive and can lash out when someone criticizes your habits beliefs or traditions, even if they’re not being productive for you. You will get criticised in sales and so this is something that you need to lighten up on immediately."
    }
  ],
  "businessAndSales": [
    "Because your SalesCode is so strongly expressed, any sales role where you need to be well organized is the best environment for you to have success in. Larger organizations with predictable hierarchies and pathways for success will also be positive.",
    "Additionally, you’ll like sales roles where you’re based in an office. When other people would run away from this anatomy and routine, you can leverage the structure which puts you at an incredible advantage.",
    "Your practical skills combined with high levels dependability mean that selling to financial industries or selling software to accountants for example are verticals of sales that you would do well in. You should stay away from very analytical sales positions though as you need human interaction and emotional feedback to be truly satisfied with your work."
  ],
  "closingQuote": "When other people would run away from this anatomy and routine, you can leverage the structure which puts you at an incredible advantage."
},
  "ISTP": {
  "code": "ISTP",
  "name": "The Virtuoso",
  "tagline": "The Hands-On Expert Owner",
  "intro": [
    "You love to explore the world with your hands and your eyes, touching and examining things around you with rationalism and spirited curiosity. People with your SalesCode are natural makers, they want to move from project to project building just for the fun of it whilst they are learning from their environment as they go.",
    "This leads you to do better selling in a project-based environment where after the sale you still manage the implementation until you reach a point of customer success. Perhaps you are selling to engineers or mechanics because you find no greater joy than getting your hands dirty, pulling things apart and putting them back together.",
    "You explore ideas through creating, troubleshooting, trial and error and first-hand experience. You enjoy having other people take an interest in your projects and you don’t mind inviting them into your space either. This is of course on the condition that they do not interfere with your principles or freedom.",
    "You enjoying lending a hand and sharing your experience with other within your organisation especially those that you care about. It’s actually a shame that your configuration of SalesCode only makes up around 5% of the population and that its especially rare in women as you are an incredible teacher.",
    "Whilst your mechanical tendencies can make you appear to be a simple soul at first, you are actually quite complex. You are friendly but private, calm but can be spontaneous, extremely curious but unlikely to stay focused on formal studies for meaningless educational qualifications.",
    "Someone observing you from outside can see an individual that is very loyal and steady most of the time… but when you build up a store of impulsive energy, you let it explode without warning which takes your interests in bold new directions.",
    "In the business world, especially if you’re dealing the competition face-to-face, you don’t care about stepping on other people’s toes. In fact sometimes, you are likely to go too far.",
    "Your personal and business decisions stem from a sense of practical realism and you believe that “what you do to others, you should expect back onto yourself”. In the business world, especially if you’re dealing the competition face-to-face, you don’t care about stepping on other people’s toes. In fact sometimes, you are likely to go too far.",
    "The biggest issue you face is that you see a problem and immediately you want to solve it. You take for granted your nature of wanting to get the job done and you assume that all potential partners want things to be fixed as quickly as you want to fix them. Sometimes though, people want to talk through their problems first.",
    "You are first to tell an insensitive joke, get overly involved in another sales professionals deal and even change your plans because something more interesting came up.",
    "Something you need to think about is the fact that other people have more firmly drawn lines on rules and acceptance of behavior than what you do. Perhaps they do not want to hear an insensitive joke, perhaps they don’t want to engage in horse play, perhaps they want to think about the problems rather than actually solve them. So keep this in mind when engaging with others.",
    "You have a tendency to explore your relationships through your actions rather than using empathy and this can lead to some frustrating. If however you can find a work environment, where you are surrounded by good friends who understand your personality, your unpredictability and your ability to combine creativity and a sense of humor you will do extremely well."
  ],
  "pullQuote": "You enjoy having other people take an interest in your projects and you don’t mind inviting them into your space either.",
  "peopleLikeYou": [
    "Clint Eastwood",
    "Tom Cruise",
    "Indiana Jones",
    "James Bond"
  ],
  "strengths": [
    {
      "lead": "Optimistic and energetic",
      "body": "You are usually up to your elbows in some project, working with a potential partner or rebuilding the engine of a car. You are cheerful and good-natured and you rarely get stressed out as you prefer to go with the flow."
    },
    {
      "lead": "Creative and practical",
      "body": "You are very imaginative when it comes to practical things such as solving physical problems for potential partners. You produce novel ideas easily and you love to take these ideas and put them into action."
    },
    {
      "lead": "Spontaneous",
      "body": "You are able to combine spontaneity with logic and you can switch mindsets to fit new situations with little effort, making you extremely flexible in your ability to win business."
    },
    {
      "lead": "Know how to prioritize",
      "body": "You are able to store your spontaneity for a rainy day and not act on it short-term in the moment, which is a powerful skill. You are able to prioritize how you spend your time particularly well."
    },
    {
      "lead": "Greater crisis",
      "body": "You are calm and natural in a crisis situation. Because of it is typical of people like you to take on a little bit of risk in their business and personal lives as you aren’t afraid to get your hands dirty if things get messed up."
    },
    {
      "lead": "Relaxed",
      "body": "Throughout all of this you are able to stay quite relaxed. You are able to live in the moment, go with the flow and you refuse to worry too much about the future."
    }
  ],
  "weaknesses": [
    {
      "lead": "Stubborn",
      "body": "As easily as you go with the flow, you can also ignore it entirely and move in the opposite direction without apology. If a sales manager tries to change your habits, lifestyle or business ideas with criticism you can become very blunt in the fact that you don’t like the way they’re communicating with you."
    },
    {
      "lead": "Insensitive",
      "body": "To you logic always comes first. Even when others try to meet you half-way with emotional sensitivity and empathy, you rarely take them on. If you’re selling to someone who speaks in feelings rather than logic this can be a problem."
    },
    {
      "lead": "Private",
      "body": "Your SalesCode configuration makes it notoriously difficult for other people to get to know you. You are a true introvert, keeping your personal matters to yourself and often prefer silence over small talk. Clearly this is an issue if you are hunting for a new business with individuals who haven’t had a chance to see your wonderful practical skills just yet. You need to learn to open up a little and enable them to see how good at solving problems you really are."
    },
    {
      "lead": "Easily bored",
      "body": "You enjoy novelty which makes you an excellent tinkerer but you are less reliable when it comes to projects, jobs or customers over the long term. Once you understand something, or believe that you understand it, you are driven to move on to something new and more interesting."
    },
    {
      "lead": "No commitment",
      "body": "Because of your propensity to get bored quickly, long-term commitments are particularly painful for you. You prefer to take things day by day and you do not like being locked into something for a long time."
    },
    {
      "lead": "Risky behavior",
      "body": "This stubbornness, your difficulty in dealing with other people’s emotions, your focus on the moment and the issue of being easily bored can lead you to push boundaries just for fun. You may escalate conflict and even endanger yourself just to see where it goes. This is something that can clearly have disastrous consequences."
    }
  ],
  "businessAndSales": [
    "Your career path, especially within the world of sales is a difficult one to pin down versus other SalesCode combinations. As you thrive on diversity and unpredictability, you are not going to like routine and repetitive nature of cold calling and building relationships which is needed for the best sales roles.",
    "On the flip-side, you are a natural born problem solver with an unwavering focus on creating practical solutions for your potential partners. No other SalesCode combination is quite as fascinated by how things work, how tools can be leveraged and how the facts can be put together to create immediate and satisfying results as you. This combination of curiosity and hands-on vigour makes people with your SalesCode excellent at selling to and even being, mechanics, engineers, graphic designers or technical scientists.",
    "You should be in a sales role where you can be your practical self, one that has a freedom to wander and to declare your own schedule and responsibility.",
    "Any sales role which involve troubleshooting in a relaxed environment is perfect for you and as you learn that risk often equals reward, you can leverage your ability to risk take with maturity. You are highly desirable in a fast-paced field or a non-risk adverse environment."
  ],
  "closingQuote": "No other SalesCode combination is quite as fascinated by how things work, how tools can be leveraged and how the facts can be put together to create immediate and satisfying results as you."
},
  "ISFP": {
  "code": "ISFP",
  "name": "The Adventurer",
  "tagline": "The Artisan Owner",
  "intro": [
    "Your SalesCode make up is one of a true artist, but not in the Vincent Van Gogh way. Rather you are an expert in using aesthetics, design and even your choices and actions to push the limits of social convention and to upset traditional expectations of experience in beauty.",
    "You live in a colourful, sensual world which is inspired by connections with both people and ideas. You take massive joy in reinterpreting these connections, reinventing and experimenting with all this to form bold new perspectives.",
    "No other combination of SalesCode experiments in this way and this creates a strong sense of spontaneity which makes you seem unpredictable even to your close friends and loved ones.",
    "Layered on top of this is the fact that you are an introvert. You surprise your friends and colleagues when they see you step out of the spotlight so that you can recharge. This does not mean that you are sat there chilling out though, you take this time for introspection, assessing your principles and looking forward rather than dwelling on the past.",
    "Risky behaviors like gambling and extreme sports are far more common for your SalesCode than any other combination.",
    "You’re always looking for ways to push your passions. Risky behaviours like gambling and extreme sports are far more common for your SalesCode than any other combination.",
    "One issue however is that if criticism breaks through the cracks in your mental amour, everything can end poorly. Sometimes you can take useful, constructive commentary on your performance by viewing it as another way to push your passion in new directions. But if the comments are sharper or less mature, then you can lose your temper in spectacular fashion.",
    "You are sensitive to other people’s feelings and you value harmony, but living in the moment goes both ways and once the heightened emotions pass, you can move on as if it never happened.",
    "One of the biggest challenges for you is planning for the future. To smash a sales target, to build a personal brand or do anything that takes more than just in the moment thinking is going to be difficult for you. The likely that you plan your future in terms of building assets and prepare for retirement rather by actions and behaviours that contribute to a sense of identity such as building a portfolio of experiences rather than stocks or shares."
  ],
  "pullQuote": "You take massive joy in reinterpreting these connections, reinventing and experimenting with all this to form bold new perspectives.",
  "peopleLikeYou": [
    "Michael Jackson",
    "Britney Spears",
    "Jessica Alba",
    "Jessie Pinkman from Breaking Bad"
  ],
  "strengths": [
    {
      "lead": "Charming",
      "body": "People with your SalesCode are relaxed, warm and have a “live and let live” attitude which makes them naturally likeable and popular."
    },
    {
      "lead": "Sensitive to others",
      "body": "You can easily relate to other people’s emotions which allows you to establish harmony, goodwill and build relationships fast. When shit hits the fan, you are able to minimise conflict and move both yourself and other parties passed it quickly."
    },
    {
      "lead": "Imaginative",
      "body": "Being so aware other people’s emotions means that you are able to use creativity and insight to sell ideas that speak directly to people’s hearts rather than just to their wallets.."
    },
    {
      "lead": "Passionate",
      "body": "Whilst you might outwardly appear quite shy, inwardly you have confidence. When you are caught up in something exciting and interesting you will leave everyone else in the dust with your raw energy and drive."
    },
    {
      "lead": "Curious",
      "body": "Ideas are all well and good but you need to see and explore for yourself as to whether an idea is going to be practical or not. A grinding sales job with monotonous elements such as cold calling might not suit you very well, but any role which involves a bit of flair and boldness will put you at an advantage."
    },
    {
      "lead": "Artistic",
      "body": "You are able to show your creativity in tangible ways that other people just cannot. The obvious examples could be song writing, painting or creating moving content. In the business world this is useful to. You’re able to present a statistic or graph or visualise numbers in a way that resonates with your audience which will give you competitive advantage in a presentation-based selling environment."
    }
  ],
  "weaknesses": [
    {
      "lead": "Fiercely independent",
      "body": "Your freedom of expression is often more of a priority than hitting your sales targets or generating lots of revenue. Anything that interferes with this like company traditions or hard rules set down by sales managers can create a sense of oppression for you. This can make any rigidly structured sales role a real pain for you to work in."
    },
    {
      "lead": "Unpredictable",
      "body": "You dislike long-term commitments and have a tendency to avoid planning to far into the future. This can cause strain on your romantic relationships and also with longer, bigger career goals that take years or decades to achieve."
    },
    {
      "lead": "Easily stressed",
      "body": "As you live in the present, when situations get out of control you can shut down and hide your characteristic charm and creativity in favor of gnashing teeth and shouting voices."
    },
    {
      "lead": "Overly competitive",
      "body": "Whilst competition is a really important trait for sales people, you can escalate small things into intense rivalries and turn down long-term success in the search for mouse-sized, in the moment glory."
    }
  ],
  "businessAndSales": [
    "When it comes to your sales job, you need it to be more than just a source of a income. Wealth, power, structure, career advancement and security are all lesser goals to you than your greatest need – creative freedom. If you do not have it, you will always try to carve out a tangible outlet for your imagination and a chance to express yourself artistically.",
    "People with your SalesCode are passionate experimenters, so you may do better in a small start-up business where there are less rules and restrictions on your creativity. You have a unique perspective on life and a simple desire to be yourself, you are a natural designer or visual person. You should look to see how you can use this to your advantage by selling in a role that uses lots of presentations to win business rather than lots of monotonous cold calling.",
    "You will never have success sitting in a colourless, unchanging, fluorescent lit office environment. You need to be free, so you need flexibility and opportunities for improvisation. You need immersive work that engages all of your senses and you need to leverage your competitive nature. Therefore, perhaps you should look at sales roles where your personality is part of the selling point. A role where you can build a strong personal brand in a fast-paced industry and leverage that to win business.",
    "Even freelance selling, or sales consulting can be a powerful career path for you as there is always a need for this in the marketplace and it allows you to pick and choose your work."
  ],
  "closingQuote": "You have a unique perspective on life and a simple desire to be yourself, you are a natural designer or visual person."
},
  "ESTP": {
  "code": "ESTP",
  "name": "The Entrepreneur",
  "tagline": "The Bold-Action Owner",
  "intro": [
    "You always have an impact on your immediate surroundings and the best way to spot individuals with your SalesCode is to look for them at a party. They will have people flirting around them as they move from group to group, laughing entertaining with a blunt, earthy humor – you love to be the center of attention. If someone on stage asks for a member of the audience to join them, you will volunteer.",
    "Theory, abstract concepts and plodding discussions about global issues and their implications don’t keep you interested for long. You like to keep your conversation energetic, with a good dose of intelligence.",
    "In your sales role you likely leap before you look and you will fix your mistakes as you go along, rather than sitting idle preparing ahead of time.",
    "You have the likeliest combination of SalesCode to have a lifestyle of risky behavior. You live in the moment and you will always dive into action even if you are in the eye of the storm. You enjoy drama, passion and emotional thrills because they’re so stimulating to your logical mind. If you are forced to make critical decisions, they will be based on factual reality in a process of rapid-fire, rational responses.",
    "This makes school, big corporate sales roles and other highly organized environments a challenge for you. This isn’t because you’re dumb or you could never do well in these positions, but a regimented, lectured approach to formal education or the daily grind of cold calls in a boring office is so far away from the hands-on learning that you enjoy. It takes a great deal of maturity to embrace this fact and once you do and you’re working in an environment that complements your SalesCode you will become unstoppable.",
    "You believe that rules were made to be broken. This is something that your old high school teachers or current sales managers are likely to want to beat out of you.",
    "Another challenge is that it makes more sense to use your own moral compass than to follow someone else’s. You believe that rules were made to be broken. This is something that your old high school teachers or current sales managers are likely to want to beat out of you. But if you can minimize your trouble-making, harness your energy, focus through shear willpower through the boring stuff, you are a force to be reckoned with in the B2B selling space.",
    "You have perhaps the most perceptive, unfiltered view of any SalesCode make up and you have the unique skill of being able to notice small changes in your environment. Whether this is a shift in facial expression, a shift in the marketplace or a hidden thought from a potential partner, you’ll see it when others don’t.",
    "Use all of these observations immediately and you’ll be able to ask questions very effectively. One issue that you will run up against is that you often ask questions with little regard for sensitivity. You should remember that not everyone wants their secrets and desires broadcast across the corporate world.",
    "If you aren’t careful, you can get too caught up in the moment and take things too far, too fast. You need to take care of your own health and safety and make this a priority above business success. A lot of people with your SalesCode end up burning out before they learn this lesson.",
    "You make up around 4% of the population and there are just enough of you out there to keep the world spicy and competitive, whilst not too many to cause risk to everyone else involved.",
    "You are full of passion and have a rational if sometimes distracted mind. You are inspiring, convincing and colourful. You are a natural sales professional, natural entrepreneur and a natural group leader as you have the ability to pull everyone along the path less traveled, bringing life and excitement to everywhere you go."
  ],
  "pullQuote": "You like to keep your conversation energetic, with a good dose of intelligence.",
  "peopleLikeYou": [
    "Madonna",
    "Samuel L Jackson",
    "Jaime Lannister from Game of Thrones",
    "Hank Schrader from Breaking Bad"
  ],
  "strengths": [
    {
      "lead": "Bold",
      "body": "You are full of life and energy. There is no greater joy for you than pushing the boundaries, discovering new ways of doing things and alternative ways to help your potential partners. The daily most important task in your SaleSchool planner will be easier for you to complete than any other make up of SalesCode traits. This should be your biggest competitive advantage in the marketplace."
    },
    {
      "lead": "Rational and practical",
      "body": "You love knowledge and philosophy but not for their own sake. What is fun to you is finding ideas that are actionable and drilling into the detail so that you can put them to use."
    },
    {
      "lead": "Original",
      "body": "You combine your boldness and practicality to experiment with new ideas. You can put new solutions together in ways no one else would think to, which is incredibly powerful if you are in a consultative sales role where you are solving your potential partners problems."
    },
    {
      "lead": "Perceptive",
      "body": "This is helped by your ability to notice when things change and when things need to change. Small shifts in other people’s habits and appearances stick out to you and you can use these observations to help create deep connection with others."
    },
    {
      "lead": "Direct",
      "body": "This perceptiveness isn’t used for mind games, as you prefer to communicate clearly, with direct and factual corrections. You see things for what they are and there is not a level of emotion in your world that can change reality."
    },
    {
      "lead": "Social",
      "body": "All of these qualities pull together to make you a natural group leader. This isn’t something that you actively seek out, it’s just that you have a knack for making excellent use of social interactions and networking opportunities."
    }
  ],
  "weaknesses": [
    {
      "lead": "Insensitive",
      "body": "As your feelings and emotions come second to facts and reality, you can create emotionally charged situations and they can become uncomfortable. You need to stop when you might think that blunt honesty is the answer here, because sometimes it isn’t. You may have issues acknowledging and expressing your own feelings as well if you can explain them via logic instead."
    },
    {
      "lead": "Impatient",
      "body": "You move at your own pace to keep yourself excited. Having to slow down because a potential partner or a member of your team doesn’t quite get things can be extremely challenging for you."
    },
    {
      "lead": "Risk prone",
      "body": "This impatience can lead you to push into uncharted territory without thinking of the long-term consequences. You may change sales roles when there is an upside to the current organization just around the corner, you may flit in and out of sales because it doesn’t hold your attention, when the upside of staying in a specific industry and building a personal brand is usually worth the effort. You can miss out on opportunities because you’d rather take the road less traveled, even when the standard route is fine."
    },
    {
      "lead": "Unstructured",
      "body": "When you see an opportunity to fix a problem, to advance forward, to have fun or seize the moment you will often ignore the rules and social expectations to dive straight into it. This may get things done, but it also may create unexpected social or corporate fallout."
    },
    {
      "lead": "Miss the bigger picture",
      "body": "Living in the moment can cause you to miss the forest for the trees. Remember that all parts of a project can’t be perfect, the goal is to get the job done, not to reinvent the wheel at every opportunity."
    },
    {
      "lead": "Defiant",
      "body": "You will avoid being boxed in. Any repetition, hard-line rules, sitting quietly whilst being lectured is not how you want to live your life. You are action oriented and hands-on and so environments like school and even many entry-level sales roles can be so tedious that they become intolerable. However, it is important to learn how to get through these boring times to reap the rewards on the other side."
    }
  ],
  "businessAndSales": [
    "When it comes to your sales career, action is the word of the day. You like to think on your feet and make quick decisions in the heat of the moment. At the same time, you are a nice person who always seems to be to make friends and connections wherever you go. Natural popularity and solid networking can be huge assets in the business world and you have these skill sets more so than any other combination of SalesCode traits.",
    "Your social intelligence combined with your natural boldness and improvisational skill makes sales roles with regular negotiations or a extremely competitive marketplace a great fit for you.",
    "Risks, whether they are big or small are part of life and so any role where you do not need to rely on your boss to tell you what to do will serve you well. The only issue is that you can’t ignore your boss entirely, sometimes you need their help to get the job done and even move up the career ladder.",
    "You’ll do better in a smaller team with less restrictions, less rules, and less structure. You want to live on your own terms and this makes you a brilliant entrepreneur or freelance salesperson.",
    "You are curious, energetic and you have a thirst for action. You are highly observant yet inpatient, this allows you to take a glance at the whole situation and act instantly. So any sales role that needs a, complex fast response, where there is huge downside in not getting the deal done, but of course a big upside for winning will get your juices going."
  ],
  "closingQuote": "The only issue is that you can’t ignore your boss entirely, sometimes you need their help to get the job done and even move up the career ladder."
},
  "ESFP": {
  "code": "ESFP",
  "name": "The Entertainer",
  "tagline": "The Spotlight Owner",
  "intro": [
    "If there’s someone in the room who is likely to spontaneously break into song and dance it is you. You get caught up in the excitement of the moment and you want everyone else to feel just as excited as you do. No other SalesCode combination is as generous with their time and energy when it comes to encouraging others and no one else does it with as much irresistible style as what you do.",
    "You are a born entertainer and you love the spotlight. We’re not just talking about the literally stage here, as many famous people with your SalesCode but indeed actors. You love chatting, soaking up tension and making everyone feel like they’re having a party when you communicate with them. A seemingly perfect group of traits for an outgoing B2B sales professional.",
    "You are utterly social, you enjoy the simplest things and you feel no greater joy than letting lose with a good group of friends.",
    "You have the strongest aesthetic sense of any combination of SalesCode. From your grooming and your outfits, to having a trendy home, you have an eye for fashion. You know what’s attractive and cool the moment you see it and you aren’t afraid to change your environment to reflect your personal style.",
    "You are naturally curious and you enjoy exploring new designs and styles day in day out.",
    "You are very observant and sensitive to other people’s emotions. You are often the first one to drop what they’re doing and help someone talk through a challenging problem.",
    "Interestingly though, and it may not always seem like this from the outside looking in, you know it’s not all about you. You are very observant and sensitive to other people’s emotions. You are often the first one to drop what they’re doing and help someone talk through a challenging problem. You happily provide emotional support and practical advice.",
    "You are however more likely to avoid conflict rather than address it head-on. You do not like drama and you recoil in pain when focus or criticism is targeted at you personally rather than at the work you have done.",
    "You can recognize value and quality which in its own right is a fine trait. However, in combination with your poor planning, this can often cause you to live beyond your means and things like credit cards or consumer debt can be especially dangerous for you. You might also be more focused on changing sales roles regularly, trying to leap on new opportunities, constantly thinking that the grass is greener on the other side.",
    "You are welcomed whenever there is a need for laughter and playfulness. Your ability to bring other people on this ride with you is highly valuable and you can chat hours, sometimes about anything but the topic that you started talking about in the first place. Therefore, any sales roles which require the potential partner to deal with you personally for long periods of time suits you well.",
    "If you can just remember to keep your ducks in a row and remind yourself of your long-term plans, then you will always be ready to dive into the new and exciting things that the world of sales and business has to offer."
  ],
  "pullQuote": "You love chatting, soaking up tension and making everyone feel like they’re having a party when you communicate with them.",
  "peopleLikeYou": [
    "Marilyn Monroe",
    "Jamie Oliver",
    "Penny – The Big Bang Theory",
    "Jack Dawson – Titanic"
  ],
  "strengths": [
    {
      "lead": "Boldness",
      "body": "You aren’t known for holding back. You want to experience everything there is to experience and you don’t mind stepping out of your comfort zone when no one else is willing to. You will find the daily bold, most important tasks within the SalesSchool planner are far easier to pull off than any other SalesCode combination."
    },
    {
      "lead": "Original",
      "body": "Traditions and expectations are secondary to you. You love to experiment with new styles and consistently find new ways to stand out in the crowd."
    },
    {
      "lead": "Ascetics and showmanship",
      "body": "You don’t just stop at mere outfits, you inject your artistic creativity into your words and actions too. Every sales call is a performance, every presentation an opportunity to stand into the spotlight."
    },
    {
      "lead": "Practical",
      "body": "You believe the world is meant to be felt and experienced."
    },
    {
      "lead": "Observance",
      "body": "With all your focus on the here and now, it makes sense that you are a natural when it comes to noticing tangible changes within the business environment."
    },
    {
      "lead": "People skills",
      "body": "More so than anything else, you love to pay attention to people. You are talkative, witty and almost never run out of things to say. Your happiness and satisfaction stem from the time you spend with individuals that you enjoy being with."
    }
  ],
  "weaknesses": [
    {
      "lead": "Sensitive",
      "body": "You’re emotional and quite vulnerable to criticism. If two people gang up on you, you can feel like you have been backed into a corner and you can react badly to this pressure. This is probably your biggest weakness because it makes it hard to address any other weaknesses that people bring to light."
    },
    {
      "lead": "Conflict averse",
      "body": "Sometimes you will ignore and avoid conflict entirely, tending to say and do what’s needed to get out of bad situations."
    },
    {
      "lead": "Easily bored",
      "body": "Without constant excitement, you find ways to create it yourself. This may involve risky behavior, self-indulgence and the pleasures of the moment over long-term plans."
    },
    {
      "lead": "Poor at long-term planning",
      "body": "People with your SalesCode rarely make detailed plans for the future. You want to live in the moment and rarely bother taking the time out of your day to understand the consequences of not planning ahead. You believe that the future could change at any moment, so why bother planning for it?"
    },
    {
      "lead": "Unfocused",
      "body": "Anything that requires long-term dedication and focus is a particular challenge for you. The academic world, unchanging and dense subjects, anything like this can seem unrelatable."
    }
  ],
  "businessAndSales": [
    "You have an incredibly unique quality which makes you exceptional in some sales roles and miserable than others. You like to mirror the mood around you. When you are at a party, concert, or somewhere that everyone is happy, you will reflect that mood. This is why people call you a party person. However, if your friends or the business environment that you are in is sad, you will mirror that with empathy and sympathy. Therefore, you need to be in a positive, fast-paced selling environment rather than selling funeral services for example.",
    "You are perfectly suited for sales because you are a naturally gifted entertainer. In your B2B sales role you can create a sense of excitement, stimulation and novelty between you and your potential partners which they’ll often love.",
    "You enjoy spending time with others, getting to know them and have a real knack for making people happy even through frustrating situations. You appreciate a good challenge and so you’ll do well in any kind of consulting role.",
    "However, any sales role that eliminates human contact and a focuses on impartial, logical, data driven decisions will become torturous to you. Whilst you may do well at first by blowing off steam after work with friends, you’re going to loathe schedules, structures and repetition of these types of environments.",
    "Finally it is important for you to feel appreciated. Therefore it’s very important that you have good chemistry with your sales manager as this can have a big impact on your enjoyment of your sales career."
  ],
  "closingQuote": "In your B2B sales role you can create a sense of excitement, stimulation and novelty between you and your potential partners which they’ll often love."
},
};