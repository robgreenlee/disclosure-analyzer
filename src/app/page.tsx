'use client';

import { useState, useEffect } from 'react';
import { parsePDF } from '@/utils/pdfParser';

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [analysis, setAnalysis] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [emailCopied, setEmailCopied] = useState(false);
  const [propertyAddress, setPropertyAddress] = useState<string>('');

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const newFiles = Array.from(event.target.files || []);
    if (newFiles.length > 0) {
      setFiles(prev => [...prev, ...newFiles]);
      setError('');
      setAnalysis('');
    }
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    
    const newFiles = Array.from(event.dataTransfer.files);
    if (newFiles.length > 0) {
      setFiles(prev => [...prev, ...newFiles]);
      setError('');
      setAnalysis('');
    }
  };

  const copyEmailTemplate = () => {
    const emailContent = document.getElementById('emailTemplate')?.textContent;
    if (emailContent) {
      navigator.clipboard.writeText(emailContent);
      setEmailCopied(true);
      setTimeout(() => setEmailCopied(false), 2000);
    }
  };

  const processFiles = async () => {
    if (files.length === 0) return;

    setLoading(true);
    setError('');
    console.log('Starting file processing...');

    try {
      let combinedContent = '';
      console.log(`Processing ${files.length} files...`);

      for (const file of files) {
        let fileContent: string;

        if (file.type === 'application/pdf') {
          fileContent = await parsePDF(file);
        } else if (file.type === 'text/plain') {
          fileContent = await file.text();
        } else {
          throw new Error('Unsupported file type. Please upload PDF or text files only.');
        }

        combinedContent += `\n--- ${file.name} ---\n${fileContent}`;
      }

      console.log('Sending combined content length:', combinedContent.length);
      
      try {
        const requestData = {
          fileContent: combinedContent
        };
        
        console.log('Sending request:', {
          contentLength: combinedContent.length,
          timestamp: new Date().toISOString()
        });
        
        const response = await fetch('/api/analyze', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestData),
        });

        console.log('Response status:', response.status);
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          throw new Error('Server returned non-JSON response');
        }

        const data = await response.json();
        console.log('Response data:', data);
        
        if (!response.ok) {
          console.error('API error:', data);
          throw new Error(`API error: ${response.status} - ${data.error || 'Unknown error'}`);
        }
        
        if (data.error) {
          console.error('Analysis error:', data.error);
          throw new Error(data.error);
        }
        
        // Validate the response structure
        if (!data.propertyAddress || !data.issues || !data.recommendations || !data.summary) {
          console.error('Invalid response structure. Fields present:', Object.keys(data));
          throw new Error('Invalid analysis results. Missing required fields.');
        }
        
        setAnalysis(JSON.stringify(data));
      } catch (err) {
        console.error('Full error details:', err);
        throw new Error(`Analysis failed: ${err.message}`);
      }
    } catch (err: any) {
      setError(err.message || 'Error processing file. Please try again.');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!mounted) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-violet-50/50 px-4 py-8 pb-24">
      <div className="relative isolate max-w-4xl mx-auto">
        {/* Background Effects */}
        <div className="absolute inset-x-0 -top-20 -z-10 transform-gpu overflow-hidden blur-3xl">
          <div className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-indigo-400 to-violet-500 opacity-20" />
        </div>
        <div className="absolute inset-x-0 bottom-0 -z-10 transform-gpu overflow-hidden blur-3xl">
          <div className="relative left-[calc(50%+11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-violet-500 to-indigo-400 opacity-20" />
        </div>
        
        {/* Header */}
        <div className="text-center mb-6">
          <div className="mb-3 inline-flex rounded-full px-3 py-1 text-xs text-indigo-600 ring-1 ring-indigo-200 bg-white/50 backdrop-blur-sm">
            Powered by Claude AI
          </div>
          <h1 className="text-2xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 to-violet-500 mb-2">
            Disclosure Package Analyzer
          </h1>
          <p className="text-sm text-gray-600 max-w-md mx-auto">
            Transform complex real estate disclosures into clear, actionable insights.
          </p>
        </div>

        {/* Main Content */}
        <div className="bg-white/70 backdrop-blur-sm shadow-xl rounded-2xl p-6 border border-indigo-100/50">
          <div className="space-y-6">
            <div className="flex flex-col items-center">
              <div className="flex items-center gap-2 mb-4">
                <h2 className="text-sm font-medium text-gray-900">
                  Upload Disclosure Package
                </h2>
                <span className="text-xs text-gray-500 bg-gray-100/50 px-2 py-0.5 rounded-full">
                  PDF or TXT up to 10MB
                </span>
              </div>
              
              <div className="w-full max-w-lg">
                <div 
                  className="mt-1 flex justify-center px-6 py-8 border border-dashed border-indigo-200 rounded-xl bg-gradient-to-b from-white to-indigo-50/20 hover:to-indigo-50/40 transition-all duration-300 group cursor-pointer"
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                >
                  <div className="text-center">
                    <svg className="mx-auto h-5 w-5 text-indigo-400 group-hover:text-indigo-500 transition-colors duration-300" stroke="currentColor" fill="none" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 4v16m8-8H4" />
                    </svg>
                    <div className="mt-3 flex flex-col items-center">
                      <label className="relative cursor-pointer inline-flex items-center text-sm font-medium text-indigo-600 hover:text-indigo-500 transition-colors duration-200">
                        <span>Choose files</span>
                        <input
                          type="file"
                          className="sr-only"
                          accept=".pdf,.txt"
                          onChange={handleFileUpload}
                          multiple
                        />
                      </label>
                      <p className="text-xs text-gray-500 mt-1">
                        or drag and drop multiple files
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {files.length > 0 && (
              <div className="mt-6 space-y-4">
                {files.map((file, index) => (
                  <div key={index} className="bg-gradient-to-r from-indigo-50/80 via-violet-50/50 to-purple-50/80 rounded-xl p-4 border border-indigo-200/50 shadow-lg backdrop-blur-sm">
                    <div className="flex items-center space-x-4">
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-white to-indigo-50 shadow-md border border-indigo-100/50 flex items-center justify-center">
                          <svg className="h-4 w-4 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h2 className="text-sm font-medium text-gray-900 truncate flex items-center">
                          {file.name}
                          <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gradient-to-r from-indigo-50 to-violet-50 text-indigo-700 border border-indigo-200/50">
                            Ready
                          </span>
                        </h2>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {(file.size / (1024 * 1024)).toFixed(2)} MB · {file.type === 'application/pdf' ? 'PDF Document' : 'Text File'}
                        </p>
                      </div>
                      <div className="flex-shrink-0">
                        <button
                          onClick={() => {
                            const newFiles = files.filter((_, i) => i !== index);
                            setFiles(newFiles);
                          }}
                          className="text-gray-400 hover:text-red-500 transition-colors"
                        >
                          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                <div className="flex justify-end">
                  <button
                    onClick={processFiles}
                    disabled={loading}
                    className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-full shadow-lg text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transition-all duration-200"
                  >
                    {loading ? (
                      <>
                        <svg className="animate-spin -ml-0.5 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Processing...
                      </>
                    ) : (
                      <>
                        <span>Analyze All Files</span>
                        <svg className="ml-1.5 -mr-0.5 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                        </svg>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {error && (
              <div className="mt-4 rounded-xl bg-red-50 p-3 border border-red-100">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-4 w-4 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-2">
                    <h3 className="text-xs font-medium text-red-800">Analysis Error</h3>
                    <div className="mt-1 text-xs text-red-700 whitespace-pre-wrap">
                      {error}
                      {error.includes('Server error') && (
                        <div className="mt-2 text-xs text-gray-500">
                          Please try again or contact support if the issue persists.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {analysis && (
              <div className="mt-6 space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900">
                    Analysis Results
                  </h2>
                </div>
                
                {(() => {
                  try {
                    const analysisData = JSON.parse(analysis);
                    return (
                      <>
                        <style jsx>{`
                          .severity-high {
                            @apply bg-red-100 text-red-800 border border-red-200;
                          }
                          .severity-medium {
                            @apply bg-yellow-100 text-yellow-800 border border-yellow-200;
                          }
                          .severity-low {
                            @apply bg-green-100 text-green-800 border border-green-200;
                          }
                          .analysis-table {
                            @apply min-w-full divide-y divide-gray-200;
                          }
                          .analysis-table th {
                            @apply px-4 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider;
                          }
                          .analysis-table td {
                            @apply px-4 py-3 whitespace-normal;
                          }
                        `}</style>
                        <div className="bg-gradient-to-r from-violet-500 to-indigo-500 rounded-xl p-[1px] shadow-lg">
                          <div className="bg-white rounded-xl p-4">
                            <h3 className="text-sm font-medium text-transparent bg-clip-text bg-gradient-to-r from-violet-500 to-indigo-500 mb-2">Executive Summary</h3>
                            <p className="text-sm text-gray-600 leading-relaxed">{analysisData.summary}</p>
                          </div>
                        </div>

                        <div className="bg-white shadow-lg rounded-xl p-4 overflow-hidden border border-gray-100">
                          <h3 className="text-sm font-medium text-gray-900 mb-4">Issues Identified</h3>
                          <div className="overflow-x-auto">
                            <table className="analysis-table">
                              <thead>
                                <tr>
                                  <th className="rounded-tl-lg w-1/4">Issue</th>
                                  <th className="w-1/6">Severity</th>
                                  <th className="w-2/5">Details</th>
                                  <th className="rounded-tr-lg w-1/6">Est. Cost</th>
                                </tr>
                              </thead>
                              <tbody>
                                {analysisData.issues.map((issue: any, index: number) => (
                                  <tr key={index} className={`hover:bg-gray-50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                                    <td className="font-medium border-b border-gray-100">
                                      {issue.issue}
                                    </td>
                                    <td className="border-b border-gray-100">
                                      <span className={`inline-flex items-center justify-center w-20 px-2 py-1 rounded-full text-xs font-medium
                                        ${issue.severity === 'High' 
                                          ? 'severity-high' 
                                          : issue.severity === 'Medium'
                                            ? 'severity-medium'
                                            : 'severity-low'}`}>
                                        {issue.severity}
                                      </span>
                                    </td>
                                    <td className="text-gray-600 border-b border-gray-100">
                                      {issue.details}
                                    </td>
                                    <td className="font-medium border-b border-gray-100">
                                      {issue.estimatedCost}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>

                        <div className="bg-white shadow-lg rounded-xl p-4 overflow-hidden border border-gray-100">
                          <h3 className="text-sm font-medium text-gray-900 mb-4">Recommendations</h3>
                          <div className="overflow-x-auto">
                            <table className="analysis-table">
                              <thead>
                                <tr>
                                  <th className="rounded-tl-lg w-2/5">Action Item</th>
                                  <th className="w-1/6">Priority</th>
                                  <th className="rounded-tr-lg w-2/5">Timeframe</th>
                                </tr>
                              </thead>
                              <tbody>
                                {analysisData.recommendations.map((rec: any, index: number) => (
                                  <tr key={index} className={`hover:bg-gray-50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                                    <td className="font-medium border-b border-gray-100">
                                      {rec.action}
                                    </td>
                                    <td className="border-b border-gray-100">
                                      <span className={`inline-flex items-center justify-center w-20 px-2 py-1 rounded-full text-xs font-medium
                                        ${rec.priority === 'High' 
                                          ? 'severity-high' 
                                          : rec.priority === 'Medium'
                                            ? 'severity-medium'
                                            : 'severity-low'}`}>
                                        {rec.priority}
                                      </span>
                                    </td>
                                    <td className="text-gray-600 border-b border-gray-100">
                                      {rec.timeframe}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>

                        <div className="mt-8 bg-white rounded-xl shadow-xl border border-gray-200 p-6">
                          <div className="pb-4 mb-4 border-b border-gray-200">
                            <div className="flex items-center justify-between mb-4">
                              <h3 className="text-lg font-semibold text-gray-900">Email Draft</h3>
                              <button
                                onClick={copyEmailTemplate}
                                className="btn-secondary"
                              >
                                <svg className="mr-1.5 h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                                {emailCopied ? 'Copied!' : 'Copy to Clipboard'}
                              </button>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-xs text-gray-500">
                              <div>
                                <span className="font-medium">From:</span> [Your Name] &lt;[your.email@example.com]&gt;
                              </div>
                              <div>
                                <span className="font-medium">To:</span> [Client Name] &lt;[client.email@example.com]&gt;
                              </div>
                              <div className="col-span-2">
                                <span className="font-medium">Subject:</span> Disclosure Package Analysis Results - {analysisData.propertyAddress || '[Property Address]'}
                              </div>
                            </div>
                          </div>
                          <div className="prose prose-sm max-w-none">
                            <pre id="emailTemplate" className="email-template">
{`Dear [Client Name],

I trust this email finds you well. I've completed a comprehensive analysis of the disclosure package for ${analysisData.propertyAddress || '[Property Address]'} and would like to share our detailed findings with you.

EXECUTIVE SUMMARY
----------------
${analysisData.summary}

KEY ISSUES IDENTIFIED
-------------------
${analysisData.issues.map((issue: any) => `${issue.severity.toUpperCase()} PRIORITY: ${issue.issue}
• Details: ${issue.details}
• Estimated Cost: ${issue.estimatedCost}`).join('\n\n')}

RECOMMENDED ACTIONS
-----------------
${analysisData.recommendations.map((rec: any) => `${rec.priority.toUpperCase()} PRIORITY: ${rec.action}
• Timeframe: ${rec.timeframe}`).join('\n\n')}

SUGGESTED NEXT STEPS
------------------
1. Review the findings detailed above
2. Identify any areas requiring clarification or additional information
3. Schedule a consultation to discuss these findings in detail (I can be available at your convenience)

COST SUMMARY
-----------
Based on the identified issues, here's a high-level cost breakdown:
${analysisData.issues.map((issue: any) => `• ${issue.issue}: ${issue.estimatedCost}`).join('\n')}

I want to ensure you have all the information needed to make an informed decision about this property. The items above represent our initial analysis, but please don't hesitate to ask for clarification or additional details about any specific points.

Would you like to schedule a brief call to discuss these findings in more detail? I'm happy to walk through each item and address any concerns you may have.

Best regards,

[Your Full Name]
[Your Title]
[Company Name]
[License Number]

Contact Information:
📱 [Phone Number]
📧 [Email Address]
🌐 [Company Website]

CONFIDENTIALITY NOTICE: This email and any attachments are intended solely for the named recipient(s) and may contain confidential information. If you have received this in error, please notify the sender immediately and delete all copies.`}
                            </pre>
                          </div>
                        </div>
                      </>
                    );
                  } catch (e) {
                    return (
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <pre className="text-xs text-gray-700 whitespace-pre-wrap">
                          {analysis}
                        </pre>
                      </div>
                    );
                  }
                })()}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}