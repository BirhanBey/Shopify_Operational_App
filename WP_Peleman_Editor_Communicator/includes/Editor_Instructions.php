<?php

declare(strict_types=1);

namespace WSPEC\includes;

class Editor_Instructions{
	private string $label;
	private string $key;
	private bool $enabled;
	private string $description;
	
     private static  $Default_instructs = [
        'use designs' => true,
        'use backgrounds'=> true,
        'use layers'=> true,
        'use image upload'=> true,
        'use elements'=> true,
        'use artwork'=> false,
        'use stock photos'=> true,
        'use QR code' => true,
        'use show safe zone'=> true,
        'use text'=> true,
        'use settings'=> true,
        'use show cropzone'=> true,
        'use auto flow'=> false,
        'use notes'=> false,
        'use page navigator'=> false
   ];
	
	public function __construct(string $key, string $label, bool $enabled, string $description = ''){
		$this->key = $key;
        $this->label = $label;
        $this->description = $description;
        $this->enabled = $enabled;	
	}
	
	    public function get_key(): string
    {
        return $this->key;
    }
    
    public function set_enabled(bool $enabled): void
    {
        $this->enabled = $enabled;
    }

    public function get_description(): string
    {
        return $this->description;
    }

    public function is_enabled(): bool
    {
        return $this->enabled;
    }

    public function get_label(): string
    {
        return $this->label;
    }

    public static function get_Defaults(){

    $converted_Defaults = [];
        foreach(self::$Default_instructs as $key => $value){
            $id = str_replace(' ', '', $key);
			$instruction = new self(strtolower($id),$key, $value ); 
			array_push($converted_Defaults , $instruction);
        }
		return $converted_Defaults;
    }

}