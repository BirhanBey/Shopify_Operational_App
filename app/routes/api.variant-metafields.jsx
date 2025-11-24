import { authenticate, sessionStorage } from "../shopify.server";

// CORS headers for theme extension access
const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
};

export const loader = async ({ request }) => {
    // Get shop and product handle from query parameters
    const url = new URL(request.url);
    const shop = url.searchParams.get("shop");
    const productHandle = url.searchParams.get("handle");

    if (!shop) {
        return new Response(
            JSON.stringify({ error: "Shop parameter is required" }),
            {
                status: 400,
                headers: {
                    "Content-Type": "application/json",
                    ...corsHeaders,
                },
            }
        );
    }

    if (!productHandle) {
        return new Response(
            JSON.stringify({ error: "Product handle parameter is required" }),
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
        // Try to get session from sessionStorage using shop parameter
        let admin;
        let session;

        try {
            // First try to authenticate normally (for admin requests)
            const authResult = await authenticate.admin(request);
            admin = authResult.admin;
            session = authResult.session;
            console.log("[API] Authentication successful for variant metafields request");
        } catch (authError) {
            // If authentication fails, try to get session from sessionStorage
            console.log("[API] Admin authentication failed, trying to get session from storage");

            try {
                // Try to find session for this shop using sessionStorage
                const sessions = await sessionStorage.findSessionsByShop(shop);

                if (sessions && sessions.length > 0) {
                    session = sessions[0];
                    console.log("[API] Found session for shop:", shop);

                    // Create admin API client with this session
                    const { default: shopify } = await import("../shopify.server");
                    admin = new shopify.clients.Graphql({ session });
                } else {
                    throw new Error("No session found for shop");
                }
            } catch (sessionError) {
                console.warn("[API] Could not get session for shop:", shop, sessionError.message);
                // Return empty data - frontend will handle this gracefully
                return new Response(
                    JSON.stringify({
                        variantMetafields: {},
                        warning: "Session not found - metafields not available"
                    }),
                    {
                        status: 200,
                        headers: {
                            "Content-Type": "application/json",
                            ...corsHeaders,
                        },
                    }
                );
            }
        }

        // Query product with variants and metafields
        const PRODUCT_QUERY = `
            query GetProductVariants($handle: String!) {
                product(handle: $handle) {
                    id
                    variants(first: 250) {
                        edges {
                            node {
                                id
                                metafield(namespace: "custom", key: "use_project_reference") {
                                    id
                                    value
                                }
                            }
                        }
                    }
                }
            }
        `;

        console.log("[API] Querying product with handle:", productHandle);
        const response = await admin.graphql(PRODUCT_QUERY, {
            variables: { handle: productHandle },
        });

        const data = await response.json();
        console.log("[API] GraphQL response:", JSON.stringify(data, null, 2));

        if (data.errors) {
            console.error("[API] GraphQL errors:", data.errors);
            return new Response(
                JSON.stringify({ error: "Failed to fetch product data", details: data.errors }),
                {
                    status: 500,
                    headers: {
                        "Content-Type": "application/json",
                        ...corsHeaders,
                    },
                }
            );
        }

        // Build variant metafields map
        const variants = data.data?.product?.variants?.edges || [];
        console.log("[API] Found variants:", variants.length);
        const variantMetafields = {};

        variants.forEach((edge) => {
            const variant = edge.node;
            const variantId = variant.id;
            const metafield = variant.metafield;

            console.log("[API] Processing variant:", {
                variantId: variantId,
                metafield: metafield,
                metafieldValue: metafield?.value,
            });

            // Extract numeric ID from GID format (gid://shopify/ProductVariant/123456 -> 123456)
            const numericId = variantId.includes('/')
                ? variantId.split('/').pop()
                : variantId;

            variantMetafields[variantId] = {
                useProjectReference:
                    metafield?.value === "true" ||
                    metafield?.value === true ||
                    metafield?.value === "True",
            };

            // Also add with numeric ID for compatibility
            if (numericId !== variantId) {
                variantMetafields[numericId] = variantMetafields[variantId];
            }
        });

        console.log("[API] Final variantMetafields:", variantMetafields);

        return new Response(
            JSON.stringify({
                variantMetafields,
            }),
            {
                status: 200,
                headers: {
                    "Content-Type": "application/json",
                    ...corsHeaders,
                },
            }
        );
    } catch (error) {
        console.error("Error loading variant metafields:", error);
        return new Response(
            JSON.stringify({ error: "Failed to load variant metafields" }),
            {
                status: 500,
                headers: {
                    "Content-Type": "application/json",
                    ...corsHeaders,
                },
            }
        );
    }
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

