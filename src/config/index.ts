interface Config {
  maxFileSize: number;
  maxFilesPerRequest: number;
  supportedFileTypes: string[];
  apiRateLimit: {
    windowSize: number;
    maxRequests: number;
  };
}

const config: Config = {
  maxFileSize: 10 * 1024 * 1024, // 10MB
  maxFilesPerRequest: 5,
  supportedFileTypes: ['application/pdf', 'text/plain'],
  apiRateLimit: {
    windowSize: 60, // seconds
    maxRequests: 5
  }
};

export default config;