import { Buffer } from "node:buffer";
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
            JSON.stringify({ error: "Project ID parameter is required" }),
            {
                status: 400,
                headers: { "Content-Type": "application/json", ...corsHeaders },
            },
        );
    }

    if (!shop) {
        return new Response(
            JSON.stringify({ error: "Shop parameter is required" }),
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
                JSON.stringify({ error: "Editor settings not configured" }),
                {
                    status: 400,
                    headers: { "Content-Type": "application/json", ...corsHeaders },
                },
            );
        }

        const editorDomain = settings.editorDomain.replace(/\/$/, "");
        const thumbnailApiUrl = `${editorDomain}/editor/api/getprojectthumbnailAPI.php?projectid=${encodeURIComponent(projectId)}&customerapikey=${encodeURIComponent(settings.editorApiKey)}`;

        console.log("[API] Fetching thumbnail from:", thumbnailApiUrl);

        const apiResponse = await fetch(thumbnailApiUrl);

        if (!apiResponse.ok) {
            console.error(
                "[API] Thumbnail API error:",
                apiResponse.status,
                apiResponse.statusText,
            );
            return new Response(
                JSON.stringify({
                    error: `Thumbnail API error: ${apiResponse.status}`,
                }),
                {
                    status: apiResponse.status,
                    headers: { "Content-Type": "application/json", ...corsHeaders },
                },
            );
        }

        const arrayBuffer = await apiResponse.arrayBuffer();
        const base64 = Buffer.from(arrayBuffer).toString("base64");
        const contentType =
            apiResponse.headers.get("content-type") || "image/jpeg";

        return new Response(
            JSON.stringify({
                success: true,
                thumbnail: `data:${contentType};base64,${base64}`,
            }),
            {
                status: 200,
                headers: { "Content-Type": "application/json", ...corsHeaders },
            },
        );
    } catch (error) {
        console.error("Error fetching project thumbnail:", error);
        return new Response(
            JSON.stringify({
                error: "Failed to fetch thumbnail",
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

