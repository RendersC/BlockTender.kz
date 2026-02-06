let provider;
let signer;
let contract;

const CONTRACT_ADDRESS = "0x81Ee998e3CFA29E18Cc8605b88907EF44BC72fce";
let CONTRACT_ABI = null;

/* ================= LOAD ABI ================= */
async function loadABI() {
    if (CONTRACT_ABI) return;
    const res = await fetch("../abi/TenderCrowdfunding.json");
    CONTRACT_ABI = await res.json();
}

/* ================= CONNECT ================= */
async function connect() {
    if (!window.ethereum) {
        alert("Install MetaMask");
        return;
    }

    await loadABI();

    provider = new ethers.BrowserProvider(window.ethereum);
    signer = await provider.getSigner();
    contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

    const address = await signer.getAddress();
    const accEl = document.getElementById("account");
    if (accEl) {
        accEl.innerText = address.slice(0, 6) + "..." + address.slice(-4);
    }

    const btn = document.getElementById("connectBtn");
    if (btn) btn.style.display = "none";

    await loadTenders();
}

/* ================= HELPERS ================= */
function weiToEth(wei) {
    return Number(ethers.formatEther(wei));
}

/* ================= LOAD TENDERS ================= */
async function loadTenders() {
    const list = document.getElementById("tenderList");
    if (!list || !contract) return;

    list.innerHTML = "";

    const count = await contract.tenderCount();
    const now = Math.floor(Date.now() / 1000);

    let totalRaised = 0;
    let activeCount = 0;

    if (count === 0n) {
        list.innerHTML = "<p class='hint'>No tenders yet</p>";
        return;
    }

    for (let i = 1; i <= Number(count); i++) {
        const t = await contract.tenders(i);
        if (!t.title || t.goal === 0n) continue;

        const deadline = Number(t.deadline);
        const diff = deadline - now;

        let status = "active";
        let timeText = "";
        let timeClass = "";

        if (diff <= 0) {
            status = "ended";
            timeText = "Ended";
        } else {
            const hours = Math.floor(diff / 3600);
            if (hours >= 24) {
                timeText = `${Math.floor(hours / 24)} days left`;
            } else {
                timeText = `${hours} hours left`;
                timeClass = "danger";
            }
        }

        const goalEth = weiToEth(t.goal);
        const raisedEth = weiToEth(t.totalRaised);
        const percent = goalEth > 0 ? Math.min(100, Math.floor((raisedEth / goalEth) * 100)) : 0;

        totalRaised += raisedEth;
        if (status === "active") activeCount++;

        let badge = "";
        if (status === "ended") {
            badge = "<span class='badge done'>Completed</span>";
        } else if (percent >= 80) {
            badge = "<span class='badge'>🔥 Almost funded</span>";
        } else if (diff < 86400) {
            badge = "<span class='badge soon'>⏰ Ending soon</span>";
        }

        const row = document.createElement("div");
        row.className = `tender-row ${status}`;
        row.dataset.deadline = deadline;
        row.dataset.raised = raisedEth;

        row.innerHTML = `
            <div class="status-dot"></div>

            <div class="tender-info">
                <h3>${t.title} ${badge}</h3>
                <p>${t.description}</p>
            </div>

            <div class="tender-amount">
                ${raisedEth.toFixed(2)} / ${goalEth.toFixed(2)} ETH
                <div class="progress">
                    <div class="progress-fill" style="width:${percent}%"></div>
                </div>
            </div>

            <div class="tender-time ${timeClass}">
                ${timeText}
            </div>

            <div class="tender-action">
                <button onclick="openTender(${i})">
                    ${status === "active" ? "Participate" : "View"}
                </button>
            </div>
        `;

        list.appendChild(row);
    }

    const statTotal = document.getElementById("statTotal");
    const statActive = document.getElementById("statActive");
    const statRaised = document.getElementById("statRaised");

    if (statTotal) statTotal.innerText = count;
    if (statActive) statActive.innerText = activeCount;
    if (statRaised) statRaised.innerText = totalRaised.toFixed(2) + " ETH";
}

/* ================= FILTER & SORT ================= */
function initFiltersAndSort() {

    // FILTER
    document.querySelectorAll(".filter-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            document.querySelectorAll(".filter-btn")
                .forEach(b => b.classList.remove("active"));

            btn.classList.add("active");
            const filter = btn.dataset.filter;

            document.querySelectorAll(".tender-row").forEach(row => {
                row.style.display =
                    filter === "all" || row.classList.contains(filter)
                        ? "grid"
                        : "none";
            });
        });
    });

    // SORT
    document.querySelectorAll(".sort-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            const type = btn.dataset.sort;
            const list = document.getElementById("tenderList");
            const rows = Array.from(document.querySelectorAll(".tender-row"));

            rows.sort((a, b) => {
                if (type === "deadline") {
                    return a.dataset.deadline - b.dataset.deadline;
                }
                if (type === "raised") {
                    return b.dataset.raised - a.dataset.raised;
                }
                return 0;
            });

            rows.forEach(r => list.appendChild(r));
        });
    });
}

/* ================= OPEN TENDER ================= */
function openTender(id) {
    window.location.href = `./tender.html?id=${id}`;
}

/* ================= CREATE TENDER ================= */
const createBtn = document.getElementById("createBtn");
if (createBtn) {
    createBtn.onclick = async () => {
        if (!contract) {
            alert("Connect MetaMask first");
            return;
        }

        const title = document.getElementById("title")?.value;
        const description = document.getElementById("description")?.value;
        const goalEth = document.getElementById("goalEth")?.value;
        const durationDays = document.getElementById("durationDays")?.value;

        if (!title || !description || !goalEth || !durationDays) {
            alert("Fill all fields");
            return;
        }

        try {
            const goalWei = BigInt(Math.floor(Number(goalEth) * 1e18));
            const durationSec = BigInt(Number(durationDays) * 86400);

            const tx = await contract.createTender(
                title,
                description,
                goalWei,
                durationSec
            );

            await tx.wait();
            window.location.href = "./index.html";
        } catch (err) {
            console.error(err);
            alert("Error creating tender");
        }
    };
}

/* ================= INIT ================= */
window.addEventListener("load", async () => {
    initFiltersAndSort();

    if (window.ethereum) {
        const accounts = await ethereum.request({ method: "eth_accounts" });
        if (accounts.length > 0) {
            await connect();
        }
    }
});

document.getElementById("connectBtn")
    ?.addEventListener("click", connect);
