import prisma from "../db.server";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
};

export const loader = async ({ request }) => {
    const url = new URL(request.url);
    const projectId = url.searchParams.get("projectid");
    const shop = url.searchParams.get("shop");

    if (!projectId) {
        return new Response(
            JSON.stringify({ success: false, error: "Project ID parameter is required" }),
            {
                status: 400,
                headers: { "Content-Type": "application/json", ...corsHeaders },
            },
        );
    }

    if (!shop) {
        return new Response(
            JSON.stringify({ success: false, error: "Shop parameter is required" }),
            {
                status: 400,
                headers: { "Content-Type": "application/json", ...corsHeaders },
            },
        );
    }

    try {
        const settings = await prisma.editorSettings.findUnique({
            where: { shop },
            select: { editorApiKey: true, editorDomain: true },
        });

        if (!settings || !settings.editorApiKey || !settings.editorDomain) {
            return new Response(
                JSON.stringify({
                    success: false,
                    error: "Editor settings not configured",
                }),
                {
                    status: 400,
                    headers: { "Content-Type": "application/json", ...corsHeaders },
                },
            );
        }

        const editorDomain = settings.editorDomain.replace(/\/$/, "");
        const detailsApiUrl = `${editorDomain}/editor/api/projectfileAPI.php?action=get&projectid=${encodeURIComponent(
            projectId,
        )}&a=${encodeURIComponent(settings.editorApiKey)}`;

        const apiResponse = await fetch(detailsApiUrl);

        if (!apiResponse.ok) {
            console.error(
                "[API] Project details API error:",
                apiResponse.status,
                apiResponse.statusText,
            );
            return new Response(
                JSON.stringify({
                    success: false,
                    error: `Project details API error: ${apiResponse.status}`,
                }),
                {
                    status: apiResponse.status,
                    headers: { "Content-Type": "application/json", ...corsHeaders },
                },
            );
        }

        let projectJson = null;
        try {
            projectJson = await apiResponse.json();
        } catch (error) {
            console.error("[API] Failed to parse project details JSON", error);
            return new Response(
                JSON.stringify({
                    success: false,
                    error: "Failed to parse project details JSON",
                }),
                {
                    status: 500,
                    headers: { "Content-Type": "application/json", ...corsHeaders },
                },
            );
        }

        return new Response(
            JSON.stringify({
                success: true,
                project: projectJson,
            }),
            {
                status: 200,
                headers: { "Content-Type": "application/json", ...corsHeaders },
            },
        );
    } catch (error) {
        console.error("Error fetching project details:", error);
        return new Response(
            JSON.stringify({
                success: false,
                error: "Failed to fetch project details",
                details: error.message,
            }),
            {
                status: 500,
                headers: { "Content-Type": "application/json", ...corsHeaders },
            },
        );
    }
};

export const options = async () =>
    new Response(null, { status: 200, headers: corsHeaders });

export const headers = () => corsHeaders;


