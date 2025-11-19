(function ($) {
    'use strict';

    $(function () {
        connectFoldouts();
        connectRequirements();

        $(document).on('woocommerce_variations_loaded', function () {
            connectFoldouts();
            connectRequirements();
        });
    });

    function elementVisibility(element, isVisible) {
        isVisible ? element.removeClass('wsppe-hidden') : element.addClass('wsppe-hidden');
    }

    function setElementRequired(element, isRequired) {
        element.prop('required', isRequired);
    }

    function connectFoldouts() {
        $("select[foldout]").each(function () {
            const target = $('#' + $(this).attr('foldout'));
            $(this).on('change', function () {
                elementVisibility(target, $(this).val() !== '');
            });
        });

        $("input[foldout]").each(function () {
            const target = $('#' + $(this).attr('foldout'));
            $(this).on('change', function () {
                elementVisibility(target, $(this).is(':checked'));
            });
        });
    }

    function connectRequirements() {
        $("select[requires]").each(function () {
            const targets = $('.' + $(this).attr('requires'));
            $(this).on('change', function () {
                setElementRequired(targets, $(this).val() !== '');
            });
        });

        $("input[requires]").each(function () {
            const targets = $('.' + $(this).attr('requires'));
            $(this).on('change', function () {
                setElementRequired(targets, $(this).is(':checked'));
            });
        });
    }
})(jQuery);
