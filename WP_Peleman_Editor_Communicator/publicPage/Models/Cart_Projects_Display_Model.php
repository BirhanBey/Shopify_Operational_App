<?php

declare(strict_types=1);

namespace WSPEC\publicPage\Models;

use WC_Tax;

class Cart_Projects_Display_Model {

    /**
     * Get project page count from Editor API
     * 
     * @param array $cartItem Cart item data
     * @return int|null Page count or null if failed
     */
    public function get_pageCount(array $cartItem): ?int {
        if (empty($cartItem['_project_id'])) {
            return null;
        }

        $locationForPages = get_option('wspie_domain', '') . '/editor/api/projectAPI.php?action=getpages&projectid=' . $cartItem['_project_id'] . '&a=' . get_option('wspie_api_key');
        $response = wp_remote_request($locationForPages);
        
        if (is_wp_error($response)) {
            return null;
        }

        $responseCode = wp_remote_retrieve_response_code($response);
        if ($responseCode !== 200) {
            return null;
        }

        $body = wp_remote_retrieve_body($response);
        $projectJson = json_decode($body);
        
        if (json_last_error() !== JSON_ERROR_NONE) {
            return null;
        }

        $pagesCount = $projectJson->pagesCount ?? null;
        return $pagesCount;
    }

    /**
     * Get project data from the external API
     * 
     * @param string $projectId The project ID
     * @return array|null The API response data or null if failed
     */
    public function get_project_data_from_api(string $projectId): ?array {
        $apiKey = get_option('wspie_api_key', '');
        if (empty($apiKey)) {
            return null;
        }

		$editorDomain = get_option('wspie_domain', '');

        $apiUrl = $editorDomain.'/editor/api/priceAPI.php';
        $apiUrl .= '?projectid=' . urlencode($projectId);
        $apiUrl .= '&a=' . urlencode($apiKey);
        $apiUrl .= '&action=getprojectprice';

        $response = wp_remote_get($apiUrl, [
            'timeout' => 30,
            'headers' => [
                'User-Agent' => 'WordPress/' . get_bloginfo('version'),
            ]
        ]);

        if (is_wp_error($response)) {
            error_log("💰 [PRICE API] ❌ HTTP error: " . $response->get_error_message());
            return null;
        }

        $responseCode = wp_remote_retrieve_response_code($response);
        if ($responseCode !== 200) {
            error_log("💰 [PRICE API] ❌ Non-200 response code: {$responseCode}");
            return null;
        }

        $body = wp_remote_retrieve_body($response);
        $data = json_decode($body, true);

        if (json_last_error() !== JSON_ERROR_NONE) {
            error_log("💰 [PRICE API] ❌ JSON decode error: " . json_last_error_msg());
            return null;
        }

        // Return the entire API response
        return $data;
    }

    /**
     * Get project reference from API
     * 
     * @param string $projectId The project ID
     * @return string|null Project reference or null if failed
     */
    public function get_project_reference(string $projectId): ?string {
        if (empty($projectId)) {
            error_log("📋 [PROJECT REFERENCE API] Project ID is empty");
            return null;
        }

        $location = get_option('wspie_domain', '') . '/editor/api/projectfileAPI.php?action=get&projectid=' . $projectId . '&a=' . get_option('wspie_api_key');
        
        $response = wp_remote_request($location);
        
        if (is_wp_error($response)) {
            error_log("📋 [PROJECT REFERENCE API] ❌ API Error: " . $response->get_error_message());
            return null;
        }

        $responseCode = wp_remote_retrieve_response_code($response);
        
        if ($responseCode !== 200) {
            error_log("📋 [PROJECT REFERENCE API] ❌ Non-200 response code");
            return null;
        }

        $body = wp_remote_retrieve_body($response);
        $projectJson = json_decode($body);
        
        if (json_last_error() !== JSON_ERROR_NONE) {
            error_log("📋 [PROJECT REFERENCE API] ❌ JSON decode error: " . json_last_error_msg());
            return null;
        }

        $projectReference = $projectJson->name ?? null;
        
        return $projectReference;
    }

    /**
     * Calculate extra page costs based on product meta and page count
     * 
     * @param array $cartItem Cart item data
     * @param int $pagesCount Total page count
     * @return array Array with extra cost details
     */
    public function calculate_extra_page_costs(array $cartItem, int $pagesCount): array {
        $product = $cartItem['data'];
        
        // Get product meta data (this would need to be implemented based on your product structure)
        $freePages = $this->get_product_meta($product, 'default_page_amount', 0);
        $pricePerExtraPage = $this->get_product_meta($product, 'cover_price_per_page', 0);
        $unitAmount = $this->get_product_meta($product, 'cart_units', 1);
        $unitPrice = $this->get_product_meta($product, 'unit_price', 0);

        $tax_display_cart = get_option('woocommerce_tax_display_cart');
        $tax_rates = WC_Tax::get_rates();
        $first_rate = reset($tax_rates);

        if (isset($first_rate['rate'])) {
            $first_tax_rate = $first_rate['rate'];
        } else {
            $first_tax_rate = 1;
        }

        if($tax_display_cart === 'excl'){
            // No change
        } else {
            $pricePerExtraPage = $pricePerExtraPage * (1 + ($first_tax_rate / 100));
        }

        $pagesToPay = $pagesCount - $freePages;

        if ($unitPrice !== 0 && $pagesToPay > 0) {
            $extraPricePerBook = $pricePerExtraPage * $pagesToPay;
            $totalExtraPrice = $extraPricePerBook * $unitAmount;
        } else {
            $totalExtraPrice = $pricePerExtraPage * $pagesToPay;
        }

        return [
            'freePages' => $freePages,
            'pagesToPay' => $pagesToPay,
            'totalExtraPrice' => $totalExtraPrice,
            'pricePerExtraPage' => $pricePerExtraPage
        ];
    }

    /**
     * Get product meta value with fallback
     * 
     * @param mixed $product Product object
     * @param string $key Meta key
     * @param mixed $default Default value
     * @return mixed Meta value or default
     */
    private function get_product_meta($product, string $key, $default = null) {
        if (method_exists($product, 'get_meta')) {
            return $product->get_meta($key) ?: $default;
        }
        return $default;
    }
}
