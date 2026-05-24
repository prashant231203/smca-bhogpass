import React from "react";

export const metadata = {
  title: "Privacy Policy | SMCA BhogPass",
};

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-zinc-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-white p-8 sm:p-12 rounded-2xl shadow-sm border border-zinc-200">
        <h1 className="text-3xl font-black text-zinc-900 mb-2">Privacy Policy</h1>
        <p className="text-sm text-zinc-500 mb-8">Last updated: May 24, 2026</p>
        
        <div className="space-y-6 text-zinc-700 leading-relaxed">
          <section>
            <h2 className="text-xl font-bold text-zinc-900 mb-3">1. Information We Collect</h2>
            <p>
              The South Madras Cultural Association (SMCA) collects basic personal information such as your name, phone number, and email address for the sole purpose of issuing and managing event passes (BhogPass).
            </p>
          </section>
          
          <section>
            <h2 className="text-xl font-bold text-zinc-900 mb-3">2. How We Use Your Information</h2>
            <p>
              Your information is used exclusively to generate digital passes, verify entry at our events, and send pass links via WhatsApp or Email. We do not sell, rent, or share your personal information with third parties or marketers.
            </p>
          </section>
          
          <section>
            <h2 className="text-xl font-bold text-zinc-900 mb-3">3. WhatsApp Communications</h2>
            <p>
              By providing your phone number during registration or pass generation, you consent to receive your digital event pass via WhatsApp from our verified business account. You may opt out of receiving messages at any time by replying "STOP" within the WhatsApp chat.
            </p>
          </section>
          
          <section>
            <h2 className="text-xl font-bold text-zinc-900 mb-3">4. Data Security</h2>
            <p>
              We implement appropriate security measures to protect your personal data against unauthorized access, alteration, disclosure, or destruction. Access to member data is strictly limited to authorized SMCA administrators.
            </p>
          </section>
          
          <section>
            <h2 className="text-xl font-bold text-zinc-900 mb-3">5. Contact Us</h2>
            <p>
              If you have any questions or concerns about this Privacy Policy or our data practices, please contact the SMCA administration team directly.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
