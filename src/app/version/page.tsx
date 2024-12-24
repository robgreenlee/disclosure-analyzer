'use client';

import { useEffect, useState } from 'react';

export default function VersionPage() {
  const [version, setVersion] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/version')
      .then(res => res.json())
      .then(data => {
        setVersion(data);
        setLoading(false);
      })
      .catch(error => {
        console.error('Error fetching version:', error);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <div className="p-4">Loading version information...</div>;
  }

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-4">Version Information</h1>
      <div className="bg-gray-100 p-4 rounded-lg">
        <pre className="whitespace-pre-wrap">
          {JSON.stringify(version, null, 2)}
        </pre>
      </div>
    </div>
  );
}