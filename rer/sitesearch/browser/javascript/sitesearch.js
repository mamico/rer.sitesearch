/* The following line defines global variables defined elsewhere. */
/*globals jQuery, portal_url, Modernizr, alert, history, window, location*/

jQuery(function ($) {

    var query, pushState, popState, popped, initialURL,
        Search = {},
        $default_res_container = $('#search-results'),
        navigation_root_url = $('meta[name=navigation_root_url]').attr('content') || window.navigation_root_url || window.portal_url;

    //update search viewlet value. This is need, if some search terms was deleted by length check
    if ($('input#searchGadget').length === 1) {
        $('input#searchGadget').val($('input#SearchableText').attr('value'));
    }
    else {
        $('input#nolivesearchGadget').val($('input#SearchableText').attr('value'));
    }
    // The globally available method to pull the search results for the
    // 'query' into the element, on which the method is invoked
    $.fn.pullSearchResults = function (query) {
        return this.each(function () {
            var $container = $(this);
            //$container.fadeOut("slow")
            $container.addClass("searchingLoader");
            $.get(
                '@@updated_search',
                query,
                function (data) {
                    $container.hide();

                    // Before assigning any variable we need to make sure we
                    // have the returned data available (returned somewhere to
                    // the DOM tree). Otherwise we will not be able to select
                    // elements from the returned HTML.
                    if ($('#ajax-search-res').length === 0) {
                        // Create temporary container for the HTML structure,
                        // returned by our AJAX request
                        $('body').append('<div id="ajax-search-res"></div>');
                    }
                    $('#ajax-search-res').html(data);

                    var $data_res = $('#ajax-search-res #search-results > *'),
                        data_search_term = $('#ajax-search-res #updated-search-term input#SearchableText').attr('value'),
                        data_res_number = $('#ajax-search-res #updated-search-results-number').text(),
                        data_path_opt = $('#ajax-search-res #updated-path-options').html(),
                        data_sorting_opt = $('#ajax-search-res #updated-sorting-options').html(),
                        data_tab_opt = $('#ajax-search-res #updated-tab-options').html(),
                        data_indexes_opt = $('#ajax-search-res #updated-indexes-options').html();
                    $container.removeClass("searchingLoader");
                    $container.html($data_res);
                    $container.fadeIn();

                    // if ($('#search-term').length === 0) {
                    //     // Until now we had queries with empty search term. So
                    //     // we need a placeholder for the search term in
                    //     // result's title.
                    //     $('h1.documentFirstHeading').append('<strong id="search-term" />');
                    // }

                    $('input#SearchableText').attr('value', data_search_term);
                    if ($('input#searchGadget').length === 1) {
                        $('input#searchGadget').val(data_search_term);
                    }
                    else {
                        $('input#nolivesearchGadget').val(data_search_term);
                    }
                    $('#search-results-number').text(data_res_number);
                    if (data_path_opt === null) {
                        $('#path-options').remove();
                    }
                    $('#sorting-options').html(data_sorting_opt);
                    $('#tab-options').html(data_tab_opt);
                    $('#indexes-options').html(data_indexes_opt);
                    if (data_indexes_opt === null) {
                        $('#indexes-options').hide();
                    }
                    else {
                        $('#indexes-options').show();
                    }
                    // Clean after ourselves — empty the ajax results container.
                    // No need to remove the item itself — probably there will
                    // be more search requests for filtering, sorting, etc. So,
                    // we can avoid re-creating the node every time
                    $('#ajax-search-res').empty();

                    $('#rss-subscription a.link-feed').attr('href', function () {
                        return navigation_root_url + '/search_rss?' + query;
                    });
                });
        });
    };

    pushState = function (query) {
        // Now we need to update the browser's path bar to reflect
        // the URL we are at now and to push a history state change
        // in the browser's history. We are using Modernizr
        // library to check whether browser supports HTML5 History
        // API natively or it needs a polyfill, that provides
        // hash-change events to the older browser
        if (Modernizr.history) {
            var url = navigation_root_url + '/@@search?' + query;
            history.pushState(null, null, url);
        }
    };

    // THE HANDLER FOR 'POPSTATE' EVENT IS COPIED FROM PJAX.JS
    // https://github.com/defunkt/jquery-pjax

    // Used to detect initial (useless) popstate.
    // If history.state exists, assume browser isn't going to fire initial popstate.
    popped = ('state' in window.history);
    initialURL = location.href;


    // popstate handler takes care of the back and forward buttons
    //
    // No need to wrap 'popstate' event handler for window object with
    // Modernizr check up since popstate event will contain any data only if
    // a state has been created with history.pushState() that is wrapped in
    // Modernizr checkup above.
    $(window).bind('popstate', function (event) {
        var initialPop, str;
        // Ignore inital popstate that some browsers fire on page load
        initialPop = !popped && location.href === initialURL;
        popped = true;
        if (initialPop) {
            return;
        }

        if (!location.search){
            return;
        }

        query = location.search.split('?')[1];
        // We need to make sure we update the search field with the search
        // term from previous query when going back in history
        str = query.match(/SearchableText=[^&]*/)[0];
        str = str.replace(/\+/g, ' '); // we remove '+' used between words
        // in search queries.

        // Now we have something like 'SearchableText=test' in str
        // variable. So, we know when the actual search term begins at
        // position 15 in that string.
        $('#search-field input[name="SearchableText"], input#searchGadget').val(str.substr(15, str.length));

        $default_res_container.pullSearchResults(query);
    });

    $('#search-filter input.searchPage[type="submit"]').hide();

    // We don't submit the whole form with all the fields when only the
    // search term is being changed.
    // If we change the search term, we reset all query and start a new search
    $('#search-field input.searchButton').click(function (e) {
        var st, queryString, queryParameters = {};
        st = $('#search-field input[name="SearchableText"]').val();
        queryParameters['SearchableText'] = st;
        queryString = $.param(queryParameters);
        $default_res_container.pullSearchResults(queryString);
        pushState(queryString);
        e.preventDefault();
    });
    $('form.searchPage').submit(function (e) {
        var st, queryString, queryParameters = {};
        st = $('#search-field input[name="SearchableText"]').val();
        queryParameters['SearchableText'] = st;
        queryString = $.param(queryParameters);
        $default_res_container.pullSearchResults(queryString);
        pushState(queryString);
        e.preventDefault();
    });

    // We need to update the site-wide search field (at the top right in
    // stock Plone) when the main search field is updated
    $('#search-field input[name="SearchableText"]').keyup(function () {
        if ($('input#searchGadget').length === 1) {
            $('input#searchGadget').val($(this).val());
        }
        else {
            $('input#nolivesearchGadget').val($(this).val());
        }

    });

    // When we click any option in the Filter menu, we need to prevent the
    // menu from being closed as it is dictaded by dropdown.js for all
    // dl.actionMenu > dd.actionMenuContent
    $('#search-results-bar dl.actionMenu > dd.actionMenuContent').click(function (e) {
        e.stopImmediatePropagation();
    });

    // Now we can handle the actual menu options and update the search
    // results after any of them has been chosen.
    $('#search-filter .field input, #search-filter select').not('input#pt_toggle').live('change',
        function (e) {
            query = $('form.searchPage').serialize();
            $default_res_container.pullSearchResults(query);
            pushState(query);
            e.preventDefault();
        }
    );

    // Since we replace the whole sorting options with HTML, coming in
    // AJAX response, we should bind the click event with live() in order
    // for this to keep working with the HTML elements, coming from AJAX
    // respons
    $('#sorting-options a').live('click', function (e) {
        if ($(this).attr('data-sort')) {
            $("form.searchPage input[name='sort_on']").val($(this).attr('data-sort'));
        }
        else {
            $("form.searchPage input[name='sort_on']").val('');
        }
        query = this.search.split('?')[1];
        $default_res_container.pullSearchResults(query);
        pushState(query);
        e.preventDefault();
    });

    // Handle clicks in the batch navigation bar. Load those with Ajax as
    // well.
    $('#search-results .listingBar a').live('click', function (e) {
        query = this.search.split('?')[1];
        $default_res_container.pullSearchResults(query);
        pushState(query);
        e.preventDefault();
    });

    // Handle clicks for tabs. Load those with Ajax like sorting options
    $('#tab-options a').live('click', function (e) {
        if ($(this).attr('data-tab')) {
            $("form.searchPage input[name='filter_tab']").val($(this).attr('data-tab'));
        }
        else {
            $("form.searchPage input[name='filter_tab']").val('all');
        }
        query = this.search.split('?')[1];
        $default_res_container = $('#search-results');
        $default_res_container.pullSearchResults(query);
        pushState(query);
        e.preventDefault();
    });

    // Handle clicks for remove filters link. updates form an query with Ajax like sorting options.
    $('a.linkRemoveFilters').live('click', function (e) {
        $(this).parent().find("input:checked").each(function(){
            $(this).attr("checked", false);
        });
        if ($(this).attr("class").indexOf("linkRemoveFilters") >= 0) {
            $(this).parent().remove();
        }
        query = $('form.searchPage').serialize();
        $default_res_container.pullSearchResults(query);
        pushState(query);
        e.preventDefault();
    });
});
