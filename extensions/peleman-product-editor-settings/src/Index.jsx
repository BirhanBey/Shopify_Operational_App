import {
    reactExtension,
    useApi,
    BlockStack,
    Text,
    Select,
    TextField,
    Divider,
} from "@shopify/ui-extensions-react/admin";
import { useState, useEffect, useCallback } from "react";

const PRODUCT_VARIANTS_QUERY = `
    query ProductVariants($id: ID!) {
        product(id: $id) {
            id
            variants(first: 250) {
                edges {
                    node {
                        id
                        title
                        displayName
                        metafield(namespace: "custom", key: "template_id") {
                            id
                            namespace
                            key
                            type
                            value
                        }
                    }
                }
            }
        }
    }
`;

const UPDATE_METAFIELD_MUTATION = `
    mutation UpdateVariantMetafield($metafields: [MetafieldsSetInput!]!) {
        metafieldsSet(metafields: $metafields) {
            metafields {
                id
                namespace
                key
                type
                value
            }
            userErrors {
                field
                message
            }
        }
    }
`;

export default reactExtension(
    "admin.product-details.block.render",
    () => <PelemanProductEditorSettings />
);

function PelemanProductEditorSettings() {
    const { query, data } = useApi();
    const productId = data?.selected?.[0]?.id;

    const [isLoading, setIsLoading] = useState(true);
    const [variants, setVariants] = useState([]);
    const [selectedVariantId, setSelectedVariantId] = useState(null);
    const [templateId, setTemplateId] = useState("");
    const [isSaving, setIsSaving] = useState(false);

    const loadProductVariants = useCallback(async () => {
        if (!productId) {
            console.warn("[PPES] No product id available");
            setIsLoading(false);
            return;
        }

        console.log("[PPES] Loading variants for product:", productId);
        setIsLoading(true);
        try {
            const response = await query(PRODUCT_VARIANTS_QUERY, {
                variables: { id: productId },
            });

            if (response.errors?.length) {
                console.error("[PPES] Product query errors:", response.errors);
                setVariants([]);
                return;
            }

            const variantEdges = response.data?.product?.variants?.edges || [];
            const variantsData = variantEdges.map((edge) => {
                const variant = edge.node;
                const metafield = variant.metafield;
                return {
                    id: variant.id,
                    title: variant.title,
                    displayName: variant.displayName,
                    templateId: metafield?.value || "",
                };
            });

            console.log("[PPES] Loaded variants:", variantsData);
            setVariants(variantsData);

            // Auto-select first variant if available
            if (variantsData.length > 0 && !selectedVariantId) {
                setSelectedVariantId(variantsData[0].id);
                setTemplateId(variantsData[0].templateId || "");
                console.log("[PPES] Auto-selected first variant:", variantsData[0].id);
            }
        } catch (error) {
            console.error("[PPES] Error loading product variants:", error);
            console.error("[PPES] Error details:", {
                name: error?.name,
                message: error?.message,
                stack: error?.stack,
                type: typeof error,
            });
            setVariants([]);
        } finally {
            setIsLoading(false);
        }
    }, [query, productId, selectedVariantId]);

    useEffect(() => {
        loadProductVariants();
    }, [loadProductVariants]);

    // Update templateId when variant selection changes
    useEffect(() => {
        if (selectedVariantId && variants.length > 0) {
            const selectedVariant = variants.find((v) => v.id === selectedVariantId);
            if (selectedVariant) {
                setTemplateId(selectedVariant.templateId || "");
                console.log("[PPES] Variant changed, loaded templateId:", selectedVariant.templateId);
            }
        }
    }, [selectedVariantId, variants]);

    const handleVariantSelect = (value) => {
        console.log("[PPES] Variant selected:", value);
        setSelectedVariantId(value);
    };

    const handleTemplateIdChange = (value) => {
        console.log("[PPES] Template ID changed:", value);
        setTemplateId(value);
    };

    const handleSaveTemplateId = async () => {
        if (!selectedVariantId || !templateId.trim()) {
            console.warn("[PPES] Cannot save: missing variant or template ID");
            return;
        }

        console.log("[PPES] Saving template ID:", { variantId: selectedVariantId, templateId });
        setIsSaving(true);

        try {
            const metafieldInput = {
                ownerId: selectedVariantId,
                namespace: "custom",
                key: "template_id",
                type: "single_line_text_field",
                value: templateId.trim(),
            };

            const response = await query(UPDATE_METAFIELD_MUTATION, {
                variables: {
                    metafields: [metafieldInput],
                },
            });

            if (response.errors?.length) {
                console.error("[PPES] GraphQL errors:", response.errors);
                return;
            }

            const userErrors = response.data?.metafieldsSet?.userErrors || [];
            if (userErrors.length > 0) {
                console.error("[PPES] Metafield update errors:", userErrors);
                return;
            }

            console.log("[PPES] Template ID saved successfully");

            // Update local state
            setVariants((prevVariants) =>
                prevVariants.map((variant) => {
                    if (variant.id === selectedVariantId) {
                        return {
                            ...variant,
                            templateId: templateId.trim(),
                        };
                    }
                    return variant;
                })
            );
        } catch (error) {
            console.error("[PPES] Error saving template ID:", error);
            console.error("[PPES] Save error details:", {
                name: error?.name,
                message: error?.message,
                stack: error?.stack,
                variantId: selectedVariantId,
                templateId: templateId,
            });
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <BlockStack spacing="base">
                <Text size="base" emphasis="bold">
                    Peleman Product/Editor Settings
                </Text>
                <Text size="small">Loading variants...</Text>
            </BlockStack>
        );
    }

    if (!productId) {
        return (
            <BlockStack spacing="base">
                <Text size="base" emphasis="bold">
                    Peleman Product/Editor Settings
                </Text>
                <Text size="small">
                    No product selected. Please open a product to configure settings.
                </Text>
            </BlockStack>
        );
    }

    if (variants.length === 0) {
        return (
            <BlockStack spacing="base">
                <Text size="base" emphasis="bold">
                    Peleman Product/Editor Settings
                </Text>
                <Text size="small">No variants found for this product.</Text>
            </BlockStack>
        );
    }

    const variantOptions = variants.map((variant) => ({
        value: variant.id,
        label: variant.displayName || variant.title,
    }));

    return (
        <BlockStack spacing="base">
            <Divider />

            {/* Added top margin of 30px to the select element */}
            <div style={{ marginTop: "30px" }}>
                <Select
                    label="Select Variant"
                    value={selectedVariantId || ""}
                    options={variantOptions}
                    onChange={handleVariantSelect}
                />
            </div>

            {selectedVariantId && (
                <BlockStack spacing="base">
                    <Divider />
                    <Text
                        size="extraLarge" // Increased font size by 2 units from 'base'
                        emphasis="bold"
                        alignment="center" // Centers the text horizontally
                    >
                        Editor Settings
                    </Text>
                    <TextField
                        label="Template ID"
                        value={templateId}
                        onChange={handleTemplateIdChange}
                        onBlur={handleSaveTemplateId}
                        disabled={isSaving}
                        helpText="Enter the template ID for this variant (e.g., tpl686566)"
                    />
                </BlockStack>
            )}
        </BlockStack>
    );
}


