jQuery(document).ready(function($) {
    'use strict';

    function updateProjectDisplay() {
        var filterElement = document.getElementById('projectFilter');

        if (filterElement) {
            var filter = filterElement.value;
            var projects = document.querySelectorAll('.project-card');

            projects.forEach(function(project) {
                switch (filter) {
                    case 'all':
                        project.style.display = project.dataset.deleted === '0' ? 'flex' : 'none';
                        break;
                    case 'deleted':
                        project.style.display = (project.dataset.deleted === '1' || project.dataset.deleted === '2') ? 'flex' : 'none';
                        break;
                    case 'layflat':
                        project.style.display = (project.dataset.editor === 'layflat' && project.dataset.deleted === '0') ? 'flex' : 'none';
                        break;
                    case 'printin':
                        project.style.display = (project.dataset.editor === 'printin' && project.dataset.deleted === '0') ? 'flex' : 'none';
                        break;
                    case 'printcovers':
                        project.style.display = (project.dataset.editor === 'printcovers' && project.dataset.deleted === '0') ? 'flex' : 'none';
                        break;
                    case 'ordered':
                        project.style.display = project.dataset.status === 'Ordered' ? 'flex' : 'none';
                        break;
                    default:
                        project.style.display = 'none';
                        break;
                }
            });
        } else {
            console.error('Element with ID "projectFilter" not found.');
        }
    }

    $('#projectFilter').on('change', updateProjectDisplay);

    updateProjectDisplay();
});
