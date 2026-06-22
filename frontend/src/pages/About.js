import React from 'react';
import { motion } from 'framer-motion';
import { Target, Heart, TrendingUp, Shield } from 'lucide-react';

export const About = () => {
  return (
    <div className="min-h-screen bg-darknet-bg">
      {/* Hero Section */}
      <section className="relative min-h-[400px] flex items-center justify-center overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: 'url(https://images.pexels.com/photos/9072394/pexels-photo-9072394.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940)',
          }}
        />
        <div className="absolute inset-0 bg-black/75" />
        
        <div className="relative z-10 max-w-5xl mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h1 className="font-heading text-4xl sm:text-5xl md:text-6xl font-black tracking-tighter uppercase mb-4 neon-glow-blue" data-testid="about-title">
              About NECROLINK
            </h1>
            <p className="font-body text-lg text-neon-purple tracking-wide">
              Elite Mobile Legends: Bang Bang Clan
            </p>
          </motion.div>
        </div>
      </section>

      {/* Our Story */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="bg-darknet-surface border border-neon-blue/50 p-8 md:p-12 border-glow-blue"
            data-testid="story-section"
          >
            <h2 className="font-heading text-2xl sm:text-3xl font-bold text-neon-blue uppercase tracking-tight mb-6">
              Our Story
            </h2>
            <div className="space-y-4 font-body text-base text-text-secondary leading-relaxed">
              <p>
                NECROLINK was founded by a group of passionate Mobile Legends players who shared a common vision: 
                to create an elite gaming community built on skill, respect, and the pursuit of excellence.
              </p>
              <p>
                What started as a small squad has grown into a formidable clan known for tactical gameplay, 
                strong teamwork, and an unwavering competitive spirit. We've competed in numerous tournaments, 
                claimed victories, and built lasting friendships along the way.
              </p>
              <p>
                Today, NECROLINK stands as a beacon for MLBB players who want more than just casual gameplay. 
                We're a family united by our love for the game and our commitment to continuous improvement.
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Mission & Values */}
      <section className="py-16 px-4 bg-darknet-surface">
        <div className="max-w-6xl mx-auto">
          <h2 className="font-heading text-3xl sm:text-4xl font-bold text-neon-purple uppercase tracking-tight mb-12 text-center" data-testid="values-title">
            Our Mission & Values
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              viewport={{ once: true }}
              className="bg-darknet-terminal border border-border-DEFAULT p-8"
              data-testid="value-skill"
            >
              <Target className="w-10 h-10 text-neon-blue mb-4" />
              <h3 className="font-heading text-xl font-bold text-neon-blue uppercase mb-3">Skill Excellence</h3>
              <p className="font-body text-sm text-text-secondary leading-relaxed">
                We believe in constant improvement. Every member is encouraged to refine their skills, 
                learn new strategies, and master their preferred roles.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              viewport={{ once: true }}
              className="bg-darknet-terminal border border-border-DEFAULT p-8"
              data-testid="value-respect"
            >
              <Heart className="w-10 h-10 text-neon-purple mb-4" />
              <h3 className="font-heading text-xl font-bold text-neon-purple uppercase mb-3">Respect & Unity</h3>
              <p className="font-body text-sm text-text-secondary leading-relaxed">
                Mutual respect is the foundation of our clan. We treat every member with dignity, 
                support each other, and celebrate our victories together.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              viewport={{ once: true }}
              className="bg-darknet-terminal border border-border-DEFAULT p-8"
              data-testid="value-growth"
            >
              <TrendingUp className="w-10 h-10 text-neon-red mb-4" />
              <h3 className="font-heading text-xl font-bold text-neon-red uppercase mb-3">Continuous Growth</h3>
              <p className="font-body text-sm text-text-secondary leading-relaxed">
                We're never satisfied with the status quo. Through regular training, strategy sessions, 
                and competitive matches, we push ourselves to reach new heights.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              viewport={{ once: true }}
              className="bg-darknet-terminal border border-border-DEFAULT p-8"
              data-testid="value-competitive"
            >
              <Shield className="w-10 h-10 text-neon-blue mb-4" />
              <h3 className="font-heading text-xl font-bold text-neon-blue uppercase mb-3">Competitive Spirit</h3>
              <p className="font-body text-sm text-text-secondary leading-relaxed">
                We thrive in competition. Whether it's tournaments, ranked matches, or friendly scrimmages, 
                we bring our A-game and fight with honor.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Commitment */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="bg-darknet-surface border border-neon-purple/50 p-8 md:p-12 border-glow-purple"
            data-testid="commitment-section"
          >
            <h2 className="font-heading text-2xl sm:text-3xl font-bold text-neon-purple uppercase tracking-tight mb-6">
              Our Commitment
            </h2>
            <p className="font-body text-base text-text-secondary leading-relaxed mb-4">
              NECROLINK is more than a clan—it's a brotherhood. We commit to fostering an environment where 
              every member can thrive, improve, and enjoy the game to its fullest.
            </p>
            <p className="font-body text-base text-text-secondary leading-relaxed">
              Through teamwork, respect, and unwavering dedication, we aim to leave our mark on the 
              Mobile Legends competitive scene while building friendships that last beyond the game.
            </p>
          </motion.div>
        </div>
      </section>
    </div>
  );
};