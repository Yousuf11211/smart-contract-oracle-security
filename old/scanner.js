/* scanner.js - Enhanced Version 4.0 (Advanced Auto-Patcher) */

let uploadedFileContent = '';

// --- UI Helper Functions ---
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = message; 
    container.appendChild(toast);
    setTimeout(() => { toast.remove(); }, 4000);
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

// --- File Handling ---
function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        uploadedFileContent = e.target.result;
        document.getElementById('codeInput').value = uploadedFileContent;
        showToast(`File "${file.name}" loaded successfully.`, "success");
        document.getElementById('scanBtn').disabled = false;
        resetFixState();
    };
    reader.onerror = () => showToast("Failed to read file.", "error");
    reader.readAsText(file);
    event.target.value = ''; 
}

function resetFixState() {
    const fixBtn = document.getElementById('fixBtn');
    const fixResult = document.getElementById('fixResult');
    if (fixBtn) {
        fixBtn.disabled = true;
        fixBtn.style.filter = "grayscale(100%)";
    }
    if (fixResult) fixResult.style.display = 'none';
}

// --- CORE: Analysis Logic (The "Scanner") ---
function analyzeCode() {
    const code = document.getElementById('codeInput').value;
    const resultBox = document.getElementById('scanResult');
    const messageBox = document.getElementById('scanMessage');
    const fixBtn = document.getElementById('fixBtn');

    if (!code.trim()) return showToast("No code to analyze.", "error");

    setLoading("scanBtn", true);
    resultBox.style.display = 'none';
    resetFixState();

    setTimeout(() => {
        let vulnerabilities = [];
        let riskScore = 0;

        // 1. Oracle Manipulation Check
        const oraclePattern = /function\s+setPrice\s*\([^)]*\)\s*(public|external)(?!.*onlyOwner)(?!.*auth)/s;
        if (oraclePattern.test(code) && !code.includes("require(msg.sender")) {
            vulnerabilities.push({
                title: "CRITICAL: Unprotected Oracle Update",
                details: "A `setPrice` function is public and lacks `onlyOwner` checks. Attackers can manipulate the price.",
                severity: "high"
            });
            riskScore += 3;
        }

        // 2. Reentrancy Check
        if (/\.call\s*\{.*value:.*\}/.test(code) && !code.includes("nonReentrant") && !code.includes("locked")) {
             vulnerabilities.push({
                title: "High Risk: Potential Reentrancy",
                details: "Low-level `.call` sending ETH detected without a reentrancy guard.",
                severity: "high"
            });
            riskScore += 3;
        }

        // 3. Integer Overflow (Old Compiler Check)
        const pragmaMatch = code.match(/pragma\s+solidity\s+([\^><=]*\d+\.\d+\.\d+)/);
        const isOldVersion = pragmaMatch && (
            pragmaMatch[1].includes("0.4") || 
            pragmaMatch[1].includes("0.5") || 
            pragmaMatch[1].includes("0.6") || 
            pragmaMatch[1].includes("0.7")
        );
        if (isOldVersion && !code.includes("SafeMath") && !code.includes(".add")) {
             vulnerabilities.push({
                title: "Integer Overflow Risk",
                details: "Contract uses an older Solidity version (< 0.8.0) without SafeMath. Arithmetic may overflow.",
                severity: "high"
            });
            riskScore += 2;
        }

        // 4. Unsafe Delegatecall
        if (code.includes("delegatecall")) {
            vulnerabilities.push({
                title: "Dangerous Delegatecall",
                details: "Use of `delegatecall` allows the callee to modify your contract's state. Ensure the target is trusted.",
                severity: "high"
            });
            riskScore += 2;
        }

        // 5. Selfdestruct (Deprecated/Risky)
        if (code.includes("selfdestruct")) {
            vulnerabilities.push({
                title: "Use of Selfdestruct",
                details: "The `selfdestruct` opcode is dangerous and being deprecated. It can force-send ETH to contracts.",
                severity: "medium"
            });
            riskScore += 1;
        }

        // 6. Phishing (tx.origin)
        if (code.includes('tx.origin')) {
            vulnerabilities.push({
                title: "Phishing Vulnerability",
                details: "Avoid `tx.origin`. Use `msg.sender` to prevent authorization attacks.",
                severity: "medium"
            });
            riskScore += 1;
        }

        // 7. Weak Randomness
        if (/block\.timestamp/.test(code) || /now\s*[%+-]/.test(code)) {
             vulnerabilities.push({
                title: "Weak Randomness",
                details: "Dependence on `block.timestamp` detected. Miners can manipulate this.",
                severity: "medium"
            });
            riskScore += 1;
        }

        // --- Generate Report HTML ---
        let reportHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                <h4 style="margin:0;">Scan Report</h4>
                <span style="font-size:0.8rem; background:rgba(255,255,255,0.1); padding:2px 8px; border-radius:4px;">Risk Score: ${riskScore}/10</span>
            </div>`;
        
        if (vulnerabilities.length > 0) {
            reportHTML += `<p>${vulnerabilities.length} potential issue(s) found:</p><ul style="list-style:none; padding-left:0;">`;
            vulnerabilities.forEach(vuln => {
                const icon = vuln.severity === 'high' ? 'fa-skull' : 'fa-triangle-exclamation';
                const color = vuln.severity === 'high' ? '#f87171' : '#facc15';
                
                reportHTML += `
                <li style="margin-bottom: 12px; border-left: 3px solid ${color}; padding-left: 12px; background: rgba(255,255,255,0.05); padding: 8px; border-radius: 0 4px 4px 0;">
                    <strong style="color: ${color}"><i class="fa-solid ${icon}"></i> ${vuln.title}</strong>
                    <div style="font-size: 0.9em; margin-top: 4px; color: #cbd5e1; line-height: 1.4;">${vuln.details}</div>
                </li>`;
            });
            reportHTML += `</ul>`;
            
            fixBtn.disabled = false;
            fixBtn.style.filter = "grayscale(0%)";
            
        } else {
            reportHTML += `<p style="color: var(--success);"><strong><i class="fa-solid fa-check-circle"></i> No common signatures found.</strong></p>`;
            reportHTML += `<p class="text-muted">Code appears clean based on current signatures.</p>`;
        }

        messageBox.innerHTML = reportHTML;
        resultBox.style.display = 'block';
        setLoading("scanBtn", false, '<i class="fa-solid fa-magnifying-glass"></i> Analyze Code');
        showToast("Analysis complete.", "success");

    }, 800);
}

// --- CORE: Auto-Fix Logic (The "Patcher") ---
function applyAutoFixes() {
    let code = document.getElementById('codeInput').value;
    if (!code) return;

    // 1. Fix Phishing
    if (code.includes("tx.origin")) {
        code = code.replace(/tx\.origin/g, "msg.sender");
    }

    // 2. Fix Oracle (Access Control + Owner Injection)
    const oracleFixRegex = /(function\s+setPrice\s*\([^)]*\)\s*(?:public|external).*?\{)/s;
    if (oracleFixRegex.test(code) && !code.includes("require(msg.sender")) {
        // Step A: Apply the check
        code = code.replace(oracleFixRegex, '$1\n        require(msg.sender == owner, "Caller is not the owner"); // AUTO-FIX: Access Control');
        
        // Step B: Ensure 'owner' variable exists. If not, inject it at the top of contract.
        // We look for "contract Name {"
        if (!code.includes("address public owner") && !code.includes("address owner")) {
            const contractStart = code.match(/contract\s+\w+\s*\{/);
            if (contractStart) {
                code = code.replace(contractStart[0], `${contractStart[0]}\n    address public owner = msg.sender; // AUTO-FIX: Injected missing Owner variable`);
            }
        }
    }

    // 3. Fix Reentrancy (The Mutex Injection)
    const reentrancyRegex = /(function\s+(\w+)\s*\([^)]*\)\s*(?:public|external).*)(\{)/;
    const callUsage = /\.call\s*\{.*value:.*\}/;
    
    // Only apply if we see a dangerous call AND the code doesn't already have protection
    if (callUsage.test(code) && !code.includes("nonReentrant") && !code.includes("locked")) {
        
        // Step A: Inject the 'locked' state variable and modifier
        const contractStart = code.match(/contract\s+\w+\s*\{/);
        if (contractStart) {
             const mutexLogic = `
    // AUTO-FIX: Reentrancy Guard Variables
    bool private locked;
    modifier nonReentrant() {
        require(!locked, "Reentrancy detected");
        locked = true;
        _;
        locked = false;
    }`;
            code = code.replace(contractStart[0], `${contractStart[0]}\n${mutexLogic}`);
        }

        // Step B: Find functions with .call and append the 'nonReentrant' modifier to their signature
        // This is tricky with Regex, so we target the function containing the call if possible
        // For this demo, we match functions that look like withdraw/attack
        code = code.replace(/(function\s+(?:withdraw|attack|payout)\s*\([^)]*\)\s*(?:public|external)(?:\s*payable)?)/g, '$1 nonReentrant');
        
        // Fallback: If regex missed specific names, warn the user
        if (!code.includes("nonReentrant")) {
             code = code.replace(callUsage, '/* SECURITY WARNING: Add nonReentrant modifier here */\n        $&');
        }
    }

    // 4. Fix Weak Randomness
    if (/block\.timestamp/.test(code) || /now\s*[%+-]/.test(code)) {
        code = code.replace(/(.*(?:block\.timestamp|now).*)/g, '$1 // WARN: Don\'t use block time for randomness');
    }

    // 5. Fix Integer Overflow (Upgrade Compiler)
    const pragmaMatch = code.match(/pragma\s+solidity\s+([\^><=]*\d+\.\d+\.\d+)/);
    const isOldVersion = pragmaMatch && (
        pragmaMatch[1].includes("0.4") || 
        pragmaMatch[1].includes("0.5") || 
        pragmaMatch[1].includes("0.6") || 
        pragmaMatch[1].includes("0.7")
    );
    if (isOldVersion) {
        code = code.replace(/pragma\s+solidity\s+[\^><=]*\d+\.\d+\.\d+;/, 'pragma solidity ^0.8.0; // AUTO-FIX: Upgraded version for overflow protection');
    }

    // 6. Fix Deprecated 'now'
    if (code.includes("now") && !code.includes("block.timestamp")) {
        code = code.replace(/\bnow\b/g, "block.timestamp"); 
    }

    // Update UI
    const outputBox = document.getElementById('fixedCodeOutput');
    outputBox.value = code;
    document.getElementById('fixResult').style.display = 'block';
    
    showToast("Advanced Auto-fixes applied!", "success");
    document.getElementById('fixResult').scrollIntoView({ behavior: 'smooth' });
}

function copyFixedCode() {
    const fixedCode = document.getElementById('fixedCodeOutput');
    fixedCode.select();
    navigator.clipboard.writeText(fixedCode.value).then(() => {
        showToast("Code copied to clipboard!", "info");
    });
}

// --- Initialization ---
window.addEventListener("DOMContentLoaded", () => {
    const scanBtn = document.getElementById("scanBtn");
    if(scanBtn) scanBtn.addEventListener("click", analyzeCode);

    const fixBtn = document.getElementById("fixBtn");
    if(fixBtn) fixBtn.addEventListener("click", applyAutoFixes);
    
    const copyBtn = document.getElementById("copyFixBtn");
    if(copyBtn) copyBtn.addEventListener("click", copyFixedCode);

    const fileUpload = document.getElementById("fileUpload");
    if(fileUpload) fileUpload.addEventListener("change", handleFileUpload);

    const codeInput = document.getElementById('codeInput');
    if(codeInput) {
        codeInput.addEventListener('input', () => {
            scanBtn.disabled = !codeInput.value.trim();
            resetFixState();
        });
    }
});