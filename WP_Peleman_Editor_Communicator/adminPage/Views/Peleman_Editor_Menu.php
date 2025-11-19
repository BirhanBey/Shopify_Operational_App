<?php 
declare(strict_types=1);
namespace WSPEC\adminPage\Views;

use WSPPE\includes\Admin_Menu;

class Peleman_Editor_Menu {

    private string $page_slug;
	private string $title;
	private string $option_group;

    public function __construct()
    {
        $this->page_slug = 'peleman-editor-control-panel';
        $this->title = 'Peleman Editor Credentials';
        $this->option_group = 'WSPEC-editor-options-group';
    }
	
	public function get_title(){
		return $this->title;
	}

	public function render_menu(): void
    {
        settings_fields($this->option_group);
        do_settings_sections($this->page_slug);
        submit_button();
    }

    public function register_settings(): void
    {		
        register_setting($this->option_group, 'wspie_domain', array(
            'type' => 'string',
            'description' => 'base Site Address of the PIE editor',
            'sanitize_callback' => 'esc_url_raw',
            'show_in_rest' => false,
            'default' => ''
        ));
        register_setting($this->option_group, 'wspie_customer_id', array(
            'type' => 'string',
            'description' => 'customer id for the PIE Editor',
            'sanitize_callback' => 'wp_filter_nohtml_kses',
            'show_in_rest' => false,
            'default' => ''
        ));
        register_setting($this->option_group, 'wspie_api_key', array(
            'type' => 'string',
            'description' => 'customer api key for PIE Editor',
            'sanitize_callback' => 'wp_filter_nohtml_kses',
            'show_in_rest' => false,
            'default' => ''
        ));
		register_setting($this->option_group, 'wspie_editorMenu_redirect_option', array(
            'type' => 'string',
            'description' => 'Action type selection for PIE Editor',
            'sanitize_callback' => 'sanitize_text_field',
            'show_in_rest' => false,
            'default' => 'default'
        ));
        $this->add_menu_components();  
    }
	

    private function add_menu_components(): void
    {
        add_settings_section(
      	    $this->option_group,
            "",
    		[$this, 'render_editor_info_section'],
            $this->page_slug,
        );
        add_settings_field(
            'wspie_domain',
            __("PIE domain (URL)", 'Peleman-Base-Products-Extender'),
            array($this, 'text_property_callback'),
            $this->page_slug,
            $this->option_group,
            array(
                'option' => 'wspie_domain',
                'placeholder' => "https://deveditor.peleman.com",
                'description' => __("base Site Address of the PIE editor", 'Peleman-Webshop-Package'),
            )
        );
        add_settings_field(
            'wspie_customer_id',
            __("PIE Customer ID", 'Peleman-Base-Products-Extender'),
            array($this, 'text_property_callback'),
            $this->page_slug,
            $this->option_group,
            array(
                'option' => 'wspie_customer_id',
            )
        );
        add_settings_field(
            'wspie_api_key',
            __("PIE API key", 'Peleman-Base-Products-Extender'),
            array($this, 'text_property_callback'),
            $this->page_slug,
            $this->option_group,
            array(
                'option' => 'wspie_api_key',
            )
        );
        add_settings_field(
            'wspie_editorMenu_redirect_option',
            __("Redirect After Editor", 'Peleman-Webshop-Package'),
            array($this, 'dropdown_property_callback'),
            $this->page_slug,
            $this->option_group,
            array(
                'option' => 'wspie_editorMenu_redirect_option',
                'choices' => array('toCart', 'toMyProjects'),
            )
        );
        add_settings_field(
            'wspie_api_test',
            __("PIE API test", 'Peleman-Base-Products-Extender'),
            array($this, 'add_api_test_button'),
            $this->page_slug,
            $this->option_group,
            array(
                'id' => 'wspie_api_test',
                'type' => 'button',
                'title' => __('test credentials', 'Peleman-Base-Products-Extender')
            )
        );

    }
	
	public function render_editor_info_section()
	{
		?>
		<div class="WSPEC-settings">
			<h1>Peleman Editor Communicator</h1>
			<h3>Current Version: <?php echo esc_html(WSPEC_VERSION); ?></h3>
			<hr>
			<p>Additional plugin to Peleman Product Extender that adds the ability to connect and exchange data with Peleman Image Editor. </p>
			<p>The WSPEC plugin requires the following plugins for its functionality:</p>
			<ul>
				<li>Peleman Products Extender</li>
			</ul>
			<hr>
			<p>For proper communication with the <b>PIE</b>, the Peleman editor communicator is required </p>
			<hr>
			<p>For proper communication with the <b>F2D</b>, the Peleman F2D communicator is required </p>
			<hr>
			<p>For pdf uploads, the Peleman pdf uploader is required </p>
		</div>
		<?php
	}
	
	public  function text_property_callback(array $args): void
    {
        $option = $args['option'];
        $value = get_option($option);
        $placeholder = isset($args['placeholder']) ? $args['placeholder'] : '';
        $description = isset($args['description']) ? $args['description'] : '';

        $classArray = isset($args['classes']) ? $args['classes'] : [];
        $classArray[] = 'regular-text';
        $classes = implode(" ", $classArray);
    ?>
        <input type="text" id="<?php echo esc_attr($option); ?>" name="<?php echo esc_attr($option); ?>" value="<?php echo esc_html($value); ?>" placeholder="<?php echo esc_html($placeholder); ?>" class="<?php esc_attr($classes); ?>" size=40 />
    <?php
        if ($description) {
            echo wp_kses_post("<p class='description'>{$description}</p>");
        }
    }
	
    public function dropdown_property_callback(array $args): void
    {
        $option = $args['option'];
        $choices = $args['choices'];
        $selected = get_option($option, 'default');
        ?>
        <select name="<?php echo esc_attr($option); ?>" id="<?php echo esc_attr($option); ?>">
            <?php foreach ($choices as $choice): ?>
                <option value="<?php echo esc_attr($choice); ?>" <?php selected($selected, $choice); ?>>
                    <?php echo esc_html($choice); ?>
                </option>
            <?php endforeach; ?>
        </select>
        <?php
    }
	
    public  function bool_property_callback(array $args): void
    {
        $option = $args['option'];
        $description = $args['description'] ?: '';
        $value = get_option($option);

        $classArray = isset($args['classes']) ? $args['classes'] : [];
        $classArray[] = 'regular-text';
        $classes = implode(" ", $classArray);

    ?>
        <input type='checkbox' id=" <?php echo esc_attr($option); ?>" name="<?php echo esc_attr($option); ?>" value="1" class="<?php esc_attr($classes); ?>" <?php checked(1, (int)$value, true); ?> />
    <?php
        if ($description) {
            echo wp_kses_post("<p class='description'>{$description}</p>");
        }
    }
	
	public function add_api_test_button(array $args): void
	{
		// Create Nonce
		$nonce = wp_create_nonce('api_test_nonce');

		$id = isset($args['id']) ? esc_attr($args['id']) : '';
		$type = isset($args['type']) ? esc_attr($args['type']) : 'button';
		$title = isset($args['title']) ? esc_html($args['title']) : 'click me';
?>
		<form method="post">
			<?php wp_nonce_field('api_test_action', 'api_test_nonce'); ?>
			<button id="<?php echo esc_attr($id); ?>" type="<?php echo esc_attr($type); ?>"><?php echo esc_html($title); ?></button>
		</form>
<?php
	}
}