<?php

declare(strict_types=1);

namespace WSPEC\publicPage\Controllers;

use WSPEC\publicPage\Models\My_Projects_Page_Model;
use WSPEC\publicPage\Views\My_Projects_Page_View;

class My_Projects_Page_Controller
{
    private My_Projects_Page_Model $model;
    private My_Projects_Page_View $view;

    public function __construct()
    {
        $this->model = new My_Projects_Page_Model();
        $this->view  = new My_Projects_Page_View();

        add_action('init', [$this, 'register_projects_endpoint']);
        add_filter('query_vars', [$this, 'add_query_vars']);
        add_action('woocommerce_account_projects_endpoint', [$this, 'render_projects_page']);
		add_action('wp_enqueue_scripts', [$this, 'enqueue_scripts']);
		add_action('wp_ajax_handle_ajax_text_data', [$this, 'handle_ajax_text_data']);
		add_action('wp_ajax_nopriv_handle_ajax_text_data', [$this, 'handle_ajax_text_data']);
		add_action('wp_ajax_duplicate_project_button', [$this, 'duplicate_project_button']);
		add_action('wp_ajax_nopriv_duplicate_project_button', [$this, 'duplicate_project_button']);
		add_action('wp_ajax_check_variation_exists_for_edit', [$this, 'check_variation_exists_for_edit']);
		add_action('wp_ajax_nopriv_check_variation_exists_for_edit', [$this, 'check_variation_exists_for_edit']);
		// Cart check endpoint: is the same _project_id already in the cart?
		add_action('wp_ajax_check_project_in_cart', [$this, 'check_project_in_cart']);
		add_action('wp_ajax_nopriv_check_project_in_cart', [$this, 'check_project_in_cart']);
    }
	
	public function enqueue_scripts(): void
	{
		$projects_url = wc_get_account_endpoint_url('projects');
		$current_url = home_url(add_query_arg([], $_SERVER['REQUEST_URI']));
		$clean_url = home_url(parse_url($current_url, PHP_URL_PATH));

		if (untrailingslashit($clean_url) !== untrailingslashit($projects_url)) {
			return;
		}

		$js_base_path = plugin_dir_url(__FILE__) . '../../assets/js/';

		wp_enqueue_script(
			'wspec-my-projects-funcs',
			$js_base_path . 'wspec-my-projects-funcs.js',
			['jquery'],
            (string)wp_rand(0, 2000),
			true
		);

		wp_enqueue_script(
			'wspec-my-projects-add-to-cart',
			$js_base_path . 'wspec-my-projects-add-to-cart.js',
			['jquery'],
            (string)wp_rand(0, 2000),
			true
		);

		wp_localize_script(
			'wspec-my-projects-add-to-cart',
			'ajax_object',
			['ajaxurl' => admin_url('admin-ajax.php')]
		);

		// i18n strings for My Projects Add-to-Cart/Re-Order actions
		wp_localize_script(
			'wspec-my-projects-add-to-cart',
			'MyProjectsI18n',
			[
				'already_in_cart' => __('Already in Cart', 'Peleman-Webshop-Package'),
				'already_in_cart_title' => __('Already in Cart', 'Peleman-Webshop-Package'),
				'already_in_cart_detail' => __('This project already exists in your cart. You can proceed to the cart or remove it to re-order again.', 'Peleman-Webshop-Package'),
			]
		);
		
		
		wp_enqueue_script(
			'wspec-duplicate-project-button',
			$js_base_path . 'wspec-duplicate-project-button.js',
			['jquery'],
            (string)wp_rand(0, 2000),
			true
		);

		wp_localize_script(
			'wspec-duplicate-project-button',
			'Ajax_Duplicate_Project_Button_object',
			[
				'ajax_url' => admin_url('admin-ajax.php'),
				'nonce'    => wp_create_nonce('ajax_duplicate_project_button'),
			]
		);

		wp_enqueue_script(
			'wspec-my-projects-edit-your-project',
			$js_base_path . 'wspec-my-projects-edit-your-project.js',
			['jquery'],
            (string)wp_rand(0, 2000),
			true
		);

		// Reuse the same ajax_object for edit button as well (or create separate if needed)
		wp_localize_script(
			'wspec-my-projects-edit-your-project',
			'ajax_object',
			['ajaxurl' => admin_url('admin-ajax.php')]
		);
	}


    public function register_projects_endpoint(): void
    {
        add_rewrite_endpoint('projects', EP_PAGES);
    }

    public function add_query_vars(array $vars): array
    {
        $vars[] = 'organisationid';
        return $vars;
    }

    public function render_projects_page(): void
    {
        $projects = $this->model->get_user_projects();
        $ordered_project_ids = $this->model->log_user_orders();
        $counts = $this->model->get_project_counts($projects, array_keys($ordered_project_ids));

        $this->view->render_header();
        $this->view->render_filter_dropdown($counts);

        if (empty($projects)) {
            $this->view->render_empty_message();
            return;
        }

        $this->view->open_projects_container();

        foreach ($projects as $project) {
			$cardData = $this->model->build_project_card_data($project, $ordered_project_ids);
			echo $this->view->render_project_card($cardData);
		}

        $this->view->close_projects_container();
    }
	
	public function handle_ajax_text_data(): void
	{
		if (ob_get_length()) {
			ob_clean();
		}
		header('Content-Type: application/json');


		if (!isset($_POST['project_id'], $_POST['textData'])) {
			wp_send_json_error(['message' => 'Missing parameter']);
		}

		$project_id    = sanitize_text_field($_POST['project_id']);
		$variation_sku = sanitize_text_field($_POST['textData']);
		$quantity      = !empty($_POST['quantity']) ? wc_stock_amount((float)$_POST['quantity']) : 1;

		// 1. Get variation and product information from SKU
		$variation_id = wc_get_product_id_by_sku($variation_sku);
		$variation    = wc_get_product($variation_id);

		if (!$variation || !$variation->is_type('variation')) {
			error_log("❌ Variation not found or invalid type: {$variation_id}");
			wp_send_json_error([
				'message' => 'Variation no longer available',
				'title' => 'Product Variation Not Available',
				'detail' => 'We apologize, but this product variation is no longer available in the webshop. Please try creating a new product.'
			]);
		}

		$product      = wc_get_product($variation->get_parent_id());
		$product_id   = $product ? $product->get_id() : 0;

		if (!$product_id) {
			error_log("❌ Parent product not found");
			wp_send_json_error(['message' => 'Product not found']);
		}

		// 2. Project data is retrieved from API
		$domain                 = get_option('wspie_domain', '');
		$api_key                = get_option('wspie_api_key', '');
		$project_file_api_url  = $domain . "/editor/api/projectfileAPI.php?action=get&projectid={$project_id}&a={$api_key}";

		$response     = wp_remote_get($project_file_api_url);
		$body         = wp_remote_retrieve_body($response);
		$project_data = json_decode($body);

		if (is_wp_error($response)) {
			error_log("❌ API connection error: " . $response->get_error_message());
			wp_send_json_error(['message' => 'Project data not available']);
		}

		if (empty($project_data) || empty($project_data->name)) {
			error_log("❌ API JSON empty or missing 'name' field");
			wp_send_json_error(['message' => 'Project name not available']);
		}

		// 3. Cart meta & variation information
		$variation_attributes = wc_get_product_variation_attributes($variation_id);
		$item_meta = [
			'_project_reference' => $project_data->name,
			'_editor_id'         => 'PIE',
			'_project_id'        => $project_id,
		];

		// Add reorder information if available
		if (!empty($_POST['reorderid'])) {
			$item_meta['reorderid'] = sanitize_text_field($_POST['reorderid']);
		}

		if (!empty($_POST['reorderdate'])) {
			$order_date = sanitize_text_field($_POST['reorderdate']);
			// Ensure date is in Y-m-d format
			if (strlen($order_date) > 10) {
				$date_obj = \DateTime::createFromFormat('Y-m-d H:i:s', $order_date);
				if ($date_obj) {
					$order_date = $date_obj->format('Y-m-d');
				} elseif (strpos($order_date, 'T') !== false) {
					// Handle ISO 8601 format
					$date_obj = \DateTime::createFromFormat(\DateTime::ISO8601, $order_date);
					if ($date_obj) {
						$order_date = $date_obj->format('Y-m-d');
					}
				}
			}
			// If already in Y-m-d format or could not parse, use as is
			$item_meta['reorderdate'] = $order_date;
		}

		// 4. Add to cart
		// 3.5 Guard: prevent adding if the same project already exists in cart (race-condition safe)
		$cart_items = WC()->cart ? WC()->cart->get_cart() : [];
		if (!empty($cart_items)) {
			foreach ($cart_items as $cart_item_key => $cart_item) {
				$existing_project_id = $cart_item['_project_id'] ?? '';
				if (!empty($existing_project_id) && (string)$existing_project_id === (string)$project_id) {
					error_log("❌ [ADD TO CART] Blocked — same project already in cart: {$project_id}");
					wp_send_json_error([
						'message' => 'Project already in cart',
						'title' => 'Already in Cart',
						'detail' => 'This project already exists in your cart. You can proceed to the cart or remove it to re-order again.'
					]);
				}
			}
		}

		$added = WC()->cart->add_to_cart(
			$product_id,
			$quantity,
			$variation_id,
			$variation_attributes,
			$item_meta
		);

		if (!$added) {
			error_log("❌ Add to cart failed");
			wp_send_json_error(['message' => 'Add to cart failed']);
		}

		// 5. Redirect URL
		$return_url = $project_data->returnurl ?? wc_get_cart_url();

		// If the organisationid parameter exists but is empty, remove it from the URL
		if (strpos($return_url, 'organisationid=') !== false) {
			$parsed_url = parse_url($return_url);
			$query = [];

			if (!empty($parsed_url['query'])) {
				parse_str($parsed_url['query'], $query);

				// If there is an empty organisationid, take it out
				if (isset($query['organisationid']) && empty($query['organisationid'])) {
					unset($query['organisationid']);

					// Ycreate new query string
					$new_query = http_build_query($query);

					// Create new URL
					$base_url = $parsed_url['scheme'] . '://' . $parsed_url['host'] . $parsed_url['path'];
					$return_url = $new_query ? $base_url . '?' . $new_query : $base_url;
				}
			}
		}

		wp_send_json_success([
			'message'     => 'Successfully added',
			'project_id'  => $project_id,
			'return_url'  => $return_url
		]);

		wp_die(); 
	}

	public function check_variation_exists_for_edit(): void
	{
		if (ob_get_length()) {
			ob_clean();
		}
		header('Content-Type: application/json');

		if (!isset($_POST['project_id']) || !isset($_POST['variation_sku'])) {
			wp_send_json_error([
				'message' => 'Missing parameters',
				'title' => 'Validation Error',
				'detail' => 'Project ID and variation SKU are required.'
			]);
		}

		$project_id = sanitize_text_field($_POST['project_id']);
		$variation_sku = sanitize_text_field($_POST['variation_sku']);

		// Check if SKU is empty
		if (empty($variation_sku) || trim($variation_sku) === '') {
			wp_send_json_error([
				'message' => 'SKU not found',
				'title' => 'Product Variation Not Available',
				'detail' => 'We apologize, but this product variation is no longer available in the webshop. Please try creating a new product.'
			]);
		}

		// Get variation ID from SKU (same logic as handle_ajax_text_data)
		$variation_id = wc_get_product_id_by_sku($variation_sku);
		$variation = wc_get_product($variation_id);

		if (!$variation || !$variation->is_type('variation')) {
			wp_send_json_error([
				'message' => 'Variation no longer available',
				'title' => 'Product Variation Not Available',
				'detail' => 'We apologize, but this product variation is no longer available in the webshop. Please try creating a new product.'
			]);
		}
		
		wp_send_json_success([
			'message' => 'Variation exists',
			'variation_exists' => true,
			'variation_id' => $variation_id
		]);

		wp_die();
	}

	public function duplicate_project_button()
	{
		if (ob_get_length()) {
			ob_clean();
		}
		header('Content-Type: application/json');

		if (!isset($_POST['nonce']) || !wp_verify_nonce($_POST['nonce'], 'ajax_duplicate_project_button')) {
			error_log('❌ NONCE ERROR');
			wp_send_json_error(['message' => 'Nonce error']);
		}

		$data = [
			'project_id'     => sanitize_text_field($_POST['project_id'] ?? ''),
			'product_id'     => sanitize_text_field($_POST['product_id'] ?? ''),
			'variation_id'   => sanitize_text_field($_POST['variation_id'] ?? ''),
			'organisation_id'=> sanitize_text_field($_POST['organisation_id'] ?? ''),
		];

		// Check if variation still exists in webshop
		if (empty($data['variation_id']) || $data['variation_id'] === '0' || $data['variation_id'] === '') {
			// Variation ID is missing
			wp_send_json_error([
				'message' => 'Variation ID missing',
				'title' => 'Product Variation Not Available',
				'detail' => 'We apologize, but this product variation is no longer available in the webshop. Please try creating a new product.'
			]);
		}
		
		$variation = wc_get_product((int)$data['variation_id']);
		
		if (!$variation || !$variation->is_type('variation')) {
			// Variation no longer exists in webshop
			wp_send_json_error([
				'message' => 'Variation no longer available',
				'title' => 'Product Variation Not Available',
				'detail' => 'We apologize, but this product variation is no longer available in the webshop. Please try creating a new product.'
			]);
		}

		$url = $this->model->generate_duplicate_project_url($data);

		if ($url) {
			wp_send_json_success([
				'message' => 'Redirect URL created',
				'redirect_url' => $url
			]);
		} else {
			wp_send_json_error(['message' => 'Failed to generate URL']);
		}
	}

	public function check_project_in_cart(): void
	{
		if (ob_get_length()) {
			ob_clean();
		}
		header('Content-Type: application/json');

		$project_id = isset($_POST['project_id']) ? sanitize_text_field($_POST['project_id']) : '';
		if (empty($project_id)) {
			wp_send_json_error(['message' => 'Missing project_id']);
		}

		$exists = false;
		$cart_items = WC()->cart ? WC()->cart->get_cart() : [];
		if (!empty($cart_items)) {
			foreach ($cart_items as $cart_item_key => $cart_item) {
				$existing_project_id = $cart_item['_project_id'] ?? '';
				if (!empty($existing_project_id) && (string)$existing_project_id === (string)$project_id) {
					$exists = true;
					break;
				}
			}
		}

		wp_send_json_success([
			'exists' => $exists,
		]);

		wp_die();
	}
}