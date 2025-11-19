jQuery(document).ready(function ($) {
    const form = $("form.variations_form");

    form.on("found_variation", function (event, variation) {
//         console.log("🧪 Selected variation:", variation);

        // Remove previous input field
        $("#project_reference").remove();
		
		
		// Update Add to Cart Label
        if (variation.custom_add_to_cart_label) {
            $("button.single_add_to_cart_button").text(variation.custom_add_to_cart_label);
//             console.log("🟢 Add to cart label set:", variation.custom_add_to_cart_label);
        }

        const useReference = variation?.use_project_reference;
        const shouldShow = ['1', 1, true, 'true', 'yes'].includes(useReference);
		const editorID = variation?.editorID;

        if (shouldShow && variation?.reference_input_html && editorID == "PIE") {
            const referenceHTML = variation.reference_input_html;

            // to insert after form.cart > table:
            const table = form.find("table.variations");
            if (table.length) {
				$(referenceHTML).insertAfter(table);
// 				console.log("✅ Input form.cart > table.variations added under");
            } else {
                // If there is no table, put it in wrap as fallback
                $(".single_variation_wrap").append(referenceHTML);
//                 console.warn("⚠️ table.variations not found, fallback used");
            }
        }
    });
		
    // Reset text when variation is reset
    form.on("reset_data", function () {
        $("button.single_add_to_cart_button").text("Add to cart");
        $("#project_reference").remove();
    });

    // Remove any old input when the page loads
    $("#project_reference").remove();
});
