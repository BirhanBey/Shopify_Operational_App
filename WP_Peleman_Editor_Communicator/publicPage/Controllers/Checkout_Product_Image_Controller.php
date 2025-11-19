<?php

declare(strict_types=1);

namespace WSPEC\publicPage\Controllers;

/**
 * Class for adding product images to checkout review order table
 */
class Checkout_Product_Image_Controller
{
    public function __construct()
    {
        // Checkout review table'da ürün resimlerini eklemek için
        add_action('woocommerce_review_order_before_cart_contents', [$this, 'add_product_image_on_checkout'], 10, 3);        
        add_action('woocommerce_cart_item_name', [$this, 'add_product_image_on_checkout'], 10, 3);
    }

    function add_product_image_on_checkout(...$args)
    {		
        /* Check the number of arguments */
        if (count($args) < 3) {
            return $args[0]; // Return the name if not enough arguments
        }
		
        list($name, $cart_item, $cart_item_key) = $args;

        /* Return if not checkout page */
        if (!is_checkout()) {
            return $name;
        }

        $_product = apply_filters('woocommerce_cart_item_product', $cart_item['data'], $cart_item, $cart_item_key);
		$_project_id = $cart_item['_project_id'];

        $product_thumbnail = $_product->get_image();
		// $project_thumbnail = '';

		// Eğer project ID varsa, project thumbnail'ı al
		if (!empty($_project_id)) {
			$apiKey = get_option('wspie_api_key');
			$domain = get_option('wspie_domain', 'https://deveditor.peleman.com');
			
			$url = $domain . '/editor/api/getprojectthumbnailAPI.php?' . http_build_query([
				'projectid'       => $_project_id,
				'customerapikey'  => $apiKey,
			]);
			
			$response = wp_remote_get($url);
			
			if (!is_wp_error($response)) {
				$response_code = wp_remote_retrieve_response_code($response);
				
				if ($response_code === 200) {
					$body = wp_remote_retrieve_body($response);
					
					if (!empty($body)) {
						// Base64 encode the image data
						$base64 = base64_encode($body);
						$project_thumbnail = '<img src="' . $url . '" class="attachment-woocommerce_thumbnail size-woocommerce_thumbnail" style="width: 100px; height: auto; object-fit: cover;" />';
					} else {
					}
				} else {
				}
			} else {
			}
		}


		if(empty($_project_id) || empty($project_thumbnail))
		{
			$image = '<div class="ts-product-image" style="width: 100px; height: auto; display: inline-block; padding-right: 20px; vertical-align: middle;">'
            . $product_thumbnail .
            '</div>';
		}else {
			$image = '<div class="ts-product-image" style="width: 100px; height: auto; display: inline-block; padding-right: 20px; vertical-align: middle;">'
            . $project_thumbnail .
            '</div>';
		}
        

        /* Prepend image to name and return it */
        return $image . $name;
    }
}