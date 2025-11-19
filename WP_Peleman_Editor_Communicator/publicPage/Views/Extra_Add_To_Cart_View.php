<?php

declare(strict_types=1);

namespace WSPEC\publicPage\Views;

use WC_Product;

/**
 * View class for rendering the Extra Add to Cart Button
 * Handles HTML output and JavaScript functionality for the extra button
 */
class Extra_Add_To_Cart_View
{
    private static bool $script_rendered = false;

    /**
     * Render the extra add to cart button for a product
     * 
     * @param WC_Product $product The product to render the button for
     */
    public function render_button(WC_Product $product): void
    {
        $attributes = $this->get_button_attributes($product);
        $button_text = __('Add to cart', 'Peleman-Webshop-Package');

        echo '<button type="button" class="button extra-add-to-cart-button" ';
        
        foreach ($attributes as $attr => $value) {
            echo esc_attr($attr) . '="' . esc_attr($value) . '" ';
        }
        
        echo 'onclick="handleExtraAddToCart(this);" ';
        echo 'style="flex: 1; margin: 0; box-sizing: border-box; white-space: nowrap; cursor: pointer; display: none;" '; // Initially hidden
        echo 'data-requires-editor="true" '; // Mark that this button requires editor
        echo '>';
        echo esc_html($button_text);
        echo '</button>';

        // Render JavaScript only once per page
        if (!self::$script_rendered) {
            $this->render_javascript();
            self::$script_rendered = true;
        }
    }

    /**
     * Get button data attributes for the product
     * 
     * @param WC_Product $product The product object
     * @return array Array of HTML attributes
     */
    public function get_button_attributes(WC_Product $product): array
    {
        $product_id = $product->get_id();
        $variation_id = 0;

        // Handle variation ID for different product types
        if ($product->is_type('variable')) {
            // For variable products, variation will be selected via JavaScript
            $variation_id = 0;
        } elseif ($product->is_type('variation')) {
            $variation_id = $product_id;
        }

        return [
            'data-product-id' => $product_id,
            'data-variation-id' => $variation_id,
            'data-quantity' => 1,
        ];
    }

    /**
     * Render the JavaScript functionality for the extra button
     */
    public function render_javascript(): void
    {
        ?>
        <script type="text/javascript">
        jQuery(document).ready(function($) {
            const $extraButton = $('.extra-add-to-cart-button[data-requires-editor="true"]');
            
            // Function to toggle extra button visibility based on editorID
            function toggleExtraButton(variation) {
                if (variation && variation.editorID) {
                    if (variation.editorID === 'PIE') {
                        $extraButton.show();
                    } else {
                        $extraButton.hide();
                    }
                } else {
                    $extraButton.hide();
                }
            }
            
            // Listen for variation changes
            $('form.variations_form').on('found_variation', function(event, variation) {
                toggleExtraButton(variation);
            });
            
            // Listen for variation reset
            $('form.variations_form').on('reset_data', function() {
                $extraButton.hide();
            });
        });

        function handleExtraAddToCart(button) {
            let $thisButton = jQuery(button);
            let originalText = $thisButton.text();
            
            // Disable button during processing
            $thisButton.prop("disabled", true);
            $thisButton.addClass("wsppe-disabled");
            $thisButton.html('<span class="wsppe-loader"></span>Adding...');
            
            // Use form submit with hidden input to identify extra button
            let $form = jQuery("form.cart");
            
            if ($form.length) {
                // Add hidden input to identify this as extra button
                let extraButtonInput = $form.find("input[name='extra_add_to_cart_button']");
                
                if (extraButtonInput.length === 0) {
                    $form.append("<input type='hidden' name='extra_add_to_cart_button' value='1'>");
                }
                
                // For variable products, get selected variation
                let variationId = $form.find("input[name='variation_id']").val();
                
                if (variationId) {
                    $thisButton.attr('data-variation-id', variationId);
                }
                
                $form.submit();
            } else {
                alert("<?php echo esc_js(__('Form not found! Please try again.', 'Peleman-Webshop-Package')); ?>");
                
                // Re-enable button immediately on error
                $thisButton.prop("disabled", false);
                $thisButton.removeClass("wsppe-disabled");
                $thisButton.text(originalText);
            }
            
            // Re-enable button after a delay (fallback)
            setTimeout(function() {
                $thisButton.prop("disabled", false);
                $thisButton.removeClass("wsppe-disabled");
                $thisButton.text(originalText);
            }, 3000);
        }
        </script>
        <?php
    }
}