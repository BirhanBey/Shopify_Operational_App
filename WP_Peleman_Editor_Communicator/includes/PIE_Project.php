<?php

declare(strict_types=1);

namespace WSPEC\includes;

use WSPEC\adminPage\Models\Editor_Custom_Meta;

class PIE_Project
{
    private Editor_Custom_Meta $editorData;
    private string $editorId;
    private string $projectId;

    public const EDITOR_ID_KEY   = '_editor_id';
    public const PROJECT_ID_KEY  = '_project_id';
    public const PROJECT_URL_KEY = '_project_url';

    public function __construct(Editor_Custom_Meta $data, string $projectId)
    {
        $this->editorData = $data;
        $this->projectId  = $projectId;
        $this->editorId   = Editor_Custom_Meta::MY_EDITOR;

    }

    public function get_project_id(): string
    {
        return $this->projectId;
    }

    public function get_editor_id(): string
    {
        return $this->editorId;
    }

    public function get_project_editor_url(bool $skipUpload = false, $organisation_apikey = ''): string
    {
        $id = $this->get_project_id();
        $key = $organisation_apikey ?: get_option('wspie_api_key');

        $params = [];
        if ($skipUpload || !$this->editorData->get_usesImageUpload()) {
            $params['skip'] = 'true';
        }

        $params = array_merge($params, $this->editorData->get_editor_params());
        $params['lang'] = $this->get_editor_lang();
        $params['a'] = $key;

//         error_log('PIE_Project_params === ' . print_r($params, true));

        $url = apply_filters('wsppe_generate_pie_project_url', '', $id, $params);

        // error_log('PIE_Project_url === ' . $url);
        return $url;
    }

    public function to_array(): array
    {
        return [
            self::EDITOR_ID_KEY   => $this->get_editor_id(),
            self::PROJECT_ID_KEY  => $this->get_project_id(),
            self::PROJECT_URL_KEY => $this->get_project_editor_url(),
        ];
    }

    private function get_editor_lang(): string
    {
        if (defined('ICL_LANGUAGE_CODE') && ICL_LANGUAGE_CODE) {
            return ICL_LANGUAGE_CODE;
        }
        return explode("_", get_locale())[0];
    }
}
