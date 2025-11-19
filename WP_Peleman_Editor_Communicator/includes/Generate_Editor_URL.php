<?php

declare(strict_types=1);

namespace WSPEC\includes;

class Generate_Editor_URL
{
    private string $hook;
    private string $callback;
    private int $priority;
    private int $accepted_args;

    public function __construct(int $priority = 1)
    {
        $this->hook = 'wsppe_generate_pie_project_url';
        $this->callback = 'generate_url';
        $this->priority = $priority;
        $this->accepted_args = 3;
        $this->register();
    }

    public function register(): void
    {
        add_filter(
            $this->hook,
            array($this, $this->callback),
            $this->priority,
            $this->accepted_args
        );
    }

    public function generate_url(string $url, $project_id, array $params = []): string
    {
        // Determine current URL vs projects page
        $current_url = home_url(add_query_arg([], $_SERVER['REQUEST_URI']));
        $clean_url = home_url(parse_url($current_url, PHP_URL_PATH));
        $projects_url = wc_get_account_endpoint_url('projects');

        // Generate base URL
        if (untrailingslashit($clean_url) !== untrailingslashit($projects_url)) {
            $url = rtrim(get_option('wspie_domain', $url), '/');
            $url .= "/editor/upload";
            $url .= "?projectid=" . urlencode((string)$project_id);
        } else {
            $url = get_option('wspie_domain', $url);
            $url .= "?projectid=" . urlencode((string)$project_id);
        }

        // Append parameters with correct separator
        if (!empty($params)) {
            $url .= '&' . http_build_query($params);
        } else {
            error_log(__CLASS__ . " > No additional params to append.");
        }

        return $url;
    }
}
