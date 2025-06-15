// let Sortable;
const paramKeysEnum = (() => {
    const keys = {
        mode: "0",
        visibleSections: "3",
        visibleBlocks: "4",
        visibleTags: "5",
        activeSections: "1",
        activeTags: "2"
    }
    const codes = Object.fromEntries(
        Object.entries(keys).map(([k, v]) => [v, k])
    );
    return { ...keys, ...codes };
})()

const storage = {
    inited: false,
    debug: false,
    mode: "",
    sections: {},
    blocks: {},
    tags: {},
    sectionOrder: [],
    blockOrder: [],
    tagOrder: []
};

window.zf = {
    debug(bool) {
        if (storage.mode === "1") {
            console.warn("Mode is not correct. Cancel operation.");
            return;
        }
        const last = storage.debug;
        if (bool !== undefined) {
            storage.debug = Boolean(bool);
            console.log("Debug status changed.");
        }
        console.log("Current debug status: ", storage.debug);
        if (last !== storage.debug) {
            console.log("Debug status has been changed, execute refrash all.");
            window.zf.refreshAll();
        }
        return;
    },

    /**
     * 
     * @param { string } mode 0=can_edit, 1=view_only
     */
    genCurrentStateUrl(mode="0") {
        const data = encodeBase64QueryParams(mode);
        const url = new URL(window.location.href);
        url.search = "";
        url.searchParams.set("data", data);
        console.log(url.toString());
        // http://localhost:1313/zh-tw/about/resume/?data=MD0wJjE9OCYyPTUmMz00LDIsOCw1
    },

    refreshAll() {
        reCalcStorageBlocks();
        initFilterPanel().forEach(panel => {
            refreshFilterPanel(panel);
        })
        refreshContent();
        console.log("Refresh all by cmd. Completed.");
    }
};

function isPortrait() {
    return window.innerHeight > window.innerWidth
}

function decodeBase64QueryParams() {
    // Step 1: 取得 data 參數
    const rawParams = new URLSearchParams(window.location.search);
    const base64Data = rawParams.get("data");
    if (!base64Data) {
        console.warn("No 'data' parameter found in URL.");
        return null;
    }

    // Step 2: base64 解碼
    let decodedString;
    try {
        decodedString = atob(base64Data);
    } catch (err) {
        console.error("Invalid base64 encoding:", err);
        return null;
    }
    // Step 3: 使用解碼後的字串模擬 URLSearchParams
    const fakeParams = new URLSearchParams(decodedString);
    // const fakeParams = new URLSearchParams(window.location.search);
    const _r = {};

    // Step 4: 把內容轉成 JSON 物件
    for (const [key, value] of fakeParams.entries()) {
        // 若值中有逗號，就轉成陣列
        const val = value.split(",");
        _r[key] = val.length > 1 ? val : val[0];
    }

    return _r;
}

/**
 * 以後擴增改良：
 * 1=n:4,2,3,7&2=i:8,11&3=*&4=i:*
 * n: 正選
 * i: 反選
 * 未定義正反選預設正選
 * *: 全選
 * 
 * @param { string } mode 0=can_edit, 1=view_only
 */
function encodeBase64QueryParams(mode) {
    const _r = {
        [paramKeysEnum["visibleSections"]]: [],
        [paramKeysEnum["activeSections"]]: [],
        [paramKeysEnum["visibleTags"]]: [],
        [paramKeysEnum["activeTags"]]: [],
    };

    const viSecs = _r[paramKeysEnum["visibleSections"]];
    const acSecs = _r[paramKeysEnum["activeSections"]];
    storage.sectionOrder.forEach(idx => {
        const section = storage.sections[idx];
        if (!section) {
            return;
        }
        if (section["active"] && section["display"]) {
            acSecs.push(idx);
        }
        if (section['visible'] && section["display"]) {
            viSecs.push(idx);
        }
    });
    const viTags = _r[paramKeysEnum["visibleTags"]]; 
    const acTags = _r[paramKeysEnum["activeTags"]]; 
    storage.tagOrder.forEach(idx => {
        const tag = storage.tags[idx];
        if (!tag) {
            return;
        }
        if (tag["active"] && tag["display"]) {
            acTags.push(idx);
        }
        if (tag['visible'] && tag["display"]) {
            viTags.push(idx);
        }
    });
    /**
     * @param { [] } item 
     * @param { [] } raw 
     */
    const compareOrder = (item, raw) => {
        if (item.length !== raw.length) {
            return;
        }
        let same = true;
        for (let i = 0; i < item.length; i++) {
            if (item[i] !== raw[i]) {
                same = false;
                break;
            }
        }
        if (same) {
            item.length = 0;
        }
    }
    compareOrder(viSecs, storage.sectionOrder);
    compareOrder(acSecs, storage.sectionOrder);
    compareOrder(viTags, storage.tagOrder);
    compareOrder(viTags, storage.tagOrder);
    
    // 留存。反向回推非預設順序的所有被指定順序
    // const crtSecOrder = storage.sectionOrder;    
    // let crtCruIdx = crtSecOrder.length - 1;
    // Object.keys(storage.sections).reverse().forEach(item => {
    //     const crtItem = crtSecOrder[crtCruIdx];
    //     if (item === crtItem) {
    //         crtCruIdx--;
    //     }
    // });
    // console.log(crtSecOrder.slice(0, crtCruIdx + 1));
    
    // 直接喂 URLSearchParams() 的話逗號會被轉義，只能手動組裝
    const params = Object.entries(_r).map(([k, v]) => {
        if (!v || Array.isArray(v) && v.length < 1) {
            return;
        }
        return `${k}=${v.join(",")}`;
    }).filter(v => v).join("&");
    const data = [];
    data.push(params);
    data.push(`${paramKeysEnum["mode"]}=${mode}`);
    if (storage.debug) {
        data.push("debug=1")
    }
    const result = data.join("&");
    console.log(result);
    return btoa(result);
}

async function initStorage() {
    let blocks, tags, sections;
    try {
        const response = await fetch("/zh-tw/about/resume/data.json");
        if (!response.ok) {
            throw new Error("網路錯誤");
        };
        const json = await response.json();
        blocks = json["blocks"];
        tags = json["tags"];
        sections = json["sections"];
        if (!blocks || !tags || !sections) {
            throw Error("Json data format is incomplete.");
        }
    } catch (e) {
        throw e;
    }
    let currentTagIdx = 0
    tags.forEach(([key, value]) => {
        if (!key || !value) {
            return;
        }
        storage.tags[currentTagIdx] = {
            idx: `${currentTagIdx}`,
            id: key,
            display: value,
            active: false,
            visible: true
        };
        currentTagIdx++;
    })
    sections.forEach(section => {
        if (section["parent"]) {
            const parent = sections.find(s => s["id"] === section["parent"])
            section["parent"] = parent ? parent["idx"] : null;
        }
        if (section["children"]) {
            Object.entries(section["children"]).forEach(([index, ele]) => {
                const child = sections.find(s => s["id"] === ele);
                if (!child) {
                    return;
                }
                section["children"][index] = child["idx"];
                section["content"] = section["content"].replace(RegExp(`<!--\\s+block=skills-programing\\s+-->`, "g"), (match) => {
                    return `<!-- section-id=${child["idx"]} -->`;
                });
            })
        }
        section["active"] = false;
        section["visible"] = true;
        storage.sections[section["idx"]] = section;
    })
    let tagsList = Object.values(storage.tags);
    const sectionList = Object.values(storage.sections);
    blocks.forEach(block => {
        const sectionIdx = sectionList.find(section => {
            return section["id"] === block["section"];
        })?.["idx"];
        block["section"] = sectionIdx;
        const idxTags = block["tags"].map(tagId => {
            let tagIdx = tagsList.find(tag => {
                return tag["id"] === tagId;
            })?.["idx"];
            if (!tagIdx) {
                tagIdx = `${currentTagIdx}`;
                storage.tags[tagIdx] = { idx: tagIdx, id: tagId, display: tagId, active: false, visible: true }
                currentTagIdx++;
                tagsList = Object.values(storage.tags);
            }
            return tagIdx;
        })
        block["tags"] = idxTags;
        block["active"] = false;
        block["visible"] = true;
        storage.blocks[block["idx"]] = block;
    })
    storage.inited = true;
    return { dataState: storage.inited };
}

/**
 * 
 * @param { HTMLElement } panel 
 * @returns { { storage, order } | null }
 */
function getPanelRelatedDatas(panel) {
    const name = panel.dataset.collection;
    if (name === "section") {
        return { storage: storage.sections, order: storage.sectionOrder };
    } else if (name === "tag") {
        return { storage: storage.tags, order: storage.tagOrder };
    } else {
        return null;
    };
}

function refreshActiveState(clickTarget, activeColl) {
    const idxStr = (typeof clickTarget === "string") ? clickTarget : clickTarget.dataset.buttonIdx;
    const idx = parseInt(idxStr);
    activeColl.has(idx) ? activeColl.delete(idx) : activeColl.add(idx);
}

function refreshFilterPanel(panel) {
    if (!panel) {
        return;
    }

    const storg = getPanelRelatedDatas(panel)?.["storage"];
    if (!storg) {
        return;
    }
    [...panel.children].forEach(btn => {
        const idx = btn.dataset.buttonIdx;
        const vi = btn.querySelector("i.icon.visib");
        if (storg[idx]["visible"]) {
            btn.classList.toggle("visible", storg[idx]["visible"]);
            vi && (vi.textContent = "visibility");
        } else {
            btn.classList.toggle("visible", storg[idx]["visible"]);
            vi && (vi.textContent = "visibility_off");
        }
        btn.classList.toggle("active", storg[idx]["active"]);
    })
}

/**
 * @returns {HTMLDivElement[]} a list of eye, up, down btn woth order
 */
function genControlBtns() {
    // 可見與否
    const eye = document.createElement("i");
    eye.className = "icon filter-icon visib";
    eye.dataset.action = "visible";
    eye.textContent = "visibility";
    
    const drag = document.createElement("i");
    drag.className = "icon filter-icon drag-handle";
    drag.dataset.action = "none";
    drag.textContent = "drag_indicator";
    return [drag, eye];
}

/**
 * @param { HTMLElement } panel 
 * @param { HTMLElement } item 
 */
function reCalcStoragedOrder(panel, item) {
    const order = getPanelRelatedDatas(panel)?.["order"];
    if (!order) {
        return;
    }
    const itemIdx = item.dataset.buttonIdx;
    const nextEleIdx = item.nextElementSibling?.dataset.buttonIdx;
    const itemOrd = order.indexOf(itemIdx);
    order.splice(itemOrd, 1);
    const nextEleOrd = order.indexOf(nextEleIdx);
    if (nextEleOrd !== -1) {
        order.splice(nextEleOrd, 0, itemIdx);
    } else {
        order.push(itemIdx);
    }
}

/**
 * @returns { HTMLElement[] } panels for builded
 */
function initFilterPanel() {
    const _r = [];
    const filterPanel = document.getElementById("filter-panel");
    filterPanel.innerHTML = "";

    const genPanrlItemTextEle = (content) => {
        const text = document.createElement("div");
        text.className = "filter-label";
        text.textContent = content;
        return text;
    }

    const sectionTitle = document.createElement("h5");
    sectionTitle.textContent = "資訊塊"
    filterPanel.appendChild(sectionTitle);
    const secPanel = document.createElement("div");
    secPanel.classList += "panel"
    secPanel.dataset.collection = "section"
    secPanel.addEventListener("click", (e) => {
        buttonActive(e);
    })
    filterPanel.appendChild(secPanel);
    new Sortable(secPanel, {
        animation: 150,
        handle: '.filter-icon.drag-handle',
        onEnd: (evt) => {
            reCalcStoragedOrder(evt.to, evt.item);
            refreshContentLayze();
        }
    })
    
    _r.push(secPanel);
    storage.sectionOrder.forEach(idx => {
        const section = storage.sections[idx];
        if (!storage.debug && !section["visible"]) {
            return;
        }
        const display = section["display"];
        if (!display) {
            return;
        }
        const secBtn = document.createElement("div");
        secBtn.classList.add("tag-btn", "component", "button");
        secBtn.dataset.buttonIdx = idx;

        if (storage.debug) {
            secBtn.append(...genControlBtns());
            const textContainer = document.createElement("div");
            textContainer.classList = "label-container";
            const btnIdEle = document.createElement("div");
            btnIdEle.textContent = `#${section["id"]}`;
            textContainer.append(genPanrlItemTextEle(display), btnIdEle)
            secBtn.append(textContainer);
        } else {
            secBtn.append(genPanrlItemTextEle(display));
        }
        secPanel.appendChild(secBtn);
    })
    const tagTitle = document.createElement("h5");
    tagTitle.textContent = "關鍵字"
    filterPanel.appendChild(tagTitle);
    const tagPanel = document.createElement("div");
    tagPanel.classList += "panel"
    tagPanel.dataset.collection = "tag"
    tagPanel.addEventListener("click", (e) => {
        buttonActive(e);
    })
    filterPanel.appendChild(tagPanel);
    new Sortable(tagPanel, {
        animation: 150,
        handle: '.filter-icon.drag-handle',
        onEnd: (evt) => {
            reCalcStoragedOrder(evt.to, evt.item);
            refreshContentLayze();
        }
    })

    _r.push(tagPanel);
    storage.tagOrder.forEach(idx => {
        const tag = storage.tags[idx];
        if (!storage.debug && !tag["visible"]) {
            return;
        }
        const tagBtn = document.createElement("div");
        tagBtn.classList.add("tag-btn", "component", "button");
        tagBtn.dataset.buttonIdx = idx;
        const display = tag["display"] || `#${tag["id"]}`;

        if (storage.debug) {
            tagBtn.append(...genControlBtns());
            const textContainer = document.createElement("div");
            textContainer.classList = "label-container";
            const btnIdEle = document.createElement("div");
            btnIdEle.textContent = `#${tag["id"]}`;
            textContainer.append(genPanrlItemTextEle(display), btnIdEle)
            tagBtn.append(textContainer);
        } else {
            tagBtn.append(genPanrlItemTextEle(display));
        }
        tagPanel.appendChild(tagBtn);
    });
    return _r;
}

function buttonActive(e) {
    const panel = e.target.closest("div.panel")
    if (!panel) {
        console.warn(`buttonActive: unknow panel: `, panel);
        return;
    }

    const icon = e.target.closest("i.filter-icon");
    const filterItem = e.target.closest("div.tag-btn.button");
    const btnIdx = parseInt(filterItem?.dataset.buttonIdx);
    const dataStorage = getPanelRelatedDatas(panel)["storage"];
    const itemData = dataStorage[btnIdx];

    if (icon) {
        const action = icon.dataset.action;
        if (!filterItem || isNaN(btnIdx)) {
            console.warn(`buttonActive: icon click but no valid filter item`, icon);
            return;
        }

        // 執行 icon 對應動作
        switch (action) {
            case "visible":
                itemData["visible"] ? itemData["visible"] = false : itemData["visible"] = true;
                if (dataStorage === storage.sections) {
                    sectionVisibleDownward(itemData["idx"], itemData["visible"]);
                }
                break;
            case "none":
                break;
            default:
                console.log(`buttonActive: unknown icon action: ${action}`);
        }
    } else if (!filterItem) {
        // 不是 icon 也不是 tag-btn，代表點到空白，什麼都不做
        return;
    } else if (!itemData["visible"]) {
        return;
    } else {
        const text = e.target.closest("div.filter-label");
        if (!text) {
            return;
        }
        if (isNaN(btnIdx) || btnIdx < 0) {
            console.warn(`buttonActive: invalid btnIdx`, filterItem);
            return;
        }
        itemData["active"] ? itemData["active"] = false : itemData["active"] = true;
        // if (dataStorage === storage.sections) {
        //     sectionActiveDownward(itemData["idx"], itemData["active"]);
        // }
    }

    reCalcStorageBlocks();
    refreshFilterPanel(panel);
    refreshContentLayze();
}

function reCalcStorageBlocks() {
    Object.values(storage.sections).forEach(section => {
        if (!section["parent"]) {
            return;
        }
        section["active"] = false;
    })
    storage.blockOrder.forEach(idx => {
        const block = storage.blocks[idx];
        block["active"] = false;
        const targetSec = storage.sections[block["section"]];
        const blockActive = block["tags"].map(tagIdx => storage.tags[tagIdx]["active"]).includes(true);
        block["active"] = blockActive;
        let topAncestor = undefined;
        let current = targetSec["idx"];
        while (current) {
            const sec = storage.sections[current];
            if (!sec["parent"]) {
                topAncestor = sec;
                break;
            }
            current = sec["parent"];
        }
        if (topAncestor["active"] && blockActive) {
            sectionActiveUpward(targetSec["idx"], true);        
        }
    })
}

function sectionActiveUpward(idx, bool) {
    let current = idx;
    while (current) {
        const sec = storage.sections[current];
        if (!sec) break;
        sec["active"] = bool;
        current = sec["parent"];
    }
}

function sectionActiveDownward(idx, bool) {
    const goDonw = (_idx) => {
        const sec = storage.sections[_idx];
        if (!sec) {
            return null;
        }
        sec["active"] = bool;
        sec["children"]?.forEach(child => {
            goDonw(child);
        });
    }
    goDonw(idx);
}

function sectionVisibleDownward(idx, bool) {
    const goDonw = (_idx) => {
        const sec = storage.sections[_idx];
        if (!sec) {
            return null;
        }
        sec["visible"] = bool;
        sec["children"]?.forEach(child => {
            goDonw(child);
        });
    }
    goDonw(idx);
}

function refreshContentLayze() {
    const overlay = document.getElementById("filter-overlayer");
    const changeHidde = ((bool) => {
        if (isPortrait()) {
            overlay.children[0].hidden = bool;
        } else {
            overlay.hidden = bool;
            overlay.children[0].hidden = bool
        }
    })
    if (storage.debug) {
        refreshContent();
        return;
    }
    changeHidde(false);
    setTimeout(() => {
        refreshContent();
        changeHidde(true);
    }, (100 + Math.random() * 300));
}

/**
 * @param { {sections: {}, tags: {}, blocksWithOrder: [] } } calcData calcData from calcCompleteData()
 */
function refreshContent() {
    const mainContent = document.getElementById("post-content");
    mainContent.innerHTML = "";

    const domMap = {}; // idx => DOMEle
    const parser = new DOMParser();
    /**
     * 
     * @param {string} idx index of sections
     * @returns {ChildNode} a node element
     */
    const buildDomElement = (idx) => {
        const item = storage.sections[idx];
        if (domMap[idx]) {
            return domMap[idx];
        };
        if (!item) {
            return null
        };
        if (!item["visible"]) {
            return null
        };
        if (!item["active"]) {
            return null
        };
        const doc = parser.parseFromString(item["content"], "text/html");
        const el = doc.body.firstChild;
        el.parentElement.removeChild(el);
        domMap[idx] = el;
        if (item["parent"]) {
            const parentEl = buildDomElement(item["parent"]);
            const insertRecord = [];
            parentEl.childNodes.forEach(node => {
                if (node.nodeType !== Node.COMMENT_NODE) {
                    return;
                }
                const cleanVal = node.nodeValue.trim();
                const childIdx = cleanVal.substring("section-id=".length);
                const childIdxInt = parseInt(childIdx);
                if (!cleanVal.startsWith("section-id=") || !isNaN(childIdxInt) && childIdxInt < 0) {
                    return;
                }
                if (childIdx === item["idx"]) {
                    insertRecord.push({
                        before: node,
                        item: item
                    });
                }
            });
            insertRecord.forEach(([before, item]) => {
                parentEl.insertBefore(item, before);
            })
            if (!item.parentElement) {
                parentEl.appendChild(el);
            }
        };
        if (!el.parentElement && !item["parent"]) {
            mainContent.appendChild(el);
        }
        return el;
    }

    storage.sectionOrder.forEach(idx => {
        buildDomElement(idx);
    });

    storage.blockOrder.forEach(idx => {
        const block = storage.blocks[idx];
        if (!block["active"] || !block["visible"]) {
            return;
        }
        const targetSec = storage.sections[block["section"]];
        const section = document.getElementById(targetSec["id"])
        if (!section) {
            return;
        }
        const doc = parser.parseFromString(block["content"], "text/html");
        const frag = document.createDocumentFragment();
        while (doc.body.firstChild) {
            frag.appendChild(doc.body.firstChild);
        }
        section.append(frag);
    })
}

document.addEventListener("DOMContentLoaded", async () => {
    document.documentElement.style.setProperty("--input-font-size", "18px")

    const query = decodeBase64QueryParams();
    console.log("query", query);

    const mainContent = document.getElementById("post-content");

    const mode = query ? query[paramKeysEnum["mode"]] : null;
    if (!mode) {
        mainContent.innerHTML = "";
        const desc = document.querySelector("section.layout.page-header > span.description");
        desc.innerHTML = "██████";
        const errorInfos = [
            ["Unauthorized request", "Please recheck the URL. If you think it is an error, please request the URL again from the source."],
            ["未經授權的請求", "請重新確認網址。如果認為這是錯誤，請向來源方重新索取網址。"],
            ["不正なリクエスト", "URLを再度ご確認ください。エラーと思われる場合は、ソースから URL を再度リクエストしてください。"],
        ]
        errorInfos.forEach(infos => {
            for (const [idx, value] of infos.entries()) {
                let ele;
                if (idx === 0) {
                    ele = document.createElement("h3");
                    ele.textContent = `!!! ${value} !!!`;
                    ele.style.setProperty("color", "red");
                } else {
                    ele = document.createElement("h6");
                    ele.textContent = value;
                    ele.style.setProperty("color", "fuchsia");
                }
                mainContent.appendChild(ele);
            }
            mainContent.appendChild(document.createElement("hr"));
        })

        const filterBody = document.getElementById("filter-body");
        filterBody.innerHTML = "";
        return;
    }

    storage.mode = mode;
    if (mode === "0") {
        console.log("importing Sortable");
        await import("https://cdn.jsdelivr.net/npm/sortablejs@latest/Sortable.min.js");
        console.log("import proc down.");
    }

    if (query["debug"] && query["debug"] === "1") {
        storage.debug = true;
    }

    const dataState = await initStorage();
    if (dataState === false) {
        throw Error("ERROR! Data State is not true.")
    }

    const checkIndexList = (strList) => {
        strList = Array.isArray(strList) ? strList : [strList]
        return strList.map(s => parseInt(s)).filter(n => !isNaN(n)).map(v => `${v}`);
    }
    (() => {
        const keys = Object.keys(storage.sections);
        const keySet = new Set(keys);
        const visibles = (() => {
            const vi = checkIndexList(query[paramKeysEnum["visibleSections"]])
                .filter(i => keySet.has(i));
            return vi.length ? vi : keys;
        })();
        visibles.forEach(idx => {
            storage.sectionOrder.push(idx);
            storage.sections[idx]["visible"] = true;
        });
        const visibleSet = new Set(visibles);
        keys.filter(v => !visibleSet.has(v)).forEach(idx => {
            storage.sectionOrder.push(idx);
            storage.sections[idx]["visible"] = false;
        });

        const actives = (() => {
            const ac = checkIndexList(query[paramKeysEnum["activeSections"]])
                .filter(i => keySet.has(i));
            return ac.length ? ac : keys;
        })();
        actives.forEach(idx => {
            const sec = storage.sections[idx];
            if (!sec) {
                return;
            }
            sec["active"] = true;
        });

        storage.sectionOrder.forEach(idx => {
            const section = storage.sections[idx];
            const childrenIdx = section["children"];
            if (childrenIdx && childrenIdx.length > 0) {
                sectionVisibleDownward(idx, section["visible"]);
            };
            const parent = section["parent"];
            if (parent && section["active"]) {
                sectionActiveUpward(idx, section["active"]);
            }
        })
    })();
    (() => {
        const keys = Object.keys(storage.tags);
        const keySet =  new Set(keys);
        const visibles = (() => {
            const vi = checkIndexList(query[paramKeysEnum["visibleTags"]])
                .filter(i => keySet.has(i));
            return vi.length ? vi : keys;
        })();
        visibles.forEach(idx => {
            storage.tagOrder.push(idx);
            storage.tags[idx]["visible"] = true;
        });
        const visibleSet = new Set(visibles);
        keys.filter(v => !visibleSet.has(v)).forEach(idx => {
            storage.tagOrder.push(idx);
            storage.tags[idx]["visible"] = false;
        });
        const actives = (() => {
            const ac = checkIndexList(query[paramKeysEnum["activeTags"]])
                .filter(i => keySet.has(i));
            return ac.length ? ac : keys;
        })();
        actives.forEach(idx => {
            const tag = storage.tags[idx];
            if (!tag) {
                return;
            }
            tag["active"] = true;
        })
    })();
    (() => {
        // for now, not have control active block capability
        const keys = Object.keys(storage.blocks);
        const keySet =  new Set(keys);
        const visibles = (() => {
            const vi = checkIndexList(query[paramKeysEnum["visibleBlocks"]])
                .filter(i => keySet.has(i));
            return vi.length ? vi : keys;
        })();
        visibles.forEach(idx => {
            storage.blockOrder.push(idx);
        })
    })();

    reCalcStorageBlocks();
    console.log("storage", storage);

    if (mode === "0") {
        // 0: use_tags
        console.log("Get in 'use-tags' mode");
        initFilterPanel().forEach(panel => {
            refreshFilterPanel(panel);
        })
        refreshContent();
    } else if (mode === "1") {
        // 1: view_only
        console.log("Get in 'view-only' mode");
        const filterBody = document.getElementById("filter-body");
        filterBody.innerHTML = "";
        refreshContent();
    } else {

    }
});

(() => {
    const header = document.getElementById("header");
    const filterBody = document.getElementById("filter-body");
    const maxSidebarHeight = window.innerHeight - header.offsetHeight;
    filterBody.style.top = `${header.offsetHeight}px`;
    filterBody.style.height = `${maxSidebarHeight}px`;

    if (isPortrait()) {
        const filterPanel = filterBody.querySelector("#filter-panel");
        const maxPanelHeight = window.innerHeight - filterPanel.previousElementSibling.getBoundingClientRect().bottom
        filterPanel.style.height = `${maxPanelHeight}px`;
    }

    const overlay = document.getElementById("filter-overlayer");
    overlay.hidden = true;
    overlay.children[0].hidden = true;

    const openBtn = document.getElementById("mobile-filter-btn");
    const changeOpenBtnContent = (state) => {
        [...openBtn.children].forEach(child => {
            if (child.tagName !== "I") {
                return;
            }
            child.textContent = `keyboard_double_arrow_${(state === "L") ? "left" : "right"}`;
        })
    }
    changeOpenBtnContent("L")
    filterBody.dataset.open = "false";

    const openFilter = () => {
        filterBody.dataset.open = "true";
        overlay.hidden = false;
        changeOpenBtnContent("R")
    }

    const closeFilter = () => {
        filterBody.dataset.open = "false";
        overlay.hidden = true;
        changeOpenBtnContent("L")
    }

    openBtn.addEventListener("click", () => {
        const state = filterBody.dataset.open;
        if (state == "false") {
            openFilter();
        } else {
            closeFilter();
        }
    });

    overlay.addEventListener("click", () => {
        if (isPortrait()) {
            closeFilter();
        }
    });
})();

(() => {
    const filterBody = document.getElementById("filter-body");
    const filterOverlay = document.getElementById("filter-overlayer");

    const contentParent = document.getElementById("post-content").parentElement;
    const desktopParent = document.getElementById("single");
    const mobileParent = document.getElementById("top");

    let resizeTimeout = null;

    function moveFilterPanelIfNeeded() {
        const expectedParent = isPortrait() ? mobileParent : desktopParent;

        if (filterBody.parentElement !== expectedParent) {
            if (expectedParent === desktopParent) {
                desktopParent.prepend(filterBody);
                contentParent.append(filterOverlay);
            } else if (expectedParent === mobileParent) {
                mobileParent.append(filterBody, filterOverlay)
            }
            console.log("Filter panel moved to:", isPortrait() ? "mobile layer" : "desktop container");
        }
    }

    function onResizeLazy() {
        if (resizeTimeout) {
            clearTimeout(resizeTimeout)
        };
        resizeTimeout = setTimeout(() => {
            moveFilterPanelIfNeeded();
        }, 200);
    }

    window.addEventListener("DOMContentLoaded", moveFilterPanelIfNeeded);
    window.addEventListener("resize", onResizeLazy);
})();
