export default function TermsOfService() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950">
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">
          Terms of Service
        </h1>

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 md:p-8 prose dark:prose-invert max-w-none">
          <p className="text-gray-600 dark:text-gray-300 mb-4">
            Last updated: {new Date().toLocaleDateString()}
          </p>

          <h2 className="text-xl font-semibold mt-6 mb-3">1. Acceptance of Terms</h2>
          <p>
            By using Prompt Refiner, you agree to these Terms of Service.
            If you do not agree, please do not use our service.
          </p>

          <h2 className="text-xl font-semibold mt-6 mb-3">2. Service Description</h2>
          <p>
            Prompt Refiner is a free tool that analyzes AI-generated images and videos
            to suggest improved prompts. The service is provided "as is" without warranties.
          </p>

          <h2 className="text-xl font-semibold mt-6 mb-3">3. User Responsibilities</h2>
          <p>You agree to:</p>
          <ul className="list-disc pl-6 mb-4">
            <li>Only upload content you have the right to use</li>
            <li>Not upload illegal, harmful, or inappropriate content</li>
            <li>Not attempt to abuse or overload our service</li>
            <li>Not use automated tools to scrape or access our service</li>
          </ul>

          <h2 className="text-xl font-semibold mt-6 mb-3">4. Intellectual Property</h2>
          <p>
            You retain all rights to your uploaded content.
            We do not claim ownership of any images or videos you upload.
            The refined prompts generated are provided for your use.
          </p>

          <h2 className="text-xl font-semibold mt-6 mb-3">5. Limitation of Liability</h2>
          <p>
            Prompt Refiner is not responsible for:
          </p>
          <ul className="list-disc pl-6 mb-4">
            <li>Accuracy of prompt suggestions</li>
            <li>Results obtained from using suggested prompts</li>
            <li>Any damages arising from use of the service</li>
            <li>Service interruptions or data loss</li>
          </ul>

          <h2 className="text-xl font-semibold mt-6 mb-3">6. Advertising</h2>
          <p>
            Our service is supported by advertisements. By using our service,
            you agree to view ads provided by our advertising partners.
          </p>

          <h2 className="text-xl font-semibold mt-6 mb-3">7. Changes to Terms</h2>
          <p>
            We may update these terms at any time. Continued use of the service
            after changes constitutes acceptance of the new terms.
          </p>

          <h2 className="text-xl font-semibold mt-6 mb-3">8. Termination</h2>
          <p>
            We reserve the right to terminate or suspend access to our service
            for any user who violates these terms.
          </p>

          <h2 className="text-xl font-semibold mt-6 mb-3">9. Contact</h2>
          <p>
            For questions about these terms, please contact us at: support@promptrefiner.com
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
