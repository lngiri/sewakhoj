"use client";

import { MessageCircle, Mail, Phone, MapPin, Send, HelpCircle, ArrowRight } from "lucide-react";
import { useState } from "react";
import Link from "next/link";
import { useSiteSettings } from "@/hooks/useSiteSettings";

export default function ContactPage() {
  const { getWhatsAppLink, getWhatsAppNumber } = useSiteSettings();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "General Inquiry",
    message: ""
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    // Simulate API call
    setTimeout(() => {
      setSubmitting(false);
      setSubmitted(true);
    }, 1500);
  };

  const contactMethods = [
    {
      title: "Chat with Us",
      label: "WhatsApp Support",
      value: `+${getWhatsAppNumber()}`,
      link: getWhatsAppLink(),
      icon: <MessageCircle className="w-6 h-6 text-green-500" />,
      color: "bg-green-50"
    },
    {
      title: "Email Us",
      label: "General Inquiry",
      value: "hello@sewakhoj.com",
      link: "mailto:hello@sewakhoj.com",
      icon: <Mail className="w-6 h-6 text-blue-500" />,
      color: "bg-blue-50"
    },
    {
      title: "Call Us",
      label: "Mon-Fri (9am - 6pm)",
      value: "+977-9812345678",
      link: "tel:+9779812345678",
      icon: <Phone className="w-6 h-6 text-sewakhoj-red" />,
      color: "bg-red-50"
    }
  ];

  return (
    <main className="min-h-screen bg-gray-50 font-inter">
      {/* Header */}
      <section className="bg-white border-b border-gray-100 py-20 overflow-hidden relative">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 opacity-50" />
        <div className="max-w-6xl mx-auto px-4 relative z-10 text-center">
          <h1 className="text-5xl md:text-6xl font-black text-gray-900 mb-6 tracking-tighter">Get in Touch</h1>
          <p className="text-xl text-gray-600 font-medium max-w-2xl mx-auto">
            Have a question, feedback, or need help with a booking? Our team is ready to support you.
          </p>
        </div>
      </section>

      <section className="py-20">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-20">
            {contactMethods.map((method, idx) => (
              <a 
                key={idx} 
                href={method.link} 
                target="_blank" 
                rel="noopener noreferrer"
                className="bg-white p-8 rounded-[2.5rem] shadow-sm hover:shadow-xl transition-all border border-gray-100 group"
              >
                <div className={`w-14 h-14 ${method.color} rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500`}>
                  {method.icon}
                </div>
                <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{method.title}</h3>
                <p className="text-lg font-black text-gray-900 mb-2">{method.label}</p>
                <p className="text-sm font-bold text-gray-500 mb-4">{method.value}</p>
                <div className="flex items-center gap-2 text-sm font-black text-gray-900 group-hover:gap-4 transition-all">
                  Contact Now <ArrowRight className="w-4 h-4" />
                </div>
              </a>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-start">
            {/* Contact Form */}
            <div className="bg-white rounded-[3rem] p-10 md:p-14 shadow-xl border border-gray-100 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gray-50 rounded-bl-[3rem] -z-10" />
              
              {submitted ? (
                <div className="text-center py-20 animate-in fade-in zoom-in-95">
                  <div className="w-20 h-20 bg-green-50 text-green-600 rounded-3xl flex items-center justify-center mx-auto mb-8">
                    <Send className="w-10 h-10" />
                  </div>
                  <h2 className="text-3xl font-black text-gray-900 mb-4">Message Sent!</h2>
                  <p className="text-gray-600 font-medium mb-10">Thank you for reaching out. We'll get back to you within 24 hours.</p>
                  <button onClick={() => setSubmitted(false)} className="font-black text-sewakhoj-red uppercase tracking-widest text-xs flex items-center gap-2 mx-auto">
                    Send another message <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <>
                  <h2 className="text-3xl font-black text-gray-900 mb-10 tracking-tight">Send a Message</h2>
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Your Name</label>
                        <input 
                          required
                          type="text" 
                          value={formData.name}
                          onChange={(e) => setFormData({...formData, name: e.target.value})}
                          className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 text-sm font-medium focus:ring-4 focus:ring-sewakhoj-red/10 focus:border-sewakhoj-red transition-all"
                          placeholder="John Doe"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Email Address</label>
                        <input 
                          required
                          type="email" 
                          value={formData.email}
                          onChange={(e) => setFormData({...formData, email: e.target.value})}
                          className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 text-sm font-medium focus:ring-4 focus:ring-sewakhoj-red/10 focus:border-sewakhoj-red transition-all"
                          placeholder="john@example.com"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Subject</label>
                      <select 
                        value={formData.subject}
                        onChange={(e) => setFormData({...formData, subject: e.target.value})}
                        className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 text-sm font-medium focus:ring-4 focus:ring-sewakhoj-red/10 focus:border-sewakhoj-red transition-all"
                      >
                        <option>General Inquiry</option>
                        <option>Booking Help</option>
                        <option>Tasker Partnership</option>
                        <option>Technical Issue</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Message</label>
                      <textarea 
                        required
                        rows={5}
                        value={formData.message}
                        onChange={(e) => setFormData({...formData, message: e.target.value})}
                        className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 text-sm font-medium focus:ring-4 focus:ring-sewakhoj-red/10 focus:border-sewakhoj-red transition-all"
                        placeholder="How can we help you today?"
                      ></textarea>
                    </div>
                    <button 
                      type="submit"
                      disabled={submitting}
                      className="w-full bg-gray-900 text-white py-5 rounded-[2rem] font-black uppercase text-sm tracking-widest hover:bg-black transition-all flex items-center justify-center gap-3 shadow-xl shadow-gray-200"
                    >
                      {submitting ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <><Send className="w-5 h-5" /> Send Message</>}
                    </button>
                  </form>
                </>
              )}
            </div>

            {/* Info Section */}
            <div className="lg:pt-10 space-y-12">
              <div>
                <h3 className="text-xl font-black text-gray-900 mb-6 flex items-center gap-3">
                  <MapPin className="w-6 h-6 text-sewakhoj-red" /> HQ Location
                </h3>
                <p className="text-gray-600 font-medium leading-relaxed">
                  SewaKhoj Technologies Pvt. Ltd.<br/>
                  New Baneshwor, Kathmandu<br/>
                  Bagmati Province, Nepal
                </p>
              </div>

              <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
                <h3 className="text-lg font-black text-gray-900 mb-4 flex items-center gap-3">
                  <HelpCircle className="w-6 h-6 text-blue-500" /> Looking for quick answers?
                </h3>
                <p className="text-gray-500 text-sm font-medium mb-6">Check our Frequently Asked Questions for instant help with bookings and safety.</p>
                <Link href="/faq" className="px-6 py-3 bg-gray-100 text-gray-900 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-gray-200 transition-colors inline-block">
                  View FAQ
                </Link>
              </div>

              <div className="relative p-8 rounded-[2.5rem] bg-gradient-to-br from-sewakhoj-red to-red-700 text-white shadow-xl overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
                <h3 className="text-lg font-black mb-2">Emergency Support?</h3>
                <p className="text-sm text-red-100 font-medium mb-4">Are you facing an urgent issue with an active booking?</p>
                <a href={getWhatsAppLink()} className="font-black underline decoration-white/30 hover:decoration-white transition-all text-sm">
                  Text us on WhatsApp immediately
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
