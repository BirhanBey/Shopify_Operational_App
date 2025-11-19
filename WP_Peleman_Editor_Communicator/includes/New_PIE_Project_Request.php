<?php

declare(strict_types=1);

namespace WSPEC\includes;

use WSPEC\adminPage\Models\Editor_Custom_Meta;
use WSPPE\adminPage\Models\Base_Custom_Meta;
use WSPEC\includes\PIE_Project;
use WP_Error;
use WC_Tax;

class New_PIE_Project_Request
{
    private Editor_Custom_Meta $editor_data;
	private Base_Custom_Meta $product_data;
	
    private string $api_key;
    private string $customer_id;
    private string $domain;
    private string $method;
    private int $timeout = 10;

    private int $user_id = 0;
    private string $user_email = '';
    private string $language = 'en';
    private string $project_name = '';
    private string $return_url = '';
    private ?string $organisation_id = null;
    private ?string $organisation_apikey = '';
    private array $instructions = [];
    private array $params = [];
    private string $endpoint = '/editor/api/createprojectAPI.php';

    public function __construct()
    {
        $this->api_key = get_option('wspie_api_key', 'https://deveditor.peleman.com');
        $this->customer_id = get_option('wspie_customer_id', '');
        $this->domain = rtrim(get_option('wspie_domain', ''));
		
		$this->method = 'GET';
        
        error_log("=== PIE PROJECT CONSTRUCTOR ===");
        error_log("API Key from options: " . substr($this->api_key, 0, 20) . "...");
        error_log("Customer ID from options: " . $this->customer_id);
        error_log("Domain from options: " . $this->domain);
        error_log("Method: " . $this->method);
        error_log("=== PIE PROJECT CONSTRUCTOR END ===");
    }

    public function initialize_from_editor_meta(Editor_Custom_Meta $data): self
    {
        $this->editor_data = $data;
        return $this;
    }
	
	private function get_domain(): string
    {
        return $this->domain;
    }

    private function get_api_key(): string
    {
        return $this->api_key;
    }

    private function get_customer_id(): string
    {
        return $this->customer_id;
    }

    private function get_signed_url_token(): array
    {
        $payload = [
            'iss' => get_permalink(),
            'aud' => $this->domain,
            'sub' => $this->customer_id,
            'iat' => current_time('timestamp', true),
        ];

        $jwt = \Firebase\JWT\JWT::encode($payload, $this->api_key, 'HS256');
        return ['signature' => $jwt];
    }

    private function get_auth_header(): array
    {
        return ['PIEAPIKEY' => $this->api_key];
    }
	
	public function set_product_meta(Base_Custom_Meta $meta): self
    {
        $this->product_data = $meta;
        return $this;
    }
	
	final public function get_method(): string
    {
        return $this->method;
    }

    public function set_user_id(int $id): void
    {
        $this->user_id = $id;
    }

    public function set_user_email(string $email): void
    {
        $this->user_email = $email;
    }

    public function set_language(string $lang): void
    {
        $this->language = substr($lang, 0, 2);
    }

    public function set_project_name(string $name): void
    {
        $this->project_name = $name;
    }

    public function set_return_url(string $url): void
    {
        $this->return_url = $url;
    }

    public function set_organisation_id(?string $id): void
    {
        $this->organisation_id = $id;
    }

    public function set_organisation_apikey(?string $key): void
    {
        $this->organisation_apikey = $key;
    }

    public function getOrganisationApiKey(): string
    {
        return $this->organisation_apikey;
    }

    public function set_editor_instructions(string ...$args): void
    {
        $this->instructions = $args;
    }

    public function add_request_parameter(string $key, $value): void
    {
        $this->params[$key] = $value;
    }

    /**
     * Alias for get_formatId() to match expected method name in API layer.
     */
    public function get_format_id(): string
    {
        return $this->get_formatId();
    }

    /**
     * Alias for get_numPages(), used in API as 'amount'.
     */
    public function get_unit_amount(): int
    {
        return $this->get_numPages();
    }

    /**
     * Alias for get_default_page_amount(), used in API as 'includedpages'.
     */
    public function get_page_amount(): int
    {
        return $this->get_default_page_amount();
    }

    /**
     * Alias for get_price_per_extra_page(), used in API as 'page->price'.
     */
    public function get_cover_price_per_page(): float
    {
        return $this->get_price_per_extra_page();
    }

    /**
     * Optional: return base price as-is
     */
    public function get_base_price(): float
    {
        return $this->basePrice;
    }

    public function make_request(): PIE_Project
    {
        $url = rtrim($this->get_domain(), '/') . $this->endpoint;
		$headers = $this->get_auth_header();
		$timeout = $this->timeout;
        $body = $this->generate_request_body();
        
        error_log("=== PIE PROJECT REQUEST DEBUG ===");
        error_log("Domain: " . $this->get_domain());
        error_log("Customer ID: " . $this->get_customer_id());
        error_log("API Key: " . substr($this->get_api_key(), 0, 20) . "...");
        error_log("Full URL: " . $url);
        error_log("Method: " . $this->method);
        error_log("Headers: " . print_r($headers, true));
        error_log("Timeout: " . $timeout);
        error_log("Request Body: " . print_r($body, true));

        $response = wp_remote_request($url, [
			'method' => $this->method,
            'timeout' => $timeout,
            'headers' => $headers,
            'body'    => $body,
        ]);
		
        error_log("Raw API Response: " . print_r($response, true));

        if (is_wp_error($response)) {
            error_log("WP_Error detected: " . $response->get_error_message());
            error_log("WP_Error code: " . $response->get_error_code());
            throw new \Exception(__('Editor API connection failed.', 'peleman-webshop-package'));
        }

        $response_body = wp_remote_retrieve_body($response);
		$status_code = wp_remote_retrieve_response_code($response);
		$response_headers = wp_remote_retrieve_headers($response);
		
		error_log("Response Status Code: " . $status_code);
		error_log("Response Headers: " . print_r($response_headers, true));
        error_log("Response Body: " . $response_body);
        
        // Parse response to check success and extract projectid
        $decoded = json_decode($response_body, true);
        
        if (json_last_error() === JSON_ERROR_NONE) {
            // Check if API returned success: false
            if (isset($decoded['success']) && $decoded['success'] === false) {
                $error_message = isset($decoded['message']) ? $decoded['message'] : 'Unknown editor API error';
                error_log("Editor API Error: " . $error_message);
                throw new \Exception('Editor API Error: ' . $error_message);
            }
            
            // Extract projectid
            if (isset($decoded['data']['projectid'])) {
                $project_id = $decoded['data']['projectid'];
                error_log("Extracted projectid: " . $project_id);
            } elseif (isset($decoded['projectid'])) {
                $project_id = $decoded['projectid'];
                error_log("Extracted projectid (root): " . $project_id);
            } else {
                error_log("No projectid found in successful response");
                throw new \Exception('No project ID received from editor API');
            }
        } else {
        error_log("JSON parse error, response: " . $response_body);
            throw new \Exception('Invalid response from editor API');
        }
        
        error_log("=== PIE PROJECT REQUEST END ===");

        return new PIE_Project($this->editor_data, $project_id);
    }

    private function generate_request_body(): array
    {
		$price = $this->editor_data->get_price_per_extra_page();
        $basePrice = $this->editor_data->get_base_price(); 
		$tax_display_shop = get_option('woocommerce_tax_display_shop'); // incl or excl
		$prices_include_tax = get_option('woocommerce_prices_include_tax'); // yes or no
		$prices_include_tax = ($prices_include_tax == "no") ? "excl" : "incl";
		$tax_rates = WC_Tax::get_rates();
		$first_rate = reset($tax_rates); // Get the first element of the array
		$first_tax_rate = $first_rate['rate'];
		$pageAmount = $this->editor_data->get_default_page_amount();
		$symbol = get_woocommerce_currency_symbol();
		$locale = get_locale();
		$sheetsMax = $this->editor_data->get_sheetsmax();
		// Get F2D data if F2D plugin is active
		$f2dArtCode = '';
		$productUnitCode = $this->product_data ? $this->product_data->get_unitCode() : '';
		
		if ($this->product_data && 
			is_plugin_active('WP_Peleman_F2D_Communicator/WP_Peleman_F2D_Communicator.php') && 
			class_exists('\WSPF2DC\adminPage\Models\F2D_Custom_Meta')) {
			try {
				$f2d_meta = new \WSPF2DC\adminPage\Models\F2D_Custom_Meta($this->product_data->get_parent());
				$f2dArtCode = $f2d_meta->get_f2d_article_code();
			} catch (\Exception $e) {
				error_log('F2D_Custom_Meta initialization error: ' . $e->getMessage());
			}
		}
		$materialID = $this->editor_data->get_materialId();		
		$locale_info = localeconv();
		$decimal_point = $locale_info['decimal_point'];
		
        $request = [
			'customerid'            => $this->get_customer_id(),
            'templateid'        => $this->editor_data->get_templateId(),
			'designid'              => $this->editor_data->get_designId(),
			'backgroundid'          => $this->editor_data->get_backgroundId(),
			'colorcode'             => $this->editor_data->get_colorCode(),
            'formatid'          => $this->editor_data->get_formatId(),
            'projectname'       => $this->project_name,
            'returnurl'         => $this->return_url,
            'userid'            => $this->user_id,
            'useremail'         => $this->user_email,
            'lang'              => $this->language,
            'organisationid'    => $this->organisation_id,
            'a'                 => $this->organisation_apikey,
            'editorinstructions'=> array_merge($this->editor_data->get_enabled_instruction_keys(), $this->instructions),			
			'sheetsmax'				=> $sheetsMax,			
			'pricing'               => array(
											'base' => array('price' => $basePrice),
											'page' => array('price' => $price),
										),
			'tax_status'			=> array(
											'tax_display_frontend' => $tax_display_shop,
											'tax_display_backend' => $prices_include_tax,
											'tax_rate' => $first_tax_rate
										),
			'includedpages'         => $pageAmount,
			'currency'				=> array(
											'symbol' => $symbol,
											'locale' => $locale,
											'decimal' => $decimal_point
										),
			'personalisations'  	=> $this->editor_data->get_peleman_personalisation(),
			'amount'				=> $this->product_data->get_unitAmount(),
			'materialid'			=> $materialID,
			'f2d_article_code'		=> $f2dArtCode,
			'productUnitCode'		=> $productUnitCode,
			'v'						=> 2,
		];

        $request += $this->params;

        // error_log("PIE_Request_Body: " . print_r($request, true));
        return $request;
    }
}
