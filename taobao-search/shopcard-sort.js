// ==UserScript==
// @name         tabao_shopcard
// @namespace    http://tampermonkey.net/tabao_shopcard
// @version      0.1
// @description  给淘宝搜索结果添加现实店铺信息卡片，包括：描述、服务、物流，并过滤掉两个以上较低评分的结果，以及重新排序。
// @author       willowj
// @match        https://s.taobao.com/*
// @grant        none
// @require      http://cdn.bootcss.com/jquery/3.0.0/jquery.min.js

// ==/UserScript==

window.run_shopcard = true;
window.tb_debug = true;

function t_log(params) {
    if (window.tb_debug){
        console.log(Array.from(arguments));;
    }
}


$.ready(
    setInterval(() => {
        if (window.run_shopcard && $.isReady && document.querySelector('.item .shop') && !document.querySelector('.score-box')) {
            //等待元素渲染完成
            hideTwoLessthan();
            $.get(document.URL, function (data, status) {
                // 更改排序会产生 新的item,但是并没有reload页面，因此需要这里跟随渲染shopcard前，也要重新获取一次数据
                t_log('get data');
                j_data = clean_data(data);
                re_sort_item(j_data);
                createShopInfoElement(j_data);
                window.j_data = j_data;
            })
        }
    }, 2000)
)





function hideTwoLessthan() {
    for (var x of document.querySelectorAll('div.item')) {
        if (x.querySelectorAll('.lessthan').length >= 2) {
            x.style.display = 'none';
        }
    }
}

function score_rank(iteminfo) {
    /* shopcard:
        delivery: (3)[487, 1, 2464]
        description: (3)[488, 1, 1898]
        encryptedUserId: "UvCH0vm8GMCQGONTT"
        isTmall: true
        levelClasses: (4)[{ … }, { … }, { … }, { … }]
        sellerCredit: 14
        service: (3)[488, 1, 3326]
        totalRate: 10000 */

    let vsalse = /\d+/.exec(iteminfo.view_sales) + 0;
    if (iteminfo.view_sales && iteminfo.view_sales.indexOf('万+')) {
        vsalse = vsalse * 10000;
    }
    let descp_ = iteminfo.shopcard.description;
    let r_score = descp_[0] / 100 + (descp_[2] / 10000) * (descp_[1] > 0 ? 1 : -1) +
        iteminfo.shopcard.service[0] / 10000 +
        iteminfo.shopcard.delivery[0] / 10000 +
        iteminfo.shopcard.isTmall / 100 +
        iteminfo.shopcard.sellerCredit / 10 +
        iteminfo.comment_count ** 0.3 / 100 +
        vsalse ** 0.1 / 100;
    return r_score;
}

function createShopInfoElement(j_data) {

    var state = /\&style=(.*)/.exec(document.URL) || [0, 'grid'];
    state = state[1].split('&')[0];

    for (var element of j_data) {
        t_log('element', element.nid, element)
        var e = document.querySelector(`.shop a[data-nid="${element.nid}"]`)
        var itemElement = e.closest('div.item');

        if (itemElement.querySelector('.score-box')) {
            continue;
        }
        var shopcard = element.shopcard;
        var shopInfoElement = document.createElement('div');
        shopInfoElement.setAttribute('class', 'my-widget-shopinfo my-shopinfo-' + state);

        var description_compare = shopcard.description[1] > 0 ? 'morethan' : 'lessthan';
        if (shopcard.description[0] / 100 >= 4.90) {
            description_compare = 'highscore';
        }
        shopInfoElement.innerHTML = `<div class="score-box">
            <ul class="scores">
            <li class="score ${description_compare}">
                <span class="text">如实描述： ${(shopcard.description[0] / 100).toPrecision(3)} </span>
                <span class="percent">  ${(shopcard.description[2] / 100).toPrecision(4)}% </span>
                </li>

                <li class="score ${shopcard.service[1] > 0 ? 'morethan' : 'lessthan'} ">
                <span class="text">服务态度： ${(shopcard.service[0] / 100).toPrecision(3)} </span>
                <span class="percent">  ${(shopcard.service[2] / 100).toPrecision(4)}%</span>
                </li>

                <li class="score ${shopcard.delivery[1] > 0 ? 'morethan' : 'lessthan'} ">
                <span class="text">物流服务： ${(shopcard.delivery[0] / 100).toPrecision(3)} </span>
                    <span class="percent">  ${(shopcard.delivery[2] / 100).toPrecision(4)}%</span>
                </li>
            </ul></div>`;

        switch (state) {
            case 'grid':
                itemElement.appendChild(shopInfoElement);
                break;
            case 'list':
                itemElement.getElementsByClassName('col col-5')[0].appendChild(shopInfoElement);
                break;
            case 'same':
                itemElement.insertBefore(shopInfoElement, itemElement.getElementsByClassName('recitem__info5')[0]);
                break;
            case 'alike':
                itemElement.getElementsByClassName('item__wrap')[0].appendChild(shopInfoElement);
                break;
            default:
                t_log('Unsupported state.');
                break;
        }
    }
}



function clean_data(data) {
    var re_p = /"auctions":([\s\S]*),"recommendAuctions"/;
    var json_str = re_p.exec(data)
    var j_data = JSON.parse(json_str[1]);
    for (let index = 0; index < j_data.length; index++) {
        /* 存储原始的顺序 */
        let element = j_data[index];
        element.source_index = index;
    }
    t_log(j_data);
    j_data = j_data.filter(function (element) {
        if (!element.shopcard) return false;
        if (element.shopcard.description[1] <= 0 && element.shopcard.service[1] <= 0){
            return false;
        }
        return true;//document.querySelector(`.shop a[data-nid="${element.nid}"]`)
    })
    return j_data;
}

function re_sort_item(j_data ,func) {
    j_data.sort(function (a, b) {
        // 由大到小排序
        return score_rank(b) - score_rank(a)
    });
    /* item 排序 */
    for (const element of j_data) {
        var e = document.querySelector(`.shop a[data-nid="${element.nid}"]`);
        var itemele = e.closest('div.item');
        itemele.parentElement.appendChild(itemele);
    }
}


/* 注入 shopcard style */
function GM_addStyle_from_string(str_) {
    var node = document.createElement('style');
    node.innerHTML = str_;
    document.body.appendChild(node);
}

var style_tb = `
    @media(max-width: 1200px){
        .J_MouserOnverReq  {
            height: 360px !important;
        }
    }
    @media(min-width: 1200px){
        .J_MouserOnverReq  {
            height: 420px !important;
        }
    }

    .score-box{
        margin-left:8px;
    }
    .score-box .percent{
        padding-left: 10px;
    }
    .score.morethan{
        color: red;
    }

    .score.lessthan{
        color: green;
    }
    .score.highscore{
        color: violet;
    }
`;
GM_addStyle_from_string(style_tb);


