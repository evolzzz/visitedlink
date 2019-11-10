"use strict";
//2 timer id
var timerid = -1;
var autosavetimerid = -1;

//状态控制
var hasNewItem = false;
var dom_changed = true;

//页面信息
var host = window.location.host;
var pageurl = /^https?:\/\/(.*?)\/?$/.exec(location.href)[1];
var root_page = /^https?:\/\/([^?#]*\/)/.exec(location.href)[1];
var live_time = 0;
var lastsavetime = new Date().getTime();
//重要
var tabid;
var link_coloring = true;
var absolute_regex = /^\w+\:\/\//;

//JQ缓存
var title = $("title").text();
var jqBody = $('body');

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    switch (request.action) {
        case "set_tab_id":
            tabid = request.tabid;
            init();
            break;
        case "config_changed": //<---- script_popup.js->background.js->here
            refreshConfig();
            break;
        case "set_link_coloring":
            link_coloring = request.link_coloring;
            break;
        case "set_color_visited_link": //<-----by refreshConfig()
            $(".marklink_visitedLink").remove();
            jqBody.append("<style class='marklink_visitedLink'> a.visitedLink,a.visitedLink * {color:" + request.color_visited_link + " !important;} </style>");
            break;
        case "set_display_link_info_box": //<-----by refreshConfig()
            var display_link_info_box = request.display_link_info_box == true ? "block" : "none";
            $(".marklink_visited_data").remove();
            jqBody.append("<style class='marklink_visited_data'>.visited_data{display: " + display_link_info_box + "}</style>");
            break;
        case "query_link_result":

            var first_visit = request.first_visit;
            var last_visit = request.last_visit;
            var num_visit = request.num_visit != null ? request.num_visit : 0;
            var live_time = request.live_time != null ? request.live_time : 0;
            var title = request.title != null ? request.title : "";
            var url = request.url;
            //must unbind first, or it will be recursive!!
            //jqBody.off("DOMSubtreeModified", "a", dommodifiedlistener);
            $("a[absurl='" + url + "']")
                .addClass("visitedLink")
                .attr("first_visit", first_visit)
                .attr("last_visit", last_visit)
                .attr("num_visit", num_visit)
                .attr("live_time", live_time)
                .attr("linktitle", title);
            //rebind
            //jqBody.on("DOMSubtreeModified", "a", dommodifiedlistener);
            break;
        case "refresh_page":
            refreshLinks();

            break;
    }
});
//fast init

insertThisPage(true);

chrome.runtime.sendMessage({
    action: "query_tab_id",
    url: location.href,
});

function reltoabs(url) {
    url = url.trim();
    if (url.substr(-1) == "/") {
        url = url.slice(0, -1);
    }
    //相对路径转绝对路径
    if (/^\/\/\/?(.*)/.test(url)) {
        url = /^\/\/\/?(.*)/.exec(url)[1];
    } else if (url.charAt(0) == "/") {
        url = host + url;
    } else if (!absolute_regex.test(url)) {
        url = root_page + url;
    } else {
        url = /^https?:\/\/(.*)/.exec(url)[1];
    }
    return url;
}

function refreshLinks() {
    //console.log("refreshlinks a.len="+$('a').length);
    if (!link_coloring)
        return;
    var links = $('a');

    var url;
    var absurl;
    console.time("VisitedLink:refreshLinks");

    for (var i = 0; i < links.length; i++) {
        url = "";
        absurl = "";
        url = links.eq(i).attr("href");
        if (!url)
            continue;

        absurl = reltoabs(url);

        links.eq(i).attr("absurl", absurl).removeClass("visitedLink");
        chrome.runtime.sendMessage({
            action: "query_link",
            url: absurl,
            tabid: tabid
        });


    }

    console.timeEnd("VisitedLink:refreshLinks");

}

function refreshConfig() {
    chrome.runtime.sendMessage({
        action: "get_color_visited_link",
        tabid: tabid
    });
    chrome.runtime.sendMessage({
        action: "get_display_link_info_box",
        tabid: tabid
    });
    chrome.runtime.sendMessage({
        action: "get_link_coloring",
        tabid: tabid
    });
}

function mouseenterlistener(event) {
    if (!($(this).hasClass('visitedLink')))
        return;

    var num_visit_str;
    var title_str;
    var live_time_str;
    $(".visited_data").remove();

    //重定向链接没有算live_time_str、num_visit_str的意义
    if ($(this).attr("linktitle") == "") {
        title_str = "Redirect link or not html page";
        live_time_str = "";
        num_visit_str = "";
    } else {
        title_str = "Title: " + $(this).attr("linktitle");
        num_visit_str = " <br>Number of visits: " + $(this).attr("num_visit");
        var live_time_day = parseInt($(this).attr("live_time") / 86400)
        var live_time_hour = parseInt($(this).attr("live_time") % 86400 / 3600)
        var live_time_min = parseInt($(this).attr("live_time") % 86400 % 3600 / 60)
        var live_time_sec = parseInt($(this).attr("live_time") % 86400 % 3600 % 60)
        var live_time_str = (live_time_day == 0 ? "" : live_time_day + "d") + (live_time_hour == 0 ? "" : live_time_hour + "h") + (live_time_min == 0 ? "" : live_time_min + "m") + (live_time_sec == 0 ? "" : live_time_sec + "s");
        live_time_str = live_time_str == "" ? "" : "<br>Live time: " + live_time_str;
    }

    jqBody.append("<div class='visited_data'>" + title_str + "<br>First visit: " + $(this).attr("first_visit") + "<br>Last visit: " + $(this).attr("last_visit") + num_visit_str + live_time_str + "</div>");

    $(".visited_data").css("bottom", "20px").css("left", "20px").css("position", "absolute");
    // $(".visited_data").css("top", window.height() -$(document).scrollTop() + "px");
    // $(".visited_data").css("left", (parseInt(element_pos_left) - parseInt($(document).scrollLeft()) - punto_medio_bocadillo - 7).toString() + "px");
}

function mouseleavelistener() {
    $(".visited_data").remove();
}

function clicklistener() {
    if (!($(this).attr("absurl")))
        return;

    var url = $(this).attr("absurl");

    chrome.runtime.sendMessage({
        action: "insert_link",
        url: url,
        tabid: tabid
    });

    //没打开上色不需要查询
    if (link_coloring) {
        setTimeout(function() {
            chrome.runtime.sendMessage({
                action: "query_link",
                url: url,
                tabid: tabid
            });
        }, 2000);

        setTimeout(function() {
            chrome.runtime.sendMessage({
                action: "query_link",
                url: url,
                tabid: tabid
            });
        }, 5000);
    }

}

function bindListener() {
    jqBody.on("click", "a", clicklistener);
    //该事件在网页关闭或者跳转的时候会触发，
    //注意：当页面为背景页时，关闭不会触发事件，必须是 >>当前活动页面时关闭才会触发<< ！
    jqBody.on('pagehide', function() {
        insertThisPage();
    });
    //该事件十分稳定，在页面tab切换时会触发
    $(document).on("visibilitychange", visibilitychangeListener);

    if (link_coloring) {
        jqBody.on("mouseenter", "a", mouseenterlistener);
        jqBody.on("mouseleave", "a", mouseleavelistener);
    }
}


function dommodifiedlistener(event) {
    event.stopPropagation();

    var url = $(event.target).attr("href");
    if (!url)
        return;

    var absurl = reltoabs(url);



    chrome.runtime.sendMessage({
        action: "query_link",
        url: absurl,
        tabid: tabid
    }, function(response) {
        $(event.target).attr("absurl", absurl).removeClass("visitedLink");
    });
}

function timer() //计时
{

    live_time = live_time + 1;
    //console.log(live_time);
    // if (hasNewItem) {
    //     hasNewItem = false;
    //     $(".hasnewitem a").each(function(index, val) {
    //         var url = $(this).attr("href");
    //         if (!url)
    //             return;

    //         var absurl = reltoabs(url);

    //         $(this).attr("absurl", absurl).removeClass("visitedLink");

    //         chrome.runtime.sendMessage({
    //             action: "query_link",
    //             url: absurl,
    //         }, function(response) {});
    //     });
    // }
}



function visibilitychangeListener() {
    if (document.hidden) {
        //console.log("leave")
        //离开页面时保存
        insertThisPage();
        window.clearInterval(timerid);

        //防止某些极端情况下不会保存活动时间
        window.clearInterval(autosavetimerid);
    } else {
        //console.log("come back")
        window.clearInterval(timerid);
        window.clearInterval(autosavetimerid);

        timerid = setInterval(timer, 1000);
        autosavetimerid = setInterval(function() {
            insertThisPage();
            //console.log("定时记录页面活动时间...");
        }, 17000);
    }
}

function insertThisPage(first) {
    //console.log("new Date().getTime()===="+new Date().getTime());
    //console.log("new Date().getTime()===="+lastsavetime);
    var n_times=0;
    if(first==null){
        first=false;
    }else {
        first=true;
        n_times=1;
    }

    if (!first) {
        if (new Date().getTime() - lastsavetime < 3000) {
            //console.log("保存太快了");
            return;
        }
    }

    chrome.runtime.sendMessage({
        action: "insert_link",
        url: pageurl,
        title: title,
        live_time: live_time,
        n_times: n_times,
        tabid: tabid
    });
    lastsavetime = new Date().getTime();
    live_time = 0;
}

function init() {
    $(document).ready(function() {

        bindListener();
        refreshConfig();


        timerid = setInterval(timer, 1000);
        setTimeout(function() {
            // jqBody.on("DOMSubtreeModified", "a", dommodifiedlistener);
            // jqBody.on("DOMNodeInserted", "div", function(event) {
            //     event.stopPropagation();
            //     //console.log(event.target);
            //     $(event.target).addClass('hasnewitem');
            //     hasNewItem = true;
            // });

            refreshLinks();
        }, 2000);

        //for lazy load  
        //setTimeout(refreshLinks, 5000)

    });
}