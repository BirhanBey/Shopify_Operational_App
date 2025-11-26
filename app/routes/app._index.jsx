import { useEffect, useState } from "react";
import { useFetcher, Form, useLoaderData } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  // Load existing editor settings
  const settings = await prisma.editorSettings.findUnique({
    where: { shop },
  });

  return {
    settings: settings || {
      editorApiKey: "",
      editorDomain: "",
      editorCustomerId: "",
    },
  };
};

export const action = async ({ request }) => {
  const { session, admin } = await authenticate.admin(request);
  const shop = session.shop;
  const formData = await request.formData();
  const intent = formData.get("intent");

  // Handle editor settings save
  if (intent === "save-editor-settings") {
    const editorApiKey = formData.get("editorApiKey")?.toString() || null;
    const editorDomain = formData.get("editorDomain")?.toString() || null;
    const editorCustomerId = formData.get("editorCustomerId")?.toString() || null;

    await prisma.editorSettings.upsert({
      where: { shop },
      update: {
        editorApiKey,
        editorDomain,
        editorCustomerId,
      },
      create: {
        shop,
        editorApiKey,
        editorDomain,
        editorCustomerId,
      },
    });

    return { success: true, message: "Editor settings saved successfully" };
  }

  // Handle metafield definition creation
  if (intent === "create-metafield-definition") {
    const METAFIELD_DEFINITION_MUTATION = `
      mutation CreateMetafieldDefinition($definition: MetafieldDefinitionInput!) {
        metafieldDefinitionCreate(definition: $definition) {
          createdDefinition {
            id
            name
            key
            namespace
          }
          userErrors {
            field
            message
          }
        }
      }
    `;

    // Define all metafield definitions to create
    const metafieldDefinitions = [
      {
        name: "Use Project Reference",
        namespace: "custom",
        key: "use_project_reference",
        type: "boolean",
        ownerType: "PRODUCTVARIANT",
        description: "Enable project reference input for this variant",
      },
      {
        name: "Template ID",
        namespace: "custom",
        key: "template_id",
        type: "single_line_text_field",
        ownerType: "PRODUCTVARIANT",
        description: "Template ID for the editor",
      },
      {
        name: "Design ID",
        namespace: "custom",
        key: "design_id",
        type: "single_line_text_field",
        ownerType: "PRODUCTVARIANT",
        description: "Design ID for the editor",
      },
      {
        name: "Material ID",
        namespace: "custom",
        key: "material_id",
        type: "single_line_text_field",
        ownerType: "PRODUCTVARIANT",
        description: "Material ID for the editor",
      },
      {
        name: "Personalisations",
        namespace: "custom",
        key: "personalisations",
        type: "single_line_text_field",
        ownerType: "PRODUCTVARIANT",
        description: "Personalisations value (e.g., f2d)",
      },
      {
        name: "F2D Article Code",
        namespace: "custom",
        key: "f2d_article_code",
        type: "single_line_text_field",
        ownerType: "PRODUCTVARIANT",
        description: "F2D article code for this variant",
      },
      {
        name: "Use Image Uploads",
        namespace: "custom",
        key: "use_image_uploads",
        type: "boolean",
        ownerType: "PRODUCTVARIANT",
        description: "Enable image uploads in the editor",
      },
      {
        name: "Use Project Thumbnail in Cart",
        namespace: "custom",
        key: "use_project_thumbnail_in_cart",
        type: "boolean",
        ownerType: "PRODUCTVARIANT",
        description: "Show project thumbnail in cart",
      },
      {
        name: "Sheets Max",
        namespace: "custom",
        key: "sheets_max",
        type: "number_integer",
        ownerType: "PRODUCTVARIANT",
        description: "Maximum number of sheets (e.g., 15)",
      },
      {
        name: "Included Pages",
        namespace: "custom",
        key: "included_pages",
        type: "number_integer",
        ownerType: "PRODUCTVARIANT",
        description: "Number of included pages (e.g., 0)",
      },
      {
        name: "Product Unit Code",
        namespace: "custom",
        key: "product_unit_code",
        type: "single_line_text_field",
        ownerType: "PRODUCTVARIANT",
        description: "Product unit code (e.g., BOX)",
      },
    ];

    try {
      const results = [];
      const errors = [];

      // Create each metafield definition
      for (const definition of metafieldDefinitions) {
        try {
          const response = await admin.graphql(METAFIELD_DEFINITION_MUTATION, {
            variables: { definition },
          });

          const data = await response.json();

          if (data.data?.metafieldDefinitionCreate?.userErrors?.length > 0) {
            const definitionErrors = data.data.metafieldDefinitionCreate.userErrors;

            // If definition already exists, that's okay
            const alreadyExists = definitionErrors.some(
              (error) =>
                error.message?.includes("already exists") ||
                error.message?.includes("duplicate") ||
                error.message?.toLowerCase().includes("unique") ||
                error.message?.includes("Key is in use") ||
                error.message?.toLowerCase().includes("key is in use")
            );

            if (alreadyExists) {
              results.push({
                key: definition.key,
                status: "exists",
                message: `${definition.name} already exists`,
              });
            } else {
              errors.push({
                key: definition.key,
                message: definitionErrors.map((e) => e.message).join(", "),
              });
            }
          } else if (data.data?.metafieldDefinitionCreate?.createdDefinition) {
            results.push({
              key: definition.key,
              status: "created",
              message: `${definition.name} created successfully`,
            });
          }
        } catch (error) {
          errors.push({
            key: definition.key,
            message: error.message,
          });
        }
      }

      // Return summary
      const successCount = results.filter((r) => r.status === "created").length;
      const existsCount = results.filter((r) => r.status === "exists").length;
      const errorCount = errors.length;

      if (errorCount > 0) {
        return {
          success: false,
          message: `Created: ${successCount}, Already exists: ${existsCount}, Errors: ${errorCount}. Check console for details.`,
          details: { results, errors },
        };
      }

      return {
        success: true,
        message: `Metafield definitions processed: ${successCount} created, ${existsCount} already existed`,
        details: { results },
      };
    } catch (error) {
      console.error("Error creating metafield definitions:", error);
      return {
        success: false,
        message: `Error: ${error.message}`,
      };
    }
  }

  return null;
};

export default function Index() {
  const fetcher = useFetcher();
  const { settings: initialSettings } = useLoaderData();
  const shopify = useAppBridge();
  const isLoading =
    ["loading", "submitting"].includes(fetcher.state) &&
    fetcher.formMethod === "POST";

  // Local state for form inputs
  const [editorApiKey, setEditorApiKey] = useState(
    initialSettings.editorApiKey || ""
  );
  const [editorDomain, setEditorDomain] = useState(
    initialSettings.editorDomain || ""
  );
  const [editorCustomerId, setEditorCustomerId] = useState(
    initialSettings.editorCustomerId || ""
  );

  useEffect(() => {
    if (fetcher.data?.product?.id) {
      shopify.toast.show("Product created");
    }

    if (fetcher.data?.success !== undefined) {
      const message = fetcher.data.message || "Settings saved";
      shopify.toast.show(message);
    }

    if (fetcher.data?.success === false) {
      console.error("[UI] Action failed:", fetcher.data.message);
    }
  }, [fetcher.data, shopify]);

  return (
    <s-page heading="Peleman Editor Connection">

      <s-section heading="Product Management">
        <s-paragraph>
          Integrate your WordPress editor with Shopify and simplify product
          management.
        </s-paragraph>

        <Form method="post" action="">
          <input type="hidden" name="intent" value="save-editor-settings" />
          <s-stack direction="block" gap="base">
            <s-text-field
              name="editorApiKey"
              label="Editor API Key"
              value={editorApiKey}
              onChange={(e) => setEditorApiKey(e.currentTarget.value)}
              placeholder="Enter your Editor API Key"
            />

            <s-text-field
              name="editorDomain"
              label="Editor Domain"
              value={editorDomain}
              onChange={(e) => setEditorDomain(e.currentTarget.value)}
              placeholder="Enter your Editor Domain (e.g., editor.example.com)"
            />

            <s-text-field
              name="editorCustomerId"
              label="Editor Customer ID"
              value={editorCustomerId}
              onChange={(e) => setEditorCustomerId(e.currentTarget.value)}
              placeholder="Enter your Editor Customer ID"
            />

            <s-button
              type="submit"
              variant="primary"
              {...(isLoading && fetcher.formData?.get("intent") === "save-editor-settings"
                ? { loading: true }
                : {})}
            >
              Save Settings
            </s-button>
          </s-stack>
        </Form>
      </s-section>

      <s-section heading="Metafield Setup">
        <s-paragraph>
          Create all variant metafield definitions for Editor Configuration features.
          This needs to be done once per shop. Creates definitions for: Use Project Reference, Template ID, Design ID, Material ID, Personalisations, F2D Article Code, Use Image Uploads, Use Project Thumbnail in Cart, Sheets Max, Included Pages, and Product Unit Code.
        </s-paragraph>

        <fetcher.Form
          method="post"
          style={{ marginTop: "16px" }}
        >
          <input type="hidden" name="intent" value="create-metafield-definition" />
          <s-button
            type="submit"
            variant="secondary"
            {...(isLoading && fetcher.formData?.get("intent") === "create-metafield-definition"
              ? { loading: true }
              : {})}
          >
            Create Variant Metafield Definition
          </s-button>
        </fetcher.Form>
      </s-section>

    </s-page>
  );
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
