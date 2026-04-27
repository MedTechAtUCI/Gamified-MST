'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function ConsentContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [consentHtml, setConsentHtml] = useState('');
  const prolificNoConsent = process.env.NEXT_PUBLIC_PROLIFIC_NO_CONSENT || 'https://app.prolific.com/submissions/complete';

  useEffect(() => {
    // Fetch the consent form HTML from the public or static path
    const loadConsentForm = async () => {
      try {
        const response = await fetch('/consent_form.html');
        const html = await response.text();
        setConsentHtml(html);
      } catch (error) {
        console.error('Error loading consent form:', error);
        setConsentHtml('<p>Error loading consent form. Please refresh the page.</p>');
      }
    };

    loadConsentForm();
  }, []);

  // Send the no-consent URL to iframe when it loads
  useEffect(() => {
    const iframe = document.querySelector('iframe') as HTMLIFrameElement;
    if (iframe && consentHtml) {
      const handleIframeLoad = () => {
        iframe.contentWindow?.postMessage(
          { action: 'set_no_consent_url', url: prolificNoConsent },
          '*'
        );
      };
      
      // Try to send immediately in case it's already loaded
      try {
        iframe.contentWindow?.postMessage(
          { action: 'set_no_consent_url', url: prolificNoConsent },
          '*'
        );
      } catch (e) {
        // If not ready, wait for load
        iframe.addEventListener('load', handleIframeLoad);
        return () => iframe.removeEventListener('load', handleIframeLoad);
      }
    }
  }, [consentHtml, prolificNoConsent]);

  // Handle consent completion and forward to task
  useEffect(() => {
    const handleConsent = (event: MessageEvent) => {
      if (event.data && event.data.action === 'consent_rejected') {
        window.location.href = prolificNoConsent;
        return;
      }
      if (event.data && event.data.action === 'consent_accepted') {
        const prolificPID = searchParams.get('PROLIFIC_PID') || 'test_user';
        const sessionID = searchParams.get('SESSION_ID') || 'test_session';
        const studyID = searchParams.get('STUDY_ID') || 'test_study';
        const mode = searchParams.get('mode') || 'Imbal2x3';

        const params = new URLSearchParams({
          PROLIFIC_PID: prolificPID,
          SESSION_ID: sessionID,
          STUDY_ID: studyID,
          mode: mode,
        });

        router.push(`/task?${params.toString()}`);
      }
    };

    window.addEventListener('message', handleConsent);
    return () => window.removeEventListener('message', handleConsent);
  }, [searchParams, router, prolificNoConsent]);

  return (
    <iframe
      title="Consent form"
      srcDoc={consentHtml}
      style={{ border: 0, width: '100vw', height: '100vh', display: 'block' }}
    />
  );
}
