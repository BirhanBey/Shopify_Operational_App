<?php
namespace WSPEC\publicPage\Views;

function render_project_reference_input(): string {
    ob_start(); ?>

		<p id="project_reference">
			<label for='project_reference'><?php esc_html_e( 'Project reference:', 'Peleman_Editor_Communicator' ); ?> </label>
			<input class='form-control' type='text' id='project_reference' name='project_reference'	placeholder='<?php esc_html_e( 'Name Your Project', 'Peleman_Editor_Communicator' ); ?>' />
		</p>

    <?php
    return ob_get_clean();
}

function render_project_reference_input2(): string {
    ob_start(); ?>

		<p id="project_reference">
			should_show_input returns false or empty
		</p>

    <?php
    return ob_get_clean();
}