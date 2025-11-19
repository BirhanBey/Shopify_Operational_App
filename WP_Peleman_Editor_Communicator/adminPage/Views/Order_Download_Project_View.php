<?php

declare(strict_types=1);

namespace WSPEC\adminPage\Views;

/**
 * View for rendering download project button in WooCommerce order details
 */
class Order_Download_Project_View
{
    /**
     * Render download button for project
     */
    public function render_download_button(array $project_data, string $download_url, string $thumbnail_url = '', array $status_data = []): void
    {
        $status = $status_data['status'] ?? 'unset';
        $eta = $status_data['eta'] ?? '';
        
        ?>
        <div class="order-download-project-wrapper" style="margin: 10px 0; padding: 10px; background-color: #f9f9f9; border: 1px solid #ddd; border-radius: 4px;">
            
			<h4 style="margin: 0 0 10px 0; color: #333; font-size: 14px;">
				<?php echo esc_html__('Project Download', 'Peleman-Webshop-Package'); ?>
			</h4>
			
			<div style="display: flex; flex-direction: row; align-items: flex-start; gap: 15px;">
				<?php if (!empty($thumbnail_url)): ?>
				<div style="flex-shrink: 0;">
					<img src="<?php echo esc_url($thumbnail_url); ?>" 
						 alt="<?php echo esc_attr__('Project Thumbnail', 'Peleman-Webshop-Package'); ?>"
						 style="max-width: 120px; max-height: 120px; border: 1px solid #ddd; border-radius: 4px;"
						 onerror="this.style.display='none';">
				</div>
				<?php endif; ?>
				
				<div style="flex: 1;">
					<div style="margin-bottom: 8px;">
						<strong><?php echo esc_html__('Project ID:', 'Peleman-Webshop-Package'); ?></strong> 
						<?php echo esc_html($project_data['project_id']); ?>
					</div>
                    
                    <div style="margin-bottom: 8px;">
                        <strong><?php echo esc_html__('Product Name:', 'Peleman-Webshop-Package'); ?></strong>
                        <?php echo esc_html($project_data['product_name']); ?>
                    </div>

					<div style="margin-top: 10px;">
						<?php $this->render_status_based_button($status, $download_url); ?>
					</div>

					<div style="margin-top: 8px; font-size: 12px; color: #666;">
						<?php $this->render_status_message($status, $eta); ?>
					</div>
				</div>
            </div>
        </div>
        <?php
    }

    /**
     * Render button based on project status
     */
    private function render_status_based_button(string $status, string $download_url): void
    {
        switch ($status) {
            case 'ok':
                ?>
                <a href="<?php echo esc_url($download_url); ?>" 
                   class="button button-primary" 
                   target="_blank"
                   style="background-color: #0073aa; border-color: #0073aa; color: #fff; text-decoration: none; padding: 8px 16px; border-radius: 3px; display: inline-block;">
                    <span class="dashicons dashicons-download" style="margin-right: 5px;"></span>
                    <?php echo esc_html__('Download Project Files', 'Peleman-Webshop-Package'); ?>
                </a>
                <?php
                break;
                
            case 'error':
                ?>
                <a role="link" type="button" class="button disabled" aria-disabled="true" style="background-color: #dc3232; border-color: #dc3232; color: #fff; text-decoration: none; padding: 8px 16px; border-radius: 3px; display: inline-block; cursor: not-allowed;">
                    <span class="dashicons dashicons-warning" style="margin-right: 5px;"></span>
                    <?php echo esc_html__('Error connecting to editor server', 'Peleman-Webshop-Package'); ?>
                </a>
                <?php
                break;
                
            case 'unset':
                ?>
                <a role="link" type="button" class="button disabled" aria-disabled="true" style="background-color: #f7f7f7; border-color: #ccc; color: #666; text-decoration: none; padding: 8px 16px; border-radius: 3px; display: inline-block; cursor: not-allowed;">
                    <span class="dashicons dashicons-clock" style="margin-right: 5px;"></span>
                    <?php echo esc_html__('Print file processing', 'Peleman-Webshop-Package'); ?>
                </a>
                <?php
                break;
                
            default:
                ?>
                <a role="link" type="button" class="button disabled" aria-disabled="true" style="background-color: #f7f7f7; border-color: #ccc; color: #666; text-decoration: none; padding: 8px 16px; border-radius: 3px; display: inline-block; cursor: not-allowed;">
                    <span class="dashicons dashicons-clock" style="margin-right: 5px;"></span>
                    <?php echo esc_html__('Print file processing', 'Peleman-Webshop-Package'); ?>
                </a>
                <?php
                break;
        }
    }

    /**
     * Render status message based on project status
     */
    private function render_status_message(string $status, string $eta): void
    {
        switch ($status) {
            case 'ok':
                ?>
                <em><?php echo esc_html__('Click to download project files as ZIP archive', 'Peleman-Webshop-Package'); ?></em>
                <?php
                break;
                
            case 'error':
                ?>
                <em><?php echo esc_html__('Try again later or contact support', 'Peleman-Webshop-Package'); ?></em>
                <?php
                break;
                
            case 'unset':
                if (!empty($eta)) {
                    ?>
                    <em><?php echo esc_html__('Estimated completion time: UTC ', 'Peleman-Webshop-Package'); ?><strong><?php echo esc_html($eta); ?></strong></em>
                    <?php
                } else {
                    ?>
                    <em><?php echo esc_html__('Project is being processed, please wait', 'Peleman-Webshop-Package'); ?></em>
                    <?php
                }
                break;
                
            default:
                if (!empty($eta)) {
                    ?>
                    <em><?php echo esc_html__('Estimated completion time: UTC ', 'Peleman-Webshop-Package'); ?><strong><?php echo esc_html($eta); ?></strong></em>
                    <?php
                } else {
                    ?>
                    <em><?php echo esc_html__('Project is being processed, please wait', 'Peleman-Webshop-Package'); ?></em>
                    <?php
                }
                break;
        }
    }
} 