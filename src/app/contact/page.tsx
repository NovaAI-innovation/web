'use client';

import { Phone, Mail, MessageSquare } from 'lucide-react';
import { ContactForm } from './contact-form';

const contactMethods = [
  {
    icon: Phone,
    title: 'Call Us',
    description: 'Speak with our team directly',
    value: '+1 (780) 934-8696',
    href: 'tel:+17809348696',
    priority: 1,
  },
  {
    icon: Mail,
    title: 'Email Us',
    description: 'Send us a detailed message',
    value: 'info@chimeraenterprise.ca',
    href: 'mailto:info@chimeraenterprise.ca',
    priority: 2,
  },
  {
    icon: MessageSquare,
    title: 'Send a Message',
    description: 'Use our contact form below',
    value: 'Fastest response',
    href: '#contact-form',
    priority: 3,
  },
];

export default function ContactPage() {
  const phone = process.env.NEXT_PUBLIC_PHONE || '+1 (780) 934-8696';

  return (
    <main>
      <div className="bg-chimera-red-urgent py-3 text-center text-white text-sm font-semibold flex items-center justify-center gap-3 sticky top-0 z-40">
        <span>24/7 EMERGENCY SERVICE AVAILABLE</span>
        <a href={`tel:${phone.replace(/\s+/g, '')}`} className="underline hover:no-underline">
          CALL NOW {phone}
        </a>
      </div>

      <div className="max-w-5xl mx-auto px-6 pt-16 pb-24">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-black/40 border border-chimera-gold/40 px-5 py-2 rounded-sm text-sm text-chimera-gold mb-6">
            LET&apos;S BUILD TOGETHER
          </div>
          <h1 className="font-display text-7xl tracking-tighter mb-6">Get in touch</h1>
          <p className="text-xl text-chimera-text-secondary max-w-md mx-auto">
            Whether you have a small renovation or a full home transformation in mind, we&apos;re here to help.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-20">
          {contactMethods.map((method) => (
            <a
              key={method.title}
              href={method.href}
              className="group bg-chimera-surface border border-chimera-border p-10 rounded-xl hover:border-chimera-gold transition-colors flex flex-col items-center text-center"
            >
              <div className="w-16 h-16 bg-chimera-gold/10 rounded-md flex items-center justify-center mb-6 group-hover:bg-chimera-gold group-hover:text-black transition-colors">
                <method.icon className="w-8 h-8" />
              </div>
              <div className="font-medium text-xl mb-2">{method.title}</div>
              <div className="text-chimera-text-muted mb-4">{method.description}</div>
              <div className="font-mono text-sm text-chimera-gold">{method.value}</div>
            </a>
          ))}
        </div>

        <div id="contact-form" className="max-w-2xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-medium mb-3">Send us a message</h2>
            <p className="text-chimera-text-muted">We&apos;ll get back to you within one business day.</p>
          </div>
          <ContactForm />
        </div>

        <div className="max-w-2xl mx-auto mt-24">
          <h3 className="text-2xl font-medium mb-8 text-center">Frequently Asked Questions</h3>

          <div className="space-y-6">
            {[
              {
                q: 'How long does a typical renovation take?',
                a: 'Kitchen renovations typically take 6-10 weeks. Full home renovations can take 4-8 months depending on scope.',
              },
              {
                q: 'Do you work with architects and designers?',
                a: 'Yes. We collaborate closely with architects, interior designers, and structural engineers on every project.',
              },
              {
                q: 'What areas do you serve?',
                a: 'We primarily serve Edmonton and surrounding areas including Sherwood Park, St. Albert, and Spruce Grove.',
              },
            ].map((faq, i) => (
              <div key={i} className="bg-chimera-surface border border-chimera-border p-8 rounded-xl">
                <div className="font-medium mb-3">{faq.q}</div>
                <div className="text-chimera-text-muted">{faq.a}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
