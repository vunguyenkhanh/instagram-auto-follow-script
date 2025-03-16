/**
 * Instagram Auto Follow Bot - Enhanced Version
 *
 * Features:
 * - Adjustable follow speed
 * - Adjustable daily follow limit
 * - Auto-scrolling to load more accounts
 * - Anti-ban and limitation measures
 * - Persistent settings using localStorage
 * - Skip already followed accounts
 *
 * Original author: Vu Nguyen Khanh
 *
 * Usage:
 * - The bot will automatically scroll to load more accounts
 * - The bot will automatically skip accounts that are already followed
 */

(async function () {
  const delay = (ms) => new Promise((res) => setTimeout(res, ms));

  let running = false;
  let count = parseInt(localStorage.getItem('follow_count')) || 0;
  let dailyCount = parseInt(localStorage.getItem('daily_follow_count') || 0);
  let lastFollowDate = localStorage.getItem('last_follow_date') || new Date().toDateString();
  let minDelay = parseInt(localStorage.getItem('min_delay')) || 10; // Increased default delay to 10s
  let maxDelay = parseInt(localStorage.getItem('max_delay')) || 25; // Added adjustable max delay
  let maxFollows = parseInt(localStorage.getItem('max_follows')) || 50; // Reduced to 50 default
  let maxDailyFollows = parseInt(localStorage.getItem('max_daily_follows')) || 100; // Daily limit
  let randomPause = localStorage.getItem('random_pause') === 'true';
  let skippedCount = 0; // Track skipped accounts

  // Function to find the scrollable container in the Following dialog
  const findScrollContainer = () => {
    // First find the Following dialog
    const dialog = document.querySelector('div[role="dialog"]');
    if (!dialog) return null;

    // Find all divs in the dialog
    const allDivs = dialog.querySelectorAll('div');

    // First try: Find div with style containing overflow: hidden auto
    for (const div of allDivs) {
      const style = div.getAttribute('style');
      if (
        style &&
        (style.includes('overflow: hidden auto') ||
          style.includes('overflow:hidden auto') ||
          style.includes('overflow-y: auto'))
      ) {
        // Verify this is the correct container by checking if it has follow buttons
        const hasButtons = div.querySelector('button');
        const isLargeEnough = div.clientHeight > 100;
        if (hasButtons && isLargeEnough) return div;
      }
    }

    // Second try: Find by computed style
    for (const div of allDivs) {
      const style = window.getComputedStyle(div);
      const hasAutoOverflow = style.overflowY === 'auto' || style.overflow.includes('auto');
      const hasButtons = div.querySelector('button');
      const isLargeEnough = div.clientHeight > 100;
      const hasHeight = div.style.height || div.style.maxHeight;

      // Must have auto overflow, buttons, be large enough, and have height constraint
      if (hasAutoOverflow && hasButtons && isLargeEnough && hasHeight) {
        return div;
      }
    }

    // Third try: Find the first large div with buttons that's a child of a div with auto overflow
    for (const div of allDivs) {
      const style = window.getComputedStyle(div);
      const hasAutoOverflow = style.overflowY === 'auto' || style.overflow.includes('auto');

      if (hasAutoOverflow) {
        const childrenWithButtons = Array.from(div.children).filter((child) => {
          return (
            child.tagName === 'DIV' && child.clientHeight > 100 && child.querySelector('button')
          );
        });

        if (childrenWithButtons.length > 0) {
          return div; // Return the scrollable parent
        }
      }
    }

    return null;
  };

  // Check and reset daily follow count if it's a new day
  const today = new Date().toDateString();
  if (today !== lastFollowDate) {
    dailyCount = 0;
    localStorage.setItem('daily_follow_count', dailyCount);
    localStorage.setItem('last_follow_date', today);
  }

  function createUI() {
    let oldUI = document.getElementById('autoFollowUI');
    if (oldUI) oldUI.remove();

    let ui = document.createElement('div');
    ui.id = 'autoFollowUI';
    ui.innerHTML = `
            <div style="position: fixed; top: 10px; right: 10px; background: #1e1e1e; padding: 20px; border-radius: 12px; box-shadow: 0px 4px 20px rgba(255, 255, 255, 0.2); color: white; font-family: Arial, sans-serif; font-size: 14px; text-align: center; z-index: 9999; width: 280px;">
                <p style="margin: 0; font-size: 18px; font-weight: bold;">🚀 Instagram Auto Follow</p>
                <p style="margin-top: 5px;"><span style="color: #0f0; font-size: 16px;">✔ Followed:</span> <span id="followCount" style="font-weight: bold; color: #0f0;">${count}</span></p>
                <p style="margin-top: 5px;"><span style="color: #ffc107; font-size: 16px;">📅 Today:</span> <span id="dailyCount" style="font-weight: bold; color: #ffc107;">${dailyCount}/${maxDailyFollows}</span></p>
                <p style="margin-top: 5px;"><span style="color: #ff69b4; font-size: 16px;">⏭️ Skipped:</span> <span id="skippedCount" style="font-weight: bold; color: #ff69b4;">${skippedCount}</span></p>
                <p id="status" style="color: #ffc107; font-size: 14px;">🔄 Status: Idle</p>
                <div style="text-align: left; margin-top: 10px;">
                    <label style="display: block; margin-bottom: 5px;">⏳ Min Delay: <span id="minDelayValue">${minDelay}</span> seconds</label>
                    <input type="range" id="minDelayControl" min="10" max="40" step="1" value="${minDelay}" style="width: 100%;">
                </div>
                <div style="text-align: left; margin-top: 10px;">
                    <label style="display: block; margin-bottom: 5px;">⏳ Max Delay: <span id="maxDelayValue">${maxDelay}</span> seconds</label>
                    <input type="range" id="maxDelayControl" min="15" max="60" step="1" value="${maxDelay}" style="width: 100%;">
                </div>
                <div style="text-align: left; margin-top: 10px;">
                    <label style="display: block; margin-bottom: 5px;">🎯 Follows per session: <span id="maxFollowsValue">${maxFollows}</span></label>
                    <input type="range" id="maxFollows" min="10" max="200" step="5" value="${maxFollows}" style="width: 100%;">
                </div>
                <div style="text-align: left; margin-top: 10px;">
                    <label style="display: block; margin-bottom: 5px;">📅 Daily follow limit: <span id="maxDailyFollowsValue">${maxDailyFollows}</span></label>
                    <input type="range" id="maxDailyFollows" min="10" max="200" step="5" value="${maxDailyFollows}" style="width: 100%;">
                </div>
                <div style="text-align: left; margin-top: 10px;">
                    <label style="display: flex; align-items: center; margin-bottom: 5px;">
                        <input type="checkbox" id="randomPauseCheck" ${
                          randomPause ? 'checked' : ''
                        } style="margin-right: 5px;">
                        🛌 Random pauses
                    </label>
                </div>
                <div style="display: flex; justify-content: space-between; margin-top: 15px;">
                    <button id="startFollow" style="flex: 1; background: #28a745; color: white; border: none; padding: 10px; margin: 5px; border-radius: 5px; cursor: pointer; font-size: 14px;">Start</button>
                    <button id="stopFollow" style="flex: 1; background: #dc3545; color: white; border: none; padding: 10px; margin: 5px; border-radius: 5px; cursor: pointer; font-size: 14px;">Stop</button>
                    <button id="resetFollow" style="flex: 1; background: #ffc107; color: black; border: none; padding: 10px; margin: 5px; border-radius: 5px; cursor: pointer; font-size: 14px;">Reset</button>
                </div>
            </div>
        `;
    document.body.appendChild(ui);

    document.getElementById('startFollow').onclick = () => {
      if (!running) {
        running = true;
        skippedCount = 0; // Reset skipped count on new session
        document.getElementById('status').innerText = '🏃‍♂️ Running...';
        document.getElementById('skippedCount').innerText = skippedCount;
        followProcess();
      }
    };

    document.getElementById('stopFollow').onclick = () => {
      running = false;
      document.getElementById('status').innerText = '🛑 Stopped!';
    };

    document.getElementById('resetFollow').onclick = () => {
      count = 0;
      dailyCount = 0;
      skippedCount = 0;
      localStorage.setItem('follow_count', 0);
      localStorage.setItem('daily_follow_count', 0);
      document.getElementById('followCount').innerText = count;
      document.getElementById('dailyCount').innerText = `${dailyCount}/${maxDailyFollows}`;
      document.getElementById('skippedCount').innerText = skippedCount;
      document.getElementById('status').innerText = '🔄 Reset complete!';
    };

    document.getElementById('minDelayControl').oninput = (e) => {
      minDelay = parseInt(e.target.value);
      if (minDelay >= maxDelay) {
        maxDelay = minDelay + 5;
        document.getElementById('maxDelayControl').value = maxDelay;
        document.getElementById('maxDelayValue').innerText = maxDelay;
      }
      localStorage.setItem('min_delay', minDelay);
      localStorage.setItem('max_delay', maxDelay);
      document.getElementById('minDelayValue').innerText = minDelay;
    };

    document.getElementById('maxDelayControl').oninput = (e) => {
      maxDelay = parseInt(e.target.value);
      if (maxDelay <= minDelay) {
        minDelay = maxDelay - 5;
        document.getElementById('minDelayControl').value = minDelay;
        document.getElementById('minDelayValue').innerText = minDelay;
      }
      localStorage.setItem('max_delay', maxDelay);
      localStorage.setItem('min_delay', minDelay);
      document.getElementById('maxDelayValue').innerText = maxDelay;
    };

    document.getElementById('maxFollows').oninput = (e) => {
      maxFollows = parseInt(e.target.value);
      localStorage.setItem('max_follows', maxFollows);
      document.getElementById('maxFollowsValue').innerText = maxFollows;
    };

    document.getElementById('maxDailyFollows').oninput = (e) => {
      maxDailyFollows = parseInt(e.target.value);
      localStorage.setItem('max_daily_follows', maxDailyFollows);
      document.getElementById('maxDailyFollowsValue').innerText = maxDailyFollows;
      document.getElementById('dailyCount').innerText = `${dailyCount}/${maxDailyFollows}`;
    };

    document.getElementById('randomPauseCheck').onchange = (e) => {
      randomPause = e.target.checked;
      localStorage.setItem('random_pause', randomPause);
    };
  }

  async function followProcess() {
    console.log('🚀 Instagram Auto Follow started!');

    let followCounter = 0;
    let consecutiveFollows = 0;
    let noNewAccountsCount = 0;

    while (running) {
      // Check daily follow limit
      if (dailyCount >= maxDailyFollows) {
        console.log('🚫 Reached daily follow limit. Stopping.');
        document.getElementById('status').innerText = '✅ Daily limit reached!';
        running = false;
        break;
      }

      // Check session follow limit
      if (followCounter >= maxFollows) {
        console.log('🚫 Reached session follow limit. Stopping.');
        document.getElementById('status').innerText = '✅ Session complete!';
        running = false;
        break;
      }

      // Auto-scroll to load more accounts
      const scrollAttempts = 3;
      for (let i = 0; i < scrollAttempts && running; i++) {
        const scrollContainer = findScrollContainer();

        if (scrollContainer) {
          console.log('Found Following list container:', scrollContainer);

          const lastHeight = scrollContainer.scrollHeight;
          const viewportHeight = scrollContainer.clientHeight;

          // Function to perform scroll
          const performScroll = async () => {
            // Get the last button element to scroll to
            const allButtons = scrollContainer.querySelectorAll('button');
            const lastButton = allButtons[allButtons.length - 1];

            if (lastButton) {
              // Scroll to the last button
              lastButton.scrollIntoView({ behavior: 'smooth', block: 'center' });
              await delay(1000);

              // Scroll a bit more to trigger loading
              scrollContainer.scrollTop = scrollContainer.scrollHeight;
              await delay(1000);

              // Simulate mouse wheel for natural scrolling
              for (let i = 0; i < 3; i++) {
                const wheelEvent = new WheelEvent('wheel', {
                  deltaY: 100,
                  bubbles: true,
                });
                lastButton.dispatchEvent(wheelEvent);
                await delay(500);
              }

              // Force scroll event on container and its parents
              let element = scrollContainer;
              while (element) {
                ['scroll', 'wheel'].forEach((eventName) => {
                  element.dispatchEvent(new Event(eventName, { bubbles: true }));
                });
                element = element.parentElement;
              }
            } else {
              // If no buttons found, try direct scroll
              const scrollAmount = Math.floor(viewportHeight * 0.8); // Scroll 80% of viewport
              scrollContainer.scrollTop += scrollAmount;
            }

            // Wait for content to load
            await delay(2000);

            // Try to trigger Instagram's infinite scroll mechanism
            const touchStartEvent = new TouchEvent('touchstart', {
              bubbles: true,
              cancelable: true,
            });
            const touchEndEvent = new TouchEvent('touchend', {
              bubbles: true,
              cancelable: true,
            });

            scrollContainer.dispatchEvent(touchStartEvent);
            await delay(100);
            scrollContainer.dispatchEvent(touchEndEvent);

            // Additional wait for content
            await delay(1500);
          };

          // Perform multiple scrolls with increased attempts and better checking
          for (let j = 0; j < 5 && running; j++) {
            document.getElementById('status').innerText = `📜 Scrolling (${j + 1}/5)...`;

            const beforeScrollHeight = scrollContainer.scrollHeight;
            const beforeButtonCount = scrollContainer.querySelectorAll('button').length;

            await performScroll();

            // Wait a bit more and check if content was loaded
            await delay(2000);

            const afterScrollHeight = scrollContainer.scrollHeight;
            const afterButtonCount = scrollContainer.querySelectorAll('button').length;

            // Check if either height increased or we got more buttons
            if (afterScrollHeight > beforeScrollHeight || afterButtonCount > beforeButtonCount) {
              console.log('New content loaded:', {
                heightDiff: afterScrollHeight - beforeScrollHeight,
                buttonDiff: afterButtonCount - beforeButtonCount,
              });
              break;
            }

            // If we're at the bottom, wait longer for content
            if (scrollContainer.scrollTop + viewportHeight >= scrollContainer.scrollHeight) {
              console.log('At bottom, waiting for content...');
              await delay(3000);

              // Final check for new content
              if (
                scrollContainer.scrollHeight > afterScrollHeight ||
                scrollContainer.querySelectorAll('button').length > afterButtonCount
              ) {
                console.log('Content loaded after wait');
                break;
              }
            }
          }

          // Check if new content was loaded
          const newHeight = scrollContainer.scrollHeight;
          console.log('Height change:', { old: lastHeight, new: newHeight });

          if (newHeight === lastHeight) {
            // Try one final scroll to bottom
            scrollContainer.scrollTop = scrollContainer.scrollHeight;
            await delay(2000);

            if (scrollContainer.scrollHeight === lastHeight) {
              console.log('No new content loaded after scroll attempt');
              break;
            }
          }
        } else {
          console.log(
            'Could not find Following list container. Please open Following dialog and wait for it to load.'
          );
          document.getElementById('status').innerText = '⚠️ Please open Following dialog!';
          await delay(5000);
          continue;
        }
      }

      // Get all buttons from the Following dialog
      const scrollContainer = findScrollContainer();
      const buttons = scrollContainer ? Array.from(scrollContainer.querySelectorAll('button')) : [];

      // Filter for only genuine follow buttons (not already followed)
      const followButtons = buttons.filter((btn) => {
        const btnText = btn.innerText.trim().toLowerCase();
        return btnText === 'follow' && !btn.disabled;
      });

      // Count accounts already followed (buttons that say "following" or "requested")
      const alreadyFollowedButtons = buttons.filter((btn) => {
        const btnText = btn.innerText.trim().toLowerCase();
        return (btnText === 'following' || btnText === 'requested') && !btn.disabled;
      });

      // Update skipped count
      if (alreadyFollowedButtons.length > 0) {
        skippedCount += alreadyFollowedButtons.length;
        document.getElementById('skippedCount').innerText = skippedCount;
        console.log(`⏭️ Skipped ${alreadyFollowedButtons.length} already followed accounts.`);
      }

      // If no Follow buttons found after multiple attempts, end the process
      if (followButtons.length === 0) {
        noNewAccountsCount++;
        if (noNewAccountsCount >= 3) {
          console.log('🚫 No new accounts to follow after multiple attempts. Stopping.');
          document.getElementById('status').innerText = '✅ Complete! No more accounts to follow.';
          running = false;
          break;
        }
        continue; // Try scrolling again
      }
      noNewAccountsCount = 0; // Reset counter when we find accounts to follow

      // Scroll the first follow button into view
      if (followButtons[0]) {
        followButtons[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
        await delay(1000); // Wait for scroll to complete
      }

      // Follow each account with a genuine Follow button
      for (let btn of followButtons) {
        if (!running) break;

        // Double-check the button is still a follow button (not already followed)
        if (btn.innerText.trim().toLowerCase() !== 'follow') {
          skippedCount++;
          document.getElementById('skippedCount').innerText = skippedCount;
          console.log('⏭️ Skipped - button state changed');
          continue;
        }

        // Create random delay between min and max
        const waitTime = minDelay + Math.random() * (maxDelay - minDelay);
        document.getElementById('status').innerText = `⏳ Waiting ${waitTime.toFixed(1)}s...`;
        await delay(waitTime * 1000);

        if (!running) break;

        // Final check before clicking
        if (btn.innerText.trim().toLowerCase() !== 'follow') {
          skippedCount++;
          document.getElementById('skippedCount').innerText = skippedCount;
          console.log('⏭️ Skipped - button state changed during delay');
          continue;
        }

        // Click the Follow button
        btn.click();
        count++;
        dailyCount++;
        followCounter++;
        consecutiveFollows++;

        // Update localStorage and UI
        localStorage.setItem('follow_count', count);
        localStorage.setItem('daily_follow_count', dailyCount);
        document.getElementById('followCount').innerText = count;
        document.getElementById('dailyCount').innerText = `${dailyCount}/${maxDailyFollows}`;
        document.getElementById('status').innerText = `✅ Followed account #${count}`;
        console.log(`✅ Followed account #${count}`);

        // Random pause after consecutive follows (anti-ban feature)
        if (randomPause && consecutiveFollows >= 5 + Math.floor(Math.random() * 5)) {
          const pauseTime = 60 + Math.floor(Math.random() * 180); // 1-4 minutes
          console.log(`🛌 Random pause for ${pauseTime} seconds...`);
          document.getElementById(
            'status'
          ).innerText = `🛌 Pausing for ${pauseTime}s to avoid detection...`;
          await delay(pauseTime * 1000);
          consecutiveFollows = 0;
        }
      }
    }

    console.log(
      `🎉 Done! Followed a total of ${count} accounts (${dailyCount} today). Skipped ${skippedCount} accounts.`
    );
  }

  createUI();
})();
