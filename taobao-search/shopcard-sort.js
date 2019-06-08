// ==UserScript==
// @name         tabao_shopcard
// @namespace    http://tampermonkey.net/tabao_shopcard
// @version      0.1
// @description  try to take over the world!
// @author       willowj
// @match        https://s.taobao.com/*
// @grant        none
// @require      http://cdn.bootcss.com/jquery/3.0.0/jquery.min.js

// ==/UserScript==


function createShopInfoElement(itemElement, shopcard) {
    var state = /\&style=(.*)/.exec(document.URL)[1].split('&')[0];
    var shopInfoElement = document.createElement('div');
    shopInfoElement.setAttribute('class', 'my-widget-shopinfo my-shopinfo-' + state);

    var description_compare = shopcard.description[1] > 0 ? 'morethan' : 'lessthan';
    if (shopcard.description[0] / 100 >= 4.90) {
        description_compare = 'highscore';
    }
    shopInfoElement.innerHTML = `<div class="score-box">
    <ul class="scores">
       <li class="score ${description_compare}">
          <span class="text">\u5982\u5B9E\u63CF\u8FF0\uFF1A ${(shopcard.description[0] / 100).toPrecision(3)} </span>
         <span class="percent">  ${(shopcard.description[2] / 100).toPrecision(4)}% </span>
        </li>

         <li class="score ${shopcard.service[1] > 0 ? 'morethan' : 'lessthan'} ">
          <span class="text">\u670D\u52A1\u6001\u5EA6\uFF1A ${(shopcard.service[0] / 100).toPrecision(3)} </span>
          <span class="percent">  ${(shopcard.service[2] / 100).toPrecision(4)}%</span>
         </li>

        <li class="score ${shopcard.delivery[1] > 0 ? 'morethan' : 'lessthan'} ">
          <span class="text">\u7269\u6D41\u670D\u52A1\uFF1A ${(shopcard.delivery[0] / 100).toPrecision(3)} </span>
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
            console.log('Unsupported state.');
            break;
    }
}


function loadShopcard(data) {

    var re_p = /"auctions":([\s\S]*),"recommendAuctions"/;
    var json_str = re_p.exec(data)
    var j_data = JSON.parse(json_str[1]);
    j_data = j_data.filter(function (a) { return a.shopcard })
    j_data.sort(function (a, b) {
        // 由大到小排序
        let a1 = a.shopcard.description;
        let des_a1 = (a1[0] + a1[2] / 10000 * (a1[1] > 0 ? 1 : -1))
        let b1 = b.shopcard.description;
        let des_b1 = (b1[0] + b1[2] / 10000 * (b1[1] > 0 ? 1 : -1))
        return des_b1 - des_a1
    });

    for (let i = 0; i < j_data.length; i++) {
        var element = j_data[i];
        /*     shopcard:
                delivery: (3)[487, 1, 2464]
                description: (3)[488, 1, 1898]
                encryptedUserId: "UvCH0vm8GMCQGONTT"
                isTmall: true
                levelClasses: (4)[{ … }, { … }, { … }, { … }]
                sellerCredit: 14
                service: (3)[488, 1, 3326]
                totalRate: 10000 */

        var e = document.querySelector(`.shop a[data-nid="${element.nid}"]`);
        //console.log(element.nid, 'a1',`.shop a[data-nid="${element.nid}]"`,e);
        if (e) {
            var e_item = e.closest('div.item');
            console.log(element.nid, 'a2');
            if (element.shopcard.description[1] <= 0 && element.shopcard.service[1] <= 0) {
                e_item.style.display = 'none';
            } else {
                createShopInfoElement(e_item, element.shopcard);
                e_item.parentElement.appendChild(e_item);
            }
        }
    }
}

$.ready(
    setInterval(() => {
        if (document.querySelector('.score-box')) {
            // 检查是否已经添加shopcard
            return;
        }
        if (document.querySelector('.item .shop')) {
            //等待元素渲染完成
            $.get(document.URL, function (data, status) {
                // 更改排序会产生 新的item,但是并没有reload页面，因此需要这里跟随渲染shopcard前，也要重新获取一次数据
                console.log('get data');
                loadShopcard(data);
            })
        }
    }, 2000)
)



///
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



