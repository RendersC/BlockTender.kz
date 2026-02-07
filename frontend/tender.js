const params = new URLSearchParams(window.location.search);
const tenderId = params.get("id");

if (tenderId === null) {
    alert("Tender ID not found");
}

// ==================== LOAD TENDER DETAILS ====================
async function loadTenderDetails() {
    if (!contract || !tenderId) {
        console.log("Waiting for contract...");
        return;
    }

    try {
        console.log("Loading tender details for ID:", tenderId);
        
        const t = await contract.tenders(tenderId);

        document.getElementById("tTitle").innerText = t.title;
        document.getElementById("tDesc").innerText = t.description;
        document.getElementById("tGoal").innerText = (Number(ethers.formatEther(t.goal))).toFixed(2) + " ETH";
        document.getElementById("tRaised").innerText = "Bidding in progress...";

        document.getElementById("tOrganizer").innerText =
            t.organizer.slice(0, 6) + "..." + t.organizer.slice(-4);

        const now = Math.floor(Date.now() / 1000);
        const deadline = Number(t.deadline);

        let status = "Active";
        if (t.finalized) status = "Finalized";
        else if (now >= deadline) status = "Ended (Ready to Finalize)";

        document.getElementById("tStatus").innerText = status;
        document.getElementById("tDeadline").innerText =
            new Date(deadline * 1000).toLocaleString();

        // Show finalize button if user is organizer and deadline passed
        const finalizeBtn = document.getElementById("finalizeBtn");
        if (finalizeBtn) {
            if (
                userAddress.toLowerCase() === t.organizer.toLowerCase() &&
                !t.finalized &&
                now >= deadline
            ) {
                finalizeBtn.style.display = "inline-block";
            } else {
                finalizeBtn.style.display = "none";
            }
        }

        // Show bid submission if tender is active
        const bidSection = document.querySelector("section:nth-of-type(2)");
        if (bidSection) {
            if (now < deadline && !t.finalized) {
                bidSection.style.display = "block";
            } else {
                bidSection.style.display = "none";
            }
        }

        // Load all bids
        await loadBids();

        console.log("✓ Tender details loaded");

    } catch (err) {
        console.error("Error loading tender details:", err);
        alert("Error loading tender: " + err.message);
    }
}

// ==================== LOAD BIDS ====================
async function loadBids() {
    if (!contract || !tenderId) return;

    try {
        const bidsList = document.getElementById("bidsList");
        const bidsData = await contract.getBids(tenderId);

        if (bidsData.length === 0) {
            bidsList.innerHTML = '<p class="hint">No bids yet</p>';
            return;
        }

        let html = '<table style="width: 100%; border-collapse: collapse;">';
        html += '<tr style="background: #f5f5f5;">';
        html += '<th style="padding: 8px; text-align: left; border-bottom: 1px solid #ddd;">Bidder</th>';
        html += '<th style="padding: 8px; text-align: left; border-bottom: 1px solid #ddd;">Price</th>';
        html += '<th style="padding: 8px; text-align: left; border-bottom: 1px solid #ddd;">Quality</th>';
        html += '<th style="padding: 8px; text-align: left; border-bottom: 1px solid #ddd;">Days</th>';
        html += '</tr>';

        for (let bid of bidsData) {
            const bidderAddr = bid.bidder.slice(0, 6) + "..." + bid.bidder.slice(-4);
            const priceEth = (Number(ethers.formatEther(bid.price))).toFixed(2);
            
            html += '<tr style="border-bottom: 1px solid #eee;">';
            html += `<td style="padding: 8px;">${bidderAddr}</td>`;
            html += `<td style="padding: 8px;">${priceEth} ETH</td>`;
            html += `<td style="padding: 8px;">${bid.quality}</td>`;
            html += `<td style="padding: 8px;">${bid.daysRequired}</td>`;
            html += '</tr>';
        }

        html += '</table>';
        bidsList.innerHTML = html;

    } catch (err) {
        console.error("Error loading bids:", err);
    }
}

// ==================== SUBMIT BID ====================
document.getElementById("submitBidBtn")?.addEventListener("click", async () => {
    if (!contract || !signer) {
        alert("Please connect wallet first");
        return;
    }

    // Debug: log role and subscription
    console.log('submitBid: userRole=', userRole, 'hasSubscription=', hasSubscription, 'userAddress=', userAddress);

    const priceEth = document.getElementById("bidPrice")?.value;
    const quality = document.getElementById("bidQuality")?.value;
    const days = document.getElementById("bidDays")?.value;

    if (!priceEth || !quality || !days) {
        alert("Please fill all fields");
        return;
    }

    if (Number(quality) < 0 || Number(quality) > 100) {
        alert("Quality must be between 0 and 100");
        return;
    }

    if (Number(days) < 1 || Number(days) > 365) {
        alert("Days must be between 1 and 365");
        return;
    }

    // Check subscription (admins don't need it) - explicit check and message
    if (userRole !== 1 && !hasSubscription) {
        alert("❌ You need an active subscription to submit bids. Buy subscription on the main page.");
        return;
    }

    try {
        const priceWei = ethers.parseEther(priceEth);

        // Preflight simulation to capture revert reason before MetaMask popup
        try {
            // Prefer callStatic if available (ethers v5), otherwise try estimateGas (ethers v6)
            if (contract.callStatic && typeof contract.callStatic.submitBid === 'function') {
                console.log('Running callStatic.submitBid to simulate...');
                await contract.callStatic.submitBid(BigInt(tenderId), priceWei, BigInt(quality), BigInt(days));
                console.log('callStatic succeeded, proceeding to send transaction');
            } else if (contract.estimateGas && typeof contract.estimateGas.submitBid === 'function') {
                console.log('Running estimateGas.submitBid to simulate...');
                await contract.estimateGas.submitBid(BigInt(tenderId), priceWei, BigInt(quality), BigInt(days));
                console.log('estimateGas succeeded, proceeding to send transaction');
            } else {
                console.warn('No callStatic or estimateGas available on contract; proceeding to send transaction which may revert');
            }
        } catch (simErr) {
            console.error('Simulation error:', simErr);
            const reason = (simErr && (simErr.reason || simErr.error?.message || simErr.message)) || 'Simulation failed';
            alert('Cannot submit bid: ' + reason);
            return;
        }

        if (typeof contract.submitBid !== 'function') {
            alert('Contract does not expose submitBid — ABI/address mismatch. Run contractDebug() in console.');
            console.error('submitBid not found on contract object', contract);
            return;
        }

        const tx = await contract.submitBid(BigInt(tenderId), priceWei, BigInt(quality), BigInt(days));
        alert("Submitting bid... Confirm in MetaMask");
        await tx.wait();
        alert("✓ Bid submitted successfully!");

        document.getElementById("bidPrice").value = "";
        document.getElementById("bidQuality").value = "";
        document.getElementById("bidDays").value = "";
        
        await loadBids();
    } catch (err) {
        console.error("Error submitting bid:", err);
        // try to surface revert reason
        const msg = err && (err.reason || err.error?.message || err.message) ? (err.reason || err.error?.message || err.message) : 'Unknown error';
        alert("Error submitting bid: " + msg);
    }
});

// ==================== FINALIZE TENDER ====================
document.getElementById("finalizeBtn")?.addEventListener("click", async () => {
    if (!confirm("Finalize tender? Winner will be selected automatically based on bids.")) {
        return;
    }

    try {
        const tx = await contract.finalizeTender(tenderId);
        alert("Finalizing tender and selecting winner...");
        await tx.wait();
        alert("✓ Tender finalized! Winner has been selected.");
        await loadTenderDetails();
    } catch (err) {
        console.error("Error finalizing tender:", err);
        alert("Error: " + err.message);
    }
});

// ==================== INITIALIZE ====================
window.addEventListener("load", async () => {
    console.log("Tender page loaded, tenderId:", tenderId);
    
    // Wait for shared.js to initialize
    const maxAttempts = 20;
    let attempts = 0;
    
    const checkReady = setInterval(async () => {
        attempts++;
        if (typeof contract !== 'undefined' && contract && userAddress) {
            clearInterval(checkReady);
            console.log("✓ Contract ready, loading tender details");
            loadTenderDetails();
            return;
        }

        // Try to auto-connect if page isn't connected yet (will not prompt if already authorized)
        if (typeof window.ethereum !== 'undefined' && attempts === 1) {
            try {
                const accounts = await window.ethereum.request({ method: 'eth_accounts' });
                if (accounts && accounts.length > 0) {
                    console.log('Found authorized account, initializing connection...');
                    await connect();
                } else {
                    console.log('No authorized accounts found');
                }
            } catch (e) {
                console.warn('Auto-connect check failed:', e.message || e);
            }
        }

        if (attempts >= maxAttempts) {
            clearInterval(checkReady);
            console.log("Contract not ready, please connect wallet");
        }
    }, 100);
});
