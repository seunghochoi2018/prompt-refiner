export default function PrivacyPolicy() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950">
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">
          Privacy Policy
        </h1>

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 md:p-8 prose dark:prose-invert max-w-none">
          <p className="text-gray-600 dark:text-gray-300 mb-4">
            Last updated: {new Date().toLocaleDateString()}
          </p>

          <h2 className="text-xl font-semibold mt-6 mb-3">1. Information We Collect</h2>
          <p>We collect minimal information to provide our service:</p>
          <ul className="list-disc pl-6 mb-4">
            <li>Images and videos you upload for analysis (processed and deleted immediately)</li>
            <li>Usage analytics (page views, anonymized)</li>
            <li>Cookies for functionality and advertising</li>
          </ul>

          <h2 className="text-xl font-semibold mt-6 mb-3">2. How We Use Your Information</h2>
          <ul className="list-disc pl-6 mb-4">
            <li>To analyze and improve AI-generated images/videos</li>
            <li>To improve our service</li>
            <li>To display relevant advertisements</li>
          </ul>

          <h2 className="text-xl font-semibold mt-6 mb-3">3. Data Storage</h2>
          <p>
            Uploaded images and videos are processed in real-time and are NOT stored on our servers.
            Analysis results may be cached temporarily to improve service quality.
          </p>

          <h2 className="text-xl font-semibold mt-6 mb-3">4. Third-Party Services</h2>
          <p>We use the following third-party services:</p>
          <ul className="list-disc pl-6 mb-4">
            <li>Google AdSense - for advertising</li>
            <li>Google Analytics - for usage analytics</li>
          </ul>

          <h2 className="text-xl font-semibold mt-6 mb-3">5. Cookies</h2>
          <p>
            We use cookies to enhance your experience and for advertising purposes.
            You can disable cookies in your browser settings.
          </p>

          <h2 className="text-xl font-semibold mt-6 mb-3">6. Your Rights</h2>
          <p>You have the right to:</p>
          <ul className="list-disc pl-6 mb-4">
            <li>Access your data</li>
            <li>Request deletion of your data</li>
            <li>Opt-out of advertising cookies</li>
          </ul>

          <h2 className="text-xl font-semibold mt-6 mb-3">7. Contact</h2>
          <p>
            For privacy-related inquiries, please contact us at: contact@promptrefiner.com
          </p>

          <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
            <a href="/" className="text-blue-600 dark:text-blue-400 hover:underline">
              ← Back to Home
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}
