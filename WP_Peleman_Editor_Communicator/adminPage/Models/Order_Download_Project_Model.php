<?php

declare(strict_types=1);

namespace WSPEC\adminPage\Models;

/**
 * Model for handling project data and download functionality in WooCommerce orders
 */
class Order_Download_Project_Model
{
    private string $domain;
    private string $api_key;

    public function __construct()
    {
        $this->domain = get_option('wspie_domain', '');
        $this->api_key = get_option('wspie_api_key', '');
    }

    /**
     * Get project data from order item
     */
    public function get_project_data_from_order_item(\WC_Order_Item $item): ?array
    {
        try {
            // Get project ID from order item meta
            $project_id = $item->get_meta('_project_id', true);
            
            if (empty($project_id)) {
                error_log('[Order_Download_Project_Model] No project ID found in order item meta');
                return null;
            }
            
            // Get product data
            $product = $item->get_product();
            if (!$product) {
                error_log('[Order_Download_Project_Model] No product found for order item');
                return null;
            }
            
            // Get customer ID (organisation ID)
            $customer_id = $this->get_customer_id_from_product($product);
            
            return [
                'project_id' => $project_id,
                'customer_id' => $customer_id,
                'product_id' => $product->get_id(),
                'product_name' => $product->get_name(),
                'domain' => $this->domain,
                'api_key' => $this->api_key
            ];
            
        } catch (\Exception $e) {
            error_log('[Order_Download_Project_Model] Error in get_project_data_from_order_item: ' . $e->getMessage());
            return null;
        }
    }

    /**
     * Check if download is enabled for this project
     */
    public function is_download_enabled(array $project_data): bool
    {
        // Check if domain and API key are set
        if (empty($this->domain) || empty($this->api_key)) {
            error_log('[Order_Download_Project_Model] Domain or API key not set');
            return false;
        }
        
        // Check if project ID exists
        if (empty($project_data['project_id'])) {
            error_log('[Order_Download_Project_Model] No project ID in project data');
            return false;
        }
        
        // Check if customer ID is not 'pelemancom' (same logic as my projects page)
        if ($project_data['customer_id'] === 'pelemancom') {
            error_log('[Order_Download_Project_Model] Download disabled for pelemancom customer');
            return false;
        }
        
        return true;
    }

    /**
     * Generate download URL for the project
     */
    public function generate_download_url(array $project_data): string
    {
        $endpoint = $this->domain . '/editor/api/getfile.php';
        
        $params = [
            'projectid' => $project_data['project_id'],
            'file' => 'printfiles',
            'a' => $this->api_key
        ];
        
        $download_url = $endpoint . '?' . http_build_query($params);
        
        return $download_url;
    }

    /**
     * Generate thumbnail URL for the project
     */
    public function generate_thumbnail_url(string $project_id): string
    {
        $domain = get_option('wspie_domain', '');
        $api_key = get_option('wspie_api_key', '');
        
        if (empty($domain) || empty($api_key)) {
            error_log('[Order_Download_Project_Model] Domain or API key not set for thumbnail');
            return '';
        }
        
        $thumbnail_url = $domain . "/editor/api/getprojectthumbnailAPI.php" . '?' . http_build_query([
            'projectid' => $project_id,
            'customerapikey' => $api_key,
        ]);
        
        return $thumbnail_url;
    }

    /**
     * Get project status from editor API
     */
    public function get_project_status(string $project_id): array
    {
        try {
            if (empty($this->domain) || empty($this->api_key)) {
                error_log('[Order_Download_Project_Model] Domain or API key not set for status check');
                return ['status' => 'error', 'eta' => ''];
            }
            
            // Simple API call to check project status
            $status_url = $this->domain . '/editor/api/getqueues.php?' . http_build_query([
                'customerapikey' => $this->api_key,
                'projectid' => $project_id,
                'outputtype' => 'print'
            ]);
            
            $response = wp_remote_get($status_url);
            
            if (is_wp_error($response)) {
                error_log('[Order_Download_Project_Model] API request failed: ' . $response->get_error_message());
                return ['status' => 'error', 'eta' => ''];
            }
            
            $body = wp_remote_retrieve_body($response);
            
            if (empty($body)) {
                error_log('[Order_Download_Project_Model] Response body is empty!');
                return ['status' => 'error', 'eta' => ''];
            }
            
            $queue_data = json_decode($body, true);
            
            if (json_last_error() !== JSON_ERROR_NONE) {
                error_log('[Order_Download_Project_Model] JSON decode error: ' . json_last_error_msg());
                return ['status' => 'error', 'eta' => ''];
            }
            
            // API response has structure: {"data": [...]}
            if (isset($queue_data['data']) && is_array($queue_data['data'])) {
                $queue_data = $queue_data['data'];
            }
            
            if (!empty($queue_data) && is_array($queue_data)) {
                $last_queue_item = end($queue_data);
                
                $status = $last_queue_item['status'] ?? '';
                $eta = $last_queue_item['renderenddate'] ?? '';
                
                return [
                    'status' => $status,
                    'eta' => $eta
                ];
            }
            
            return ['status' => 'unset', 'eta' => ''];
            
        } catch (\Exception $e) {
            error_log('[Order_Download_Project_Model] Error getting project status: ' . $e->getMessage());
            return ['status' => 'error', 'eta' => ''];
        }
    }

    /**
     * Get customer ID from product meta
     */
    private function get_customer_id_from_product($product): string
    {
        try {
            // Try to get customer ID from product meta
            $customer_id = $product->get_meta('_customer_id', true);
            
            if (empty($customer_id)) {
                // Fallback: try to get from product name or other meta
                $customer_id = $product->get_meta('customerid', true);
            }
            
            if (empty($customer_id)) {
                // Default fallback
                $customer_id = 'default';
            }
            
            return $customer_id;
            
        } catch (\Exception $e) {
            error_log('[Order_Download_Project_Model] Error getting customer ID: ' . $e->getMessage());
            return 'default';
        }
    }
} 