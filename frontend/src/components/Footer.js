import React from 'react';
import { Mail, Instagram, Send } from 'lucide-react';

const LOGO_URL = 'https://customer-assets.emergentagent.com/job_voltage-victory/artifacts/rkylk165_ChatGPT%20Image%2021%20%D0%B8%D1%8E%D0%BD.%202026%20%D0%B3.%2C%2022_12_30.png';

export const Footer = () => {
  return (
    <footer className="bg-darknet-terminal border-t border-border-DEFAULT py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <img src={LOGO_URL} alt="NECROLINK" className="w-12 h-12 object-contain" />
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
              <li><a href="/gallery" className="font-body text-sm text-text-secondary hover:text-neon-blue transition-colors">Gallery</a></li>
              <li><a href="/store" className="font-body text-sm text-text-secondary hover:text-neon-blue transition-colors">Store</a></li>
              <li><a href="/join" className="font-body text-sm text-text-secondary hover:text-neon-blue transition-colors">Join NECROLINK</a></li>
            </ul>
          </div>

          <div>
            <h3 className="font-heading text-sm font-bold text-neon-blue uppercase tracking-wider mb-4">Connect</h3>
            <div className="space-y-3">
              <a
                href="mailto:maxjohnson1606@gmail.com"
                data-testid="footer-email"
                className="flex items-center gap-2 group"
              >
                <Mail className="w-4 h-4 text-neon-purple group-hover:text-neon-blue transition-colors" />
                <span className="font-body text-sm text-text-secondary group-hover:text-neon-blue transition-colors">maxjohnson1606@gmail.com</span>
              </a>
              <a
                href="https://www.instagram.com/necrolink.official/"
                target="_blank"
                rel="noopener noreferrer"
                data-testid="footer-instagram"
                className="flex items-center gap-2 group"
              >
                <Instagram className="w-4 h-4 text-neon-purple group-hover:text-neon-blue transition-colors" />
                <span className="font-body text-sm text-text-secondary group-hover:text-neon-blue transition-colors">@necrolink.official</span>
              </a>
              <a
                href="https://t.me/CurrentIyAFK"
                target="_blank"
                rel="noopener noreferrer"
                data-testid="footer-telegram"
                className="flex items-center gap-2 group"
              >
                <Send className="w-4 h-4 text-neon-purple group-hover:text-neon-blue transition-colors" />
                <span className="font-body text-sm text-text-secondary group-hover:text-neon-blue transition-colors">@CurrentIyAFK</span>
              </a>
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
