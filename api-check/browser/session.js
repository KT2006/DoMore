export async function handleConcurrentSession(page) {
  try {
    // Wait up to 10 seconds for either navigation or the dialog
    console.log('[session] Checking for concurrent session dialog...');
    
    // We race between navigation (success) and dialog appearing
    let dialogDetected = false;
    
    // Check if the dialog wrapper appears
    try {
      await page.waitForFunction(() => {
        const textToMatch = ['terminate', 'concurrent', 'session limit', 'already logged in', 'other devices'];
        const bodyText = document.body.innerText.toLowerCase();
        return textToMatch.some(t => bodyText.includes(t)) && document.querySelector('button, a');
      }, { timeout: 10000, polling: 500 });
      dialogDetected = true;
    } catch (err) {
      // Timeout means no dialog detected, likely navigated or just clean page
      return false;
    }

    if (dialogDetected) {
       console.log('[session] Concurrent session dialog detected. Clicking "Terminate all sessions"...');
       
       const clicked = await page.evaluate(() => {
          const btns = Array.from(document.querySelectorAll('button, a'));
          const terminateBtn = btns.find(b => {
             const text = (b.innerText || '').trim().toLowerCase();
             return text.includes('terminate') || text.includes('terminate all') || text.includes('sign out other');
          });
          
          if (terminateBtn) {
             terminateBtn.click();
             return true;
          }
          return false;
       });

       if (!clicked) {
          throw new Error("Concurrent session dialog found but could not locate 'Terminate' button. Please check the page structure.");
       }

       await new Promise(r => setTimeout(r, 2000));
       console.log('[session] Terminated other sessions. Continuing login...');
       return true;
    }
    
    return false;
  } catch (error) {
    if (error.message.includes('Concurrent session dialog found')) {
      throw error;
    }
    // Ignore other errors (e.g., execution context destroyed due to successful navigation)
    return false;
  }
}
