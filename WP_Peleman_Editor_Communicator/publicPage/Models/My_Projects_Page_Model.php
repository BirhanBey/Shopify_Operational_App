<?php

declare(strict_types=1);

namespace WSPEC\publicPage\Models;

use WC_Product_Variation;
// use WSPEC\publicPage\Views\Cart_Projects_Display_View;
use WP_User;

class My_Projects_Page_Model
{
	public function get_user_projects(): array
	{
		$user = wp_get_current_user();

		$API_keys = [
			'layflat' => get_option('wspie_layflat_api_key'),
			'printin' => get_option('wspie_printin_api_key'),
			'printcovers' => get_option('wspie_printcovers_api_key'),
			'editor' => self::check_organisation(),
		];

		$projects = [];

		if ($user->user_email) {
			foreach ($API_keys as $key => $API_key) {
				if (!empty($API_key)) {
					$url = get_option('wspie_domain') . '/editor/api/projectAPI.php?user=' . urlencode($user->user_email) . '&action=getuserdata&a=' . $API_key;

					$response = wp_remote_get($url, ['sslverify' => true]);

					if (!is_wp_error($response)) {
						$body = wp_remote_retrieve_body($response);
						$decoded = json_decode($body, true);

						if (is_array($decoded) && !empty($decoded)) {
							$projects = array_merge($projects, $decoded);
						}
					}
				}
			}
		}

		// Sorting process
		usort($projects, function ($a, $b) {
			$dateA = \DateTime::createFromFormat('Y-m-d H:i', $a['createdate'] ?? '0000-00-00 00:00');
			$dateB = \DateTime::createFromFormat('Y-m-d H:i', $b['createdate'] ?? '0000-00-00 00:00');
			return $dateB <=> $dateA; // Yeniden eskiye
		});

		return $projects;
	}

	
	public static function check_organisation(){
		if (isset($_GET['check_organisation']) && wp_verify_nonce($_GET['check_organisation'], 'check_organisation')) {}
		
        if(isset($_GET['organisationid']) || !empty($_GET['organisationid'])){
            $key = self::get_organisation_apikey();
        }else{
            $key =  get_option('wspie_api_key');
        }
        return $key;
    }
	
	public static function get_organisation_id(){
		if (isset($_GET['get_organisation_id']) && wp_verify_nonce($_GET['get_organisation_id'], 'get_organisation_id')) {}
		
		if( isset($_GET['organisationid'])){
            return $_GET['organisationid'];
        };
	}
	
	public static function get_organisation_apikey(){       
		// Build a query and search an organisation with organisation_editor_id
		$query = new \WP_Query( array (
			'post_type'              => array( 'organisation' ),
			'post_status'            => array( 'publish' ),
			'meta_query'             => array( array('key' => '_organisation_editor_id', 'value' => self::get_organisation_id()),
			),
		) );
 
		// Loop over the query and see if there is a post that matches
		if ( $query->have_posts() ) {
 
			// If there is post, return the ID of post
			while ( $query->have_posts() ) {
				$query->the_post();
				return get_post_meta( get_the_ID(), '_organisation_apikey', true );
				break;
			}
		}
	}

    public function get_user_orders(): array
    {
        return wc_get_orders([
            'customer_id' => get_current_user_id(),
            'limit' => -1,
        ]);
    }

    public function get_variation_sku_by_id(int $variation_id): string
    {
        $variation = new WC_Product_Variation($variation_id);
        return $variation->get_sku();
    }

    public function generate_thumbnail_url(string $projectId): string
    {
        $domain = get_option('wspie_domain');
        $api_key = get_option('wspie_api_key', '');

        return $domain . "/editor/api/getprojectthumbnailAPI.php" . '?' . http_build_query([
            'projectid' => $projectId,
            'customerapikey' => $api_key,
        ]);
    }

    public function generate_preview_url(string $projectId, string $lang = 'en'): string
    {
        $api_key = get_option('wspie_api_key');
        $domain = get_option('wspie_domain', '');

        return $domain . "/editor/api/getfile.php?projectid={$projectId}&lang={$lang}&a={$api_key}&file=preview";
    }

    public function log_user_orders(): array
    {
        $orders = $this->get_user_orders();
        $details = [];

        foreach ($orders as $order) {
            foreach ($order->get_items() as $item) {
                $project_id = $item->get_meta('_project_id');
                $product_id = $item->get_product_id();
                $variation_id = $item->get_variation_id();

                if ($project_id) {
                    $details[$project_id] = [
                        'product_id' => $product_id,
                        'variation_id' => $variation_id ?: null,
                        'order_id' => $order->get_id(),
                        'order_date' => $order->get_date_created()->format('Y-m-d'),
                    ];

                if ($variation_id > 0) {
                    $details[$project_id]['ordered_project_sku'] = $this->get_variation_sku_by_id($variation_id);
                }
            }
        }
    }

    return $details;
}
	
	public function get_project_ids_from_orders(): array
	{
		$orders = $this->get_user_orders();
		$project_ids = [];

		foreach ($orders as $order) {
			foreach ($order->get_items() as $item) {
				$project_id = $item->get_meta('_project_id');
				if ($project_id) {
					$project_ids[] = $project_id;
				}
			}
		}

		return array_unique($project_ids); // Remove unnecessary repetitions
	}
	
	public function get_project_counts(array $projects, array $ordered_project_ids): array
	{
		$counts = [
			'all' => 0,
			'ordered' => 0,
			'layflat' => 0,
			'printin' => 0,
			'printcovers' => 0,
			'deleted' => 0,
		];

		foreach ($projects as $project) {
			$customerid = $project['customerid'] ?? '';
			$deleted = $project['deleted'] ?? '0';
			$isDeleted = in_array($deleted, ['1', '2']);
			$isOrdered = !empty($project['projectid']) && in_array($project['projectid'], $ordered_project_ids, true);

			if ($isDeleted) {
				$counts['deleted']++;
				continue; // Deleted ones are not included in other groups
			}

			$counts['all']++;

			if ($isOrdered) {
				$counts['ordered']++;
			}

			if ($customerid === 'layflat') {
				$counts['layflat']++;
			} elseif ($customerid === 'printin') {
				$counts['printin']++;
			} elseif ($customerid === 'printcovers') {
				$counts['printcovers']++;
			}
		}

		return $counts;
	}



    public function build_project_card_data(array $project, array $ordered_project_ids): array
    {
        $projectId = $project['projectid'] ?? '';
		$createdate = $project['createdate'] ?? '';
        $projectName = $project['name'] ?? __('Unnamed Project', 'Peleman-Webshop-Package');
        $isOrdered = in_array($projectId, array_keys($ordered_project_ids), true);

        $sku = '';
        if ($isOrdered && isset($ordered_project_ids[$projectId]['ordered_project_sku'])) {
            $sku = $ordered_project_ids[$projectId]['ordered_project_sku'];
        }

        $domain = get_option('wspie_domain');
        $pieApiKey = get_option('wspie_api_key');
        $layflatKey = get_option('wspie_layflat_api_key');
        $printinKey = get_option('wspie_printin_api_key');
        $printcoversKey = get_option('wspie_printcovers_api_key');

        $customerId = $project['customerid'] ?? '';
        $organisationId = self::get_organisation_id();
        $lang = substr(get_locale(), 0, 2);
        $cartUrl = wc_get_cart_url();
        $returnUrl = !empty($organisationId)
            ? add_query_arg('organisationid', $organisationId, home_url('/my-account/projects/'))
            : home_url(add_query_arg(null, null));

        $licensedKey = match($customerId) {
            'layflat' => $layflatKey,
            'printin' => $printinKey,
            'printcovers' => $printcoversKey,
            default => '',
        };

        $apiKeyToUse = !empty($licensedKey) ? $licensedKey : $pieApiKey;

        $edit_url = $domain . "?projectid={$projectId}&lang={$lang}&a={$apiKeyToUse}&skip=true&returnurl=" . urlencode($returnUrl);

        return [
            'id' => $projectId,
			'createdate' => $createdate,
            'name' => $projectName,
            'preview_url' => $this->generate_preview_url($projectId),
            'thumbnail_url' => $this->generate_thumbnail_url($projectId),
            'is_ordered' => $isOrdered,
            'sku' => $sku,
            'editor' => strtolower($project['customerid'] ?? 'editor'),
            'deleted' => $project['deleted'] ?? '0',
            'status' => $isOrdered ? 'Ordered' : 'Unordered',
            'edit_url' => $edit_url,
    		'customerid' => $project['customerid'],
            'edit_button_data' => [
                'licensed_key' => $apiKeyToUse,
                'domain' => $domain,
                'apikey' => $apiKeyToUse,
            ],
            'download_button_data' => [
                'enabled' => $customerId !== 'pelemancom',
                'domain' => $domain,
                'apikey' => $pieApiKey,
                'licensed_key' => $apiKeyToUse,
                'organisation_id' => $organisationId,
                'cart_url' => $cartUrl,
            ],
            'reorder_button_data' => [
                'enabled' => $customerId === 'pelemancom' && $isOrdered,
                'sku' => $sku,
                'domain' => $domain,
                'apikey' => $pieApiKey,
                'cart_url' => $cartUrl,
				'id'=> "reorder_button",
                'order_id' => $isOrdered && isset($ordered_project_ids[$projectId]['order_id']) ? $ordered_project_ids[$projectId]['order_id'] : '',
                'order_date' => $isOrdered && isset($ordered_project_ids[$projectId]['order_date']) ? $ordered_project_ids[$projectId]['order_date'] : '',
            ],
            'add_to_cart_button_data' => [
                'enabled' => !$isOrdered && $customerId === 'pelemancom',
                'domain' => $domain,
                'apikey' => $pieApiKey,
                'cart_url' => $cartUrl,
                'organisation_id' => $organisationId,
    			'id' => 'addtocart_button',
            ],
            'duplicate_button_data' => [
                'enabled' => $isOrdered,
                'organisation_id' => $organisationId,
                'product_id' => $ordered_project_ids[$projectId]['product_id'] ?? '',
                'variation_id' => $ordered_project_ids[$projectId]['variation_id'] ?? '',
            ],
        ];
    }
	
	public function generate_duplicate_project_url(array $data): ?string
	{
		$project_id     = $data['project_id'] ?? '';
		$product_id     = $data['product_id'] ?? '';
		$variation_id   = $data['variation_id'] ?? '';
		$organisation_id = $data['organisation_id'] ?? '';
		$api_key        = get_option('wspie_api_key', '');
		$domain         = get_option('wspie_domain', '');
		$transient_id   = uniqid('wsppeproj_');

		// API call: Duplicate project
		$duplicate_api = "{$domain}/editor/api/projectAPI.php?action=duplicateProject&projectid=" . urlencode($project_id) . "&a=" . urlencode($api_key) . "&transientId=" . $transient_id;

		$response = wp_remote_get($duplicate_api);
		if (is_wp_error($response)) return null;

		$body = wp_remote_retrieve_body($response);
		$data = json_decode($body, true);

		if (!isset($data['projectid'])) return null;

		$duplicated_project_id = $data['projectid'];
		$return_url = wc_get_cart_url() . '?CustProj=' . $transient_id;

		if ($organisation_id) {
			$return_url = home_url("/my-account/projects/?organisationid={$organisation_id}");
		}

		$params = [
			'lang'       => 'en',
			'a'          => $api_key,
			'skip'       => 'true',
			'returnurl'  => $return_url,
		];

		// Basket data is stored transiently
		$items_data = [
			'product_id'    => $product_id,
			'variation_id'  => $variation_id,
			'quantity'      => 1,
			'item_meta'     => [
				'_project_id' => $duplicated_project_id,
				'_editor_id' => 'PIE',
			],
		];
		set_transient($transient_id, $items_data, 30 * 86400);

		// PIE edit URL generation
		$edit_url = add_query_arg($params, "{$domain}/?projectid={$duplicated_project_id}");

		return $edit_url;
	}
}