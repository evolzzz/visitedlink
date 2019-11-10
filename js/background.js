var db;
// var config = {
//     display_link_info_box: false,
//     color_visited_link:"",
// }
var config;
if (!localStorage.config) {
    config = {
        display_link_info_box: true,
        color_visited_link: "#b7bc1c",
        link_coloring: true
    };
    localStorage.config = JSON.stringify(config);
} else
    config = JSON.parse(localStorage.config);

jQuery(document).ready(function() {
    db = openDatabase('LinkHistoryDB', '1.0', 'LinkHistory extension DB by WangLuolong', 5 * 1024 * 1024);
    db.transaction(function(tx) {
        tx.executeSql("CREATE TABLE IF NOT EXISTS history (id INTEGER PRIMARY KEY ASC, url TEXT,title TEXT, datetime_first TEXT, datetime_last TEXT, n_times INTEGER,live_time INTEGER)");
        tx.executeSql("CREATE UNIQUE INDEX url_index ON history (url);");
    });
});
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    switch (request.action) {
        case "query_tab_id":
            if (request.url==null)
                return;
            chrome.tabs.query({
                url: request.url
            }, function(tabs) {
                chrome.tabs.sendMessage(tabs[0].id, {
                    action: "set_tab_id",
                    tabid: tabs[0].id,
                });
            });
            break;
        case "insert_link":
            //console.log(">>>>>>>>>>>>>>>insert_link" + url);
            var url = request.url;
            var title = request.title!=null ? request.title : "";
            var last_visit = new Date($.now());
            var date = last_visit.getFullYear() + "." + last_visit.getMonth() + "." + last_visit.getDate();
            var time = last_visit.getHours() + ":" + last_visit.getMinutes() + ":" + last_visit.getSeconds();
            last_visit = date + " | " + time;
            var n_times = request.n_times!=null ? request.n_times : 0;
            var live_time = request.live_time!=null ? request.live_time : 0;

            db.transaction(function(tx) {
                tx.executeSql('SELECT * FROM history where url=?', [url], function(tx, results) {
                    var len = results.rows.length;
                    if (len > 0) {
                        tx.executeSql('UPDATE history SET title=?,n_times=?, datetime_last=?,live_time=? WHERE url=?', [title != "" ? title : results.rows.item(0).title, results.rows.item(0).n_times + n_times, last_visit, results.rows.item(0).live_time + live_time, url]);
                    } else {
                        tx.executeSql("INSERT INTO history (url, title, datetime_first, datetime_last, n_times,live_time) VALUES (?,?,?,?,?,?)", [url, title, last_visit, last_visit, n_times, live_time]);
                    }
                }, null);
            });
            if (request.refreshpage) {
                chrome.tabs.sendMessage(request.tabid, {
                    action: "refresh_page",
                });
            }
            break;
        case "query_link":
            var url = request.url;
            db.transaction(function(tx) {
                tx.executeSql('SELECT * FROM history where url=?', [url], function(tx, results) {
                    var len = results.rows.length;
                    var last_visit;
                    var num_visit;
                    var live_time;
                    var title;

                    if (len > 0) {
                        first_visit = results.rows.item(0).datetime_first;
                        last_visit = results.rows.item(0).datetime_last;
                        num_visit = results.rows.item(0).n_times;
                        title = results.rows.item(0).title;
                        live_time = results.rows.item(0).live_time;
                        chrome.tabs.sendMessage(request.tabid, {
                            action: "query_link_result",
                            first_visit: first_visit,
                            last_visit: last_visit,
                            num_visit: num_visit,
                            url: url,
                            title: title,
                            live_time: live_time,
                        });
                    }
                }, null);
            });
            break;
        case "reset_db":
            db.transaction(function(tx) {
                tx.executeSql('DROP TABLE history', [], function(tx, results) {}, null);
            });
            break;
        case "get_color_visited_link":
            chrome.tabs.sendMessage(request.tabid, {
                action: "set_color_visited_link",
                color_visited_link: config.color_visited_link,
            });

            break;

        case "get_display_link_info_box":
            chrome.tabs.sendMessage(request.tabid, {
                action: "set_display_link_info_box",
                display_link_info_box: config.display_link_info_box
            });

            break;
        case "get_link_coloring":
            chrome.tabs.sendMessage(request.tabid, {
                action: "set_link_coloring",
                link_coloring: config.link_coloring
            });
            break;
        case "change_config":
            if (request.color_visited_link != null)
                config.color_visited_link = request.color_visited_link;
            if (request.display_link_info_box != null)
                config.display_link_info_box = request.display_link_info_box;
            if (request.link_coloring != null)
                config.link_coloring = request.link_coloring;
            localStorage.config = JSON.stringify(config);

            //这个必须用最顶层的，不用tagid，因为是弹窗的消息
            chrome.tabs.query({
                active: true,
                currentWindow: true
            }, function(tabs) {
                chrome.tabs.sendMessage(tabs[0].id, {
                    action: "config_changed",
                });
            });
            break;
    }
});