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
  const { session } = await authenticate.admin(request);
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
    if (fetcher.data?.success) {
      shopify.toast.show(fetcher.data.message || "Settings saved");
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

    </s-page>
  );
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
