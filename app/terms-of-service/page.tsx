// app/terms-of-service/page.tsx
import React from 'react';
import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Terms of Service - Vipey',
  description: 'Terms of Service for our video sharing platform',
};

const TermsOfServicePage = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Simple Breadcrumb */}
        <nav className="mb-6" aria-label="Breadcrumb">
          <ol className="inline-flex items-center space-x-1 md:space-x-3">
            <li className="inline-flex items-center">
              <Link href="/" className="inline-flex items-center text-sm font-medium text-gray-700 hover:text-blue-600">
                <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                  <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z"></path>
                </svg>
                Dashboard
              </Link>
            </li>
            <li>
              <div className="flex items-center">
                <svg className="w-6 h-6 text-gray-400" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                  <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd"></path>
                </svg>
                <span className="ml-1 text-sm font-medium text-gray-500 md:ml-2">Terms of Service</span>
              </div>
            </li>
          </ol>
        </nav>

        {/* Main Content */}
        <div className="bg-white shadow-lg rounded-lg overflow-hidden">
          <div className="px-8 py-6 border-b border-gray-200">
            <h1 className="text-3xl font-bold text-gray-900">Terms of Service</h1>
            <p className="mt-2 text-sm text-gray-600">Last updated: {new Date().toLocaleDateString()}</p>
          </div>

          <div className="px-8 py-6 space-y-8">
            {/* Introduction */}
            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. Introduction</h2>
              <p className="text-gray-700 leading-relaxed">
                Welcome to our video sharing platform. These Terms of Service ("Terms") govern your use of our website, 
                mobile application, and services (collectively, the "Service") operated by us. By accessing or using our 
                Service, you agree to be bound by these Terms.
              </p>
            </section>

            {/* Account Registration */}
            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. Account Registration</h2>
              <div className="space-y-3 text-gray-700">
                <p>To use our Service, you must:</p>
                <ul className="list-disc list-inside ml-4 space-y-2">
                  <li>Be at least 18 years old or have parental consent</li>
                  <li>Provide accurate and complete registration information</li>
                  <li>Maintain the security of your account credentials</li>
                  <li>Verify your email address and phone number (WhatsApp)</li>
                  <li>Accept responsibility for all activities under your account</li>
                </ul>
              </div>
            </section>

            {/* Video Content and Uploads */}
            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. Video Content and Uploads</h2>
              <div className="space-y-4 text-gray-700">
                <h3 className="text-lg font-medium text-gray-900">3.1 Content Guidelines</h3>
                <p>You agree that all video content you upload must:</p>
                <ul className="list-disc list-inside ml-4 space-y-2">
                  <li>Be original content or content you have the right to distribute</li>
                  <li>Not violate any copyright, trademark, or other intellectual property rights</li>
                  <li>Not contain illegal, harmful, or offensive material</li>
                  <li>Not include spam, malware, or malicious content</li>
                  <li>Comply with all applicable laws and regulations</li>
                </ul>
                
                <h3 className="text-lg font-medium text-gray-900 mt-6">3.2 Content Organization</h3>
                <p>You may organize your content using our folder system and set visibility preferences for your videos.</p>
              </div>
            </section>

            {/* Earnings and Payments */}
            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. Earnings and Payments</h2>
              <div className="space-y-4 text-gray-700">
                <h3 className="text-lg font-medium text-gray-900">4.1 Revenue Sharing</h3>
                <p>
                  You may earn revenue from your video content based on views and our current CPM (Cost Per Mille) rate. 
                  Earnings are calculated based on valid views as determined by our system.
                </p>
                
                <h3 className="text-lg font-medium text-gray-900">4.2 Payment Terms</h3>
                <ul className="list-disc list-inside ml-4 space-y-2">
                  <li>Minimum payout threshold must be met before withdrawal</li>
                  <li>Valid payment method must be registered and verified</li>
                  <li>We reserve the right to withhold payments for suspicious activity</li>
                  <li>Processing times may vary depending on payment method</li>
                  <li>You are responsible for applicable taxes on your earnings</li>
                </ul>
              </div>
            </section>

            {/* Prohibited Activities */}
            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">5. Prohibited Activities</h2>
              <div className="text-gray-700">
                <p className="mb-3">You agree not to:</p>
                <ul className="list-disc list-inside ml-4 space-y-2">
                  <li>Artificially inflate video views through bots, scripts, or other automated means</li>
                  <li>Engage in click fraud or invalid traffic generation</li>
                  <li>Upload copyrighted content without proper authorization</li>
                  <li>Create multiple accounts to circumvent restrictions</li>
                  <li>Share your account credentials with others</li>
                  <li>Attempt to reverse engineer or hack our systems</li>
                  <li>Violate any applicable laws or regulations</li>
                </ul>
              </div>
            </section>

            {/* Account Suspension */}
            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. Account Suspension and Termination</h2>
              <div className="space-y-3 text-gray-700">
                <p>
                  We reserve the right to suspend or terminate accounts that violate these Terms. 
                  Suspended accounts may have limited access to earnings and platform features.
                </p>
                <p>
                  You may terminate your account at any time by contacting our support team. 
                  Upon termination, you forfeit any pending earnings below the minimum payout threshold.
                </p>
              </div>
            </section>

            {/* Privacy and Data */}
            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">7. Privacy and Data Protection</h2>
              <div className="text-gray-700">
                <p>
                  We collect and process your personal information in accordance with our Privacy Policy. 
                  This includes email verification, analytics data, and payment information necessary for 
                  operating the Service.
                </p>
              </div>
            </section>

            {/* Intellectual Property */}
            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">8. Intellectual Property</h2>
              <div className="space-y-3 text-gray-700">
                <p>
                  You retain ownership of your original video content. By uploading content, you grant us a 
                  worldwide, non-exclusive license to host, distribute, and display your content on our platform.
                </p>
                <p>
                  Our platform, including its design, features, and technology, is protected by intellectual 
                  property rights and remains our property.
                </p>
              </div>
            </section>

            {/* Disclaimer and Limitations */}
            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">9. Disclaimer and Limitations</h2>
              <div className="space-y-3 text-gray-700">
                <p>
                  The Service is provided "as is" without warranties of any kind. We do not guarantee 
                  uninterrupted service, specific earning amounts, or complete data security.
                </p>
                <p>
                  Our liability is limited to the maximum extent permitted by law. We are not responsible 
                  for indirect, incidental, or consequential damages arising from your use of the Service.
                </p>
              </div>
            </section>

            {/* Changes to Terms */}
            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">10. Changes to Terms</h2>
              <div className="text-gray-700">
                <p>
                  We may update these Terms periodically. Significant changes will be communicated through 
                  email or platform notifications. Continued use of the Service after changes constitutes 
                  acceptance of the new Terms.
                </p>
              </div>
            </section>

            {/* Contact Information */}
            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">11. Contact Information</h2>
              <div className="text-gray-700">
                <p>
                  If you have questions about these Terms, please contact our support team through the 
                  platform or email us at support@vipey.co.
                </p>
              </div>
            </section>

            {/* Agreement */}
            <section className="bg-gray-50 p-6 rounded-lg">
              <p className="text-gray-700 font-medium">
                By using our Service, you acknowledge that you have read, understood, and agree to be 
                bound by these Terms of Service.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TermsOfServicePage;