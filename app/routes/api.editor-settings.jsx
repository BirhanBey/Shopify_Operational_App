import prisma from "../db.server";

// CORS headers for theme extension access
const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
};

export const loader = async ({ request }) => {
    // Get shop from query parameter
    const url = new URL(request.url);
    const shop = url.searchParams.get("shop");

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

    try {
        // Load editor settings for this shop
        const settings = await prisma.editorSettings.findUnique({
            where: { shop },
            select: {
                editorApiKey: true,
                editorDomain: true,
                editorCustomerId: true,
            },
        });

        return new Response(
            JSON.stringify({
                settings: settings || {
                    editorApiKey: null,
                    editorDomain: null,
                    editorCustomerId: null,
                },
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
        console.error("Error loading editor settings:", error);
        return new Response(
            JSON.stringify({ error: "Failed to load settings" }),
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

