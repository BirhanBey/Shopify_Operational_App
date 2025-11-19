<?php
namespace WSPEC\publicPage\Controllers;

use WSPPE\adminPage\Models\Base_Custom_Meta;

class Product_Page_AddToCart_Label_Controller {

	public function __construct() {
		// For variations
		add_filter('woocommerce_available_variation', [$this, 'inject_custom_add_to_cart_label'], 10, 3);

		// For Simple products (in shop & product page context)
		add_filter('woocommerce_product_single_add_to_cart_text', [$this, 'inject_simple_add_to_cart_label'], 10, 1);
	}

	public function inject_custom_add_to_cart_label(array $variation_data, $variation): array {
		$variation_id = $variation_data['variation_id'] ?? 0;

		if (!$variation_id) {
			return $variation_data;
		}

		$variation_product = wc_get_product($variation_id);

		if (!$variation_product instanceof \WC_Product_Variation) {
			return $variation_data;
		}


		$base_meta = new Base_Custom_Meta($variation_product);
		$editor_id = $base_meta->get_editor_id();

		$custom_label = $base_meta->get_customAddToCartLabel();

		// 1. If there is no editor ID - Add to cart
		if (!$editor_id && empty($custom_label)) {
			$variation_data['custom_add_to_cart_label'] = __('Add to cart', 'woocommerce');
			return $variation_data;
		}

		// 2. If there is a variation-specific label
		if (!empty($custom_label)) {
			$variation_data['custom_add_to_cart_label'] = $custom_label;
			return $variation_data;
		}

		// 3. Label withdrawn from parent product
		$parent = wc_get_product($variation_product->get_parent_id());
		$parent_label = $parent ? $parent->get_meta('custom_add_to_cart_label') : '';

		if (!empty($parent_label)) {
			$variation_data['custom_add_to_cart_label'] = $parent_label;
			return $variation_data;
		}

		// 4. The latest fallback: WooCommerce default tag
		$variation_data['custom_add_to_cart_label'] = __('Add to cart', 'woocommerce');
		return $variation_data;
	}



	public function inject_simple_add_to_cart_label(string $label): string {
		global $product;

		if (!$product || !$product instanceof \WC_Product) {
			return $label;
		}

		if ($product->is_type('variable')) {
			return $label;
		}

		$base_meta = new Base_Custom_Meta($product);
		$editor_id = $base_meta->get_editor_id();


		// Only operate if the editor is defined
		if (empty($editor_id)) {
			return $label;
		}

		$custom_label = $base_meta->get_customAddToCartLabel();

		return !empty($custom_label) ? $custom_label : $label;
	}

}
