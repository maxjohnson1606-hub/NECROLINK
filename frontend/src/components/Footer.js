import React from 'react';
import { Skull, Mail, MessageCircle } from 'lucide-react';

export const Footer = () => {
  return (
    <footer className="bg-darknet-terminal border-t border-border-DEFAULT py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-darknet-terminal border border-neon-purple flex items-center justify-center border-glow-purple">
                <Skull className="w-5 h-5 text-neon-purple" />
              </div>
              <div className="font-heading text-lg font-black text-neon-purple tracking-wider">NECROLINK</div>
            </div>
            <p className="font-body text-sm text-text-muted tracking-wide">
              Connected by Skill. United by Victory.
            </p>
          </div>

          <div>
            <h3 className="font-heading text-sm font-bold text-neon-blue uppercase tracking-wider mb-4">Quick Links</h3>
            <ul className="space-y-2">
              <li><a href="/events" className="font-body text-sm text-text-secondary hover:text-neon-blue transition-colors">Events</a></li>
              <li><a href="/news" className="font-body text-sm text-text-secondary hover:text-neon-blue transition-colors">News</a></li>
              <li><a href="/store" className="font-body text-sm text-text-secondary hover:text-neon-blue transition-colors">Store</a></li>
              <li><a href="/join" className="font-body text-sm text-text-secondary hover:text-neon-blue transition-colors">Join NECROLINK</a></li>
            </ul>
          </div>

          <div>
            <h3 className="font-heading text-sm font-bold text-neon-blue uppercase tracking-wider mb-4">Connect</h3>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-neon-purple" />
                <span className="font-body text-sm text-text-secondary">necrolink@mlbb.com</span>
              </div>
              <div className="flex items-center gap-2">
                <MessageCircle className="w-4 h-4 text-neon-purple" />
                <span className="font-body text-sm text-text-secondary">Discord: NECROLINK_Official</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-border-DEFAULT text-center">
          <p className="font-body text-xs text-text-muted tracking-wider">
            © 2026 NECROLINK MLBB Clan. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};
