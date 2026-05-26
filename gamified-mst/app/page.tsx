'use client';

export default function RootPage() {
  return (
    <div className="flex h-screen items-center justify-center bg-gray-100 p-4">
      <div className="bg-white p-8 rounded-lg shadow-lg max-w-lg text-center">
        <h1 className="text-3xl text-gray-400 font-bold mb-4">MST Study - MedTech @ UCI & Stark Labs</h1>
        <p className="text-gray-600 mb-6">
          Please use the link that corresponds to your task on Prolific.
        </p>
        <p className="text-red-500 mb-6">
          It is HIGHLY IMPORTANT that you use the correct link from Prolific, run on a desktop, laptop, or tablet display.
        </p>
        <p className="text-red-500 mb-6">
          Please navigate to Prolific to access your link in order to be properly enrolled and compensated for your participation. Thank you!
        </p>
        <div className="space-y-3">
          <div className="bg-blue-50 p-4 rounded border border-blue-200">
            <p className="text-sm font-mono text-blue-900 break-all">
              mst.medtech-uci.com/gamified-mst/?PROLIFIC_PID=xxx&SESSION_ID=xxx&STUDY_ID=xxx
            </p>
            <p className="text-xs text-gray-600 mt-2">Gamified version</p>
          </div>
          <div className="bg-green-50 p-4 rounded border border-green-200">
            <p className="text-sm font-mono text-green-900 break-all">
              mst.medtech-uci.com/omst/?PROLIFIC_PID=xxx&SESSION_ID=xxx&STUDY_ID=xxx
            </p>
            <p className="text-xs text-gray-600 mt-2">oMST version</p>
          </div>
        </div>
      </div>
    </div>
  );
}
