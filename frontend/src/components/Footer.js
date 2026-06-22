import React from 'react';
import { Zap, Mail, MessageCircle } from 'lucide-react';

export const Footer = () => {
  return (
    <footer className="bg-darknet-terminal border-t border-border-DEFAULT py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Logo & Slogan */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-darknet-terminal border border-neon-blue flex items-center justify-center border-glow-blue">
                <Zap className="w-5 h-5 text-neon-blue" />
              </div>
              <div className="font-heading text-lg font-black text-neon-blue tracking-wider">DARK_NET</div>
            </div>
            <p className="font-body text-sm text-text-muted tracking-wide">
              Connected by Skill. United by Victory.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-heading text-sm font-bold text-neon-purple uppercase tracking-wider mb-4">Quick Links</h3>
            <ul className="space-y-2">
              <li><a href="/about" className="font-body text-sm text-text-secondary hover:text-neon-blue transition-colors">About Us</a></li>
              <li><a href="/members" className="font-body text-sm text-text-secondary hover:text-neon-blue transition-colors">Members</a></li>
              <li><a href="/join" className="font-body text-sm text-text-secondary hover:text-neon-blue transition-colors">Join Dark_Net</a></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="font-heading text-sm font-bold text-neon-purple uppercase tracking-wider mb-4">Connect</h3>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-neon-blue" />
                <span className="font-body text-sm text-text-secondary">darknet@mlbb.com</span>
              </div>
              <div className="flex items-center gap-2">
                <MessageCircle className="w-4 h-4 text-neon-blue" />
                <span className="font-body text-sm text-text-secondary">Discord: DarkNet_Official</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-border-DEFAULT text-center">
          <p className="font-body text-xs text-text-muted tracking-wider">
            © 2024 Dark_Net MLBB Clan. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};