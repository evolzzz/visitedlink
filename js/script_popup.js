jQuery(document).ready(function() {
    var config = JSON.parse(localStorage.config);
    var clicked = "";
    var color;
    if (config.color_visited_link) {
        color = config.color_visited_link;
        if (color == $("#color_a").css("background-color")) {
            $("#color_a").children('.color_select').css("background-color", "inherit");
            clicked = "color_a";
        } else if (color == $("#color_b").css("background-color")) {
            $("#color_b").children('.color_select').css("background-color", "inherit");
            clicked = "color_b";
        } else if (color == $("#color_c").css("background-color")) {
            $("#color_c").children('.color_select').css("background-color", "inherit");
            clicked = "color_c";
        } else if (color == $("#color_d").css("background-color")) {
            $("#color_d").children('.color_select').css("background-color", "inherit");
            clicked = "color_d";
        } else if (color == $("#color_e").css("background-color")) {
            $("#color_e").children('.color_select').css("background-color", "inherit");
            clicked = "color_e";
        } else if (color == $("#color_f").css("background-color")) {
            $("#color_f").children('.color_select').css("background-color", "inherit");
            clicked = "color_f";
        }
    }
    $(".color").hover(function() {
        $(this).children(".color_select").css("background-color", "inherit");
    });
    $(".color").mouseleave(function() {
        if (clicked != $(this).attr("id")) {
            $(this).children(".color_select").css("background-color", "white");
        }
    });
    $(".color").click(function() {
        $("#" + clicked).children(".color_select").css("background-color", "white");
        $(this).children(".color_select").css("background-color", "inherit");
        clicked = $(this).attr("id");
        color = $("#" + clicked).css("background-color");
        chrome.extension.sendMessage({
            action: "change_config",
            color_visited_link: color
        });
    });
    $("#btn_clean").click(function() {
        if (!confirm("WARN:You will lose all your history!!!"))
            return;
        chrome.runtime.sendMessage({
            action: "reset_db"
        }, function(response) {
            $("#popup_deleted_history").css({
                "display": "block"
            });
        });
    });
    if (config.display_link_info_box) {
        var display_link_info_box = config.display_link_info_box;
        if (display_link_info_box == true) {
            $("#myonoffswitch").prop('checked', true);
        } else {
            $("#myonoffswitch").prop('checked', false);
        }
    } else {
        $("#myonoffswitch").prop('checked', false);
    }
    if (config.link_coloring) {
        var link_coloring = config.link_coloring;
        if (link_coloring == true) {
            $("#coloronoffswitch").prop('checked', true);
        } else {
            $("#coloronoffswitch").prop('checked', false);
        }
    } else {
        $("#coloronoffswitch").prop('checked', false);
    }
    $("#myonoffswitch").click(function() {
        if ($(this).is(":checked")) {
            chrome.extension.sendMessage({
                action: "change_config",
                display_link_info_box: true
            });
        } else {
            chrome.extension.sendMessage({
                action: "change_config",
                display_link_info_box: false
            });
        }
    });
    $("#coloronoffswitch").click(function() {
        if ($(this).is(":checked")) {
            chrome.extension.sendMessage({
                action: "change_config",
                link_coloring: true
            });
        } else {
            chrome.extension.sendMessage({
                action: "change_config",
                link_coloring: false
            });
        }
    });
    $("body").on("click", "a", function() {
        chrome.tabs.create({
            url: $(this).attr("href")
        });
        return false;
    });
});