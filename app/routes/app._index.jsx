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

    try {
      const response = await admin.graphql(METAFIELD_DEFINITION_MUTATION, {
        variables: {
          definition: {
            name: "Use Project Reference",
            namespace: "custom",
            key: "use_project_reference",
            type: "boolean",
            ownerType: "PRODUCTVARIANT",
            description: "Enable project reference input for this variant",
          },
        },
      });

      const data = await response.json();

      if (data.data?.metafieldDefinitionCreate?.userErrors?.length > 0) {
        const errors = data.data.metafieldDefinitionCreate.userErrors;

        // If definition already exists or key is in use, that's okay
        const alreadyExists = errors.some(
          (error) => error.message?.includes("already exists") ||
            error.message?.includes("duplicate") ||
            error.message?.toLowerCase().includes("unique") ||
            error.message?.includes("Key is in use") ||
            error.message?.toLowerCase().includes("key is in use")
        );

        if (alreadyExists) {
          return {
            success: true,
            message: "Metafield definition already exists"
          };
        }

        return {
          success: false,
          message: errors.map((e) => e.message).join(", ")
        };
      }

      if (data.data?.metafieldDefinitionCreate?.createdDefinition) {
        return {
          success: true,
          message: "Metafield definition created successfully",
          definitionId: data.data.metafieldDefinitionCreate.createdDefinition.id
        };
      }

      return {
        success: false,
        message: "Unexpected response from Shopify API"
      };
    } catch (error) {
      console.error("Error creating metafield definition:", error);
      return {
        success: false,
        message: `Error: ${error.message}`
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
          Create the variant metafield definition for &quot;Use Project Reference&quot; feature.
          This needs to be done once per shop.
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
