/**
 * Instagram Auto Follow Bot - Enhanced Version
 * 
 * Features:
 * - Adjustable follow speed
 * - Adjustable daily follow limit
 * - Smart scrolling and detection
 * - Persistent settings using localStorage
 * 
 * Author: Vu Nguyen Khanh
 * 
 * Usage:
 * - Ensure you manually scroll through the entire 'Following' list before starting the bot.
 * - This ensures all accounts are loaded and can be followed by the script.
 */

(async function () {
    const delay = (ms) => new Promise(res => setTimeout(res, ms));
    
    let running = false;
    let count = parseInt(localStorage.getItem("follow_count")) || 0;
    let attempts = 0;
    let minDelay = parseInt(localStorage.getItem("min_delay")) || 5;
    let maxDelay = 15;
    let maxFollows = parseInt(localStorage.getItem("max_follows")) || 100;
    
    function createUI() {
        let oldUI = document.getElementById("autoFollowUI");
        if (oldUI) oldUI.remove();

        let ui = document.createElement("div");
        ui.id = "autoFollowUI";
        ui.innerHTML = `
            <div style="position: fixed; top: 10px; right: 10px; background: #1e1e1e; padding: 20px; border-radius: 12px; box-shadow: 0px 4px 20px rgba(255, 255, 255, 0.2); color: white; font-family: Arial, sans-serif; font-size: 14px; text-align: center; z-index: 9999; width: 250px;">
                <p style="margin: 0; font-size: 18px; font-weight: bold;">🚀 Instagram Auto Follow</p>
                <p style="margin-top: 5px;"><span style="color: #0f0; font-size: 16px;">✔ Followed:</span> <span id="followCount" style="font-weight: bold; color: #0f0;">${count}</span></p>
                <p id="status" style="color: #ffc107; font-size: 14px;">🔄 Status: Idle</p>
                <div style="text-align: left; margin-top: 10px;">
                    <label style="display: block; margin-bottom: 5px;">⏳ Delay: <span id="speedValue">${minDelay}</span> s</label>
                    <input type="range" id="speedControl" min="5" max="30" step="1" value="${minDelay}" style="width: 100%;">
                </div>
                <div style="text-align: left; margin-top: 10px;">
                    <label style="display: block; margin-bottom: 5px;">🎯 Max Follows/Day: <span id="maxFollowsValue">${maxFollows}</span></label>
                    <input type="range" id="maxFollows" min="10" max="500" step="10" value="${maxFollows}" style="width: 100%;">
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
            localStorage.setItem("follow_count", 0);
            document.getElementById("followCount").innerText = count;
            document.getElementById("status").innerText = "🔄 Reset Done!";
        };
        document.getElementById("speedControl").oninput = (e) => {
            minDelay = parseInt(e.target.value);
            localStorage.setItem("min_delay", minDelay);
            document.getElementById("speedValue").innerText = minDelay;
        };
        document.getElementById("maxFollows").oninput = (e) => {
            maxFollows = parseInt(e.target.value);
            localStorage.setItem("max_follows", maxFollows);
            document.getElementById("maxFollowsValue").innerText = maxFollows;
        };
    }

    async function followProcess() {
        console.log("🚀 Instagram Auto Follow Started!");

        while (running) {
            if (count >= maxFollows) {
                console.log("🚫 Reached daily follow limit. Stopping.");
                document.getElementById("status").innerText = "✅ Daily Limit Reached!";
                running = false;
                break;
            }

            const followButtons = [...document.querySelectorAll('button')].filter(btn =>
                btn.innerText.trim().toLowerCase() === 'follow' && !btn.disabled
            );

            if (followButtons.length === 0) {
                attempts++;
                console.log(`🔄 No new accounts found, scrolling... (Attempt ${attempts})`);
                window.scrollBy(0, 1200);
                await delay(3000 + Math.random() * 2000);
                if (attempts >= 5) {
                    console.log("🚫 No more accounts to follow. Stopping.");
                    document.getElementById("status").innerText = "✅ Finished!";
                    running = false;
                    break;
                }
                continue;
            }

            attempts = 0;
            for (let btn of followButtons) {
                if (!running) break;
                btn.click();
                await delay(minDelay * 1000 + Math.random() * (maxDelay * 1000 - minDelay * 1000));
                count++;
                localStorage.setItem("follow_count", count);
                document.getElementById("followCount").innerText = count;
                console.log(`✅ Followed account #${count}`);
            }
        }
        console.log(`🎉 Done! Followed a total of ${count} accounts.`);
    }

    createUI();
})();
