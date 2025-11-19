<?php

declare(strict_types=1);

namespace WSPEC\includes;

class Enqueue_Scripts {
    public function __construct(){
        add_action('admin_enqueue_scripts', [$this, 'load_admin_scripts']);	
    	add_action('wp_enqueue_scripts', [$this, 'enqueue_public_styles']);	
    	add_action('wp_enqueue_scripts', [$this, 'enqueue_public_scripts']);	
    }

    public function load_admin_scripts(): void
    {
        // Run only on admin pages and WooCommerce product edit page
        global $typenow;
        if ($typenow === 'product') {

            // Controle if the WP_Manager_Editor_Communicator plugin active
            include_once(ABSPATH . 'wp-admin/includes/plugin.php');
            if (is_plugin_active('WP_Peleman_Editor_Communicator/WP_Peleman_Editor_Communicator.php')) {

                wp_enqueue_script(
                    'editor-admin-js',
                    plugins_url('../assets/js/product_editor_settings.js', __FILE__),
                    ['jquery'],
            		(string)wp_rand(0, 2000),
                    true
                );
            }
        }
    }
	
	public function enqueue_public_styles() {
		// Only load FlipBook CSS on the "/my-account/orders/" endpoint using REQUEST_URI
		if (
			!isset($_SERVER['REQUEST_URI']) ||
			strpos($_SERVER['REQUEST_URI'], '/my-account/orders/') === false &&
			strpos($_SERVER['REQUEST_URI'], '/mein-account/Aufträge/') === false && // German
			strpos($_SERVER['REQUEST_URI'], '/mon-compte/Ordres/') === false &&    // French
			strpos($_SERVER['REQUEST_URI'], '/mi-cuenta/Pedidos/') === false &&       // Spanish
			strpos($_SERVER['REQUEST_URI'], '/account/orders/') === false &&          // English (alt)
			strpos($_SERVER['REQUEST_URI'], '/mijn-account/Bestellingen/') === false  // Dutch
		) {
			return;
		}
		// Custom CSS to override existing FlipBook styling
		wp_enqueue_style(
			'flipbook-custom-css',
			plugin_dir_url(__FILE__) . '../assets/css/flipbook.css',
			array(),
			null
		);
	}

	public function enqueue_public_scripts() {
		// Load cart quantity hiding script on cart page
		if (
			isset($_SERVER['REQUEST_URI']) &&
			(strpos($_SERVER['REQUEST_URI'], '/cart/') !== false ||
			strpos($_SERVER['REQUEST_URI'], '/winkelmand/') !== false ||
			strpos($_SERVER['REQUEST_URI'], '/panier/') !== false ||
			strpos($_SERVER['REQUEST_URI'], '/einkaufswagen/') !== false ||
			strpos($_SERVER['REQUEST_URI'], '/carrito/') !== false)
		) {
			wp_enqueue_script(
				'cart-quantity-hide-js',
				plugin_dir_url(__FILE__) . '../assets/js/hide-cart-quantity-input-for-customised-products.js',
				array(),
				'1.0.0',
				true
			);
		}
	}
}
