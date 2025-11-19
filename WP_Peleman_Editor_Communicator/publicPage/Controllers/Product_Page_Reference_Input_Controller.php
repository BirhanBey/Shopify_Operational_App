<?php

namespace WSPEC\publicPage\Controllers;

use WC_Product;
use WSPEC\publicPage\Models\Product_Page_Reference_Input_Model;
use function WSPEC\publicPage\Views\render_project_reference_input;
use function WSPEC\publicPage\Views\render_project_reference_input2;
use WSPEC\adminPage\Models\Editor_Custom_Meta;

require_once plugin_dir_path(__FILE__) . '/../Models/Product_Page_Reference_Input_Model.php';
require_once plugin_dir_path(__FILE__) . '/../Views/Project_Reference_Input_View.php';

class Product_Page_Reference_Input_Controller {

    private Product_Page_Reference_Input_Model $model;

    public function __construct() {
        $this->model = new Product_Page_Reference_Input_Model();
        add_action('wp_enqueue_scripts', [$this, 'enqueue_scripts']);		
		add_filter('woocommerce_available_variation', [$this, 'inject_reference_meta'], 10, 3);
    }

	public function enqueue_scripts(): void {
		if (!is_product()) {
			return;
		}

		wp_enqueue_script(
			'product-page-reference-input',
			plugin_dir_url(__FILE__) . '../../assets/js/product_page_reference_input.js',
			['jquery'],
			'1.0',
			true
		);

		wp_localize_script('product-page-reference-input', 'ProjectReferenceAjax', [
			'ajax_url' => admin_url('admin-ajax.php'),
			'nonce'    => wp_create_nonce('project_reference_nonce')
		]);
	}
    
	public function inject_reference_meta(array $variation_data, $variation): array {
		// WooCommerce's correct variation ID already comes in variation_data
		$variation_id = $variation_data['variation_id'] ?? 0;

		if (!$variation_id) {
			error_log("❌ variation_id not received!");
			return $variation_data;
		}

		$variation_product = wc_get_product($variation_id);

		if (!$variation_product || !$variation_product instanceof \WC_Product_Variation) {
			error_log("⚠️ Invalid WC_Product_Variation ID: {$variation_id}");
			return $variation_data;
		}

		// Get use_project_reference via meta class
		$meta = new \WSPEC\adminPage\Models\Editor_Custom_Meta($variation_product);
		$use_reference = $meta->get_useProjectReference();
		$editorID = $meta -> get_editorId();
		$variation_data['use_project_reference'] = $use_reference;		
		$variation_data['editorID'] = $editorID;

		// If input is to be shown, also add HTML from the view file
		if ($use_reference) {
			$variation_data['reference_input_html'] = \WSPEC\publicPage\Views\render_project_reference_input();
		}
		
		return $variation_data;
	}
}
