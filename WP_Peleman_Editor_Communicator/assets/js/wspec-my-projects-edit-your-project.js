document.addEventListener("DOMContentLoaded", function () {
  // Helper function to disable edit button on a project card
  function disableEditButton(button) {
    button.disabled = true;
  }

  const editProjectButtons = document.querySelectorAll(
    ".edit-project-button.edit-project-link"
  );

  editProjectButtons.forEach((button) => {
    button.addEventListener("click", async function (e) {
      e.preventDefault(); // Prevent default navigation
      
      const project_id = button.getAttribute("data-project-id");
      if (!project_id) {
        console.error("[EDIT PROJECT DEBUG] ❌ Project ID not found!");
        alert("Error: Project ID not found. Please refresh the page and try again.");
        return;
      }

      const wspieDomain = button.getAttribute("data-wspie-domain");
      const apiKey = button.getAttribute("data-wspie-apikey");
      const edit_url = button.getAttribute("data-edit-url");

      // Show loading state
      const originalText = button.innerHTML;
      button.innerHTML = '<span class="my_projects_spinner"></span> Checking availability...';
      button.disabled = true;

      try {
        // Step 1: Get SKU from API (same as add to cart)
        const skuUrl = `${wspieDomain}/editor/api/projectAPI.php?action=getsku&projectid=${project_id}&a=${apiKey}`;
        const response = await fetch(skuUrl);
        
        if (!response.ok) {
          throw new Error("Network response was not ok");
        }

        const textData = await response.text();

        // Step 2: Check if SKU exists
        if (!textData || textData.trim() === '') {
          alert(
            "We apologize, but this product variation is no longer available in the webshop. Please try creating a new product."
          );
          button.innerHTML = originalText;
          button.disabled = false;
          return;
        }

        // Step 3: Check if variation exists in webshop via AJAX
        if (typeof ajax_object === "undefined") {
          console.error("ajax_object is not defined!");
          button.innerHTML = originalText;
          button.disabled = false;
          return;
        }

        button.innerHTML = '<span class="my_projects_spinner"></span> Validating variation...';

        jQuery.ajax({
          url: ajax_object.ajaxurl,
          method: "POST",
          data: {
            action: "check_variation_exists_for_edit",
            project_id: project_id,
            variation_sku: textData,
          },
          success: function (response) {
            if (response.success && response.data.variation_exists) {
              // Variation exists - proceed to editor
              button.innerHTML = '<span class="my_projects_spinner"></span> Redirecting...';
              
              // Small delay for user feedback
              setTimeout(function() {
                window.open(edit_url, '_blank');
                button.innerHTML = originalText;
                button.disabled = false;
              }, 300);
            } else {
              // Variation does not exist - show error
              let errorTitle = response.data?.title || "Product Variation Not Available";
              let errorMessage = response.data?.detail || response.data?.message || 
                "We apologize, but this product variation is no longer available in the webshop. Please try creating a new product.";
              
              alert(errorTitle + "\n\n" + errorMessage);
              
              button.innerHTML = originalText;
              button.disabled = false;
            }
          },
          error: function (xhr, status, error) {
            // Try to parse error response
            let errorMessage = "We apologize, but this product variation is no longer available in the webshop. Please try creating a new product.";
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
            
            alert("Product Variation Not Available\n\n" + errorMessage);
            button.innerHTML = originalText;
            button.disabled = false;
          },
        });
      } catch (error) {
        console.error("Error checking variation:", error.message);
        alert("An error occurred while checking product availability. Please try again.");
        button.innerHTML = originalText;
        button.disabled = false;
      }
    });
  });
});

