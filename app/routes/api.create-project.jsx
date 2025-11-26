import prisma from "../db.server";

const LOG_PREFIX = "[Create Project API]";

// CORS headers for theme extension access
const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
};

/**
 * Generate request body for editor project creation
 * Based on WordPress plugin's generate_request_body() method
 */
function generateRequestBody(editorSettings, overrideData = {}) {
    console.log(`${LOG_PREFIX} [STEP 1] Starting generateRequestBody`);
    console.log(`${LOG_PREFIX} [STEP 1] Editor settings:`, {
        customerId: editorSettings.editorCustomerId,
        domain: editorSettings.editorDomain,
        apiKey: editorSettings.editorApiKey ? `${editorSettings.editorApiKey.substring(0, 20)}...` : null,
    });

    const hasOverride = (key) => Object.prototype.hasOwnProperty.call(overrideData || {}, key);
    const pick = (key, fallback) => (hasOverride(key) ? overrideData[key] : fallback);

    const sanitizeReturnUrl = (url) => {
        if (!url) return url;
        try {
            const parsed = new URL(url);
            if (parsed.pathname === "/cart/add") {
                parsed.pathname = "/cart";
                parsed.search = "";
            }
            return parsed.toString();
        } catch (error) {
            console.warn(`${LOG_PREFIX} [SANITIZE] Invalid returnUrl provided`, url, error);
            return url;
        }
    };

    const defaultReturnUrl = sanitizeReturnUrl("https://pelemanappstoredev.myshopify.com/cart");
    const overrideReturnUrl = hasOverride("returnUrl") ? overrideData.returnUrl : null;

    // Real data from WordPress logs (defaults, can be overridden)
    const testData = {
        // Editor configuration
        templateId: pick("templateId", "tpl686566"),
        designId: pick("designId", ""),
        materialId: pick("materialId", "Wood"),

        // Project details
        projectName: pick("projectName", "Default Project Name"),
        returnUrl: overrideReturnUrl ?? defaultReturnUrl,
        userEmail: pick("userEmail", "birhan.yorukoglu@peleman.com"),
        language: pick("language", "en"),

        // Editor settings
        sheetsMax: pick("sheetsMax", 15),
        includedPages: pick("includedPages", 0),
        locale: pick("locale", "en_GB"),

        // Product details
        personalisations: pick("personalisations", "f2d"),
        f2dArticleCode: pick("f2dArticleCode", "25290A415AL"),
        productUnitCode: pick("productUnitCode", "BOX"),
    };

    console.log(`${LOG_PREFIX} [STEP 1] Hard-coded test data prepared:`, testData);

    // Build request body matching WordPress plugin structure
    const requestBody = {
        customerid: editorSettings.editorCustomerId || "",
        templateid: testData.templateId,
        designid: testData.designId,
        materialid: testData.materialId,
        projectname: testData.projectName,
        returnurl: testData.returnUrl,
        useremail: testData.userEmail,
        lang: testData.language,
        sheetsmax: testData.sheetsMax,
        includedpages: testData.includedPages,
        locale: testData.locale,
        personalisations: testData.personalisations,
        f2d_article_code: testData.f2dArticleCode,
        productUnitCode: testData.productUnitCode,
        v: 2, // API version
    };

    console.log(`${LOG_PREFIX} [STEP 1] Overrides applied:`, overrideData);
    console.log(`${LOG_PREFIX} [STEP 1] Request body generated successfully`);
    console.log(`${LOG_PREFIX} [STEP 1] Request body structure:`, JSON.stringify(requestBody, null, 2));

    return requestBody;
}

/**
 * Build editor API URL
 */
function buildEditorApiUrl(editorDomain) {
    console.log(`${LOG_PREFIX} [STEP 2] Building editor API URL`);
    const endpoint = "/editor/api/createprojectAPI.php";
    const baseUrl = editorDomain.endsWith("/")
        ? editorDomain.slice(0, -1)
        : editorDomain;
    const fullUrl = `${baseUrl}${endpoint}`;

    console.log(`${LOG_PREFIX} [STEP 2] Editor domain:`, editorDomain);
    console.log(`${LOG_PREFIX} [STEP 2] Endpoint:`, endpoint);
    console.log(`${LOG_PREFIX} [STEP 2] Full URL:`, fullUrl);

    return fullUrl;
}

/**
 * Build authentication headers
 */
function buildAuthHeaders(apiKey) {
    console.log(`${LOG_PREFIX} [STEP 3] Building authentication headers`);
    const headers = {
        PIEAPIKEY: apiKey || "",
    };

    console.log(`${LOG_PREFIX} [STEP 3] Auth header prepared:`, {
        PIEAPIKEY: apiKey ? `${apiKey.substring(0, 20)}...` : "MISSING",
    });

    return headers;
}

/**
 * Flatten nested objects for query string
 * WordPress sends nested objects as query parameters with bracket notation
 */
function flattenObject(obj, prefix = '', queryParams) {
    for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            const value = obj[key];
            const newKey = prefix ? `${prefix}[${key}]` : key;

            if (value === null || value === undefined) {
                continue; // Skip null/undefined values
            } else if (Array.isArray(value)) {
                // Handle arrays - WordPress sends arrays as indexed query params
                value.forEach((item, index) => {
                    if (typeof item === 'object' && item !== null) {
                        // Nested objects in arrays
                        Object.keys(item).forEach(subKey => {
                            queryParams.append(`${newKey}[${index}][${subKey}]`, item[subKey]);
                        });
                    } else {
                        queryParams.append(`${newKey}[${index}]`, item);
                    }
                });
            } else if (typeof value === 'object' && value !== null) {
                // Recursively flatten nested objects
                flattenObject(value, newKey, queryParams);
            } else {
                queryParams.append(newKey, String(value));
            }
        }
    }
}

async function createProjectResponse({ request, shop, overrides = {} }) {
    console.log(`${LOG_PREFIX} ========================================`);
    console.log(`${LOG_PREFIX} [INIT] Create project API called`);
    console.log(`${LOG_PREFIX} [INIT] Request URL:`, request.url);
    console.log(`${LOG_PREFIX} [INIT] Shop parameter:`, shop);

    if (!shop) {
        console.error(`${LOG_PREFIX} [ERROR] Shop parameter is required`);
        return new Response(
            JSON.stringify({
                success: false,
                error: "Shop parameter is required"
            }),
            {
                status: 400,
                headers: {
                    "Content-Type": "application/json",
                    ...corsHeaders,
                },
            }
        );
    }

    try {
        console.log(`${LOG_PREFIX} [INIT] Loading editor settings from database`);

        const settings = await prisma.editorSettings.findUnique({
            where: { shop },
            select: {
                editorApiKey: true,
                editorDomain: true,
                editorCustomerId: true,
            },
        });

        console.log(`${LOG_PREFIX} [INIT] Editor settings loaded:`, {
            hasApiKey: !!settings?.editorApiKey,
            hasDomain: !!settings?.editorDomain,
            hasCustomerId: !!settings?.editorCustomerId,
        });

        if (!settings || !settings.editorApiKey || !settings.editorDomain || !settings.editorCustomerId) {
            console.error(`${LOG_PREFIX} [ERROR] Editor settings incomplete or missing`);
            return new Response(
                JSON.stringify({
                    success: false,
                    error: "Editor settings not configured. Please configure editor settings first.",
                    missingFields: {
                        apiKey: !settings?.editorApiKey,
                        domain: !settings?.editorDomain,
                        customerId: !settings?.editorCustomerId,
                    },
                }),
                {
                    status: 400,
                    headers: {
                        "Content-Type": "application/json",
                        ...corsHeaders,
                    },
                }
            );
        }

        console.log(`${LOG_PREFIX} [INIT] Overrides received from client:`, overrides);

        console.log(`${LOG_PREFIX} [MAIN] Starting request body generation`);
        const requestBody = generateRequestBody(settings, overrides);
        console.log(`${LOG_PREFIX} [MAIN] Request body generation completed`);

        // Log complete request body as JSON for debugging
        console.log(`${LOG_PREFIX} ========================================`);
        console.log(`${LOG_PREFIX} [JSON] Complete request body to editor (JSON format):`);
        console.log(JSON.stringify(requestBody, null, 2));
        console.log(`${LOG_PREFIX} ========================================`);

        console.log(`${LOG_PREFIX} [MAIN] Building API URL`);
        const apiUrl = buildEditorApiUrl(settings.editorDomain);
        console.log(`${LOG_PREFIX} [MAIN] API URL built:`, apiUrl);

        console.log(`${LOG_PREFIX} [MAIN] Building auth headers`);
        const authHeaders = buildAuthHeaders(settings.editorApiKey);
        console.log(`${LOG_PREFIX} [MAIN] Auth headers built`);

        console.log(`${LOG_PREFIX} [STEP 4] Starting HTTP request to editor API`);
        console.log(`${LOG_PREFIX} [STEP 4] Request URL:`, apiUrl);
        console.log(`${LOG_PREFIX} [STEP 4] Request method: GET`);
        console.log(`${LOG_PREFIX} [STEP 4] Request headers:`, authHeaders);
        console.log(`${LOG_PREFIX} [STEP 4] Request body (will be converted to query params):`, requestBody);

        const queryParams = new URLSearchParams();
        flattenObject(requestBody, '', queryParams);
        const queryString = queryParams.toString();
        const fullUrlWithParams = `${apiUrl}?${queryString}`;

        console.log(`${LOG_PREFIX} [STEP 4] Query string length:`, queryString.length);
        console.log(`${LOG_PREFIX} [STEP 4] Full URL with params (first 200 chars):`, fullUrlWithParams.substring(0, 200) + '...');

        const startTime = Date.now();
        let response;
        let responseBody = "";
        let responseStatus;
        let projectId = null;
        let decodedResponse = null;

        try {
            console.log(`${LOG_PREFIX} [STEP 4] Sending fetch request...`);

            response = await fetch(fullUrlWithParams, {
                method: 'GET',
                headers: {
                    ...authHeaders,
                    'Content-Type': 'application/json',
                },
            });

            const requestDuration = Date.now() - startTime;
            responseStatus = response.status;
            responseBody = await response.text();

            console.log(`${LOG_PREFIX} [STEP 4] HTTP request completed`);
            console.log(`${LOG_PREFIX} [STEP 4] Request duration:`, requestDuration, 'ms');
            console.log(`${LOG_PREFIX} [STEP 4] Response status:`, responseStatus);
            console.log(`${LOG_PREFIX} [STEP 4] Response headers:`, Object.fromEntries(response.headers.entries()));
            console.log(`${LOG_PREFIX} [STEP 4] Response body length:`, responseBody.length);
            console.log(`${LOG_PREFIX} [STEP 4] Response body (first 500 chars):`, responseBody.substring(0, 500));

            const trimmedBody = responseBody?.trim() ?? "";
            const isJson = !!trimmedBody && (response.headers.get("content-type") || "").includes("application/json");

            if (trimmedBody.length === 0) {
                console.warn(`${LOG_PREFIX} [STEP 4] Response body is empty`);
            } else if (isJson) {
                try {
                    decodedResponse = JSON.parse(trimmedBody);
                    console.log(`${LOG_PREFIX} [STEP 4] Response parsed as JSON successfully`);
                    console.log(`${LOG_PREFIX} [STEP 4] Parsed response:`, JSON.stringify(decodedResponse, null, 2));
                } catch (parseError) {
                    console.error(`${LOG_PREFIX} [STEP 4] JSON parse error:`, parseError);
                    console.error(`${LOG_PREFIX} [STEP 4] Raw response body:`, trimmedBody);
                    throw new Error(`Invalid JSON response from editor API: ${parseError.message}`);
                }
            } else {
                console.warn(`${LOG_PREFIX} [STEP 4] Response is not JSON. Content-Type:`, response.headers.get("content-type"));
            }

            if (!response.ok) {
                const message = trimmedBody.length > 0
                    ? trimmedBody.slice(0, 300)
                    : `Editor API returned status ${responseStatus} with empty body`;
                throw new Error(message);
            }

            if (decodedResponse) {
                if (decodedResponse.success === false) {
                    const errorMessage = decodedResponse.message || "Unknown editor API error";
                    console.error(`${LOG_PREFIX} [STEP 4] Editor API returned error:`, errorMessage);
                    throw new Error(`Editor API Error: ${errorMessage}`);
                }

                if (decodedResponse.data?.projectid) {
                    projectId = decodedResponse.data.projectid;
                    console.log(`${LOG_PREFIX} [STEP 4] Project ID extracted from data.projectid:`, projectId);
                } else if (decodedResponse.projectid) {
                    projectId = decodedResponse.projectid;
                    console.log(`${LOG_PREFIX} [STEP 4] Project ID extracted from projectid:`, projectId);
                }
            }

            if (!projectId) {
                console.error(`${LOG_PREFIX} [STEP 4] No project ID found in response`);
                console.error(`${LOG_PREFIX} [STEP 4] Response body snapshot:`, trimmedBody.substring(0, 300));
                throw new Error('No project ID received from editor API');
            }

            console.log(`${LOG_PREFIX} [STEP 4] Project creation successful!`);
            console.log(`${LOG_PREFIX} [STEP 4] Project ID:`, projectId);

            console.log(`${LOG_PREFIX} [STEP 5] Preparing success response`);
            console.log(`${LOG_PREFIX} ========================================`);

            return new Response(
                JSON.stringify({
                    success: true,
                    message: "Project created successfully",
                    projectId: projectId,
                    returnUrl: requestBody.returnurl,
                    requestInfo: {
                        url: apiUrl,
                        method: "GET",
                        status: responseStatus,
                    },
                    response: {
                        status: responseStatus,
                        projectId: projectId,
                    },
                    log: "Check server console for detailed logs",
                }),
                {
                    status: 200,
                    headers: {
                        "Content-Type": "application/json",
                        ...corsHeaders,
                    },
                }
            );
        } catch (fetchError) {
            const requestDuration = Date.now() - startTime;
            console.error(`${LOG_PREFIX} [STEP 4] HTTP request failed`);
            console.error(`${LOG_PREFIX} [STEP 4] Request duration:`, requestDuration, 'ms');
            console.error(`${LOG_PREFIX} [STEP 4] Error type:`, fetchError.constructor.name);
            console.error(`${LOG_PREFIX} [STEP 4] Error message:`, fetchError.message);
            console.error(`${LOG_PREFIX} [STEP 4] Error stack:`, fetchError.stack);

            return new Response(
                JSON.stringify({
                    success: false,
                    error: "Failed to create project in editor API",
                    details: fetchError.message,
                    requestInfo: {
                        url: apiUrl,
                        method: "GET",
                        duration: requestDuration,
                    },
                }),
                {
                    status: 500,
                    headers: {
                        "Content-Type": "application/json",
                        ...corsHeaders,
                    },
                }
            );
        }
    } catch (error) {
        console.error(`${LOG_PREFIX} [ERROR] Unexpected error:`, error);
        console.error(`${LOG_PREFIX} [ERROR] Error stack:`, error.stack);
        return new Response(
            JSON.stringify({
                success: false,
                error: "Failed to prepare project creation request",
                details: error.message,
            }),
            {
                status: 500,
                headers: {
                    "Content-Type": "application/json",
                    ...corsHeaders,
                },
            }
        );
    }
}
export const loader = async ({ request }) => {
    const url = new URL(request.url);
    const shop = url.searchParams.get("shop");
    return createProjectResponse({ request, shop });
};

export const action = async ({ request }) => {
    if (request.method !== "POST") {
        return new Response(
            JSON.stringify({
                success: false,
                error: "Method not allowed",
            }),
            {
                status: 405,
                headers: {
                    "Content-Type": "application/json",
                    ...corsHeaders,
                },
            }
        );
    }

    const url = new URL(request.url);
    const shop = url.searchParams.get("shop");

    let payload = {};
    try {
        const bodyText = await request.text();
        payload = bodyText ? JSON.parse(bodyText) : {};
    } catch (error) {
        console.error(`${LOG_PREFIX} [ACTION] Invalid JSON payload`, error);
        return new Response(
            JSON.stringify({
                success: false,
                error: "Invalid JSON payload",
            }),
            {
                status: 400,
                headers: {
                    "Content-Type": "application/json",
                    ...corsHeaders,
                },
            }
        );
    }

    const overrides = payload?.overrides && typeof payload.overrides === "object" ? payload.overrides : {};

    return createProjectResponse({
        request,
        shop,
        overrides,
    });
};

// Handle OPTIONS request for CORS preflight
export const options = async () => {
    console.log(`${LOG_PREFIX} [CORS] OPTIONS request received`);
    return new Response(null, {
        status: 200,
        headers: corsHeaders,
    });
};

// Export headers function to ensure CORS headers are always included
export const headers = () => {
    return corsHeaders;
};

