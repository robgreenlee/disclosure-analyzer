'use client';

import { useState, useEffect } from 'react';
import { parsePDF } from '@/utils/pdfParser';

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [analysis, setAnalysis] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [emailCopied, setEmailCopied] = useState(false);
  const [propertyAddress, setPropertyAddress] = useState<string>('');

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSampleReport = async () => {
    setLoading(true);
    setError('');
    setAnalysis(null);
    
    try {
      const response = await fetch('/sample-disclosures/sample-disclosure-1.pdf');
      const blob = await response.blob();
      const file = new File([blob], 'sample-disclosure.pdf', { type: 'application/pdf' });
      setFiles([file]);
      
      // Process the sample file
      let fileContent = await parsePDF(file);
      
      const requestData = {
        fileContent: `\n--- sample-disclosure.pdf ---\n${fileContent}`
      };
      
      const analysisResponse = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      if (!analysisResponse.ok) {
        throw new Error('Failed to analyze sample disclosure');
      }

      const data = await analysisResponse.json();
      if (data.error) {
        throw new Error(data.error);
      }

      setAnalysis(data);
    } catch (err: any) {
      setError(err.message || 'Error processing sample file');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const newFiles = Array.from(event.target.files || []);
    if (newFiles.length > 0) {
      setFiles(prev => [...prev, ...newFiles]);
      setError('');
      setAnalysis(null);
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
      setAnalysis(null);
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
        
        setAnalysis(data);
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
    <div className="min-h-screen bg-anthropic-gradient px-4 py-8 pb-24">
      <div className="relative isolate max-w-4xl mx-auto">
        {/* Background Effects */}
        <div className="absolute inset-x-0 -top-20 -z-10 transform-gpu overflow-hidden blur-3xl">
          <div className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-[#5B2C6F] opacity-[0.02]" />
        </div>
        <div className="absolute inset-x-0 bottom-0 -z-10 transform-gpu overflow-hidden blur-3xl">
          <div className="relative left-[calc(50%+11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-[#936BA3] opacity-[0.02]" />
        </div>
        
        {/* Header */}
        <div className="text-center mb-6">
          <div className="mb-3 inline-flex rounded-full px-3 py-1 text-xs text-[#5B2C6F] ring-1 ring-[#5B2C6F] bg-white">
            Powered by Claude AI
          </div>
          <h1 className="text-2xl font-bold tracking-tight header-gradient animate-gradient mb-2">
            Disclosure Package Analyzer
          </h1>
          <p className="text-sm text-[#666666] max-w-md mx-auto">
            Transform complex real estate disclosures into clear, actionable insights.
          </p>
          <div className="mt-4">
            <button
              onClick={handleSampleReport}
              disabled={loading}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-[#5B2C6F] hover:bg-[#936BA3] rounded-lg transition-colors duration-200"
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-0.5 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Processing...
                </>
              ) : (
                <>
                  Try Sample Report
                  <svg className="ml-1.5 -mr-0.5 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                  </svg>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="bg-anthropic-card shadow-xl rounded-2xl p-6 border border-anthropic">
          <div className="space-y-6">
            <div className="flex flex-col items-center">
              <div className="flex items-center gap-2 mb-4">
                <h2 className="text-sm font-medium text-[#333333]">
                  Upload Disclosure Package
                </h2>
                <span className="text-xs text-[#666666] bg-[#fafafa] px-2 py-0.5 rounded-full">
                  PDF or TXT files
                </span>
              </div>
              
              <div className="w-full max-w-lg">
                <div 
                  className="mt-1 flex justify-center px-6 py-8 border border-dashed border-[#5B2C6F] rounded-xl bg-white hover:bg-[#fafafa] transition-all duration-300 group cursor-pointer"
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                >
                  <div className="text-center">
                    <svg className="mx-auto h-5 w-5 text-[#5B2C6F] group-hover:text-[#936BA3] transition-colors duration-300" stroke="currentColor" fill="none" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 4v16m8-8H4" />
                    </svg>
                    <div className="mt-3 flex flex-col items-center">
                      <label className="relative cursor-pointer inline-flex items-center text-sm font-medium text-[#5B2C6F] hover:text-[#936BA3] transition-colors duration-200">
                        <span>Choose files</span>
                        <input
                          type="file"
                          className="sr-only"
                          accept=".pdf,.txt"
                          onChange={handleFileUpload}
                          multiple
                        />
                      </label>
                      <p className="text-xs text-[#666666] mt-1">
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
                  <div key={index} className="section-card p-4 hover-lift hover-glow">
                    <div className="flex items-center space-x-4">
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 rounded-lg bg-[#fafafa] shadow-md border border-[#E8E8E8] flex items-center justify-center">
                          <svg className="h-4 w-4 text-[#5B2C6F]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h2 className="text-sm font-medium text-[#333333] truncate flex items-center">
                          {file.name}
                          <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-[#fafafa] text-[#5B2C6F] border border-[#E8E8E8]">
                            Ready
                          </span>
                        </h2>
                        <p className="text-xs text-[#666666] mt-0.5">
                          {(file.size / (1024 * 1024)).toFixed(2)} MB · {file.type === 'application/pdf' ? 'PDF Document' : 'Text File'}
                        </p>
                      </div>
                      <div className="flex-shrink-0">
                        <button
                          onClick={() => {
                            const newFiles = files.filter((_, i) => i !== index);
                            setFiles(newFiles);
                          }}
                          className="text-[#666666] hover:text-red-500 transition-colors"
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
                    className="btn-primary"
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
                        <div className="mt-2 text-xs text-[#666666]">
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
                  <h2 className="text-lg font-semibold text-[#333333]">
                    Analysis Results
                  </h2>
                </div>
                
                <div className="section-card p-4 hover-lift hover-glow">
                  <h3 className="text-sm font-medium text-[#5B2C6F] mb-2">Executive Summary</h3>
                  <p className="text-sm text-[#666666] leading-relaxed">{analysis.summary}</p>
                </div>

                <div className="section-card p-4 overflow-hidden hover-lift hover-glow">
                  <h3 className="text-sm font-medium text-[#333333] mb-4">Issues Identified</h3>
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
                        {analysis.issues.map((issue: any, index: number) => (
                          <tr key={index} className={`hover:bg-[#fafafa] transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-[#fafafa]'}`}>
                            <td className="font-medium border-b border-[#E8E8E8]">
                              {issue.issue}
                            </td>
                            <td className="border-b border-[#E8E8E8]">
                              <span className={`inline-flex items-center justify-center w-20 px-2 py-1 rounded-full text-xs font-medium
                                ${issue.severity === 'High' 
                                  ? 'severity-high' 
                                  : issue.severity === 'Medium'
                                    ? 'severity-medium'
                                    : 'severity-low'}`}>
                                {issue.severity}
                              </span>
                            </td>
                            <td className="text-[#666666] border-b border-[#E8E8E8]">
                              {issue.details}
                            </td>
                            <td className="font-medium border-b border-[#E8E8E8]">
                              {issue.estimatedCost}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="section-card p-4 overflow-hidden hover-lift hover-glow">
                  <h3 className="text-sm font-medium text-[#333333] mb-4">Recommendations</h3>
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
                        {analysis.recommendations.map((rec: any, index: number) => (
                          <tr key={index} className={`hover:bg-[#fafafa] transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-[#fafafa]'}`}>
                            <td className="font-medium border-b border-[#E8E8E8]">
                              {rec.action}
                            </td>
                            <td className="border-b border-[#E8E8E8]">
                              <span className={`inline-flex items-center justify-center w-20 px-2 py-1 rounded-full text-xs font-medium
                                ${rec.priority === 'High' 
                                  ? 'severity-high' 
                                  : rec.priority === 'Medium'
                                    ? 'severity-medium'
                                    : 'severity-low'}`}>
                                {rec.priority}
                              </span>
                            </td>
                            <td className="text-[#666666] border-b border-[#E8E8E8]">
                              {rec.timeframe}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="mt-8 section-card p-6 hover-lift hover-glow">
                  <div className="pb-4 mb-4 border-b border-[#E8E8E8]">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-[#333333]">Email Draft</h3>
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
                    <div className="grid grid-cols-2 gap-2 text-xs text-[#666666]">
                      <div>
                        <span className="font-medium">From:</span> [Your Name] &lt;[your.email@example.com]&gt;
                      </div>
                      <div>
                        <span className="font-medium">To:</span> [Client Name] &lt;[client.email@example.com]&gt;
                      </div>
                      <div className="col-span-2">
                        <span className="font-medium">Subject:</span> Disclosure Package Analysis Results - {analysis.propertyAddress || '[Property Address]'}
                      </div>
                    </div>
                  </div>
                  <div className="prose prose-sm max-w-none overflow-auto">
                    <pre id="emailTemplate" className="whitespace-pre-wrap text-sm text-[#333333] font-mono leading-relaxed">
{`Dear [Client Name],

I trust this email finds you well. I've completed a comprehensive analysis of the disclosure package for ${analysis.propertyAddress || '[Property Address]'} and would like to share our detailed findings with you.

EXECUTIVE SUMMARY
----------------
${analysis.summary}

KEY ISSUES IDENTIFIED
-------------------
${analysis.issues.map((issue: any) => `${issue.severity.toUpperCase()} PRIORITY: ${issue.issue}
• Details: ${issue.details}
• Estimated Cost: ${issue.estimatedCost}`).join('\n\n')}

RECOMMENDED ACTIONS
-----------------
${analysis.recommendations.map((rec: any) => `${rec.priority.toUpperCase()} PRIORITY: ${rec.action}
• Timeframe: ${rec.timeframe}`).join('\n\n')}

SUGGESTED NEXT STEPS
------------------
1. Review the findings detailed above
2. Identify any areas requiring clarification or additional information
3. Schedule a consultation to discuss these findings in detail (I can be available at your convenience)

COST SUMMARY
-----------
Based on the identified issues, here's a high-level cost breakdown:
${analysis.issues.map((issue: any) => `• ${issue.issue}: ${issue.estimatedCost}`).join('\n')}

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
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}