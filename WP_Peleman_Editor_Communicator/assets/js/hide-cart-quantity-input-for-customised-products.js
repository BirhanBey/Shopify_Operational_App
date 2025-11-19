/**
 * Hide cart quantity inputs for customized products (PIE editor projects)
 * This script processes cart items and hides quantity inputs for products with project IDs
 */

(function() {
    'use strict';

    // Global variable to store cart items that need quantity inputs hidden
    window.wsppeCartItemsToHide = window.wsppeCartItemsToHide || [];

    /**
     * Process all cart items and hide quantity inputs
     */
    function processCartItems() {
        if (!window.wsppeCartItemsToHide || window.wsppeCartItemsToHide.length === 0) {
//             console.log('[Editor Cart Display JS] No cart items to hide');
            return;
        }
        
        console.log('[Editor Cart Display JS] Processing ' + window.wsppeCartItemsToHide.length + ' cart items to hide');
        
        let totalHidden = 0;
        
        window.wsppeCartItemsToHide.forEach(function(item, index) {
//             console.log('[Editor Cart Display JS] Processing item ' + (index + 1) + ':', item);
            
            // Find the cart reference element for this item
            const refElements = document.querySelectorAll('.cartReference[data-cart-key="' + item.cartKey + '"]');
            
            if (refElements.length > 0) {
                const refElement = refElements[0];
//                 console.log('[Editor Cart Display JS] Found reference element for cart key ' + item.cartKey + ':', refElement);
                
                // Find the cart item container
                const cartItem = refElement.closest('.cart_item, .woocommerce-cart-form__cart-item, tr.cart_item, .cart_item_row, .cart_item_row td:first-child').closest('tr, .cart_item, .woocommerce-cart-form__cart-item');
                
                if (cartItem) {
//                     console.log('[Editor Cart Display JS] Found cart item container:', cartItem);
                    
                    // Find and hide all quantity inputs in this cart item
                    const quantitySelectors = [
                        '.ux-quantity',
                        '.quantity', 
                        '.buttons_added',
                        '.form-minimal',
                        'input[type="number"]',
                        '.quantity input',
                        '.ux-quantity input',
                        '.buttons_added input'
                    ];
                    
                    let itemHidden = 0;
                    quantitySelectors.forEach(function(selector) {
                        const elements = cartItem.querySelectorAll(selector);
                        elements.forEach(function(element) {
                            if (!element.hasAttribute('data-wsppe-hidden')) {
                                console.log('[Editor Cart Display JS] Hiding element with selector "' + selector + '":', element);
                                element.style.display = 'none';
                                element.style.visibility = 'hidden';
                                element.setAttribute('data-wsppe-hidden', 'true');
                                itemHidden++;
                            }
                        });
                    });
                    
//                     console.log('[Editor Cart Display JS] Hidden ' + itemHidden + ' elements for cart item ' + item.cartKey);
                    totalHidden += itemHidden;
                    
                } else {
//                     console.log('[Editor Cart Display JS] Could not find cart item container for cart key ' + item.cartKey);
                }
            } else {
//                 console.log('[Editor Cart Display JS] Could not find reference element for cart key ' + item.cartKey);
            }
        });
        
//         console.log('[Editor Cart Display JS] Total elements hidden: ' + totalHidden);
        
        // Final verification
        setTimeout(function() {
            const allQuantityInputs = document.querySelectorAll('.ux-quantity, .quantity, .buttons_added, .form-minimal');
//             console.log('[Editor Cart Display JS] Final check - Total quantity inputs on page: ' + allQuantityInputs.length);
            
            let visibleCount = 0;
            allQuantityInputs.forEach(function(input, index) {
                const computedStyle = window.getComputedStyle(input);
                const isVisible = computedStyle.display !== 'none' && computedStyle.visibility !== 'hidden';
                if (isVisible) {
                    visibleCount++;
//                     console.log('[Editor Cart Display JS] Quantity input ' + (index + 1) + ' still visible - display: ' + computedStyle.display + ', visibility: ' + computedStyle.visibility);
                }
            });
            
//             console.log('[Editor Cart Display JS] Final result - Visible quantity inputs: ' + visibleCount + ', Hidden: ' + (allQuantityInputs.length - visibleCount));
        }, 1000);
    }

    /**
     * Initialize the script when DOM is ready
     */
    function init() {
//         console.log('[Editor Cart Display JS] Initializing...');
        
        // Process immediately
        processCartItems();
        
        // Also process after delays to ensure DOM is fully loaded
        setTimeout(processCartItems, 100);
        setTimeout(processCartItems, 500);
        setTimeout(processCartItems, 1000);
        setTimeout(processCartItems, 2000);
    }

    // Run when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Also expose the function globally for manual execution
    window.wsppeProcessCartItems = processCartItems;

})();
