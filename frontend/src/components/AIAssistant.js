import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, X, Send, Sparkles, ChevronDown } from 'lucide-react';

const NECROLINK_KNOWLEDGE = {
  greetings: ['hello', 'hi', 'hey', 'sup', 'yo', 'greetings', 'wassup'],
  about: ['what is necrolink', 'about necrolink', 'tell me about', 'what is this', 'who are you', 'about this clan', 'what clan', 'about the clan'],
  join: ['how to join', 'how do i join', 'join the clan', 'apply', 'application', 'sign up', 'become a member', 'membership', 'join us', 'want to join'],
  events: ['events', 'tournament', 'match', 'friday night', 'dark cup', 'championship', 'upcoming events', 'sunday', 'competition'],
  members: ['members', 'roster', 'who is in', 'players', 'team', 'staff', 'officers', 'leader', 'shadow', 'blaze'],
  rank: ['rank', 'ranks', 'roles', 'hierarchy', 'promote', 'promotion', 'recruit', 'veteran', 'elite', 'officer'],
  chat: ['chat', 'talk', 'message', 'communicate', 'discord', 'community'],
  news: ['news', 'updates', 'announcements', 'latest', 'blog', 'articles'],
  store: ['store', 'shop', 'buy', 'merch', 'merchandise', 'products', 'purchase', 'gear'],
  gallery: ['gallery', 'photos', 'pictures', 'images', 'screenshots'],
  leaderboard: ['leaderboard', 'top players', 'best players', 'ranking', 'stats', 'points', 'wins', 'mvp'],
  login: ['login', 'log in', 'account', 'password', 'register', 'sign in', 'credentials'],
  rules: ['rules', 'guidelines', 'conduct', 'behavior', 'code', 'policy'],
  game: ['mlbb', 'mobile legends', 'bang bang', 'heroes', 'roles', 'jungle', 'gold lane', 'exp lane', 'roam', 'mid'],
  help: ['help', 'what can you do', 'commands', 'options', 'menu', 'topics', '?'],
};

function findIntent(msg) {
  const lower = msg.toLowerCase();
  for (const [intent, keywords] of Object.entries(NECROLINK_KNOWLEDGE)) {
    if (keywords.some(k => lower.includes(k))) return intent;
  }
  return 'unknown';
}

const RESPONSES = {
  greetings: [
    "Hey there! Welcome to NECROLINK — the elite MLBB clan! What can I help you with? 🎮",
    "Greetings, warrior! I'm NecroBot, your guide to everything NECROLINK. Ask me anything!",
    "Yo! Ready to dominate? I'm here to help you learn everything about NECROLINK. What's on your mind?",
  ],
  about: `**NECROLINK** is an elite Mobile Legends: Bang Bang (MLBB) clan focused on competitive play, teamwork, and community.

🏆 Founded by ShadowReaper (Mythical Glory, 3 consecutive seasons)
👥 12+ active members ranging from Warrior to Mythical Glory
⚔️ Regular events: Dark Cup, Friday Night Clash, Sunday Championship
🎯 Motto: *"Connected by Skill. United by Victory."*

We accept players of all ranks who show dedication, teamwork, and sportsmanship.`,

  join: `To join NECROLINK:

1. **Register** an account on this site (click Login → Register)
2. Go to **Join Us** in the navigation menu
3. Fill out the application form with your MLBB info
4. Our staff will review your application (usually within 48 hours)
5. If accepted, you'll be added to the roster as a **Recruit**

📋 We look for: good sportsmanship, teamwork, regular activity, and passion for MLBB. Any rank can apply!`,

  events: `NECROLINK hosts regular events:

🏆 **Dark Cup** — Monthly flagship tournament, 16 teams, 10,000 Diamond prize pool
⚔️ **Friday Night Clash** — Weekly custom matches & voice chat sessions
🏅 **Sunday Championship** — Competitive best-of-3 format with draft
🚀 **Rank Push Night** — Duo/trio rank grinding sessions
🎲 **Mystery Hero Challenge** — Random hero assignment fun events

Check the **Events** page for upcoming dates and to register!`,

  members: `NECROLINK has an active roster of skilled players:

👑 **ShadowReaper** — Leader | Mythical Glory | Jungle (Aamon, Lancelot)
🥈 **BlazeTrigger** — Co-Leader | Mythic | Gold Lane (Beatrix, Granger)
⚡ **NeonWitch** — Officer | Legend | Mage (Lylia, Valir)
🛡️ **IronTank** — Officer | Legend | Tank (Khufra, Atlas)
+ 8 more active members!

Visit the **Members** page to see full profiles, stats, and achievements.`,

  rank: `NECROLINK member ranks (from lowest to highest):

🔰 **Recruit** → New members, proving themselves
🏅 **Member** → Active, contributing players
⭐ **Veteran** → Experienced, reliable members
💎 **Elite** → Outstanding performers
🛡️ **Officer** → Trusted community leaders
🥈 **Co-Leader** → Senior leadership
👑 **Leader** → Clan founder/head

Promotions are based on activity, performance, and contributions to the clan.`,

  chat: `NECROLINK has a **real-time clan chat** built into this site!

💬 **Members Chat** — Open to all logged-in members
🔒 **Staff Chat** — Restricted to Admin and Owner only

To access chat, log in and click **Chat** in the navigation. Messages update every 3 seconds automatically.

We also have a Discord server — check the Discord button in the navigation!`,

  news: `Stay updated with NECROLINK news!

📰 Visit the **News** section for articles about:
- Tournament recaps and highlights
- Member achievements and spotlights
- Clan strategy guides and tips
- MLBB patch notes and meta updates
- Community announcements

You can also see the latest announcements on the homepage!`,

  store: `🛍️ The **NECROLINK Store** sells official clan merchandise:

- Clan jerseys and apparel
- Gaming accessories
- NECROLINK branded items
- Limited edition items

Visit **Store** in the navigation to browse products. Orders are managed by our admin team.`,

  gallery: `📸 The **NECROLINK Gallery** features:

- Epic gameplay screenshots
- Tournament highlights
- Team photos and events
- Memorable clan moments

Check out the **Gallery** section in the navigation!`,

  leaderboard: `🏆 The **NECROLINK Leaderboard** tracks:

- **Top Wins** — Most victories in the clan
- **Top MVP** — Most MVP medals earned
- **Top Points** — Highest clan points
- **Tournament Winners** — Past tournament champions

Visit **Leaderboard** in the nav to see where everyone ranks!`,

  login: `To access your account:

🔑 **Login** — Click "Login" in the top-right navigation, enter your email and password

📝 **Register** — Click Login → switch to Register tab, fill in your details

If you're an admin/owner, after logging in you'll see the **Admin/Owner Dashboard** button in the nav.

Need help? Contact a staff member in the clan chat.`,

  rules: `NECROLINK Community Guidelines:

✅ Respect all members regardless of rank
✅ No toxic behavior, hate speech, or harassment
✅ Be active and participate in clan events
✅ Represent NECROLINK well in-game
✅ Communicate in the clan chat
✅ Follow staff instructions

❌ Smurfing or account boosting is prohibited
❌ Sharing account credentials is not allowed

Breaking rules may result in demotion or removal from the clan.`,

  game: `NECROLINK is a **Mobile Legends: Bang Bang (MLBB)** clan.

🎮 MLBB Roles our members play:
- 🌿 **Jungle** — ShadowReaper (Aamon, Lancelot)
- 🥇 **Gold Lane** — BlazeTrigger (Beatrix, Granger), BlazeMark (Clint)
- 🔮 **Mid Lane** — NeonWitch (Lylia, Valir), VoidWalker (Selena)
- 🛡️ **EXP Lane** — StealthBlade (Lancelot), DragonRider (Barats)
- 🤝 **Roam/Support** — IronTank (Khufra), HolySupport (Estes)

We welcome all roles and hero pools!`,

  help: `I can answer questions about:

🏠 **About** NECROLINK clan
📋 **How to Join** / Application process
📅 **Events** and tournaments
👥 **Members** and roster
🏆 **Ranks** and hierarchy
💬 **Chat** system
📰 **News** and updates
🛍️ **Store** and merchandise
📸 **Gallery**
🏅 **Leaderboard** and stats
🎮 **MLBB** roles and heroes
📖 **Rules** and guidelines

Just ask me anything about the clan! 🎮`,

  unknown: [
    "Hmm, I'm not sure about that! Try asking me about joining, events, members, ranks, the store, or how to use the site. Type **help** to see all topics!",
    "I don't have info on that specifically. Ask me about NECROLINK's members, events, how to join, or any other clan topic! Type **help** for a full list.",
    "I'm still learning! Ask me about the clan, events, ranks, or how to join. Type **help** for all topics I know about.",
  ],
};

function getResponse(intent) {
  const r = RESPONSES[intent];
  if (!r) return RESPONSES.unknown[Math.floor(Math.random() * RESPONSES.unknown.length)];
  if (Array.isArray(r)) return r[Math.floor(Math.random() * r.length)];
  return r;
}

function formatMessage(text) {
  return text
    .split('\n')
    .map((line, i) => {
      line = line.replace(/\*\*(.+?)\*\*/g, '<strong class="text-white">$1</strong>');
      line = line.replace(/\*(.+?)\*/g, '<em class="text-text-secondary italic">$1</em>');
      if (line.match(/^\d+\./)) return `<p key="${i}" class="font-body text-sm text-text-secondary ml-2">${line}</p>`;
      if (line.match(/^[🏆⚔️🏅🚀🎲👑🥈⭐💎🛡️🔰✅❌🔑📝🌿🥇🔮🤝🎮🏠📋📅👥🏠📰🛍️📸🅰️💬🔒]/)) {
        return `<p key="${i}" class="font-body text-sm text-text-secondary">${line}</p>`;
      }
      return line ? `<p key="${i}" class="font-body text-sm text-text-secondary">${line}</p>` : '<div class="h-2"></div>';
    })
    .join('');
}

const QUICK_QUESTIONS = [
  'How do I join?',
  'What events are there?',
  'Who are the members?',
  'What are the ranks?',
  'How to use chat?',
];

export const AIAssistant = () => {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      from: 'bot',
      text: "Hi! I'm **NecroBot** 🤖 — your NECROLINK AI guide. Ask me anything about the clan, events, how to join, or how to use this site!",
      id: 0,
    },
  ]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) {
      setTimeout(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
        inputRef.current?.focus();
      }, 200);
    }
  }, [open, messages]);

  const sendMessage = (text) => {
    const msg = text || input.trim();
    if (!msg) return;
    setInput('');
    const userMsg = { from: 'user', text: msg, id: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setTyping(true);
    setTimeout(() => {
      const intent = findIntent(msg);
      const response = getResponse(intent);
      setMessages(prev => [...prev, { from: 'bot', text: response, id: Date.now() + 1 }]);
      setTyping(false);
    }, 600 + Math.random() * 400);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    sendMessage();
  };

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed bottom-20 right-4 z-50 w-80 sm:w-96 flex flex-col shadow-2xl border border-neon-purple/50 bg-darknet-bg"
            style={{ height: '480px' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-neon-purple/10 border-b border-neon-purple/30">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 bg-neon-purple/20 border border-neon-purple flex items-center justify-center">
                  <Bot className="w-4 h-4 text-neon-purple" />
                </div>
                <div>
                  <p className="font-heading text-sm font-bold text-neon-purple uppercase">NecroBot</p>
                  <p className="font-body text-[10px] text-text-muted">NECROLINK AI Assistant</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-neon-blue rounded-full animate-pulse" />
                <span className="font-body text-[10px] text-neon-blue">Online</span>
                <button onClick={() => setOpen(false)} className="text-text-muted hover:text-white transition-colors ml-1">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {messages.map((msg) => (
                <div key={msg.id} className={`flex gap-2 ${msg.from === 'user' ? 'flex-row-reverse' : ''}`}>
                  {msg.from === 'bot' && (
                    <div className="flex-shrink-0 w-6 h-6 bg-neon-purple/20 border border-neon-purple flex items-center justify-center">
                      <Bot className="w-3.5 h-3.5 text-neon-purple" />
                    </div>
                  )}
                  <div className={`max-w-[85%] px-3 py-2 font-body text-sm leading-relaxed ${
                    msg.from === 'user'
                      ? 'bg-neon-blue/10 border border-neon-blue/40 text-white'
                      : 'bg-darknet-surface border border-border-DEFAULT'
                  }`}>
                    {msg.from === 'bot' ? (
                      <div dangerouslySetInnerHTML={{ __html: formatMessage(msg.text) }} />
                    ) : (
                      <p className="text-white">{msg.text}</p>
                    )}
                  </div>
                </div>
              ))}
              {typing && (
                <div className="flex gap-2">
                  <div className="w-6 h-6 bg-neon-purple/20 border border-neon-purple flex items-center justify-center flex-shrink-0">
                    <Bot className="w-3.5 h-3.5 text-neon-purple" />
                  </div>
                  <div className="px-3 py-2 bg-darknet-surface border border-border-DEFAULT">
                    <div className="flex gap-1 items-center h-4">
                      {[0, 1, 2].map(i => (
                        <div key={i} className="w-1.5 h-1.5 bg-neon-purple rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                      ))}
                    </div>
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Quick Questions */}
            {messages.length <= 2 && (
              <div className="px-3 pb-2 flex flex-wrap gap-1">
                {QUICK_QUESTIONS.map(q => (
                  <button
                    key={q}
                    onClick={() => sendMessage(q)}
                    className="px-2 py-1 text-[10px] font-body border border-neon-purple/40 text-neon-purple hover:bg-neon-purple/10 transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}

            {/* Input */}
            <form onSubmit={handleSubmit} className="flex gap-2 p-3 border-t border-neon-purple/30">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Ask me anything..."
                autoComplete="off"
                className="flex-1 bg-darknet-terminal border border-border-DEFAULT px-3 py-2 font-body text-sm text-white focus:outline-none focus:border-neon-purple placeholder:text-text-muted/50 transition-colors"
              />
              <button
                type="submit"
                disabled={!input.trim() || typing}
                className="px-3 py-2 bg-neon-purple/10 border border-neon-purple text-neon-purple hover:bg-neon-purple/20 transition-all disabled:opacity-40"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toggle Button */}
      <motion.button
        onClick={() => setOpen(o => !o)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="fixed bottom-4 right-4 z-50 w-14 h-14 bg-neon-purple border border-neon-purple shadow-[0_0_20px_rgba(160,32,240,0.4)] flex items-center justify-center transition-all hover:shadow-[0_0_30px_rgba(160,32,240,0.6)]"
        title="Ask NecroBot"
      >
        <AnimatePresence mode="wait">
          {open ? (
            <motion.div key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }}>
              <ChevronDown className="w-6 h-6 text-white" />
            </motion.div>
          ) : (
            <motion.div key="open" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }}>
              <Sparkles className="w-6 h-6 text-white" />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>
    </>
  );
};
