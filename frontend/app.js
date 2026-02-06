let provider;
let signer;
let contract;

const CONTRACT_ADDRESS = "0x81Ee998e3CFA29E18Cc8605b88907EF44BC72fce";
let CONTRACT_ABI = null;

async function loadABI() {
    if (CONTRACT_ABI) return;
    const res = await fetch("../abi/TenderCrowdfunding.json");
    CONTRACT_ABI = await res.json();
}

async function connect() {
    if (!window.ethereum) {
        alert("Install MetaMask");
        return;
    }

    await loadABI();

    provider = new ethers.BrowserProvider(window.ethereum);
    signer = await provider.getSigner();

    contract = new ethers.Contract(
        CONTRACT_ADDRESS,
        CONTRACT_ABI,
        signer
    );

    const address = await signer.getAddress();

    const accEl = document.getElementById("account");
    if (accEl) {
        accEl.innerText =
            address.slice(0, 6) + "..." + address.slice(-4);
    }

    const btn = document.getElementById("connectBtn");
    if (btn) btn.style.display = "none";

    // загружаем список, если мы на index.html
    await loadTenders();
}

async function loadTenders() {
    const list = document.getElementById("tenderList");
    if (!list || !contract) return;

    list.innerHTML = "";

    const count = await contract.tenderCount();

    if (count === 0n) {
        list.innerHTML = "<p class='hint'>No tenders yet</p>";
        return;
    }

    const now = Math.floor(Date.now() / 1000);

    for (let i = 1; i <= Number(count); i++) {
        const t = await contract.tenders(i);

        if (!t.title || t.goal === 0n) continue;

        const deadline = Number(t.deadline);

        let status = "Active";
        let timeLeft = "";

        if (now >= deadline) {
            status = "Ended";
            timeLeft = "Ended";
        } else {
            const diff = deadline - now;

            const days = Math.floor(diff / 86400);
            const hours = Math.floor((diff % 86400) / 3600);
            const minutes = Math.floor((diff % 3600) / 60);

            if (days > 0) {
                timeLeft = `${days} day(s) left`;
            } else if (hours > 0) {
                timeLeft = `${hours} hour(s) left`;
            } else {
                timeLeft = `${minutes} min left`;
            }
        }

        const div = document.createElement("div");
        div.className = "tender";

        div.innerHTML = `
            <h4>${t.title}</h4>
            <p class="hint">${t.description}</p>

            <p><b>Status:</b> ${status}</p>
            <p><b>Deadline:</b> ${new Date(deadline * 1000).toLocaleString()}</p>
            <p><b>Time left:</b> ${timeLeft}</p>

            <p><b>Goal:</b> ${t.goal} wei</p>
            <p><b>Raised:</b> ${t.totalRaised} wei</p>

            <button onclick="openTender(${i})">
                View Details
            </button>
        `;

        list.appendChild(div);
    }

    if (list.innerHTML === "") {
        list.innerHTML = "<p class='hint'>No valid tenders found</p>";
    }
}



// ================= OPEN TENDER DETAILS =================
function openTender(id) {
    window.location.href = `./tender.html?id=${id}`;
}

// ================= CREATE TENDER =================
const createBtn = document.getElementById("createBtn");
if (createBtn) {
    createBtn.onclick = async () => {
        if (!contract) {
            alert("Connect MetaMask first");
            return;
        }

        const title = document.getElementById("title").value;
        const description = document.getElementById("description").value;
        const goal = document.getElementById("goal").value;
        const duration = document.getElementById("duration").value;

        if (!title || !description || !goal || !duration) {
            alert("Fill all fields with numbers");
            return;
        }

        try {
            const goalWei = BigInt(goal);
            const durationSec = BigInt(duration);

            const tx = await contract.createTender(
                title,
                description,
                goalWei,
                durationSec
            );

            await tx.wait();

            alert("Tender created successfully!");
            window.location.href = "./index.html";

        } catch (err) {
            console.error(err);
            alert("Error creating tender. Check inputs and network.");
        }
    };
}

// ================= AUTO CONNECT =================
window.addEventListener("load", async () => {
    if (!window.ethereum) return;

    const accounts = await ethereum.request({
        method: "eth_accounts"
    });

    if (accounts.length > 0) {
        await connect();
    }
});

// ================= EVENTS =================
if (window.ethereum) {
    ethereum.on("accountsChanged", () => {
        location.reload();
    });

    ethereum.on("chainChanged", () => {
        location.reload();
    });
}

// ================= CONNECT BUTTON =================
document.getElementById("connectBtn")
    ?.addEventListener("click", connect);
