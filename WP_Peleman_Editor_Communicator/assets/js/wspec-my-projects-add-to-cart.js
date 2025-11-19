document.addEventListener("DOMContentLoaded", function () {
  // Helper function to disable both reorder and duplicate buttons on a project card
  function disableButtonsOnCard(button) {
    button.disabled = true;
    const projectCard = button.closest('.project-card');
    const duplicateButton = projectCard?.querySelector('.duplicate-project-button');
    if (duplicateButton) {
      duplicateButton.disabled = true;
    }
  }

  const addToCartButtons = document.querySelectorAll(
    ".myProject-addtocart-button"
  );
  const DownloadProjectButtons = document.querySelectorAll(
    ".myProject-download-project-button"
  );
	
  DownloadProjectButtons.forEach((dbutton) => {
    dbutton.addEventListener("click", async function () {
      const wspieDomain = dbutton.getAttribute("data-wspie-domain");
      const LicensedApiKey = dbutton.getAttribute("data-wspie-licensed-api-key");
      const project_id = dbutton.getAttribute("data-project-id");
      const url = `${wspieDomain}/editor/api/getfile.php?projectid=${project_id}&file=printfiles&a=${LicensedApiKey}`;

      const link = document.createElement("a");
      link.href = url;
      link.download = `${project_id}.zip`; 
      document.body.appendChild(link);
      link.click();

      document.body.removeChild(link);
    });
  });

  addToCartButtons.forEach((button) => {
    button.addEventListener("click", async function () {
      const project_id = button.getAttribute("data-project-id");
      if (!project_id) {
        console.error("[REORDER DEBUG] ❌ Project ID not found!");
        return;
      }

      const wspieDomain = button.getAttribute("data-wspie-domain");
      const apiKey = button.getAttribute("data-wspie-apikey");
      let cart_URL = button.getAttribute("data-cart-url");
	  const organisationID = button.getAttribute('data-organisation-id');
      const ordered_project_sku = button.getAttribute(
        "data-ordered-project-sku"
      );
      const order_button_id = button.getAttribute("id");
      const order_id = button.getAttribute("data-order-id");
      const order_date = button.getAttribute("data-order-date");
      
      // REORDER DEBUG: Start state
      // console.log("[REORDER DEBUG] 🔘 Re-order button clicked");
      // console.log("[REORDER DEBUG]   Project ID: " + project_id);
      // console.log("[REORDER DEBUG]   Button ID: " + order_button_id);
      // console.log("[REORDER DEBUG]   data-ordered-project-sku: " + (ordered_project_sku || "EMPTY"));      
      // console.log("ordered_project_sku: " + ordered_project_sku);
      // console.log("cart_URL: " + cart_URL);
      // console.log("wspieDomain: " + wspieDomain);
      // console.log("order_button_id: " + order_button_id);

      const url = `${wspieDomain}/editor/api/projectAPI.php?action=getsku&projectid=${project_id}&a=${apiKey}`;

      // Pre-check: Is the same project already in cart?
      if (typeof ajax_object === "undefined") {
        console.error("ajax_object is not defined!");
        return;
      }

      console.log("[REORDER CHECK] Starting cart check for project_id=" + project_id);
      try {
        const cartCheck = await jQuery.ajax({
          url: ajax_object.ajaxurl,
          method: "POST",
          data: {
            action: "check_project_in_cart",
            project_id: project_id,
          },
        });
        console.log("[REORDER CHECK] AJAX success: exists=" + (cartCheck?.data?.exists === true));
        if (cartCheck?.success && cartCheck?.data?.exists === true) {
          var title = (typeof MyProjectsI18n !== 'undefined' && MyProjectsI18n.already_in_cart_title) ? MyProjectsI18n.already_in_cart_title : 'Already in Cart';
          var detail = (typeof MyProjectsI18n !== 'undefined' && MyProjectsI18n.already_in_cart_detail) ? MyProjectsI18n.already_in_cart_detail : 'This project already exists in your cart. You can proceed to the cart or remove it to re-order again.';
          alert(title + "\n\n" + detail);
          // Disable only the reorder button (keep duplicate active)
          var btnText = (typeof MyProjectsI18n !== 'undefined' && MyProjectsI18n.already_in_cart) ? MyProjectsI18n.already_in_cart : 'Already in Cart';
          button.innerHTML = btnText;
          button.disabled = true;
          // console.log("[REORDER CHECK] Project already in cart -> blocking and disabling reorder button");
          return; // stop flow
        }
      } catch (e) {
        console.error("[REORDER CHECK] AJAX error:", e);
        // On check failure, we allow proceeding to avoid false blocks
      }

      if (typeof ajax_object === "undefined") {
        console.error("ajax_object is not defined!");
        return;
      }

      try {
        let textData = null;

        // Checking ordered_project_sku first
        if (ordered_project_sku) {
          textData = ordered_project_sku;
        } else {
          // pulling data from API if ordered_project_sku does not exist
          const response = await fetch(url);
          if (!response.ok) {
            throw new Error("Network response was not ok");
          }

          textData = await response.text();
        }

        // If there is still no textData, show alert and stop the process
        if (!textData) {
          alert(
            "This project was created before 15.01.2025. It is no longer possible to reorder or add to cart. Please try creating a new project."
          );
          button.innerHTML =
            order_button_id === "reorder_button" ? "RE-ORDER" : "Add to Cart";
          button.disabled = false;
          return;
        }

        // If textData is obtained, start AJAX process
        button.innerHTML = '<span class="my_projects_spinner"></span> Project is adding to cart';
		  
        jQuery.ajax({
          url: ajax_object.ajaxurl,
          method: "POST",
          data: {
            action: "handle_ajax_text_data",
            project_id: project_id,
            textData: textData,
            reorderid: order_id || '',
            reorderdate: order_date || '',
          },
		  beforeSend: function () {
		  },
          success: function (response) {
			  if (response.success) {
				  let returnUrl = response.data.return_url || cart_URL;

				  // If organisationID exists and is not in returnUrl, add it
				  if (organisationID && !returnUrl.includes("organisationid=")) {
					  const sep = returnUrl.includes("?") ? "&" : "?";
					  returnUrl += sep + "organisationid=" + encodeURIComponent(organisationID);
				  }

				  // Update button states (visual)
				  button.innerHTML = order_button_id === "reorder_button" ? "Re-Ordered" : "Added to Cart";
				  button.disabled = false;

				  // Routing
				  window.location.href = returnUrl;
			  } else {
				  // Show error message to user
				  let errorTitle = response.data?.title || "Unable to Re-Order";
				  let errorMessage = response.data?.detail || response.data?.message || "An error occurred while adding the product to cart. Please try again.";
				  
				  alert(errorTitle + "\n\n" + errorMessage);
				  
				  button.innerHTML = order_button_id === "reorder_button" ? "Re-Order" : "Add to Cart";
				  disableButtonsOnCard(button);
			  }
		  },
          error: function (xhr, status, error) {
			// Try to parse error response
			let errorMessage = "An unexpected error occurred. Please try again.";
			try {
				let response = JSON.parse(xhr.responseText);
				if (response.data?.detail) {
					errorMessage = response.data.detail;
				} else if (response.data?.message) {
					errorMessage = response.data.message;
				}
			} catch (e) {
				// Use default message
			}
			
			alert("Unable to Re-Order\n\n" + errorMessage);
			button.innerHTML =
              order_button_id === "reorder_button" ? "Re-Order" : "Add to Cart";
			disableButtonsOnCard(button);
          },
        });
      } catch (error) {
        console.error("Error fetching data:", error.message);
        button.innerHTML =
          button.id === "reorder_button" ? "RE-ORDER" : "Add to Cart";
        disableButtonsOnCard(button);
      }
    });
  });
});