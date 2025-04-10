/**
 * Instagram Auto Follow Bot - Enhanced Version
 *
 * Features:
 * - Adjustable follow speed
 * - Auto-scrolling to load more accounts
 * - Anti-ban and limitation measures
 * - Persistent settings using localStorage
 * - Skip already followed accounts
 * - Enhanced UI/UX with log history
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
  let minDelay = parseInt(localStorage.getItem('min_delay')) || 5;
  let maxDelay = parseInt(localStorage.getItem('max_delay')) || 12;
  let maxFollows = parseInt(localStorage.getItem('max_follows')) || 50;
  let randomPause = localStorage.getItem('random_pause') === 'true';
  let logHistory = JSON.parse(localStorage.getItem('log_history')) || [];
  let currentCountdownInterval = null; // Track current countdown interval

  // Add log entry with timestamp
  function addLog(message, type = 'info') {
    const log = {
      timestamp: new Date().toLocaleTimeString(),
      message,
      type,
    };
    logHistory.unshift(log);
    if (logHistory.length > 100) logHistory.pop();
    localStorage.setItem('log_history', JSON.stringify(logHistory));
    updateLogUI();
    console.log(`[${log.type.toUpperCase()}] ${message}`);
  }

  // Update the log panel UI
  function updateLogUI() {
    const logPanel = document.getElementById('logPanel');
    if (!logPanel) return;

    logPanel.innerHTML = logHistory
      .map((log) => {
        const typeColors = {
          info: '#17a2b8',
          success: '#28a745',
          warning: '#ffc107',
          error: '#dc3545',
        };
        return `
        <div style="margin-bottom: 8px; padding: 8px; border-radius: 4px; background: rgba(255,255,255,0.1);">
          <span style="color: ${typeColors[log.type]}; font-weight: bold;">[${log.timestamp}]</span>
          <span style="margin-left: 8px;">${log.message}</span>
        </div>
      `;
      })
      .join('');
  }

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

  // Update progress UI
  function updateProgress() {
    const percent = Math.min((count / maxFollows) * 100, 100);
    const progressPath = document.getElementById('progressPath');
    const progressPercent = document.getElementById('progressPercent');
    const maxFollowsDisplay = document.getElementById('maxFollowsDisplay');

    if (progressPath && progressPercent && maxFollowsDisplay) {
      progressPath.style.strokeDasharray = `${percent}, 100`;
      progressPercent.textContent = `${Math.round(percent)}%`;
      maxFollowsDisplay.textContent = maxFollows;
    }
  }

  // Update status with icon and sub-status
  function updateStatus(mainStatus, subStatus = '', icon = '🔄') {
    const statusElement = document.getElementById('status');
    const subStatusElement = document.getElementById('subStatus');
    const statusIconElement = document.getElementById('statusIcon');

    if (statusElement && subStatusElement && statusIconElement) {
      statusElement.textContent = mainStatus;
      subStatusElement.textContent = subStatus || 'Ready to start';
      statusIconElement.textContent = icon;
    }
  }

  // Clear existing countdown
  function clearExistingCountdown() {
    if (currentCountdownInterval) {
      clearInterval(currentCountdownInterval);
      currentCountdownInterval = null;
    }
  }

  // Add countdown timer function with cleanup
  function startCountdown(seconds, onTick, onComplete) {
    clearExistingCountdown();

    let remainingTime = seconds;
    currentCountdownInterval = setInterval(() => {
      remainingTime--;
      if (remainingTime <= 0) {
        clearExistingCountdown();
        onComplete();
      } else {
        onTick(remainingTime);
      }
    }, 1000);
    return currentCountdownInterval;
  }

  // Format time function with hours
  function formatTime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hours > 0) {
      return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  // Reset all counters and state
  function resetAll() {
    clearExistingCountdown();
    running = false;
    count = 0;
    consecutiveFollows = 0;
    localStorage.setItem('follow_count', 0);
    logHistory = [];
    localStorage.setItem('log_history', JSON.stringify(logHistory));
    document.getElementById('followCount').innerText = '0';
    updateStatus('Reset complete!', '', '🔄');
    addLog('All counters and logs reset', 'info');
    updateLogUI();
    updateProgress();
  }

  function createUI() {
    let oldUI = document.getElementById('autoFollowUI');
    if (oldUI) oldUI.remove();

    let ui = document.createElement('div');
    ui.id = 'autoFollowUI';
    ui.innerHTML = `
        <style>
            @keyframes slideIn {
                from { transform: translateX(100%); }
                to { transform: translateX(0); }
            }
            @keyframes pulse {
                0% { transform: scale(1); }
                50% { transform: scale(1.05); }
                100% { transform: scale(1); }
            }
            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            .stat-card {
                background: rgba(40, 40, 40, 0.95);
                padding: 15px;
                border-radius: 12px;
                margin-bottom: 15px;
                transition: all 0.3s ease;
                border: 1px solid rgba(255, 255, 255, 0.1);
            }
            .stat-card:hover {
                transform: translateY(-2px);
                box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2);
                border-color: rgba(255, 255, 255, 0.2);
            }
            .control-slider {
                -webkit-appearance: none;
                width: 100%;
                height: 6px;
                border-radius: 3px;
                background: #495057;
                outline: none;
                opacity: 0.7;
                transition: all 0.3s ease;
            }
            .control-slider:hover {
                opacity: 1;
            }
            .control-slider::-webkit-slider-thumb {
                -webkit-appearance: none;
                appearance: none;
                width: 18px;
                height: 18px;
                border-radius: 50%;
                background: #28a745;
                cursor: pointer;
                transition: all 0.3s ease;
            }
            .control-slider::-webkit-slider-thumb:hover {
                transform: scale(1.2);
            }
            .action-button {
                padding: 8px 0;
                border: none;
                border-radius: 8px;
                font-weight: 600;
                font-size: 13px;
                cursor: pointer;
                transition: all 0.3s ease;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 4px;
                width: 100%;
                color: white;
            }
            .action-button:hover {
                transform: translateY(-2px);
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
            }
            .log-entry {
                animation: fadeIn 0.3s ease;
                transition: all 0.3s ease;
            }
            .log-entry:hover {
                transform: translateX(5px);
            }
        </style>
        <div style="position: fixed; top: 10px; right: 10px; background: rgba(30, 30, 30, 0.95); padding: 20px; border-radius: 16px; box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4); color: white; font-family: system-ui, -apple-system, sans-serif; font-size: 14px; text-align: center; z-index: 9999; width: 320px; backdrop-filter: blur(10px); animation: slideIn 0.5s ease;">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 15px;">
                <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="font-size: 24px;">🚀</span>
                    <h2 style="margin: 0; font-size: 20px; font-weight: 600;">Instagram Auto Follow</h2>
                </div>
                <div style="display: flex; gap: 10px;">
                    <button id="minimizeUI" style="background: none; border: none; color: white; cursor: pointer; padding: 5px; transition: all 0.3s ease;">➖</button>
                    <button id="closeUI" style="background: none; border: none; color: white; cursor: pointer; padding: 5px; transition: all 0.3s ease;">✖️</button>
                </div>
            </div>

            <div id="mainContent">
                <div class="stat-card">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div style="text-align: left;">
                            <div style="font-size: 28px; font-weight: 600; color: #28a745; margin-bottom: 4px; display: flex; align-items: baseline;">
                                <span id="followCount" style="animation: pulse 1s ease infinite">${count}</span>
                                <span style="font-size: 14px; color: #6c757d;"> / </span>
                                <span style="font-size: 14px; color: #6c757d;" id="maxFollowsDisplay">${maxFollows}</span>
                            </div>
                            <div style="font-size: 12px; color: #adb5bd;">Accounts Followed</div>
                        </div>
                        <div style="position: relative; width: 60px; height: 60px;">
                            <svg viewBox="0 0 36 36" style="transform: rotate(-90deg)">
                                <path d="M18 2.0845
                                    a 15.9155 15.9155 0 0 1 0 31.831
                                    a 15.9155 15.9155 0 0 1 0 -31.831"
                                    fill="none"
                                    stroke="#444"
                                    stroke-width="2"
                                    stroke-dasharray="100, 100"/>
                                <path id="progressPath"
                                    d="M18 2.0845
                                    a 15.9155 15.9155 0 0 1 0 31.831
                                    a 15.9155 15.9155 0 0 1 0 -31.831"
                                    fill="none"
                                    stroke="#28a745"
                                    stroke-width="2"
                                    stroke-dasharray="0, 100"/>
                            </svg>
                            <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); font-size: 12px; color: #28a745; font-weight: 600;" id="progressPercent">0%</div>
                        </div>
                    </div>
                    <div style="display: flex; align-items: center; background: rgba(40, 167, 69, 0.1); padding: 8px 12px; border-radius: 8px; margin-top: 10px; border: 1px solid rgba(40, 167, 69, 0.2);">
                        <div id="statusIcon" style="margin-right: 8px; font-size: 16px;">🔄</div>
                        <div style="flex-grow: 1; text-align: left;">
                            <div id="status" style="color: #28a745; font-size: 14px; font-weight: 500;">Status: Idle</div>
                            <div id="subStatus" style="color: #adb5bd; font-size: 12px; margin-top: 2px;">Ready to start</div>
                        </div>
                    </div>
                </div>

                <div class="stat-card">
                    <div style="text-align: left; margin-bottom: 15px;">
                        <label style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                            <span style="color: #adb5bd;">⏳ Min Delay</span>
                            <span id="minDelayValue" style="color: white; font-weight: 500;">${minDelay}s</span>
                        </label>
                        <input type="range" id="minDelayControl" min="5" max="12" step="1" value="${minDelay}"
                            class="control-slider">

                        <label style="display: flex; justify-content: space-between; margin: 15px 0 8px 0;">
                            <span style="color: #adb5bd;">⏳ Max Delay</span>
                            <span id="maxDelayValue" style="color: white; font-weight: 500;">${maxDelay}s</span>
                        </label>
                        <input type="range" id="maxDelayControl" min="12" max="25" step="1" value="${maxDelay}"
                            class="control-slider">

                        <label style="display: flex; justify-content: space-between; margin: 15px 0 8px 0;">
                            <span style="color: #adb5bd;">🎯 Follows per session</span>
                            <span id="maxFollowsValue" style="color: white; font-weight: 500;">${maxFollows}</span>
                        </label>
                        <input type="range" id="maxFollows" min="10" max="500" step="5" value="${maxFollows}"
                            class="control-slider">

                        <label style="display: flex; align-items: center; margin: 15px 0; color: #adb5bd; cursor: pointer;">
                            <input type="checkbox" id="randomPauseCheck" ${
                              randomPause ? 'checked' : ''
                            }
                                style="margin-right: 8px; width: 16px; height: 16px;">
                            <span>🛌 Enable random pauses</span>
                        </label>
                    </div>
                </div>

                <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 15px;">
                    <button id="startFollow" class="action-button" style="background: #28a745; padding: 8px 0;">
                        <span>▶️</span>Start
                    </button>
                    <button id="stopFollow" class="action-button" style="background: #dc3545; padding: 8px 0;">
                        <span>⏹️</span>Stop
                    </button>
                    <button id="resetFollow" class="action-button" style="background: #ffc107; color: black; padding: 8px 0;">
                        <span>🔄</span>Reset
                    </button>
                </div>

                <div class="stat-card" style="margin-bottom: 0;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                        <h3 style="margin: 0; font-size: 16px; color: #adb5bd;">📋 Log History</h3>
                        <button id="clearLogs" style="background: none; border: none; color: #6c757d; font-size: 12px; cursor: pointer;">Clear</button>
                    </div>
                    <div id="logPanel" style="height: 200px; overflow-y: auto; padding: 10px; background: rgba(0,0,0,0.2); border-radius: 8px; font-size: 12px; text-align: left;">
                    </div>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(ui);

    // Add clear logs functionality
    document.getElementById('clearLogs').onclick = () => {
      logHistory = [];
      localStorage.setItem('log_history', JSON.stringify(logHistory));
      updateLogUI();
      addLog('Log history cleared', 'info');
    };

    // Update log panel UI with animations
    const originalUpdateLogUI = updateLogUI;
    updateLogUI = function () {
      const logPanel = document.getElementById('logPanel');
      if (!logPanel) return;

      logPanel.innerHTML = logHistory
        .map((log) => {
          const typeColors = {
            info: '#17a2b8',
            success: '#28a745',
            warning: '#ffc107',
            error: '#dc3545',
          };
          return `
                    <div class="log-entry" style="margin-bottom: 8px; padding: 8px; border-radius: 4px; background: rgba(255,255,255,0.1);">
                        <span style="color: ${typeColors[log.type]}; font-weight: bold;">[${
            log.timestamp
          }]</span>
                        <span style="margin-left: 8px;">${log.message}</span>
                    </div>
                `;
        })
        .join('');
    };

    document.getElementById('startFollow').onclick = () => {
      if (!running) {
        resetAll();
        running = true;
        addLog('Bot started', 'success');
        updateStatus('Running...', 'Initializing process', '🏃‍♂️');
        followProcess();
      }
    };

    document.getElementById('stopFollow').onclick = () => {
      running = false;
      clearExistingCountdown();
      addLog('Bot stopped by user', 'warning');
      updateStatus('Stopped!', 'Manually stopped by user', '🛑');
    };

    document.getElementById('resetFollow').onclick = resetAll;

    // Add minimize/close functionality
    document.getElementById('minimizeUI').onclick = () => {
      const mainContent = document.getElementById('mainContent');
      mainContent.style.display = mainContent.style.display === 'none' ? 'block' : 'none';
    };

    document.getElementById('closeUI').onclick = () => {
      document.getElementById('autoFollowUI').remove();
    };

    document.getElementById('minDelayControl').oninput = (e) => {
      minDelay = parseInt(e.target.value);
      if (minDelay >= maxDelay) {
        maxDelay = minDelay + 3;
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
        minDelay = maxDelay - 3;
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
      updateProgress();
    };

    document.getElementById('randomPauseCheck').onchange = (e) => {
      randomPause = e.target.checked;
      localStorage.setItem('random_pause', randomPause);
    };

    // Initialize progress
    updateProgress();
  }

  async function followProcess() {
    try {
      addLog('Starting follow process...', 'info');
      let consecutiveFollows = 0;
      let noNewAccountsCount = 0;

      while (running) {
        if (count >= maxFollows) {
          addLog(`Reached session limit of ${maxFollows} follows`, 'warning');
          updateStatus('Session Complete!', `Reached limit of ${maxFollows} follows`, '✅');
          running = false;
          break;
        }

        // Auto-scroll to load more accounts
        let reachedEnd = false;
        while (running && !reachedEnd) {
          const scrollContainer = findScrollContainer();

          if (!scrollContainer) {
            addLog('Following dialog not found. Please open it first.', 'warning');
            updateStatus('Please open Following dialog!', '', '⚠️');
            await delay(5000);
            continue;
          }

          const viewportHeight = scrollContainer.clientHeight;
          let lastContentHeight = scrollContainer.scrollHeight;
          let unchangedHeightCount = 0;

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
              for (let i = 0; i < 5; i++) {
                const wheelEvent = new WheelEvent('wheel', {
                  deltaY: 200,
                  bubbles: true,
                });
                lastButton.dispatchEvent(wheelEvent);
                await delay(300);
              }

              // Force scroll event on container and its parents
              let element = scrollContainer;
              while (element) {
                ['scroll', 'wheel'].forEach((eventName) => {
                  element.dispatchEvent(new Event(eventName, { bubbles: true }));
                });
                element = element.parentElement;
              }
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

          // Scroll and follow process
          updateStatus('Scrolling and checking for accounts...', '', '📜');

          // Get initial buttons
          let buttons = Array.from(scrollContainer.querySelectorAll('button'));
          let followButtons = buttons.filter((btn) => {
            const btnText = btn.innerText.trim().toLowerCase();
            return btnText === 'follow' && !btn.disabled;
          });

          // If no follow buttons in view, try scrolling for more
          if (followButtons.length === 0) {
            const beforeScrollHeight = scrollContainer.scrollHeight;
            const beforeButtonCount = scrollContainer.querySelectorAll('button').length;

            await performScroll();
            await delay(2000); // Wait for content to load

            const afterScrollHeight = scrollContainer.scrollHeight;
            const afterButtonCount = scrollContainer.querySelectorAll('button').length;

            // Check if we got new content
            if (afterScrollHeight > beforeScrollHeight || afterButtonCount > beforeButtonCount) {
              console.log('New content loaded:', {
                heightDiff: afterScrollHeight - beforeScrollHeight,
                buttonDiff: afterButtonCount - beforeButtonCount,
              });
              unchangedHeightCount = 0;
              lastContentHeight = afterScrollHeight;
            } else if (scrollContainer.scrollTop + viewportHeight >= scrollContainer.scrollHeight) {
              // Check if we've reached the end
              console.log('At bottom, checking if truly at end...');
              await delay(3000);

              if (afterScrollHeight === lastContentHeight) {
                unchangedHeightCount++;
                if (unchangedHeightCount >= 3) {
                  console.log('Reached true end of list - no new content after multiple checks');
                  reachedEnd = true;
                }
              } else {
                unchangedHeightCount = 0;
                lastContentHeight = afterScrollHeight;
              }
            }

            // Get updated buttons after scroll
            buttons = Array.from(scrollContainer.querySelectorAll('button'));
            followButtons = buttons.filter((btn) => {
              const btnText = btn.innerText.trim().toLowerCase();
              return btnText === 'follow' && !btn.disabled;
            });
          }

          // Follow available accounts
          if (followButtons.length > 0) {
            updateStatus('Following accounts...', '', '👥');

            for (let btn of followButtons) {
              if (!running) break;

              // Double-check button state
              if (btn.innerText.trim().toLowerCase() !== 'follow') {
                console.log('⏭️ Skipped - button state changed');
                continue;
              }

              // Scroll button into view
              btn.scrollIntoView({ behavior: 'smooth', block: 'center' });
              await delay(1000);

              // Create random delay between min and max
              const waitTime = minDelay + Math.random() * (maxDelay - minDelay);
              const waitTimeSeconds = Math.round(waitTime);
              updateStatus(`Waiting ${waitTime.toFixed(1)}s...`, '', '');

              // Start countdown
              await new Promise((resolve) => {
                startCountdown(
                  waitTimeSeconds,
                  (remaining) => {
                    updateStatus(`Waiting ${formatTime(remaining)}...`, '', '');
                  },
                  () => {
                    resolve();
                  }
                );
              });

              if (!running) break;

              // Final check before clicking
              if (btn.innerText.trim().toLowerCase() !== 'follow') {
                console.log('⏭️ Skipped - button state changed during delay');
                continue;
              }

              // Click the Follow button
              btn.click();
              count++;
              consecutiveFollows++;

              // Update localStorage and UI
              localStorage.setItem('follow_count', count);
              document.getElementById('followCount').innerText = count;
              updateProgress();
              updateStatus('Following...', `Successfully followed account #${count}`, '✅');
              console.log(`✅ Followed account #${count}`);

              // Random pause after consecutive follows with error handling
              if (randomPause && consecutiveFollows >= 8 + Math.floor(Math.random() * 4)) {
                try {
                  const pauseTime = 20 + Math.floor(Math.random() * 21);
                  addLog(`Taking a ${pauseTime} second break to avoid detection`, 'warning');

                  await new Promise((resolve) => {
                    startCountdown(
                      pauseTime,
                      (remaining) => {
                        if (running) {
                          updateStatus(
                            'Taking a Break',
                            `Pausing for ${formatTime(remaining)} to avoid detection`,
                            '🛌'
                          );
                        }
                      },
                      resolve
                    );
                  });

                  consecutiveFollows = 0;
                } catch (error) {
                  console.error('Error during random pause:', error);
                  addLog('Error during random pause', 'error');
                }
              }

              // Update logging in the follow process
              addLog(`Following account #${count}`, 'info');
              addLog(`Successfully followed account #${count}`, 'success');
            }
          } else if (!reachedEnd) {
            console.log('No new accounts to follow in current view, continuing to scroll...');
          }
        }

        console.log(`🎉 Done! Followed a total of ${count} accounts.`);
        updateStatus('Complete! Processed all available accounts.', '', '✅');
        running = false;
      }

      addLog(`Follow session completed. Total follows: ${count}`, 'success');
    } catch (error) {
      console.error('Error in follow process:', error);
      addLog(`Error: ${error.message}`, 'error');
      running = false;
      updateStatus('Error occurred!', '', '❌');
    } finally {
      if (running) {
        running = false;
        addLog(`Follow session completed. Total follows: ${count}`, 'success');
      }
    }
  }

  createUI();
})();
