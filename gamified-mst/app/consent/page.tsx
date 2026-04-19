import { readFile } from 'fs/promises';
import path from 'path';

export default async function ConsentPage() {
  const consentHtmlPath = path.join(process.cwd(), 'app', 'utils', 'consent_form.html');
  const consentHtml = await readFile(consentHtmlPath, 'utf8');

  return (
    <iframe
      title="Consent form"
      srcDoc={consentHtml}
      style={{ border: 0, width: '100vw', height: '100vh', display: 'block' }}
    />
  );
}