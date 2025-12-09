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
                        editorTypeMetafield: metafield(namespace: "custom", key: "editor_type") {
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

const DELETE_METAFIELD_MUTATION = `
    mutation DeleteVariantMetafield($metafields: [MetafieldIdentifierInput!]!) {
        metafieldsDelete(metafields: $metafields) {
            deletedMetafields {
                key
                namespace
                ownerId
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
    const [editorType, setEditorType] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    // Accordion state for settings sections
    const [isEditorActivateOpen, setIsEditorActivateOpen] = useState(true);
    const [isEditorSettingsOpen, setIsEditorSettingsOpen] = useState(false);
    const [isAdditionalSettingsOpen, setIsAdditionalSettingsOpen] = useState(false);

    const loadProductVariants = useCallback(async () => {
        if (!productId) {
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        try {
            const response = await query(PRODUCT_VARIANTS_QUERY, {
                variables: { id: productId },
            });

            if (response.errors?.length) {
                setVariants([]);
                return;
            }

            const variantEdges = response.data?.product?.variants?.edges || [];
            const variantsData = variantEdges.map((edge) => {
                const variant = edge.node;

                // Normalise editor type metafield value.
                // When defined as a list, Shopify returns a JSON array string like
                // '["No Customisation"]'. We want a simple string value.
                let editorTypeValue = "";
                const rawEditorType = variant.editorTypeMetafield?.value;
                if (rawEditorType) {
                    try {
                        const parsed = JSON.parse(rawEditorType);
                        if (Array.isArray(parsed)) {
                            editorTypeValue = parsed[0] || "";
                        } else if (parsed != null) {
                            editorTypeValue = String(parsed);
                        }
                    } catch {
                        editorTypeValue = rawEditorType || "";
                    }
                }

                return {
                    id: variant.id,
                    title: variant.title,
                    displayName: variant.displayName,
                    templateId: variant.templateIdMetafield?.value || "",
                    templateIdMetafieldId: variant.templateIdMetafield?.id || null,
                    designId: variant.designIdMetafield?.value || "",
                    designIdMetafieldId: variant.designIdMetafield?.id || null,
                    materialId: variant.materialIdMetafield?.value || "",
                    materialIdMetafieldId: variant.materialIdMetafield?.id || null,
                    personalisations: variant.personalisationsMetafield?.value || "",
                    personalisationsMetafieldId: variant.personalisationsMetafield?.id || null,
                    f2dArticleCode: variant.f2dArticleCodeMetafield?.value || "",
                    f2dArticleCodeMetafieldId: variant.f2dArticleCodeMetafield?.id || null,
                    editorType: editorTypeValue,
                    editorTypeMetafieldId: variant.editorTypeMetafield?.id || null,
                    useImageUploads:
                        variant.useImageUploadsMetafield?.value === "true" ||
                        variant.useImageUploadsMetafield?.value === true ||
                        variant.useImageUploadsMetafield?.value === "True",
                    useImageUploadsMetafieldId: variant.useImageUploadsMetafield?.id || null,
                    useProjectThumbnailInCart:
                        variant.useProjectThumbnailInCartMetafield?.value === "true" ||
                        variant.useProjectThumbnailInCartMetafield?.value === true ||
                        variant.useProjectThumbnailInCartMetafield?.value === "True",
                    useProjectThumbnailInCartMetafieldId: variant.useProjectThumbnailInCartMetafield?.id || null,
                    useProjectReference:
                        variant.useProjectReferenceMetafield?.value === "true" ||
                        variant.useProjectReferenceMetafield?.value === true ||
                        variant.useProjectReferenceMetafield?.value === "True",
                    useProjectReferenceMetafieldId: variant.useProjectReferenceMetafield?.id || null,
                    sheetsMax: variant.sheetsMaxMetafield?.value || "",
                    sheetsMaxMetafieldId: variant.sheetsMaxMetafield?.id || null,
                    includedPages: variant.includedPagesMetafield?.value || "",
                    includedPagesMetafieldId: variant.includedPagesMetafield?.id || null,
                    productUnitCode: variant.productUnitCodeMetafield?.value || "",
                    productUnitCodeMetafieldId: variant.productUnitCodeMetafield?.id || null,
                };
            });

            if (!selectedVariantId) {
                console.log("[Peleman] Variant editor types", variantsData.map((v) => ({
                    id: v.id,
                    editorType: v.editorType,
                })));
            }

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
            }
        } catch (error) {
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
                setEditorType(selectedVariant.editorType || "");
            }
        }
    }, [selectedVariantId, variants]);

    const handleVariantSelect = (value) => {
        setSelectedVariantId(value);
    };

    const handleTemplateIdChange = (value) => {
        setTemplateId(value);
    };

    const handleDesignIdChange = (value) => {
        setDesignId(value);
    };

    const handleMaterialIdChange = (value) => {
        setMaterialId(value);
    };

    const handlePersonalisationsChange = (value) => {
        setPersonalisations(value);
    };

    const handleF2dArticleCodeChange = (value) => {
        setF2dArticleCode(value);
    };

    const handleUseImageUploadsChange = (value) => {
        setUseImageUploads(value);
    };

    const handleUseProjectThumbnailInCartChange = (value) => {
        setUseProjectThumbnailInCart(value);
    };

    const handleUseProjectReferenceChange = (value) => {
        setUseProjectReference(value);
    };

    const handleSheetsMaxChange = (value) => {
        setSheetsMax(value);
    };

    const handleIncludedPagesChange = (value) => {
        setIncludedPages(value);
    };

    const handleProductUnitCodeChange = (value) => {
        setProductUnitCode(value);
    };

    const handleSaveAllSettings = async () => {
        if (!selectedVariantId) {
            return;
        }

        // Get selected variant to access metafield IDs
        const selectedVariant = variants.find((v) => v.id === selectedVariantId);
        if (!selectedVariant) {
            return;
        }

        setIsSaving(true);

        try {
            // Build metafields array for update/create
            const metafields = [];
            // Build array of metafield identifiers to delete (for empty values that have existing metafields)
            const metafieldsToDelete = [];

            // Template ID
            if (templateId.trim()) {
                metafields.push({
                    ownerId: selectedVariantId,
                    namespace: "custom",
                    key: "template_id",
                    type: "single_line_text_field",
                    value: templateId.trim(),
                });
            } else if (selectedVariant.templateIdMetafieldId) {
                metafieldsToDelete.push({
                    ownerId: selectedVariantId,
                    namespace: "custom",
                    key: "template_id",
                });
            }

            // Design ID
            if (designId.trim()) {
                metafields.push({
                    ownerId: selectedVariantId,
                    namespace: "custom",
                    key: "design_id",
                    type: "single_line_text_field",
                    value: designId.trim(),
                });
            } else if (selectedVariant.designIdMetafieldId) {
                metafieldsToDelete.push({
                    ownerId: selectedVariantId,
                    namespace: "custom",
                    key: "design_id",
                });
            }

            // Material ID
            if (materialId.trim()) {
                metafields.push({
                    ownerId: selectedVariantId,
                    namespace: "custom",
                    key: "material_id",
                    type: "single_line_text_field",
                    value: materialId.trim(),
                });
            } else if (selectedVariant.materialIdMetafieldId) {
                metafieldsToDelete.push({
                    ownerId: selectedVariantId,
                    namespace: "custom",
                    key: "material_id",
                });
            }

            // Personalisations
            if (personalisations.trim()) {
                metafields.push({
                    ownerId: selectedVariantId,
                    namespace: "custom",
                    key: "personalisations",
                    type: "single_line_text_field",
                    value: personalisations.trim(),
                });
            } else if (selectedVariant.personalisationsMetafieldId) {
                metafieldsToDelete.push({
                    ownerId: selectedVariantId,
                    namespace: "custom",
                    key: "personalisations",
                });
            }

            // F2D Article Code
            if (f2dArticleCode.trim()) {
                metafields.push({
                    ownerId: selectedVariantId,
                    namespace: "custom",
                    key: "f2d_article_code",
                    type: "single_line_text_field",
                    value: f2dArticleCode.trim(),
                });
            } else if (selectedVariant.f2dArticleCodeMetafieldId) {
                metafieldsToDelete.push({
                    ownerId: selectedVariantId,
                    namespace: "custom",
                    key: "f2d_article_code",
                });
            }

            // Editor type (No Customisation / Peleman Image Editor)
            // Metafield is defined as a list, so we must send a JSON array
            // value and use the "list.single_line_text_field" type.
            if (editorType.trim()) {
                metafields.push({
                    ownerId: selectedVariantId,
                    namespace: "custom",
                    key: "editor_type",
                    type: "list.single_line_text_field",
                    value: JSON.stringify([editorType.trim()]),
                });
            } else if (selectedVariant.editorTypeMetafieldId) {
                metafieldsToDelete.push({
                    ownerId: selectedVariantId,
                    namespace: "custom",
                    key: "editor_type",
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

            // Sheets Max
            if (sheetsMax.trim()) {
                metafields.push({
                    ownerId: selectedVariantId,
                    namespace: "custom",
                    key: "sheets_max",
                    type: "number_integer",
                    value: sheetsMax.trim(),
                });
            } else if (selectedVariant.sheetsMaxMetafieldId) {
                metafieldsToDelete.push({
                    ownerId: selectedVariantId,
                    namespace: "custom",
                    key: "sheets_max",
                });
            }

            // Included Pages
            if (includedPages.trim()) {
                metafields.push({
                    ownerId: selectedVariantId,
                    namespace: "custom",
                    key: "included_pages",
                    type: "number_integer",
                    value: includedPages.trim(),
                });
            } else if (selectedVariant.includedPagesMetafieldId) {
                metafieldsToDelete.push({
                    ownerId: selectedVariantId,
                    namespace: "custom",
                    key: "included_pages",
                });
            }

            // Product Unit Code
            if (productUnitCode.trim()) {
                metafields.push({
                    ownerId: selectedVariantId,
                    namespace: "custom",
                    key: "product_unit_code",
                    type: "single_line_text_field",
                    value: productUnitCode.trim(),
                });
            } else if (selectedVariant.productUnitCodeMetafieldId) {
                metafieldsToDelete.push({
                    ownerId: selectedVariantId,
                    namespace: "custom",
                    key: "product_unit_code",
                });
            }

            // Delete metafields that are now empty
            if (metafieldsToDelete.length > 0) {
                const deleteResponse = await query(DELETE_METAFIELD_MUTATION, {
                    variables: {
                        metafields: metafieldsToDelete,
                    },
                });

                if (deleteResponse.errors?.length) {
                    // Handle GraphQL errors silently
                }

                const deleteUserErrors = deleteResponse.data?.metafieldsDelete?.userErrors || [];
                if (deleteUserErrors.length > 0) {
                    // Handle user errors silently
                }
            }

            // Update or create metafields
            if (metafields.length > 0) {
                const response = await query(UPDATE_METAFIELD_MUTATION, {
                    variables: {
                        metafields: metafields,
                    },
                });

                if (response.errors?.length) {
                    return;
                }

                const userErrors = response.data?.metafieldsSet?.userErrors || [];
                if (userErrors.length > 0) {
                    return;
                }
            }

            // Reload variants to get updated data
            await loadProductVariants();
        } catch (error) {
            // Handle errors silently
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
                            kind={isEditorActivateOpen ? "primary" : "secondary"}
                            onPress={() => {
                                const next = !isEditorActivateOpen;
                                setIsEditorActivateOpen(next);
                                if (next) {
                                    setIsEditorSettingsOpen(false);
                                    setIsAdditionalSettingsOpen(false);
                                }
                            }}
                        >
                            {isEditorActivateOpen ? "▼" : "▶"} Editor Activate
                        </Button>
                        <Button
                            kind={isEditorSettingsOpen ? "primary" : "secondary"}
                            onPress={() => {
                                const next = !isEditorSettingsOpen;
                                setIsEditorSettingsOpen(next);
                                if (next) {
                                    setIsEditorActivateOpen(false);
                                    setIsAdditionalSettingsOpen(false);
                                }
                            }}
                        >
                            {isEditorSettingsOpen ? "▼" : "▶"} Editor Settings
                        </Button>
                        <Button
                            kind={isAdditionalSettingsOpen ? "primary" : "secondary"}
                            onPress={() => {
                                const next = !isAdditionalSettingsOpen;
                                setIsAdditionalSettingsOpen(next);
                                if (next) {
                                    setIsEditorActivateOpen(false);
                                    setIsEditorSettingsOpen(false);
                                }
                            }}
                        >
                            {isAdditionalSettingsOpen ? "▼" : "▶"} Additional Settings
                        </Button>
                    </InlineStack>
                    {isEditorActivateOpen && (
                        <BlockStack spacing="base">
                            <Text
                                size="extraLarge"
                                emphasis="bold"
                                alignment="center"
                            >
                                Editor Activate
                            </Text>
                            <BlockStack spacing="tight">
                                <Divider style={{ marginBottom: "1rem" }} />
                                <Select
                                    label="Editor type"
                                    value={editorType}
                                    options={[
                                        { value: "", label: "Use default (no override)" },
                                        { value: "No Customisation", label: "No Customisation" },
                                        {
                                            value: "Peleman Image Editor",
                                            label: "Peleman Image Editor",
                                        },
                                    ]}
                                    onChange={setEditorType}
                                    disabled={isSaving}
                                    helpText="Choose whether this variant uses the Peleman Image Editor."
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


