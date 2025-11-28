let uploadedFileContent = '';

function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => {
        toast.remove();
    }, 5000);
}

function setLoading(btnId, isLoading, originalText = '') {
    const btn = document.getElementById(btnId);
    if (isLoading) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
    } else {
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
}

function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) {
        showToast("No file selected.", "error");
        return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        uploadedFileContent = e.target.result;
        document.getElementById('codeInput').value = uploadedFileContent;
        showToast(`File "${file.name}" loaded successfully.`, "success");
        document.getElementById('scanBtn').disabled = false;
    };
    reader.onerror = () => {
        showToast("Failed to read file.", "error");
    };
    reader.readAsText(file);
}

function analyzeCode() {
    const code = document.getElementById('codeInput').value;
    const resultBox = document.getElementById('scanResult');
    const messageBox = document.getElementById('scanMessage');

    if (!code) {
        showToast("No code to analyze. Paste code or upload a file.", "error");
        return;
    }

    setLoading("scanBtn", true);
    resultBox.style.display = 'none';

    setTimeout(() => {
        let vulnerabilities = [];

        if (code.includes('function setPrice(') && !code.match(/function\s+setPrice\s*\([^)]*\)\s*public\s*(onlyOwner|internal)/)) {
            if(!code.match(/require\s*\(\s*msg\.sender\s*==\s*owner/)){
                vulnerabilities.push({
                    title: "Critical: Unprotected Price Update Function",
                    details: "The contract contains a `setPrice` function that appears to be public and lacks access control (e.g., `onlyOwner` modifier). This could allow any external actor to manipulate the price oracle."
                });
            }
        }

        if (code.includes('tx.origin')) {
            vulnerabilities.push({
                title: "Warning: Use of `tx.origin`",
                details: "The code uses `tx.origin` for authorization. This is vulnerable to phishing attacks. `msg.sender` should be used instead for authentication."
            });
        }

        let reportHTML = `<h4>Scan Report</h4>`;
        if (vulnerabilities.length > 0) {
            reportHTML += `<p>${vulnerabilities.length} potential issue(s) found:</p><ul>`;
            vulnerabilities.forEach(vuln => {
                reportHTML += `<li><strong>${vuln.title}:</strong> ${vuln.details}</li>`;
            });
            reportHTML += `</ul>`;
        } else {
            reportHTML += `<p style="color: var(--success);"><strong><i class="fa-solid fa-check-circle"></i> No obvious oracle manipulation vulnerabilities found.</strong></p>`;
            reportHTML += `<p class="text-muted">Note: This is a basic scan and does not guarantee the contract is fully secure.</p>`;
        }

        messageBox.innerHTML = reportHTML;
        resultBox.style.display = 'block';
        setLoading("scanBtn", false, '<i class="fa-solid fa-magnifying-glass"></i> Analyze Code');
        showToast("Analysis complete.", "success");

    }, 1000);
}

window.addEventListener("DOMContentLoaded", () => {
    document.getElementById("scanBtn").addEventListener("click", analyzeCode);
    document.getElementById("fileUpload").addEventListener("change", handleFileUpload);
    document.getElementById('codeInput').addEventListener('input', () => {
        document.getElementById('scanBtn').disabled = !document.getElementById('codeInput').value;
    });
});


