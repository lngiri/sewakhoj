"use client";

import Link from "next/link";
import Image from "next/image";
import { useSiteSettings } from "@/hooks/useSiteSettings";

export default function Footer() {
  const { getWhatsAppLink, getWhatsAppNumber } = useSiteSettings();

  return (
    <footer className="bg-gray-900 text-gray-300 py-16" role="contentinfo">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
          {/* Brand Section */}
          <div className="space-y-6">
            <Link href="/" className="flex items-center gap-3">
              <Image src="/logo.png" alt="SewaKhoj Logo" width={48} height={48} className="w-12 h-12 rounded-2xl object-cover shadow-lg border border-white/10" />
              <div translate="no">
                <div className="text-2xl font-black text-white tracking-tight">SewaKhoj</div>
                <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">सेवा खोज</div>
              </div>
            </Link>
            <p className="text-sm leading-relaxed text-gray-400 font-medium">
              Nepal's premium platform for trusted local services. We bridge the gap between quality professionals and valued customers.
            </p>
            <div className="flex gap-4">
              <a href="https://facebook.com/sewakhoj" target="_blank" rel="noopener noreferrer" className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center hover:bg-blue-600 transition-all group">
                <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-white font-black uppercase text-xs tracking-[0.2em] mb-8">Platform</h3>
            <ul className="space-y-4 text-sm font-medium">
              <li><Link href="/services" className="hover:text-sewakhoj-red transition-colors">Service Catalog</Link></li>
              <li><Link href="/browse" className="hover:text-sewakhoj-red transition-colors">Find a Professional</Link></li>
              <li><Link href="/about" className="hover:text-sewakhoj-red transition-colors">About Us</Link></li>
              <li><Link href="/faq" className="hover:text-sewakhoj-red transition-colors">FAQ</Link></li>
              <li><Link href="/contact" className="hover:text-sewakhoj-red transition-colors">Contact Support</Link></li>
            </ul>
          </div>

          {/* Legal Section */}
          <div>
            <h3 className="text-white font-black uppercase text-xs tracking-[0.2em] mb-8">Legal</h3>
            <ul className="space-y-4 text-sm font-medium">
              <li><Link href="/privacy" className="hover:text-sewakhoj-red transition-colors">Privacy Policy</Link></li>
              <li><Link href="/terms" className="hover:text-sewakhoj-red transition-colors">Terms of Service</Link></li>
              <li><Link href="/terms#safety" className="hover:text-sewakhoj-red transition-colors">Safety Guidelines</Link></li>
              <li><Link href="/contact" className="hover:text-sewakhoj-red transition-colors">Report an Issue</Link></li>
            </ul>
          </div>

          {/* Contact Section */}
          <div>
            <h3 className="text-white font-black uppercase text-xs tracking-[0.2em] mb-8">Support</h3>
            <ul className="space-y-4 text-sm font-medium">
              <li>
                <a href={getWhatsAppLink()} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 hover:text-white transition-colors">
                  <div className="w-8 h-8 bg-green-500/10 text-green-500 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.417-.003 6.557-5.338 11.892-11.893 11.892-1.997-.001-3.951-.5-5.688-1.448l-6.305 1.652zm6.599-3.835c1.544.917 3.41 1.403 5.316 1.404h.005c5.451 0 9.887-4.435 9.889-9.886.002-2.642-1.029-5.125-2.902-6.999-1.872-1.874-4.355-2.905-6.998-2.906-5.45 0-9.886 4.435-9.889 9.886-.001 1.93.513 3.818 1.488 5.44l-.989 3.614 3.705-.972zm12.193-7.531c-.328-.164-1.944-.959-2.242-1.069-.299-.11-.517-.164-.734.164-.218.328-.842 1.069-1.031 1.288-.19.218-.379.246-.708.082-.328-.164-1.386-.511-2.641-1.63-1.007-.898-1.688-2.007-1.885-2.335-.197-.328-.021-.505.143-.668.147-.148.328-.383.493-.574.164-.191.218-.328.328-.547.11-.219.055-.41-.027-.574-.082-.164-.734-1.769-1.006-2.426-.264-.639-.533-.553-.734-.563-.19-.01-.408-.011-.626-.011-.218 0-.571.082-.87.41-.299.328-1.143 1.12-1.143 2.732 0 1.612 1.17 3.169 1.333 3.388.164.219 2.303 3.515 5.578 4.922.779.335 1.387.535 1.86.687.782.248 1.494.213 2.056.129.626-.094 1.944-.795 2.216-1.558.272-.764.272-1.422.19-1.557-.081-.135-.298-.218-.626-.382z"/></svg>
                  </div>
                  +{getWhatsAppNumber()}
                </a>
              </li>
              <li><a href="mailto:hello@sewakhoj.com" className="flex items-center gap-3 hover:text-white transition-colors">✉️ hello@sewakhoj.com</a></li>
              <li className="flex items-center gap-3">📍 Kathmandu, Nepal</li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-white/5 pt-10 flex flex-col md:flex-row justify-between items-center gap-6">
          <p className="text-sm text-gray-400 font-bold">
            &copy; {new Date().getFullYear()} SEWAKHOJ TECHNOLOGIES PVT. LTD. All rights reserved.
          </p>
          <div className="flex gap-8 text-xs font-black uppercase tracking-widest text-gray-600">
            <Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-white transition-colors">Terms</Link>
            <Link href="/privacy#cookies" className="hover:text-white transition-colors">Cookies</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
