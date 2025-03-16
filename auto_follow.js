(async function () {
    const delay = (ms) => new Promise(res => setTimeout(res, ms));
    let running = false;
    let count = parseInt(localStorage.getItem("follow_count")) || 0;
    let attempts = 0;
    let minDelay = 5000;
    let maxDelay = 15000;
    const MAX_FOLLOWS_PER_DAY = 100;
    
    function createUI() {
        let oldUI = document.getElementById("autoFollowUI");
        if (oldUI) oldUI.remove();

        let ui = document.createElement("div");
        ui.id = "autoFollowUI";
        ui.innerHTML = `
            <div style="position: fixed; top: 10px; right: 10px; background: black; padding: 15px; border-radius: 10px; box-shadow: 0px 4px 15px rgba(255, 255, 255, 0.2); color: white; font-family: Arial, sans-serif; font-size: 14px; text-align: center; z-index: 9999;">
                <p style="margin: 0; font-size: 16px; font-weight: bold;">🚀 Instagram Auto Follow</p>
                <p style="margin: 8px 0;">✅ Followed: <span id="followCount" style="font-weight: bold;">${count}</span></p>
                <p id="status" style="font-size: 12px; color: #ffc107; font-weight: bold;">🔄 Status: Idle</p>
                <input type="range" id="speedControl" min="5000" max="30000" step="1000" value="${minDelay}" style="width: 100%;">
                <p>⏳ Delay: <span id="speedValue">${minDelay / 1000}s</span></p>
                <button id="startFollow" style="background: #28a745; color: white; padding: 8px 15px; border: none; border-radius: 5px; cursor: pointer; font-weight: bold;">Start</button>
                <button id="stopFollow" style="background: #dc3545; color: white; padding: 8px 15px; border: none; border-radius: 5px; cursor: pointer; font-weight: bold; margin-left: 5px;">Stop</button>
                <button id="resetFollow" style="background: #ffc107; color: black; padding: 8px 15px; border: none; border-radius: 5px; cursor: pointer; font-weight: bold; margin-left: 5px;">Reset</button>
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
            document.getElementById("speedValue").innerText = minDelay / 1000 + "s";
        };
    }

    async function followProcess() {
        console.log("🚀 Instagram Auto Follow Started!");

        while (running) {
            if (count >= MAX_FOLLOWS_PER_DAY) {
                console.log("🚫 Reached daily follow limit. Stopping.");
                document.getElementById("status").innerText = "✅ Daily Limit Reached!";
                running = false;
                break;
            }

            const followButtons = document.querySelectorAll('button:not([disabled])');
            let followedThisRound = false;

            for (let btn of followButtons) {
                if (btn.innerText.trim().toLowerCase() === 'follow') {
                    moveMouseToElement(btn);
                    await delay(500 + Math.random() * 1500);
                    btn.click();
                    await delay(2000);
                    
                    count++;
                    localStorage.setItem("follow_count", count);
                    document.getElementById("followCount").innerText = count;
                    followedThisRound = true;
                    console.log(`✅ Followed account #${count}`);
                    await delay(minDelay + Math.random() * (maxDelay - minDelay));
                }
                if (!running) break;
            }

            if (!followedThisRound) {
                attempts++;
                console.log(`🔄 No new accounts found, scrolling down... (Attempt ${attempts})`);
                window.scrollBy(0, 1200);
                await delay(3000 + Math.random() * 2000);
                if (attempts >= 5) {
                    console.log("🚫 No more accounts to follow. Stopping.");
                    document.getElementById("status").innerText = "✅ Finished!";
                    running = false;
                    break;
                }
            } else {
                attempts = 0;
            }
        }
        console.log(`🎉 Done! Followed a total of ${count} accounts.`);
    }

    function moveMouseToElement(el) {
        let rect = el.getBoundingClientRect();
        let x = rect.left + Math.random() * rect.width;
        let y = rect.top + Math.random() * rect.height;
        let evt = new MouseEvent("mousemove", { bubbles: true, clientX: x, clientY: y });
        el.dispatchEvent(evt);
    }

    createUI();
})();
