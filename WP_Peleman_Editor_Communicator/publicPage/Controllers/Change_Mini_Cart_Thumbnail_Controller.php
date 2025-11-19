<?php

declare(strict_types=1);

namespace WSPEC\publicPage\Controllers;

/**
 * Overrides item thumbnail in cart and mini cart for editor projects
 * Simplified approach similar to Cart_Projects_Display_View
 * Must be loaded unconditionally because mini cart appears on all pages
 */
class Change_Mini_Cart_Thumbnail_Controller
{
    public function __construct()
    {
        $this->init_hooks();
    }

    /**
     * Initialize WordPress and WooCommerce hooks
     */
    private function init_hooks(): void
    {
        // Hook into cart item thumbnail - works for both normal cart and mini cart
        // Priority 15 to run after default WooCommerce thumbnail generation
        add_filter('woocommerce_cart_item_thumbnail', [$this, 'override_cart_item_thumbnail'], 15, 3);
    }

    /**
     * Override cart item thumbnail with project thumbnail from editor API
     * Simplified approach: fetch thumbnail, base64 encode, and replace HTML
     * Similar to Cart_Projects_Display_View::change_project_thumbnail_in_cart()
     * 
     * @param string $image Original thumbnail HTML
     * @param array $cart_item Cart item data
     * @param string $cart_item_key Cart item key
     * @return string Modified thumbnail HTML
     */
    public function override_cart_item_thumbnail(string $image, array $cart_item, string $cart_item_key): string
    {
        // Check if cart item has project ID
        if (empty($cart_item['_project_id'])) {
            return $image;
        }

        $projectId = $cart_item['_project_id'];
        $apiKey = get_option('wspie_api_key');
        $domain = get_option('wspie_domain', 'https://deveditor.peleman.com');

        if (empty($apiKey) || empty($domain)) {
            return $image;
        }

        // Build thumbnail URL
        $thumbnailUrl = $domain . '/editor/api/getprojectthumbnailAPI.php?' . http_build_query([
            'projectid' => $projectId,
            'customerapikey' => $apiKey,
        ]);

        // Fetch thumbnail from editor API
        $response = wp_remote_get($thumbnailUrl, [
            'timeout' => 10,
        ]);

        if (is_wp_error($response)) {
            return $image;
        }

        $body = wp_remote_retrieve_body($response);
        if (empty($body)) {
            return $image;
        }

        // Base64 encode the image data and return new img tag
        // Same approach as Cart_Projects_Display_View
        $base64 = base64_encode($body);
        return '<img src="data:image/jpeg;base64,' . esc_attr($base64) . '" class="attachment-woocommerce_thumbnail size-woocommerce_thumbnail" style="object-fit:cover;" />';
    }
}
