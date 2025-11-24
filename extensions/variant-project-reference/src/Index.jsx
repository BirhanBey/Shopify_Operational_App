import {
    reactExtension,
    useApi,
    Checkbox,
    BlockStack,
    Text,
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
                        metafield(namespace: "custom", key: "use_project_reference") {
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
    () => <VariantProjectReference />
);

function VariantProjectReference() {
    const { query, data } = useApi();
    // Get product ID from selected resource (product details page)
    const productId = data?.selected?.[0]?.id || null;

    const [isLoading, setIsLoading] = useState(true);
    const [variants, setVariants] = useState([]);
    const [savingVariants, setSavingVariants] = useState(new Set());

    const loadProductVariants = useCallback(async () => {
        if (!productId) {
            console.warn("[Extension] No product id available");
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        try {
            const response = await query(PRODUCT_VARIANTS_QUERY, {
                variables: { id: productId },
            });

            if (response.errors?.length) {
                console.error("[Extension] Product query errors:", response.errors);
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
                    metafieldId: metafield?.id || null,
                    isChecked:
                        metafield?.value === "true" ||
                        metafield?.value === true ||
                        metafield?.value === "True",
                };
            });

            console.log("[Extension] Loaded variants:", variantsData);
            setVariants(variantsData);
        } catch (error) {
            console.error("[Extension] Error loading product variants:", error);
            setVariants([]);
        } finally {
            setIsLoading(false);
        }
    }, [query, productId]);

    useEffect(() => {
        loadProductVariants();
    }, [loadProductVariants]);

    const handleVariantChange = async (variantId, checked) => {
        // Optimistically update UI
        setVariants((prevVariants) =>
            prevVariants.map((variant) => {
                if (variant.id === variantId) {
                    return {
                        ...variant,
                        isChecked: checked,
                    };
                }
                return variant;
            })
        );

        setSavingVariants((prev) => new Set(prev).add(variantId));

        try {
            // MetafieldsSetInput doesn't support 'id' field
            // Shopify will find existing metafield by ownerId, namespace, and key
            const metafieldInput = {
                ownerId: variantId,
                namespace: "custom",
                key: "use_project_reference",
                type: "boolean",
                value: checked ? "true" : "false",
            };

            const response = await query(UPDATE_METAFIELD_MUTATION, {
                variables: {
                    metafields: [metafieldInput],
                },
            });

            if (response.errors?.length) {
                console.error("[Extension] GraphQL errors:", response.errors);
                // Revert optimistic update on error
                setVariants((prevVariants) =>
                    prevVariants.map((variant) => {
                        if (variant.id === variantId) {
                            return {
                                ...variant,
                                isChecked: !checked,
                            };
                        }
                        return variant;
                    })
                );
                return;
            }

            const userErrors = response.data?.metafieldsSet?.userErrors || [];
            if (userErrors.length > 0) {
                console.error("Metafield update errors:", userErrors);
                // Revert optimistic update on error
                setVariants((prevVariants) =>
                    prevVariants.map((variant) => {
                        if (variant.id === variantId) {
                            return {
                                ...variant,
                                isChecked: !checked,
                            };
                        }
                        return variant;
                    })
                );
                return;
            }

            console.log("[Extension] Metafield updated successfully for variant:", variantId);

            // Update local state with saved metafield ID
            setVariants((prevVariants) =>
                prevVariants.map((variant) => {
                    if (variant.id === variantId) {
                        const savedMetafield = response.data?.metafieldsSet?.metafields?.[0];
                        return {
                            ...variant,
                            isChecked: checked,
                            metafieldId: savedMetafield?.id || variant.metafieldId,
                        };
                    }
                    return variant;
                })
            );
        } catch (error) {
            console.error("Error updating metafield:", error);
            // Revert optimistic update on error
            setVariants((prevVariants) =>
                prevVariants.map((variant) => {
                    if (variant.id === variantId) {
                        return {
                            ...variant,
                            isChecked: !checked,
                        };
                    }
                    return variant;
                })
            );
        } finally {
            setSavingVariants((prev) => {
                const next = new Set(prev);
                next.delete(variantId);
                return next;
            });
        }
    };

    if (isLoading) {
        return (
            <BlockStack spacing="base">
                <Text size="base" emphasis="bold">
                    Project Reference
                </Text>
                <Text size="base">Loading variants...</Text>
            </BlockStack>
        );
    }

    if (!productId) {
        return (
            <BlockStack spacing="base">
                <Text size="base" emphasis="bold">
                    Project Reference
                </Text>
                <Text size="base">
                    No product selected. Please open a product to configure project reference.
                </Text>
            </BlockStack>
        );
    }

    if (variants.length === 0) {
        return (
            <BlockStack spacing="base">
                <Text size="base" emphasis="bold">
                    Project Reference
                </Text>
                <Text size="base">No variants found for this product.</Text>
            </BlockStack>
        );
    }

    return (
        <BlockStack spacing="base">
            <Text size="base" emphasis="bold">
                Project Reference
            </Text>
            <Text size="small">
                Enable project reference input for each variant on the product page.
            </Text>
            <Divider />
            {variants.map((variant) => (
                <Checkbox
                    key={variant.id}
                    checked={variant.isChecked}
                    onChange={(checked) =>
                        handleVariantChange(variant.id, checked)
                    }
                    disabled={savingVariants.has(variant.id)}
                    label={variant.displayName || variant.title}
                    helpText={
                        variant.displayName && variant.displayName !== variant.title
                            ? variant.title
                            : undefined
                    }
                />
            ))}
        </BlockStack>
    );
}

