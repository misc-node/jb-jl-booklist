'use strict';

//TO SHOW HIDDEN ON SEARCH-RESULT PAGE (SHOW.EJS)
$('.show-detail-button').on('click', function() {
  $(this).next().removeClass('hidden');
});

//TO SHOW HIDDEN ON DETAIL.EJS
$('.update-book').on('click', function() {
  $(this).siblings().removeClass('hidden');
});
