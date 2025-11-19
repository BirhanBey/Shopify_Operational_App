<?php

declare(strict_types=1);

namespace WSPEC\includes;

use WSPEC\adminPage\Controllers\Editor_Tab_Controller;
use WSPEC\adminPage\Controllers\Editor_Meta_Controller;
use WSPEC\adminPage\Controllers\Order_Download_Project_Controller;
use WSPEC\includes\Enqueue_Scripts;
use WSPEC\includes\Generate_Editor_URL;
use WSPEC\publicPage\Controllers\Product_Page_Reference_Input_Controller;
use WSPEC\publicPage\Controllers\Cart_Projects_Display_Controller;
use WSPEC\publicPage\Controllers\Product_Page_AddToCart_Label_Controller;
use WSPEC\publicPage\Controllers\My_Projects_Page_Controller;
use WSPEC\publicPage\Controllers\Modify_Cart_Price_From_Editor_Controller;
use WSPEC\publicPage\Controllers\Checkout_Product_Image_Controller;
use WSPEC\publicPage\Controllers\Extra_Add_To_Cart_Controller;
use WSPEC\publicPage\Controllers\Change_Mini_Cart_Thumbnail_Controller;
use WSPEC\publicPage\Views\Cart_Projects_Display_View;

class Plugin {

    public function __construct() {
        add_action('plugins_loaded', [$this, 'initialize_plugin']);
		add_action('plugins_loaded', function () {
		});
    }

    public function initialize_plugin() {
        $this->enqueue_editor_scripts();

		// In any case the public side should work because it is also required in the admin-ajax.php call
		$this->create_editor_communicator_public_classes();

		if (is_admin()) {
			$this->create_editor_communicator_admin_classes();
		}		
    }

	public function activate() {
		add_rewrite_endpoint('projects', EP_PAGES);
		flush_rewrite_rules();
	}

	

    private function enqueue_editor_scripts() {
        new Enqueue_Scripts();
    }

    public function create_editor_communicator_admin_classes() {
        new Editor_Meta_Controller();
        new Editor_Tab_Controller();
		new Order_Download_Project_Controller();
    }

    public function create_editor_communicator_public_classes() {
        new Generate_Editor_URL();
        new Product_Page_Reference_Input_Controller();    
		new Product_Page_AddToCart_Label_Controller();
		new My_Projects_Page_Controller();
		
		// Mini cart classes - load unconditionally for mini cart functionality (works on all pages)
		// Mini cart can appear on any page (header widget), so these must always be loaded
		new Change_Mini_Cart_Thumbnail_Controller();
		new Modify_Cart_Price_From_Editor_Controller();
		
		// Cart-related classes - only load on cart pages
		if ($this->is_cart_related()) {
			new Cart_Projects_Display_View();
			new Cart_Projects_Display_Controller();
		}
		
		// Checkout-related classes - only load on checkout pages
		if ($this->is_checkout_related()) {
			new Checkout_Product_Image_Controller();
		}
		
		// Product page controllers - only load on product pages
		if ($this->is_product_page()) {
			new Extra_Add_To_Cart_Controller();
		}
    }

	#region Control Functions
    /**
     * Check if current page is cart page or cart-related
     */
    private function is_cart_related(): bool {
        $current_url = home_url(add_query_arg([], $_SERVER['REQUEST_URI']));

        // Define the array of possible cart endpoints
        $cart_page_endpoints = [
            'cart/',
            'winkelmand/',
            'panier/',
            'einkaufswagen/',
            'carrito/'
        ];

        // Check if the current URL contains any cart endpoint
        foreach ($cart_page_endpoints as $cpendpoint) {
            if (strpos($current_url, $cpendpoint) !== false) {
//             if (strpos($current_url, $cpendpoint) !== false || strpos($current_url, $cpendpoint) !== 0) {
                return true;
            }        
        }

        return false;
    }

    /**
     * Check if current page is checkout page or checkout-related
     */
    private function is_checkout_related(): bool {
        $current_url = home_url(add_query_arg([], $_SERVER['REQUEST_URI']));

        // Define the array of possible checkout endpoints
        $checkout_page_endpoints = [
            'checkout/',
            'afronden/',
            'validation/',
            'zur-kasse/',
            'confirmar/'
        ];

        // Check if the current URL contains any checkout endpoint
        foreach ($checkout_page_endpoints as $checkoutPageEndpoint) {
            if (strpos($current_url, $checkoutPageEndpoint) !== false || strpos($current_url, $checkoutPageEndpoint) !== 0) {
                return true;
            }
        }

        return false;
    }

    /**
     * Check if current page is a product page
     */
    private function is_product_page(): bool {
        $current_url = $_SERVER['REQUEST_URI'] ?? '';

        // Define the array of possible product endpoints
        $product_page_endpoints = [
            'product/',
            'produit/',
            'produkt/',
            'producto/'
        ];

        // Check if the current URL matches any endpoint in the array
        foreach ($product_page_endpoints as $ppendpoint) {
		if (strpos($current_url, $ppendpoint) !== false) {
// 		if (strpos($current_url, $ppendpoint) !== false || strpos($current_url, $ppendpoint) !== 0) {
                return true;
            }
        }

        return false;
    }

}
