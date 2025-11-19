<?php

declare(strict_types=1);

namespace WSPEC\adminPage\Models;
use WSPEC\includes\Editor_Instructions;

class Editor_Custom_Meta{
	private \WC_Product $product;
	
	// Editor data constants and variables for editor
    public const MY_EDITOR              = 'PIE';
	private bool $customizable;
	private string $editorId;
    private string $templateId;
    private string $designId;
	private string $formatId;
    private string $designProjectId;
    private string $colorCode;
    private string $backgroundId;
    private string $materialId;
	
	public const PIE_EDITOR_ID_KEY          = 'pwp_editor_id';
    public const PIE_TEMPLATE_ID_KEY        = 'pie_template_id'; 
	public const PIE_DESIGN_ID_KEY		    = 'pie_design_id';
	public const PIE_FORMAT_ID_KEY 			= 'pie_format_id';
	public const PIE_DESIGN_PROJECT_ID_KEY  = 'pie_design_project_id';
    public const PIE_COLOR_CODE_KEY         = 'pie_color_code';
    public const PIE_BACKGROUND_ID_KEY      = 'pie_background_id';
    public const PIE_MATERIAL_ID_KEY      	= 'pie_material_id';
	
    public string $f2dPersonalisation;

     // Product data constants and variables for editor
	
	private float $price_per_extra_page; 
    private float $basePrice;
    private int $default_page_amount;
	private int $numPages;
	
    public const PRICE_PER_EXTRA_PAGE_KEY 	= 'price_per_extra_page';
    public const BASE_PRICE_KEY			    = 'pie_base_price';
    public const PAGE_AMOUNT_KEY 		    = 'default_page_amount';
	public const NUM_PAGES_KEY              = 'pie_num_pages';

    // images data constants and variables for editor
	
	private bool $usesImageUpload;
	private bool $autofill;
    private int $minImages;
    private int $maxImages;
	private int $sheetsmax;
	
    public const USE_IMAGE_UPLOAD_KEY   = 'pie_image_upload';
	public const AUTOFILL_KEY           = 'pie_autofill';
    public const MAX_IMAGES_KEY         = 'pie_max_images';
    public const MIN_IMAGES_KEY         = 'pie_min_images';
	public const SHEETSMAX_KEY			= 'sheetsmax';

        // extra data constants and variables for editor
    private bool $useProjectReference;
	private string $projectReference;
    private bool $overrideThumb;
	private string $redirectAfterEditor;

    public const USE_PROJECT_REFERENCE_KEY  =  'use_project_reference';
	public const PROJECT_REFERENCE_KEY 		= 'project_reference';
    public const OVERRIDE_CART_THUMB_KEY    = 'pwp_override_cart_thumb';
	public const REDIRECT_AFTER_EDITOR		= 'redirect_after_editor';
	
    private  $editorInstructions;
    private string $PelemanPersonalisation;

    public const PELEMAN_PERSONALISATION_KEY    = 'f2d_personalisations';
    public const EDITOR_INSTRUCTIONS_KEY        = 'pie_editor_instructions';
	
	public function __construct($product){
		$this->product 				= $product;
        $this->editorId             = (string)$product->get_meta(SELF::PIE_EDITOR_ID_KEY) ?? '';
        $this->customizable         = !empty($this->editorId);
        $this->templateId           = $product->get_meta(self::PIE_TEMPLATE_ID_KEY) ?? '';
        $this->designId             = $product->get_meta(self::PIE_DESIGN_ID_KEY) ?? '';
		$this->formatId 			= (string) $product->get_meta(self::PIE_FORMAT_ID_KEY) ?? '';
        $this->designProjectId      = $product->get_meta(self::PIE_DESIGN_PROJECT_ID_KEY) ?? '';
        $this->colorCode            = $product->get_meta(self::PIE_COLOR_CODE_KEY) ?? '';
        $this->backgroundId         = $product->get_meta(self::PIE_BACKGROUND_ID_KEY) ?? '';
        $this->materialId         	= $product->get_meta(self::PIE_MATERIAL_ID_KEY) ?? '';
		
        $this->price_per_extra_page = (float)$product->get_meta(self::PRICE_PER_EXTRA_PAGE_KEY) ?? 0.0;
        $this->basePrice            = (float)$product->get_meta(self::BASE_PRICE_KEY) ?? 0.0;
        $this->default_page_amount  = (int)$product->get_meta(self::PAGE_AMOUNT_KEY) ?? 1 ;
        $this->numPages             = (int)$product->get_meta(self::NUM_PAGES_KEY) ?? -1;

        $this->usesImageUpload      = (bool)$product->get_meta(self::USE_IMAGE_UPLOAD_KEY) ?? false;
        $this->minImages            = (int)$product->get_meta(self::MIN_IMAGES_KEY) ?? 0;
        $this->maxImages            = (int)$product->get_meta(self::MAX_IMAGES_KEY) ?? 0;
        $this->autofill             = (bool)$product->get_meta(self::AUTOFILL_KEY) ?? false;

		$this->useProjectReference = (bool) ($product->get_meta(self::USE_PROJECT_REFERENCE_KEY) ?? false);
		$this->projectReference = (string)$product->get_meta(self::PROJECT_REFERENCE_KEY) ?? '';

        $this->overrideThumb        = (bool)$product->get_meta(self::OVERRIDE_CART_THUMB_KEY) ?? false;
		$this->redirectAfterEditor	= (string)$product->get_meta(self::REDIRECT_AFTER_EDITOR) ?: '';
        
		$this->PelemanPersonalisation = $product->get_meta(self::PELEMAN_PERSONALISATION_KEY) ?? '' ;
        $this->editorInstructions   = (string)$product->get_meta(self::EDITOR_INSTRUCTIONS_KEY) ?? '';
		$this->sheetsmax = (int) $product->get_meta(self::SHEETSMAX_KEY) ?? '';
		

		
    }

    //  setters for the properties here
    public function set_editorId($id){
        $this->editorId = $id;
		$this->customizable = !empty($editorId);
        return $this;
    }	
    public function get_editorId() {
        return $this->editorId;
    }
	
    public function set_customizable($customizable){
        $this->customizable = $customizable;
    }    
    public function get_customizable() {
        return $this->customizable;
    }
	
    public function set_templateId($templateId){
        $this->templateId = $templateId;
    }    
	public function get_templateId() {
        return $this->templateId;
    }
    
    public function set_designId($designId){
        $this->designId = $designId;
    }
    public function get_designId() {
        return $this->designId;
    }
	
	public function set_formatId(string $formatId) {
		$this->formatId = $formatId;
        return $this;
	}	
	public function get_formatId(): string {
		return $this->formatId;
	}
    
    public function set_designProjectId($designProjectId){
        $this->designProjectId = $designProjectId;
    }
    public function get_designProjectId() {
        return $this->designProjectId;
    }
	
    public function set_colorCode($colorCode){
        $this->colorCode = $colorCode;
    }    
    public function get_colorCode() {
        return $this->colorCode;
    }
 
    public function set_backgroundId($backgroundId){
        $this->backgroundId = $backgroundId;
    }
    public function get_backgroundId() {
        return $this->backgroundId;
    } 
	
    public function set_materialId($materialId){
        $this->materialId = $materialId;
    }
    public function get_materialId() {
        return $this->materialId;
    }
    
    
    public function set_price_per_extra_page($price_per_extra_page){

        $this->price_per_extra_page = $price_per_extra_page;
    }
    public function get_price_per_extra_page() {
        return $this->price_per_extra_page;
    }
    
    public function set_basePrice($basePrice){
        $this->basePrice = $basePrice;
    }
    public function get_basePrice() {
        return $this->basePrice;
    }
    
    public function set_default_page_amount($default_page_amount){
        $this->default_page_amount  = $default_page_amount;
    }
    public function get_default_page_amount() {
        return $this->default_page_amount;
    }
    
    public function set_numPages($numPages){
        $this->numPages = $numPages;
    }
    public function get_numPages() {
        return $this->numPages;
    }
    
    public function set_usesImageUpload($usesImageUpload){
        $this->usesImageUpload = $usesImageUpload;
    }   
    public function get_usesImageUpload() {
        return $this->usesImageUpload;
    }
    
    public function set_minImages($minImages){
        $this->minImages = $minImages;
    }
    public function get_minImages() {
        return $this->minImages;
    }
    
    public function set_maxImages($maxImages){
        $this->maxImages = $maxImages;
    }
    public function get_maxImages() {
        return $this->maxImages;
    }
	
    public function set_autofill($autofill){
        $this->autofill = $autofill;
    }
    public function get_autofill() {
        return $this->autofill;
    }
    
    public function set_useProjectReference($useProjectReference){
        $this->useProjectReference = $useProjectReference;
    }
    public function get_useProjectReference() {
        return $this->useProjectReference;
    }
    
	public function set_projectReference(string $projectReference) {
		$this->projectReference = $projectReference;
	}
		public function get_projectReference(): string {
		return $this->projectReference;
	}

    public function set_overrideThumb($overrideThumb){
        $this->overrideThumb = $overrideThumb;
    }
    public function get_overrideThumb() {
        return $this->overrideThumb;
    }
		
    public function set_redirect_after_editor($redirectTo)
    {
        $this->redirectAfterEditor = $redirectTo;
        return $this;
    }
	public function get_redirect_after_editor(): string
    {
        $redirect_after_editor = $this->redirectAfterEditor;
        return $redirect_after_editor;
    }
    
    public function set_peleman_personalisation($PelemanPersonalisation){
        $this->PelemanPersonalisation   = $PelemanPersonalisation;		
// 		return $this;
    }
    public function get_peleman_personalisation() {
        return $this->PelemanPersonalisation;
    }
	
    public function set_editor_instructions($editorInstructions){
		$instructions = '';
		if(empty($editorInstructions)) {
			$defaults = Editor_Instructions::get_Defaults(); 
			foreach($defaults as $default){
				if($default->is_enabled()){
					$instructions .= ' ' . $default->get_key();
				}
			}
		}else{
			foreach($editorInstructions as $key => $value) {
				$instructions .= ' ' . $key;
        	}			
		}
		$this->editorInstructions = $instructions;
    }
    public function get_editor_instructions() {
		$instructionObjects = Editor_Instructions::get_Defaults();
		if( !empty($this->editorInstructions) ) {
			$instructionArray = explode(' ', $this->editorInstructions);
			foreach( $instructionObjects as $instruction) {
 				if(in_array($instruction->get_key(), $instructionArray)){  
					$instruction->set_enabled(true);
				}else{
					$instruction->set_enabled(false);
				}
			}
    	}
			return $instructionObjects;	
	}
        
		    
	public function set_sheetsmax(int $sheetsmax): self
	{
		$this->sheetsmax = (int) $sheetsmax;
		return $this;
	}
	
	public function get_sheetsmax(): int
    {
		return $this->sheetsmax ?: 15;
    }
	
    // getters for the properties here    
    public function get_sku(): string
	{
		return $this->product->get_sku();
	}    
    
	public function get_parent(): \WC_Product {
		return $this->product;
	}
	
	public function get_editor_params(): array {
		return [
			'editorid'       => $this->get_editorId(),
			'designid'       => $this->get_designId(),
			'designprojectid'=> $this->get_designProjectId(),
			'colorcode'      => $this->get_colorCode(),
			'backgroundid'   => $this->get_backgroundId(),
			'autofill'       => $this->get_autofill() ? '1' : '0',
			'minimages'      => $this->get_minImages(),
			'maximages'      => $this->get_maxImages(),
			'sku'            => $this->get_sku(),
		];
	}
	
	public function get_organisation_id()
	{
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
	
	public function get_enabled_instruction_keys(): array
	{
		$enabled_keys = [];

		foreach ($this->get_editor_instructions() as $instruction) {
			if ($instruction->is_enabled()) {
				$enabled_keys[] = $instruction->get_key();
			}
		}

		return $enabled_keys;
	}
	
	public function set_base_price(float $WCBasePrice): self
    {
		$this->basePrice = $WCBasePrice;
		$this->parent->update_meta_data(self::PIE_BASE_PRICE, $WCBasePrice);
		return $this;
    }
	public function get_base_price(): float
	{
		if (!$this->product instanceof \WC_Product) {
			return 0.0;
		}

		$basePrice = (float) $this->product->get_price();

		$organisation_ID = $this->get_organisation_id();
		$organisation_id = apply_filters('pf_query_get_organisation_id', ($organisation_ID ? $organisation_ID : '0'));

		if ($organisation_id) {
			wp_reset_postdata();
			$array_custom_images = get_post_meta($organisation_id, '_organisation_products_custom_images', true) ?? [];

			$parent_id = $this->product->get_parent_id();

			if (!empty($array_custom_images[$parent_id])) {
				$custom_price = $array_custom_images[$parent_id]['custom_price'] ?? [];
				$custom_variations = $custom_price['variations'] ?? [];
				$variant_id = $this->product->get_id();

				if ($this->product->is_on_sale()) {
					$basePrice = wc_get_price_to_display($this->product, ['price' => $this->product->get_regular_price()]);
				} elseif (!empty($custom_variations[$variant_id])) {
					$basePrice = (float) $custom_variations[$variant_id];
				}
			}
		}

		return $basePrice;
	}


    public function update_meta_data($product){

        $product->update_meta_data(self::PIE_EDITOR_ID_KEY, $this->editorId);
        $product->update_meta_data(self::PIE_TEMPLATE_ID_KEY, $this->templateId);
        $product->update_meta_data(self::PIE_DESIGN_ID_KEY, $this->designId);
		$product->update_meta_data(self::PIE_FORMAT_ID_KEY, $this->formatId);
		$product->update_meta_data(self::PIE_DESIGN_PROJECT_ID_KEY, $this->designProjectId);
		$product->update_meta_data(self::PIE_COLOR_CODE_KEY, $this->colorCode); 
		$product->update_meta_data(self::PIE_BACKGROUND_ID_KEY, $this->backgroundId);
		$product->update_meta_data(self::PIE_MATERIAL_ID_KEY, $this->materialId);
		
		$product->update_meta_data(self::PRICE_PER_EXTRA_PAGE_KEY, $this->price_per_extra_page);
		$product->update_meta_data(self::SHEETSMAX_KEY, $this->sheetsmax);
		$product->update_meta_data(self::BASE_PRICE_KEY, $this->basePrice);
		$product->update_meta_data(self::PAGE_AMOUNT_KEY, $this->default_page_amount); 
		$product->update_meta_data(self::NUM_PAGES_KEY, $this->numPages);

		$product->update_meta_data(self::USE_IMAGE_UPLOAD_KEY, $this->usesImageUpload);
		$product->update_meta_data(self::MIN_IMAGES_KEY, $this->minImages);
		$product->update_meta_data(self::MAX_IMAGES_KEY, $this->maxImages);
		$product->update_meta_data(self::AUTOFILL_KEY, $this->autofill);

        $product->update_meta_data(self::OVERRIDE_CART_THUMB_KEY, $this->overrideThumb); 	
		$product->update_meta_data(self::REDIRECT_AFTER_EDITOR, $this->redirectAfterEditor);
		$product->update_meta_data(self::USE_PROJECT_REFERENCE_KEY, $this->useProjectReference);
		$product->update_meta_data(self::PROJECT_REFERENCE_KEY, $this->projectReference);
		
        $product->update_meta_data(self::EDITOR_INSTRUCTIONS_KEY, $this->editorInstructions);
		$product->update_meta_data(self::PELEMAN_PERSONALISATION_KEY, $this->PelemanPersonalisation);
		
		$product->save();

		
	}
	
}