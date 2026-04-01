import { getUserInfo, getTimetable } from 'reddy-api-srm';
import { loadCookie } from './browser/cookie.js';
import { loginAndGetCookie } from './browser/login.js';

async function test() {
  console.log('Loading session...');
  let cookie = await loadCookie();
  
  if (!cookie) {
    console.log('No cookie. Logging in via Puppeteer...');
    cookie = await loginAndGetCookie();
  }

  console.log('Cookie obtained. Testing User Info fetch...');
  const user = await getUserInfo(cookie);
  console.log('User response:', user.error ? `ERROR: ${user.error}` : 'SUCCESS');
  if (!user.error) console.log(`Name: ${user.name}, Reg: ${user.regNumber}`);

  console.log('\nTesting Timetable fetch...');
  const tt = await getTimetable(cookie);
  console.log('Timetable response:', tt.error ? `ERROR: ${tt.error}` : 'SUCCESS');
  if (!tt.error) console.log(`Classes matched: ${tt.length}`);
}

test().catch(console.error);
