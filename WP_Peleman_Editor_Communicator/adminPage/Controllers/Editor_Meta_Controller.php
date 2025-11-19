<?php 
declare(strict_types=1);

namespace WSPEC\adminPage\Controllers;

use WSPEC\adminPage\Views\Editor_Meta_Variable_Input;
use WSPEC\adminPage\Views\Editor_Meta_Simple_Input;

class Editor_Meta_Controller {

    public function __construct() {
		
		$Variable_input = new Editor_Meta_Variable_Input();
		$Simple_input = new Editor_Meta_Simple_Input();
		add_action('woocommerce_product_after_variable_attributes', [$Variable_input, 'render_Variable_fields'], 9, 3);
		add_action('woocommerce_save_product_variation',[$Variable_input,'save_variables'], 11,2);
		add_action('woocommerce_process_product_meta',[$Simple_input,'save_variables'], 11,2);
    }
}