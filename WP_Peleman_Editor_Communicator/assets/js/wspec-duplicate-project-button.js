document.addEventListener("DOMContentLoaded", function () {
  "use strict";

  document.querySelectorAll(".duplicate-project-button").forEach(function (button) {
    button.addEventListener("click", function (e) {
      e.preventDefault(); // Prevent default button behavior
      
      let projectId = this.getAttribute("data-project-id");
      let productId = this.getAttribute("data-product-id");
      let variationId = this.getAttribute("data-variation-id");
      let organisationId = this.getAttribute("data-organisation-id");
      let siteDomain = this.getAttribute("data-site-domain");
      // console.log("Projects ID: ", projectId);
      // console.log("Products ID: ", productId);
      // console.log("Variations ID: ", variationId);
      // console.log("Organisation ID: ", organisationId);

      // console.log("Sending AJAX with:", { projectId, productId, variationId, organisationId, siteDomain });

      let formData = new FormData();
      formData.append("action", "duplicate_project_button");
      formData.append("project_id", projectId);
      formData.append("product_id", productId);
      formData.append("variation_id", variationId); // Append variation ID to formData
      formData.append("organisation_id", organisationId);
      formData.append("site_domain", siteDomain);
      formData.append("quantity", 1);
      formData.append("nonce", Ajax_Duplicate_Project_Button_object.nonce);

      let xhr = new XMLHttpRequest();
      xhr.open("POST", Ajax_Duplicate_Project_Button_object.ajax_url, true);

      xhr.onreadystatechange = function () {
        if (xhr.readyState === XMLHttpRequest.DONE) {
          if (xhr.status === 200) {
            let response = JSON.parse(xhr.responseText);
            if (response.success) {
              if (response.data.redirect_url) {
                // Redirection
                window.open(response.data.redirect_url);
              }
            } else {
              // Handle error response
              let errorTitle = response.data?.title || "Unable to Duplicate";
              let errorMessage = response.data?.detail || response.data?.message || "An error occurred. Please try again.";
              alert(errorTitle + "\n\n" + errorMessage);
              
              // Disable this button and reorder button on this card
              button.disabled = true;
              const projectCard = button.closest('.project-card');
              const reorderButton = projectCard?.querySelector('.myProject-addtocart-button');
              if (reorderButton) {
                  reorderButton.disabled = true;
              }
            }
          } else {
            logAjaxError(xhr, xhr.statusText, xhr.responseText);
          }
        }
      };

      xhr.send(formData);
    });
  });
});

function logAjaxError(jqXHR, textStatus, errorThrown) {
  console.error("AJAX Error: ", textStatus, errorThrown);
}
