(() => {
    (() => {
        class Main {
            constructor() {
                this.focusIndex = 0;
                this.currentIndex = 0;
                this.savedIndex = 0;
                this.results = [];
                this.thumbnailURLs = {};
            }
            buttonHandler(buttonId) {
                switch (buttonId) {
                    case 'search-exec-button': {
                        this.currentIndex = 0;
                        this.focusIndex = 0;
                        this.exec(this.getSearchParameters());
                        break;
                    }
                    case 'search-prev-button': {
                        this.loadPrevItems();
                        break;
                    }
                    case 'search-next-button': {
                        this.loadNextItems();
                        break;
                    }
                }
            }
            load() {
                const url = 'https://raw.githubusercontent.com/mufuuuu/ytl-source-json/master/timestamp.json';
                fetch(url, {cache: 'no-cache'})
                    .then(response => {
                    if(response.ok) {
                        return response.json();
                    } else {
                        return;
                    }
                })
                    .then(json => {
                    this.json = json;

                    const newKeys = {};
                    const sites = Object.keys(this.json);
                    sites.forEach(site => {
                        if(site != 'youtube') {
                            const keys = Object.keys(this.json[site]);
                            keys.forEach(key => {
                                if(site in newKeys) {
                                    newKeys[site].push(key);
                                }else {
                                    newKeys[site] = [key];
                                }
                            });
                        }
                    });

                    let promises = [];
                    const newSites = Object.keys(newKeys);
                    newSites.forEach(site => {
                        switch (site) {
                            case 'youtube': {
                                break;
                            }
                            case 'mildom': {
                                promises.push(newKeys[site].map(async key => {
                                    return await fetch(`https://cloudac.mildom.com/nonolive/videocontent/playback/getPlaybackDetail?__platform=web&v_id=${key}`)
                                        .then(response => {
                                        return response.json();
                                    }).then(json => {
                                        const regexp = /https?:\/\/(.+)$/;
                                        const result = json?.body?.playback?.video_pic?.match(regexp);
                                        if(result) {
                                            if(site in this.thumbnailURLs === false) {
                                                this.thumbnailURLs[site] = {};
                                            }
                                            this.thumbnailURLs[site][json.body.playback.v_id] = `https://vpic-mildom-com.cdn.ampproject.org/ii/w128/s/${result[1]}`;
                                        }
                                        return 'resolved';
                                    });
                                }));
                                break;
                            }
                            case 'bilibili': {
                                promises.push(newKeys[site].map(async key => {
                                    return await fetch(`https://api.bilibili.com/x/web-interface/view?bvid=${key}`)
                                        .then(response => {
                                        return response.json();
                                    }).then(json => {
                                        if(json?.data?.bvid) {
                                            if(site in this.thumbnailURLs == false) {
                                                this.thumbnailURLs[site] = {};
                                            }
                                            this.thumbnailURLs[site][json.data.bvid] = `${json.data.pic}@128w_72h_100Q_1c.webp`;
                                        }
                                        return 'resolved';
                                    });
                                }));
                                break;
                            }
                        }
                    });
                    promises.flat();
                    Promise.allSettled(promises).then(() => {
                        this.setEventlistener();
                        this.focus();
                    });
                })
                    .catch(e => {
                    console.error(e);
                });
            }
            setEventlistener() {
                const search = document.getElementById('search');
                search.addEventListener('keydown', e => {
                    if(e.target.id == 'search-input' && e.keyCode == 40) {
                        this.focusIndex = this.getVisibleIndex();
                        const target = document.querySelector(`#search-list .list-item[index="${Math.max(Math.min(this.focusIndex, this.results.length - 1), 0)}"] .link-button`);
                        e.preventDefault();
                        target.focus();
                    }
                    if(e.target.className == 'link-button') {
                        this.focusIndex = parseInt(document.activeElement.parentNode.getAttribute('index'));
                        if(e.keyCode == 40) {
                            if(this.focusIndex < this.results.length - 1) {
                                this.focusIndex += 1;
                                const target = document.querySelector(`#search-list .list-item[index="${this.focusIndex}"] .link-button`);
                                e.preventDefault();
                                target.focus();
                            }
                        }else if(e.keyCode == 38) {
                            if(this.focusIndex == 0) {
                                const target = document.getElementById('search-input');
                                e.preventDefault();
                                target.select();
                            }else {
                                this.focusIndex -= 1;
                                const target = document.querySelector(`#search-list .list-item[index="${this.focusIndex}"] .link-button`);
                                e.preventDefault();
                                target.focus();
                            }
                        }else if(e.keyCode == 39) {
                            e.preventDefault();
                            e.target.click();
                        }
                    }
                });
                const searchInput = document.getElementById('search-input');
                searchInput.addEventListener('input', e => {
                    this.currentIndex = 0;
                    this.focusIndex = 0;
                    this.exec(this.getSearchParameters());
                });
                searchInput.addEventListener('keypress', e => {
                    if(e.keyCode == 13) {
                        this.currentIndex = 0;
                        this.focusIndex = 0;
                        this.exec(this.getSearchParameters());
                    }
                });
                const channelListItems = document.querySelectorAll('#channel-list .channel-list-item');
                channelListItems.forEach(channelListItem => {
                    channelListItem.addEventListener('click', e => {
                        const activeItem = document.querySelector('#channel-list .channel-list-item.active');
                        activeItem.classList.remove('active');
                        let target = e.target;
                        if(target.className != 'channel-list-item') {
                            target = target.parentNode;
                        }
                        target.classList.add('active');
                        let value = target.getAttribute('value');
                        const channelList = document.getElementById('channel-list');
                        channelList.setAttribute('value', value);
                        this.currentIndex = 0;
                        this.focusIndex = 0;
                        this.exec(this.getSearchParameters());
                    });
                });
                const searchList = document.getElementById('search-list');
                searchList.addEventListener('scroll', e => {
                    const linkMenu = document.getElementById('link-menu');
                    if(linkMenu) linkMenu.remove();
                    const parentRect = e.target.getBoundingClientRect();
                    let clientRect;
                    clientRect = document.getElementById('search-control-top').getBoundingClientRect();
                    if(parentRect.top - clientRect.bottom < 160) {
                        this.loadPrevItems();
                    }
                    clientRect = document.getElementById('search-control-bottom').getBoundingClientRect();
                    if(clientRect.top - parentRect.bottom < 160) {
                        this.loadNextItems();
                    }
                    this.currentIndex = this.getVisibleIndex();
                    if(this.currentIndex != this.savedIndex) {
                        this.savedIndex = this.currentIndex;
                    }
                }, false);
            }
            focus() {
                const parent = document.getElementById('search-input');
                parent.focus();
            }
            getVisibleIndex() {
                const parent = document.getElementById('search-list');
                const parentRect = parent.getBoundingClientRect();
                const listItems = Array.from(parent.querySelectorAll('.list-item[index]'));
                for(let i = 0; i < listItems.length; i++) {
                    const clientRect = listItems[i].getBoundingClientRect();
                    if(parentRect.top - clientRect.bottom < 0) {
                        return parseInt(listItems[i].getAttribute('index'))
                    }
                }
            }
            getSearchParameters() {
                const searchParameters = {};
                const word = document.getElementById('search-input');
                searchParameters.word = word.value;
                const channel = document.getElementById('channel-list');
                searchParameters.channel = channel.getAttribute('value');
                this.currentChannel = channel.value;
                return searchParameters;
            }
            message(string, type) {
                const message = document.getElementById('search-message');
                message.textContent = string || '';
                message.classList.remove('error');
                switch (type) {
                    case 'error': {
                        message.classList.add('error');
                        break;
                    }
                }
            }
            exec(searchParameters) {
                const channelPreset = ['Siro Channel', '木曽あずき', '花京院ちえり', 'もこ田めめめ', '牛巻りこ', '北上双葉', 'カルロ・ピノ', '八重沢なとり', '金剛いろは', 'ヤマト イオリ', '神楽すず', 'メリーミルクの森', '七星みりり', 'リクム', 'ルルン・ルルリカ', '【世界初?!】男性バーチャルYouTuber ばあちゃる', 'どっとライブ', '夜桜たま', '猫乃木もち'];
                this.results = [];
                this.clearItems();
                let searchWord = searchParameters.word;
                let searchChannel = searchParameters.channel;
                let searchSite;
                if(!searchWord) {
                    this.message('');
                    return [];
                }
                const regexs = [];
                if(searchWord.substring(0, 1) == '/' && searchWord.substring(searchWord.length - 1) == '/') {
                    searchWord = searchWord.substring(1, searchWord.length - 1);
                    try {
                        regexs.push(new RegExp(`^.*${searchWord}.*$`, 'gmu'));
                    }catch(e) {
                        this.message(e, 'error');
                        return [];
                    }
                }else {
                    /* フレーズ検索用エスケープ */
                    searchWord = searchWord.replace(/'([^']+)'/g, ($0, $1) => {
                        return $1.replace(/ OR /g, ' or ').replace(/ /g, '\\\\s');
                    });
                    searchWord = searchWord.replace(/"([^"]+)"/g, ($0, $1) => {
                        return $1.replace(/ OR /g, ' or ').replace(/ /g, '\\\\s');
                    });
                    /* OR検索用エスケープ */
                    searchWord = searchWord.replace(/ OR /g, '\\\\sOR\\\\s');
                    const searchWords = Array.from(new Set(searchWord.split(' ')));
                    searchWords.forEach(word => {
                        /* エスケープ解除 */
                        word = word.replace(/\\\\s/g, ' ');
                        if(word.charAt(0) == '-' && word.length > 1) {/* マイナス検索 */
                            regexs.push(new RegExp(`^(?!.*${word.slice(1).replace(/[.*+^|[\]()?${}\\]/g, '\\$&')}).*$`, 'gimu'));
                        }else if(word.includes(' OR ')) {/* OR検索 */
                            const words = [];
                            word.split(' OR ').forEach(a => {
                                words.push(a.replace(/[.*+^|[\]()?${}\\]/g, '\\$&'));
                            });
                            regexs.push(new RegExp(`^.*(${words.join('|')}).*$`, 'gimu'));
                        }else {/* 通常検索 */
                            regexs.push(new RegExp(`^.*${word.replace(/[.*+^|[\]()?${}\\]/g, '\\$&')}.*$`, 'gimu'));
                        }
                    });
                }
                const startTime = performance.now(); // 検索開始時間
                let num = 0;
                const sites = Object.keys(this.json);
                sites.forEach(site => {
                    const keys = Object.keys(this.json[site]);
                    keys.forEach(key => {
                        if(searchChannel == 'All' || searchChannel == this.json[site][key].channel || (searchChannel == 'etc' && !channelPreset.includes(this.json[site][key].channel))) {
                            let timestamps = (this.json[site][key].timestamp || this.json[site][key]).split('\n');
                            timestamps = timestamps.filter(word => word != '');
                            num += timestamps.length;
                            for(let i = 0; i < regexs.length; i++) {
                                timestamps = timestamps.join('\n').match(regexs[i]);
                                if(!timestamps) break;
                            }
                            if(timestamps) {
                                timestamps.forEach(string => {
                                    const result = {};
                                    result.string = string;
                                    result.site = site;
                                    result.key = key;
                                    this.results.push(result);
                                });
                            }
                        }
                    });
                });
                this.results.sort((a, b) => {
                    /* 日付降順でソート */
                    const dateA = this.json[a.site][a.key].date || '';
                    const dateB = this.json[b.site][b.key].date || '';
                    if (dateA > dateB) return -1;
                    if (dateA < dateB) return 1;
                    return 0;
                });
                this.results.forEach((result, index) => {
                    result.index = index;
                })
                const endTime = performance.now(); // 検索終了時間
                this.message(`${this.results.length.toString().replace(/(\d)(?=(\d{3})+$)/g , '$1,')} items / total ${num.toString().replace(/(\d)(?=(\d{3})+$)/g , '$1,')} items [${searchChannel}] (${Math.round((endTime - startTime) * 100) / 100} msec)`);
                if(this.results.length > 0) {
                    const listTop = document.getElementById('search-control-top');
                    listTop.classList.remove('hidden');
                    const listBottom = document.getElementById('search-control-bottom');
                    listBottom.classList.remove('hidden');
                    this.loadItems(Math.max(Math.min(this.currentIndex - 10, this.results.length - 50), 0));
                    let parent = document.getElementById('search-list').getBoundingClientRect();
                    let target = document.querySelector(`#search-list .list-item[index="${Math.max(Math.min(this.currentIndex, this.results.length - 1), 0)}"]`).getBoundingClientRect();
                    let position = target.top - parent.top;
                    parent = document.getElementById('search-list');
                    parent.scrollTop = position;
                }else {
                    const listTop = document.getElementById('search-control-top');
                    listTop.classList.add('hidden');
                    const listBottom = document.getElementById('search-control-bottom');
                    listBottom.classList.add('hidden');
                }
                return this.results;
            }
            clearItems() {
                const parent = document.getElementById('search-list');
                Array.from(parent.querySelectorAll('.list-item[index]')).forEach(node => {
                    node.remove();
                });
                const listTop = document.getElementById('search-control-top');
                listTop.classList.add('hidden');
                const listBottom = document.getElementById('search-control-bottom');
                listBottom.classList.add('hidden');
            }
            loadItems(startIndex, isReverse) {
                const sign = (isReverse) ? -1 : 1;
                if((isReverse && 0 <= startIndex) || (!isReverse && startIndex < this.results.length)) {
                    for(let i = startIndex; ((!isReverse && i < startIndex + 50) || (isReverse && i > startIndex - 50)) && i < this.results.length && i >= 0; i += sign) {
                        if(i == 0) {
                            document.getElementById('search-control-top').classList.add('hidden');
                        }
                        if(i == this.results.length - 1) {
                            document.getElementById('search-control-bottom').classList.add('hidden');
                        }
                        const result = this.results[i];
                        this.addItem(isReverse, result, this.json[result.site][result.key]);
                    }
                }
            }
            loadNextItems() {
                const lastIndex = parseInt(Array.from(document.querySelectorAll('#search-list .list-item[index]')).slice(-1)[0].getAttribute('index'));
                this.loadItems(lastIndex + 1);
            }
            loadPrevItems() {
                const firstIndex = parseInt(document.querySelector('#search-control-top + .list-item[index]').getAttribute('index'));
                this.loadItems(firstIndex - 1, true);
            }
            addItem(isReverse, result, json) {
                const regex = new RegExp('(?:(\\d+)\\:)?([0-5]?\\d)\\:([0-5]\\d)(?![\\d<])', 'g');
                let regexResult;
                const ankers = [];
                const urls = [];
                while((regexResult = regex.exec(result.string)) !== null) {
                    ankers.push(regexResult[0]);
                    const time = parseInt(regexResult[1] || 0) * 3600 + parseInt(regexResult[2]) * 60 + parseInt(regexResult[3]);
                    switch (result.site) {
                        case 'youtube': {
                            urls.push(`https://www.youtube.com/watch?v=${result.key}&t=${time}`);
                            break;
                        }
                        case 'mildom': {
                            const channelid = result.key.split('-')[0];
                            urls.push(`https://www.mildom.com/playback/${channelid}/${result.key}?t=${time}`);
                            break;
                        }
                        case 'bilibili': {
                            urls.push(`https://www.bilibili.com/video/${result.key}?t=${time}`);
                            break;
                        }
                    }
                }
                if(urls.length == 0) {
                    switch (result.site) {
                        case 'youtube': {
                            urls.push(`https://www.youtube.com/watch?v=${result.key}`);
                            break;
                        }
                        case 'mildom': {
                            const channelid = result.key.split('-')[0];
                            urls.push(`https://www.mildom.com/playback/${channelid}/${result.key}`);
                            break;
                        }
                        case 'bilibili': {
                            urls.push(`https://www.bilibili.com/video/${result.key}`);
                            break;
                        }
                    }
                }

                let thumbnailSrc = '';
                switch (result.site) {
                    case 'youtube': {
                        thumbnailSrc = `https://i.ytimg.com/vi/${result.key}/mqdefault.jpg`;
                        break;
                    }
                    case 'mildom': {
                        if(this.thumbnailURLs?.mildom) {
                            const keys = Object.keys(this.thumbnailURLs.mildom);
                            if(keys.includes(result.key)) {
                                thumbnailSrc = this.thumbnailURLs.mildom?.[result.key] || '';
                            }
                        }
                        break;
                    }
                    case 'bilibili': {
                            if(result.site in this.thumbnailURLs) thumbnailSrc = this.thumbnailURLs[result.site][result.key] || '';
                        break;
                    }
                }

                const detailArray = [];
                if(json.channel) detailArray.push(json.channel);
                if(json.date) detailArray.push(json.date);
                if(json.title) detailArray.push(json.title);
                const tooltipArray = [];
                tooltipArray.push(urls[0]);

                const parent = document.getElementById('search-list');
                const listItem = document.createElement('li');
                listItem.classList.add('list-item');
                listItem.setAttribute('index', result.index);
                listItem.innerHTML = `<a class="link-button" href="${urls[0]}" target="_blank" rel="noopener" title="${tooltipArray.join('\n')}"><img class="thumbnail" src="${thumbnailSrc}"><div class="title-container"><div class="title">${result.string}</div><div class="detail"><span class="site-icon ${result.site}"></span>${detailArray.join(' - ') || urls[0]}</div></div></a>`;
                /*
                let title = listItem.querySelector('.title');
                result.match.forEach(match => {
                    title.innerHTML = title.innerHTML.replace(match, '<mark>$&</mark>');
                });
                */
                if(isReverse) {
                    parent.insertBefore(listItem, document.getElementById('search-control-top').nextSibling);
                }else {
                    parent.insertBefore(listItem, document.getElementById('search-control-bottom'));
                }

                const linkButton = listItem.querySelector('.link-button');
                linkButton.addEventListener('click', e => {
                    this.focusIndex = parseInt(e.target.parentNode.getAttribute('index'));
                    if(urls.length != 1) {
                        e.preventDefault();
                        let linkMenu = document.getElementById('link-menu');
                        if(linkMenu) linkMenu.remove();
                        linkMenu = document.createElement('div');
                        linkMenu.id = 'link-menu';
                        const linkList = document.createElement('ul');
                        linkList.id = 'link-list';
                        for(let i = 0; i < urls.length; i++) {
                            const linkListItem = document.createElement('li');
                            linkListItem.className = 'link-list-item';
                            const a = document.createElement('a');
                            a.className = 'link-list-item-button';
                            a.href = urls[i];
                            a.target = '_blank';
                            a.rel = 'noopener';
                            a.textContent = ankers[i];
                            linkListItem.appendChild(a);
                            linkList.appendChild(linkListItem);
                            a.addEventListener('keydown', e => {
                                if(e.target.className == 'link-list-item-button') {
                                    if(e.keyCode == 40) {
                                        if(e.target.parentNode.nextElementSibling) {
                                            e.preventDefault();
                                            e.target.parentNode.nextElementSibling.firstChild.focus();
                                        }
                                    }else if(e.keyCode == 38) {
                                        if(e.target.parentNode.previousElementSibling) {
                                            e.preventDefault();
                                            e.target.parentNode.previousElementSibling.firstChild.focus();
                                        }
                                    }else if(e.keyCode == 39) {
                                        e.preventDefault();
                                        e.target.click();
                                    }else if(e.keyCode == 37 || e.keyCode == 8) {
                                        e.preventDefault();
                                        linkMenu.remove();
                                        document.body.removeEventListener('click', removeLinkMenu, false);
                                        const target = document.querySelector(`#search-list .list-item[index="${this.focusIndex}"] .link-button`);
                                        target.focus();
                                    }
                                }
                            }, false);
                        }
                        linkMenu.appendChild(linkList);
                        document.body.appendChild(linkMenu);
                        linkMenu.querySelector('a').focus();
                        if(e.detail == 0) {
                            const clientRect = linkButton.getBoundingClientRect();
                            linkMenu.style.top = Math.min(clientRect.top + linkButton.clientHeight, document.body.clientHeight - linkMenu.clientHeight) + 'px';
                            linkMenu.style.left = Math.min(clientRect.left, document.body.clientWidth - linkMenu.clientWidth) + 'px';
                        }else {
                            linkMenu.style.top = Math.min(e.pageY, document.body.clientHeight - linkMenu.clientHeight) + 'px';
                            linkMenu.style.left = Math.min(e.pageX, document.body.clientWidth - linkMenu.clientWidth) + 'px';
                        }

                        document.body.addEventListener('click', removeLinkMenu, false);
                        function removeLinkMenu(e) {
                            let target = e.target;
                            while (target && (target != document.body)) {
                                if (target.className == 'link-button') return;
                                target = target.parentNode;
                            }
                            linkMenu.remove();
                            document.body.removeEventListener('click', removeLinkMenu, false);
                        }
                    }
                }, false);
            }
        }
        const main = new Main();
        main.load();
    })();
})();