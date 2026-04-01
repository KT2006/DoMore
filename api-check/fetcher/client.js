import axios from 'axios';

export function createClient(cookieString) {
  const baseUrl = process.env.SRM_BASE_URL || 'https://academia.srmist.edu.in';
  
  const client = axios.create({
    baseURL: baseUrl,
    headers: {
      'Cookie': cookieString,
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': 'application/json, text/html, */*',
      'Referer': baseUrl
    },
    maxRedirects: 5,
    timeout: 30000
  });

  client.interceptors.response.use(
    (response) => {
      const url = response.request.res.responseUrl || response.config.url;
      const body = response.data;
      
      // Check if server redirected us to login or returned login page HTML
      if (
        url.toLowerCase().includes('login') || 
        (typeof body === 'string' && body.toLowerCase().includes('loginform'))
      ) {
         const err = new Error('Session expired, please re-login');
         err.code = 'SESSION_EXPIRED';
         throw err;
      }
      return response;
    },
    (error) => {
      // Pass along errors
      return Promise.reject(error);
    }
  );

  return client;
}
