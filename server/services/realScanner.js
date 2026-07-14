import * as cheerio from "cheerio";

// Files that should NEVER be publicly accessible

const SENSITIVE_PATHS = [
    "/.env",
    "/.git/config",
    "/wp-config.php.bak",
    "/.DS_Store",
    "config.json",
    "/.aws/credentials",
    "/backup.sql",
    "/phpinfo.php",
];

//Fetch the live page + headers

async function fetchPage(url) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000); // 10s timout


    try {
        const res = await fetch(url, {
            signal: controller.signal,
            headers: {"User-agent": "WebIQ-Auditor/1.0 (+https://webiq.app/bot)"},
            redirect: "follow",
        });
        clearTimeout(timeout);

        const html = await res.text();
        return { ok: true, status: res.status, header: res.header, html, finalUrl: res.url}
    }catch (e){
        clearTimeout(timeout);
        return {ok: false, error: e.message};
    }
}

// -Check real security headers

function checkSecurityHeaders(headers) {
    const findings = [];

    const check =  [
       {
      key: "strict-transport-security",
      title: "HSTS Header (Strict-Transport-Security)",
      why: "Forces browsers to always use HTTPS, preventing downgrade attacks.",
      fixCode: "Strict-Transport-Security: max-age=31536000; includeSubDomains",
    },
    {
      key: "x-content-type-options",
      title: "X-Content-Type-Options Header",
      why: "Prevents browsers from MIME-sniffing responses away from declared content-type, blocking certain XSS attacks.",
      fixCode: "X-Content-Type-Options: nosniff",
    },
    {
      key: "x-frame-options",
      title: "X-Frame-Options Header",
      why: "Prevents clickjacking attacks by controlling whether the page can be embedded in an iframe.",
      fixCode: "X-Frame-Options: DENY",
    },
    {
      key: "content-security-policy",
      title: "Content-Security-Policy Header",
      why: "Restricts which scripts/resources can load, the single strongest defense against XSS.",
      fixCode: "Content-Security-Policy: default-src 'self'",
    },
    {
      key: "referrer-policy",
      title: "Referrer-Policy Header",
      why: "Controls how much referrer information is leaked to other sites when users click links.",
      fixCode: "Referrer-Policy: strict-origin-when-cross-origin",
    },
    {
      key: "permissions-policy",
      title: "Permissions-Policy Header",
      why: "Controls which browser features (camera, mic, geolocation) the page can access.",
      fixCode: "Permissions-Policy: geolocation=(), camera=(), microphone=()",
    },
    ];

    for (const check of checks) {
        const present = headers.get(check.key);
        findings.push({
            title: check.title,
            present: !!present,
            value: present || null,
            severity: present ? "good" : "warning",
            description: present 
            ? `This header is correctly set: ${present}`
            : `Missing. ${check.why}`,
            fixCode: present ? "" : `${check.key}: (add server config)\nExample : ${check.fixCode}`,
        })
    }



    // Server version disclosure - real security risk

    const serverHeader = header.get("server");
    if (serverHeader && /\d/.test(serverHeader)) {
        
    }
}



