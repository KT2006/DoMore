import { verifyUser, verifyPassword } from 'reddy-api-srm';

async function testLogin() {
  const reg_no = "RA2311030010137";
  const pass = "demo_password"; // Needs to be correct to test properly, but let's see what error it returns

  console.log("Verifying user...");
  const userRes = await verifyUser(reg_no);
  console.log("User Res:", userRes);

  if (userRes && userRes.digest) {
    console.log("Verifying password...");
    const authRes = await verifyPassword({
      identifier: reg_no,
      digest: userRes.digest,
      password: pass
    });
    console.log("Auth Res:", authRes);
  }
}

testLogin().catch(console.error);
