/**
 * Hey! You!
 * Why whould you like look my script?
 * This just a pice of s..t, nothing can learn on it. 
 */

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
    tagOrder: [],
    domEles: {},
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
                storage.tags[tagIdx] = {
                    idx: tagIdx,
                    id: tagId,
                    display: tagId,
                    active: false,
                    visible: true
                }
                currentTagIdx++;
                tagsList = Object.values(storage.tags);
            }
            return tagIdx;
        });
        block["tags"] = idxTags;
        idxTags.forEach(idx => {
            const bks = storage.tags[idx]["blocks"];
            if (bks) {
                bks[block["idx"]] = null;
            } else {
                storage.tags[idx]["blocks"] = {[block["idx"]]: null}
            }
            // if (Array.isArray(bks)) {
            //     bks.push(block["idx"]);
            // } else {
            //     storage.tags[idx]["blocks"] = [block["idx"]];
            // }
        })
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
    const storg = getPanelRelatedDatas(panel)?.["storage"];
    if (!storg) {
        return;
    }
    [...panel.children].forEach(btn => {
        const idx = btn.dataset.buttonIdx;
        btn.classList.toggle("visible", storg[idx]["visible"]);
        btn.classList.toggle("active", storg[idx]["active"]);
        if (storage.debug) {
            const vi = btn.querySelector("i.icon.visib");
            if (storg[idx]["visible"]) {
                vi && (vi.textContent = "visibility");
            } else {
                vi && (vi.textContent = "visibility_off");
            }
            const active = btn.querySelector("i.icon.active");
            if (storg[idx]["active"]) {
                active && (active.textContent = "select_check_box");
            } else {
                active && (active.textContent = "check_box_outline_blank");
            }    
        } else {
            const active = btn.querySelector("i.icon.active");
            if (storg[idx]["active"]) {
                active && (active.textContent = "visibility");
            } else {
                active && (active.textContent = "visibility_off");
            }    
        }
    })
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
 * @returns {HTMLDivElement[]} a list of eye, up, down btn woth order
 */
function genFilterItemContent(display, id) {
    const _r = [];

    const text = document.createElement("div");
    text.className = "filter-label";
    text.textContent = display;

    if (storage.debug) {
        const drag = document.createElement("i");
        drag.className = "icon filter-icon drag-handle";
        drag.dataset.action = "none";
        drag.textContent = "drag_indicator";
        _r.push(drag);

        // 可見與否
        const eye = document.createElement("i");
        eye.className = "icon filter-icon visib";
        eye.dataset.action = "visible";
        eye.textContent = "visibility";
        _r.push(eye);

        const select = document.createElement("i");
        select.className = "icon filter-icon active";
        select.dataset.action = "active";
        select.textContent = "select_check_box";
        _r.push(select);

        const textContainer = document.createElement("div");
        textContainer.classList = "label-container";
        const idTag = document.createElement("div");
        idTag.textContent = `#${id}`;
        textContainer.dataset.action = "link";
        textContainer.append(text, idTag)
        _r.push(textContainer);
    } else {
        const eye = document.createElement("i");
        eye.className = "icon filter-icon active";
        eye.dataset.action = "active";
        eye.textContent = "visibility";
        _r.push(eye);
        text.dataset.action = "link";
        _r.push(text);
    }
    return _r;
}

/**
 * @returns { HTMLElement[] } panels for builded
 */
function initFilterPanel() {
    const _r = [];
    const filterPanel = document.getElementById("filter-panel");
    filterPanel.innerHTML = "";

    const sectionTitle = document.createElement("h5");
    sectionTitle.textContent = "履歷目錄"
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
        secBtn.append(...genFilterItemContent(display, section["id"]));
        secPanel.appendChild(secBtn);
    });
    const tagTitle = document.createElement("h5");
    tagTitle.textContent = "關鍵字"
    filterPanel.appendChild(tagTitle);
    const tagPanel = document.createElement("div");
    tagPanel.classList += "panel"
    tagPanel.dataset.collection = "tag"
    tagPanel.addEventListener("click", (e) => {
        buttonActive(e);
    });
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
        tagBtn.append(...genFilterItemContent(display, tag["id"]));
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

    const roleItem = e.target.closest("[data-action]");
    const filterItem = e.target.closest("div.tag-btn.button");
    const btnIdx = parseInt(filterItem?.dataset.buttonIdx);
    const dataStorage = getPanelRelatedDatas(panel)["storage"];
    const itemData = dataStorage[btnIdx];

    if (!filterItem || isNaN(btnIdx)) {
        console.warn(`buttonActive: roleItem click but no valid filter item`, roleItem);
        return;
    }
    if (!storage.debug && !itemData["visible"]) {
        return;
    }
    if (!roleItem) {
        return;
    }
    const action = roleItem.dataset.action;
    let needRefesh = false;
    // 執行 roleItem 對應動作
    switch (action) {
        case "visible":
            itemData["visible"] ? itemData["visible"] = false : itemData["visible"] = true;
            if (dataStorage === storage.sections) {
                sectionVisibleDownward(itemData["idx"], itemData["visible"]);
            }
            needRefesh = true;
            break;
        case "active":
            itemData["active"] ? itemData["active"] = false : itemData["active"] = true;
            // if (dataStorage === storage.sections) {
            //     sectionActiveDownward(itemData["idx"], itemData["active"]);
            // }
            needRefesh = true;
            break;
        case "link":
            if (!itemData["active"]) {
                break;
            }
            const headerBottom = storage.domEles["header"].offsetHeight;
            const crtScroll = window.scrollY;
            let targetEle = undefined;

            // const rootStyles = getComputedStyle(document.documentElement);
            // const rawColor = rootStyles.getPropertyValue("--color-primary-fixed-dim").trim();
            // console.log(rawColor);

            if (panel.dataset.collection === "section") {
                targetEle = document.getElementById(itemData["id"]);
            } else {
                const linkedBlocks = Object.values(itemData["blocks"]).filter(b => {
                    return b && b.isConnected;
                });
                const isAtBottom = (window.innerHeight + crtScroll) >= document.body.scrollHeight - 5;
                if (linkedBlocks.length === 1) {
                    targetEle = linkedBlocks[0];
                } else if (isAtBottom) {
                    linkedBlocks.reduce((minEle, ele) => {
                        const top = ele.getBoundingClientRect().top + crtScroll;
                        const minTop = minEle.getBoundingClientRect().top + crtScroll;
                        return top < minTop ? ele : minEle;
                    });
                } else {
                    linkedBlocks.some((ele, index) => {
                        const elTop = ele.getBoundingClientRect().top + crtScroll;
                        if (elTop > crtScroll + headerBottom + 5) {
                            targetEle = ele;
                            return true;
                        }
                    });
                }
                if (!targetEle) {
                    targetEle = linkedBlocks[0];
                }
            }
            if (!targetEle) {
                break;
            }
            const offsetPosition = targetEle.getBoundingClientRect().top + crtScroll - headerBottom;
            window.scrollTo({ top: offsetPosition, behavior: 'smooth' });
            break;
        case "none":
            break;
        default:
            console.log(`buttonActive: unknown roleItem action: ${action}`);
            break;
    }

    if (needRefesh) {        
        reCalcStorageBlocks();
        refreshFilterPanel(panel);
        refreshContentLayze();
    }
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
    const overlay = storage.domEles["filter-overlayer"];
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
        if (!item["visible"] || !item["active"]) {
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
    
    const blockUsageSet = new Set();
    storage.tagOrder.forEach(idx => {
        const tag = storage.tags[idx];
        if (!tag["active"]) {
            return;
        }
        // tag["blocks"].forEach(bIdx => {
        Object.keys(tag["blocks"]).forEach(bIdx => {
            const block = storage.blocks[bIdx];
            if (!block["active"] || !block["visible"]) {
                return;
            }
            if (blockUsageSet.has(bIdx)) {
                return;
            }
            const section = document.getElementById(storage.sections[block["section"]]["id"])
            if (!section) {
                return;
            }
            blockUsageSet.add(bIdx);
            const wrapped = `<div>${block["content"]}</div>` ;
            const doc = parser.parseFromString(wrapped, "text/html");
            const blockEle = doc.body.firstChild;
            tag["blocks"][bIdx] = blockEle;
            section.append(blockEle);
        })
    });
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

        storage.domEles["filter-body"].innerHTML = "";
        return;
    }

    storage.mode = mode;
    if (mode === "0") {
        await import("https://cdn.jsdelivr.net/npm/sortablejs@latest/Sortable.min.js");
        console.log("All import proc down.");
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
        runTourHighlight();
    } else if (mode === "1") {
        // 1: view_only
        console.log("Get in 'view-only' mode");
        storage.domEles["filter-body"].innerHTML = "";
        refreshContent();
    } else {

    }
});

function runTourHighlight() {
    const topBody = document.getElementById("top");
    const tourHighlight = document.createElement("div");
    topBody.appendChild(tourHighlight);
    tourHighlight.classList = "tour-highlight";    
    const focusOnElement = (cssStr, padding = 6) => {
        const focEl = document.querySelector(cssStr);
        const rect = focEl.getBoundingClientRect();
        const x = rect.left + rect.width / 2;
        const y = rect.top + rect.height / 2;
        const rx = (rect.width / 2) + padding;
        const ry = (rect.height / 2) + padding;
        tourHighlight.style.setProperty('--x', `${x}px`);
        tourHighlight.style.setProperty('--y', `${y}px`);
        tourHighlight.style.setProperty('--rx', `${rx}px`);
        tourHighlight.style.setProperty('--ry', `${ry}px`);
        return { focEl, rect };
    }

    let focusIdx = 0;
    const tourStep = (() => {
        const _r = [];
        if (isPortrait()) {
            const temp = {
                css: "#filter-body #mobile-filter-btn", text: "Click this buttom to open the fliter panel.", padding: 20,
            };
            temp.callback = (focEl, clickedInside) => {
                    if (clickedInside) {
                        focEl.click();
                        temp["wait"] = 300;
                    } else {
                        focusIdx = tourStep.length;
                    }
                }
            _r.push(temp);
        }
        _r.push({css: "#filter-body #filter-container .describe", text: "Fliter panel describe"})
        return _r;
    })();
    let clickable = true;
    tourHighlight.addEventListener("click", (event) => {
        if (!clickable) {
            return;
        }
        const prevStep = tourStep[focusIdx];
        if (typeof prevStep.callback === "function") {
            const prevFocEle = prevStep["ele"] || document.querySelector(prevStep["css"]);
            const prevRect = prevFocEle.getBoundingClientRect();
            let clickedInside = false;
            if (prevFocEle) {
                const { clientX: x, clientY: y } = event;
                clickedInside = (
                    x >= prevRect.left &&
                    x <= prevRect.right &&
                    y >= prevRect.top &&
                    y <= prevRect.bottom
                );
            }
            prevStep.callback(prevFocEle, clickedInside);
        }
        focusIdx++
        if (focusIdx >= tourStep.length) {
            tourHighlight.hidden = true;
            return;
        }
        const step = tourStep[focusIdx];
        const waitTime = prevStep["wait"] || 10;
        console.log(prevStep);
        clickable = false;
        setTimeout(() => {
            const { focEl, rect } = focusOnElement(step["css"], step["padding"]);
            step["ele"] = focEl;
            clickable = true;
        }, waitTime);
    });
    focusOnElement(tourStep[focusIdx]["css"], tourStep[focusIdx]["padding"]);
}

(() => {
    storage.domEles["filter-body"] = document.getElementById("filter-body");
    storage.domEles["filter-overlayer"] = document.getElementById("filter-overlayer");
    storage.domEles["header"] = document.getElementById("header");
})();

(() => {
    const header = storage.domEles["header"];
    const filterBody = storage.domEles["filter-body"];
    const maxSidebarHeight = window.innerHeight - header.offsetHeight;
    filterBody.style.top = `${header.offsetHeight}px`;
    filterBody.style.height = `${maxSidebarHeight}px`;

    if (isPortrait()) {
        const filterPanel = filterBody.querySelector("#filter-panel");
        const maxPanelHeight = window.innerHeight - filterPanel.previousElementSibling.getBoundingClientRect().bottom
        filterPanel.style.height = `${maxPanelHeight}px`;
    }

    const overlay = storage.domEles["filter-overlayer"];
    overlay.children[0].hidden = true;

    const openBtn = document.getElementById("mobile-filter-btn");
    [0,1,2].forEach(_ => {
        const icon = document.createElement("i");
        icon.classList = "icon";
        icon.textContent = "touch_app";
        openBtn.append(icon);
    });

    const changeBtnContentTo = (iconId) => {
        [...openBtn.children].forEach(child => {
            child.textContent = iconId;
        })
    }
    const openFilter = () => {
        filterBody.dataset.open = "true";
        overlay.hidden = false;
        changeBtnContentTo("keyboard_double_arrow_right")
    }
    const closeFilter = () => {
        filterBody.dataset.open = "false";
        overlay.hidden = true;
        changeBtnContentTo("touch_app")
    }

    closeFilter();

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
    const filterBody = storage.domEles["filter-body"];
    const filterOverlay = storage.domEles["filter-overlayer"];

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
