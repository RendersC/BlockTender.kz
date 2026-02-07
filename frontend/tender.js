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
        document.getElementById("tRaised").innerText = (Number(ethers.formatEther(t.totalRaised))).toFixed(2) + " ETH";

        document.getElementById("tOrganizer").innerText =
            t.organizer.slice(0, 6) + "..." + t.organizer.slice(-4);

        const now = Math.floor(Date.now() / 1000);
        const deadline = Number(t.deadline);

        let status = "Active";
        if (t.finalized) status = "Finalized";
        else if (now >= deadline) status = "Ended";

        document.getElementById("tStatus").innerText = status;
        document.getElementById("tDeadline").innerText =
            new Date(deadline * 1000).toLocaleString();

        // Show finalize button if user is organizer
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

        // Show refund button if finalized and user has contribution
        const contribution = await contract.getContribution(tenderId, userAddress);
        const refundBtn = document.getElementById("refundBtn");
        if (refundBtn) {
            if (t.finalized && contribution > 0n) {
                refundBtn.style.display = "inline-block";
            } else {
                refundBtn.style.display = "none";
            }
        }

        console.log("✓ Tender details loaded");

    } catch (err) {
        console.error("Error loading tender details:", err);
        alert("Error loading tender: " + err.message);
    }
}

// ==================== CONTRIBUTE ====================
document.getElementById("contributeBtn")?.addEventListener("click", async () => {
    if (!contract || !signer) {
        alert("Please connect wallet first");
        return;
    }

    // Check subscription (admins don't need it)
    if (userRole !== 1 && !hasSubscription) {
        alert("❌ You need an active subscription to participate");
        return;
    }

    const amountEth = document.getElementById("amountEth")?.value;

    if (!amountEth || Number(amountEth) <= 0) {
        alert("Please enter a valid amount");
        return;
    }

    try {
        const amountWei = ethers.parseEther(amountEth);

        const tx = await contract.contribute(
            BigInt(tenderId),
            { value: amountWei }
        );

        alert("Processing contribution...");
        await tx.wait();
        alert("✓ Contribution successful!");

        document.getElementById("amountEth").value = "";
        await loadTenderDetails();

    } catch (err) {
        console.error("Error contributing:", err);
        alert("Error: " + err.message);
    }
});

// ==================== FINALIZE TENDER ====================
document.getElementById("finalizeBtn")?.addEventListener("click", async () => {
    try {
        const tx = await contract.finalizeTender(tenderId);
        alert("Processing finalization...");
        await tx.wait();
        alert("✓ Tender finalized!");
        await loadTenderDetails();
    } catch (err) {
        console.error("Error finalizing tender:", err);
        alert("Error: " + err.message);
    }
});

// ==================== REFUND ====================
document.getElementById("refundBtn")?.addEventListener("click", async () => {
    try {
        const tx = await contract.refund(tenderId);
        alert("Processing refund...");
        await tx.wait();
        alert("✓ Refund successful!");
        await loadTenderDetails();
    } catch (err) {
        console.error("Error requesting refund:", err);
        alert("Error: " + err.message);
    }
});

// ==================== INITIALIZE ====================
window.addEventListener("load", async () => {
    console.log("Tender page loaded, tenderId:", tenderId);
    
    // Wait for shared.js to initialize
    const maxAttempts = 20;
    let attempts = 0;
    
    const checkReady = setInterval(() => {
        attempts++;
        if (typeof contract !== 'undefined' && contract && userAddress) {
            clearInterval(checkReady);
            console.log("✓ Contract ready, loading tender details");
            loadTenderDetails();
        } else if (attempts >= maxAttempts) {
            clearInterval(checkReady);
            console.log("Contract not ready, please connect wallet");
        }
    }, 100);
});
