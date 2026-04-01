import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sessionPath = path.join(__dirname, '..', 'session.txt');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

export async function saveCookie(cookieString) {
  try {
    // Extract the value part if it has flags, or just use as is. 
    // Usually for SRM it's the raw string we need.
    const match = cookieString.match(/^([^;]+)/);
    const valueToSave = match ? match[1] : cookieString;
    
    await fs.writeFile(sessionPath, valueToSave, 'utf-8');
    
    const truncated = valueToSave.length > 10 ? valueToSave.substring(0, 10) + '...' : valueToSave;
    console.log(`[cookie] Cookie saved: ${truncated}`);
  } catch (error) {
    console.error(`[cookie] Failed to save cookie:`, error.message);
  }
}

export async function loadCookie() {
  try {
    const data = await fs.readFile(sessionPath, 'utf-8');
    const trimmed = data.trim();
    if (!trimmed) return null;
    
    console.log('[cookie] Loaded session from session.txt');
    return trimmed;
  } catch (error) {
    if (error.code === 'ENOENT') {
      return null;
    }
    console.error(`[cookie] Failed to load cookie:`, error.message);
    return null;
  }
}

export async function clearCookie() {
  try {
    await fs.unlink(sessionPath);
    console.log('[cookie] session.txt cleared');
  } catch (error) {
    if (error.code !== 'ENOENT') {
      console.error(`[cookie] Failed to clear cookie:`, error.message);
    }
  }
}

export async function isCookieValid(cookieString) {
  try {
    const baseUrl = process.env.SRM_BASE_URL || 'https://academia.srmist.edu.in';
    const response = await axios.get(baseUrl, {
      headers: {
        'Cookie': cookieString,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      maxRedirects: 5,
      validateStatus: () => true // Resolve all HTTP statuses
    });

    const body = response.data;
    const url = response.request.res.responseUrl || baseUrl;

    if (url.toLowerCase().includes('login') || (typeof body === 'string' && body.toLowerCase().includes('loginform'))) {
      console.log('[cookie] Cookie validation: expired');
      return false;
    }

    if (typeof body === 'string' && (body.toLowerCase().includes('logout') || body.toLowerCase().includes('sign out'))) {
      console.log('[cookie] Cookie validation: valid');
      return true;
    }

    // Default false if we can't be sure
    console.log('[cookie] Cookie validation: expired');
    return false;
  } catch (error) {
    console.log('[cookie] Cookie validation: expired', error.message);
    return false;
  }
}
