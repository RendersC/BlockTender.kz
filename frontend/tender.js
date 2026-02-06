const params = new URLSearchParams(window.location.search);
const tenderId = params.get("id");

if (tenderId === null) {
    alert("Tender ID not found");
}

const contributeBtn = document.getElementById("contributeBtn");
const finalizeBtn = document.getElementById("finalizeBtn");
const refundBtn = document.getElementById("refundBtn");

async function loadTenderDetails() {
    if (!contract || tenderId === null) return;

    try {
        const t = await contract.tenders(tenderId);
        const user = await signer.getAddress();

        document.getElementById("tTitle").innerText = t.title;
        document.getElementById("tDesc").innerText = t.description;
        document.getElementById("tGoal").innerText = t.goal + " wei";
        document.getElementById("tRaised").innerText = t.totalRaised + " wei";

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

        if (
            user.toLowerCase() === t.organizer.toLowerCase() &&
            !t.finalized &&
            now >= deadline
        ) {
            finalizeBtn.style.display = "inline-block";
        } else {
            finalizeBtn.style.display = "none";
        }

        const contribution = await contract.getContribution(tenderId, user);

        if (t.finalized && contribution > 0n) {
            refundBtn.style.display = "inline-block";
        } else {
            refundBtn.style.display = "none";
        }

    } catch (err) {
        console.error(err);
        alert("Error loading tender details");
    }
}

// ================= CONTRIBUTE =================
if (contributeBtn) {
    contributeBtn.onclick = async () => {
        if (!contract) {
            alert("Connect MetaMask first");
            return;
        }

        const amountEth = document.getElementById("amountEth").value;

        if (!amountEth || Number(amountEth) <= 0) {
            alert("Enter amount in ETH");
            return;
        }

        try {
            const amountWei = ethers.parseEther(amountEth);

            const tx = await contract.contribute(
                BigInt(tenderId),
                { value: amountWei }
            );

            await tx.wait();
            alert("Contribution successful!");

            document.getElementById("amountEth").value = "";
            loadTenderDetails();

        } catch (err) {
            console.error(err);
            alert("Contribution failed");
        }
    };
}

if (finalizeBtn) {
    finalizeBtn.onclick = async () => {
        try {
            const tx = await contract.finalizeTender(tenderId);
            await tx.wait();
            alert("Tender finalized");
            loadTenderDetails();
        } catch (err) {
            console.error(err);
            alert("Finalize failed");
        }
    };
}

if (refundBtn) {
    refundBtn.onclick = async () => {
        try {
            const tx = await contract.refund(tenderId);
            await tx.wait();
            alert("Refund successful");
            loadTenderDetails();
        } catch (err) {
            console.error(err);
            alert("Refund failed");
        }
    };
}

window.addEventListener("load", () => {
    setTimeout(loadTenderDetails, 800);
});
