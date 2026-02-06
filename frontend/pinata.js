
const PINATA_JWT = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySW5mb3JtYXRpb24iOnsiaWQiOiJhMjBkNDRhMy04YWFkLTQ5ZDItYjJlNi1kYWJmODY1ZDY4NWQiLCJlbWFpbCI6ImFsaWtoYW5mYWl6cmFraG1hbjA2QGdtYWlsLmNvbSIsImVtYWlsX3ZlcmlmaWVkIjp0cnVlLCJwaW5fcG9saWN5Ijp7InJlZ2lvbnMiOlt7ImRlc2lyZWRSZXBsaWNhdGlvbkNvdW50IjoxLCJpZCI6IkZSQTEifSx7ImRlc2lyZWRSZXBsaWNhdGlvbkNvdW50IjoxLCJpZCI6Ik5ZQzEifV0sInZlcnNpb24iOjF9LCJtZmFfZW5hYmxlZCI6ZmFsc2UsInN0YXR1cyI6IkFDVElWRSJ9LCJhdXRoZW50aWNhdGlvblR5cGUiOiJzY29wZWRLZXkiLCJzY29wZWRLZXlLZXkiOiI1NzQzNDQ1NmYwYTE4YmYxZjQ5ZCIsInNjb3BlZEtleVNlY3JldCI6IjgxMTQ0M2Q2ZWQ2NWE3ZDAzODc4MjgyY2RlMzVmY2NjNGVjYzQzZjY1ZDFiMGNmMDFkNzlkNWI5YjAyOTg5NjYiLCJleHAiOjE4MDE5MjU5MTV9.pZY_Fj8vYOlKgO5Zb6TuVKv8X6VS4y2BPBdTizogWOo";

/**
 * Upload file to Pinata
 * @param {File} file
 * @returns {Promise<{cid: string, hash: string}>}
 */
export async function uploadToPinata(file) {
    if (!file) {
        throw new Error("No file selected");
    }

    const buffer = await file.arrayBuffer();

    const hash = ethers.keccak256(new Uint8Array(buffer));

    const formData = new FormData();
    formData.append("file", file);

    const metadata = JSON.stringify({
        name: file.name,
        keyvalues: {
            project: "BlockTender"
        }
    });

    formData.append("pinataMetadata", metadata);

    const options = JSON.stringify({
        cidVersion: 1
    });

    formData.append("pinataOptions", options);

    const response = await fetch(
        "https://api.pinata.cloud/pinning/pinFileToIPFS",
        {
            method: "POST",
            headers: {
                Authorization: `Bearer ${PINATA_JWT}`
            },
            body: formData
        }
    );

    if (!response.ok) {
        throw new Error("Pinata upload failed");
    }

    const result = await response.json();

    return {
        cid: result.IpfsHash,
        hash: hash
    };
}
