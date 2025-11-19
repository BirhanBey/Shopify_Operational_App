<?php

declare(strict_types=1);

namespace WSPEC\publicPage\Views;

class My_Projects_Page_View
{
    /**
     * Renders the header and description.
     */
    public function render_header(): void
    {
        echo '<header class="page-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">';
        echo '<h3>' . __('My Projects', 'Peleman-Webshop-Package') . '</h3>';
        echo '</header>';

        echo '<p style="margin-bottom: 20px;">' . __(
            'Here, you’ll find all the projects you’ve created in the editor. Easily revisit, update, or review your past work. Whether you’re picking up where you left off or simply exploring your creations, everything you need is just a click away.',
            'Peleman-Webshop-Package'
        ) . '</p>';

        // Responsive tweaks: show single card per row on small screens
        echo '<style>
        @media (max-width: 768px) {
            .my-projects-container { margin-left: 0 !important; }
            .my-projects-container .project-card { flex: 0 0 100% !important; max-width: 100% !important; margin: 10px 0 !important; }
        }
        </style>';
    }

    /**
     * Renders the filter dropdown based on counts.
     */
	public function render_filter_dropdown(array $counts): void
	{
		echo '<div style="display: flex; flex-wrap: wrap; flex-direction: column;">';
		echo '<select id="projectFilter" style="margin-bottom: 10px;">';

		// ordered list active -> ordered -> ordered -> layflat -> printin -> printcovers -> deleted
		$labels = [
			'all' => __('Show Active Projects Only', 'Peleman-Webshop-Package'),
			'ordered' => __('Show Ordered Projects Only', 'Peleman-Webshop-Package'),
			'layflat' => __('Show LayFlat Projects Only', 'Peleman-Webshop-Package'),
			'printin' => __('Show Printin Projects Only', 'Peleman-Webshop-Package'),
			'printcovers' => __('Show PrintCovers Projects Only', 'Peleman-Webshop-Package'),
			'deleted' => __('Show Deleted Projects Only', 'Peleman-Webshop-Package'),
		];

		foreach ($labels as $type => $label) {
			if (!isset($counts[$type]) || $counts[$type] <= 0) {
				continue;
			}

			echo '<option value="' . esc_attr($type) . '">' . esc_html($label) . ' (' . esc_html($counts[$type]) . ')</option>';
		}

		echo '</select>';
		echo '</div>';
	}


    /**
     * Renders the wrapper div for all project cards.
     */
    public function open_projects_container(): void
    {
        echo '<div class="my-projects-container" style="display: flex; flex-wrap: wrap; margin-left: -10px;">';
    }

    /**
     * Closes the projects container.
     */
    public function close_projects_container(): void
    {
        echo '</div>';
    }

    /**
     * Renders a message when no projects are found.
     */
    public function render_empty_message(): void
    {
        echo '<p><strong>' . __("It looks like you haven’t created any projects yet", "Peleman-Webshop-Package") . '.</strong><br/>' .
            __("Don’t worry — getting started is easy", "Peleman-Webshop-Package") . '! <a href="' . get_home_url() . '" style="color: #F04E23;">' .
            __("Start your first project now", "Peleman-Webshop-Package") . '</a> ' .
            __("and bring your ideas to life", "Peleman-Webshop-Package") . '.</p>';
    }

    /**
     * Renders an individual project card.
     */
    public function render_project_card(array $cardData): string
    {
        ob_start(); ?>
        <div class="project-card flex-column"
            data-editor="<?= esc_attr($cardData['editor']); ?>"
            data-deleted="<?= esc_attr($cardData['deleted']); ?>"
            data-status="<?= esc_attr($cardData['is_ordered'] ? 'Ordered' : 'Other'); ?>"
            style="flex: 0 1 30%; margin: 10px; border: 1px solid #ddd; padding: 20px; box-sizing: border-box;">

            <div class="d-flex flex-column justify-content-between" style="flex:1 0 100%">
                <?php if (!in_array($cardData['deleted'], ['1', '2'])): ?>
                    <img src="<?= esc_url($cardData['thumbnail_url']); ?>" alt="<?= esc_attr($cardData['name']); ?>" style="width: 100%; height: auto; margin-bottom: 15px;">
                    <div class="d-flex flex-column text-center font-italic font-weight-bold justify-content-end" style="padding: 0px; margin-top: 10px;">
                        <?php 
							$preview_text = esc_html__('Show Preview', 'Peleman-Webshop-Package');
							echo do_shortcode('[3d-flip-book mode="link-lightbox" trigger="click" template="short-white-book-view" pdf="' . esc_url($cardData['preview_url']) . '"]' . $preview_text . '[/3d-flip-book]');
						?>
                    </div>
                <?php else: ?>
                    <img src="<?= esc_url(wp_upload_dir()['baseurl'] . '/woocommerce-placeholder.png'); ?>" alt="Placeholder image" style="width: 100%; height: auto; margin-bottom: auto;">
                    <div class="d-flex flex-column text-center font-italic font-weight-bold justify-content-end" style="padding: 0px">
                        <p class="text-secondary">Project Deleted</p>
                    </div>
                <?php endif; ?>

                <div class="d-flex flex-column justify-content-end" style="margin-top: auto;">
                    <ul style="list-style: none; margin-left: 0px; margin-bottom: 0px;">
                        <li style="margin: 5px 0;"><strong>ID: </strong><?= esc_html($cardData['id']); ?></li>
						<?php if (!empty($cardData['createdate'])):
							$dateString = $cardData['createdate'];

							// Create DateTime object from 'Y-m-d H:i'
							try {
								$serverTimezone = new \DateTimeZone(date_default_timezone_get());
								$date = \DateTime::createFromFormat('Y-m-d H:i', $dateString, $serverTimezone);

								if ($date) {
									$wpTimezone = wp_timezone();
									$date->setTimezone($wpTimezone);

									$localizedTime = $date->format('H:i');
									$timestamp = $date->getTimestamp();
									$formattedDate = date_i18n(get_option('date_format'), $timestamp);

									echo '<li style="margin: 5px 0;"><strong>' . esc_html__('Created', 'Peleman-Webshop-Package') . ':</strong> ' . esc_html($formattedDate . ' ' . $localizedTime) . '</li>';
								}
							} catch (\Exception $e) {
								// Date parse failed, do nothing or log
							}
						endif; ?>
                        <li style="margin: 5px 0;"><strong><?= __("Project", "Peleman-Webshop-Package"); ?>:</strong> <?= esc_html($cardData['name']); ?></li>
                    </ul>
                </div>

                <div class="d-flex flex-column justify-content-end" style="margin-top: auto;">
                    <?php if (!in_array($cardData['deleted'], ['1', '2'])): ?>

                        <?php if ($cardData['status'] === 'Unordered'): ?>
                            <button type="button"
                                    class="button edit-project-button edit-project-link"
                                    data-project-id="<?= esc_attr($cardData['id']); ?>"
                                    data-edit-url="<?= esc_url($cardData['edit_url']); ?>"
                                    data-wspie-domain="<?= esc_attr($cardData['edit_button_data']['domain'] ?? ''); ?>"
                                    data-wspie-apikey="<?= esc_attr($cardData['edit_button_data']['apikey'] ?? ''); ?>"
                                    data-wspie-licensed-api-key="<?= esc_attr($cardData['edit_button_data']['licensed_key'] ?? ''); ?>"
                                    style="font-size: 12px !important; width: 100%; display: block; padding: 5px; margin: 5px 0; text-align: center; text-transform: none; background-color: #2D2A6C; border-color: #2D2A6C; color: #FFFFFF;">
                                <?= __("Edit your project", "Peleman-Webshop-Package"); ?>
                            </button>
                        <?php endif; ?>


                        <?php if (!empty($cardData['duplicate_button_data']['enabled']) && $cardData['duplicate_button_data']['enabled']): ?>
                            <button type="button"
                                    data-site-domain="<?= esc_attr(home_url()); ?>"
                                    data-organisation-id="<?= esc_attr($cardData['duplicate_button_data']['organisation_id']); ?>"
                                    data-project-id="<?= esc_attr($cardData['id']); ?>"
                                    data-product-id="<?= esc_attr($cardData['duplicate_button_data']['product_id']); ?>"
                                    data-variation-id="<?= esc_attr($cardData['duplicate_button_data']['variation_id']); ?>"
                                    class="button duplicate-project-button"
                                    target="_blank"
                                    style="font-size: 12px !important; width: 100%; display: block; padding: 10px; text-align: center; margin: 5px 0; text-transform: none; background-color: #2D2A6C; border-color: #2D2A6C; color: #FFFFFF;">
                                <?= __("Duplicate Project", "Peleman-Webshop-Package"); ?>
                            </button>
                        <?php endif; ?>
					
                        <?php if (!empty($cardData['reorder_button_data']['enabled']) && $cardData['reorder_button_data']['enabled']): ?>
                            <button class="button myProject-addtocart-button"
									id="<?= esc_attr($cardData['reorder_button_data']['id'] ?? ''); ?>"
                                    data-cart-url="<?= esc_url($cardData['reorder_button_data']['cart_url']); ?>"
                                    data-ordered-project-sku="<?= esc_attr($cardData['reorder_button_data']['sku']); ?>"
                                    data-project-id="<?= esc_attr($cardData['id']); ?>"
                                    data-wspie-domain="<?= esc_attr($cardData['reorder_button_data']['domain']); ?>"
                                    data-wspie-apikey="<?= esc_attr($cardData['reorder_button_data']['apikey']); ?>"
                                    data-order-id="<?= esc_attr($cardData['reorder_button_data']['order_id'] ?? ''); ?>"
                                    data-order-date="<?= esc_attr($cardData['reorder_button_data']['order_date'] ?? ''); ?>"
                                    style="font-size: 12px !important; width: 100%; display: block; padding: 5px; margin: 5px 0; background-color: #F04E23; color: #FFFFFF;">
                                <?= __("Re-Order", "Peleman-Webshop-Package"); ?>
                            </button>
                        <?php elseif (!empty($cardData['download_button_data']['enabled']) && $cardData['download_button_data']['enabled']): ?>
                            <button class="button myProject-download-project-button"
                                    data-organisation-id="<?= esc_attr($cardData['download_button_data']['organisation_id']); ?>"
                                    data-cart-url="<?= esc_url($cardData['download_button_data']['cart_url']); ?>"
                                    data-project-id="<?= esc_attr($cardData['id']); ?>"
                                    data-wspie-domain="<?= esc_attr($cardData['download_button_data']['domain']); ?>"
                                    data-wspie-apikey="<?= esc_attr($cardData['download_button_data']['apikey']); ?>"
                                    data-wspie-licensed-api-key="<?= esc_attr($cardData['download_button_data']['licensed_key']); ?>"
                                    style="font-size: 12px !important; width: 100%; display: block; padding: 5px; margin: 5px 0;">
                                <?= __("Download project", "Peleman-Webshop-Package"); ?>
                            </button>
                        <?php endif; ?>

                        <?php if (!empty($cardData['add_to_cart_button_data']['enabled']) && $cardData['add_to_cart_button_data']['enabled']): ?>
                            <button class="button myProject-addtocart-button"
									id="<?= esc_attr($cardData['add_to_cart_button_data']['id'] ?? ''); ?>"
                                    data-organisation-id="<?= esc_attr($cardData['add_to_cart_button_data']['organisation_id']); ?>"
                                    data-cart-url="<?= esc_url($cardData['add_to_cart_button_data']['cart_url']); ?>"
                                    data-project-id="<?= esc_attr($cardData['id']); ?>"
                                    data-wspie-domain="<?= esc_attr($cardData['add_to_cart_button_data']['domain']); ?>"
                                    data-wspie-apikey="<?= esc_attr($cardData['add_to_cart_button_data']['apikey']); ?>"
                                    style="font-size: 12px !important; width: 100%; display: block; padding: 5px; margin: 5px 0;">
                                <?= __("Add to cart", "Peleman-Webshop-Package"); ?>
                            </button>
                        <?php endif; ?>
                    <?php endif; ?>
                </div>
            </div>
        </div>
        <?php
        return ob_get_clean();
    }
}

