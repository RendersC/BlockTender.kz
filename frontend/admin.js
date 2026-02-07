// ==================== ADMIN PANEL ====================

async function initAdminPanel() {
    if (!contract || !userAddress) {
        console.log("Contract or userAddress not ready yet");
        return;
    }

    try {
        const role = await contract.getRole(userAddress);
        const roleNum = Number(role);
        
        console.log("✓ Admin check - Role:", roleNum === 0 ? "USER" : "ADMIN");

        const notAdminMsg = document.getElementById("notAdminMsg");
        const adminPanel = document.getElementById("adminPanel");

        if (roleNum === 1) {
            // User is admin
            if (notAdminMsg) notAdminMsg.style.display = "none";
            if (adminPanel) adminPanel.style.display = "block";
            setupAdminButtons();
            loadCurrentPrice();
        } else {
            // User is not admin
            if (adminPanel) adminPanel.style.display = "none";
            if (notAdminMsg) {
                notAdminMsg.innerHTML = '<section class="card"><h3>❌ Access Denied</h3><p>Only administrators can access this panel.</p></section>';
                notAdminMsg.style.display = "block";
            }
        }
    } catch (err) {
        console.error("✗ Error checking admin status:", err);
        alert("Error: " + err.message);
    }
}

// ==================== SETUP ADMIN BUTTONS ====================
function setupAdminButtons() {
    const assignBtn = document.getElementById("assignRoleBtn");
    const checkBtn = document.getElementById("checkRoleBtn");
    const updatePriceBtn = document.getElementById("updatePriceBtn");
    const withdrawBtn = document.getElementById("withdrawBtn");

    if (assignBtn) assignBtn.onclick = assignRole;
    if (checkBtn) checkBtn.onclick = checkRole;
    if (updatePriceBtn) updatePriceBtn.onclick = updatePrice;
    if (withdrawBtn) withdrawBtn.onclick = withdrawFunds;
    
    console.log("✓ Admin buttons initialized");
}

// ==================== LOAD CURRENT PRICE ====================
async function loadCurrentPrice() {
    if (!contract) return;

    try {
        const price = await contract.subscriptionPrice();
        const priceEth = ethers.formatEther(price);
        const input = document.getElementById("currentPrice");
        if (input) input.value = priceEth + " ETH";
    } catch (err) {
        console.error("Error loading price:", err);
    }
}

// ==================== ASSIGN ROLE ====================
async function assignRole() {
    const address = document.getElementById("roleAddress")?.value.trim();
    const roleSelect = document.getElementById("roleSelect");
    const role = Number(roleSelect?.value || 0);

    if (!address) {
        alert("Please enter an address");
        return;
    }

    if (!ethers.isAddress(address)) {
        alert("Invalid Ethereum address");
        return;
    }

    try {
        const tx = await contract.assignRole(address, role);
        alert("Processing...");
        await tx.wait();

        const roleText = role === 0 ? "User" : "Admin";
        alert(`✓ Role assigned! ${address} is now a ${roleText}`);
        
        if (document.getElementById("roleAddress")) {
            document.getElementById("roleAddress").value = "";
        }
    } catch (err) {
        console.error("Error assigning role:", err);
        alert("Error: " + err.message);
    }
}

// ==================== CHECK ROLE ====================
async function checkRole() {
    const address = document.getElementById("checkAddress")?.value.trim();

    if (!address) {
        alert("Please enter an address");
        return;
    }

    if (!ethers.isAddress(address)) {
        alert("Invalid Ethereum address");
        return;
    }

    try {
        const role = await contract.getRole(address);
        const roleNum = Number(role);
        const roleText = roleNum === 0 ? "User" : "Admin";

        const result = document.getElementById("roleResult");
        if (result) {
            result.innerHTML = `
                <strong>Address:</strong> ${address}<br>
                <strong>Role:</strong> ${roleText}
            `;
            result.style.display = "block";
        }
    } catch (err) {
        console.error("Error checking role:", err);
        alert("Error: " + err.message);
    }
}

// ==================== UPDATE PRICE ====================
async function updatePrice() {
    const newPrice = document.getElementById("newPrice")?.value;

    if (!newPrice || Number(newPrice) <= 0) {
        alert("Please enter a valid price");
        return;
    }

    try {
        const priceWei = ethers.parseEther(newPrice);
        const tx = await contract.setSubscriptionPrice(priceWei);
        alert("Processing price update...");
        await tx.wait();

        alert(`✓ Price updated to ${newPrice} ETH`);
        if (document.getElementById("newPrice")) {
            document.getElementById("newPrice").value = "";
        }
        loadCurrentPrice();
    } catch (err) {
        console.error("Error updating price:", err);
        alert("Error: " + err.message);
    }
}

// ==================== WITHDRAW FUNDS ====================
async function withdrawFunds() {
    if (!confirm("Withdraw all contract funds?")) {
        return;
    }

    try {
        const tx = await contract.withdrawFunds();
        alert("Processing withdrawal...");
        await tx.wait();
        alert("✓ Funds withdrawn successfully!");
    } catch (err) {
        console.error("Error withdrawing funds:", err);
        alert("Error: " + err.message);
    }
}

// ==================== INITIALIZE ADMIN PAGE ====================
window.addEventListener("load", async () => {
    console.log("Admin page loaded");
    
    // Wait for shared.js to load
    const maxAttempts = 20;
    let attempts = 0;
    
    const checkReady = setInterval(() => {
        attempts++;
        if (typeof contract !== 'undefined' && contract && userAddress) {
            clearInterval(checkReady);
            console.log("✓ Contract ready, initializing admin panel");
            initAdminPanel();
        } else if (attempts >= maxAttempts) {
            clearInterval(checkReady);
            console.log("Contract not ready, please connect wallet");
        }
    }, 100);
});
