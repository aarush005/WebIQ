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
            headers: { "User-agent": "WebIQ-Auditor/1.0 (+https://webiq.app/bot)" },
            redirect: "follow",
        });
        clearTimeout(timeout);

        const html = await res.text();
        return { ok: true, status: res.status, header: res.header, html, finalUrl: res.url }
    } catch (e) {
        clearTimeout(timeout);
        return { ok: false, error: e.message };
    }
}


// -Check real security headers
function checkSecurityHeaders(headers) {
    const findings = [];

    const check = [
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
}


    // Server version disclosure - real security risk
    const serverHeader = header.get("server");
    if (serverHeader && /\d/.test(serverHeader)) {
        findings.push({
            title: "Server Version Disclosure",
            present: true,
            severity: "warning",
            description: `The Server header reveals: "${serverHeader}". This gives attackers exact version info to search for known exploits.`,
            fixCode: "Remove or generalize ther Server header in your web server config.",
        })
    }

    return findings;

    // Check cookies for security flags
    function checkCookies(headers) {
        const findings = [];
        const setCookie = headers.get("set-cookie");

        if (!setCookie) return findings;

        const cookies = setCookie.split(/,(?=[^;]+=[^;]+;)/); // rough split for multiple cooked  

        for (const cookie of cookies) {
            const name = cookie.split("=")[0]?.trim();
            const hasSecure = /secure/i.test(cookie);
            const hasHttpOnly = /httpon/i.test(cookie);
            const hasSameSite = /samesite/i.test(cookie);


            if (!hasSecure || !hasHttpOnly || !hasSameSite) {
                findings.push({
                    title: 'Cookie "${name}" missing security flags',
                    severity: "warning",
                    description: `Missing : ${[
                        !hasSecure && "Secure",
                        !hasHttpOnly && "HttpOnly",
                        !hsaSameSite && "SameSite",
                    ].filter(Boolean).join(", ")}. This exposes the cookie to theft via xss or man-in-the-middle attacks.`
                });
            }
        }
        return findings;
    }
    
// ── Parse HTML for real on-page issues ─────────────────────
function analyzeHTML(html, url) {
  const $ = cheerio.load(html);
  const findings = { seo: [], performance: [], conversion: [] };

  // ── Title tag ──
  const title = $("title").text().trim();
  if (!title) {
    findings.seo.push({
      title: "Missing <title> tag",
      severity: "critical",
      description: "No title tag found. This is one of the most important SEO signals.",
      fixCode: `<title>Your Page Title Here (50-60 characters)</title>`,
    });
  } else if (title.length > 60) {
    findings.seo.push({
      title: "Title tag too long",
      severity: "warning",
      description: `Title is ${title.length} characters: "${title}". Google truncates titles beyond ~60 characters in search results.`,
      fixCode: `<title>${title.slice(0, 57)}...</title>`,
    });
  } else if (title.length < 30) {
    findings.seo.push({
      title: "Title tag too short",
      severity: "info",
      description: `Title is only ${title.length} characters: "${title}". Consider expanding to 50-60 characters for better SEO.`,
      fixCode: "",
    });
  } else {
    findings.seo.push({
      title: "Title tag well optimized",
      severity: "good",
      description: `Title length (${title.length} chars) is in the ideal range: "${title}"`,
      fixCode: "",
    });
  }

// ── Parse HTML for real on-page issues ─────────────────────
function analyzeHTML(html, url) {
  const $ = cheerio.load(html);
  const findings = { seo: [], performance: [], conversion: [] };

  // ── Title tag ──
  const title = $("title").text().trim();
  if (!title) {
    findings.seo.push({
      title: "Missing <title> tag",
      severity: "critical",
      description: "No title tag found. This is one of the most important SEO signals.",
      fixCode: `<title>Your Page Title Here (50-60 characters)</title>`,
    });
  } else if (title.length > 60) {
    findings.seo.push({
      title: "Title tag too long",
      severity: "warning",
      description: `Title is ${title.length} characters: "${title}". Google truncates titles beyond ~60 characters in search results.`,
      fixCode: `<title>${title.slice(0, 57)}...</title>`,
    });
  } else if (title.length < 30) {
    findings.seo.push({
      title: "Title tag too short",
      severity: "info",
      description: `Title is only ${title.length} characters: "${title}". Consider expanding to 50-60 characters for better SEO.`,
      fixCode: "",
    });
  } else {
    findings.seo.push({
      title: "Title tag well optimized",
      severity: "good",
      description: `Title length (${title.length} chars) is in the ideal range: "${title}"`,
      fixCode: "",
    });
  }

    // ── Images without alt text (real count) ──
  const images = $("img");
  const imagesWithoutAlt = images.filter((i, el) => !$(el).attr("alt")).length;
  if (imagesWithoutAlt > 0) {
    findings.seo.push({
      title: `${imagesWithoutAlt} images missing alt text`,
      severity: imagesWithoutAlt > 5 ? "critical" : "warning",
      description: `Found ${imagesWithoutAlt} out of ${images.length} total images without alt attributes. This hurts accessibility and image SEO.`,
      fixCode: `<img src="..." alt="Descriptive text about the image">`,
    });
  } else if (images.length > 0) {
    findings.seo.push({
      title: "All images have alt text",
      severity: "good",
      description: `All ${images.length} images have alt attributes — great for accessibility and SEO.`,
      fixCode: "",
    });
  }

    // ── Viewport meta (mobile) ──
  const viewport = $('meta[name="viewport"]').attr("content");
  if (!viewport) {
    findings.performance.push({
      title: "Missing viewport meta tag",
      severity: "critical",
      description: "No viewport tag found — page will not render correctly on mobile devices.",
      fixCode: `<meta name="viewport" content="width=device-width, initial-scale=1.0">`,
    });
  }
}

  
}





