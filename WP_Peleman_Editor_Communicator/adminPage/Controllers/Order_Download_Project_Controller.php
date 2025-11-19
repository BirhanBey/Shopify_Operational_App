<?php

declare(strict_types=1);

namespace WSPEC\adminPage\Controllers;

use WSPEC\adminPage\Models\Order_Download_Project_Model;
use WSPEC\adminPage\Views\Order_Download_Project_View;

/**
 * Controller for handling download project button in WooCommerce order details
 */
class Order_Download_Project_Controller
{
    private Order_Download_Project_Model $model;
    private Order_Download_Project_View $view;

    public function __construct()
    {
        // Only run on WooCommerce admin order edit page
        if (!$this->is_woocommerce_order_edit_page()) {
            return;
        }
        
        $this->model = new Order_Download_Project_Model();
        $this->view = new Order_Download_Project_View();
        
        // Hook into WooCommerce order item meta
        add_action('woocommerce_after_order_itemmeta', [$this, 'render_download_button'], 10, 2);
        
        // Hide _project_id from order item meta display
        add_filter('woocommerce_hidden_order_itemmeta', [$this, 'hide_project_id_meta']);
    }

    /**
     * Check if current page is WooCommerce admin order edit page
     */
    private function is_woocommerce_order_edit_page(): bool
    {
        // Check if we're in admin
        if (!is_admin()) {
            return false;
        }
        
        // Check if we're on WooCommerce order edit page
        global $pagenow, $post_type;
        
        // Method 1: Check page and post type (for classic editor)
        if ($pagenow === 'post.php' && $post_type === 'shop_order') {
            return true;
        }
        
        // Method 2: Check URL parameters for classic editor
        if ($pagenow === 'post.php' && isset($_GET['action']) && $_GET['action'] === 'edit' && isset($_GET['post'])) {
            // Verify the post is actually a shop_order
            $post_id = (int)$_GET['post'];
            $post = get_post($post_id);
            if ($post && $post->post_type === 'shop_order') {
                return true;
            }
        }
        
        // Method 3: Check if we're in WooCommerce admin area (new HPOS)
        if (isset($_GET['page']) && $_GET['page'] === 'wc-orders' && isset($_GET['action']) && $_GET['action'] === 'edit') {
            return true;
        }
        
        // Method 4: Additional check for URL pattern like: /wp-admin/post.php?post=175259&action=edit
        if ($pagenow === 'post.php' && isset($_GET['post']) && isset($_GET['action']) && $_GET['action'] === 'edit') {
            $post_id = (int)$_GET['post'];
            $post = get_post($post_id);
            if ($post && $post->post_type === 'shop_order') {
                return true;
            }
        }
        
        return false;
    }

    /**
     * Render download button for order items that have project data
     */
    public function render_download_button(int $item_id, \WC_Order_Item $item): void
    {
        try {
            // Get project data from order item
            $project_data = $this->model->get_project_data_from_order_item($item);
            
            if (!$project_data) {
                error_log('[Order_Download_Project_Controller] No project data found for item_id: ' . $item_id);
                return;
            }
            
            // Check if download is enabled for this project
            if (!$this->model->is_download_enabled($project_data)) {
                error_log('[Order_Download_Project_Controller] Download not enabled for project: ' . $project_data['project_id']);
                return;
            }
            
            // Get project status
            $status_data = $this->model->get_project_status($project_data['project_id']);
            error_log('[Order_Download_Project_Controller] Raw status data from model: ' . print_r($status_data, true));
            error_log('[Order_Download_Project_Controller] Status: "' . ($status_data['status'] ?? 'NULL') . '", ETA: "' . ($status_data['eta'] ?? 'NULL') . '"');
            
            // Generate download URL
            $download_url = $this->model->generate_download_url($project_data);
            
            // Generate thumbnail URL
            $thumbnail_url = $this->model->generate_thumbnail_url($project_data['project_id']);
            
            // Render the download button with thumbnail and status
            $this->view->render_download_button($project_data, $download_url, $thumbnail_url, $status_data);
            
        } catch (\Exception $e) {
            error_log('[Order_Download_Project_Controller] Error in render_download_button: ' . $e->getMessage());
        }
    }
    
    /**
     * Hide _project_id from order item meta display
     */
    public function hide_project_id_meta(array $hidden_meta): array
    {
        $hidden_meta[] = '_project_id';
        return $hidden_meta;
    }
} 