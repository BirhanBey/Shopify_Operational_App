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
    const hasOverride = (key) =>
        Object.prototype.hasOwnProperty.call(overrideData || {}, key);
    const pick = (key, fallback) =>
        hasOverride(key) ? overrideData[key] : fallback;

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
            console.warn(
                `${LOG_PREFIX} [SANITIZE] Invalid returnUrl provided`,
                url,
                error
            );
            return url;
        }
    };

    const defaultReturnUrl = sanitizeReturnUrl(
        "https://pelemanappstoredev.myshopify.com/cart"
    );
    const overrideReturnUrl = hasOverride("returnUrl")
        ? overrideData.returnUrl
        : null;

    // Real data from WordPress logs (defaults, can be overridden)
    const testData = {
        // Editor configuration
        templateId: pick("templateId", "tpl686566"),
        designId: pick("designId", ""),
        materialId: pick("materialId", "Wood"),
        backgroundId: pick("backgroundId", ""),
        colorCode: pick("colorCode", ""),
        formatId: pick("formatId", ""),

        // Project details
        projectName: pick("projectName", "Default Project Name"),
        returnUrl: overrideReturnUrl ?? defaultReturnUrl,
        userEmail: pick("userEmail", "birhan.yorukoglu@peleman.com"),
        language: pick("language", "en"),
        userId: pick("userId", 0),

        // Editor settings
        sheetsMax: pick("sheetsMax", 15),
        includedPages: pick("includedPages", 0),
        locale: pick("locale", "en_GB"),
        // Pricing (dummy defaults, can be overridden)
        basePrice: pick("basePrice", 7.19),
        pagePrice: pick("pagePrice", 0),
        // Tax status (dummy defaults, can be overridden)
        taxDisplayFrontend: pick("taxDisplayFrontend", "excl"),
        taxDisplayBackend: pick("taxDisplayBackend", "excl"),
        taxRate: pick("taxRate", 21),

        // Product details
        personalisations: pick("personalisations", "f2d"),
        f2dArticleCode: pick("f2dArticleCode", "25290A415AL"),
        productUnitCode: pick("productUnitCode", "BOX"),
        amount: pick("amount", 1),
        sku: pick("sku", ""),

        // Organisation / instructions (dummy defaults)
        organisationId: pick("organisationId", ""),
        organisationApiKey: pick("organisationApiKey", editorSettings.editorApiKey || ""),
        editorInstructions: pick("editorInstructions", [
            "usedesigns",
            "usebackgrounds",
            "uselayers",
            "useimageupload",
            "useelements",
            "usestockphotos",
            "useshowsafezone",
            "usetext",
            "usesettings",
            "useshowcropzone",
        ]),
    };

    // Currency information (dummy defaults, can be overridden)
    const currency = overrideData.currency || {};
    const currencySymbol = currency.symbol || "&euro;";
    const currencyLocale = currency.locale || "en_GB";
    const currencyDecimal = currency.decimal || ".";

    // Build request body matching WordPress plugin structure
    // We aim to mirror New_PIE_Project_Request::generate_request_body()
    const requestBody = {
        // Core identifiers
        customerid: editorSettings.editorCustomerId || "",
        templateid: testData.templateId,
        designid: testData.designId,
        backgroundid: testData.backgroundId,
        colorcode: testData.colorCode,
        formatid: testData.formatId,

        // Project + user
        projectname: testData.projectName,
        returnurl: testData.returnUrl,
        userid: testData.userId,
        useremail: testData.userEmail,
        lang: testData.language,

        // Organisation + instructions
        organisationid: testData.organisationId,
        a: testData.organisationApiKey,
        editorinstructions: testData.editorInstructions,

        // Editor settings
        sheetsmax: testData.sheetsMax,

        // Pricing (dummy or overridden)
        pricing: {
            base: { price: testData.basePrice },
            page: { price: testData.pagePrice },
        },

        // Tax status (dummy or overridden)
        tax_status: {
            tax_display_frontend: testData.taxDisplayFrontend,
            tax_display_backend: testData.taxDisplayBackend,
            tax_rate: testData.taxRate,
        },

        // Page / product details
        includedpages: testData.includedPages,
        personalisations: testData.personalisations,
        f2d_article_code: testData.f2dArticleCode,
        productUnitCode: testData.productUnitCode,
        amount: testData.amount,
        materialid: testData.materialId,
        SKU: testData.sku,

        // Currency block
        currency: {
            symbol: currencySymbol,
            locale: currencyLocale,
            decimal: currencyDecimal,
        },

        // API version
        v: 2,
    };

    return requestBody;
}

/**
 * Build editor API URL
 */
function buildEditorApiUrl(editorDomain) {
    const endpoint = "/editor/api/createprojectAPI.php";
    const baseUrl = editorDomain.endsWith("/")
        ? editorDomain.slice(0, -1)
        : editorDomain;
    const fullUrl = `${baseUrl}${endpoint}`;


    return fullUrl;
}

/**
 * Build authentication headers
 */
function buildAuthHeaders(apiKey) {
    const headers = {
        PIEAPIKEY: apiKey || "",
    };
    return headers;
}

/**
 * Flatten nested objects for query string
 * WordPress sends nested objects as query parameters with bracket notation
 * Skips empty strings, null, undefined values
 */
function flattenObject(obj, prefix = '', queryParams) {
    for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            const value = obj[key];
            const newKey = prefix ? `${prefix}[${key}]` : key;

            // Skip null, undefined, or empty string values
            if (value === null || value === undefined || value === '') {
                continue;
            } else if (Array.isArray(value)) {
                // Handle arrays - WordPress sends arrays as indexed query params
                // Only add non-empty arrays
                if (value.length > 0) {
                    value.forEach((item, index) => {
                        // Skip empty array items
                        if (item === null || item === undefined || item === '') {
                            return;
                        }
                        if (typeof item === 'object' && item !== null) {
                            // Nested objects in arrays
                            Object.keys(item).forEach(subKey => {
                                const subValue = item[subKey];
                                // Skip empty nested values
                                if (subValue !== null && subValue !== undefined && subValue !== '') {
                                    queryParams.append(`${newKey}[${index}][${subKey}]`, subValue);
                                }
                            });
                        } else {
                            queryParams.append(`${newKey}[${index}]`, item);
                        }
                    });
                }
            } else if (typeof value === 'object' && value !== null) {
                // Recursively flatten nested objects
                flattenObject(value, newKey, queryParams);
            } else {
                // Only add non-empty string values
                const stringValue = String(value);
                if (stringValue.trim() !== '') {
                    queryParams.append(newKey, stringValue);
                }
            }
        }
    }
}

async function createProjectResponse({ shop, overrides = {} }) {
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
        const settings = await prisma.editorSettings.findUnique({
            where: { shop },
            select: {
                editorApiKey: true,
                editorDomain: true,
                editorCustomerId: true,
            },
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

        const requestBody = generateRequestBody(settings, overrides);


        const apiUrl = buildEditorApiUrl(settings.editorDomain);
        const authHeaders = buildAuthHeaders(settings.editorApiKey);


        const queryParams = new URLSearchParams();
        flattenObject(requestBody, '', queryParams);

        // Add API key to query string (as 'a' parameter, matching WordPress plugin)
        if (settings.editorApiKey) {
            queryParams.append('a', settings.editorApiKey);
        }

        const queryString = queryParams.toString();
        const fullUrlWithParams = `${apiUrl}?${queryString}`;



        const startTime = Date.now();
        let response;
        let responseBody = "";
        let responseStatus;
        let projectId = null;
        let decodedResponse = null;

        try {
            response = await fetch(fullUrlWithParams, {
                method: 'GET',
                headers: {
                    ...authHeaders,
                    'Content-Type': 'application/json',
                },
            });

            responseStatus = response.status;
            responseBody = await response.text();

            const trimmedBody = responseBody?.trim() ?? "";
            const isJson = !!trimmedBody && (response.headers.get("content-type") || "").includes("application/json");

            if (trimmedBody.length === 0) {
                console.warn(`${LOG_PREFIX} [STEP 4] Response body is empty`);
            } else if (isJson) {
                try {
                    decodedResponse = JSON.parse(trimmedBody);

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

                } else if (decodedResponse.projectid) {
                    projectId = decodedResponse.projectid;

                }
            }

            if (!projectId) {
                console.error(`${LOG_PREFIX} [STEP 4] No project ID found in response`);
                console.error(`${LOG_PREFIX} [STEP 4] Response body snapshot:`, trimmedBody.substring(0, 300));
                throw new Error('No project ID received from editor API');
            }



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
    return new Response(null, {
        status: 200,
        headers: corsHeaders,
    });
};

// Export headers function to ensure CORS headers are always included
export const headers = () => {
    return corsHeaders;
};

