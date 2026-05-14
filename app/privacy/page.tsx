import { MobileTopNav } from "@/components/MobileTopNav";

export default function PrivacyPolicy() {
  return (
    <div className="bg-zinc-50 min-h-screen pb-20">
      <MobileTopNav title="Privacy Policy" />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 prose prose-zinc bg-white mt-6 rounded-2xl shadow-sm border border-zinc-200 p-6 sm:p-10">
        <h1 className="text-3xl font-black text-zinc-900 mb-2">Privacy Policy</h1>
        <p className="text-zinc-500 mb-8 font-medium">Last Updated: {new Date().toLocaleDateString()}</p>
        
        <div className="space-y-6 text-zinc-700">
            <p>
            Welcome to the <strong>SMCA BhogPass</strong> Event Gateway. This Privacy Policy outlines how we collect, use, and protect your personal information. By using our services, you agree to the collection and use of information in accordance with this policy.
            </p>

            <h2 className="text-xl font-bold text-zinc-900 border-b pb-2">1. Information We Collect</h2>
            <p>We collect the following personal information strictly for the purpose of community event management:</p>
            <ul className="list-disc pl-5 space-y-2">
            <li><strong>Identity Information:</strong> Primary name, spouse name, and children names to generate accurate family-group passes.</li>
            <li><strong>Contact Information:</strong> Email addresses and WhatsApp phone numbers to deliver digital entry passes securely.</li>
            <li><strong>Membership Details:</strong> Your community membership ID and type.</li>
            </ul>

            <h2 className="text-xl font-bold text-zinc-900 border-b pb-2">2. How We Use Your Information</h2>
            <p>Your data is used exclusively within the SMCA organization to:</p>
            <ul className="list-disc pl-5 space-y-2">
            <li>Generate unique digital QR code entry passes for events.</li>
            <li>Manage live attendance, scanning, and access control at event gates.</li>
            <li>Communicate critical event-related notifications via Email or WhatsApp.</li>
            </ul>

            <h2 className="text-xl font-bold text-zinc-900 border-b pb-2">3. Data Sharing and Security</h2>
            <p>
            We <strong>do not</strong> sell, rent, or share your personal information with any third-party marketing or advertising entities. Your data is securely stored using industry-standard cloud infrastructure (Firebase) and is strictly accessible only by authorized SMCA administrators.
            </p>

            <h2 className="text-xl font-bold text-zinc-900 border-b pb-2">4. WhatsApp & Email Communication</h2>
            <p>
            By registering your email and phone number with the SMCA administration, you consent to receiving transactional messages (such as event passes and updates) via WhatsApp and Email. You may request to have your contact details updated or removed from the directory at any time by contacting an administrator.
            </p>

            <h2 className="text-xl font-bold text-zinc-900 border-b pb-2">5. Contact Us</h2>
            <p>
            If you have any questions, concerns, or requests regarding this Privacy Policy or how your data is handled, please contact the SMCA administration team directly.
            </p>
        </div>
      </div>
    </div>
  );
}
