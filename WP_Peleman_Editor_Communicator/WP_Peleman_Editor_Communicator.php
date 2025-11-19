<?php

declare(strict_types=1);

namespace WSPEC;

use WSPEC\includes\Plugin;

require plugin_dir_path(__FILE__) . '/vendor/autoload.php';

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

/**
 * Plugin Name:     Peleman Editor Communicator
 * Plugin URI:        https://github.com/Peleman-NV/WP_Peleman_Products_Extender
 * requires PHP:      8.2
 * Description:     Additional plugin to Peleman Product Extender that adds the ability to connect and exchange data with Peleman Image Editor. Communicates with the editor for creating, editing of Personalizable products .
 * Version:           1.0.1
 * Author:            Birhan Yorukoglu
 * Author URI:        https://github.com/Peleman-NV/
 * License:           GPL-2.0+
 * License URI:       http://www.gnu.org/licenses/gpl-2.0.txt
 * Text Domain:       Peleman_Editor_Communicator
 * Domain Path:       /languages
 * Requires Plugins: WP_Peleman_Products_Extender-v1.0.2
 */

define('WSPEC_VERSION', '1.0.1');
!defined('WSPEC_DIRECTORY') ? define('WSPEC_DIRECTORY', plugin_dir_url(__FILE__)) : null;
!defined('WSPEC_UPLOAD_DIR') ? define('WSPEC_UPLOAD_DIR', WP_CONTENT_DIR . '/uploads/wsppe/') : null;

!defined('WSPEC_TEMPLATES_DIR') ? define('WSPEC_TEMPLATES_DIR', plugin_dir_path(__FILE__) . '/templates') : null;
!defined('WSPEC_LOG_DIR') ? define('WSPEC_LOG_DIR', WP_CONTENT_DIR . '/uploads/wsppe/logs') : null;


if (!function_exists('is_plugin_active')) {
    include_once(ABSPATH . 'wp-admin/includes/plugin.php');
}

// if (!is_plugin_active('WP_Peleman_Products_Extender-v1.0.2/WP_Peleman_Products_Extender.php')) {
//     $site_domain = home_url();
//     $message = 'The "Products Extender" plugin has not been activated. ← <a href="' . $site_domain . '/wp-admin/plugins.php">Please activate it first.</a>';
//    	wp_die($message); 
// }

register_activation_hook(__FILE__, function () {
    $plugin = new Plugin();
    $plugin->activate();
});

$plugin = new Plugin(); 
