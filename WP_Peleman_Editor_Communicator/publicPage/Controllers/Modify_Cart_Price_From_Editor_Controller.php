<?php

declare(strict_types=1);

namespace WSPEC\publicPage\Controllers;

use WSPEC\publicPage\Models\Modify_Cart_Price_From_Editor_Model;

class Modify_Cart_Price_From_Editor_Controller {

    private Modify_Cart_Price_From_Editor_Model $model;
    /**
     * Cache API prices by project id for the duration of a single request
     * @var array<string,float>
     */
    private static array $requestPriceCache = [];

    public function __construct() {
        $this->model = new Modify_Cart_Price_From_Editor_Model();
        $this->init_hooks();
    }

    /**
     * Initialize WordPress and WooCommerce hooks
     */
    private function init_hooks(): void {
        // Hook into WooCommerce cart calculation - Apply editor prices as priority
        add_action('woocommerce_before_calculate_totals', [$this, 'parse_cart_items'], 999, 1);

        // Ensure mini-cart and cart item prices display API-updated unit prices
        // Priority 10 (BEFORE Flatsome's quantity_html which uses priority 11)
        // Flatsome will wrap our content in ux-mini-cart-qty div
        add_filter('woocommerce_widget_cart_item_quantity', [$this, 'filter_widget_cart_item_quantity'], 10, 3);
        add_filter('woocommerce_cart_item_price', [$this, 'filter_cart_item_price'], PHP_INT_MAX, 3);
        add_filter('woocommerce_cart_item_subtotal', [$this, 'filter_cart_item_subtotal'], PHP_INT_MAX, 3);

        // Ensure prices are set BEFORE mini cart renders (same as cart page calculation)
        // This ensures mini cart shows the same prices as cart page
        add_action('woocommerce_before_mini_cart', [$this, 'ensure_mini_cart_prices'], 5);
        
        // Apply prices as soon as cart is restored from session so fragments see updated values
        add_action('woocommerce_cart_loaded_from_session', [$this, 'adjust_prices_on_session_load'], 999);
    }

    /**
     * Parse cart items and apply Editor API prices
     * 
     * @param \WC_Cart $cart WooCommerce cart object
     */
    public function parse_cart_items(\WC_Cart $cart): void {
        foreach ($cart->get_cart() as $cartItem => $values) {
            $product = $values['data'];
            $projectId = $values['_project_id'] ?? '';

            // Check if we have a project ID and try to get price from API first
            if (!empty($values['_project_id'])) {
                $projectId = $values['_project_id'];
                $apiPrice = $this->model->get_project_price_from_api($projectId);
                
                if ($apiPrice !== null) {
                    $values['data']->set_price($apiPrice);
                    // Cache the API price for later use
                    self::$requestPriceCache[$projectId] = $apiPrice;
                    continue;
                }
            }
        }        
    }

    /**
     * Ensure prices are set BEFORE mini cart renders
     * This triggers calculate_totals() which runs parse_cart_items and other price hooks
     * Same as cart page, ensures mini cart shows the same prices
     */
    public function ensure_mini_cart_prices(): void {
        if (!function_exists('WC') || !WC()->cart) {
            return;
        }
        
        // Trigger cart totals calculation (same as cart page)
        // This will run parse_cart_items and other price hooks (e.g., WP_Peleman_Products_Extender)
        // Ensures mini cart product prices are set the same way as cart page
        WC()->cart->calculate_totals();
    }

    /**
     * Ensure API prices are applied immediately after cart loads from session
     */
    public function adjust_prices_on_session_load(): void {
        if (!function_exists('WC') || !WC()->cart) {
            return;
        }
        $cart = WC()->cart;
        foreach ($cart->get_cart() as $values) {
            if (!empty($values['_project_id'])) {
                $projectId = (string) $values['_project_id'];
                $apiPrice = self::$requestPriceCache[$projectId] ?? $this->model->get_project_price_from_api($projectId);
                if ($apiPrice !== null) {
                    self::$requestPriceCache[$projectId] = $apiPrice;
                    $values['data']->set_price($apiPrice);
                }
            }
        }
    }

    /**
     * Mini cart: show quantity × unit price (same as cart page PRICE column)
     * Uses cart_price meta if available (set by WP_Peleman_Products_Extender), otherwise product price
     * This ensures mini cart shows the exact same price as cart page PRICE column
     * Don't add wrapper - Flatsome (priority 11) will add ux-mini-cart-qty wrapper
     */
    public function filter_widget_cart_item_quantity(string $qty_html, array $cart_item, string $cart_item_key): string {
        try {
            if (empty($cart_item['_project_id']) || !isset($cart_item['data'])) {
                return $qty_html;
            }

            $product = $cart_item['data'];
            $pid = (string) $cart_item['_project_id'];
            
            // Get quantity from WC()->cart->get_cart() - same as Flatsome does
            // This ensures we get the correct quantity, not just from the passed $cart_item array
            $cart_contents = WC()->cart->get_cart();
            $quantity = isset($cart_contents[$cart_item_key]['quantity']) 
                ? (int) $cart_contents[$cart_item_key]['quantity'] 
                : (isset($cart_item['quantity']) ? (int) $cart_item['quantity'] : 1);
            
            // IMPORTANT: Get price from cart_price meta OR product price
            // WP_Peleman_Products_Extender sets cart_price meta (when product is sold in multiples)
            // So we check cart_price meta first, then fall back to product price
            $cart_price_meta = $product->get_meta('cart_price');
            if (!empty($cart_price_meta) && is_numeric($cart_price_meta) && (float)$cart_price_meta > 0) {
                // Use cart_price meta (set by WP_Peleman_Products_Extender) - same as cart page
                $displayPrice = (float) $cart_price_meta;
                $product->set_price($displayPrice);
                $priceSource = 'meta';
            } else {
                // Fallback to product price
                $displayPrice = (float) $product->get_price();
                $priceSource = 'original';
            }
            
            // Check if API price is available and use it if found
            $apiPrice = self::$requestPriceCache[$pid] ?? null;
            if ($apiPrice === null) {
                $apiPrice = $this->model->get_project_price_from_api($pid);
            }
            
            if ($apiPrice !== null) {
                self::$requestPriceCache[$pid] = $apiPrice;
                $product->set_price($apiPrice);
                $displayPrice = $apiPrice;
                $priceSource = 'api';
            }
            
            // Format: quantity × unit_price (same format as cart page)
            ob_start();
            ?>
            <span class="quantity" data-price-source="<?php echo esc_attr($priceSource); ?>"><?php echo esc_html((string) $quantity); ?> &times;
                <span class="woocommerce-Price-amount amount">
                    <bdi>
                        <span class="woocommerce-Price-currencySymbol"><?php echo wp_kses_post(get_woocommerce_currency_symbol()); ?></span>
                        <?php echo wp_kses_post(wc_format_localized_price($displayPrice)); ?>
                    </bdi>
                </span>
            </span>
            <?php
            return ob_get_clean();
        } catch (\Throwable $e) {
            return $qty_html;
        }
    }

    /**
     * Cart/mini-cart unit price HTML
     */
    public function filter_cart_item_price(string $price_html, array $cart_item, string $cart_item_key): string {
        try {
            if (!empty($cart_item['_project_id']) && isset($cart_item['data'])) {
                $product = $cart_item['data'];
                
                // Check if API price is available
                $pid = (string) $cart_item['_project_id'];
                $apiPrice = self::$requestPriceCache[$pid] ?? null;
                
                if ($apiPrice === null) {
                    $apiPrice = $this->model->get_project_price_from_api($pid);
                }
                
                if ($apiPrice !== null) {
                    self::$requestPriceCache[$pid] = $apiPrice;
                    $product->set_price($apiPrice);
                } else {
                    // Use cart_price meta if available (set by WP_Peleman_Products_Extender)
                    $cart_price_meta = $product->get_meta('cart_price');
                    if (!empty($cart_price_meta) && is_numeric($cart_price_meta) && (float)$cart_price_meta > 0) {
                        $product->set_price((float) $cart_price_meta);
                    }
                }
                
                $price_html = wc_price((float) $product->get_price());
            }
        } catch (\Throwable $e) {
            // Silent fail - return original price
        }
        return $price_html;
    }

    /**
     * Cart/mini-cart line subtotal HTML
     */
    public function filter_cart_item_subtotal(string $subtotal_html, array $cart_item, string $cart_item_key): string {
        try {
            if (!empty($cart_item['_project_id']) && isset($cart_item['data'])) {
                $product = $cart_item['data'];
                $qty = isset($cart_item['quantity']) ? (int) $cart_item['quantity'] : 1;
                
                // Check if API price is available
                $pid = (string) $cart_item['_project_id'];
                $apiPrice = self::$requestPriceCache[$pid] ?? null;
                
                if ($apiPrice === null) {
                    $apiPrice = $this->model->get_project_price_from_api($pid);
                }
                
                if ($apiPrice !== null) {
                    self::$requestPriceCache[$pid] = $apiPrice;
                    $product->set_price($apiPrice);
                } else {
                    // Use cart_price meta if available (set by WP_Peleman_Products_Extender)
                    $cart_price_meta = $product->get_meta('cart_price');
                    if (!empty($cart_price_meta) && is_numeric($cart_price_meta) && (float)$cart_price_meta > 0) {
                        $product->set_price((float) $cart_price_meta);
                    }
                }
                
                $subtotal_html = wc_price((float) $product->get_price() * $qty);
            }
        } catch (\Throwable $e) {
            // Silent fail - return original subtotal
        }
        return $subtotal_html;
    }
}
