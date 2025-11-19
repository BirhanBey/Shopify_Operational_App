<?php 
declare(strict_types=1);
namespace WSPEC\adminPage\Controllers;

use WSPEC\adminPage\Views\Peleman_Editor_Menu;

class Editor_Tab_Controller{
    public function __construct() {
        if (is_admin()) {
			add_action('admin_init', [$this, 'register_settings']);
            add_filter(
                'WSPPE_get_admin_menu_tabs',
                array($this, 'add_Peleman_editor_panel'),
                10,
                1
            );
		

        }
    }
	
	public function register_settings(){
		$tabs['Editor'] = new Peleman_Editor_Menu;
		$tabs['Editor']->register_settings();
	}
    
    public function add_Peleman_editor_panel(array $tabs) {
		$tabs['Editor'] = new Peleman_Editor_Menu;
		
		return $tabs;
    }
	
	
}