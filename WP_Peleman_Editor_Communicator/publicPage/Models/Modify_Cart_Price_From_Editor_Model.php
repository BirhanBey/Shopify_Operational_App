<?php

declare(strict_types=1);

namespace WSPEC\publicPage\Models;

class Modify_Cart_Price_From_Editor_Model {

    /**
     * Get project price from the external Editor API
     * 
     * @param string $projectId The project ID
     * @return float|null The total price from API or null if failed
     */
    public function get_project_price_from_api(string $projectId): ?float {
        
        $apiKey = get_option('wspie_api_key', '');
        if (empty($apiKey)) {
            return null;
        }

		$editorDomain = get_option('wspie_domain', '');

        $apiUrl = $editorDomain.'/editor/api/priceAPI.php';
        $apiUrl .= '?projectid=' . urlencode($projectId);
        $apiUrl .= '&a=' . urlencode($apiKey);
        $apiUrl .= '&action=getprojectprice';
        

        $response = wp_remote_get($apiUrl, [
            'timeout' => 30,
            'headers' => [
                'User-Agent' => 'WordPress/' . get_bloginfo('version'),
            ]
        ]);

        if (is_wp_error($response)) {
            return null;
        }

        $responseCode = wp_remote_retrieve_response_code($response);

        if ($responseCode !== 200) {
            return null;
        }

        $body = wp_remote_retrieve_body($response);
        
        $data = json_decode($body, true);

        if (json_last_error() !== JSON_ERROR_NONE) {
            return null;
        }

        if (isset($data['success']) && $data['success'] === true && 
            isset($data['data']['totalPrice'])) {
            $price = (float) $data['data']['totalPrice'];
            return $price;
        }

        return null;
    }

    /**
     * Get project page count from Editor API
     * 
     * @param string $projectId The project ID
     * @return int|null The page count or null if failed
     */
    public function get_pageCount(string $projectId): ?int {
        if (empty($projectId)) {
            return null;
        }

        $locationForPages = get_option('wspie_domain', '') . '/editor/api/projectAPI.php?action=getpages&projectid=' . $projectId . '&a=' . get_option('wspie_api_key');
        
        $response = wp_remote_request($locationForPages);
        
        if (is_wp_error($response)) {
            return null;
        }

        $responseCode = wp_remote_retrieve_response_code($response);

        if ($responseCode !== 200) {
            return null;
        }

        $body = wp_remote_retrieve_body($response);
        $projectJson = json_decode($body);
        
        if (json_last_error() !== JSON_ERROR_NONE) {
            return null;
        }

        $pagesCount = $projectJson->pagesCount ?? null;
        
        return $pagesCount;
    }

    /**
     * Get organisation ID from URL parameters or referrer
     * 
     * @return string Organisation ID or empty string if not found
     */
    public function get_organisation_id(): string {
        if (wp_parse_url($_SERVER['HTTP_REFERER'], PHP_URL_QUERY) != null) {
            parse_str(wp_parse_url($_SERVER['HTTP_REFERER'], PHP_URL_QUERY), $queries);
            if (isset($queries['organisationid'])) {
                return $queries['organisationid'];
            }
        } elseif (isset($_GET['organisationid'])) {
            return $_GET['organisationid'];
        } else {
            return '';
        }
    }
}
