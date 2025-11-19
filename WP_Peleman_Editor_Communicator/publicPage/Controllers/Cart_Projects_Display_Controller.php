<?php

declare(strict_types=1);

namespace WSPEC\publicPage\Controllers;

use WC_Cart;
use WC_Product;
use WC_Product_Variation;

/**
 * Handles adding a PIE editor project to the cart upon return via the CustProj URL parameter.
 */
class Cart_Projects_Display_Controller
{
    public function __construct()
    {
        add_action('wp', [$this, 'add_customized_product_to_cart']);
    }

    public function add_customized_product_to_cart(): void
    {
        $current_url = home_url(add_query_arg([], $_SERVER['REQUEST_URI']));

        // Define the array of possible cart endpoints
        $cart_page_endpoints = [
            'cart/',
            'winkelmand/',
            'panier/',
            'einkaufswagen/',
            'carrito/'
        ];

        // Check if the current URL matches any endpoint in the array
        $match_found = false;
        foreach ($cart_page_endpoints as $cpendpoint) {
            if (strpos($current_url, $cpendpoint) !== false) {
                $match_found = true;
                break;
            }
        }

        // If no match is found, exit
        if (!$match_found) {
            return; // Exit if not on any of the specified endpoints
        }

        $get = filter_input_array(INPUT_GET, FILTER_SANITIZE_FULL_SPECIAL_CHARS);

        if (!empty($get['CustProj'])) {
            $sessionKey = sanitize_key($get['CustProj']);
            
            // Try to get data from transient first (for duplicate projects)
            $data = get_transient($sessionKey);
            
            // If not found in transient, try session (for regular projects)
            if (empty($data)) {
                $data = WC()->session->get($sessionKey);
                error_log(__CLASS__ . " - DEBUG: Data found in session: " . var_export($data, true));
            } else {
                error_log(__CLASS__ . " - DEBUG: Data found in transient: " . var_export($data, true));
            }

            if (!empty($data) && is_array($data)) {
                $productId    = (int) $data['product_id'];
                $variationId  = (int) ($data['variation_id'] ?? 0);
                $quantity     = (int) ($data['quantity'] ?? 1);
                $product      = wc_get_product($variationId ?: $productId);
                $variationArr = [];
                $meta         = $data['item_meta'] ?? [];

                if (!empty($meta['_project_id'])) {
                    $location = get_option('wspie_domain', '') . '/editor/api/projectfileAPI.php?action=get&projectid=' . $meta['_project_id'] . '&a=' . get_option('wspie_api_key');
                    $response = wp_remote_request($location);

                    if (!is_wp_error($response)) {
                        $projectJson = json_decode(wp_remote_retrieve_body($response));
                        if (!empty($projectJson->name)) {
                            $meta['_project_reference'] = $projectJson->name;
                            error_log(__CLASS__ . " - DEBUG: Updated project reference from API: " . $projectJson->name);
                        }
                    } else {
                        error_log(__CLASS__ . " - DEBUG: ❌ Failed to fetch project data from API: " . $response->get_error_message());
                    }
                } else {
                    error_log(__CLASS__ . " - DEBUG: No project ID found in meta data");
                }

                if ($product instanceof WC_Product_Variation) {
                    $variationArr = wc_get_product_variation_attributes($variationId);
                }

                $added = WC()->cart->add_to_cart($productId, $quantity, $variationId, $variationArr, $meta);

                if (!$added) {
                    error_log(__CLASS__ . " - DEBUG: ❌ Failed to add to cart.");
                    wp_die("Failed to add item to cart.");
                }
                
                // Clean up both transient and session
                delete_transient($sessionKey);
                WC()->session->__unset($sessionKey);
            }

            $organisation = !empty($get['organisationid']) ? '?organisationid=' . urlencode($get['organisationid']) : '';
            wp_redirect(wc_get_cart_url() . $organisation);
            exit;
        }
    }
}
