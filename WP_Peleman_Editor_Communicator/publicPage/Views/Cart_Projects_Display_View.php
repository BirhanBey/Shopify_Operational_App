<?php

declare(strict_types=1);

namespace WSPEC\publicPage\Views;

use WSPEC\publicPage\Models\Cart_Projects_Display_Model;

/**
 * Handles WooCommerce cart item display modifications for PIE editor projects.
 */
class Cart_Projects_Display_View
{
    private Cart_Projects_Display_Model $model;

    public function __construct()
    {
        $this->model = new Cart_Projects_Display_Model();
        
        add_filter('woocommerce_cart_item_thumbnail', [$this, 'change_project_thumbnail_in_cart'], 20, 2);
        add_filter('woocommerce_cart_item_name', [$this, 'add_edit_project_button_to_cart_item'], 10, 3);
        add_action('woocommerce_after_cart_item_name', [$this, 'render_project_data'], 15, 2);    
    }

    public function change_project_thumbnail_in_cart($image, $cart_item)
    {
        if (!empty($cart_item['_project_id'])) {
            $projectId = $cart_item['_project_id'];
            $apiKey    = get_option('wspie_api_key');
            $domain    = get_option('wspie_domain', 'https://deveditor.peleman.com');

            $url = $domain . '/editor/api/getprojectthumbnailAPI.php?' . http_build_query([
                'projectid'       => $projectId,
                'customerapikey'  => $apiKey,
            ]);

            $response = wp_remote_get($url);
            if (is_wp_error($response)) {
                return $image;
            }

            $body = wp_remote_retrieve_body($response);
            if (empty($body)) {
                return $image;
            }

            $base64 = base64_encode($body);
            return '<img src="data:image/jpeg;base64,' . esc_attr($base64) . '" class="attachment-woocommerce_thumbnail size-woocommerce_thumbnail" style="object-fit:cover;" />';
        }

        return $image;
    }

    public function add_edit_project_button_to_cart_item($product_name, $cart_item, $cart_item_key)
    {
        if (!empty($cart_item['_project_id'])) {
            // Check if this is a re-order item (has reorderid or reorderdate)
            $is_reorder = !empty($cart_item['reorderid']) || !empty($cart_item['reorderdate']);
            
            // Don't show edit button for re-order items
            if (!$is_reorder) {
                $project_id = $cart_item['_project_id'];
                $pieDomain  = get_option('wspie_domain');
                $pieApiKey  = get_option('wspie_api_key');
                $lang_code  = substr(get_locale(), 0, 2);
                $returnUrl  = wc_get_cart_url();

                $params = [
                    'lang'       => $lang_code,
                    'a'          => $pieApiKey,
                    'skip'       => 'true',
                    'returnurl'  => $returnUrl,
                ];

                $generator = new \WSPEC\includes\Generate_Editor_URL();
                $edit_url  = $generator->generate_url($pieDomain, $project_id, $params);

                $button = '<br><a href="' . esc_url($edit_url) . '" target="_blank" class="button" style="margin-top: 5px; font-size: 11px; background-color: #2D2A6C; border-color: #2D2A6C; color: #fff;">' . __('Edit your project', 'Peleman-Webshop-Package') . '</a>';

                return $product_name . $button;
            }
        }

        return $product_name;
    }

    /**
     * Render project data in cart (project reference, pages, costs)
     * 
     * @param array $cart_item Cart item data
     * @param string $cart_item_key Cart item key
     */
    public function render_project_data(array $cart_item, string $cart_item_key): void
    {		
        if (isset($cart_item['_project_id'])) {
            $product = $cart_item['data'];
            
            $old_reference = $cart_item['_project_reference'] ?? null;
            
            // Always fetch fresh project reference from API to ensure we have the latest data
            // This ensures that if project reference was changed in editor, it's reflected in cart
            $name = $this->model->get_project_reference($cart_item['_project_id']);
            
            if ($name) {
                
                // Update cart item data if it's different or if it's a new fetch
                if ($name !== $old_reference) {
                    WC()->cart->cart_contents[$cart_item_key]['_project_reference'] = $name;
                    WC()->cart->set_session();
                } else {
                    error_log("   ℹ️ Project reference unchanged: '{$name}'");
                }
            } else {
                error_log("   ❌ Failed to get project reference from API");
                // Fallback to cached value if API fails
                if ($old_reference) {
                    error_log("   ⚠️ Using cached value as fallback: '{$old_reference}'");
                    $name = $old_reference;
                }
            }

            if (!empty($name)) {
                ?>
                <div style='font-size: 12px;' class='cartReference' data-project-id="<?php echo esc_attr($cart_item['_project_id']); ?>" data-cart-key="<?php echo esc_attr($cart_item_key); ?>">
                    <b><?php echo __('Project reference','Peleman-Webshop-Package'); ?>:</b> <?php echo esc_html($name); ?>
                </div>
                <?php
            }

            // Display project pages and costs
            $pagesCount = $this->model->get_pageCount($cart_item);
            if ($pagesCount !== null) {
                $costs = $this->model->calculate_extra_page_costs($cart_item, $pagesCount);
                $freePages = $costs['freePages'];
                $totalExtraPrice = $costs['totalExtraPrice'];
                $priceSuffix = $product->get_price_suffix();

                if ($freePages > 0) {
                    if ($pagesCount > $freePages) {
                        echo "<div style='font-size: 12px;' class='pagesCount'><b>" . __('Project pages', 'Peleman-Webshop-Package') . ":</b> <span style='color: red;'>" . esc_html($pagesCount) . "</span> / " . esc_html($freePages) . "</div>";
                        echo "<div style='font-size: 12px;' class='pagesFee'><b>" . __('Project cost', 'Peleman-Webshop-Package') . ":</b> " . wp_kses_post(wc_price($totalExtraPrice)) . wp_kses_post($priceSuffix) . "</div>";
                    }
                }
            }

            // Get API data and handle quantity input visibility
            $apiData = $this->model->get_project_data_from_api($cart_item['_project_id']);
            
            if ($apiData && is_array($apiData)) {
                // Show breakdown if available
                if (isset($apiData['data']['breakdown']) && 
                    is_array($apiData['data']['breakdown']) && 
                    !empty($apiData['data']['breakdown'])) {
                    
                    echo "<div style='font-size: 12px; margin-top: 5px;' class='apiBreakdown'>";
                    echo "<b>" . __('Price breakdown', 'Peleman-Webshop-Package') . ":</b><br>";
                    
                    foreach ($apiData['data']['breakdown'] as $item) {
                        $desc = esc_html($item['desc'] ?? '');
                        $priceTotal = isset($item['pricetotal']) ? (float)$item['pricetotal'] : 0;
                        if (!empty($desc) && $priceTotal > 0) {
                            echo "<span style='font-size: 11px;'>" . $desc . ": " . wc_price($priceTotal) . "</span><br>";
                        }
                    }
                    echo "</div>";
                }
                
                // Check if API call was successful AND has actual data
                $apiSuccess = $apiData['success'] ?? false;
                $hasActualData = !empty($apiData['data']['totalPrice']) || 
                                 !empty($apiData['data']['breakdown']);
                
                // Store cart item info for JavaScript processing
                // Only hide quantity input if we have real pricing data from the API
                if ($apiSuccess === true && $hasActualData) {
                    
                    // Add data attributes to help JavaScript identify this cart item
                    echo "<script>
                        // Store cart item info for later processing
                        if (!window.wsppeCartItemsToHide) {
                            window.wsppeCartItemsToHide = [];
                        }
                        window.wsppeCartItemsToHide.push({
                            cartKey: '" . esc_js($cart_item_key) . "',
                            projectId: '" . esc_js($cart_item['_project_id']) . "',
                            projectName: '" . esc_js($name) . "'
                        });
                        console.log('[Editor Cart Display View] Added cart item to hide list:', '" . esc_js($cart_item_key) . "');
                    </script>";
                    
                } else {
                    if (!$apiSuccess) {
                        error_log('[Editor Cart Display View] API not successful, quantity input will remain visible');
                    } else {
                        error_log('[Editor Cart Display View] API successful but no pricing data (totalPrice or breakdown empty), quantity input will remain visible');
                    }
                }
            } else {
                error_log('[Editor Cart Display View] No API data received, quantity input will remain visible');
            }
        }
    }
}
