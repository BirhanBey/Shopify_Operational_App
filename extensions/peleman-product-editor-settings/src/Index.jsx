import {
    reactExtension,
    useApi,
    BlockStack,
    InlineStack,
    Text,
    Select,
    TextField,
    Divider,
    Button,
    Checkbox,
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
                        templateIdMetafield: metafield(namespace: "custom", key: "template_id") {
                            id
                            namespace
                            key
                            type
                            value
                        }
                        designIdMetafield: metafield(namespace: "custom", key: "design_id") {
                            id
                            namespace
                            key
                            type
                            value
                        }
                        materialIdMetafield: metafield(namespace: "custom", key: "material_id") {
                            id
                            namespace
                            key
                            type
                            value
                        }
                        personalisationsMetafield: metafield(namespace: "custom", key: "personalisations") {
                            id
                            namespace
                            key
                            type
                            value
                        }
                        f2dArticleCodeMetafield: metafield(namespace: "custom", key: "f2d_article_code") {
                            id
                            namespace
                            key
                            type
                            value
                        }
                        useImageUploadsMetafield: metafield(namespace: "custom", key: "use_image_uploads") {
                            id
                            namespace
                            key
                            type
                            value
                        }
                        useProjectThumbnailInCartMetafield: metafield(namespace: "custom", key: "use_project_thumbnail_in_cart") {
                            id
                            namespace
                            key
                            type
                            value
                        }
                        useProjectReferenceMetafield: metafield(namespace: "custom", key: "use_project_reference") {
                            id
                            namespace
                            key
                            type
                            value
                        }
                        sheetsMaxMetafield: metafield(namespace: "custom", key: "sheets_max") {
                            id
                            namespace
                            key
                            type
                            value
                        }
                        includedPagesMetafield: metafield(namespace: "custom", key: "included_pages") {
                            id
                            namespace
                            key
                            type
                            value
                        }
                        productUnitCodeMetafield: metafield(namespace: "custom", key: "product_unit_code") {
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
    const [designId, setDesignId] = useState("");
    const [materialId, setMaterialId] = useState("");
    const [personalisations, setPersonalisations] = useState("");
    const [f2dArticleCode, setF2dArticleCode] = useState("");
    const [useImageUploads, setUseImageUploads] = useState(false);
    const [useProjectThumbnailInCart, setUseProjectThumbnailInCart] = useState(false);
    const [useProjectReference, setUseProjectReference] = useState(false);
    const [sheetsMax, setSheetsMax] = useState("");
    const [includedPages, setIncludedPages] = useState("");
    const [productUnitCode, setProductUnitCode] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const [isEditorSettingsOpen, setIsEditorSettingsOpen] = useState(false);
    const [isAdditionalSettingsOpen, setIsAdditionalSettingsOpen] = useState(false);

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
                return {
                    id: variant.id,
                    title: variant.title,
                    displayName: variant.displayName,
                    templateId: variant.templateIdMetafield?.value || "",
                    designId: variant.designIdMetafield?.value || "",
                    materialId: variant.materialIdMetafield?.value || "",
                    personalisations: variant.personalisationsMetafield?.value || "",
                    f2dArticleCode: variant.f2dArticleCodeMetafield?.value || "",
                    useImageUploads:
                        variant.useImageUploadsMetafield?.value === "true" ||
                        variant.useImageUploadsMetafield?.value === true ||
                        variant.useImageUploadsMetafield?.value === "True",
                    useProjectThumbnailInCart:
                        variant.useProjectThumbnailInCartMetafield?.value === "true" ||
                        variant.useProjectThumbnailInCartMetafield?.value === true ||
                        variant.useProjectThumbnailInCartMetafield?.value === "True",
                    useProjectReference:
                        variant.useProjectReferenceMetafield?.value === "true" ||
                        variant.useProjectReferenceMetafield?.value === true ||
                        variant.useProjectReferenceMetafield?.value === "True",
                    sheetsMax: variant.sheetsMaxMetafield?.value || "",
                    includedPages: variant.includedPagesMetafield?.value || "",
                    productUnitCode: variant.productUnitCodeMetafield?.value || "",
                };
            });

            console.log("[PPES] Loaded variants:", variantsData);
            setVariants(variantsData);

            // Auto-select first variant if available
            if (variantsData.length > 0 && !selectedVariantId) {
                setSelectedVariantId(variantsData[0].id);
                setTemplateId(variantsData[0].templateId || "");
                setDesignId(variantsData[0].designId || "");
                setMaterialId(variantsData[0].materialId || "");
                setPersonalisations(variantsData[0].personalisations || "");
                setF2dArticleCode(variantsData[0].f2dArticleCode || "");
                setUseImageUploads(variantsData[0].useImageUploads || false);
                setUseProjectThumbnailInCart(variantsData[0].useProjectThumbnailInCart || false);
                setUseProjectReference(variantsData[0].useProjectReference || false);
                setSheetsMax(variantsData[0].sheetsMax || "");
                setIncludedPages(variantsData[0].includedPages || "");
                setProductUnitCode(variantsData[0].productUnitCode || "");
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

    // Update all fields when variant selection changes
    useEffect(() => {
        if (selectedVariantId && variants.length > 0) {
            const selectedVariant = variants.find((v) => v.id === selectedVariantId);
            if (selectedVariant) {
                setTemplateId(selectedVariant.templateId || "");
                setDesignId(selectedVariant.designId || "");
                setMaterialId(selectedVariant.materialId || "");
                setPersonalisations(selectedVariant.personalisations || "");
                setF2dArticleCode(selectedVariant.f2dArticleCode || "");
                setUseImageUploads(selectedVariant.useImageUploads || false);
                setUseProjectThumbnailInCart(selectedVariant.useProjectThumbnailInCart || false);
                setUseProjectReference(selectedVariant.useProjectReference || false);
                setSheetsMax(selectedVariant.sheetsMax || "");
                setIncludedPages(selectedVariant.includedPages || "");
                setProductUnitCode(selectedVariant.productUnitCode || "");
                console.log("[PPES] Variant changed, loaded settings:", {
                    templateId: selectedVariant.templateId,
                    designId: selectedVariant.designId,
                    materialId: selectedVariant.materialId,
                    personalisations: selectedVariant.personalisations,
                    f2dArticleCode: selectedVariant.f2dArticleCode,
                    useImageUploads: selectedVariant.useImageUploads,
                    useProjectThumbnailInCart: selectedVariant.useProjectThumbnailInCart,
                    useProjectReference: selectedVariant.useProjectReference,
                    sheetsMax: selectedVariant.sheetsMax,
                    includedPages: selectedVariant.includedPages,
                    productUnitCode: selectedVariant.productUnitCode,
                });
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

    const handleDesignIdChange = (value) => {
        console.log("[PPES] Design ID changed:", value);
        setDesignId(value);
    };

    const handleMaterialIdChange = (value) => {
        console.log("[PPES] Material ID changed:", value);
        setMaterialId(value);
    };

    const handlePersonalisationsChange = (value) => {
        console.log("[PPES] Personalisations changed:", value);
        setPersonalisations(value);
    };

    const handleF2dArticleCodeChange = (value) => {
        console.log("[PPES] F2D Article Code changed:", value);
        setF2dArticleCode(value);
    };

    const handleUseImageUploadsChange = (value) => {
        console.log("[PPES] Use Image Uploads changed:", value);
        setUseImageUploads(value);
    };

    const handleUseProjectThumbnailInCartChange = (value) => {
        console.log("[PPES] Use Project Thumbnail in Cart changed:", value);
        setUseProjectThumbnailInCart(value);
    };

    const handleUseProjectReferenceChange = (value) => {
        console.log("[PPES] Use Project Reference changed:", value);
        setUseProjectReference(value);
    };

    const handleSheetsMaxChange = (value) => {
        console.log("[PPES] Sheets Max changed:", value);
        setSheetsMax(value);
    };

    const handleIncludedPagesChange = (value) => {
        console.log("[PPES] Included Pages changed:", value);
        setIncludedPages(value);
    };

    const handleProductUnitCodeChange = (value) => {
        console.log("[PPES] Product Unit Code changed:", value);
        setProductUnitCode(value);
    };

    const handleSaveAllSettings = async () => {
        if (!selectedVariantId) {
            console.warn("[PPES] Cannot save: missing variant");
            return;
        }

        console.log("[PPES] Saving all editor settings:", {
            variantId: selectedVariantId,
            templateId,
            designId,
            materialId,
            personalisations,
            f2dArticleCode,
            useImageUploads,
            useProjectThumbnailInCart,
            sheetsMax,
            includedPages,
            productUnitCode,
        });
        setIsSaving(true);

        try {
            // Build metafields array - only include non-empty values
            const metafields = [];

            if (templateId.trim()) {
                metafields.push({
                    ownerId: selectedVariantId,
                    namespace: "custom",
                    key: "template_id",
                    type: "single_line_text_field",
                    value: templateId.trim(),
                });
            }

            if (designId.trim()) {
                metafields.push({
                    ownerId: selectedVariantId,
                    namespace: "custom",
                    key: "design_id",
                    type: "single_line_text_field",
                    value: designId.trim(),
                });
            }

            if (materialId.trim()) {
                metafields.push({
                    ownerId: selectedVariantId,
                    namespace: "custom",
                    key: "material_id",
                    type: "single_line_text_field",
                    value: materialId.trim(),
                });
            }

            if (personalisations.trim()) {
                metafields.push({
                    ownerId: selectedVariantId,
                    namespace: "custom",
                    key: "personalisations",
                    type: "single_line_text_field",
                    value: personalisations.trim(),
                });
            }

            if (f2dArticleCode.trim()) {
                metafields.push({
                    ownerId: selectedVariantId,
                    namespace: "custom",
                    key: "f2d_article_code",
                    type: "single_line_text_field",
                    value: f2dArticleCode.trim(),
                });
            }

            // Checkbox metafields (always save, even if false)
            metafields.push({
                ownerId: selectedVariantId,
                namespace: "custom",
                key: "use_image_uploads",
                type: "boolean",
                value: useImageUploads ? "true" : "false",
            });

            metafields.push({
                ownerId: selectedVariantId,
                namespace: "custom",
                key: "use_project_thumbnail_in_cart",
                type: "boolean",
                value: useProjectThumbnailInCart ? "true" : "false",
            });

            metafields.push({
                ownerId: selectedVariantId,
                namespace: "custom",
                key: "use_project_reference",
                type: "boolean",
                value: useProjectReference ? "true" : "false",
            });

            if (sheetsMax.trim()) {
                metafields.push({
                    ownerId: selectedVariantId,
                    namespace: "custom",
                    key: "sheets_max",
                    type: "number_integer",
                    value: sheetsMax.trim(),
                });
            }

            if (includedPages.trim()) {
                metafields.push({
                    ownerId: selectedVariantId,
                    namespace: "custom",
                    key: "included_pages",
                    type: "number_integer",
                    value: includedPages.trim(),
                });
            }

            if (productUnitCode.trim()) {
                metafields.push({
                    ownerId: selectedVariantId,
                    namespace: "custom",
                    key: "product_unit_code",
                    type: "single_line_text_field",
                    value: productUnitCode.trim(),
                });
            }

            if (metafields.length === 0) {
                console.warn("[PPES] No metafields to save - all fields are empty");
                return;
            }

            console.log("[PPES] Saving metafields:", metafields.map(m => ({ key: m.key, value: m.value })));

            const response = await query(UPDATE_METAFIELD_MUTATION, {
                variables: {
                    metafields: metafields,
                },
            });

            if (response.errors?.length) {
                console.error("[PPES] GraphQL errors:", response.errors);
                return;
            }

            const userErrors = response.data?.metafieldsSet?.userErrors || [];
            if (userErrors.length > 0) {
                console.error("[PPES] Metafield update errors:", userErrors);
                userErrors.forEach((error) => {
                    console.error(`[PPES] Error for ${error.field}:`, error.message);
                });
                return;
            }

            const savedMetafields = response.data?.metafieldsSet?.metafields || [];
            console.log("[PPES] Saved metafields response:", savedMetafields);

            // Check which metafields were actually saved
            const savedKeys = savedMetafields.map((m) => m.key);
            console.log("[PPES] Successfully saved metafield keys:", savedKeys);

            // Check if material_id was saved
            if (materialId.trim() && !savedKeys.includes("material_id")) {
                console.warn("[PPES] WARNING: material_id was not saved! Value was:", materialId.trim());
            }

            console.log("[PPES] All editor settings saved successfully");

            // Update local state
            setVariants((prevVariants) =>
                prevVariants.map((variant) => {
                    if (variant.id === selectedVariantId) {
                        return {
                            ...variant,
                            templateId: templateId.trim(),
                            designId: designId.trim(),
                            materialId: materialId.trim(),
                            personalisations: personalisations.trim(),
                            f2dArticleCode: f2dArticleCode.trim(),
                            useImageUploads,
                            useProjectThumbnailInCart,
                            useProjectReference,
                            sheetsMax: sheetsMax.trim(),
                            includedPages: includedPages.trim(),
                            productUnitCode: productUnitCode.trim(),
                        };
                    }
                    return variant;
                })
            );
        } catch (error) {
            console.error("[PPES] Error saving editor settings:", error);
            console.error("[PPES] Save error details:", {
                name: error?.name,
                message: error?.message,
                stack: error?.stack,
                variantId: selectedVariantId,
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
                    <InlineStack spacing="tight">
                        <Button
                            kind={isEditorSettingsOpen ? "primary" : "secondary"}
                            onPress={() => {
                                setIsEditorSettingsOpen(!isEditorSettingsOpen);
                                if (!isEditorSettingsOpen) {
                                    setIsAdditionalSettingsOpen(false);
                                }
                            }}
                        >
                            {isEditorSettingsOpen ? "▼" : "▶"} Editor Settings
                        </Button>
                        <Button
                            kind={isAdditionalSettingsOpen ? "primary" : "secondary"}
                            onPress={() => {
                                setIsAdditionalSettingsOpen(!isAdditionalSettingsOpen);
                                if (!isAdditionalSettingsOpen) {
                                    setIsEditorSettingsOpen(false);
                                }
                            }}
                        >
                            {isAdditionalSettingsOpen ? "▼" : "▶"} Additional Settings
                        </Button>
                    </InlineStack>
                    {isEditorSettingsOpen && (
                        <BlockStack spacing="base">
                            <Text
                                size="extraLarge"
                                emphasis="bold"
                                alignment="center"
                            >
                                Editor Settings
                            </Text>
                            <BlockStack spacing="tight">
                                <TextField
                                    label="Template ID"
                                    value={templateId}
                                    onChange={handleTemplateIdChange}
                                    disabled={isSaving}
                                    helpText="Enter the template ID for this variant (e.g., tpl686566)"
                                />
                                <TextField
                                    label="Design ID"
                                    value={designId}
                                    onChange={handleDesignIdChange}
                                    disabled={isSaving}
                                    helpText="Enter the design ID for this variant"
                                />
                                <TextField
                                    label="Material ID"
                                    value={materialId}
                                    onChange={handleMaterialIdChange}
                                    disabled={isSaving}
                                    helpText="Enter the material ID for this variant"
                                />
                                <TextField
                                    label="Personalisations"
                                    value={personalisations}
                                    onChange={handlePersonalisationsChange}
                                    disabled={isSaving}
                                    helpText="Enter personalisations value (e.g., f2d)"
                                />
                                <Checkbox
                                    checked={useImageUploads}
                                    onChange={handleUseImageUploadsChange}
                                    disabled={isSaving}
                                >
                                    Use Image Uploads
                                </Checkbox>
                                <Checkbox
                                    checked={useProjectThumbnailInCart}
                                    onChange={handleUseProjectThumbnailInCartChange}
                                    disabled={isSaving}
                                >
                                    Use Project Thumbnail in Cart
                                </Checkbox>
                                <Checkbox
                                    checked={useProjectReference}
                                    onChange={handleUseProjectReferenceChange}
                                    disabled={isSaving}
                                >
                                    Use Project Reference
                                </Checkbox>
                            </BlockStack>
                        </BlockStack>
                    )}
                    {isAdditionalSettingsOpen && (
                        <BlockStack spacing="base">
                            <Text
                                size="extraLarge"
                                emphasis="bold"
                                alignment="center"
                            >
                                Additional Settings
                            </Text>
                            <BlockStack spacing="tight">
                                <TextField
                                    label="F2D Article Code"
                                    value={f2dArticleCode}
                                    onChange={handleF2dArticleCodeChange}
                                    disabled={isSaving}
                                    helpText="Enter the F2D article code for this variant"
                                />
                                <TextField
                                    label="Sheets Max"
                                    value={sheetsMax}
                                    onChange={handleSheetsMaxChange}
                                    disabled={isSaving}
                                    type="number"
                                    helpText="Enter the maximum number of sheets (e.g., 15)"
                                />
                                <TextField
                                    label="Included Pages"
                                    value={includedPages}
                                    onChange={handleIncludedPagesChange}
                                    disabled={isSaving}
                                    type="number"
                                    helpText="Enter the number of included pages (e.g., 0)"
                                />
                                <TextField
                                    label="Product Unit Code"
                                    value={productUnitCode}
                                    onChange={handleProductUnitCodeChange}
                                    disabled={isSaving}
                                    helpText="Enter the product unit code (e.g., BOX)"
                                />
                            </BlockStack>
                        </BlockStack>
                    )}
                    <Button
                        kind="primary"
                        disabled={isSaving}
                        loading={isSaving}
                        onPress={handleSaveAllSettings}
                    >
                        Save All Settings
                    </Button>
                </BlockStack>
            )}
        </BlockStack>
    );
}


