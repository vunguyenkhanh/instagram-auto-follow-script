/**
 * Instagram Auto Follow Bot - Enhanced Version
 * 
 * Features:
 * - Adjustable follow speed
 * - Adjustable daily follow limit
 * - Natural operation mode (auto-scrolling removed)
 * - Anti-ban and limitation measures
 * - Persistent settings using localStorage
 * 
 * Original author: Vu Nguyen Khanh
 * 
 * Usage:
 * - Manually scroll through the accounts you want to follow BEFORE starting the bot
 * - The bot will only follow accounts already loaded on screen
 */

(async function () {
    const delay = (ms) => new Promise(res => setTimeout(res, ms));
    
    let running = false;
    let count = parseInt(localStorage.getItem("follow_count")) || 0;
    let dailyCount = parseInt(localStorage.getItem("daily_follow_count") || 0);
    let lastFollowDate = localStorage.getItem("last_follow_date") || new Date().toDateString();
    let minDelay = parseInt(localStorage.getItem("min_delay")) || 10; // Increased default delay to 10s
    let maxDelay = parseInt(localStorage.getItem("max_delay")) || 25; // Added adjustable max delay
    let maxFollows = parseInt(localStorage.getItem("max_follows")) || 50; // Reduced to 50 default
    let maxDailyFollows = parseInt(localStorage.getItem("max_daily_follows")) || 100; // Daily limit
    let randomPause = localStorage.getItem("random_pause") === "true";
    
    // Check and reset daily follow count if it's a new day
    const today = new Date().toDateString();
    if (today !== lastFollowDate) {
        dailyCount = 0;
        localStorage.setItem("daily_follow_count", dailyCount);
        localStorage.setItem("last_follow_date", today);
    }
    
    function createUI() {
        let oldUI = document.getElementById("autoFollowUI");
        if (oldUI) oldUI.remove();

        let ui = document.createElement("div");
        ui.id = "autoFollowUI";
        ui.innerHTML = `
            <div style="position: fixed; top: 10px; right: 10px; background: #1e1e1e; padding: 20px; border-radius: 12px; box-shadow: 0px 4px 20px rgba(255, 255, 255, 0.2); color: white; font-family: Arial, sans-serif; font-size: 14px; text-align: center; z-index: 9999; width: 280px;">
                <p style="margin: 0; font-size: 18px; font-weight: bold;">🚀 Instagram Auto Follow</p>
                <p style="margin-top: 5px;"><span style="color: #0f0; font-size: 16px;">✔ Followed:</span> <span id="followCount" style="font-weight: bold; color: #0f0;">${count}</span></p>
                <p style="margin-top: 5px;"><span style="color: #ffc107; font-size: 16px;">📅 Today:</span> <span id="dailyCount" style="font-weight: bold; color: #ffc107;">${dailyCount}/${maxDailyFollows}</span></p>
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
                        <input type="checkbox" id="randomPauseCheck" ${randomPause ? 'checked' : ''} style="margin-right: 5px;">
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

        document.getElementById("startFollow").onclick = () => {
            if (!running) {
                running = true;
                document.getElementById("status").innerText = "🏃‍♂️ Running...";
                followProcess();
            }
        };
        
        document.getElementById("stopFollow").onclick = () => {
            running = false;
            document.getElementById("status").innerText = "🛑 Stopped!";
        };
        
        document.getElementById("resetFollow").onclick = () => {
            count = 0;
            dailyCount = 0;
            localStorage.setItem("follow_count", 0);
            localStorage.setItem("daily_follow_count", 0);
            document.getElementById("followCount").innerText = count;
            document.getElementById("dailyCount").innerText = `${dailyCount}/${maxDailyFollows}`;
            document.getElementById("status").innerText = "🔄 Reset complete!";
        };
        
        document.getElementById("minDelayControl").oninput = (e) => {
            minDelay = parseInt(e.target.value);
            if (minDelay >= maxDelay) {
                maxDelay = minDelay + 5;
                document.getElementById("maxDelayControl").value = maxDelay;
                document.getElementById("maxDelayValue").innerText = maxDelay;
            }
            localStorage.setItem("min_delay", minDelay);
            localStorage.setItem("max_delay", maxDelay);
            document.getElementById("minDelayValue").innerText = minDelay;
        };
        
        document.getElementById("maxDelayControl").oninput = (e) => {
            maxDelay = parseInt(e.target.value);
            if (maxDelay <= minDelay) {
                minDelay = maxDelay - 5;
                document.getElementById("minDelayControl").value = minDelay;
                document.getElementById("minDelayValue").innerText = minDelay;
            }
            localStorage.setItem("max_delay", maxDelay);
            localStorage.setItem("min_delay", minDelay);
            document.getElementById("maxDelayValue").innerText = maxDelay;
        };
        
        document.getElementById("maxFollows").oninput = (e) => {
            maxFollows = parseInt(e.target.value);
            localStorage.setItem("max_follows", maxFollows);
            document.getElementById("maxFollowsValue").innerText = maxFollows;
        };
        
        document.getElementById("maxDailyFollows").oninput = (e) => {
            maxDailyFollows = parseInt(e.target.value);
            localStorage.setItem("max_daily_follows", maxDailyFollows);
            document.getElementById("maxDailyFollowsValue").innerText = maxDailyFollows;
            document.getElementById("dailyCount").innerText = `${dailyCount}/${maxDailyFollows}`;
        };
        
        document.getElementById("randomPauseCheck").onchange = (e) => {
            randomPause = e.target.checked;
            localStorage.setItem("random_pause", randomPause);
        };
    }

    async function followProcess() {
        console.log("🚀 Instagram Auto Follow started!");

        let followCounter = 0;
        let consecutiveFollows = 0;
        
        while (running) {
            // Check daily follow limit
            if (dailyCount >= maxDailyFollows) {
                console.log("🚫 Reached daily follow limit. Stopping.");
                document.getElementById("status").innerText = "✅ Daily limit reached!";
                running = false;
                break;
            }
            
            // Check session follow limit
            if (followCounter >= maxFollows) {
                console.log("🚫 Reached session follow limit. Stopping.");
                document.getElementById("status").innerText = "✅ Session complete!";
                running = false;
                break;
            }

            // Get all available Follow buttons on screen
            const followButtons = [...document.querySelectorAll('button')].filter(btn =>
                btn.innerText.trim().toLowerCase() === 'follow' && !btn.disabled
            );

            // If no Follow buttons found, end the process
            if (followButtons.length === 0) {
                console.log("🚫 No new accounts to follow. Stopping.");
                document.getElementById("status").innerText = "✅ Complete! No more accounts to follow.";
                running = false;
                break;
            }

            // Follow each account with a Follow button
            for (let btn of followButtons) {
                if (!running) break;
                
                // Create random delay between min and max
                const waitTime = minDelay + Math.random() * (maxDelay - minDelay);
                document.getElementById("status").innerText = `⏳ Waiting ${waitTime.toFixed(1)}s...`;
                await delay(waitTime * 1000);
                
                if (!running) break;
                
                // Click the Follow button
                btn.click();
                count++;
                dailyCount++;
                followCounter++;
                consecutiveFollows++;
                
                // Update localStorage and UI
                localStorage.setItem("follow_count", count);
                localStorage.setItem("daily_follow_count", dailyCount);
                document.getElementById("followCount").innerText = count;
                document.getElementById("dailyCount").innerText = `${dailyCount}/${maxDailyFollows}`;
                document.getElementById("status").innerText = `✅ Followed account #${count}`;
                console.log(`✅ Followed account #${count}`);
                
                // Random pause after consecutive follows (anti-ban feature)
                if (randomPause && consecutiveFollows >= 5 + Math.floor(Math.random() * 5)) {
                    const pauseTime = 60 + Math.floor(Math.random() * 180); // 1-4 minutes
                    console.log(`🛌 Random pause for ${pauseTime} seconds...`);
                    document.getElementById("status").innerText = `🛌 Pausing for ${pauseTime}s to avoid detection...`;
                    await delay(pauseTime * 1000);
                    consecutiveFollows = 0;
                }
            }
        }
        
        console.log(`🎉 Done! Followed a total of ${count} accounts (${dailyCount} today).`);
    }

    createUI();
})();
