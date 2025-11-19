<?php

namespace WSPEC\publicPage\Models;

class Product_Page_Reference_Input_Model {

    public function get_variation_id(\WC_Product $product): int {
        $default_attributes = $product->get_default_attributes();

        foreach ($product->get_children() as $child_id) {
            $variation = wc_get_product($child_id);
            if (!$variation || !$variation->exists()) continue;

            $variation_attributes = $variation->get_attributes();

            foreach ($default_attributes as $attr_name => $attr_value) {
                if (!isset($variation_attributes[$attr_name]) || $variation_attributes[$attr_name] !== $attr_value) {
                    continue 2;
                }
            }
            return $child_id;
        }

        return 0;
    }

	public function should_show_input(int $variation_id): bool {
		$meta_value = get_post_meta($variation_id, 'use_project_reference', true);

		$meta_value_str = (string) $meta_value;

		return in_array($meta_value_str, ['1', 'yes', 'true'], true);
	}
}