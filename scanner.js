/* ========================================================================
   SCANNER.JS — Version 6.0 (Modular Security Framework Edition)
   Professional Static Analyzer for Oracle Manipulation & Common Solidity Bugs
   ======================================================================== */

/* ------------------------------------------------------------------------
    GLOBAL STATE
------------------------------------------------------------------------ */
let uploadedFileContent = "";

/* ------------------------------------------------------------------------
    UI HELPERS
------------------------------------------------------------------------ */
const UI = {
    toast(message, type = "info") {
        const container = document.getElementById("toast-container");
        const toast = document.createElement("div");
        toast.className = `toast toast-${type}`;
        toast.innerHTML = message;
        container.appendChild(toast);
        setTimeout(() => toast.remove(), 4000);
    },

    loading(btnId, isLoading, text = "") {
        const btn = document.getElementById(btnId);
        if (!btn) return;

        if (isLoading) {
            btn.disabled = true;
            btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
        } else {
            btn.disabled = false;
            btn.innerHTML = text;
        }
    },

    resetFixState() {
        const fixBtn = document.getElementById("fixBtn");
        const fixResult = document.getElementById("fixResult");
        if (fixBtn) {
            fixBtn.disabled = true;
            fixBtn.style.filter = "grayscale(100%)";
        }
        if (fixResult) fixResult.style.display = "none";
    }
};

/* ------------------------------------------------------------------------
    FILE HANDLING
------------------------------------------------------------------------ */
function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        uploadedFileContent = e.target.result;
        document.getElementById("codeInput").value = uploadedFileContent;

        document.getElementById("scanBtn").disabled = false;
        UI.resetFixState();
        UI.toast(`File "${file.name}" loaded successfully.`, "success");
    };

    reader.onerror = () => UI.toast("Failed to read file.", "error");
    reader.readAsText(file);
    event.target.value = "";
}

/* ========================================================================
    MODULE: Scanner (Top-Level)
    Contains detection modules and report builder
========================================================================= */
const Scanner = {
    analyze(code) {
        const results = [];
        let score = 0;

        // Run each detection module
        Scanner.detect.oracle(code, results);
        Scanner.detect.reentrancy(code, results);
        Scanner.detect.overflow(code, results);
        Scanner.detect.delegatecall(code, results);
        Scanner.detect.txorigin(code, results);
        Scanner.detect.randomness(code, results);
        Scanner.detect.selfdestruct(code, results);

        // Compute score
        results.forEach(r => {
            score += r.severity === "critical" ? 3 :
                     r.severity === "high" ? 2 :
                     r.severity === "medium" ? 1 : 0;
        });

        return { results, score };
    },

    detect: {
        /* --------------------------------------------------------------
            ORACLE MANIPULATION
        -------------------------------------------------------------- */
        oracle(code, results) {
            const fnRegex = /function\s+setPrice\s*\((.*?)\)\s*(public|external)\s*[{]/s;

            const isUnprotected =
                fnRegex.test(code) &&
                !/onlyOwner|auth|owner|require\s*\(\s*msg\.sender/.test(code);

            if (isUnprotected) {
                results.push({
                    title: "CRITICAL: Unprotected Oracle Update",
                    details:
                        "The setPrice() function is publicly accessible with no access control.",
                    severity: "critical"
                });
            }
        },

        /* --------------------------------------------------------------
            REENTRANCY CHECK
        -------------------------------------------------------------- */
        reentrancy(code, results) {
            const hasCallValue = /\.call\s*\{[^}]*value:\s*\w+/.test(code);
            const hasGuard = /nonReentrant|locked|mutex/.test(code);

            if (hasCallValue && !hasGuard) {
                results.push({
                    title: "High Risk: Potential Reentrancy",
                    details:
                        "This contract sends Ether via low-level .call() without a reentrancy guard.",
                    severity: "high"
                });
            }
        },

        /* --------------------------------------------------------------
            INTEGER OVERFLOW / OLD COMPILER
        -------------------------------------------------------------- */
        overflow(code, results) {
            const pragma = code.match(/pragma\s+solidity\s+([\^>=<]*\d+\.\d+\.\d+)/);
            if (!pragma) return;

            const version = pragma[1];
            const isOld = /0\.[4-7]\./.test(version);
            const usesSafeMath = /SafeMath|\.add|\.sub|\.mul|\.div/.test(code);

            if (isOld && !usesSafeMath) {
                results.push({
                    title: "Integer Overflow / Underflow Risk",
                    details:
                        "Older Solidity versions (<0.8.0) do not have built-in overflow checks, and SafeMath is not used.",
                    severity: "high"
                });
            }
        },

        /* --------------------------------------------------------------
            DELEGATECALL RISK
        -------------------------------------------------------------- */
        delegatecall(code, results) {
            if (code.includes("delegatecall")) {
                results.push({
                    title: "Dangerous Use of delegatecall",
                    details:
                        "delegatecall executes code in the caller's context. Ensure the target address is fully trusted.",
                    severity: "high"
                });
            }
        },

        /* --------------------------------------------------------------
            TX.ORIGIN
        -------------------------------------------------------------- */
        txorigin(code, results) {
            if (code.includes("tx.origin")) {
                results.push({
                    title: "Phishing Vulnerability (tx.origin)",
                    details:
                        "`tx.origin` is unsafe for authentication. Use msg.sender instead.",
                    severity: "medium"
                });
            }
        },

        /* --------------------------------------------------------------
            WEAK RANDOMNESS
        -------------------------------------------------------------- */
        randomness(code, results) {
            if (/block\.timestamp|now/.test(code)) {
                results.push({
                    title: "Weak Randomness Detected",
                    details:
                        "Using block.timestamp or now for randomness is insecure and miner-influenced.",
                    severity: "medium"
                });
            }
        },

        /* --------------------------------------------------------------
            SELFDESTRUCT
        -------------------------------------------------------------- */
        selfdestruct(code, results) {
            if (code.includes("selfdestruct")) {
                results.push({
                    title: "Use of selfdestruct",
                    details:
                        "selfdestruct is deprecated and dangerous. It can force Ether into contracts.",
                    severity: "medium"
                });
            }
        }
    }
};

/* ========================================================================
    MODULE: Auto-Patcher
    Contains safe, minimal patching functionality
========================================================================= */
const Patcher = {
    apply(code) {
        let fixed = code;

        // 1) tx.origin → msg.sender
        fixed = fixed.replace(/tx\.origin/g, "msg.sender");

        // 2) Oracle: Add access control + inject owner
        const oracleFn = /function\s+setPrice\s*\((.*?)\)\s*(public|external)\s*{/;
        if (oracleFn.test(fixed) && !/require\s*\(\s*msg\.sender/.test(fixed)) {
            fixed = fixed.replace(
                oracleFn,
                match =>
                    `${match}\n        require(msg.sender == owner, "Not authorized"); // AUTO-FIX`
            );

            if (!/address\s+public\s+owner/.test(fixed)) {
                fixed = fixed.replace(
                    /contract\s+\w+\s*{/,
                    x =>
                        `${x}\n    address public owner = msg.sender; // AUTO-FIX injected owner\n`
                );
            }
        }

        // 3) Reentrancy: Add basic guard
        const callPattern = /\.call\s*\{[^}]*value:/;
        if (callPattern.test(fixed) && !/nonReentrant|locked/.test(fixed)) {
            fixed = fixed.replace(
                /contract\s+\w+\s*{/,
                x =>
                    `${x}
    // AUTO-FIX: Reentrancy Guard
    bool private locked = false;
    modifier nonReentrant() {
        require(!locked, "Reentrancy detected");
        locked = true;
        _;
        locked = false;
    }\n`
            );

            // Add modifier to functions containing .call()
            fixed = fixed.replace(
                /(function\s+\w+\s*\([^)]*\)\s*(public|external)(?:\s+payable)?)\s*{/g,
                (full, sig) => {
                    return full.includes("nonReentrant")
                        ? full
                        : `${sig} nonReentrant {`;
                }
            );
        }

        // 4) Weak randomness comment
        fixed = fixed.replace(
            /(block\.timestamp|now)/g,
            "$1 /* AUTO-FIX WARNING: weak randomness */"
        );

        // 5) Upgrade compiler old → ^0.8.0
        fixed = fixed.replace(
            /pragma\s+solidity\s+[^\n]+;/,
            "pragma solidity ^0.8.0; // AUTO-FIX upgraded version"
        );

        return fixed;
    }
};

/* ========================================================================
    FRONT-END WIRING
========================================================================= */
function analyzeCode() {
    const code = document.getElementById("codeInput").value;
    if (!code.trim()) return UI.toast("No code to analyze.", "error");

    UI.loading("scanBtn", true);
    UI.resetFixState();

    setTimeout(() => {
        const { results, score } = Scanner.analyze(code);

        const reportBox = document.getElementById("scanResult");
        const msg = document.getElementById("scanMessage");

        let html = `
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <h4>Scan Report</h4>
                <span class="risk-score">Risk Score: ${score}/10</span>
            </div>
        `;

        if (results.length === 0) {
            html += `<p style='color:#10b981'><strong>No issues detected.</strong></p>`;
        } else {
            html += `<ul style="list-style:none; padding-left:0;">`;
            results.forEach(r => {
                const color =
                    r.severity === "critical"
                        ? "#ef4444"
                        : r.severity === "high"
                        ? "#f59e0b"
                        : "#eab308";

                html += `
                    <li style="margin-bottom:14px; border-left:4px solid ${color}; padding-left:12px;">
                        <strong style="color:${color};">${r.title}</strong>
                        <div style="opacity:0.8; margin-top:4px;">${r.details}</div>
                    </li>
                `;
            });
            html += "</ul>";

            const fixBtn = document.getElementById("fixBtn");
            fixBtn.disabled = false;
            fixBtn.style.filter = "grayscale(0%)";
        }

        msg.innerHTML = html;
        reportBox.style.display = "block";
        UI.loading("scanBtn", false, '<i class="fa-solid fa-magnifying-glass"></i> Analyze Code');
        UI.toast("Analysis complete.", "success");
    }, 700);
}

function applyAutoFixes() {
    const code = document.getElementById("codeInput").value;
    if (!code) return;

    const fixed = Patcher.apply(code);
    document.getElementById("fixedCodeOutput").value = fixed;
    document.getElementById("fixResult").style.display = "block";
    UI.toast("Auto-fixes applied!", "success");
}

function copyFixedCode() {
    const box = document.getElementById("fixedCodeOutput");
    box.select();
    navigator.clipboard.writeText(box.value).then(() => {
        UI.toast("Code copied!", "info");
    });
}

/* ========================================================================
    INITIALIZE
========================================================================= */
window.addEventListener("DOMContentLoaded", () => {
    document.getElementById("scanBtn").addEventListener("click", analyzeCode);
    document.getElementById("fixBtn").addEventListener("click", applyAutoFixes);
    document.getElementById("copyFixBtn").addEventListener("click", copyFixedCode);
    document.getElementById("fileUpload").addEventListener("change", handleFileUpload);

    document.getElementById("codeInput").addEventListener("input", () => {
        document.getElementById("scanBtn").disabled = !document
            .getElementById("codeInput")
            .value.trim();
        UI.resetFixState();
    });
});
