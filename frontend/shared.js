// ==================== GLOBAL STATE ====================
let provider = null;
let signer = null;
let contract = null;
let userAddress = null;
let userRole = null;  // 0 = USER, 1 = ADMIN
let hasSubscription = false;

const CONTRACT_ADDRESS = "0xae78C2132B572f11437f22c61a2aDBd689fb0cfd";
let CONTRACT_ABI = [{"inputs":[{"internalType":"address","name":"_rewardToken","type":"address"}],"stateMutability":"nonpayable","type":"constructor"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"uint256","name":"tenderId","type":"uint256"},{"indexed":true,"internalType":"address","name":"bidder","type":"address"},{"indexed":false,"internalType":"uint256","name":"price","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"quality","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"daysRequired","type":"uint256"}],"name":"BidSubmitted","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"uint256","name":"tenderId","type":"uint256"},{"indexed":true,"internalType":"address","name":"organizer","type":"address"}],"name":"TenderCreated","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"uint256","name":"tenderId","type":"uint256"},{"indexed":true,"internalType":"address","name":"winner","type":"address"},{"indexed":false,"internalType":"uint256","name":"winningPrice","type":"uint256"}],"name":"TenderFinalized","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"user","type":"address"},{"indexed":false,"internalType":"enum TenderCrowdfunding.Role","name":"role","type":"uint8"}],"name":"RoleAssigned","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"user","type":"address"},{"indexed":false,"internalType":"uint256","name":"expiry","type":"uint256"}],"name":"SubscriptionPurchased","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"uint256","name":"newPrice","type":"uint256"}],"name":"SubscriptionPriceUpdated","type":"event"},{"inputs":[{"internalType":"address","name":"user","type":"address"},{"internalType":"enum TenderCrowdfunding.Role","name":"role","type":"uint8"}],"name":"assignRole","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"buySubscription","outputs":[],"stateMutability":"payable","type":"function"},{"inputs":[{"internalType":"uint256","name":"price","type":"uint256"},{"internalType":"uint256","name":"quality","type":"uint256"},{"internalType":"uint256","name":"daysRequired","type":"uint256"}],"name":"calculateScore","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"pure","type":"function"},{"inputs":[{"internalType":"string","name":"_title","type":"string"},{"internalType":"string","name":"_description","type":"string"},{"internalType":"uint256","name":"_goal","type":"uint256"},{"internalType":"uint256","name":"_duration","type":"uint256"}],"name":"createTender","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"tenderId","type":"uint256"}],"name":"finalizeTender","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"tenderId","type":"uint256"}],"name":"getBidCount","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"tenderId","type":"uint256"}],"name":"getBids","outputs":[{"components":[{"internalType":"address","name":"bidder","type":"address"},{"internalType":"uint256","name":"price","type":"uint256"},{"internalType":"uint256","name":"quality","type":"uint256"},{"internalType":"uint256","name":"daysRequired","type":"uint256"},{"internalType":"uint256","name":"timestamp","type":"uint256"}],"internalType":"struct TenderCrowdfunding.Bid[]","name":"","type":"tuple[]"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"user","type":"address"}],"name":"getRole","outputs":[{"internalType":"uint8","name":"","type":"uint8"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"user","type":"address"}],"name":"getSubscriptionExpiry","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"tenderId","type":"uint256"}],"name":"getWinner","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"user","type":"address"}],"name":"hasActiveSubscription","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"user","type":"address"}],"name":"isAdmin","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"owner","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"rewardToken","outputs":[{"internalType":"contract RewardToken","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"roles","outputs":[{"internalType":"enum TenderCrowdfunding.Role","name":"","type":"uint8"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"newPrice","type":"uint256"}],"name":"setSubscriptionPrice","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"subscriptionExpiry","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"subscriptionPrice","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"tenderId","type":"uint256"},{"internalType":"uint256","name":"price","type":"uint256"},{"internalType":"uint256","name":"quality","type":"uint256"},{"internalType":"uint256","name":"daysRequired","type":"uint256"}],"name":"submitBid","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"subscriptionPrice","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"tenderCount","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"","type":"uint256"}],"name":"tenders","outputs":[{"internalType":"uint256","name":"id","type":"uint256"},{"internalType":"string","name":"title","type":"string"},{"internalType":"string","name":"description","type":"string"},{"internalType":"uint256","name":"goal","type":"uint256"},{"internalType":"uint256","name":"deadline","type":"uint256"},{"internalType":"address","name":"organizer","type":"address"},{"internalType":"bool","name":"finalized","type":"bool"},{"internalType":"address","name":"winner","type":"address"},{"internalType":"uint256","name":"winningBidIndex","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"withdrawFunds","outputs":[],"stateMutability":"nonpayable","type":"function"}];

// ==================== LOAD ABI ====================
async function loadABI() {
    // ABI is now embedded directly
    console.log("✓ ABI loaded");
}

// ==================== DEBUG HELPERS ====================
// Call from console: await contractDebug()
window.contractDebug = async function() {
    try {
        console.log('CONTRACT_ADDRESS =', CONTRACT_ADDRESS);
        if (!provider) provider = new ethers.BrowserProvider(window.ethereum);
        const code = await provider.getCode(CONTRACT_ADDRESS);
        console.log('Bytecode at address:', code && code.length > 3 ? 'present' : '0x (no code)');
        console.log('Raw code:', code);

        if (!contract) {
            console.log('Contract object not initialized');
        } else {
            console.log('Contract object exists');
            try {
                console.log('Has submitBid?', typeof contract.submitBid !== 'undefined');
                console.log('ABI methods (first 20):', contract.interface?.fragments?.slice(0,20).map(f=>f.format()));
            } catch (e) {
                console.error('Error inspecting contract:', e);
            }
        }

        if (typeof contract?.getBidCount === 'function') {
            try {
                const c = await contract.getBidCount(1);
                console.log('getBidCount(1) =>', c.toString?.() || c);
            } catch (e) {
                console.warn('getBidCount call failed:', e.message || e);
            }
        }
    } catch (err) {
        console.error('contractDebug failed:', err);
    }
}

// ==================== CONNECT WALLET ====================
async function connect() {
    try {
        if (!window.ethereum) {
            alert("❌ Please install MetaMask");
            return;
        }

        console.log("Connecting to MetaMask...");
        
        await loadABI();

        // Request account access
        const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
        if (!accounts || accounts.length === 0) {
            alert("❌ No accounts connected");
            return;
        }

        // Initialize provider and signer
        provider = new ethers.BrowserProvider(window.ethereum);
        signer = await provider.getSigner();
        contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

        userAddress = accounts[0];
        console.log("✓ Connected to wallet:", userAddress);

        // Update UI
        updateAccountDisplay();
        
        // Hide connect button
        const connectBtn = document.getElementById("connectBtn");
        if (connectBtn) connectBtn.style.display = "none";

        // Load user data
        await loadUserData();
        
        // Update UI based on role
        updateUIByRole();

        return true;
    } catch (err) {
        console.error("❌ Connection error:", err);
        alert("Error connecting wallet: " + err.message);
        return false;
    }
}

// ==================== UPDATE ACCOUNT DISPLAY ====================
function updateAccountDisplay() {
    if (!userAddress) return;
    
    const accEl = document.getElementById("account");
    if (accEl) {
        accEl.innerText = userAddress.slice(0, 6) + "..." + userAddress.slice(-4);
        accEl.style.display = "inline";
    }
}

// ==================== LOAD USER DATA ====================
async function loadUserData() {
    if (!contract || !userAddress) {
        console.warn("Contract or userAddress not ready");
        return;
    }

    try {
        console.log("Loading user data...");
        
        // Get role
        const roleRaw = await contract.getRole(userAddress);
        userRole = Number(roleRaw);  // Convert BigNumber to number
        console.log("✓ User role:", userRole === 0 ? "USER" : "ADMIN");

        // Get subscription status
        hasSubscription = await contract.hasActiveSubscription(userAddress);
        console.log("✓ Subscription active:", hasSubscription);

        updateSubscriptionUI();
    } catch (err) {
        console.error("✗ Error loading user data:", err);
        userRole = null;
        hasSubscription = false;
    }
}

// ==================== UPDATE SUBSCRIPTION UI ====================
function updateSubscriptionUI() {
    const statusEl = document.getElementById("subscriptionStatus");
    if (!statusEl) return;

    if (userRole === null) {
        statusEl.innerHTML = '<span class="badge" style="background: #95a5a6; color: white;">⌛ Loading...</span>';
    } else if (userRole === 1) {
        // Admin - don't need subscription
        statusEl.innerHTML = '<span class="badge" style="background: #3498db; color: white;">👑 Admin</span>';
    } else if (hasSubscription) {
        statusEl.innerHTML = '<span class="badge" style="background: #27ae60; color: white;">✓ Active Subscription</span>';
    } else {
        statusEl.innerHTML = '<span class="badge" style="background: #e74c3c; color: white;">⚠ No Subscription</span>';
    }
}

// ==================== UPDATE UI BY ROLE ====================
function updateUIByRole() {
    console.log("Updating UI... Role:", userRole, "Subscription:", hasSubscription);

    // Update Create Tender link visibility
    const createLinks = document.querySelectorAll('a[href="./create.html"]');
    createLinks.forEach(link => {
        if (link && link.parentElement) {
            if (userRole === 1) {
                link.parentElement.style.display = "block";
            } else {
                link.parentElement.style.display = "none";
            }
        }
    });

    // Update create.html form visibility
    const notAdminMsg = document.getElementById("notAdminMsg");
    const createForm = document.getElementById("createFormContainer");
    if (notAdminMsg || createForm) {
        if (userRole === 1) {
            if (notAdminMsg) notAdminMsg.style.display = "none";
            if (createForm) createForm.style.display = "block";
        } else {
            if (notAdminMsg) notAdminMsg.style.display = "block";
            if (createForm) createForm.style.display = "none";
        }
    }

    // Update subscription section
    const subSection = document.getElementById("subscriptionSection");
    if (subSection) {
        if (userRole === 0 && !hasSubscription) {
            subSection.style.display = "block";
        } else {
            subSection.style.display = "none";
        }
    }

    // Load tenders if on index page
    if (document.getElementById("tenderList")) {
        loadTenders();
    }
}

// ==================== LOAD TENDERS ====================
async function loadTenders() {
    const list = document.getElementById("tenderList");
    if (!list || !contract) return;

    try {
        list.innerHTML = '<p style="text-align: center; padding: 20px;">Loading tenders...</p>';

        const count = await contract.tenderCount();
        const now = Math.floor(Date.now() / 1000);

        let activeCount = 0;

        if (count === 0n) {
            list.innerHTML = '<p class="hint">No tenders yet</p>';
            return;
        }

        list.innerHTML = "";

        for (let i = 1; i <= Number(count); i++) {
            try {
                const t = await contract.tenders(i);
                if (!t.title || t.goal === 0n) continue;

                const deadline = Number(t.deadline);
                const diff = deadline - now;
                
                let bidsCount = 0;
                try {
                    const bidsCountResult = await contract.getBidCount(i);
                    bidsCount = Number(bidsCountResult);
                } catch (e) {
                    console.warn(`Could not get bids count for tender ${i}:`, e.message);
                }

            let status = "active";
            let timeText = "";
            let timeClass = "";

                if (t.finalized) {
                    status = "finalized";
                    timeText = "✓ Winner Selected";
                } else if (diff <= 0) {
                    status = "ended";
                    timeText = "Ready to Finalize";
                    timeClass = "danger";
                } else {
                    const hours = Math.floor(diff / 3600);
                    if (hours >= 24) {
                        timeText = `${Math.floor(hours / 24)} days left`;
                    } else {
                        timeText = `${hours} hours left`;
                        timeClass = "danger";
                    }
                }

                if (status === "active") activeCount++;

                let badge = "";
                if (t.finalized) {
                    badge = '<span class="badge done">✓ Finalized</span>';
                } else if (bidsCount > 5) {
                    badge = '<span class="badge">🔥 Many bids</span>';
                } else if (diff < 86400) {
                    badge = '<span class="badge soon">⏰ Ending soon</span>';
                }

                const row = document.createElement("div");
                row.className = `tender-row ${status}`;
                row.dataset.deadline = deadline;
                row.dataset.raised = bidsCount;

                row.innerHTML = `
                    <div class="status-dot"></div>
                    <div class="tender-info">
                        <h3>${t.title} ${badge}</h3>
                        <p>${t.description}</p>
                    </div>
                    <div class="tender-amount">
                        ${bidsCount} bids received
                        <div class="progress">
                            <div class="progress-fill" style="width:${Math.min(100, bidsCount * 20)}%"></div>
                        </div>
                    </div>
                    <div class="tender-time ${timeClass}">${timeText}</div>
                    <div class="tender-action">
                        <button onclick="openTender(${i})">
                            ${status === "active" ? "Submit Bid" : "View"}
                        </button>
                    </div>
                `;

                list.appendChild(row);
            } catch (itemErr) {
                console.error(`Error loading tender ${i}:`, itemErr);
                continue;
            }
        }

        // Update stats
        const statTotal = document.getElementById("statTotal");
        const statActive = document.getElementById("statActive");
        const statRaised = document.getElementById("statRaised");

        if (statTotal) statTotal.innerText = count;

        if (statActive) statActive.innerText = activeCount;
        if (statRaised) statRaised.innerText = "Bidding System";

    } catch (err) {
        console.error("Error loading tenders:", err);
        list.innerHTML = '<p class="hint" style="color: red;">✗ Error: ' + err.message + '</p>';
    }
}

// ==================== OPEN TENDER ====================
function openTender(id) {
    window.location.href = `./tender.html?id=${id}`;
}

// ==================== BUY SUBSCRIPTION ====================
async function buySubscription() {
    if (!contract || !signer) {
        alert("Please connect wallet first");
        return;
    }

    try {
        const price = await contract.subscriptionPrice();
        const priceEth = ethers.formatEther(price);

        if (!confirm(`Buy subscription for ${priceEth} ETH?`)) {
            return;
        }

        const tx = await contract.buySubscription({ value: price });
        alert("Processing subscription purchase...");
        await tx.wait();

        alert("✓ Subscription purchased!");
        hasSubscription = true;
        updateSubscriptionUI();
    } catch (err) {
        console.error("Error buying subscription:", err);
        alert("Error: " + err.message);
    }
}

// ==================== CREATE TENDER ====================
const createBtn = document.getElementById("createBtn");
if (createBtn) {
    createBtn.onclick = async () => {
        if (!contract || !signer) {
            alert("Please connect wallet first");
            return;
        }

        if (userRole !== 1) {
            alert("Only admins can create tenders");
            return;
        }

        const title = document.getElementById("title")?.value;
        const description = document.getElementById("description")?.value;
        const goalEth = document.getElementById("goalEth")?.value;
        const durationDays = document.getElementById("durationDays")?.value;

        if (!title || !description || !goalEth || !durationDays) {
            alert("Please fill all fields");
            return;
        }

        try {
            const goalWei = ethers.parseEther(String(goalEth));
            const durationSec = BigInt(Number(durationDays) * 86400);

            const tx = await contract.createTender(
                title,
                description,
                goalWei,
                durationSec
            );

            alert("Creating tender...");
            await tx.wait();
            alert("✓ Tender created successfully!");
            window.location.href = "./index.html";
        } catch (err) {
            console.error("Error creating tender:", err);
            alert("Error: " + err.message);
        }
    };
}

// ==================== FILTERS AND SORT ====================
function initFiltersAndSort() {
    // Only run on pages with filter buttons
    const filterBtns = document.querySelectorAll(".filter-btn");
    if (filterBtns.length === 0) return;

    // Filter buttons
    filterBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            document.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            const filter = btn.dataset.filter;

            document.querySelectorAll(".tender-row").forEach(row => {
                if (row) {
                    row.style.display =
                        filter === "all" || row.classList.contains(filter) ? "grid" : "none";
                }
            });
        });
    });

    // Sort buttons
    document.querySelectorAll(".sort-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            const type = btn.dataset.sort;
            const list = document.getElementById("tenderList");
            const rows = Array.from(document.querySelectorAll(".tender-row"));

            rows.sort((a, b) => {
                if (type === "deadline") return a.dataset.deadline - b.dataset.deadline;
                if (type === "raised") return b.dataset.raised - a.dataset.raised;
                return 0;
            });

            if (list) {
                rows.forEach(r => list.appendChild(r));
            }
        });
    });
}

// ==================== INITIALIZE ====================
window.addEventListener("load", async () => {
    console.log("Page loaded, initializing...");
    
    initFiltersAndSort();

    // Check if wallet is already connected
    if (window.ethereum) {
        try {
            const accounts = await window.ethereum.request({ method: "eth_accounts" });
            if (accounts && accounts.length > 0) {
                await connect();
            }
        } catch (err) {
            console.error("Error checking connected accounts:", err);
        }
    }

    // Setup connect button
    const connectBtn = document.getElementById("connectBtn");
    if (connectBtn) {
        connectBtn.addEventListener("click", connect);
    }
});

// Listen for account changes
if (window.ethereum) {
    window.ethereum.on("accountsChanged", () => {
        console.log("Account changed, reloading...");
        location.reload();
    });
    window.ethereum.on("chainChanged", () => {
        console.log("Chain changed, reloading...");
        location.reload();
    });
}
