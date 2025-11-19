<?php

declare(strict_types=1);

namespace WSPEC\publicPage\Controllers;

use WSPPE\adminPage\Models\Base_Custom_Meta;
use WSPEC\publicPage\Views\Extra_Add_To_Cart_View;
use WC_Product;

/**
 * Controller for Extra Add to Cart Button functionality
 * Handles the logic for displaying extra add to cart buttons on products
 * that have the add2cart_always meta field set to "yes"
 */
class Extra_Add_To_Cart_Controller
{
    private Extra_Add_To_Cart_View $view;

    public function __construct()
    {
        $this->view = new Extra_Add_To_Cart_View();
        $this->init();
    }

    /**
     * Initialize WordPress hooks
     */
    public function init(): void
    {
        add_action('woocommerce_after_add_to_cart_button', [$this, 'render_extra_button'], 10);
    }

    /**
     * Render the extra add to cart button if conditions are met
     */
    public function render_extra_button(): void
    {
        global $product;

        if (!$this->should_show_button($product)) {
            return;
        }

        $this->view->render_button($product);
    }

    /**
     * Determine if the extra button should be displayed
     * 
     * @param mixed $product The product object (could be null or not WC_Product)
     * @return bool True if button should be shown, false otherwise
     */
    private function should_show_button($product): bool
    {
        // Validate product object
        if (!$product instanceof WC_Product) {
            return false;
        }

        // Check if product has add2cart_always meta set to "yes"
        try {
            $productMeta = new Base_Custom_Meta($product);
            return $productMeta->has_add2cart_always();
        } catch (\Exception $e) {
            error_log('Extra_Add_To_Cart_Controller: Error checking product meta - ' . $e->getMessage());
            return false;
        }
    }
}